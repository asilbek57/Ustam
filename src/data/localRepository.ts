/**
 * DATA LAYER — local implementation (works without any backend).
 *  - Catalog: shared/data/servicesDatabase.json via the shared adapter.
 *  - Accounts, master profiles, jobs, chat: stored in localStorage.
 *  - Realtime: BroadcastChannel + 'storage' events, so a client in one tab
 *    and a master in another tab see each other's messages instantly.
 *  - Session is per tab (sessionStorage), so two tabs can be two users.
 * Passwords are salted SHA-256 hashes. This is a DEMO backend — use
 * Supabase (SupabaseRepository) for real users.
 */
import { normalizeDatabase } from '../../shared/normalize.js';
import { profileToMaster } from '../domain/masters';
import type {
  Conversation, Database, ID, Job, Master, MasterProfileInput, Message, NewJob, User,
} from '../domain/types';
import { deviceId, GUEST_NAME_KEY, type Repository, type SignUpInput, type Topic, type Unsubscribe } from './repository';

interface StoredUser extends User { salt: string; hash: string }
interface StoredProfile { id: ID; userId: ID; input: MasterProfileInput; updatedAt: string }
interface Store {
  users: StoredUser[];
  profiles: StoredProfile[];
  jobs: Job[];
  conversations: Conversation[];
  messages: Message[];
}

const KEY = 'ustam.store.v1';
const SESSION = 'ustam.session';
const EMPTY: Store = { users: [], profiles: [], jobs: [], conversations: [], messages: [] };
let memory: Store = structuredClone(EMPTY);

// ---------- storage helpers ----------
function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : structuredClone(EMPTY);
  } catch {
    return memory;
  }
}
function save(s: Store) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode — kept in memory */
  }
}
function getSession(): ID | null {
  try {
    return sessionStorage.getItem(SESSION) ?? localStorage.getItem(SESSION);
  } catch {
    return null;
  }
}
function setSession(id: ID | null) {
  try {
    if (id) { sessionStorage.setItem(SESSION, id); localStorage.setItem(SESSION, id); }
    else { sessionStorage.removeItem(SESSION); localStorage.removeItem(SESSION); }
  } catch {
    /* ignore */
  }
}

// ---------- realtime (same tab + other tabs) ----------
const listeners = new Map<Topic, Set<() => void>>();
let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel('ustam');
  channel.onmessage = (e) => fire(e.data as Topic, false);
} catch {
  channel = null;
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) (['masters', 'jobs', 'chat'] as Topic[]).forEach((t) => fire(t, false));
  });
}
function fire(topic: Topic, broadcast = true) {
  listeners.get(topic)?.forEach((cb) => cb());
  if (broadcast) channel?.postMessage(topic);
}

// ---------- utils ----------
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

async function hash(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0; // fallback for insecure contexts
  for (const b of data) h = (h * 31 + b) | 0;
  return String(h);
}

const publicUser = ({ salt: _s, hash: _h, ...u }: StoredUser): User => u;

/** Resize an image to a small square-ish JPEG data URL (keeps localStorage small). */
function resizeImage(file: File, max = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('bad image'));
    img.src = url;
  });
}

/** Who is chatting: the signed-in user, or a guest bound to this browser. */
function chatMe(s: Store): { id: ID; name: string } {
  const u = s.users.find((x) => x.id === getSession());
  if (u) return { id: u.id, name: u.name };
  let name = '';
  try { name = localStorage.getItem(GUEST_NAME_KEY) || ''; } catch { /* ignore */ }
  return { id: deviceId(), name: name || 'Гость' };
}

export class LocalRepository implements Repository {
  readonly mode = 'local' as const;
  private dbPromise: Promise<Database> | null = null;

  getDatabase() {
    return (this.dbPromise ??= import('../../shared/data/servicesDatabase.json').then(
      (m) => normalizeDatabase(m.default) as unknown as Database,
    ));
  }

  // ---------------- accounts ----------------
  async currentUser() {
    const id = getSession();
    const u = id ? load().users.find((x) => x.id === id) : null;
    return u ? publicUser(u) : null;
  }

  async signUp(input: SignUpInput) {
    const s = load();
    const email = input.email.trim().toLowerCase();
    if (s.users.some((u) => u.email === email)) throw new Error('auth.err.exists');
    if (input.password.length < 6) throw new Error('auth.err.short');
    const salt = Math.random().toString(36).slice(2);
    const user: StoredUser = {
      id: uid('u'), role: input.role, name: input.name.trim(), email, phone: input.phone.trim() || null,
      telegram: null, createdAt: now(), salt, hash: await hash(input.password, salt),
    };
    s.users.push(user);
    save(s);
    setSession(user.id);
    fire('auth');
    return publicUser(user);
  }

