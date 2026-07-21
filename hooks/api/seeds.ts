import { WebLead, Blog, Testimonial, Service } from '../../types';

export const defaultWebLeadsSeed: WebLead[] = [
  {
    id: '8e71c000-0000-0000-0000-000000000001',
    name: 'Sandeep',
    email: 'arcpalliishobha13@gmail.com',
    phone: '+91 9876543210',
    service_interested: 'registrations - udyam-registration',
    message: 'Inquiry submitted for registrations - udyam-registration.',
    status: 'Pending',
    created_at: '2026-05-31T09:00:00.000Z'
  },
  {
    id: 'add23000-0000-0000-0000-000000000002',
    name: 'Santhosh',
    email: 'nanisri.3179@gmail.com',
    phone: '+91 8765432109',
    service_interested: 'startup',
    message: 'Inquiry submitted for startup.',
    status: 'Pending',
    created_at: '2026-05-30T09:00:00.000Z'
  },
  {
    id: '7038c000-0000-0000-0000-000000000003',
    name: 'Rohith',
    email: 'rohithmeshram4@gmail.com',
    phone: '+91 7654321098',
    service_interested: 'startup - private-limited',
    message: 'Inquiry submitted for startup - private-limited.',
    status: 'Pending',
    created_at: '2026-05-28T09:00:00.000Z'
  },
  {
    id: 'd5461000-0000-0000-0000-000000000004',
    name: 'asilu rebba',
    email: 'becozr@gmail.com',
    phone: '+91 6543210987',
    service_interested: 'gst - gst-return-filing',
    message: 'Inquiry submitted for gst - gst-return-filing.',
    status: 'Pending',
    created_at: '2026-05-19T09:00:00.000Z'
  },
  {
    id: 'ad0b4000-0000-0000-0000-000000000005',
    name: 'asilu rebba',
    email: 'becozr@gmail.com',
    phone: '+91 5432109876',
    service_interested: 'gst',
    message: 'Inquiry submitted for gst.',
    status: 'Pending',
    created_at: '2026-05-19T09:00:00.000Z'
  },
  {
    id: 'b8029000-0000-0000-0000-000000000006',
    name: 'Pacha Ravikumar',
    email: 'ravi.nbk@gmail.com',
    phone: '+91 4321098765',
    service_interested: 'registrations - fssai registration',
    message: 'Inquiry submitted for registrations - fssai registration.',
    status: 'Pending',
    created_at: '2026-04-28T09:00:00.000Z'
  }
];

export const defaultBlogsSeed: Blog[] = [
  {
    id: 'blog-1',
    title: 'Mastering GST Registrations in 2026: A Step-by-Step Guide',
    slug: 'mastering-gst-registrations-2026',
    content: 'GST registration is a crucial compliance requirement for businesses whose turnover exceeds the prescribed threshold limits. In this article, we explain the step-by-step registration process, document requirements, and common pitfalls to avoid when filing your application in the current fiscal year. Ensure you prepare all proofs of address and identity before beginning.',
    author: 'Sekhar Anthati',
    category: 'GST Registrations',
    status: 'Published',
    read_time: 6,
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'blog-2',
    title: 'How to Setup a Private Limited Company: DSC, DIN, and Beyond',
    slug: 'setup-private-limited-company',
    content: 'Setting up a Private Limited Company in India offers limited liability protection and access to institutional funding. However, navigate the regulatory process smoothly by understanding Digital Signature Certificates (DSC), Director Identification Numbers (DIN), and MoA/AoA guidelines. Our startup specialists break down the incorporation timeline.',
    author: 'Raman Kumar',
    category: 'Startup Registrations',
    status: 'Published',
    read_time: 8,
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'blog-3',
    title: 'Income Tax Filing Guidelines for Proprietary Businesses',
    slug: 'income-tax-filing-proprietary',
    content: 'Filing income tax returns as a sole proprietor requires careful computation of business profits and personal deductions. We analyze the differences between ITR-3 and ITR-4 forms under the old and new tax structures to help you choose the best route for your business compliance.',
    author: 'Divya Nair',
    category: 'Tax Filings',
    status: 'Draft',
    read_time: 5,
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500',
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const defaultTestimonialsSeed: Testimonial[] = [
  {
    id: 'testimonial-1',
    client_name: 'Aditya Verma',
    company: 'Acrobyte Technologies',
    rating: 5,
    review_text: '24eFiling CRM has completely transformed our business compliance tracking. We incorporated our company and got our GST registration in record time. Extremely professional team!',
    status: 'Approved',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'testimonial-2',
    client_name: 'Meera Sen',
    company: 'Sen & Sons Handloom',
    rating: 5,
    review_text: 'Excellent service for MSME filings. The executives were polite, followed up regularly, and handled all query responses smoothly. Highly recommended!',
    status: 'Approved',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'testimonial-3',
    client_name: 'Vikram Singh',
    company: 'Apex Logistics',
    rating: 4,
    review_text: 'Highly satisfied with their income tax filing team. They explained the tax planning deductions clearly and helped us save substantial tax legitimately.',
    status: 'Approved',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const defaultServicesSeed: Service[] = [
  {
    id: 's1',
    name: 'STARTUP',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss1_1', service_id: 's1', name: 'Partnership Firm', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_2', service_id: 's1', name: 'Proprietorship Firm', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_3', service_id: 's1', name: 'Public Limited Company', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_4', service_id: 's1', name: 'Private Limited Company', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_5', service_id: 's1', name: 'OPC, One Person Company', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_6', service_id: 's1', name: 'LLP, Limited Liability Partnership', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 's2',
    name: 'Licenses & Registrations',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss2_1', service_id: 's2', name: 'Startup India', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_2', service_id: 's2', name: 'Trade License', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_3', service_id: 's2', name: 'FSSAI License', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_4', service_id: 's2', name: 'PF Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_5', service_id: 's2', name: 'ESI Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_6', service_id: 's2', name: 'Professional Tax Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 's3',
    name: 'IP & TRADEMARK',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss3_1', service_id: 's3', name: 'Trademark Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss3_2', service_id: 's3', name: 'Trademark Objection', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss3_3', service_id: 's3', name: 'Copyright Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss3_4', service_id: 's3', name: 'Patent Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 's4',
    name: 'GST Registrations',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss4_1', service_id: 's4', name: 'GST Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss4_2', service_id: 's4', name: 'GST Return Filing', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss4_3', service_id: 's4', name: 'GST LUT Form', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss4_4', service_id: 's4', name: 'GST Revocation', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 's5',
    name: 'Income Registrations',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss5_1', service_id: 's5', name: 'Income Tax E-Filing', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss5_2', service_id: 's5', name: 'ITR-1 Return Filing', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss5_3', service_id: 's5', name: 'ITR-4 Return Filing', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  }
];
