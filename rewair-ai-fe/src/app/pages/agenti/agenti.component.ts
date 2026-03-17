import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  SparklesIcon, ArrowRight01Icon, Delete01Icon,
  CheckmarkCircle01Icon, AlertCircleIcon, Add01Icon,
  Cancel01Icon, Loading01Icon
} from '@hugeicons/core-free-icons';
import { ApiService } from '../../services/api.service';
import { Agent, AgentExecution } from '../../models/agent.model';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-agenti',
  standalone: true,
  imports: [FormsModule, HugeiconsIconComponent, MarkdownPipe],
  templateUrl: './agenti.component.html',
  styleUrl: './agenti.component.scss'
})
export class AgentiComponent implements OnInit {
  AiIcon = SparklesIcon;
  SendIcon = ArrowRight01Icon;
  DeleteIcon = Delete01Icon;
  CheckIcon = CheckmarkCircle01Icon;
  AlertIcon = AlertCircleIcon;
  AddIcon = Add01Icon;
  CancelIcon = Cancel01Icon;
  LoadingIcon = Loading01Icon;

  agents: Agent[] = [];
  loading = true;

  // Modal
  showModal = false;
  prompt = '';
  creating = false;
  createdAgent: Agent | null = null;
  createError = '';

  // Run
  runningId: string | null = null;
  runResult: string | null = null;
  runPdfGenerated = false;
  runEmailSent = false;
  runEmailRecipients: string[] = [];
  runError: string | null = null;

  examples = [
    'Generami un report PDF sull\'andamento degli ordini e mandamelo via mail a marco@rewair.com ogni lunedì',
    'Avvisami via email se una macchina resta ferma per più di 4 ore',
    'Ogni venerdì generami un riepilogo settimanale della produzione e invialo al team',
  ];

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadAgents(); }

  loadAgents() {
    this.loading = true;
    this.api.getAgents().subscribe({
      next: (data) => { this.agents = data; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  // Modal
  openModal() {
    this.showModal = true;
    this.prompt = '';
    this.creating = false;
    this.createdAgent = null;
    this.createError = '';
  }

  closeModal() { this.showModal = false; }

  useExample(ex: string) {
    this.prompt = ex;
  }

  submitPrompt() {
    const text = this.prompt.trim();
    if (!text || this.creating) return;
    this.creating = true;
    this.createError = '';
    this.createdAgent = null;

    this.api.createAgentFromPrompt(text).subscribe({
      next: (agent) => {
        this.createdAgent = agent;
        this.creating = false;
        this.agents.unshift(agent);
      },
      error: (err) => {
        this.createError = err.error?.error || 'Errore nella creazione dell\'agente.';
        this.creating = false;
      },
    });
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submitPrompt(); }
  }

  // Actions
  toggleAgent(agent: Agent) {
    const active = agent.status !== 'active';
    this.api.toggleAgent(agent.id, active).subscribe({
      next: (updated) => {
        const idx = this.agents.findIndex(a => a.id === agent.id);
        if (idx >= 0) this.agents[idx] = updated;
      },
    });
  }

  deleteAgent(agent: Agent) {
    this.api.deleteAgent(agent.id).subscribe({
      next: () => { this.agents = this.agents.filter(a => a.id !== agent.id); },
    });
  }

  runAgent(agent: Agent) {
    this.runningId = agent.id;
    this.runResult = null;
    this.runPdfGenerated = false;
    this.runEmailSent = false;
    this.runEmailRecipients = [];
    this.runError = null;

    this.api.runAgent(agent.id).subscribe({
      next: (exec) => {
        this.runResult = exec.output?.result || 'Esecuzione completata.';
        this.runPdfGenerated = exec.output?.pdf_generated || false;
        this.runEmailSent = exec.output?.email_sent || false;
        this.runEmailRecipients = exec.output?.email_recipients || [];
        this.runningId = null;
        const idx = this.agents.findIndex(a => a.id === agent.id);
        if (idx >= 0) {
          this.agents[idx].last_run_at = exec.completed_at || new Date().toISOString();
          this.agents[idx].last_run_status = 'success';
        }
      },
      error: (err) => {
        this.runError = err.error?.error || 'Errore nell\'esecuzione dell\'agente.';
        this.runningId = null;
      },
    });
  }

  closeRunResult() {
    this.runResult = null;
    this.runError = null;
    this.runPdfGenerated = false;
    this.runEmailSent = false;
    this.runEmailRecipients = [];
  }

  statusLabel(s: string): string {
    return ({ active: 'Attivo', paused: 'In pausa', error: 'Errore' } as Record<string, string>)[s] || s;
  }

  typeLabel(t: string): string {
    return ({ reporter: 'Report', monitor: 'Monitor', scheduler: 'Scheduler', custom: 'Custom' } as Record<string, string>)[t] || t;
  }

  triggerLabel(t: string): string {
    return ({ scheduled: 'Schedulato', event: 'Su evento', manual: 'Manuale' } as Record<string, string>)[t] || t;
  }

  formatDate(d: string | null): string {
    if (!d) return '-';
    return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
