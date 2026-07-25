# 🧪 End-to-End Manual Testing Guide: 24eFiling CRM Upgrade

Welcome to the **End-to-End Testing Guide** for the 24eFiling CRM upgrade! This document provides step-by-step walkthroughs to test every feature built across Phases 1 through 5.

---

## 🚀 Setup & Initialization

### 1. Start the Local Server
Open a terminal in `d:\24efilings CRM` and run:
```bash
npm run dev
```
Open your browser at `http://localhost:5173` (or the URL printed in the terminal).

### 2. Authentication & Roles
- Log in using your Super Admin or Executive credentials.
- Note: You can switch between roles or test multi-company features directly within the app headers.

---

## 🔍 Phase 1 & 2: Core Enhancements & Operations

### Test 1: Global Spotlight Search (`Cmd + K` or `Ctrl + K`)
1. Press `Ctrl + K` (or `Cmd + K` on Mac) anywhere in the application. Alternatively, click the **Search** bar in the top header.
2. Type a prospect name, phone number, PAN, or invoice number (e.g., `GST`, `John`, `INV-`).
3. Use the **Up/Down arrow keys** to navigate through categorized results (Leads, Customers, Users, Invoices).
4. Press **Enter** to open the selected record.

### Test 2: Quick-Add Lead (`N` Hotkey & Floating CTA)
1. Press `N` on your keyboard, or click the **"+" Floating Action Button** at the bottom-right of the screen.
2. Fill in the 4 minimal fields: **First Name**, **Phone Number**, **Service**, and **Priority**.
3. Click **Quick Save**. Observe the instant toast notification confirming lead creation.
4. Verify the new lead appears at the top of your **All Leads** or **My Day** list.

### Test 3: "My Day" Executive Command Center
1. Navigate to `/my-day` from the sidebar (under **Sales** / **Operations**).
2. Review your daily agenda:
   - Today's Follow-ups
   - Overdue Follow-ups (highlighted in red)
   - Today's Tasks
   - Target Achievement Bar
3. Click **Log Call** or **Send WhatsApp** on any lead card to execute a quick action.

### Test 4: Automated Lead Assignment Rules
1. Navigate to `/auto-assignment` from the sidebar (under **Sales**).
2. Click **Create Assignment Rule**.
3. Choose a strategy (e.g., `Round Robin` or `Load Balanced`).
4. Select the target branch and assigned sales executives.
5. Save the rule and toggle its active state. Create a new lead to verify automatic distribution.

### Test 5: Sales Targets & Commissions Tracker
1. Navigate to `/targets` (under **Sales**).
2. View executive achievement gauges comparing actual closed revenue vs. monthly targets.
3. Check the calculated commissions and payout lifecycle status (`Pending`, `Approved`, `Paid`).
4. Click **Configure Targets** (as Super Admin) to update targets for any team member.

### Test 6: Service Delivery Pipeline (Post-Sales Tracker)
1. Navigate to `/service-delivery` (under **Operations**).
2. View ongoing client fulfillments (e.g., GST Registration, Incorporation).
3. Advance a service delivery stage card (e.g., move from *Documents Received* to *Portal Filing*).
4. Observe the SLA timer indicator (Green = On Track, Red = SLA Breached).

### Test 7: Renewals & Recurring Services Pipeline
1. Navigate to `/renewals` (under **Operations**).
2. View upcoming recurring compliance contracts (monthly GSTR-3B, annual filings).
3. Filter by **Upcoming (30 Days)**, **Contacted**, or **Renewed**.
4. Click **Mark Renewed** to update the subscription due date and generate a renewal history record.

---

## 📈 Phase 3: Growth & Business Automation

### Test 8: Client Self-Service Portal Simulator
1. Navigate to `/client-portal` (under **Management**).
2. View the client-facing view for a selected customer.
3. Test the interactive elements:
   - Digital Document Vault (View/Upload files)
   - Filing Status Tracker
   - Billing & Invoice Download
   - OTP Code Generator

### Test 9: Attendance & Leave Management
1. Navigate to `/attendance` (under **Operations**).
2. Click **Check In** to log your start time and location coordinates.
3. Click **Apply for Leave**, select dates and leave type (Casual / Sick / Earned), and submit.
4. Check your leave balances breakdown.

### Test 10: Expense Tracking & P&L Manager
1. Navigate to `/expenses` (under **Management**).
2. Click **Log Expense**. Enter category (e.g., *Software*, *Rent*, *Govt Fees*), amount, and date.
3. Observe the real-time **Profit & Loss Summary** adjusting your total collected revenue against operating expenses.

