export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string
          name: string
          code: string
          manager_id: string | null
          address: string | null
          contact_details: string | null
          phone: string | null
          email: string | null
          is_active: boolean
          city_id: string | null
          city_name: string | null
          logo_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          manager_id?: string | null
          address?: string | null
          contact_details?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          city_id?: string | null
          city_name?: string | null
          logo_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          manager_id?: string | null
          address?: string | null
          contact_details?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          city_id?: string | null
          city_name?: string | null
          logo_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      
      cities: {
        Row: {
          id: string
          city_name: string
          city_code: string
          state: string | null
          status: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          city_name: string
          city_code: string
          state?: string | null
          status?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          city_name?: string
          city_code?: string
          state?: string | null
          status?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
      }
      business_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      industry_types: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lead_id: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lead_id: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
      }
      lead_sources: {
        Row: {
          id: string
          source_name: string
          source_code: string
          description: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          source_name: string
          source_code: string
          description?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          source_name?: string
          source_code?: string
          description?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      customers: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          business_address: string | null
          business_name: string
          business_category_id: string | null
          industry_type_id: string | null
          lead_source_id: string | null
          referred_by_customer_id: string | null
          referred_by_employee_id: string | null
          created_at: string | null
          created_by: string | null
          date_of_completion: string
          date_of_enroll: string
          email: string
          gender: string | null
          id: string
          lead_id: string
          lead_source: string
          name: string
          payment_details: Json | null
          phone: string
          alternate_mobile: string | null
          alternate_is_whatsapp: boolean | null
          residential_address: string | null
          personal_flat_no: string | null
          personal_street: string | null
          personal_city: string | null
          personal_state: string | null
          personal_country: string | null
          personal_zip_code: string | null
          business_flat_no: string | null
          business_street: string | null
          business_city: string | null
          business_state: string | null
          business_country: string | null
          business_zip_code: string | null
          service_name: string
          sub_service: string | null
          updated_at: string | null
          whatsapp_number: string | null
          pan_number: string | null
          aadhar_number: string | null
          service_amount: number | null
          tax_amount: number | null
          total_amount: number | null
          paid_amount: number | null
          due_amount: number | null
          feedback: string | null
          branch_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          business_address?: string | null
          business_name: string
          business_category_id?: string | null
          industry_type_id?: string | null
          lead_source_id?: string | null
          referred_by_customer_id?: string | null
          referred_by_employee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_completion: string
          date_of_enroll: string
          email: string
          gender?: string | null
          id?: string
          lead_id: string
          lead_source: string
          name: string
          payment_details?: Json | null
          phone: string
          alternate_mobile?: string | null
          alternate_is_whatsapp?: boolean | null
          residential_address?: string | null
          personal_flat_no?: string | null
          personal_street?: string | null
          personal_city?: string | null
          personal_state?: string | null
          personal_country?: string | null
          personal_zip_code?: string | null
          business_flat_no?: string | null
          business_street?: string | null
          business_city?: string | null
          business_state?: string | null
          business_country?: string | null
          business_zip_code?: string | null
          service_name: string
          sub_service?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          pan_number?: string | null
          aadhar_number?: string | null
          service_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          paid_amount?: number | null
          due_amount?: number | null
          feedback?: string | null
          branch_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          business_address?: string | null
          business_name?: string
          business_category_id?: string | null
          industry_type_id?: string | null
          lead_source_id?: string | null
          referred_by_customer_id?: string | null
          referred_by_employee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_completion?: string
          date_of_enroll?: string
          email?: string
          gender?: string | null
          id?: string
          lead_id?: string
          lead_source?: string
          name?: string
          payment_details?: Json | null
          phone?: string
          alternate_mobile?: string | null
          alternate_is_whatsapp?: boolean | null
          residential_address?: string | null
          personal_flat_no?: string | null
          personal_street?: string | null
          personal_city?: string | null
          personal_state?: string | null
          personal_country?: string | null
          personal_zip_code?: string | null
          business_flat_no?: string | null
          business_street?: string | null
          business_city?: string | null
          business_state?: string | null
          business_country?: string | null
          business_zip_code?: string | null
          service_name?: string
          sub_service?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          pan_number?: string | null
          aadhar_number?: string | null
          service_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          paid_amount?: number | null
          due_amount?: number | null
          feedback?: string | null
          branch_id?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          lead_id: string
          name: string
          status: Database["public"]["Enums"]["document_status"] | null
          city_id: string | null
          city_name: string | null
          type: string
          uploaded_at: string | null
          url: string
          verification_notes: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          name: string
          status?: Database["public"]["Enums"]["document_status"] | null
          city_id?: string | null
          city_name?: string | null
          type: string
          uploaded_at?: string | null
          url: string
          verification_notes?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          name?: string
          status?: Database["public"]["Enums"]["document_status"] | null
          type?: string
          uploaded_at?: string | null
          url?: string
          verification_notes?: string | null
        }
      }
      leads: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          business_address: string | null
          business_name: string
          business_category_id: string | null
          industry_type_id: string | null
          lead_source_id: string | null
          referred_by_customer_id: string | null
          referred_by_employee_id: string | null
          created_at: string | null
          email: string
          first_name: string
          gender: string | null
          id: string
          last_contacted: string | null
          last_name: string
          next_follow_up: string | null
          notes: string | null
          payments: Json | null
          phone_number: string
          priority: Database["public"]["Enums"]["lead_priority"]
          residential_address: string | null
          personal_flat_no: string | null
          personal_street: string | null
          personal_city: string | null
          personal_state: string | null
          personal_country: string | null
          personal_zip_code: string | null
          business_flat_no: string | null
          business_street: string | null
          business_city: string | null
          business_state: string | null
          business_country: string | null
          business_zip_code: string | null
          score: number | null
          service_requested: string
          service_sets: Json | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          city_id: string | null
          city_name: string | null
          total_payment: number | null
          advance_amount: number | null
          remaining_amount: number | null
          whatsapp_number: string | null
          alternate_mobile: string | null
          alternate_is_whatsapp: boolean | null
          branch_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          business_address?: string | null
          business_name: string
          business_category_id?: string | null
          industry_type_id?: string | null
          lead_source_id?: string | null
          referred_by_customer_id?: string | null
          referred_by_employee_id?: string | null
          created_at?: string | null
          email: string
          first_name: string
          gender?: string | null
          id?: string
          last_contacted?: string | null
          last_name: string
          next_follow_up?: string | null
          notes?: string | null
          payments?: Json | null
          phone_number: string
          priority: Database["public"]["Enums"]["lead_priority"]
          residential_address?: string | null
          personal_flat_no?: string | null
          personal_street?: string | null
          personal_city?: string | null
          personal_state?: string | null
          personal_country?: string | null
          personal_zip_code?: string | null
          business_flat_no?: string | null
          business_street?: string | null
          business_city?: string | null
          business_state?: string | null
          business_country?: string | null
          business_zip_code?: string | null
          score?: number | null
          service_requested: string
          service_sets?: Json | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          total_payment?: number | null
          advance_amount?: number | null
          remaining_amount?: number | null
          whatsapp_number?: string | null
          alternate_mobile?: string | null
          alternate_is_whatsapp?: boolean | null
          branch_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          business_address?: string | null
          business_name?: string
          business_category_id?: string | null
          industry_type_id?: string | null
          lead_source_id?: string | null
          referred_by_customer_id?: string | null
          referred_by_employee_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          last_contacted?: string | null
          last_name?: string
          next_follow_up?: string | null
          notes?: string | null
          payments?: Json | null
          phone_number?: string
          priority?: Database["public"]["Enums"]["lead_priority"]
          residential_address?: string | null
          personal_flat_no?: string | null
          personal_street?: string | null
          personal_city?: string | null
          personal_state?: string | null
          personal_country?: string | null
          personal_zip_code?: string | null
          business_flat_no?: string | null
          business_street?: string | null
          business_city?: string | null
          business_state?: string | null
          business_country?: string | null
          business_zip_code?: string | null
          score?: number | null
          service_requested?: string
          service_sets?: Json | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          city_id?: string | null
          city_name?: string | null
          total_payment?: number | null
          advance_amount?: number | null
          remaining_amount?: number | null
          whatsapp_number?: string | null
          alternate_mobile?: string | null
          alternate_is_whatsapp?: boolean | null
          branch_id?: string | null
        }
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: Json | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: Json | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: Json | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_name: string | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          is_active: boolean
          city_id: string | null
          city_name: string | null
          last_updated: string | null
          name: string
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          skills: string[] | null
          branch_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch_name?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          id: string
          is_active?: boolean
          city_id?: string | null
          city_name?: string | null
          last_updated?: string | null
          name: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[] | null
          branch_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch_name?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          is_active?: boolean
          city_id?: string | null
          city_name?: string | null
          last_updated?: string | null
          name?: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[] | null
          branch_id?: string | null
        }
      }
      tasks: {
        Row: {
          completed_at: string | null
          content: string
          created_at: string | null
          created_by: string
          depends_on_task_id: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          lead_id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          branch_id: string | null
        }
        Insert: {
          completed_at?: string | null
          content: string
          created_at?: string | null
          created_by: string
          depends_on_task_id?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          lead_id: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          branch_id?: string | null
        }
        Update: {
          completed_at?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          depends_on_task_id?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          branch_id?: string | null
        }
      }
      user_activities: {
        Row: {
          action: string
          details: string | null
          id: string
          timestamp: string | null
          user_id: string
          branch_id: string | null
        }
        Insert: {
          action: string
          details?: string | null
          id?: string
          timestamp?: string | null
          user_id: string
          branch_id?: string | null
        }
        Update: {
          action?: string
          details?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string
          branch_id?: string | null
        }
      }
      attendance: {
        Row: {
          id: string
          user_id: string
          date: string
          check_in: string | null
          check_out: string | null
          status: string
          notes: string | null
          created_at: string | null
          updated_at: string | null
          branch_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          check_in?: string | null
          check_out?: string | null
          status?: string
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          branch_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          check_in?: string | null
          check_out?: string | null
          status?: string
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          branch_id?: string | null
        }
      }
      leave_requests: {
        Row: {
          id: string
          user_id: string
          leave_type: string
          start_date: string
          end_date: string
          reason: string | null
          status: string
          approved_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          leave_type: string
          start_date: string
          end_date: string
          reason?: string | null
          status?: string
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          leave_type?: string
          start_date?: string
          end_date?: string
          reason?: string | null
          status?: string
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      lead_assignment_rules: {
        Row: {
          id: string
          name: string
          is_active: boolean
          rule_type: string
          conditions: Json | null
          assigned_users: Json | null
          branch_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          rule_type?: string
          conditions?: Json | null
          assigned_users?: Json | null
          branch_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          rule_type?: string
          conditions?: Json | null
          assigned_users?: Json | null
          branch_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      automation_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_event: string
          conditions: Json | null
          actions: Json | null
          is_active: boolean
          run_count: number | null
          last_run: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_event: string
          conditions?: Json | null
          actions?: Json | null
          is_active?: boolean
          run_count?: number | null
          last_run?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_event?: string
          conditions?: Json | null
          actions?: Json | null
          is_active?: boolean
          run_count?: number | null
          last_run?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      document_templates: {
        Row: {
          id: string
          name: string
          category: string
          body_html: string
          variables: Json | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          body_html: string
          variables?: Json | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          body_html?: string
          variables?: Json | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
      }
      email_logs: {
        Row: {
          id: string
          recipient: string
          subject: string
          body: string | null
          status: string
          sent_at: string | null
          error: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          recipient: string
          subject: string
          body?: string | null
          status?: string
          sent_at?: string | null
          error?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          recipient?: string
          subject?: string
          body?: string | null
          status?: string
          sent_at?: string | null
          error?: string | null
          created_at?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          category: string
          description: string
          amount: number
          date: string
          payment_method: string | null
          receipt_url: string | null
          created_by: string | null
          branch_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          category: string
          description: string
          amount: number
          date: string
          payment_method?: string | null
          receipt_url?: string | null
          created_by?: string | null
          branch_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          category?: string
          description?: string
          amount?: number
          date?: string
          payment_method?: string | null
          receipt_url?: string | null
          created_by?: string | null
          branch_id?: string | null
          created_at?: string | null
        }
      }
      recurring_services: {
        Row: {
          id: string
          customer_id: string
          service_name: string
          frequency: string
          next_due_date: string
          amount: number | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          service_name: string
          frequency: string
          next_due_date: string
          amount?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          service_name?: string
          frequency?: string
          next_due_date?: string
          amount?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      sales_targets: {
        Row: {
          id: string
          user_id: string
          period_type: string
          period_start: string
          period_end: string
          target_amount: number
          achieved_amount: number | null
          target_leads: number | null
          achieved_leads: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          period_type: string
          period_start: string
          period_end: string
          target_amount: number
          achieved_amount?: number | null
          target_leads?: number | null
          achieved_leads?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          period_type?: string
          period_start?: string
          period_end?: string
          target_amount?: number
          achieved_amount?: number | null
          target_leads?: number | null
          achieved_leads?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      service_deliveries: {
        Row: {
          id: string
          customer_id: string
          service_name: string
          status: string
          current_step: string | null
          steps_progress: Json | null
          assigned_to: string | null
          due_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          service_name: string
          status: string
          current_step?: string | null
          steps_progress?: Json | null
          assigned_to?: string | null
          due_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          service_name?: string
          status?: string
          current_step?: string | null
          steps_progress?: Json | null
          assigned_to?: string | null
          due_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      team_messages: {
        Row: {
          id: string
          channel: string
          sender_id: string
          sender_name: string
          sender_avatar: string | null
          content: string
          attachments: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          channel: string
          sender_id: string
          sender_name: string
          sender_avatar?: string | null
          content: string
          attachments?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          channel?: string
          sender_id?: string
          sender_name?: string
          sender_avatar?: string | null
          content?: string
          attachments?: Json | null
          created_at?: string | null
        }
      }
      offers: {
        Row: {
          id: string
          title: string
          description: string | null
          code: string
          discount_percent: number | null
          discount_amount: number | null
          valid_from: string | null
          valid_until: string | null
          is_active: boolean
          branch_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          code: string
          discount_percent?: number | null
          discount_amount?: number | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          branch_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          code?: string
          discount_percent?: number | null
          discount_amount?: number | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          branch_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_claim: {
        Args: {
          claim: string
        }
        Returns: string
      }
    }
    Enums: {
      activity_type:
      | "Note"
      | "Status Change"
      | "Document Upload"
      | "Call"
      | "Email"
      document_status: "Pending" | "Approved" | "Rejected"
      lead_priority: "Hot" | "Warm" | "Cold"
      lead_status:
      | "New Lead"
      | "Lead Confirmed"
      | "Documents & Payments"
      | "In-Progress"
      | "Success"
      | "Lost"
      notification_type:
      | "Lead Assigned"
      | "Status Updated"
      | "Note Added"
      | "Document Uploaded"
      payment_method: "Cash" | "Card" | "UPI" | "Bank Transfer"
      task_priority: "High" | "Medium" | "Low"
      user_role: "Super Admin" | "Admin" | "Sales Executive" | "Branch Manager" | "Receptionist" | "Team Leader" | "Service Executive" | "Accounts Team"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
};
