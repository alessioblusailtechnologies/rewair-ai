import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Mail01Icon, Cancel01Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import { OrderPollingService, NewOrderEvent } from '../../services/order-polling.service';

interface Toast {
  id: number;
  orderNumber: string;
  customerName: string;
  visible: boolean;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [HugeiconsIconComponent],
  template: `
    <div class="toast-container">
      @for (toast of toasts; track toast.id) {
        <div class="toast" [class.visible]="toast.visible" [class.hiding]="!toast.visible">
          <div class="toast-icon">
            <hugeicons-icon [strokeWidth]="1.5" [icon]="SparklesIcon" [size]="16" color="white" />
          </div>
          <div class="toast-content">
            <span class="toast-title">Nuovo ordine da email</span>
            <span class="toast-detail">
              <strong>{{ toast.orderNumber }}</strong> — {{ toast.customerName }}
            </span>
          </div>
          <button class="toast-close" (click)="dismiss(toast)">
            <hugeicons-icon [strokeWidth]="1.5" [icon]="CancelIcon" [size]="14" color="currentColor" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--N0);
      border: 1px solid var(--N30);
      border-radius: var(--r-lg);
      box-shadow: 0 12px 32px -4px rgba(9,30,66,0.18), 0 0 1px rgba(9,30,66,0.2);
      min-width: 360px;
      pointer-events: auto;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &.visible {
        opacity: 1;
        transform: translateY(0);
      }

      &.hiding {
        opacity: 0;
        transform: translateY(-12px);
      }
    }

    .toast-icon {
      width: 32px;
      height: 32px;
      background: var(--rw-orange);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .toast-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .toast-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--N900);
    }

    .toast-detail {
      font-size: 12px;
      color: var(--N300);

      strong {
        color: var(--rw-blue);
        font-weight: 600;
      }
    }

    .toast-close {
      background: none;
      border: none;
      color: var(--N200);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--r-sm);
      transition: all 0.15s;
      flex-shrink: 0;

      &:hover {
        background: var(--N20);
        color: var(--N500);
      }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  MailIcon = Mail01Icon;
  CancelIcon = Cancel01Icon;
  SparklesIcon = SparklesIcon;

  toasts: Toast[] = [];
  private nextId = 0;
  private sub!: Subscription;

  constructor(private polling: OrderPollingService) {}

  ngOnInit() {
    this.sub = this.polling.newOrder$.subscribe(event => this.show(event));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  show(event: NewOrderEvent) {
    const toast: Toast = {
      id: this.nextId++,
      orderNumber: event.order.order_number,
      customerName: event.order.customer?.name || 'Cliente',
      visible: false,
    };
    this.toasts.push(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.visible = true;
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => this.dismiss(toast), 5000);
  }

  dismiss(toast: Toast) {
    toast.visible = false;
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== toast.id);
    }, 300);
  }
}