### Test 11: Workflow Automation Engine
1. Navigate to `/automation` (under **Communication**).
2. Review active automation rules (e.g., *Welcome WhatsApp on Lead Creation*, *Payment Receipt Email*, *30-Day Renewal Reminder*).
3. Click **Create Automation Rule**. Set a trigger event (e.g., `lead_created`), add conditions, and configure actions.

### Test 12: Document Template System
1. Navigate to `/templates` (under **Management**).
2. Select a template (e.g., *Engagement Letter*, *Service Agreement*).
3. Edit the HTML template body containing dynamic variables like `{{client_name}}`, `{{service_name}}`, `{{date}}`.
4. Click **Live Preview** to inspect the rendered document output.

---

## 🔌 Phase 4: Third-Party Integrations Control Center

### Test 13: Integrations Control Center
1. Navigate to `/integrations` (under **System**).
2. **Razorpay Integration**: Enter an invoice amount and click **Generate Payment Link**. Copy the generated test payment link.
3. **Exotel Cloud Telephony**: Click **Initiate Click-to-Call** for a test prospect phone number and verify call log creation.
4. **MSG91 SMS Gateway**: Select a DLT SMS template, input a phone number, and click **Dispatch Test SMS**.

---

## 🧠 Phase 5: Intelligence & Future Features

### Test 14: ML-Based Lead Scoring & Win-Probability
1. Open any lead detail page (or navigate to `/leads` and select a lead).
2. Inspect the **Win Probability Score (0-100%)** and **Deal Grade (A+ to D)** generated by the ML scoring engine (`lib/scoringML.ts`).
3. Click **View Factor Breakdown** to see positive factors (e.g., rapid response time) and risk factors (e.g., inactive for >5 days).

### Test 15: Revenue & Pipeline Forecast Dashboard
1. Navigate to `/forecast` (under **Analytics**).
2. Review time-series revenue projections:
   - **Weighted Pipeline Forecast** (Stage probability × Deal value)
   - **Contracted Renewal MRR**
   - **Best-Case vs. Conservative Projections**
3. Adjust the forecast horizon slider (30 / 60 / 90 days).

### Test 16: Customer Churn Risk Prediction
1. Navigate to `/churn` (under **Analytics**).
2. Inspect accounts flagged as **High**, **Medium**, or **Low** churn risk based on activity frequency and payment delays.
3. Click **Trigger Retention Action** on a high-risk account to auto-generate a priority task or renewal discount offer.

### Test 17: GST Statutory Compliance Calendar
1. Navigate to `/gst-calendar` (under **Operations**).
2. View upcoming statutory filing deadlines for GSTR-1, GSTR-3B, and GSTR-9.
3. Inspect client-level filing status (*Filed*, *Pending*, *Overdue*).
4. Use the **Late Fee Penalty Calculator** to estimate statutory interest/penalties for overdue return filings.

### Test 18: Internal Team Chat & Realtime Messaging
1. Navigate to `/team-chat` (under **Communication**).
2. Switch between channels: `#general`, `#sales`, `#gst-operations`.
3. Type and send a message. Notice the real-time message stream.
4. (Optional) Open a second browser window to test live message delivery between users.

### Test 19: Multi-Company & Tenant Switcher
1. Locate the **Company Switcher** in the top application header.
2. Switch between primary company entities (e.g., *24eFiling Corporate* vs. *24eFiling Franchise*).
3. Verify that the context updates seamlessly across the CRM dashboard.

---

## 🛠️ Verification Checklist Summary

- [ ] Global Search (`Ctrl+K`)
- [ ] Quick-Add Lead (`N`)
- [ ] "My Day" Agenda
- [ ] Auto-Assignment Rules
- [ ] Sales Targets & Commissions
- [ ] Service Delivery Tracker
- [ ] Renewals Pipeline
- [ ] Client Portal Simulator
- [ ] Attendance & Leave Tracker
- [ ] Expense Manager & P&L
- [ ] Workflow Automation Engine
- [ ] Document Templates
- [ ] Integrations Center (Razorpay / Exotel / MSG91)
- [ ] ML Lead Scoring
- [ ] Revenue Forecasting
- [ ] Churn Risk Prediction
- [ ] GST Compliance Calendar
- [ ] Internal Team Chat
- [ ] Multi-Company Switcher

Happy testing! If you encounter any unexpected behavior, refer to `VERIFICATION_REPORT_FINAL.md` for technical implementation details.
