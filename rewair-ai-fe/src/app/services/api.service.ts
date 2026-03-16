import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Order, Customer, Product, OrderLine,
  Worker, Machine, ShiftType, ProductionSchedule,
  WorkforceAssignment, WorkforceGap
} from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // --- Config ---
  getShifts(): Observable<ShiftType[]> {
    return this.http.get<ShiftType[]>(`${this.url}/config/shifts`);
  }

  // --- Customers ---
  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.url}/orders/customers`);
  }

  // --- Products ---
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/products`);
  }

  // --- Orders ---
  getOrders(filters?: { status?: string; customer_id?: string }): Observable<Order[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    return this.http.get<Order[]>(`${this.url}/orders`, { params });
  }

  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.url}/orders/${id}`);
  }

  createOrder(order: Omit<Partial<Order>, 'lines'> & { lines?: Partial<OrderLine>[] }): Observable<Order> {
    return this.http.post<Order>(`${this.url}/orders`, order);
  }

  updateOrder(id: string, data: Partial<Order>): Observable<Order> {
    return this.http.put<Order>(`${this.url}/orders/${id}`, data);
  }

  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/orders/${id}`);
  }

  // --- Workers ---
  getWorkers(filters?: { is_active?: boolean; contract_type?: string }): Observable<Worker[]> {
    let params = new HttpParams();
    if (filters?.is_active !== undefined) params = params.set('is_active', String(filters.is_active));
    if (filters?.contract_type) params = params.set('contract_type', filters.contract_type);
    return this.http.get<Worker[]>(`${this.url}/workers`, { params });
  }

  // --- Machines ---
  getMachines(filters?: { phase_code?: string; is_active?: boolean }): Observable<Machine[]> {
    let params = new HttpParams();
    if (filters?.phase_code) params = params.set('phase_code', filters.phase_code);
    if (filters?.is_active !== undefined) params = params.set('is_active', String(filters.is_active));
    return this.http.get<Machine[]>(`${this.url}/machines`, { params });
  }

  // --- Schedule ---
  getSchedule(filters?: { from?: string; to?: string; machine_id?: string; phase_code?: string; status?: string }): Observable<ProductionSchedule[]> {
    let params = new HttpParams();
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.machine_id) params = params.set('machine_id', filters.machine_id);
    if (filters?.phase_code) params = params.set('phase_code', filters.phase_code);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<ProductionSchedule[]>(`${this.url}/schedule`, { params });
  }

  createSchedule(data: Omit<Partial<ProductionSchedule>, 'assignments'> & { assignments?: Partial<WorkforceAssignment>[] }): Observable<ProductionSchedule> {
    return this.http.post<ProductionSchedule>(`${this.url}/schedule`, data);
  }

  updateSchedule(id: string, data: Partial<ProductionSchedule>): Observable<ProductionSchedule> {
    return this.http.put<ProductionSchedule>(`${this.url}/schedule/${id}`, data);
  }

  // --- Workforce Assignments ---
  createAssignment(scheduleId: string, data: Partial<WorkforceAssignment>): Observable<WorkforceAssignment> {
    return this.http.post<WorkforceAssignment>(`${this.url}/schedule/${scheduleId}/assignments`, data);
  }

  updateAssignment(id: string, data: Partial<WorkforceAssignment>): Observable<WorkforceAssignment> {
    return this.http.put<WorkforceAssignment>(`${this.url}/schedule/assignments/${id}`, data);
  }

  deleteAssignment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/schedule/assignments/${id}`);
  }

  // --- AI ---
  extractOrderFromDocument(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.url}/ai/extract-order`, formData);
  }

  // --- Order Lines (for schedule form) ---
  getOrderLines(orderId: string): Observable<OrderLine[]> {
    return this.http.get<OrderLine[]>(`${this.url}/orders/${orderId}/lines`);
  }

  // --- Analytics Views ---
  getWorkforceGap(from?: string, to?: string): Observable<WorkforceGap[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<WorkforceGap[]>(`${this.url}/schedule/views/workforce-gap`, { params });
  }
}
