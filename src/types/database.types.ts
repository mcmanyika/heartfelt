/**
 * Hand-written Supabase Database types matching supabase/migrations/001_initial_schema.sql.
 *
 * Regenerate after schema changes when a local or remote Supabase project is available:
 *
 *   npm run types:generate
 *   # or
 *   npx supabase gen types typescript --local > src/types/database.types.ts
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
 */

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
      announcements: {
        Row: {
          created_at: string;
          created_by: string | null;
          expiry_date: string | null;
          id: string;
          location_id: string | null;
          message: string;
          organization_id: string;
          publish_date: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expiry_date?: string | null;
          id?: string;
          location_id?: string | null;
          message: string;
          organization_id: string;
          publish_date?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expiry_date?: string | null;
          id?: string;
          location_id?: string | null;
          message?: string;
          organization_id?: string;
          publish_date?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcements_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcements_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: string | null;
          metadata: Json;
          organization_id: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          metadata?: Json;
          organization_id: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          metadata?: Json;
          organization_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cell_group_attendance: {
        Row: {
          id: string;
          meeting_id: string;
          member_id: string;
          status: Database["public"]["Enums"]["cell_group_attendance_status"];
        };
        Insert: {
          id?: string;
          meeting_id: string;
          member_id: string;
          status?: Database["public"]["Enums"]["cell_group_attendance_status"];
        };
        Update: {
          id?: string;
          meeting_id?: string;
          member_id?: string;
          status?: Database["public"]["Enums"]["cell_group_attendance_status"];
        };
        Relationships: [
          {
            foreignKeyName: "cell_group_attendance_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "cell_group_meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_group_attendance_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      cell_group_meetings: {
        Row: {
          cell_group_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          meeting_date: string;
          notes: string | null;
          organization_id: string;
        };
        Insert: {
          cell_group_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          meeting_date: string;
          notes?: string | null;
          organization_id: string;
        };
        Update: {
          cell_group_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          meeting_date?: string;
          notes?: string | null;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cell_group_meetings_cell_group_id_fkey";
            columns: ["cell_group_id"];
            isOneToOne: false;
            referencedRelation: "cell_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_group_meetings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_group_meetings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      cell_group_members: {
        Row: {
          cell_group_id: string;
          created_at: string;
          id: string;
          joined_at: string;
          left_at: string | null;
          member_id: string;
          role: Database["public"]["Enums"]["cell_group_member_role"];
        };
        Insert: {
          cell_group_id: string;
          created_at?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          member_id: string;
          role?: Database["public"]["Enums"]["cell_group_member_role"];
        };
        Update: {
          cell_group_id?: string;
          created_at?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          member_id?: string;
          role?: Database["public"]["Enums"]["cell_group_member_role"];
        };
        Relationships: [
          {
            foreignKeyName: "cell_group_members_cell_group_id_fkey";
            columns: ["cell_group_id"];
            isOneToOne: false;
            referencedRelation: "cell_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_group_members_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      cell_groups: {
        Row: {
          code: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          leader_member_id: string | null;
          location_id: string;
          meeting_time: string | null;
          meeting_weekday: number | null;
          name: string;
          organization_id: string;
          status: Database["public"]["Enums"]["cell_group_status"];
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          leader_member_id?: string | null;
          location_id: string;
          meeting_time?: string | null;
          meeting_weekday?: number | null;
          name: string;
          organization_id: string;
          status?: Database["public"]["Enums"]["cell_group_status"];
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          leader_member_id?: string | null;
          location_id?: string;
          meeting_time?: string | null;
          meeting_weekday?: number | null;
          name?: string;
          organization_id?: string;
          status?: Database["public"]["Enums"]["cell_group_status"];
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cell_groups_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_groups_leader_member_id_fkey";
            columns: ["leader_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_groups_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_groups_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      department_members: {
        Row: {
          created_at: string;
          department_id: string;
          id: string;
          joined_at: string;
          left_at: string | null;
          member_id: string;
          role: Database["public"]["Enums"]["department_member_role"];
        };
        Insert: {
          created_at?: string;
          department_id: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          member_id: string;
          role?: Database["public"]["Enums"]["department_member_role"];
        };
        Update: {
          created_at?: string;
          department_id?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          member_id?: string;
          role?: Database["public"]["Enums"]["department_member_role"];
        };
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "department_members_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          code: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          leader_member_id: string | null;
          location_id: string;
          name: string;
          organization_id: string;
          status: Database["public"]["Enums"]["department_status"];
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          leader_member_id?: string | null;
          location_id: string;
          name: string;
          organization_id: string;
          status?: Database["public"]["Enums"]["department_status"];
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          leader_member_id?: string | null;
          location_id?: string;
          name?: string;
          organization_id?: string;
          status?: Database["public"]["Enums"]["department_status"];
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "departments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departments_leader_member_id_fkey";
            columns: ["leader_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departments_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      event_registrations: {
        Row: {
          event_id: string;
          id: string;
          member_id: string;
          registered_at: string;
          status: Database["public"]["Enums"]["event_registration_status"];
        };
        Insert: {
          event_id: string;
          id?: string;
          member_id: string;
          registered_at?: string;
          status?: Database["public"]["Enums"]["event_registration_status"];
        };
        Update: {
          event_id?: string;
          id?: string;
          member_id?: string;
          registered_at?: string;
          status?: Database["public"]["Enums"]["event_registration_status"];
        };
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_registrations_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          capacity: number | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          end_date: string | null;
          id: string;
          location_id: string | null;
          organization_id: string;
          registration_required: boolean;
          start_date: string;
          title: string;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          capacity?: number | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          location_id?: string | null;
          organization_id: string;
          registration_required?: boolean;
          start_date: string;
          title: string;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          location_id?: string | null;
          organization_id?: string;
          registration_required?: boolean;
          start_date?: string;
          title?: string;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      giving_categories: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "giving_categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      giving_transactions: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          currency: string;
          giving_category_id: string;
          id: string;
          location_id: string;
          member_id: string | null;
          notes: string | null;
          organization_id: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          status: Database["public"]["Enums"]["transaction_status"];
          terminal_id: string | null;
          transaction_reference: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          giving_category_id: string;
          id?: string;
          location_id: string;
          member_id?: string | null;
          notes?: string | null;
          organization_id: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          status?: Database["public"]["Enums"]["transaction_status"];
          terminal_id?: string | null;
          transaction_reference: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          giving_category_id?: string;
          id?: string;
          location_id?: string;
          member_id?: string | null;
          notes?: string | null;
          organization_id?: string;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          status?: Database["public"]["Enums"]["transaction_status"];
          terminal_id?: string | null;
          transaction_reference?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "giving_transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giving_transactions_giving_category_id_fkey";
            columns: ["giving_category_id"];
            isOneToOne: false;
            referencedRelation: "giving_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giving_transactions_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giving_transactions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giving_transactions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "giving_transactions_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "payment_terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          address: string | null;
          city: string;
          code: string;
          country: string;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          organization_id: string;
          phone: string | null;
          status: Database["public"]["Enums"]["location_status"];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city: string;
          code: string;
          country: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          phone?: string | null;
          status?: Database["public"]["Enums"]["location_status"];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string;
          code?: string;
          country?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          phone?: string | null;
          status?: Database["public"]["Enums"]["location_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          address: string | null;
          created_at: string;
          date_joined: string;
          date_of_birth: string | null;
          email: string | null;
          first_name: string | null;
          gender: string | null;
          id: string;
          last_name: string | null;
          location_id: string;
          membership_number: string;
          membership_status: Database["public"]["Enums"]["membership_status"];
          organization_id: string;
          phone: string | null;
          profile_id: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          date_joined?: string;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          gender?: string | null;
          id?: string;
          last_name?: string | null;
          location_id: string;
          membership_number?: string;
          membership_status?: Database["public"]["Enums"]["membership_status"];
          organization_id: string;
          phone?: string | null;
          profile_id?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          date_joined?: string;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          gender?: string | null;
          id?: string;
          last_name?: string | null;
          location_id?: string;
          membership_number?: string;
          membership_status?: Database["public"]["Enums"]["membership_status"];
          organization_id?: string;
          phone?: string | null;
          profile_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      member_family_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          member_id: string;
          notes: string | null;
          organization_id: string;
          related_member_id: string;
          relationship: Database["public"]["Enums"]["family_relationship"];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          member_id: string;
          notes?: string | null;
          organization_id: string;
          related_member_id: string;
          relationship: Database["public"]["Enums"]["family_relationship"];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          member_id?: string;
          notes?: string | null;
          organization_id?: string;
          related_member_id?: string;
          relationship?: Database["public"]["Enums"]["family_relationship"];
        };
        Relationships: [
          {
            foreignKeyName: "member_family_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_family_links_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_family_links_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_family_links_related_member_id_fkey";
            columns: ["related_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_counters: {
        Row: {
          location_id: string;
          next_number: number;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          location_id: string;
          next_number?: number;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          location_id?: string;
          next_number?: number;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membership_counters_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: true;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_counters_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          phone: string | null;
          short_code: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          phone?: string | null;
          short_code: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          short_code?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_terminals: {
        Row: {
          created_at: string;
          device_name: string;
          id: string;
          last_seen_at: string | null;
          location_id: string;
          organization_id: string;
          serial_number: string | null;
          software_version: string | null;
          status: Database["public"]["Enums"]["terminal_status"];
          terminal_code: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          device_name: string;
          id?: string;
          last_seen_at?: string | null;
          location_id: string;
          organization_id: string;
          serial_number?: string | null;
          software_version?: string | null;
          status?: Database["public"]["Enums"]["terminal_status"];
          terminal_code: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          device_name?: string;
          id?: string;
          last_seen_at?: string | null;
          location_id?: string;
          organization_id?: string;
          serial_number?: string | null;
          software_version?: string | null;
          status?: Database["public"]["Enums"]["terminal_status"];
          terminal_code?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_terminals_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_terminals_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          first_name: string;
          id: string;
          last_name: string;
          location_id: string | null;
          organization_id: string;
          phone: string | null;
          status: Database["public"]["Enums"]["profile_status"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          first_name: string;
          id: string;
          last_name: string;
          location_id?: string | null;
          organization_id: string;
          phone?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          location_id?: string | null;
          organization_id?: string;
          phone?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          location_id: string | null;
          organization_id: string;
          role_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          location_id?: string | null;
          organization_id: string;
          role_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          location_id?: string | null;
          organization_id?: string;
          role_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_view_location_content: {
        Args: { location_uuid: string };
        Returns: boolean;
      };
      cell_group_leader_label: {
        Args: { p_group_id: string };
        Returns: string;
      };
      department_leader_label: {
        Args: { p_department_id: string };
        Returns: string;
      };
      current_member_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_location_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_organization_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      generate_membership_number: {
        Args: { p_location_id: string };
        Returns: string;
      };
      list_family_links_for_member: {
        Args: { p_member_id: string };
        Returns: {
          id: string;
          related_member_id: string;
          related_first_name: string | null;
          related_last_name: string | null;
          related_membership_number: string;
          location_name: string;
          location_code: string;
          relationship: Database["public"]["Enums"]["family_relationship"];
          notes: string | null;
        }[];
      };
      list_org_locations_for_staff: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          code: string;
          city: string;
          country: string;
          status: Database["public"]["Enums"]["location_status"];
        }[];
      };
      has_role: {
        Args: { role_name: string };
        Returns: boolean;
      };
      is_active_cell_group_member: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      is_active_department_member: {
        Args: { p_department_id: string };
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      staff_can_manage_cell_group: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      staff_can_manage_department: {
        Args: { p_department_id: string };
        Returns: boolean;
      };
      register_for_event: {
        Args: { p_event_id: string };
        Returns: Database["public"]["Tables"]["event_registrations"]["Row"];
      };
      transfer_member: {
        Args: { p_member_id: string; p_to_location_id: string };
        Returns: Database["public"]["Tables"]["members"]["Row"];
      };
      user_has_location_access: {
        Args: { location_uuid: string };
        Returns: boolean;
      };
      write_audit_log: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string;
          p_metadata?: Json;
          p_ip_address?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      cell_group_attendance_status: "PRESENT" | "ABSENT" | "EXCUSED";
      cell_group_member_role: "LEADER" | "MEMBER";
      cell_group_status: "ACTIVE" | "INACTIVE";
      department_member_role: "LEADER" | "MEMBER";
      department_status: "ACTIVE" | "INACTIVE";
      event_registration_status: "REGISTERED" | "ATTENDED" | "CANCELLED";
      family_relationship:
        | "SPOUSE"
        | "PARENT"
        | "CHILD"
        | "SIBLING"
        | "GUARDIAN"
        | "DEPENDENT"
        | "OTHER";
      location_status: "ACTIVE" | "INACTIVE";
      membership_status:
        | "VISITOR"
        | "NEW_CONVERT"
        | "ACTIVE_MEMBER"
        | "INACTIVE_MEMBER"
        | "TRANSFERRED";
      payment_method:
        | "CASH"
        | "ECOCASH"
        | "ONEMONEY"
        | "CARD"
        | "BANK_TRANSFER"
        | "TERMINAL";
      profile_status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
      terminal_status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "DISABLED";
      transaction_status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
