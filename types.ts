// FIX: Converted all interfaces to types to fix Supabase type inference issues.

// FIX: Exported UserRole as a const object for enum-like access and a type for type safety.
export const UserRole = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  SALES_EXECUTIVE: 'Sales Executive',
  RECEPTIONIST: 'Receptionist',
  TEAM_LEADER: 'Team Leader',
  SERVICE_EXECUTIVE: 'Service Executive',
  BRANCH_MANAGER: 'Branch Manager',
  ACCOUNTS_TEAM: 'Accounts Team',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

// FIX: Exported LeadStatus as a const object for enum-like access and a type for type safety.
export const LeadStatus = {
  NEW_LEAD: 'New Lead',
  LEAD_CONFIRMED: 'Lead Confirmed',
  DOCS_AND_PAYMENTS: 'Documents & Payments',
  IN_PROGRESS: 'In-Progress',
  SUCCESS: 'Success',
  LOST: 'Lost',
} as const;
export type LeadStatus = typeof LeadStatus[keyof typeof LeadStatus];

// FIX: Exported LeadPriority as a const object for enum-like access and a type for type safety.
export const LeadPriority = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
} as const;
export type LeadPriority = typeof LeadPriority[keyof typeof LeadPriority];

export const TaskPriority = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

export interface City {
  id: string;
  city_name: string;
  city_code: string;
  state: string | null;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  manager_id: string | null;
  city_id: string | null;
  city_name: string | null;
  is_active: boolean;
  logo_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export type Payment = {
  id: string;
  amount: number; // Keep for backward compatibility (maps to received)
  date: string;
  method: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cheque' | 'Other';
  notes?: string;
  receipt_number: string;
  reference_number?: string; // Auto-generated reference number
  service_set_id?: string;
  service_name?: string;
  
  // New Fields
  tax?: number;
  fee?: number;
  total?: number; // tax + fee
  received?: number; // actual paid
  due?: number; // total - received
  sales_amount?: number; // independent sales credit
}

export type Task = {
  id: string;
  content: string;
  due_date?: string;
  is_completed: boolean;
  created_at: string;
  completed_at?: string;
  created_by: User;
  priority: TaskPriority;
  assigned_to?: User;
  status?: 'todo' | 'in_progress' | 'review' | 'done';
  category?: 'work_order' | 'internal' | 'client_task';
  estimated_hours?: number;
  actual_hours?: number;
  branch_id?: string;
  depends_on_task_id?: string;
}

export type Notification = {
  id: string;
  user_id: string; // The ID of the user who should receive the notification
  // FIX: Replaced enum with string literal union to align with Supabase schema types and fix 'never' type errors.
  type: 'Lead Assigned' | 'Status Updated' | 'Note Added' | 'Document Uploaded' | 'Payment Completed';
  title: string;
  message: string;
  link?: {
    page: 'Lead Detail' | 'Customer Detail';
    id: string; // The ID of the lead or customer
  };
  is_read: boolean;
  created_at: string;
}

export type Activity = {
  id: string;
  type: 'Note' | 'Status Change' | 'Document Upload' | 'Call' | 'Email';
  content: string;
  created_at: string;
  user: User;
}

export type UserActivity = {
  id: string;
  user_id: string;
  action: string;
  details: string;
  timestamp: string;
}

export type TransferLog = {
  id: string;
  employee_id: string;
  from_city_id?: string;
  from_branch_id?: string;
  to_city_id?: string;
  to_branch_id?: string;
  transferred_by: string;
  transfer_type: 'Branch Transfer' | 'City Transfer';
  created_at: string;
  
  // Joined fields for display
  employee_name?: string;
  from_city_name?: string;
  from_branch_name?: string;
  to_city_name?: string;
  to_branch_name?: string;
  transferred_by_name?: string;
}

export type Document = {
  id: string;
  name: string; // original filename
  type: string; // user-selected document type
  url: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  uploaded_at: string;
  verification_notes?: string;
}

export type User = {
  city_id?: string | null;
  city_name?: string | null;
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  // FIX: Replaced enum with string literal union to align with Supabase schema types and fix 'never' type errors.
  role: UserRole;
  department?: 'Sales' | 'Operations' | 'HR' | 'CA' | 'Others';
  skills?: string[];
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  last_updated: string;
  branch_name?: string;
  branch_id?: string;
  created_by?: string;
  is_online?: boolean;
  last_seen?: string;
  reporting_to?: string | null;
  employee_code?: string | null;
  address?: string | null;
}

export type SubserviceDetail = {
  name: string;
  quantity: number;
  amount: number;
  is_tax_applicable?: boolean;
  tax_amount?: number;
  total_amount?: number;
}

export type ServiceSet = {
  id: string; // for client-side keying
  mainService: string;
  subservices: SubserviceDetail[];
  service_fee?: number;
  advance_amount?: number;
  payment_mode?: string;
  discount?: number;
  promo_code?: string;
  promo_discount_type?: 'fixed' | 'percentage';
  promo_discount_value?: number;
}

export type Lead = {
  city_id?: string | null;
  city_name?: string | null;
  id: string;
  business_name: string;
  business_category?: string;
  industry_type?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  alternate_mobile?: string;
  alternate_is_whatsapp?: boolean;
  pan_number?: string;
  residential_address?: string;
  business_address?: string;
  personal_flat_no?: string | null;
  personal_street?: string | null;
  personal_city?: string | null;
  personal_state?: string | null;
  personal_country?: string | null;
  personal_zip_code?: string | null;
  business_flat_no?: string | null;
  business_street?: string | null;
  business_city?: string | null;
  business_state?: string | null;
  business_country?: string | null;
  business_zip_code?: string | null;
  gender?: 'Male' | 'Female' | 'Other';
  service_requested: string;
  // FIX: Replaced enum with string literal union to align with Supabase schema types and fix 'never' type errors.
  status: LeadStatus;
  // FIX: Replaced enum with string literal union to align with Supabase schema types and fix 'never' type errors.
  priority: LeadPriority;
  assigned_to?: User;
  assigned_by?: string;
  assigner?: User; // The user who assigned this lead
  admin_id?: string;
  created_by?: string; // ID of the creator
  assigned_at?: string; // Timestamp of assignment
  branch_id?: string;
  branch_name?: string;
  created_at: string;
  last_contacted: string;
  next_follow_up?: string;
  source: string;
  lead_source_id?: string | null;
  referred_by_customer_id?: string | null;
  referred_by_employee_id?: string | null;
  notes?: string;
  total_payment?: number;
  advance_amount?: number;
  remaining_amount?: number;
  payments?: Payment[];
  documents?: Document[];
  activities?: Activity[];
  tasks?: Task[];
  service_sets?: ServiceSet[];
  avatar_url?: string;
  score?: number;
  reference_number?: string; // Auto-generated reference (e.g. 24EF-2026-0001)
}

export type Customer = {
  city_id?: string | null;
  city_name?: string | null;
  id: string; // customer_id
  lead_id: string;
  name: string; // customer_name from firstName + lastName
  email: string;
  phone: string;
  alternate_mobile?: string;
  alternate_is_whatsapp?: boolean;
  pan_number?: string;
  gender?: 'Male' | 'Female' | 'Other';
  business_name: string;
  business_category?: string;
  industry_type?: string;
  service_name: string;
  sub_service?: string; // For simplicity, we'll use the main service name
  lead_source: string;
  lead_source_id?: string | null;
  referred_by_customer_id?: string | null;
  referred_by_employee_id?: string | null;
  created_by?: User; // User who created the lead
  date_of_enroll: string; // Corresponds to lead's created_at
  date_of_completion: string; // Corresponds to lead's last_contacted when converted
  residential_address?: string;
  business_address?: string;
  personal_flat_no?: string | null;
  personal_street?: string | null;
  personal_city?: string | null;
  personal_state?: string | null;
  personal_country?: string | null;
  personal_zip_code?: string | null;
  business_flat_no?: string | null;
  business_street?: string | null;
  business_city?: string | null;
  business_state?: string | null;
  business_country?: string | null;
  business_zip_code?: string | null;
  assigned_to?: User;
  branch_id?: string;
  branch_name?: string;
  service_sets?: ServiceSet[];
  uploaded_documents?: Document[];
  avatar_url?: string;
  payment_details: {
    total_payment?: number;
    payments?: Payment[];
  };
  created_at: string;
  updated_at: string;

  aadhar_number?: string;
  service_amount?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number; // Should match payment_details.total_payment but explicit column
  paid_amount?: number;
  due_amount?: number;
  status?: string;
  feedback?: string;
  date_of_birth?: string;
  reference_number?: string;
}

export type Offer = {
  id: string;
  name: string;
  promo_code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
  max_usage?: number;
  usage_count: number;
  service_id?: string;
  offer_type: 'festival' | 'referral' | 'first-customer' | 'combo';
  created_at: string;
  created_by?: string;
}

export type OrganizationSettings = {
  id: string;
  company_name: string;
  company_address: string;
  company_email: string;
  company_phone: string;
  lead_sources: string[];
  billing_info: {
    gstRate: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  created_at: string;
  updated_at: string;
}

export type UserNotificationPreferences = {
  email: boolean;
  push: boolean;
}

export type SubService = {
  city_id?: string | null;
  city_name?: string | null;
  id: string;
  service_id: string; // Foreign key
  name: string;
  price: number;
  required_documents: string[];
  is_active: boolean;
  branch_id?: string;
  created_at: string;
}

export type AssetStatus = 'In Stock' | 'Assigned' | 'Damaged' | 'Lost';
export type AssetCondition = 'New' | 'Good' | 'Fair' | 'Damaged' | 'Lost';

export type Asset = {
  id: string;
  name: string;
  category: string;
  serial_no: string;
  purchase_date: string; // ISO date string
  status: AssetStatus;
  remarks?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  assigned_to?: User; // Joined field
}

export type AssetAssignment = {
  id: string;
  asset_id: string;
  employee_id: string;
  assign_date: string;
  return_date?: string;
  condition_on_assign: AssetCondition;
  condition_on_return?: AssetCondition;
  notes?: string;
  return_notes?: string;
  created_at: string;
  created_by?: string;
  asset?: Asset; // Joined
  employee?: User; // Joined
}

export type Service = {
  city_id?: string | null;
  city_name?: string | null;
  id: string;
  name: string;
  is_active: boolean;
  branch_id?: string;
  created_at: string;
  sub_services?: SubService[];
}

export interface InvoiceItem {
  sno: number;
  service_name: string;
  description: string;
  qty: number;
  rate: number;
  discount_amount: number;
  discount_percent: number;
  amount: number;
}

export interface TaxBreakdown {
  type: string;
  rate: number;
  amount: number;
}

export interface InvoiceTotals {
  total_qty: number;
  subtotal: number;
  tax_breakdown: TaxBreakdown[];
  total_amount: number;
  previous_balance: number;
  current_balance: number;
  amount_in_words: string;
}

export interface InvoiceData {
  invoice_no: string;
  invoice_datetime: string;
  company: {
    name: string;
    address: string;
    gstin: string;
    pan: string;
    phone: string;
    email: string;
    website: string;
  };
  bill_to: {
    name: string;
    place_of_supply: string;
    mobile: string;
    address?: string;
  };
  items: InvoiceItem[];
  totals: InvoiceTotals;
  bank_details: {
    account_name: string;
    ifsc: string;
    account_no: string;
    bank_name: string;
  };
  payment: {
    upi_id: string;
    qr_image_url?: string;
  };
  terms: string[];
  authorized_signatory: {
    name: string;
    signature_image_url?: string;
  };
}

export type WebLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_interested?: string;
  message?: string;
  status: 'Pending' | 'Contacted' | 'Converted' | 'Spam';
  assigned_to?: string; // profile_id of assigned agent
  created_at: string;
}

export type Blog = {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  category: string;
  status: 'Draft' | 'Published';
  read_time: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export type Testimonial = {
  id: string;
  client_name: string;
  company?: string;
  avatar_url?: string;
  rating: number; // 1 to 5
  review_text: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type Invoice = {
  id: string;
  invoice_number?: string;
  customer_id: string | null;
  lead_id: string | null;
  branch_id?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  due_date: string;
  paid_date?: string | null;
  pdf_url?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields for display
  customer_name?: string;
  lead_name?: string;
  creator_name?: string;
};

export type InvoicePayment = {
  id: string;
  invoice_id: string;
  payment_id: string;
  amount: number;
  created_at: string;
};

export type CompanyPolicy = {
  id: string;
  name: string;
  content: string;
  version: number;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: 'personal' | 'task_assigned';
  due_date: string;
  due_time?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'snoozed' | 'completed' | 'overdue';
  is_recurring?: boolean;
  recurrence_pattern?: string;
  assigned_by?: string;
  assigned_to?: string;
  related_lead_id?: string;
  related_customer_id?: string;
  branch_id?: string;
  completed_at?: string;
  snoozed_until?: string;
  created_at: string;
  updated_at: string;
  
  // Display helpers
  assigned_by_name?: string;
  assigned_to_name?: string;
  lead_name?: string;
  customer_name?: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'policy_update' | 'urgent';
  target_roles: string[];
  target_branches: string[];
  is_pinned: boolean;
  expires_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Display helpers
  creator_name?: string;
  is_read?: boolean;
};

export type AnnouncementRead = {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
};

export type SupportTicket = {
  id: string;
  title: string;
  description: string;
  category: 'Technical' | 'Account' | 'Service' | 'General';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  created_by: string;
  assigned_to?: string | null;
  branch_id?: string | null;
  attachments?: string[];
  sla_response_deadline?: string | null;
  sla_resolution_deadline?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joins
  creator_name?: string;
  assignee_name?: string;
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  attachments?: string[];
  created_at: string;
  user_name?: string;
  user_avatar?: string;
};

export type KnowledgeBaseArticle = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_by?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type FeedbackRating = {
  teamwork: number;
  communication: number;
  customer_handling: number;
  punctuality: number;
  initiative: number;
  technical: number;
};

export type EmployeeFeedback = {
  id: string;
  employee_id: string;
  reviewer_id: string;
  feedback_type: 'self' | 'manager' | 'peer';
  period: string;
  ratings: FeedbackRating;
  overall_score: number;
  comments?: string;
  is_anonymous: boolean;
  status: 'draft' | 'submitted' | 'acknowledged';
  created_at: string;
  updated_at: string;

  // Joins
  employee_name?: string;
  reviewer_name?: string;
};

export type FeedbackTemplate = {
  id: string;
  name: string;
  categories: string[];
  created_by?: string;
  is_active: boolean;
  created_at: string;
};

export type WorkOrder = {
  id: string;
  reference_number?: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  service_id: string | null;
  sub_service_id: string | null;
  description?: string;
  priority: 'urgent' | 'normal' | 'low';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'completed' | 'invoiced';
  assigned_to?: string | null;
  branch_id?: string | null;
  estimated_completion?: string | null;
  actual_completion?: string | null;
  total_amount: number;
  invoice_id?: string | null;
  source: 'crm' | 'whatsapp' | 'web';
  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Joins
  service_name?: string;
  sub_service_name?: string;
  assignee_name?: string;
};

export type WorkOrderNote = {
  id: string;
  work_order_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
};

export type WhatsAppConversation = {
  id: string;
  customer_phone: string;
  customer_name?: string;
  customer_id?: string | null;
  last_message_at: string;
  unread_count: number;
  assigned_to?: string | null;
  status: 'active' | 'resolved' | 'archived';
  created_at: string;
};

export type WhatsAppMessage = {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  message_type: 'text' | 'image' | 'document' | 'template';
  whatsapp_message_id?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  is_ai_generated: boolean;
  template_name?: string;
  created_at: string;
};

export type WhatsAppTemplate = {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: 'marketing' | 'utility' | 'authentication';
  status: 'approved' | 'pending' | 'rejected';
  created_by?: string | null;
  created_at: string;
};