  async signIn(email: string, password: string) {
    const u = load().users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || (await hash(password, u.salt)) !== u.hash) throw new Error('auth.err.wrong');
    setSession(u.id);
    fire('auth');
    return publicUser(u);
  }

  async signOut() {
    setSession(null);
    fire('auth');
  }

  async updateUser(patch: Partial<Pick<User, 'name' | 'phone' | 'telegram'>>) {
    const s = load();
    const u = s.users.find((x) => x.id === getSession());
    if (!u) throw new Error('auth.err.required');
    Object.assign(u, patch);
    save(s);
    fire('auth');
    return publicUser(u);
  }

  // ---------------- registered masters ----------------
  async getRegisteredMasters(): Promise<Master[]> {
    const db = await this.getDatabase();
    return load().profiles.filter((p) => p.input.published).map((p) => profileToMaster(p.id, p.userId, p.input, db.services));
  }

  async getMyMasterProfile() {
    const id = getSession();
    const p = load().profiles.find((x) => x.userId === id);
    return p ? { id: p.id, input: p.input } : null;
  }

  async saveMyMasterProfile(input: MasterProfileInput) {
    const s = load();
    const userId = getSession();
    if (!userId) throw new Error('auth.err.required');
    let p = s.profiles.find((x) => x.userId === userId);
    if (!p) { p = { id: uid('m'), userId, input, updatedAt: now() }; s.profiles.push(p); }
    else { p.input = input; p.updatedAt = now(); }
    // keep the account name/phone in sync with the public profile
    const u = s.users.find((x) => x.id === userId);
    if (u) { u.name = input.name || u.name; u.phone = input.phone || u.phone; u.telegram = input.telegram; }
    save(s);
    fire('masters');
    return p.id;
  }

  uploadPhoto(file: File) {
    return resizeImage(file);
  }

  // ---------------- jobs ----------------
  async createJob(j: NewJob) {
    const s = load();
    const job: Job = {
      price: null, partsCost: 0, paymentMethod: null, paid: false, status: 'new',
      ...j, id: uid('job'), createdAt: now(), updatedAt: now(), completedAt: j.status === 'done' ? now() : null,
    };
    s.jobs.unshift(job);
    save(s);
    fire('jobs');
    return job;
  }

  async updateJob(id: ID, patch: Partial<Job>) {
    const s = load();
    const j = s.jobs.find((x) => x.id === id);
    if (!j) throw new Error('not found');
    const becameDone = patch.status === 'done' && j.status !== 'done';
    Object.assign(j, patch, { updatedAt: now() }, becameDone ? { completedAt: now() } : {});
    save(s);
    fire('jobs');
    return j;
  }

  async deleteJob(id: ID) {
    const s = load();
    s.jobs = s.jobs.filter((x) => x.id !== id);
    save(s);
    fire('jobs');
  }

  async jobsForMaster(masterId: ID) {
    return load().jobs.filter((j) => j.masterId === masterId);
  }

  async jobsForClient(clientId: ID) {
    return load().jobs.filter((j) => j.clientId === clientId);
  }

  // ---------------- chat ----------------
  // Local-only for now. A visitor can write without an account: they chat as a
  // guest tied to this browser (deviceId). Any master can be messaged:
  //  - registered on Ustam → the master answers from their cabinet;
  //  - from OLX → the message waits in an inbox "olx:<masterId>" until the
  //    master joins Ustam (the client still sees the phone to call).
  async openConversation({ masterId, jobId = null, firstMessage }: { masterId: ID; jobId?: ID | null; firstMessage?: string }) {
    const s = load();
    const me = chatMe(s);
    const profile = s.profiles.find((p) => p.id === masterId);
    const olx = profile ? null : (await this.getDatabase()).masters.find((m) => m.id === masterId);
    if (!profile && !olx) throw new Error('common.notFound');
    if (profile && profile.userId === me.id) throw new Error('chat.err.self');
    let c = s.conversations.find((x) => x.clientId === me.id && x.masterId === masterId);
    if (!c) {
      c = {
        id: uid('c'), clientId: me.id, clientName: me.name,
        masterUserId: profile ? profile.userId : `olx:${masterId}`, masterId,
        masterName: profile ? profile.input.name : olx!.name, jobId, lastMessage: '', lastMessageAt: now(), unreadFor: [],
      };
      s.conversations.unshift(c);
    } else if (jobId) {
      c.jobId = jobId;
    }
    save(s);
    if (firstMessage) await this.sendMessage(c.id, firstMessage);
    fire('chat');
    return load().conversations.find((x) => x.id === c!.id)!;
  }

  async chatIdentity() {
    return chatMe(load());
  }

  async listConversations() {
    const s = load();
    const me = chatMe(s).id;
    return s.conversations
      .filter((c) => c.clientId === me || c.masterUserId === me)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }

  async listMessages(conversationId: ID) {
    return load().messages.filter((m) => m.conversationId === conversationId);
  }

  async sendMessage(conversationId: ID, body: string) {
    const s = load();
    const me = chatMe(s);
    const c = s.conversations.find((x) => x.id === conversationId);
    if (!c || (c.clientId !== me.id && c.masterUserId !== me.id)) throw new Error('auth.err.required');
    const msg: Message = { id: uid('msg'), conversationId, senderId: me.id, body: body.trim(), createdAt: now() };
    s.messages.push(msg);
    c.lastMessage = msg.body;
    c.lastMessageAt = msg.createdAt;
    if (me.id === c.clientId) c.clientName = me.name;     // a guest may have typed their name
    const other = me.id === c.clientId ? c.masterUserId : c.clientId;
    c.unreadFor = [...new Set([...c.unreadFor.filter((x) => x !== me.id), other])];
    save(s);
    fire('chat');
    return msg;
  }

  async markRead(conversationId: ID) {
    const s = load();
    const c = s.conversations.find((x) => x.id === conversationId);
    const me = chatMe(s).id;
    if (!c || !c.unreadFor.includes(me)) return;
    c.unreadFor = c.unreadFor.filter((x) => x !== me);
    save(s);
    fire('chat');
  }

  subscribe(topic: Topic, cb: () => void): Unsubscribe {
    if (!listeners.has(topic)) listeners.set(topic, new Set());
    listeners.get(topic)!.add(cb);
    return () => listeners.get(topic)!.delete(cb);
  }
}
