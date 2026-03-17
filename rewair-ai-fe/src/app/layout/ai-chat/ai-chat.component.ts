import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  SparklesIcon, ArrowRight01Icon, Cancel01Icon,
  AlertCircleIcon, MagicWand01Icon, Delete01Icon
} from '@hugeicons/core-free-icons';
import { ApiService } from '../../services/api.service';
import { WorkforceAiResponse } from '../../models/order.model';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  response?: WorkforceAiResponse;
  error?: string;
  loading?: boolean;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [FormsModule, HugeiconsIconComponent, MarkdownPipe],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss',
})
export class AiChatComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesEl!: ElementRef<HTMLDivElement>;

  // Icons
  AiIcon = SparklesIcon;
  SendIcon = ArrowRight01Icon;
  CloseIcon = Cancel01Icon;
  AlertIcon = AlertCircleIcon;
  TipIcon = MagicWand01Icon;
  ClearIcon = Delete01Icon;

  open = false;
  question = '';
  messages: ChatMessage[] = [];
  loading = false;
  private shouldScroll = false;

  examples = [
    'Cosa succede se la Lectra 3 va in manutenzione lunedì?',
    'Mostrami chi sa operare sia la Lectra che l\'ASM Big',
    'Riesco a consegnare l\'ordine Vestas nei tempi?',
    'Quali operatori coprono il taglio al pomeriggio?',
    'Quanto costa aggiungere 2 interinali la prossima settimana?',
  ];

  constructor(private api: ApiService) {}

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggle() { this.open = !this.open; }

  send() {
    const q = this.question.trim();
    if (!q || this.loading) return;

    this.messages.push({ role: 'user', text: q });
    this.messages.push({ role: 'ai', text: '', loading: true });
    this.question = '';
    this.loading = true;
    this.shouldScroll = true;

    this.api.workforceAiChat(q).subscribe({
      next: (res) => {
        const last = this.messages[this.messages.length - 1];
        last.loading = false;
        last.response = res;
        last.text = res.summary;
        this.loading = false;
        this.shouldScroll = true;
      },
      error: (err) => {
        const last = this.messages[this.messages.length - 1];
        last.loading = false;
        last.error = err.error?.error || 'Errore nella comunicazione con l\'AI.';
        this.loading = false;
        this.shouldScroll = true;
      },
    });
  }

  useExample(ex: string) {
    this.question = ex;
    this.send();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  clearChat() {
    this.messages = [];
    this.question = '';
  }

  entityIcon(type: string): string {
    switch (type) {
      case 'machine': return 'M';
      case 'worker': return 'O';
      case 'order': return 'P';
      default: return '?';
    }
  }

  private scrollToBottom() {
    const el = this.messagesEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
