import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  Mail01Icon, CheckmarkBadge01Icon,
  ConnectIcon, AlertCircleIcon, Delete01Icon,
  SparklesIcon
} from '@hugeicons/core-free-icons';
import { ApiService } from '../../services/api.service';
import { IntegrationConfig, EmailLog } from '../../models/integration.model';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [DatePipe, HugeiconsIconComponent],
  templateUrl: './integrations.component.html',
  styleUrl: './integrations.component.scss'
})
export class IntegrationsComponent implements OnInit, OnDestroy {
  MailIcon = Mail01Icon;
  CheckIcon = CheckmarkBadge01Icon;
  ConnectIcon = ConnectIcon;
  AlertIcon = AlertCircleIcon;
  DeleteIcon = Delete01Icon;
  SparklesIcon = SparklesIcon;

  emailConfig: IntegrationConfig | null = null;
  emailLogs: EmailLog[] = [];
  loading = true;
  connecting = false;

  private messageListener: ((e: MessageEvent) => void) | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();

    // Listen for OAuth popup callback
    this.messageListener = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        this.connecting = false;
        this.loadData();
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
        this.connecting = false;
      }
    };
    window.addEventListener('message', this.messageListener);
  }

  ngOnDestroy() {
    if (this.messageListener) window.removeEventListener('message', this.messageListener);
  }

  loadData() {
    this.loading = true;
    this.api.getIntegrations().subscribe({
      next: configs => {
        this.emailConfig = configs.find(c => c.type === 'email_google') || null;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
    this.api.getEmailLogs().subscribe(logs => this.emailLogs = logs);
  }

  // --- OAuth2 Connect ---
  connectGoogle() {
    this.connecting = true;
    this.api.getGoogleOAuthUrl().subscribe({
      next: ({ url }) => {
        // Open Google consent in popup
        const w = 500, h = 600;
        const left = (screen.width - w) / 2;
        const top = (screen.height - h) / 2;
        window.open(url, 'google-oauth', `width=${w},height=${h},left=${left},top=${top}`);
      },
      error: () => this.connecting = false,
    });
  }

  // --- Toggle ---
  toggleActive() {
    if (!this.emailConfig) return;
    this.api.toggleEmailIntegration(!this.emailConfig.is_active).subscribe(() => this.loadData());
  }

  // --- Disconnect ---
  disconnect() {
    if (!confirm('Disconnettere l\'integrazione email Google?')) return;
    this.api.deleteEmailConfig().subscribe(() => {
      this.emailConfig = null;
      this.loadData();
    });
  }

  // --- Helpers ---
  logStatusLabel(status: string): string {
    return ({ order_created: 'Ordine Creato', not_order: 'Non è un Ordine', error: 'Errore' } as Record<string, string>)[status] || status;
  }
}
