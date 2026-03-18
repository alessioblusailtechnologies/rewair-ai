import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiService } from './api.service';
import { Order } from '../models/order.model';

export interface NewOrderEvent {
  order: Order;
}

@Injectable({ providedIn: 'root' })
export class OrderPollingService {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private knownOrderIds = new Set<string>();
  private seeded = false;
  private polling = false;

  /** Emits when a new order is detected */
  readonly newOrder$ = new Subject<NewOrderEvent>();

  /** Set of order IDs that haven't been seen by the user yet */
  unseenOrderIds = new Set<string>();

  /** Whether there are unseen orders (for sidebar badge) */
  get hasUnseen(): boolean {
    return this.unseenOrderIds.size > 0;
  }

  constructor(private api: ApiService, private zone: NgZone) {}

  /** Start polling — call once from app root */
  start(intervalMs = 15000) {
    if (this.pollInterval) return;

    console.log('[OrderPolling] Starting — interval:', intervalMs / 1000, 's');

    // Seed known IDs immediately
    this.poll(true);

    // Run interval outside Angular zone to avoid unnecessary change detection,
    // then re-enter zone only when we detect a new order.
    this.zone.runOutsideAngular(() => {
      this.pollInterval = setInterval(() => this.poll(false), intervalMs);
    });
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[OrderPolling] Stopped');
    }
  }

  /** Mark all unseen orders as seen */
  markAllSeen() {
    this.unseenOrderIds.clear();
  }

  private poll(isSeed: boolean) {
    if (this.polling) return;
    this.polling = true;

    console.log('[OrderPolling] Polling...', isSeed ? '(seed)' : '');

    this.api.getOrders().subscribe({
      next: orders => {
        this.polling = false;

        if (!this.seeded) {
          // First successful call — just learn existing IDs
          orders.forEach(o => this.knownOrderIds.add(o.id));
          this.seeded = true;
          console.log('[OrderPolling] Seeded with', orders.length, 'orders');
          return;
        }

        // Check for new orders
        const newOrders: Order[] = [];
        for (const order of orders) {
          if (!this.knownOrderIds.has(order.id)) {
            this.knownOrderIds.add(order.id);
            this.unseenOrderIds.add(order.id);
            newOrders.push(order);
          }
        }

        if (newOrders.length > 0) {
          console.log('[OrderPolling] Detected', newOrders.length, 'new order(s)');
          // Re-enter Angular zone so UI updates
          this.zone.run(() => {
            for (const order of newOrders) {
              this.newOrder$.next({ order });
            }
          });
        }
      },
      error: err => {
        this.polling = false;
        console.warn('[OrderPolling] Error:', err.message || err);
      },
    });
  }
}
