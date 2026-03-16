import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Order, Customer, Product } from '../../models/order.model';

interface OrderLineForm {
  product_id: string;
  quantity: number;
  due_date: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  customers: Customer[] = [];
  products: Product[] = [];
  loading = true;

  searchTerm = '';
  filterStatus = '';
  filterCustomer = '';

  // Modal
  showModal = false;
  saving = false;
  form = {
    order_number: '',
    customer_id: '',
    order_date: '',
    requested_delivery_date: '',
    priority: 5,
    notes: '',
  };
  formLines: OrderLineForm[] = [];

  statusMap: Record<string, string> = {
    new: 'Nuovo', confirmed: 'Confermato', in_progress: 'In Produzione',
    completed: 'Completato', cancelled: 'Annullato'
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
    this.api.getProducts().subscribe(p => this.products = p);
  }

  loadData() {
    this.loading = true;
    this.api.getOrders().subscribe({
      next: orders => { this.orders = orders; this.applyFilters(); this.loading = false; },
      error: () => this.loading = false,
    });
    this.api.getCustomers().subscribe(c => this.customers = c);
  }

  applyFilters() {
    const search = this.searchTerm.toLowerCase();
    this.filteredOrders = this.orders.filter(o => {
      const matchSearch = !search
        || o.order_number.toLowerCase().includes(search)
        || (o.customer?.name || '').toLowerCase().includes(search)
        || (o.lines || []).some(l => (l.product?.name || '').toLowerCase().includes(search));
      const matchStatus = !this.filterStatus || o.status === this.filterStatus;
      const matchCustomer = !this.filterCustomer || o.customer_id === this.filterCustomer;
      return matchSearch && matchStatus && matchCustomer;
    });
  }

  priorityLabel(p: number): string {
    if (p <= 2) return 'Urgente';
    if (p <= 4) return 'Alta';
    if (p <= 6) return 'Normale';
    return 'Bassa';
  }

  priorityClass(p: number): string {
    if (p <= 2) return 'urgente';
    if (p <= 4) return 'alta';
    return 'normale';
  }

  totalQty(order: Order): number {
    return (order.lines || []).reduce((sum, l) => sum + l.quantity, 0);
  }

  productSummary(order: Order): string {
    return (order.lines || []).map(l => l.product?.name || l.product_id).join(', ');
  }

  deleteOrder(order: Order) {
    if (!confirm(`Eliminare ordine ${order.order_number}?`)) return;
    this.api.deleteOrder(order.id).subscribe(() => this.loadData());
  }

  // ==================== AI Document Modal ====================
  showAIModal = false;
  aiStep: 'upload' | 'processing' | 'preview' = 'upload';
  aiFile: File | null = null;
  aiResult: any = null;
  aiError = '';

  openAIModal() {
    this.showAIModal = true;
    this.aiStep = 'upload';
    this.aiFile = null;
    this.aiResult = null;
    this.aiError = '';
  }

  closeAIModal() { this.showAIModal = false; }

  onAIFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.aiFile = input.files[0];
    }
  }

  processDocument() {
    if (!this.aiFile) return;
    this.aiStep = 'processing';
    this.aiError = '';

    this.api.extractOrderFromDocument(this.aiFile).subscribe({
      next: result => {
        this.aiResult = result;
        this.aiStep = 'preview';
      },
      error: err => {
        this.aiError = err?.error?.error || 'Errore durante l\'estrazione AI.';
        this.aiStep = 'upload';
      },
    });
  }

  hasResolvableLines(): boolean {
    return (this.aiResult?.lines || []).some((l: any) => l.product_id);
  }

  confirmAIOrder() {
    if (!this.aiResult) return;
    this.saving = true;

    const lines = (this.aiResult.lines || [])
      .filter((l: any) => l.product_id)
      .map((l: any, i: number) => ({
        line_number: i + 1,
        product_id: l.product_id,
        quantity: l.quantity,
        due_date: l.due_date || this.aiResult.requested_delivery_date,
      }));

    this.api.createOrder({
      order_number: this.aiResult.order_number || `AI-${Date.now()}`,
      customer_id: this.aiResult.customer_id,
      order_date: this.aiResult.order_date || new Date().toISOString().split('T')[0],
      requested_delivery_date: this.aiResult.requested_delivery_date,
      priority: this.aiResult.priority || 5,
      status: 'new',
      notes: `[AI] ${this.aiResult.raw_summary || 'Generato da documento'}`,
      lines,
    }).subscribe({
      next: () => { this.saving = false; this.closeAIModal(); this.loadData(); },
      error: () => this.saving = false,
    });
  }

  // ==================== Manual Order Modal ====================
  openModal() {
    this.showModal = true;
    const today = new Date().toISOString().split('T')[0];
    this.form = {
      order_number: '',
      customer_id: '',
      order_date: today,
      requested_delivery_date: '',
      priority: 5,
      notes: '',
    };
    this.formLines = [{ product_id: '', quantity: 1, due_date: '' }];
  }

  closeModal() { this.showModal = false; }

  addLine() {
    this.formLines.push({ product_id: '', quantity: 1, due_date: this.form.requested_delivery_date });
  }

  removeLine(i: number) {
    if (this.formLines.length > 1) this.formLines.splice(i, 1);
  }

  get canSave(): boolean {
    return !!this.form.order_number
      && !!this.form.customer_id
      && !!this.form.order_date
      && !!this.form.requested_delivery_date
      && this.formLines.length > 0
      && this.formLines.every(l => !!l.product_id && l.quantity > 0);
  }

  saveOrder() {
    if (!this.canSave) return;
    this.saving = true;

    const lines = this.formLines.map((l, i) => ({
      line_number: i + 1,
      product_id: l.product_id,
      quantity: l.quantity,
      due_date: l.due_date || this.form.requested_delivery_date,
    }));

    this.api.createOrder({
      order_number: this.form.order_number,
      customer_id: this.form.customer_id,
      order_date: this.form.order_date,
      requested_delivery_date: this.form.requested_delivery_date,
      priority: this.form.priority,
      status: 'new',
      notes: this.form.notes || null,
      lines,
    }).subscribe({
      next: () => { this.saving = false; this.closeModal(); this.loadData(); },
      error: () => this.saving = false,
    });
  }
}
