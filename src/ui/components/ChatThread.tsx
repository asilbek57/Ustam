/**
 * Chat UI shared by the Messages page and the in-page chat drawer.
 *  - ChatThread: one conversation (live via subscribe('chat')).
 *  - ChatDrawer: slides in on a master's page; opens/reuses the conversation
 *    with that master, so a customer can write without leaving the page.
 * Local mode: a visitor without an account chats as a guest of this browser.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { getRepo } from '../../data';
import { GUEST_NAME_KEY } from '../../data/repository';
import type { Conversation, Master } from '../../domain/types';
import type { Key } from '../../i18n/dictionary';
import { useChatMe, useDatabase, useLive } from '../../hooks/useDatabase';
import { useAuth } from '../../state/AuthContext';
import { usePrefs } from '../../state/PrefsContext';
import { Icon } from './Icon';
import { Avatar } from './primitives';

export function ChatThread({ conv, title, onBack, onClose }: { conv: Conversation; title: string; onBack?: () => void; onClose?: () => void }) {
  const { t, tc } = usePrefs();
  const { user } = useAuth();
  const { db } = useDatabase();
  const me = useChatMe()?.id ?? '';
  const [text, setText] = useState('');
  const [guestName, setGuestName] = useState(() => { try { return localStorage.getItem(GUEST_NAME_KEY) || ''; } catch { return ''; } });
  const body = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const { data: msgs } = useLive(async () => (await getRepo()).listMessages(conv.id), ['chat'], [conv.id]);
  const isMaster = me === conv.masterUserId;
  const master = db?.masters.find((m) => m.id === conv.masterId);
  const offline = conv.masterUserId.startsWith('olx:');

  // read receipts + scroll to the newest message
  useEffect(() => {
    if (conv.unreadFor.includes(me)) getRepo().then((r) => r.markRead(conv.id));
  }, [conv, me]);
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' });
  }, [msgs?.length]);
  useEffect(() => { if (onClose) input.current?.focus(); }, [onClose]);

  async function send(v = text.trim()) {
    if (!v) return;
    setText('');
    if (!user) { try { localStorage.setItem(GUEST_NAME_KEY, guestName.trim()); } catch { /* ignore */ } }
    await (await getRepo()).sendMessage(conv.id, v);
  }

  return (
    <div className="thread">
      <div className="thread-head">
        {onBack && <button className="icon-btn mobile-only" onClick={onBack} aria-label={t('common.back')}><Icon name="back" size={18} /></button>}
        <Avatar name={title} size={36} photo={isMaster ? null : master?.photo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</strong>
          {!isMaster && master && <div className="small muted">{master.registered ? t('m.onUstam') : master.categoryIds.map((c) => tc(c, db?.categories.find((x) => x.id === c)?.title ?? c)).join(', ')}</div>}
        </div>
        {!onClose && !isMaster && master && <Link to={`/master/${master.id}`} className="btn ghost sm">{t('m.profile')}</Link>}
        {isMaster && conv.jobId && <Link to="/pro/orders" className="btn ghost sm">{t('msg.order')}</Link>}
        {!isMaster && master?.phone && <a className="icon-btn" href={`tel:${master.phone}`} aria-label={master.phoneDisplay ?? ''}><Icon name="phone" size={17} /></a>}
        {onClose && <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}><Icon name="x" size={18} /></button>}
      </div>

      <div className="thread-body" ref={body}>
        {offline && !isMaster && master && (
          <div className="thread-note small">
            {master.phoneDisplay ? t('msg.offline', { name: master.name, phone: master.phoneDisplay }) : t('msg.offlineNoPhone', { name: master.name })}
          </div>
        )}
        {msgs && msgs.length === 0 && !isMaster && (
          <button className="chip" style={{ alignSelf: 'center', marginTop: 'auto' }} onClick={() => send(t('msg.hello'))}>{t('msg.hello')}</button>
        )}
        {msgs?.map((m) => (
          <div key={m.id} className={m.senderId === me ? 'bubble me msg-in' : 'bubble bot msg-in'}>
            {m.body}
            <time>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          </div>
        ))}
      </div>

      {!user && !isMaster && (
        <input className="guest-name" value={guestName} placeholder={t('msg.guestName')} onChange={(e) => setGuestName(e.target.value)} />
      )}
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea ref={input} rows={1} value={text} placeholder={t('msg.placeholder')} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn" type="submit" aria-label={t('co.send')} disabled={!text.trim()}><Icon name="send" size={18} /></button>
      </form>
    </div>
  );
}

/** Slide-in chat with one master, opened from the master's card or profile. */
export function ChatDrawer({ master, open, onClose }: { master: Master; open: boolean; onClose: () => void }) {
  const { t } = usePrefs();
  const nav = useNavigate();
  const [convId, setConvId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { data: convs } = useLive(async () => (await getRepo()).listConversations(), ['chat'], []);
  const conv = convs?.find((c) => c.id === convId) ?? null;

  useEffect(() => {
    if (!open || convId) return;
    getRepo().then((r) => r.openConversation({ masterId: master.id }))
      .then((c) => setConvId(c.id))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [open, convId, master.id]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;
  // Portal: cards use transforms (motion), which would trap a fixed element.
  return createPortal(
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="chat-drawer" role="dialog" aria-label={t('msg.write')} onClick={(e) => e.stopPropagation()}>
        {conv ? <ChatThread conv={conv} title={master.name} onClose={onClose} /> : (
          <div className="thread"><div className="empty" style={{ margin: 'auto' }}>
            {err ? <p className="error">{t(err as Key)}</p> : <p className="muted">…</p>}
          </div></div>
        )}
        <div className="drawer-foot small muted">
          <span>{t('msg.local')}</span>
          <button className="link" onClick={() => nav(conv ? `/messages/${conv.id}` : '/messages')}>{t('msg.all')}</button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
