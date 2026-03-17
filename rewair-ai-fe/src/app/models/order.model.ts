// --- Sede (frontend only) ---
export interface Sede {
  name: string;
  country: string;
  label: string;
}

// --- Supabase models ---
export interface Customer {
  id: string;
  code: string;
  name: string;
  priority_class: string;
  country: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  product_type: string;
  kit_category: string;
}

export interface OrderLine {
  id: string;
  order_id: string;
  line_number: number;
  product_id: string;
  quantity: number;
  quantity_completed: number;
  due_date: string;
  status: string;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  requested_delivery_date: string;
  confirmed_delivery_date: string | null;
  priority: number;
  status: string;
  notes: string | null;
  customer?: Customer;
  lines?: OrderLine[];
}

// --- Workforce models ---
export interface ShiftType {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  net_hours: number;
}

export interface Worker {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  contract_type: string;
  hire_date: string;
  hourly_cost: number;
  weekly_hours: number;
  is_active: boolean;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  machine_type: string;
  phase_code: string;
  avg_operators: number;
  is_active: boolean;
}

export interface ProductionSchedule {
  id: string;
  order_line_id: string;
  phase_code: string;
  machine_id: string;
  planned_date: string;
  shift_type_id: string;
  planned_quantity: number;
  status: string;
  order_line?: OrderLine & { order?: Order & { customer?: Customer }; product?: Product };
  machine?: Machine;
  shift?: ShiftType;
  assignments?: WorkforceAssignment[];
}

export interface WorkforceAssignment {
  id: string;
  schedule_id: string;
  worker_id: string;
  role: string;
  planned_hours: number;
  actual_hours: number | null;
  status: string;
  worker?: Worker;
}

export interface WorkforceGap {
  date: string;
  shift_name: string;
  phase_name: string;
  operators_needed: number;
  available_workers: number;
  gap: number;
}

export interface WorkforceAiResponse {
  summary: string;
  answer: string;
  impact: 'positive' | 'negative' | 'neutral' | 'warning';
  data_points: { label: string; value: string }[];
  affected_entities: { type: 'machine' | 'worker' | 'order'; name: string; code: string }[];
  recommendations: string[];
}
