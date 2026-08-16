export interface Hostel {
  id: number;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Mess {
  id: number;
  hostel_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Resident {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  resident_code: string;
  room_number: string;
  hostel_id: number;
  hostel_name?: string;
  has_pin?: boolean;
}

export interface Invite {
  id: number;
  email: string;
  role: "warden" | "resident";
  hostel_id: number;
  room_number: string | null;
  name: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface MessEntry {
  id: number;
  resident_id: number;
  resident_name: string;
  resident_code: string;
  room_number: string;
  mess_id: number;
  mess_name: string;
  meal_type: string;
  entry_date: string;
  entry_time: string;
  status: "approved" | "rejected";
  rejection_reason: string | null;
  verified_by: number | null;
  verified_by_name: string | null;
}

export interface AuditEntry {
  id: number;
  actor_user_id: number | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
