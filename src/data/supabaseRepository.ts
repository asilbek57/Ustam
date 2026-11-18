/**
 * DATA LAYER — Supabase implementation.
 *  Catalog  : tables from 001_schema.sql (filled by `npm run sql`)
 *  Accounts : Supabase Auth (email + password) + `profiles` (created by a DB
 *             trigger from sign-up metadata, so "Confirm email" can stay on)
 *  Guests   : anonymous sign-in when a visitor writes to a master
 *  Masters  : `master_profiles` (+ Storage bucket "avatars" for photos)
 *  Jobs/Chat: `jobs`, `conversations`, `messages` with Row Level Security
 *  Realtime : postgres_changes subscriptions
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { profileToMaster } from '../domain/masters';
import type {
  Conversation, Database, ID, Job, Master, MasterProfileInput, Message, NewJob, User,
} from '../domain/types';
import { guestName, type Repository, type SignUpInput, type Topic, type Unsubscribe } from './repository';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- row mappers ----------
const toUser = (r: Row): User => ({ id: r.id, role: r.role, name: r.name, email: r.email, phone: r.phone, telegram: r.telegram, createdAt: r.created_at });

const toInput = (r: Row): MasterProfileInput => ({
  name: r.name, title: r.title, bio: r.bio, type: r.type, categoryIds: r.category_ids ?? [], serviceIds: r.service_ids ?? [],
  prices: r.prices ?? [], districts: r.districts ?? [],
  point: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng, label: r.location_label ?? undefined } : null,
  workshopAddress: r.workshop_address, experienceYears: r.experience_years, responseTime: r.response_time,
  phone: r.phone, telegram: r.telegram, photo: r.photo_url, published: r.published,
});
const fromInput = (p: MasterProfileInput) => ({
  name: p.name, title: p.title, bio: p.bio, type: p.type, category_ids: p.categoryIds, service_ids: p.serviceIds,
  prices: p.prices, districts: p.districts, lat: p.point?.lat ?? null, lng: p.point?.lng ?? null,
  location_label: p.point?.label ?? null, workshop_address: p.workshopAddress, experience_years: p.experienceYears,
  response_time: p.responseTime, phone: p.phone, telegram: p.telegram, photo_url: p.photo, published: p.published,
  updated_at: new Date().toISOString(),
});

const toJob = (r: Row): Job => ({
  id: r.id, masterId: r.master_id, masterName: r.master_name, clientId: r.client_id, clientName: r.client_name,
  clientPhone: r.client_phone, categoryId: r.category_id, serviceIds: r.service_ids ?? [], title: r.title,
  description: r.description, district: r.district, address: r.address,
  point: r.lat != null ? { lat: r.lat, lng: r.lng } : null, scheduledAt: r.scheduled_at, visitType: r.visit_type,
  estimateFrom: r.estimate_from, estimateTo: r.estimate_to, price: r.price, partsCost: r.parts_cost,
  paymentMethod: r.payment_method, paid: r.paid, status: r.status, source: r.source,
  createdAt: r.created_at, updatedAt: r.updated_at, completedAt: r.completed_at,
});
const fromJob = (j: Partial<Job>) => {
  const o: Row = {};
  const map: Record<string, string> = {
    masterId: 'master_id', masterName: 'master_name', clientId: 'client_id', clientName: 'client_name', clientPhone: 'client_phone',
    categoryId: 'category_id', serviceIds: 'service_ids', title: 'title', description: 'description', district: 'district',
    address: 'address', scheduledAt: 'scheduled_at', visitType: 'visit_type', estimateFrom: 'estimate_from',
    estimateTo: 'estimate_to', price: 'price', partsCost: 'parts_cost', paymentMethod: 'payment_method', paid: 'paid',
    status: 'status', source: 'source', completedAt: 'completed_at',
  };
  for (const [k, col] of Object.entries(map)) if (k in j) o[col] = (j as Row)[k];
  if ('point' in j) { o.lat = j.point?.lat ?? null; o.lng = j.point?.lng ?? null; }
  return o;
};

const toConv = (r: Row): Conversation => ({
  id: r.id, clientId: r.client_id, clientName: r.client_name, masterUserId: r.master_user_id, masterId: r.master_id,
  masterName: r.master_name, jobId: r.job_id, lastMessage: r.last_message, lastMessageAt: r.last_message_at, unreadFor: r.unread_for ?? [],
});
const toMsg = (r: Row): Message => ({ id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, body: r.body, createdAt: r.created_at });

export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const;
  private catalog: Promise<Database> | null = null;
  constructor(private db: SupabaseClient) {}

  // ---------------- catalog ----------------
  getDatabase() {
    return (this.catalog ??= this.loadCatalog());
  }

  private async loadCatalog(): Promise<Database> {
    const [meta, cats, svcs, masters, links, prices] = (await Promise.all([
      this.db.from('meta').select('*').limit(1),
      this.db.from('categories').select('*').order('sort_order'),
      this.db.from('services').select('*').order('sort_order'),
      this.db.from('masters').select('*').order('sort_order'),
      this.db.from('master_services').select('*'),
      this.db.from('master_prices').select('*'),
    ])).map(unwrap) as Row[][];
    const m0 = meta[0] ?? {};
    return {
      meta: { city: m0.city, currency: m0.currency, currencySymbol: m0.currency_symbol, updatedAt: m0.updated_at, disclaimer: m0.disclaimer },
      districts: m0.districts ?? [],
      categories: cats.map((c) => ({ id: c.id, title: c.title, icon: c.icon, sortOrder: c.sort_order })),
      services: svcs.map((s) => ({
        id: s.id, categoryId: s.category_id, name: s.name, priceFrom: s.price_from, priceTo: s.price_to, unit: s.unit,
        description: s.description, warranty: s.warranty, districts: s.districts ?? [],
        source: { olx: s.source_olx, web: s.source_web, note: s.source_note },
      })),
      masters: masters.map((m): Master => ({
        id: m.id, name: m.name, title: m.title, type: m.type, categoryIds: m.category_ids ?? [], districts: m.districts ?? [],
        location: m.location, experienceYears: m.experience_years, experienceLabel: m.experience_label, responseTime: m.response_time,
        responseMinutes: m.response_minutes, serviceIds: links.filter((l) => l.master_id === m.id).map((l) => l.service_id),
        prices: prices.filter((p) => p.master_id === m.id).map((p) => ({ serviceId: p.service_id, priceFrom: p.price_from, priceTo: p.price_to, source: p.source })),
        url: m.url, olxListingId: m.olx_listing_id, note: m.note, verified: m.verified, phone: m.phone, phoneDisplay: m.phone_display,
        verifiedAt: m.verified_at, rating: null,
      })),
    };
  }

  // ---------------- accounts ----------------
  private async sessionUser() {
    return (await this.db.auth.getSession()).data.session?.user ?? null;
  }

  private async uid(): Promise<string | null> {
    return (await this.sessionUser())?.id ?? null;
  }

  /** Registered account only — an anonymous guest is not "signed in" for the UI. */
  async currentUser() {
    const u = await this.sessionUser();
    if (!u || u.is_anonymous) return null;
    const id = u.id;
    const rows = unwrap(await this.db.from('profiles').select('*').eq('id', id).limit(1));
    return rows[0] ? toUser(rows[0]) : null;
  }

  async signUp(i: SignUpInput) {
    // The profile row is created by the on_auth_user_created trigger from this metadata.
    const { data, error } = await this.db.auth.signUp({
      email: i.email.trim(),
      password: i.password,
      options: { data: { role: i.role, name: i.name.trim(), phone: i.phone.trim() } },
    });
    if (error) {
      if (/registered|exists/i.test(error.message)) throw new Error('auth.err.exists');
      if (/password/i.test(error.message)) throw new Error('auth.err.short');
      throw new Error(error.message);
    }
    if (!data.session) throw new Error('auth.err.confirm');   // "Confirm email" is on: user must click the link
    return (await this.currentUser())!;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error('auth.err.wrong');
    return (await this.currentUser())!;
  }

  async signOut() {
    await this.db.auth.signOut();
  }

  async updateUser(patch: Partial<Pick<User, 'name' | 'phone' | 'telegram'>>) {
    const id = await this.uid();
    return toUser(unwrap(await this.db.from('profiles').update(patch).eq('id', id!).select('*').single()));
  }

  // ---------------- registered masters ----------------
  async getRegisteredMasters() {
    const [rows, cat] = await Promise.all([this.db.from('master_profiles').select('*').eq('published', true), this.getDatabase()]);
    return unwrap(rows).map((r: Row) => profileToMaster(r.id, r.user_id, toInput(r), cat.services));
  }

  async getMyMasterProfile() {
    const id = await this.uid();
    if (!id) return null;
    const rows = unwrap(await this.db.from('master_profiles').select('*').eq('user_id', id).limit(1));
    return rows[0] ? { id: rows[0].id as string, input: toInput(rows[0]) } : null;
  }

  async saveMyMasterProfile(input: MasterProfileInput) {
    const id = await this.uid();
    if (!id) throw new Error('auth.err.required');
    const row = { ...fromInput(input), user_id: id };
    const saved = unwrap(await this.db.from('master_profiles').upsert(row, { onConflict: 'user_id' }).select('id').single());
    await this.db.from('profiles').update({ name: input.name, phone: input.phone, telegram: input.telegram }).eq('id', id);
    return (saved as unknown as Row).id as string;
  }

  async uploadPhoto(file: File) {
    const id = await this.uid();
    const path = `${id}/${Date.now()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
    const { error } = await this.db.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(error.message);
    return this.db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }

  // ---------------- jobs ----------------
  private async masterUserId(masterId: ID): Promise<string | null> {
    const rows = unwrap(await this.db.from('master_profiles').select('user_id').eq('id', masterId).limit(1));
    return rows[0]?.user_id ?? null;
  }

  async createJob(j: NewJob) {
    const row = { ...fromJob(j), master_user_id: await this.masterUserId(j.masterId) };
    return toJob(unwrap(await this.db.from('jobs').insert(row).select('*').single()));
  }

  async updateJob(id: ID, patch: Partial<Job>) {
    const row: Row = { ...fromJob(patch), updated_at: new Date().toISOString() };
    if (patch.status === 'done') row.completed_at = new Date().toISOString();
    return toJob(unwrap(await this.db.from('jobs').update(row).eq('id', id).select('*').single()));
  }

  async deleteJob(id: ID) {
    unwrap(await this.db.from('jobs').delete().eq('id', id));
  }

  async jobsForMaster(masterId: ID) {
    return unwrap(await this.db.from('jobs').select('*').eq('master_id', masterId).order('created_at', { ascending: false })).map(toJob);
  }

  async jobsForClient(clientId: ID) {
    return unwrap(await this.db.from('jobs').select('*').eq('client_id', clientId).order('created_at', { ascending: false })).map(toJob);
  }

  // ---------------- chat ----------------
  async chatIdentity(create = false) {
    let u = await this.sessionUser();
    if (!u && create) {
      const { data, error } = await this.db.auth.signInAnonymously({ options: { data: { name: guestName() } } });
      if (error || !data.user) throw new Error('chat.err.guest');
      u = data.user;
    }
    if (!u) return null;
    const p = unwrap(await this.db.from('profiles').select('name').eq('id', u.id).limit(1))[0];
    return { id: u.id, name: (p?.name as string) || guestName() || 'Гость' };
  }

  async openConversation({ masterId, jobId = null, firstMessage }: { masterId: ID; jobId?: ID | null; firstMessage?: string }) {
    const me = (await this.chatIdentity(true))!;
    // Registered on Ustam → the master answers from the cabinet.
    // From OLX → master_user_id stays null; the message is kept, the client sees the phone.
    const mp = unwrap(await this.db.from('master_profiles').select('id,user_id,name').eq('id', masterId).limit(1))[0];
    const olx = mp ? null : (await this.getDatabase()).masters.find((m) => m.id === masterId);
    if (!mp && !olx) throw new Error('common.notFound');
    if (mp && mp.user_id === me.id) throw new Error('chat.err.self');
    const existing = unwrap(await this.db.from('conversations').select('*').eq('client_id', me.id).eq('master_id', masterId).limit(1))[0];
    let conv: Conversation;
    if (existing) {
      conv = toConv(jobId ? unwrap(await this.db.from('conversations').update({ job_id: jobId }).eq('id', existing.id).select('*').single()) : existing);
    } else {
      const row = {
        client_id: me.id, client_name: me.name, master_user_id: mp?.user_id ?? null, master_id: masterId,
        master_name: mp?.name ?? olx!.name, job_id: jobId,
      };
      conv = toConv(unwrap(await this.db.from('conversations').insert(row).select('*').single()));
    }
    if (firstMessage) await this.sendMessage(conv.id, firstMessage);
    return conv;
  }

  async listConversations() {
    return unwrap(await this.db.from('conversations').select('*').order('last_message_at', { ascending: false })).map(toConv);
  }

  async listMessages(conversationId: ID) {
    return unwrap(await this.db.from('messages').select('*').eq('conversation_id', conversationId).order('created_at')).map(toMsg);
  }

  async sendMessage(conversationId: ID, body: string) {
    const u = await this.sessionUser();
    if (!u) throw new Error('auth.err.required');
    // A guest may type their name in the chat box: keep it on their profile and the conversation.
    const name = guestName();
    if (u.is_anonymous && name) {
      await this.db.from('profiles').update({ name }).eq('id', u.id);
      await this.db.from('conversations').update({ client_name: name }).eq('id', conversationId).eq('client_id', u.id);
    }
    return toMsg(unwrap(await this.db.from('messages').insert({ conversation_id: conversationId, sender_id: u.id, body: body.trim() }).select('*').single()));
  }

  async markRead(conversationId: ID) {
    await this.db.rpc('mark_read', { conv: conversationId });
  }

  // ---------------- realtime ----------------
  subscribe(topic: Topic, cb: () => void): Unsubscribe {
    if (topic === 'auth') {
      const { data } = this.db.auth.onAuthStateChange(() => cb());
      return () => data.subscription.unsubscribe();
    }
    const tables: Record<Exclude<Topic, 'auth'>, string[]> = {
      masters: ['master_profiles'], jobs: ['jobs'], chat: ['messages', 'conversations'],
    };
    const ch = this.db.channel(`ustam-${topic}-${Math.random().toString(36).slice(2)}`);
    for (const table of tables[topic]) ch.on('postgres_changes' as any, { event: '*', schema: 'public', table }, () => cb());
    ch.subscribe();
    return () => { this.db.removeChannel(ch); };
  }
}
