export interface Member {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  parcel_count: number;
  role: 'member' | 'committee' | 'owner';
  status: 'active' | 'inactive';
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

export interface Statement {
  id: string;
  year: number;
  month: number;
  total_in: number;
  total_out: number;
  balance: number;
  expenses_by_aim: {
    court_case: number;
    construction: number;
    security: number;
    general: number;
  };
  contributors: Array<{ member_id: string; amount: number }>;
  html_content: string;
  created_at: number;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at: number | null;
  error: string | null;
  created_at: number;
}

export interface Meeting {
  id: string;
  date: number;
  title: string;
  notes: string | null;
  attendees: string[]; // member IDs
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface MeetingDecision {
  id: string;
  meeting_id: string;
  description: string;
  decided_by: string;
  created_at: number;
}

export interface MeetingAction {
  id: string;
  meeting_id: string;
  task: string;
  assigned_to: string | null;
  due_date: number | null;
  status: 'open' | 'done';
  created_at: number;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: number;
  time: string; // HH:MM format
  location: string | null;
  type: 'meeting' | 'event' | 'announcement';
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface Poll {
  id: string;
  question: string;
  choices: string[];
  status: 'open' | 'closed';
  deadline: number;
  created_by: string;
  created_at: number;
}

export interface Vote {
  id: string;
  poll_id: string;
  member_id: string;
  choice: string;
  created_at: number;
}
