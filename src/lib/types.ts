// Multi-Tenant SaaS Type Definitions

export type UserRole = 'owner' | 'manager' | 'accountant' | 'employee';

export type TransactionType =
  | 'sale'
  | 'expense'
  | 'purchase'
  | 'money_received'
  | 'money_paid'
  | 'receivable'
  | 'payable';

export type PaymentStatus = 'paid' | 'pending' | 'partial';

export type TransactionSource = 'telegram' | 'web';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface TelegramConnectionToken {
  id: string;
  business_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface TelegramConnection {
  id: string;
  business_id: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  telegram_username: string | null;
  connected_at: string;
  status: 'active' | 'disconnected';
  last_message_at: string | null;
}

export interface GoogleConnection {
  id: string;
  business_id: string;
  google_user_id: string | null;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  connected_at: string;
  status: 'active' | 'error' | 'disconnected';
}

export interface Transaction {
  id: string;
  business_id: string;
  created_by: string | null;
  telegram_connection_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  item: string;
  quantity: number;
  category: string;
  customer_name: string | null;
  supplier_name: string | null;
  payment_status: PaymentStatus;
  description: string | null;
  transaction_date: string;
  source: TransactionSource;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  transaction_id: string;
  business_id: string;
  target: 'google_sheets';
  status: 'pending' | 'success' | 'failed';
  error_message: string | null;
  retries: number;
  synced_at: string;
}

export interface AIExtractionResult {
  isAmbiguous: boolean;
  clarificationMessage?: string;
  transaction?: {
    transaction_type: TransactionType;
    amount: number;
    currency: string;
    item: string;
    quantity: number;
    category: string;
    customer_name?: string;
    supplier_name?: string;
    payment_status: PaymentStatus;
    description?: string;
    transaction_date?: string;
  };
}
