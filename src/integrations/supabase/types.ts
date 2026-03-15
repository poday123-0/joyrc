export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_menu_order: {
        Row: {
          created_at: string
          id: string
          menu_items: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_items?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_items?: Json
          updated_at?: string
        }
        Relationships: []
      }
      bank_settings: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch: string | null
          created_at: string
          id: string
          is_active: boolean | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      card_types: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      category_images: {
        Row: {
          category_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_images_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          mobile: string
          name: string
          status: string | null
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          mobile: string
          name: string
          status?: string | null
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          mobile?: string
          name?: string
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_key: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_key: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      featured_products: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          product_id: string
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_links: {
        Row: {
          column_order: number | null
          column_title: string
          created_at: string
          id: string
          is_active: boolean | null
          link_label: string
          link_url: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          column_order?: number | null
          column_title: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          link_label: string
          link_url: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          column_order?: number | null
          column_title?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          link_label?: string
          link_url?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      hero_backgrounds: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          media_type: string
          media_url: string
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_emails: {
        Row: {
          created_at: string
          html_content: string
          id: string
          sent_by: string
          sent_to_count: number | null
          subject: string
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          sent_by: string
          sent_to_count?: number | null
          subject: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          sent_by?: string
          sent_to_count?: number | null
          subject?: string
        }
        Relationships: []
      }
      message_replies: {
        Row: {
          created_at: string | null
          id: string
          is_admin_reply: boolean | null
          message_id: string
          replied_by: string | null
          reply_text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          message_id: string
          replied_by?: string | null
          reply_text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          message_id?: string
          replied_by?: string | null
          reply_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color_hex: string | null
          color_id: string | null
          color_name: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
        }
        Insert: {
          color_hex?: string | null
          color_id?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity?: number
        }
        Update: {
          color_hex?: string | null
          color_id?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          notes: string | null
          order_number: string | null
          payment_bank_id: string | null
          payment_card_type_id: string | null
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          phone: string | null
          receipt_url: string | null
          shipping_address: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_bank_id?: string | null
          payment_card_type_id?: string | null
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone?: string | null
          receipt_url?: string | null
          shipping_address?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_bank_id?: string | null
          payment_card_type_id?: string | null
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone?: string | null
          receipt_url?: string | null
          shipping_address?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_payment_bank_id_fkey"
            columns: ["payment_bank_id"]
            isOneToOne: false
            referencedRelation: "bank_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_card_type_id_fkey"
            columns: ["payment_card_type_id"]
            isOneToOne: false
            referencedRelation: "card_types"
            referencedColumns: ["id"]
          },
        ]
      }
      preorders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preorders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          color_hex: string
          color_name: string
          cost_price: number | null
          created_at: string
          id: string
          image_url: string | null
          product_id: string
          sort_order: number | null
          stock_quantity: number
        }
        Insert: {
          color_hex: string
          color_name: string
          cost_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_id: string
          sort_order?: number | null
          stock_quantity?: number
        }
        Update: {
          color_hex?: string
          color_name?: string
          cost_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_id?: string
          sort_order?: number | null
          stock_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          color_id: string | null
          created_at: string
          id: string
          image_url: string
          is_360: boolean | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          color_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_360?: boolean | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          color_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_360?: boolean | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specifications: {
        Row: {
          icon: string | null
          id: string
          product_id: string
          sort_order: number | null
          spec_name: string
          spec_value: string
        }
        Insert: {
          icon?: string | null
          id?: string
          product_id: string
          sort_order?: number | null
          spec_name: string
          spec_value: string
        }
        Update: {
          icon?: string | null
          id?: string
          product_id?: string
          sort_order?: number | null
          spec_name?: string
          spec_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_specifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          hidden_from_shop: boolean
          id: string
          image_url: string | null
          in_stock: boolean | null
          item_code: string | null
          name: string
          old_price: number | null
          price: number
          rating: number | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          hidden_from_shop?: boolean
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          item_code?: string | null
          name: string
          old_price?: number | null
          price: number
          rating?: number | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          hidden_from_shop?: boolean
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          item_code?: string | null
          name?: string
          old_price?: number | null
          price?: number
          rating?: number | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          mobile_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          mobile_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          mobile_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_history: {
        Row: {
          change_amount: number
          change_type: string
          created_at: string
          created_by: string | null
          expense_notes: string | null
          id: string
          new_quantity: number
          notes: string | null
          order_id: string | null
          other_expenses: number | null
          previous_quantity: number
          product_id: string
          shipping_cost: number | null
          total_expense: number | null
          unit_purchase_price: number | null
        }
        Insert: {
          change_amount: number
          change_type: string
          created_at?: string
          created_by?: string | null
          expense_notes?: string | null
          id?: string
          new_quantity: number
          notes?: string | null
          order_id?: string | null
          other_expenses?: number | null
          previous_quantity: number
          product_id: string
          shipping_cost?: number | null
          total_expense?: number | null
          unit_purchase_price?: number | null
        }
        Update: {
          change_amount?: number
          change_type?: string
          created_at?: string
          created_by?: string | null
          expense_notes?: string | null
          id?: string
          new_quantity?: number
          notes?: string | null
          order_id?: string | null
          other_expenses?: number | null
          previous_quantity?: number
          product_id?: string
          shipping_cost?: number | null
          total_expense?: number | null
          unit_purchase_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      support_content: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          cta_button_text: string | null
          cta_subtitle: string | null
          cta_title: string | null
          favicon_url: string | null
          feature_1_description: string | null
          feature_1_icon: string | null
          feature_1_title: string | null
          feature_2_description: string | null
          feature_2_icon: string | null
          feature_2_title: string | null
          feature_3_description: string | null
          feature_3_icon: string | null
          feature_3_title: string | null
          footer_address: string | null
          footer_company_name: string | null
          footer_copyright: string | null
          footer_email: string | null
          footer_phone: string | null
          footer_social_facebook: string | null
          footer_social_instagram: string | null
          footer_social_linkedin: string | null
          footer_social_pinterest: string | null
          footer_social_twitter: string | null
          footer_social_youtube: string | null
          google_login_enabled: boolean | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          logo_url: string | null
          notification_email: string | null
          notification_sender_name: string | null
          og_image_url: string | null
          primary_color: string | null
          secondary_color: string | null
          site_name: string
          site_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_button_text?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          favicon_url?: string | null
          feature_1_description?: string | null
          feature_1_icon?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_icon?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_icon?: string | null
          feature_3_title?: string | null
          footer_address?: string | null
          footer_company_name?: string | null
          footer_copyright?: string | null
          footer_email?: string | null
          footer_phone?: string | null
          footer_social_facebook?: string | null
          footer_social_instagram?: string | null
          footer_social_linkedin?: string | null
          footer_social_pinterest?: string | null
          footer_social_twitter?: string | null
          footer_social_youtube?: string | null
          google_login_enabled?: boolean | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          notification_email?: string | null
          notification_sender_name?: string | null
          og_image_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_name?: string
          site_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_button_text?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          favicon_url?: string | null
          feature_1_description?: string | null
          feature_1_icon?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_icon?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_icon?: string | null
          feature_3_title?: string | null
          footer_address?: string | null
          footer_company_name?: string | null
          footer_copyright?: string | null
          footer_email?: string | null
          footer_phone?: string | null
          footer_social_facebook?: string | null
          footer_social_instagram?: string | null
          footer_social_linkedin?: string | null
          footer_social_pinterest?: string | null
          footer_social_twitter?: string | null
          footer_social_youtube?: string | null
          google_login_enabled?: boolean | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          notification_email?: string | null
          notification_sender_name?: string | null
          og_image_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_name?: string
          site_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          added_by: string | null
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          other_costs: number | null
          product_name: string | null
          quantity: number | null
          shipping_cost: number | null
          type: string
          unit_purchase_price: number | null
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          other_costs?: number | null
          product_name?: string | null
          quantity?: number | null
          shipping_cost?: number | null
          type: string
          unit_purchase_price?: number | null
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          other_costs?: number | null
          product_name?: string | null
          quantity?: number | null
          shipping_cost?: number | null
          type?: string
          unit_purchase_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_showcases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          product_id: string | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_showcases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const
