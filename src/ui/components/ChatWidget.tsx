/**
 * Floating AI assistant (bottom-right). Streams answers token by token and
 * turns the assistant's "actions" into buttons (find a master / master
 * profile / check the price) instead of jumping pages without asking.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { streamChat, type ChatMessage } from '../../services/chat';
import { usePrefs } from '../../state/PrefsContext';
import { Logo } from './Layout';
import { Icon } from './Icon';

interface Msg extends ChatMessage {
  actions?: string[];
  streaming?: boolean;
  error?: boolean;
}

export function ChatWidget() {
  const { t, district, lang } = usePrefs();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(content: string) {
    const q = content.trim();
    if (!q || busy) return;
    const history: ChatMessage[] = [...msgs.filter((m) => !m.error).map(({ role, content }) => ({ role, content })), { role: 'user', content: q }];
    setMsgs((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '', streaming: true, actions: [] }]);
    setText('');
    setBusy(true);
    const patchLast = (fn: (m: Msg) => Msg) => setMsgs((list) => list.map((m, i) => (i === list.length - 1 ? fn(m) : m)));
    abortRef.current = new AbortController();
    await streamChat(history, {
      onToken: (tok) => patchLast((m) => ({ ...m, content: m.content + tok })),
      onAction: (path) => patchLast((m) => ({ ...m, actions: [...(m.actions ?? []), path] })),
      onDone: () => patchLast((m) => ({ ...m, streaming: false })),
      onError: () => patchLast((m) => ({ ...m, streaming: false, error: true, content: m.content || t('chat.error') })),
    }, { district, lang }, abortRef.current.signal);
    setBusy(false);
  }

  const actionLabel = (p: string) =>
    p.startsWith('/check') ? t('chat.check') : p.startsWith('/c/') ? t('chat.book') : p.startsWith('/master/') ? t('chat.master') : t('chat.open');
  const lifted = pathname.startsWith('/c/');

  // The AI button would cover the message box / cabinet forms there.
  if (!open && (pathname.startsWith('/messages') || pathname.startsWith('/pro') || pathname.startsWith('/auth'))) return null;
  if (!open) {
    return (
      <button className={lifted ? 'chat-fab lifted' : 'chat-fab'} onClick={() => setOpen(true)} aria-label={t('chat.title')}>
        <Icon name="spark" size={18} /><span>{t('chat.title')}</span>
      </button>
    );
  }

  return (
    <div className="chat-panel" role="dialog" aria-label={t('chat.title')}>
      <div className="chat-head">
        <Logo />
        <div className="small muted" style={{ lineHeight: 1.3 }}>{t('chat.sub')}</div>
        <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)} aria-label={t('common.close')}><Icon name="x" size={18} /></button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        <div className="bubble bot">{t('chat.hello')}</div>
        {msgs.length === 0 && (
          <div className="chat-quick">
            {(['chat.q1', 'chat.q2', 'chat.q3'] as const).map((k) => (
              <button key={k} className="chip" onClick={() => send(t(k))}>{t(k)}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className={`bubble ${m.role === 'user' ? 'me' : 'bot'}${m.streaming ? ' typing' : ''}`}>{m.content}</div>
            {!!m.actions?.length && (
              <div className="chat-actions">
                {[...new Set(m.actions)].map((p, k) => (
                  <button key={p} className={k === 0 ? 'btn sm' : 'btn ghost sm'} onClick={() => { navigate(p); setOpen(false); }}>
                    {actionLabel(p)} <Icon name="arrow" size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <textarea rows={1} value={text} placeholder={t('chat.placeholder')} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} autoFocus />
        <button className="btn" type="submit" disabled={!text.trim() || busy} aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </div>
  );
}
