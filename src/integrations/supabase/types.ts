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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_ai_messages: {
        Row: {
          admin_user_id: string
          content: string
          created_at: string
          id: string
          kind: string
          payload: Json
          related_action_id: string | null
          seen_at: string | null
        }
        Insert: {
          admin_user_id: string
          content: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          related_action_id?: string | null
          seen_at?: string | null
        }
        Update: {
          admin_user_id?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          related_action_id?: string | null
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_ai_messages_related_action_id_fkey"
            columns: ["related_action_id"]
            isOneToOne: false
            referencedRelation: "scheduled_admin_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_ai_state: {
        Row: {
          k: string
          updated_at: string
          v: Json
        }
        Insert: {
          k: string
          updated_at?: string
          v?: Json
        }
        Update: {
          k?: string
          updated_at?: string
          v?: Json
        }
        Relationships: []
      }
      ai_tools: {
        Row: {
          brief: string | null
          category: string
          config: Json
          created_at: string
          created_by: string | null
          credits_cost: number
          description: string
          icon: string
          id: string
          kind: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brief?: string | null
          category?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          credits_cost?: number
          description?: string
          icon?: string
          id?: string
          kind: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brief?: string | null
          category?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          credits_cost?: number
          description?: string
          icon?: string
          id?: string
          kind?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      badge_applications: {
        Row: {
          badge: string
          contact: string | null
          created_at: string
          id: string
          reason: string | null
          reg_number: string | null
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          badge: string
          contact?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reg_number?: string | null
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          badge?: string
          contact?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reg_number?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      banner_events: {
        Row: {
          at: string
          banner_id: string
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          at?: string
          banner_id: string
          id?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          at?: string
          banner_id?: string
          id?: string
          kind?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_events_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "banner_slides"
            referencedColumns: ["id"]
          },
        ]
      }
      banner_slides: {
        Row: {
          accent: string | null
          created_at: string
          cta_label: string | null
          expire_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          layout: string
          link_url: string | null
          publish_at: string | null
          sort_order: number
          subtitle: string | null
          title: string
          variant: string
        }
        Insert: {
          accent?: string | null
          created_at?: string
          cta_label?: string | null
          expire_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          layout?: string
          link_url?: string | null
          publish_at?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
          variant?: string
        }
        Update: {
          accent?: string | null
          created_at?: string
          cta_label?: string | null
          expire_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          layout?: string
          link_url?: string | null
          publish_at?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          variant?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string
          id: string
          published: boolean
          published_at: string
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt: string
          id?: string
          published?: boolean
          published_at?: string
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_removals: {
        Row: {
          acknowledged: boolean
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          grants_role: Database["public"]["Enums"]["app_role"] | null
          id: string
          is_active: boolean
          max_uses: number | null
          reward_credits: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          grants_role?: Database["public"]["Enums"]["app_role"] | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_credits?: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          grants_role?: Database["public"]["Enums"]["app_role"] | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_credits?: number
          used_count?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          id: string
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          id?: string
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          faculty_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          faculty_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          faculty_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_thread_members: {
        Row: {
          created_at: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_thread_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          id: string
          is_group: boolean
          last_message_at: string
          name: string | null
          owner_id: string | null
          photo_url: string | null
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_group?: boolean
          last_message_at?: string
          name?: string | null
          owner_id?: string | null
          photo_url?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_group?: boolean
          last_message_at?: string
          name?: string | null
          owner_id?: string | null
          photo_url?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: []
      }
      ebsu_news_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          updated_at: string
          url: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          url: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          url?: string
          weight?: number
        }
        Relationships: []
      }
      faculties: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      hide_seek_pings: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      library_book_purchases: {
        Row: {
          book_id: string
          created_at: string
          price_paid: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          price_paid?: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          price_paid?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_book_purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          author: string | null
          can_embed: boolean
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          download_url: string | null
          external_id: string | null
          file_url: string | null
          first_publish_year: number | null
          id: string
          is_course: boolean
          level: string | null
          openlibrary_key: string
          price_credits: number
          read_url: string | null
          source: string | null
          source_url: string | null
          subject: string | null
          title: string
          uploader_id: string | null
        }
        Insert: {
          author?: string | null
          can_embed?: boolean
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          external_id?: string | null
          file_url?: string | null
          first_publish_year?: number | null
          id?: string
          is_course?: boolean
          level?: string | null
          openlibrary_key: string
          price_credits?: number
          read_url?: string | null
          source?: string | null
          source_url?: string | null
          subject?: string | null
          title: string
          uploader_id?: string | null
        }
        Update: {
          author?: string | null
          can_embed?: boolean
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          external_id?: string | null
          file_url?: string | null
          first_publish_year?: number | null
          id?: string
          is_course?: boolean
          level?: string | null
          openlibrary_key?: string
          price_credits?: number
          read_url?: string | null
          source?: string | null
          source_url?: string | null
          subject?: string | null
          title?: string
          uploader_id?: string | null
        }
        Relationships: []
      }
      library_course_progress: {
        Row: {
          course_id: string
          progress: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          progress?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          progress?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "library_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      library_courses: {
        Row: {
          author: string | null
          can_embed: boolean
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          download_url: string | null
          external_id: string | null
          id: string
          is_course: boolean
          level: string | null
          read_url: string
          source: string | null
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          can_embed?: boolean
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          external_id?: string | null
          id?: string
          is_course?: boolean
          level?: string | null
          read_url?: string
          source?: string | null
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          can_embed?: boolean
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          external_id?: string | null
          id?: string
          is_course?: boolean
          level?: string | null
          read_url?: string
          source?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_listings: {
        Row: {
          author: string | null
          category: string
          condition: string | null
          contact: string | null
          course_code: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          edition: string | null
          id: string
          is_ai_generated: boolean
          is_donation: boolean
          is_sold: boolean
          listing_kind: string
          location: string | null
          photos: Json
          price: number
          seller_id: string
          title: string
        }
        Insert: {
          author?: string | null
          category?: string
          condition?: string | null
          contact?: string | null
          course_code?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          edition?: string | null
          id?: string
          is_ai_generated?: boolean
          is_donation?: boolean
          is_sold?: boolean
          listing_kind?: string
          location?: string | null
          photos?: Json
          price?: number
          seller_id: string
          title: string
        }
        Update: {
          author?: string | null
          category?: string
          condition?: string | null
          contact?: string | null
          course_code?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          edition?: string | null
          id?: string
          is_ai_generated?: boolean
          is_donation?: boolean
          is_sold?: boolean
          listing_kind?: string
          location?: string | null
          photos?: Json
          price?: number
          seller_id?: string
          title?: string
        }
        Relationships: []
      }
      marketplace_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          author_id: string | null
          body: string
          category: Database["public"]["Enums"]["news_category"]
          created_at: string
          id: string
          image_url: string | null
          published_at: string
          slug: string
          source_urls: Json
          status: Database["public"]["Enums"]["news_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          category?: Database["public"]["Enums"]["news_category"]
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          slug: string
          source_urls?: Json
          status?: Database["public"]["Enums"]["news_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          category?: Database["public"]["Enums"]["news_category"]
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          slug?: string
          source_urls?: Json
          status?: Database["public"]["Enums"]["news_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      note_views: {
        Row: {
          created_at: string
          note_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          note_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          note_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_views_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_corrections: {
        Row: {
          corrected_text: string | null
          created_at: string
          id: string
          note: string | null
          original_text: string | null
          user_id: string
        }
        Insert: {
          corrected_text?: string | null
          created_at?: string
          id?: string
          note?: string | null
          original_text?: string | null
          user_id: string
        }
        Update: {
          corrected_text?: string | null
          created_at?: string
          id?: string
          note?: string | null
          original_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          like_count: number
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string | null
          comment_count: number
          course_id: string | null
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          image_url: string | null
          is_official: boolean
          like_count: number
          link_url: string | null
          media_type: string | null
          media_url: string | null
          post_type: string
          repost_count: number
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          body?: string | null
          comment_count?: number
          course_id?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_official?: boolean
          like_count?: number
          link_url?: string | null
          media_type?: string | null
          media_url?: string | null
          post_type?: string
          repost_count?: number
          title?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          body?: string | null
          comment_count?: number
          course_id?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_official?: boolean
          like_count?: number
          link_url?: string | null
          media_type?: string | null
          media_url?: string | null
          post_type?: string
          repost_count?: number
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_level: string | null
          approved_post_count: number
          avatar_key: string
          bio: string | null
          cover_url: string | null
          cover_video_url: string | null
          created_at: string
          credits: number
          current_lat: number | null
          current_lng: number | null
          current_zone: string | null
          department_id: string | null
          display_name: string
          email: string | null
          id: string
          is_legit: boolean
          is_star: boolean
          is_sure_plug: boolean
          is_verified: boolean
          last_seen_at: string | null
          location_updated_at: string | null
          picture_url: string | null
          rank_step: number
          rank_tier: Database["public"]["Enums"]["rank_tier"]
          referral_code: string | null
          referrer_id: string | null
          seen_welcome: boolean
          share_location: boolean
          show_online: boolean
          status: Database["public"]["Enums"]["profile_status"]
          tool_consent_at: string | null
          updated_at: string
        }
        Insert: {
          academic_level?: string | null
          approved_post_count?: number
          avatar_key?: string
          bio?: string | null
          cover_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          credits?: number
          current_lat?: number | null
          current_lng?: number | null
          current_zone?: string | null
          department_id?: string | null
          display_name?: string
          email?: string | null
          id: string
          is_legit?: boolean
          is_star?: boolean
          is_sure_plug?: boolean
          is_verified?: boolean
          last_seen_at?: string | null
          location_updated_at?: string | null
          picture_url?: string | null
          rank_step?: number
          rank_tier?: Database["public"]["Enums"]["rank_tier"]
          referral_code?: string | null
          referrer_id?: string | null
          seen_welcome?: boolean
          share_location?: boolean
          show_online?: boolean
          status?: Database["public"]["Enums"]["profile_status"]
          tool_consent_at?: string | null
          updated_at?: string
        }
        Update: {
          academic_level?: string | null
          approved_post_count?: number
          avatar_key?: string
          bio?: string | null
          cover_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          credits?: number
          current_lat?: number | null
          current_lng?: number | null
          current_zone?: string | null
          department_id?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_legit?: boolean
          is_star?: boolean
          is_sure_plug?: boolean
          is_verified?: boolean
          last_seen_at?: string | null
          location_updated_at?: string | null
          picture_url?: string | null
          rank_step?: number
          rank_tier?: Database["public"]["Enums"]["rank_tier"]
          referral_code?: string | null
          referrer_id?: string | null
          seen_welcome?: boolean
          share_location?: boolean
          show_online?: boolean
          status?: Database["public"]["Enums"]["profile_status"]
          tool_consent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          created_at: string
          id: string
          quiz_id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          options: Json
          position: number
          prompt: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          position?: number
          prompt: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          position?: number
          prompt?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          post_id: string | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          post_id?: string | null
          title?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          post_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          invitee_id: string | null
          inviter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id?: string | null
          inviter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string | null
          inviter_id?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          subtitle: string | null
          thumb_url: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          subtitle?: string | null
          thumb_url?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          subtitle?: string | null
          thumb_url?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_admin_actions: {
        Row: {
          action: string
          args: Json
          created_at: string
          created_by: string
          error: string | null
          executed_at: string | null
          id: string
          max_runs: number | null
          note: string | null
          repeat_every_seconds: number | null
          repeat_until: string | null
          result: Json | null
          run_at: string
          run_count: number
          status: string
        }
        Insert: {
          action: string
          args?: Json
          created_at?: string
          created_by: string
          error?: string | null
          executed_at?: string | null
          id?: string
          max_runs?: number | null
          note?: string | null
          repeat_every_seconds?: number | null
          repeat_until?: string | null
          result?: Json | null
          run_at: string
          run_count?: number
          status?: string
        }
        Update: {
          action?: string
          args?: Json
          created_at?: string
          created_by?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          max_runs?: number | null
          note?: string | null
          repeat_every_seconds?: number | null
          repeat_until?: string | null
          result?: Json | null
          run_at?: string
          run_count?: number
          status?: string
        }
        Relationships: []
      }
      student_verifications: {
        Row: {
          created_at: string
          id: string
          jamb_reg_number: string
          response: Json | null
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          jamb_reg_number: string
          response?: Json | null
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          jamb_reg_number?: string
          response?: Json | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          body: string
          course_id: string | null
          created_at: string
          id: string
          title: string
          uploader_id: string
        }
        Insert: {
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          title: string
          uploader_id: string
        }
        Update: {
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          title?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_purchases: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          price_paid: number
          qr_token: string | null
          ticket_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          price_paid?: number
          qr_token?: string | null
          ticket_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          price_paid?: number
          qr_token?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_purchases_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_scans: {
        Row: {
          id: string
          scanned_at: string
          scanner_id: string
          ticket_id: string
        }
        Insert: {
          id?: string
          scanned_at?: string
          scanner_id: string
          ticket_id: string
        }
        Update: {
          id?: string
          scanned_at?: string
          scanner_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_scans_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          buyer_id: string | null
          contact: string | null
          created_at: string
          description: string | null
          id: string
          is_sold: boolean
          pay_mode: string
          photo_url: string
          price: number
          qr_token: string | null
          title: string
          uploader_id: string
        }
        Insert: {
          buyer_id?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_sold?: boolean
          pay_mode?: string
          photo_url?: string
          price?: number
          qr_token?: string | null
          title: string
          uploader_id: string
        }
        Update: {
          buyer_id?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_sold?: boolean
          pay_mode?: string
          photo_url?: string
          price?: number
          qr_token?: string | null
          title?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_failure_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_jobs: {
        Row: {
          created_at: string
          duration_ms: number | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          settings: Json | null
          tool: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          settings?: Json | null
          tool: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          settings?: Json | null
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_overrides: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          paths: Json
          rapidapi_host: string | null
          rapidapi_key: string | null
          tool_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          paths?: Json
          rapidapi_host?: string | null
          rapidapi_key?: string | null
          tool_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          paths?: Json
          rapidapi_host?: string | null
          rapidapi_key?: string | null
          tool_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      tool_prices: {
        Row: {
          cost: number
          created_at: string
          id: string
          label: string | null
          tool_key: string
          updated_at: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          label?: string | null
          tool_key: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          label?: string | null
          tool_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_book_chapters: {
        Row: {
          book_id: string
          content: string
          created_at: string
          id: string
          idx: number
          title: string
          updated_at: string
        }
        Insert: {
          book_id: string
          content?: string
          created_at?: string
          id?: string
          idx?: number
          title?: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          id?: string
          idx?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_book_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "user_books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_books: {
        Row: {
          author_id: string
          book_type: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          library_book_id: string | null
          price_credits: number
          published_at: string | null
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          book_type?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          library_book_id?: string | null
          price_credits?: number
          published_at?: string | null
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_type?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          library_book_id?: string | null
          price_credits?: number
          published_at?: string | null
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_library_book_id_fkey"
            columns: ["library_book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          category: string
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          reviewed_at: string | null
          status: string
          subject: string | null
          target_listing_id: string | null
          target_post_id: string | null
          target_user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          status?: string
          subject?: string | null
          target_listing_id?: string | null
          target_post_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          status?: string
          subject?: string | null
          target_listing_id?: string | null
          target_post_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_target_listing_id_fkey"
            columns: ["target_listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_dm_group_member: {
        Args: { _member_id: string; _thread_id: string }
        Returns: undefined
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_delete_comment: {
        Args: { _comment_id: string }
        Returns: undefined
      }
      admin_delete_listing: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      admin_delete_post: { Args: { _post_id: string }; Returns: undefined }
      admin_find_user: {
        Args: { _query: string }
        Returns: {
          credits: number
          display_name: string
          email: string
          id: string
          is_verified: boolean
          rank_tier: Database["public"]["Enums"]["rank_tier"]
          status: Database["public"]["Enums"]["profile_status"]
        }[]
      }
      admin_grant_credits: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: Json
      }
      admin_post_to_note: { Args: { _post_id: string }; Returns: string }
      admin_set_badge: {
        Args: { _badge: string; _user_id: string; _value: boolean }
        Returns: undefined
      }
      admin_set_rank: {
        Args: { _step: number; _tier: string; _user_id: string }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: { _status: string; _user_id: string }
        Returns: undefined
      }
      buy_ticket: { Args: { _ticket_id: string }; Returns: Json }
      claim_ad_reward: { Args: { _amount: number }; Returns: Json }
      claim_seed_admin_role: { Args: never; Returns: boolean }
      create_dm_group: {
        Args: { _member_ids: string[]; _name: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_dm_thread_member: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      publish_user_book: { Args: { _book_id: string }; Returns: string }
      redeem_coupon: { Args: { _code: string }; Returns: Json }
      redeem_referral: { Args: { _code: string }; Returns: undefined }
      remove_dm_group_member: {
        Args: { _member_id: string; _thread_id: string }
        Returns: undefined
      }
      rename_dm_group: {
        Args: { _name: string; _thread_id: string }
        Returns: undefined
      }
      seed_admin_email_matches_current_user: {
        Args: { _profile_id?: string }
        Returns: boolean
      }
      spend_credits: {
        Args: { _amount: number; _reason: string }
        Returns: Json
      }
      verify_ticket: { Args: { _qr_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      news_category: "ebsu" | "other"
      news_status: "draft" | "published"
      profile_status: "active" | "blocked" | "deactivated"
      rank_tier: "newbie" | "normal" | "active" | "legend" | "pro" | "sure_plug"
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
      app_role: ["admin", "moderator", "user"],
      news_category: ["ebsu", "other"],
      news_status: ["draft", "published"],
      profile_status: ["active", "blocked", "deactivated"],
      rank_tier: ["newbie", "normal", "active", "legend", "pro", "sure_plug"],
    },
  },
} as const
