import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  SparklesIcon, AlertCircleIcon, ArrowRight01Icon,
  CheckmarkCircle01Icon, Loading01Icon
} from '@hugeicons/core-free-icons';
import { ApiService } from '../../services/api.service';
import { AiSuggestion } from '../../models/order.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  AiIcon = SparklesIcon;
  AlertIcon = AlertCircleIcon;
  ArrowIcon = ArrowRight01Icon;
  CheckIcon = CheckmarkCircle01Icon;
  LoadingIcon = Loading01Icon;

  suggestions: AiSuggestion[] = [];
  loading = false;
  error = '';

  constructor(private api: ApiService, private router: Router) {}

  generate() {
    this.loading = true;
    this.error = '';
    this.suggestions = [];
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
        // Resolve worker code to ID, then create
        this.api.getWorkers({ is_active: true }).subscribe(workers => {
          const w = workers.find(w => w.employee_code === s.payload['worker_code']);
          if (!w) { s._executing = false; return; }
          this.api.createOvertime({
            worker_id: w.id,
            date: s.payload['date'],
            hours: s.payload['hours'],
            reason: s.payload['reason'] || s.title,
          }).subscribe({
            next: () => { s._executing = false; s._done = true; },
            error: () => { s._executing = false; },
          });
        });
        break;

      case 'reassign_worker':
      case 'schedule_maintenance':
        // Navigate to workforce page for manual action
        this.router.navigate(['/workforce']);
        s._executing = false;
        s._done = true;
        break;

      case 'flag_risk':
        // Navigate to orders page
        this.router.navigate(['/orders']);
        s._executing = false;
        s._done = true;
        break;

      default:
        s._executing = false;
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
      case 'positive': return 'Opportunità';
      case 'negative': return 'Critico';
      case 'warning': return 'Attenzione';
      default: return 'Info';
    }
  }
}
