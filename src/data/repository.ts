/**
 * DATA LAYER — repository contract.
 *  Catalog  : servicesDatabase.json (OLX.uz Tashkent) — read only
 *  Accounts : clients and masters sign up / sign in
 *  Masters  : registered masters' public profiles (published by themselves)
 *  Jobs     : orders between clients and masters (+ masters' manual orders)
 *  Chat     : conversations and messages between a client and a master
 * Implementations: LocalRepository (this browser, cross-tab sync) and
 * SupabaseRepository (Postgres + Auth + Storage + Realtime).
 */
import type {
  Conversation, Database, ID, Job, Master, MasterProfileInput, Message, NewJob, Role, User,
} from '../domain/types';

export type Unsubscribe = () => void;
export type Topic = 'auth' | 'masters' | 'jobs' | 'chat';

export interface SignUpInput {
  role: Role;
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface Repository {
  readonly mode: 'supabase' | 'local';

  // ---- catalog ----
  getDatabase(): Promise<Database>;

  // ---- accounts ----
  currentUser(): Promise<User | null>;
  signUp(input: SignUpInput): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  updateUser(patch: Partial<Pick<User, 'name' | 'phone' | 'telegram'>>): Promise<User>;

  // ---- registered masters ----
  getRegisteredMasters(): Promise<Master[]>;          // published only
  getMyMasterProfile(): Promise<{ id: ID; input: MasterProfileInput } | null>;
  saveMyMasterProfile(input: MasterProfileInput): Promise<ID>;
  uploadPhoto(file: File): Promise<string>;            // returns URL / data URL

  // ---- jobs ----
  createJob(job: NewJob): Promise<Job>;
  updateJob(id: ID, patch: Partial<Job>): Promise<Job>;
  deleteJob(id: ID): Promise<void>;
  jobsForMaster(masterId: ID): Promise<Job[]>;
  jobsForClient(clientId: ID): Promise<Job[]>;

  // ---- chat ----
  /**
   * Who is chatting: the signed-in user, or a guest. Guests can write without
   * registering (local: this browser; Supabase: anonymous sign-in, created
   * only when `create` is true, i.e. when they actually write).
   */
  chatIdentity(create?: boolean): Promise<{ id: ID; name: string } | null>;
  openConversation(args: { masterId: ID; jobId?: ID | null; firstMessage?: string }): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  listMessages(conversationId: ID): Promise<Message[]>;
  sendMessage(conversationId: ID, body: string): Promise<Message>;
  markRead(conversationId: ID): Promise<void>;

  // ---- realtime ----
  subscribe(topic: Topic, cb: () => void): Unsubscribe;
}

/** Anonymous device id: lets guests keep their requests without an account. */
/** Name a guest typed in the chat (local mode, no account). */
export const GUEST_NAME_KEY = 'ustam.guestName';

/** The name a guest typed in the chat box (saved in this browser). */
export function guestName(): string {
  try { return localStorage.getItem(GUEST_NAME_KEY)?.trim() || ''; } catch { return ''; }
}

export function deviceId(): string {
  try {
    let id = localStorage.getItem('ustam.device');
    if (!id) { id = `dev-${Math.random().toString(36).slice(2, 10)}`; localStorage.setItem('ustam.device', id); }
    return id;
  } catch {
    return 'dev-memory';
  }
}
