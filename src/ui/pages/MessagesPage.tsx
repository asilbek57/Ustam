/**
 * Chat between clients and masters: /messages and /messages/:id.
 * Left: conversations (unread dot). Right: the thread, live via subscribe('chat').
 * Works without an account in local mode (guest of this browser).
 */
import { useNavigate, useParams } from 'react-router-dom';
import { getRepo } from '../../data';
import type { Conversation } from '../../domain/types';
import { useChatMe, useLive } from '../../hooks/useDatabase';
import { useAuth } from '../../state/AuthContext';
import { usePrefs } from '../../state/PrefsContext';
import { ChatThread } from '../components/ChatThread';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/primitives';

export function MessagesPage() {
  const { t } = usePrefs();
  const { id } = useParams();
  const nav = useNavigate();
  const { user, ready } = useAuth();
  const me = useChatMe()?.id ?? '';
  const { data: convs } = useLive(async () => (await getRepo()).listConversations(), ['chat', 'auth'], [user?.id]);

  if (!ready) return null;
  const active = convs?.find((c) => c.id === id) ?? null;
  const other = (c: Conversation) => (me === c.clientId ? c.masterName : c.clientName);

  return (
    <div className="container">
      <div className="page-head" style={{ marginBottom: 20 }}><h1 className="h1">{t('msg.title')}</h1></div>
      <div className={active ? 'chat-layout has-thread' : 'chat-layout'}>
        <div className="chat-list">
          {convs && !convs.length && <p className="small muted" style={{ padding: 20 }}>{t('msg.empty')}</p>}
          {convs?.map((c) => (
            <button key={c.id} className={c.id === id ? 'chat-row on' : 'chat-row'} onClick={() => nav(`/messages/${c.id}`)}>
              <Avatar name={other(c)} size={40} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: 'block', fontWeight: 600 }}>{other(c)}</strong>
                <span className="small muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage}</span>
              </span>
              {c.unreadFor.includes(me) && <i className="unread" aria-label="unread" />}
            </button>
          ))}
        </div>
        {active ? <ChatThread conv={active} title={other(active)} onBack={() => nav('/messages')} /> : (
          <div className="thread"><div className="empty" style={{ margin: 'auto' }}><Icon name="chat" size={28} /><p className="muted">{t('msg.pick')}</p></div></div>
        )}
      </div>
      {!user && <p className="small muted" style={{ marginTop: 12 }}>{t('msg.local')}</p>}
    </div>
  );
}
