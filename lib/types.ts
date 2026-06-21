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
  must_change_password: boolean;
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
  lawyer_name: string | null;
  lawyer_contact: string | null;
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
  mime_type: string | null;
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
  entity_type: 'contribution' | 'expense' | 'case' | 'case_step' | 'member' | 'parcel' | 'target_payment';
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

export type MeetingStatus = 'Planned' | 'Completed' | 'Cancelled';

export interface Meeting {
  id: string;
  date: number;
  title: string;
  notes: string | null;
  location: string | null;
  agenda: string | null;
  description: string | null;
  status: MeetingStatus;
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

export interface MeetingDocument {
  id: string;
  meeting_id: string;
  filename: string;
  kind: 'minutes' | 'report' | 'other';
  mime_type: string | null;
  storage_path: string;
  uploaded_by: string;
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

export interface CommunityPost {
  id: string;
  type: 'story' | 'notice' | 'gratitude';
  title: string | null;
  body: string;
  image_data: string | null;
  author_id: string;
  created_at: number;
}

export interface Campaign {
  id: string;
  name: string;
  purpose: string | null;
  aim: 'court_case' | 'construction' | 'security' | 'general';
  target_amount: number;
  deadline: number | null;
  status: 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: number;
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

export interface TargetQuarter {
  id: string;
  name: string;
  start_date: number;
  end_date: number;
  target_amount: number;
  created_at: number;
}

export interface TargetMonth {
  id: string;
  quarter_id: string;
  name: string;
  target_amount: number;
  created_at: number;
}

export interface MemberQuarterObligation {
  id: string;
  member_id: string;
  quarter_id: string;
  amount_due: number;
  created_at: number;
  updated_at: number;
}

export interface TargetPayment {
  id: string;
  member_id: string;
  quarter_id: string | null;
  month_id: string | null;
  amount: number;
  date_paid: number;
  method: string;
  notes: string | null;
  recorded_by: string;
  updated_by: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}



export interface Land {
  id: string;
  name: string;
  reference: string | null;
  location: string | null;
  area: number;
  description: string | null;
  created_at: number;
}

export interface LandDocument {
  id: string;
  land_id: string;
  filename: string;
  mime_type: string | null;
  storage_path: string;
  uploaded_by: string;
  created_at: number;
}

export interface LandHolding {
  land: Land;
  shares: number;
  ownership_percentage: number;
  surface: number;
}

export interface LandOverview {
  total_area: number;
  total_shares: number;
  parcels: Land[];
}
