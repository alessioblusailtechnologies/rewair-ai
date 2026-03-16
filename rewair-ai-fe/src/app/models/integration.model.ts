export interface IntegrationConfig {
  id: string;
  type: 'email_google' | 'whatsapp' | 'sap';
  label: string;
  email_address: string | null;
  has_credentials: boolean;
  imap_host: string;
  imap_port: number;
  is_active: boolean;
  last_poll_at: string | null;
  last_poll_status: string | null;
  last_error: string | null;
}

export interface EmailLog {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  is_order: boolean;
  order_id: string | null;
  ai_confidence: number | null;
  ai_summary: string | null;
  error_message: string | null;
  status: 'processed' | 'order_created' | 'not_order' | 'error';
  processed_at: string;
}
