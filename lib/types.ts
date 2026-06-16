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
