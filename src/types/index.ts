export type TaskStatus = "upcoming" | "overdue" | "completed" | "canceled";

export interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  is_default: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  category_id: string;
  user_id: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  order_index: number;
  notification_minutes_before?: number; // Minute înainte de due_date pentru notificare
  enable_notification?: boolean; // Dacă notificarea este activată
}

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  phone_number?: string;
  created_at: string;
}

export interface TopCategory extends Category {
  count: number;
}

export interface CategoryStats {
  id: string;
  name: string;
  color: string;
  total: number;
  completed: number;
  active: number;
  completionRate: number;
}
