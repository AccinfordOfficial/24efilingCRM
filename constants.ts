import { Lead, User, TaskPriority } from './types';

export const SERVICE_OPTIONS = {
  'Business Registration': [
    'Proprietorship',
    'Partnership',
    'One Person Company',
    'Limited Liability Company',
    'Private Limited Company',
    'Section 8 Company',
    'Trust Registration',
    'Public Limited Company',
    'Individual',
  ],
  'Licenses & Compliance': [
    'PF Registration',
    'ESI Registration',
    'Professional Tax Registration',
    'Trade License',
    'FSSAI Registration',
    'IEC Code',
    '12A Registration',
    '80G Registration',
    'DARPAN Registration',
    'UDYAM Registration',
    'Digital Signature Certificate',
    'Labour License Registration',
  ],
  'Trademark & IP': [
    'TradeMark Registration',
    'TradeMark Objection',
    'TradeMark Certificate',
    'TradeMark Hearing',
    'TradeMark Renewal',
    'Logo Designing',
    'Design Registration',
    'Design Opposition',
  ],
  'GST Services': [
    'GST Registration',
    'GST Return Filing by Accountant',
    'GST Annual Return Filing',
    'GST LUT Form',
    'GST Notice',
    'GST Amendment',
    'GST Revocation',
  ],
  'Income Tax Services': [
    'Income Tax E-Filing',
    'Business Tax Filing',
    'ITR -1 to ITR -7 Return Filing',
    '15CA-15CB Filing',
    'TAN Registration',
    'TDS Return Filing',
    'Income Tax Notice',
  ],
  'MCA (Corporate) Services': [
    'Company Compliances',
    'LLP Compliances',
    'OPC Compliances',
    'Name Change Compliances',
    'Address Change Compliances',
    'DIN Ekyc Compliances',
    'DIN Reactivation',
    'Director Change',
    'Remove Director',
    'Commencement of Business',
    'Auditor Appointment',
    'MOA Amendment',
    'AOA Amendment',
    'Authorized Share Capital Increase',
    'Share Transfers',
    'Company Closure',
    'LLP Closure',
  ],
};

