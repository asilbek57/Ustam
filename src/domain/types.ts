/**
 * DOMAIN LAYER — entities. Catalog and OLX masters are shaped after
 * servicesDatabase.json; accounts, registered masters, orders and chat
 * belong to the Ustam marketplace. No React, no database code here.
 */

export type ID = string;
export type VisitType = 'home' | 'workshop'; // master comes to you | you bring it to a service centre

export interface Category {
  id: ID;          // 'air-conditioners'
  title: string;   // 'Кондиционеры' (Russian original)
  icon: string;
  sortOrder: number;
}

export interface Service {
  id: ID;          // 'ac-install-standard'
  categoryId: ID;
  name: string;    // Russian original
  priceFrom: number;
  priceTo: number | null;  // null = "от X" (no upper bound in the source)
  unit: string;            // 'за сплит-систему', 'за работу + запчасть', …
  description: string;
  warranty: string;
  districts: string[];
  source: { olx?: string | null; web?: string | null; note?: string };
}

/** A price that is really stated for a master (never invented). */
export interface MasterPrice {
  serviceId: ID;
  priceFrom: number;
  priceTo: number | null;
  source: 'verified' | 'listing' | 'own'; // OLX verified list | OLX listing text | set by the master on Ustam
}

export interface Master {
  id: ID;
  name: string;
  title: string;
  type: 'private' | 'center';      // private master | service centre
  categoryIds: ID[];
  districts: string[];             // where they go
  location: string | null;         // where they are based (verified masters)
  experienceYears: number;
  experienceLabel: string | null;  // '7+'
  responseTime: string | null;     // '30 минут'
  responseMinutes: number;
  serviceIds: ID[];
  prices: MasterPrice[];
  url: string | null;              // OLX listing / website
  olxListingId: string | null;
  note: string;
  verified: boolean;               // phone confirmed via OLX
  phone: string | null;
  phoneDisplay: string | null;
  verifiedAt: string | null;
  rating: null;                    // no ratings yet — nothing is invented
  // ---- Ustam marketplace (registered masters only) ----
  registered?: boolean;            // true = has an Ustam account (can chat, receives orders)
  userId?: ID;
  bio?: string;
  photo?: string | null;           // URL or data URL
  telegram?: string | null;        // @username
  point?: GeoPoint | null;         // workshop / base location on the map
  workshopAddress?: string | null;
}

/** A point on the map (WGS84). */
export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string; // district or address
}

export interface Meta {
  city: string;
  currency: string;
  currencySymbol: string;
  updatedAt: string;
  disclaimer: string;
}

export interface Database {
  meta: Meta;
  districts: string[];
  categories: Category[];
  services: Service[];
  masters: Master[];
}

// ---------------------------------------------------------------------------
// Ustam marketplace: accounts, orders, chat
// ---------------------------------------------------------------------------

export type Role = 'client' | 'master';

export interface User {
  id: ID;
  role: Role;
  name: string;
  email: string;
  phone: string | null;
  telegram: string | null;
  createdAt: string;
}

/** What a master edits in the cabinet. Becomes a public Master when published. */
export interface MasterProfileInput {
  name: string;
  title: string;            // headline: "Ремонт стиральных машин на дому"
  bio: string;
  type: 'private' | 'center';
  categoryIds: ID[];
  serviceIds: ID[];
  prices: { serviceId: ID; priceFrom: number; priceTo: number | null }[];
  districts: string[];
  point: GeoPoint | null;
  workshopAddress: string | null;
  experienceYears: number;
  responseTime: string;     // "1 час"
  phone: string;
  telegram: string | null;
  photo: string | null;
  published: boolean;
}

export type JobStatus = 'new' | 'accepted' | 'in_progress' | 'done' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer';

/** An order: created by a client on Ustam, or added by the master manually. */
export interface Job {
  id: ID;
  masterId: ID;               // registered master id or OLX master id
  masterName: string;
  clientId: ID | null;        // user id (or anonymous device id)
  clientName: string;
  clientPhone: string | null;
  categoryId: ID | null;
  serviceIds: ID[];
  title: string;              // short description for manual orders
  description: string;
  district: string | null;
  address: string;
  point: GeoPoint | null;
  scheduledAt: string | null;
  visitType: VisitType;
  estimateFrom: number;
  estimateTo: number | null;
  price: number | null;       // final agreed price (set by the master)
  partsCost: number;          // spent on parts — for profit
  paymentMethod: PaymentMethod | null;
  paid: boolean;
  status: JobStatus;
  source: 'platform' | 'manual';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type NewJob = Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'price' | 'partsCost' | 'paymentMethod' | 'paid' | 'status'> &
  Partial<Pick<Job, 'price' | 'partsCost' | 'paymentMethod' | 'paid' | 'status'>>;

export interface Conversation {
  id: ID;
  clientId: ID;
  clientName: string;
  masterUserId: ID;
  masterId: ID;
  masterName: string;
  jobId: ID | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadFor: ID[];            // user ids with unread messages
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  body: string;
  createdAt: string;
}
