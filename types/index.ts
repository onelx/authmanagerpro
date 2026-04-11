export type UserStatus = 
  | 'pending_verification' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  status: UserStatus;
  is_admin: boolean;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  profile?: Profile;
}

export interface AdminStats {
  total_users: number;
  pending_verification: number;
  pending_approval: number;
  approved: number;
  rejected: number;
}

export interface AdminConfig {
  id: string;
  key: string;
  value: Record<string, any>;
  updated_at: string;
  updated_by: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_id: string | null;
  target_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailTemplates {
  verification: EmailTemplate;
  pending_approval: EmailTemplate;
  approved: EmailTemplate;
  rejected: EmailTemplate;
  admin_notification: EmailTemplate;
}

export interface RegisterFormData {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ApproveUserData {
  user_id: string;
}

export interface RejectUserData {
  user_id: string;
  rejection_reason?: string;
}

export interface UpdateSettingsData {
  admin_email?: string;
  email_templates?: Partial<EmailTemplates>;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface FilterParams {
  status?: UserStatus;
  search?: string;
}

export interface UsersListParams extends PaginationParams, FilterParams {}

export interface UsersListResponse {
  users: Profile[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface UserStatusInfo {
  status: UserStatus;
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  needsVerification: boolean;
  needsApproval: boolean;
  canAccess: boolean;
  statusLabel: string;
  statusColor: string;
}
