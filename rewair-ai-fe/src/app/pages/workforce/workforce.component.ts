import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  Calendar01Icon, UserGroupIcon, Add01Icon, Search01Icon,
  Cancel01Icon, CheckmarkBadge01Icon, CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons';
import { ApiService } from '../../services/api.service';
import { Worker, Machine, ProductionSchedule, Order, OrderLine, ShiftType } from '../../models/order.model';

@Component({
  selector: 'app-workforce',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, HugeiconsIconComponent],
  templateUrl: './workforce.component.html',
  styleUrl: './workforce.component.scss'
})
export class WorkforceComponent implements OnInit {
  // Icons
  CalendarIcon = Calendar01Icon;
  UsersIcon = UserGroupIcon;
  AddIcon = Add01Icon;
  SearchIcon = Search01Icon;
  CancelIcon = Cancel01Icon;
  CheckIcon = CheckmarkBadge01Icon;
  CheckCircleIcon = CheckmarkCircle01Icon;

  activeView: 'schedule' | 'workers' = 'schedule';

  schedule: ProductionSchedule[] = [];
  workers: Worker[] = [];
  machines: Machine[] = [];
  orders: Order[] = [];
  shifts: ShiftType[] = [];

  loadingSchedule = true;
  loadingWorkers = true;

  // Schedule filters
  scheduleFrom = '';
  scheduleTo = '';
  filterPhase = '';

  // Worker filters
  workerSearch = '';
  filterContract = '';
  filteredWorkers: Worker[] = [];

  // Modal
  showModal = false;
  savingSchedule = false;
  formOrderId = '';
  formOrderLines: OrderLine[] = [];
  filteredMachines: Machine[] = [];
  form = {
    order_line_id: '',
    phase_code: '',
    machine_id: '',
    shift_type_id: '',
    planned_date: '',
    planned_quantity: 1,
    selectedWorkerIds: [] as string[],
  };

  constructor(private api: ApiService) {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    this.scheduleFrom = this.toDateStr(monday);
    this.scheduleTo = this.toDateStr(sunday);
  }

  ngOnInit() {
    this.loadSchedule();
    this.loadWorkers();
    this.api.getMachines({ is_active: true }).subscribe(d => this.machines = d);
    this.api.getOrders().subscribe(d => this.orders = d);
    this.api.getShifts().subscribe(d => this.shifts = d);
  }

  // ==================== Schedule ====================
  loadSchedule() {
    this.loadingSchedule = true;
    this.api.getSchedule({
      from: this.scheduleFrom,
      to: this.scheduleTo,
      phase_code: this.filterPhase || undefined,
    }).subscribe({
      next: d => { this.schedule = d; this.loadingSchedule = false; },
      error: () => this.loadingSchedule = false,
    });
  }

  phaseLabel(code: string): string {
    return ({ cutting: 'Taglio', assembly: 'Assemblaggio', tagging: 'Tagging' } as Record<string, string>)[code] || code;
  }

  scheduleStatusLabel(s: string): string {
    return ({
      planned: 'Pianificato', confirmed: 'Confermato', in_progress: 'In Corso',
      completed: 'Completato', delayed: 'Ritardo'
    } as Record<string, string>)[s] || s;
  }

  assignmentCount(s: ProductionSchedule): number {
    return s.assignments?.length || 0;
  }

  // ==================== Workers ====================
  loadWorkers() {
    this.loadingWorkers = true;
    this.api.getWorkers({ is_active: true }).subscribe({
      next: d => { this.workers = d; this.filteredWorkers = [...d]; this.loadingWorkers = false; },
      error: () => this.loadingWorkers = false,
    });
  }

  applyWorkerFilters() {
    const s = this.workerSearch.toLowerCase();
    this.filteredWorkers = this.workers.filter(w => {
      const matchSearch = !s || w.employee_code.toLowerCase().includes(s)
        || w.first_name.toLowerCase().includes(s) || w.last_name.toLowerCase().includes(s);
      return matchSearch && (!this.filterContract || w.contract_type === this.filterContract);
    });
  }

  contractLabel(c: string): string {
    return ({ permanent: 'Indeterminato', temporary: 'Determinato', agency: 'Interinale', seasonal: 'Stagionale' } as Record<string, string>)[c] || c;
  }

  countByContract(type: string): number {
    return this.workers.filter(w => w.contract_type === type).length;
  }

  // ==================== Modal ====================
  openModal() {
    this.showModal = true;
    this.formOrderId = '';
    this.formOrderLines = [];
    this.filteredMachines = [];
    this.form = { order_line_id: '', phase_code: '', machine_id: '', shift_type_id: '', planned_date: this.scheduleFrom, planned_quantity: 1, selectedWorkerIds: [] };
  }

  closeModal() { this.showModal = false; }

  onOrderChange() {
    this.formOrderLines = [];
    this.form.order_line_id = '';
    if (!this.formOrderId) return;
    const order = this.orders.find(o => o.id === this.formOrderId);
    if (order?.lines?.length) {
      this.formOrderLines = order.lines;
    } else {
      this.api.getOrderLines(this.formOrderId).subscribe(l => this.formOrderLines = l);
    }
  }

  onPhaseChange() {
    this.form.machine_id = '';
    this.filteredMachines = this.machines.filter(m => m.phase_code === this.form.phase_code);
  }

  toggleWorker(id: string) {
    const i = this.form.selectedWorkerIds.indexOf(id);
    i >= 0 ? this.form.selectedWorkerIds.splice(i, 1) : this.form.selectedWorkerIds.push(id);
  }

  isWorkerSelected(id: string): boolean {
    return this.form.selectedWorkerIds.includes(id);
  }

  get canSave(): boolean {
    return !!this.form.order_line_id && !!this.form.phase_code && !!this.form.machine_id
      && !!this.form.shift_type_id && !!this.form.planned_date && this.form.planned_quantity > 0;
  }

  saveSchedule() {
    if (!this.canSave) return;
    this.savingSchedule = true;
    const shiftHours = this.shifts.find(s => s.id === this.form.shift_type_id)?.net_hours || 7.5;
    this.api.createSchedule({
      order_line_id: this.form.order_line_id,
      phase_code: this.form.phase_code,
      machine_id: this.form.machine_id,
      shift_type_id: this.form.shift_type_id,
      planned_date: this.form.planned_date,
      planned_quantity: this.form.planned_quantity,
      status: 'planned',
      assignments: this.form.selectedWorkerIds.map(wid => ({ worker_id: wid, role: 'operator', planned_hours: shiftHours })),
    }).subscribe({
      next: () => { this.savingSchedule = false; this.closeModal(); this.loadSchedule(); },
      error: () => this.savingSchedule = false,
    });
  }

  private toDateStr(d: Date): string { return d.toISOString().split('T')[0]; }
}