export const SERVICE_HIERARCHY = {
  'STARTUP': [
    'Partnership Firm', 'Proprietorship Firm', 'Public Limited Company', 'Private Limited Company',
    'OPC, One Person Company', 'LLP, Limited Liability Partnership', 'Trust Registration',
    'Indian Subsidiary', 'Producer Company', 'Section 8 Company'
  ],
  'Licenses & Registrations': [
    'Startup India', 'Drug License', 'Trade License', 'FSSAI License', 'Fire License',
    'PF Registration', 'ESI Registration', 'TAN Registration', 'PAN Registration',
    '12A Registration', '80G Registration', 'ISO Registration', 'Digital Signature',
    'Darpan Registration', 'Barcode Registration', 'Udyam Registration', 'Shop Act Registration',
    'IEC (Import Export Code)', 'Halal License & Certification', 'Professional Tax Registration'
  ],
  'IP & TRADEMARK': [
    'Trademark Registration', 'Trademark Objection', 'Trademark Renewal', 'TRADEMARK HIRING',
    'Copyright Registration', 'Patent Registration', 'Design Registration', 'Logo Design'
  ],
  'GST Registrations': [
    'GST Registration', 'GST Return Filing', 'GST LUT Form', 'GST Revocation',
    'GST Notice', 'GST Amendment', 'GST Cancellation'
  ],
  'Income Registrations': [
    'Income Tax E-Filing', 'ITR-1 Return Filing', 'ITR-2 Return Filing', 'ITR-3 Return Filing',
    'ITR-4 Return Filing', 'ITR-5 Return Filing', 'ITR-6 Return Filing', 'ITR-7 Return Filing',
    '15CA - 15CB Filing', 'TDS Return Filing', 'Income Tax Notice'
  ],
  'MCA Compliances': [
    'Demat of Shares', 'LLP Compliance', 'OPC Compliance', 'Company Compliance',
    'Proprietorship to Pvt Ltd Company', 'Convert Partnership into LLP Company',
    'Convert Private into Public Limited Company', 'Convert Private into OPC Company',
    'Winding Up - LLP', 'Winding Up - Company', 'ADT-1 Filing', 'DPT-3 Filing',
    'LLP Form 11 Filing', 'Dormant Status Filing', 'Annual Compliance Services'
  ],
  'Legal Services': [
    'Lawyers Specialization', 'Finance Lawyers', 'Cheque Bounce Lawyers', 'Civil Lawyers',
    'Consumer Protection Lawyers', 'Contract Lawyers', 'Corporate Lawyers', 'Criminal Lawyers',
    'Cyber Crime Lawyers', 'Property Lawyers', 'Divorce Lawyers', 'Family Lawyers', 'GST Lawyers',
    'Intellectual Property Lawyers', 'Labour Lawyers', 'Money Recovery Lawyers',
    'Motor Accident Lawyers', 'Muslim Law Lawyers'
  ],
  'Legal Documents': [
    'Free Legal Documents', 'All Legal Documents', 'Rental Agreement',
    'Commercial Rental Agreement', 'Experience Letter', 'Appointment Letter', 'Affidavit Format',
    'Power Of Attorney', 'Income Certificate', 'No Objection Certificate', 'Salary Slip',
    'Resignation Letter', 'Legal Heir Certificate', 'Relieving Letter', 'Bonafide Certificate',
    'Partnership Deed', 'GST Invoice', 'Authorised Signatory In GST', 'Delivery Challan',
    'Offer Letter', 'Consent Letter For GST Registration', 'Rent Receipt'
  ],
  'Company Changes': [
    'Director Change', 'Remove Director', 'MOA Amendment', 'AOA Amendment', 'Share Transfer',
    'DIN eKYC Filing', 'DIN Reactivation', 'Name Change - Company', 'Registered Office Change',
    'Commencement (INC-2A)', 'Authorized Capital Increase'
  ]
};


export const USER_DEPARTMENTS = ['Sales', 'Operations', 'HR', 'CA', 'Others'] as const;

export const USER_SKILLS = [
  'GST Registration',
  'Income Tax Filing',
  'Private Limited Registration',
  'ITR filing',
  'PF Registration',
  'Professional Tax',
  'Proprietorship',
  'Public Limited Registration',
  'ESI Registration',
  'Trade License',
  'FSSAI Registration',
  'IEC Code',
  '12A Registration',
  '80G Registration',
  'DARPAN Registration',
  'UDYAM Registration',
  'Digital Signature Certificate',
  'Labour License',
  'Trademark Registration',
  'TDS Return Filing',
];

export const USER_ROLES_WITH_DESCRIPTIONS: { role: User['role'], description: string }[] = [
  { role: 'Super Admin', description: 'Complete system control with all permissions.' },
  { role: 'Admin', description: 'Manages leads, assigns tasks, monitors performance.' },
  { role: 'Sales Executive', description: 'Handles lead management and customer interactions.' },
];

export const ROLE_PERMISSIONS: Partial<Record<User['role'], string[]>> = {
  'Super Admin': ['Full System Access', 'User Management', 'Lead Management', 'System Settings', 'Reporting'],
  'Admin': ['Lead Management', 'Team Management', 'Document Verification', 'Reporting', 'Assign Tasks'],
  'Sales Executive': ['Manage Assigned Leads', 'Add Follow-ups', 'Upload Documents', 'View Customers'],
};

export const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'SG', name: 'Singapore' },
  { code: 'Other', name: 'Other' }
];

export const LEAD_SOURCES = ['New Lead', 'Website', 'Referral', 'Cold Call', 'Social Media', 'Advertisement', 'Other'];

export const DOCUMENT_TYPES = [
  'Pancard',
  'Aadhar Card',
  'Electricity Bill',
  'Rental Agreement',
  'Residential Address',
  'Temporary Address',
  'KYC Documents',
  'Other Documents'
];

