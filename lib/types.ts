export interface Member {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
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
