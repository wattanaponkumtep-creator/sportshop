// Hand-written types matching supabase/migrations/0001_init.sql
// Replace with `supabase gen types typescript` output once project is connected.

export type UserRole = "admin" | "staff";
export type ChannelType = "phone" | "line" | "line_oa" | "fb" | "fb_page" | "other";
export type JobStatus =
  | "received"
  | "designing"
  | "awaiting_approval"
  | "sent_to_factory"
  | "producing"
  | "qc"
  | "ready_to_ship"
  | "shipped"
  | "completed"
  | "cancelled";
export type PriorityLevel = "normal" | "urgent" | "rush";
export type FactoryJobStatus = "sent" | "producing" | "sewing" | "qc" | "returned";
export type FileKind = "artwork" | "mockup" | "slip" | "reference" | "other";
export type PaymentType = "deposit" | "full" | "refund";
export type ShipmentStatus = "preparing" | "shipped" | "in_transit" | "delivered" | "returned";
export type MockupStatus = "draft" | "awaiting_approval" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  primary_channel: ChannelType;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerChannel {
  id: string;
  customer_id: string;
  channel_type: ChannelType;
  external_id: string | null;
  display_name: string | null;
  note: string | null;
  created_at: string;
}

export interface Factory {
  id: string;
  name: string;
  strengths: string | null;
  lead_time_days: number | null;
  quality_score: number | null;
  base_price: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  job_code: string;
  customer_id: string;
  factory_id: string | null;
  product_type: string | null;
  quantity: number;
  sale_price: number;
  cost: number;
  shipping_cost: number;
  other_cost: number;
  status: JobStatus;
  priority: PriorityLevel;
  received_at: string;
  due_date: string | null;
  track_token: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  layout_progress: number;
  print_progress: number;
  sew_progress: number;
  ship_progress: number;
}

export interface JobItem {
  id: string;
  job_id: string;
  name: string | null;
  number: string | null;
  size: string | null;
  sponsor: string | null;
  note: string | null;
  position: number;
  created_at: string;
}

export interface JobFile {
  id: string;
  job_id: string;
  kind: FileKind;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  version: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface JobTimeline {
  id: string;
  job_id: string;
  event_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  actor_id: string | null;
  created_at: string;
}

export interface FactoryJob {
  id: string;
  job_id: string;
  factory_id: string;
  status: FactoryJobStatus;
  sent_at: string | null;
  returned_at: string | null;
  cost: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  job_id: string;
  type: PaymentType;
  amount: number;
  slip_path: string | null;
  paid_at: string;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  job_id: string;
  carrier: string | null;
  tracking_no: string | null;
  status: ShipmentStatus;
  shipped_at: string | null;
  delivered_at: string | null;
  note: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  job_id: string | null;
  customer_id: string | null;
  channel: ChannelType | null;
  template: string;
  payload: Record<string, unknown> | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface LineWebhookEvent {
  id: string;
  event_type: string;
  line_user_id: string | null;
  message_text: string | null;
  raw_payload: Record<string, unknown>;
  customer_id: string | null;
  linked_at: string | null;
  created_at: string;
}

export interface FactoryCheckin {
  id: string;
  job_id: string;
  factory_id: string | null;
  status: string;
  note: string | null;
  checked_in_by: string | null;
  created_at: string;
}

export interface ShopInfo {
  id: number;
  shop_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  bank_info: string | null;
  logo_url: string | null;
  updated_at: string;
}

export interface Mockup {
  id: string;
  job_id: string;
  version: number;
  title: string | null;
  description: string | null;
  status: MockupStatus;
  approval_token: string;
  storage_paths: string[];
  decision_note: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  created_at: string;
  updated_at: string;
}

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<Row, Rels extends Relationship[] = []> = {
  Row: Row & Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: Rels;
};

type JobsRelationships = [
  { foreignKeyName: "jobs_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
  { foreignKeyName: "jobs_factory_id_fkey"; columns: ["factory_id"]; isOneToOne: false; referencedRelation: "factories"; referencedColumns: ["id"] },
  { foreignKeyName: "jobs_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }
];

type CustomerChannelsRelationships = [
  { foreignKeyName: "customer_channels_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] }
];

type JobItemsRelationships = [
  { foreignKeyName: "job_items_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }
];

type JobFilesRelationships = [
  { foreignKeyName: "job_files_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }
];

type JobTimelineRelationships = [
  { foreignKeyName: "job_timeline_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }
];

type FactoryJobsRelationships = [
  { foreignKeyName: "factory_jobs_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] },
  { foreignKeyName: "factory_jobs_factory_id_fkey"; columns: ["factory_id"]; isOneToOne: false; referencedRelation: "factories"; referencedColumns: ["id"] }
];

type PaymentsRelationships = [
  { foreignKeyName: "payments_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }
];

type ShipmentsRelationships = [
  { foreignKeyName: "shipments_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }
];

type MockupsRelationships = [
  { foreignKeyName: "mockups_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }
];

export type Database = {
  public: {
    Tables: {
      users: TableDef<User>;
      customers: TableDef<Customer>;
      customer_channels: TableDef<CustomerChannel, CustomerChannelsRelationships>;
      factories: TableDef<Factory>;
      jobs: TableDef<Job, JobsRelationships>;
      job_items: TableDef<JobItem, JobItemsRelationships>;
      job_files: TableDef<JobFile, JobFilesRelationships>;
      job_timeline: TableDef<JobTimeline, JobTimelineRelationships>;
      factory_jobs: TableDef<FactoryJob, FactoryJobsRelationships>;
      payments: TableDef<Payment, PaymentsRelationships>;
      shipments: TableDef<Shipment, ShipmentsRelationships>;
      notifications: TableDef<Notification>;
      mockups: TableDef<Mockup, MockupsRelationships>;
      line_webhook_events: TableDef<LineWebhookEvent>;
      factory_checkins: TableDef<FactoryCheckin>;
      shop_info: TableDef<ShopInfo>;
    };
    Views: { [_ in never]: never };
    Functions: {
      generate_job_code: { Args: Record<string, never>; Returns: string };
      get_public_tracking: { Args: { p_token: string }; Returns: unknown };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      get_mockup_for_approval: { Args: { p_token: string }; Returns: unknown };
      submit_mockup_decision: {
        Args: { p_token: string; p_decision: string; p_note?: string; p_name?: string };
        Returns: unknown;
      };
    };
    Enums: {
      user_role: UserRole;
      channel_type: ChannelType;
      job_status: JobStatus;
      priority_level: PriorityLevel;
      factory_job_status: FactoryJobStatus;
      file_kind: FileKind;
      payment_type: PaymentType;
      shipment_status: ShipmentStatus;
      mockup_status: MockupStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