export const LEAD_STATUSES: Lead['status'][] = ['New Lead', 'Lead Confirmed', 'Documents & Payments', 'In-Progress', 'Success', 'Lost'];
export const LEAD_PRIORITIES: Lead['priority'][] = ['Hot', 'Warm', 'Cold'];
export const TASK_PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

export const getStatusColor = (status: Lead['status']) => {
  switch (status) {
    case 'New Lead':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'Lead Confirmed':
      return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    case 'In-Progress':
      return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    case 'Documents & Payments':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'Success':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'Lost':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};

export const getPriorityColor = (priority: Lead['priority'] | string) => {
  switch (priority) {
    case 'Hot':
    case 'Urgent':
    case 'High':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'Warm':
    case 'Medium':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'Cold':
    case 'Low':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  }
};

export const getTaskPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case 'High':
      return 'text-red-600';
    case 'Medium':
      return 'text-yellow-600';
    case 'Low':
      return 'text-blue-600';
    default:
      return 'text-slate-500';
  }
};

export const getRoleColor = (role: User['role']) => {
  switch (role) {
    case 'Super Admin':
      return 'bg-purple-500/15 text-purple-400 border border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30';
    case 'Admin':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
    case 'Branch Manager':
      return 'bg-blue-500/15 text-blue-400 border border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30';
    case 'Sales Executive':
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30';
  }
};

export const getRoleDotColor = (role: User['role']) => {
  switch (role) {
    case 'Super Admin':
      return 'bg-purple-500';
    case 'Admin':
      return 'bg-pink-500';
    case 'Sales Executive':
      return 'bg-green-500';
    default:
      return 'bg-gray-400';
  }
};

export const BUSINESS_CATEGORIES = [
  { value: 'Proprietorship', label: 'Proprietorship' },
  { value: 'Partnership Firm', label: 'Partnership Firm' },
  { value: 'One Person Company (OPC)', label: 'One Person Company (OPC)' },
  { value: 'Private Limited Company', label: 'Private Limited Company' },
  { value: 'Public Limited Company', label: 'Public Limited Company' },
  { value: 'Limited Liability Partnership (LLP)', label: 'Limited Liability Partnership (LLP)' },
  { value: 'Section 8 Company', label: 'Section 8 Company' },
  { value: 'Trust Registration', label: 'Trust Registration' },
  { value: 'Society Registration', label: 'Society Registration' },
  { value: 'NGO Registration', label: 'NGO Registration' },
  { value: 'Startup Registration', label: 'Startup Registration' },
  { value: 'MSME Registration', label: 'MSME Registration' },
  { value: 'GST Registration', label: 'GST Registration' },
  { value: 'Trademark Registration', label: 'Trademark Registration' },
  { value: 'Import Export Code (IEC)', label: 'Import Export Code (IEC)' },
  { value: 'FSSAI Registration', label: 'FSSAI Registration' },
  { value: 'Professional Tax Registration', label: 'Professional Tax Registration' },
  { value: 'Shop & Establishment Registration', label: 'Shop & Establishment Registration' },
  { value: 'Trade License', label: 'Trade License' },
  { value: 'Other', label: 'Other' }
];

export const INDUSTRY_TYPES = [
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Information Technology (IT)', label: 'Information Technology (IT)' },
  { value: 'Software Development', label: 'Software Development' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Transport & Logistics', label: 'Transport & Logistics' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Retail', label: 'Retail' },
  { value: 'E-Commerce', label: 'E-Commerce' },
  { value: 'Education', label: 'Education' },
  { value: 'Finance & Banking', label: 'Finance & Banking' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Hospitality', label: 'Hospitality' },
  { value: 'Travel & Tourism', label: 'Travel & Tourism' },
  { value: 'Food & Beverage', label: 'Food & Beverage' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Pharmaceuticals', label: 'Pharmaceuticals' },
  { value: 'Telecommunications', label: 'Telecommunications' },
  { value: 'Media & Entertainment', label: 'Media & Entertainment' },
  { value: 'Marketing & Advertising', label: 'Marketing & Advertising' }
];