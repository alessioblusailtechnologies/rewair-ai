import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  SparklesIcon, AlertCircleIcon, ArrowRight01Icon,
  CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons';
import { ApiService } from '../../services/api.service';
import { AiSuggestion, Machine, ProductionSchedule } from '../../models/order.model';
import { forkJoin } from 'rxjs';

interface StationOrder {
  order_number: string;
  customer: string;
  product: string;
  quantity: number;
  completed: number;
  pct: number;
}

interface StationMachine {
  code: string;
  name: string;
  status: 'working' | 'online' | 'idle';
}

interface Station {
  num: string;
  title: string;
  icon: string;
  colorClass: string;
  machines: StationMachine[];
  orders: StationOrder[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  AiIcon = SparklesIcon;
  AlertIcon = AlertCircleIcon;
  ArrowIcon = ArrowRight01Icon;
  CheckIcon = CheckmarkCircle01Icon;

  // Floor plan stations
  stationIngresso: Station = { num: '01', title: 'Ingresso Materiale', icon: '\u2637', colorClass: 's-ingresso', machines: [], orders: [] };
  stationTaglio: Station = { num: '02', title: 'Taglio', icon: '\u2702', colorClass: 's-taglio', machines: [], orders: [] };
  stationAssemblaggio: Station = { num: '03', title: 'Assemblaggio', icon: '\u2699', colorClass: 's-assemblaggio', machines: [], orders: [] };
  stationTagging: Station = { num: '04', title: 'Tagging', icon: '\u2691', colorClass: 's-tagging', machines: [], orders: [] };
  stationUscita: Station = { num: '05', title: 'Uscita Kit', icon: '\u2708', colorClass: 's-uscita', machines: [], orders: [] };
  totalActiveOrders = 0;
  floorLoading = true;

  // AI Suggestions
  suggestions: AiSuggestion[] = [];
  loading = false;
  error = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() { this.loadFloorPlan(); }

  loadFloorPlan() {
    this.floorLoading = true;
    const today = new Date().toISOString().split('T')[0];

    forkJoin({
      machines: this.api.getMachines(),
      schedule: this.api.getSchedule({ from: today, to: today }),
      orders: this.api.getOrders(),
    }).subscribe({
      next: ({ machines, schedule, orders }) => {
        this.buildStations(machines, schedule);

        // Count orders with completed lines for uscita
        const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'in_progress');
        this.stationUscita.orders = completedOrders.slice(0, 4).map(o => ({
          order_number: o.order_number,
          customer: o.customer?.name || '',
          product: '',
          quantity: 0,
          completed: 0,
          pct: o.status === 'completed' ? 100 : 75,
        }));

        // Incoming = new/confirmed orders not yet in production
        const incoming = orders.filter(o => o.status === 'new' || o.status === 'confirmed');
        this.stationIngresso.orders = incoming.slice(0, 4).map(o => ({
          order_number: o.order_number,
          customer: o.customer?.name || '',
          product: '',
          quantity: o.lines?.reduce((s, l) => s + l.quantity, 0) || 0,
          completed: 0,
          pct: 0,
        }));

        // Count all unique active orders across stations
        const allOrderNums = new Set<string>();
        [this.stationIngresso, this.stationTaglio, this.stationAssemblaggio, this.stationTagging, this.stationUscita]
          .forEach(s => s.orders.forEach(o => allOrderNums.add(o.order_number)));
        this.totalActiveOrders = allOrderNums.size;

        this.floorLoading = false;
      },
      error: () => this.floorLoading = false,
    });
  }

  private buildStations(machines: Machine[], schedule: ProductionSchedule[]) {
    // Build machines per phase
    const byPhase: Record<string, StationMachine[]> = { cutting: [], assembly: [], tagging: [] };
    for (const m of machines) {
      const hasWork = schedule.some(s => (s.machine?.id === m.id || s.machine_id === m.id) && s.status !== 'completed');
      byPhase[m.phase_code]?.push({
        code: m.code,
        name: m.name,
        status: !m.is_active ? 'idle' : hasWork ? 'working' : 'online',
      });
    }
    this.stationTaglio.machines = byPhase['cutting'];
    this.stationAssemblaggio.machines = byPhase['assembly'];
    this.stationTagging.machines = byPhase['tagging'];

    // Build orders per phase from schedule
    const ordersByPhase: Record<string, Map<string, StationOrder>> = {
      cutting: new Map(), assembly: new Map(), tagging: new Map()
    };
    for (const s of schedule) {
      const phase = s.phase_code;
      const orderNum = s.order_line?.order?.order_number;
      if (!orderNum || !ordersByPhase[phase]) continue;

      if (!ordersByPhase[phase].has(orderNum)) {
        const ol = s.order_line!;
        const qty = ol.quantity || 0;
        const done = ol.quantity_completed || 0;
        ordersByPhase[phase].set(orderNum, {
          order_number: orderNum,
          customer: ol.order?.customer?.name || '',
          product: ol.product?.name || '',
          quantity: qty,
          completed: done,
          pct: qty > 0 ? Math.round((done / qty) * 100) : 0,
        });
      }
    }
    this.stationTaglio.orders = [...ordersByPhase['cutting'].values()];
    this.stationAssemblaggio.orders = [...ordersByPhase['assembly'].values()];
    this.stationTagging.orders = [...ordersByPhase['tagging'].values()];
  }

  // ==================== AI Suggestions ====================
  generate() {
    this.loading = true; this.error = ''; this.suggestions = [];
    this.api.getAiSuggestions().subscribe({
      next: (res) => { this.suggestions = res.suggestions; this.loading = false; },
      error: (err) => { this.error = err.error?.error || 'Errore nella generazione dei suggerimenti.'; this.loading = false; },
    });
  }

  execute(s: AiSuggestion) {
    if (s._executing || s._done) return;
    s._executing = true;
    switch (s.action_type) {
      case 'create_overtime':
        this.api.getWorkers({ is_active: true }).subscribe(workers => {
          const w = workers.find(w => w.employee_code === s.payload['worker_code']);
          if (!w) { s._executing = false; return; }
          this.api.createOvertime({
            worker_id: w.id, date: s.payload['date'],
            hours: s.payload['hours'], reason: s.payload['reason'] || s.title,
          }).subscribe({
            next: () => { s._executing = false; s._done = true; },
            error: () => { s._executing = false; },
          });
        });
        break;
      case 'reassign_worker': case 'schedule_maintenance':
        this.router.navigate(['/workforce']); s._executing = false; s._done = true; break;
      case 'flag_risk':
        this.router.navigate(['/orders']); s._executing = false; s._done = true; break;
      default: s._executing = false;
    }
  }

  actionLabel(type: string): string {
    switch (type) {
      case 'create_overtime': return 'Crea straordinario';
      case 'schedule_maintenance': return 'Vai a pianificazione';
      case 'reassign_worker': return 'Vai a workforce';
      case 'flag_risk': return 'Vai a ordini';
      default: return 'Esegui';
    }
  }
  impactLabel(impact: string): string {
    switch (impact) {
      case 'positive': return 'Opportunità'; case 'negative': return 'Critico';
      case 'warning': return 'Attenzione'; default: return 'Info';
    }
  }
}
