export interface Agent {
  id: string;
  name: string;
  description: string;
  agent_type: 'reporter' | 'monitor' | 'scheduler' | 'custom';
  system_prompt: string | null;
  trigger_type: 'scheduled' | 'event' | 'manual';
  schedule_cron: string | null;
  status: 'active' | 'paused' | 'error';
  last_run_at: string | null;
  last_run_status: 'success' | 'failed' | 'pending' | null;
  last_error: string | null;
  config: Record<string, any>;
  created_via: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentExecution {
  id: string;
  agent_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'failed';
  output: { result: string; pdf_generated?: boolean; email_sent?: boolean; email_recipients?: string[] } | null;
  error_message: string | null;
}
