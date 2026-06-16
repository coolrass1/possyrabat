export interface Member {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  parcel_count: number;
  role: 'member' | 'committee' | 'owner';
  created_at: number;
}

export interface Session {
  id: string;
  member_id: string;
  expires_at: number;
  created_at: number;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  session?: Session;
}

export interface EstateMap {
  id: string;
  image_data: string;
  caption: string | null;
  uploaded_by: string;
  uploaded_at: number;
}

export interface Case {
  id: string;
  title: string;
  opposing_party: string;
  court: string;
  stage: 'filed' | 'in progress' | 'hearing scheduled' | 'awaiting ruling' | 'ruling given' | 'appeal' | 'resolved' | 'closed';
  summary: string | null;
  opened_date: number;
  next_hearing_date: number | null;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface CaseStep {
  id: string;
  case_id: string;
  date: number;
  description: string;
  type: 'court_ruling' | 'lawyer_advice' | 'hearing' | 'filing' | 'group_decision' | 'other';
  document_url: string | null;
  logged_by: string;
  created_at: number;
}

export interface CaseDocument {
  id: string;
  case_id: string;
  filename: string;
  storage_path: string;
  uploaded_by: string;
  created_at: number;
}

export interface CaseAction {
  id: string;
  case_id: string;
  task: string;
  assigned_to: string;
  due_date: number;
  status: 'open' | 'done';
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface AuditEntry {
  id: string;
  entity_type: 'contribution' | 'expense' | 'case' | 'case_step' | 'member' | 'parcel';
  entity_id: string;
  action: 'created' | 'updated' | 'deleted';
  before_values: Record<string, any> | null;
  after_values: Record<string, any>;
  performed_by: string;
  created_at: number;
}
