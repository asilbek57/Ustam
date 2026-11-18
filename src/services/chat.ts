/**
 * APPLICATION LAYER — AI chat client.
 *
 * 1. Tries the chat server (POST /api/chat, Server-Sent Events): a real LLM
 *    with tool calling over servicesDatabase + live OLX.uz search (server/).
 * 2. If the server is not running, answers ON-DEVICE from the same database
 *    with the shared matcher, so the assistant always works.
 *
 * Events: token (text chunk) · action (path to open) · done · error
 */
import { detectLang, matchDistrict, matchServices } from '../../shared/matcher.js';
import { formatNumber } from '../../shared/stats.js';
import { tr } from '../../shared/catalogI18n.js';
import { getRepo } from '../data';
import { bestOption } from '../domain/recommendation';
import { LANG_INDEX, type Lang } from '../i18n/dictionary';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHandlers {
  onToken: (text: string) => void;
  onAction: (path: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

const CHAT_URL = import.meta.env.VITE_CHAT_API || '/api/chat';

export async function streamChat(messages: ChatMessage[], h: ChatHandlers, ctx: { district: string; lang: Lang }, signal?: AbortSignal) {
  let res: Response | null = null;
  try {
    res = await fetch(CHAT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }), signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
  }
  const isStream = res?.ok && res.body && (res.headers.get('content-type') ?? '').includes('text/event-stream');
  if (!res || !isStream) return localAssistant(messages, h, ctx); // no server → on-device

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      try {
        const ev = JSON.parse(line.slice(5).trim());
        if (ev.type === 'token') h.onToken(ev.text);
        else if (ev.type === 'action') h.onAction(ev.path);
        else if (ev.type === 'done') { finished = true; h.onDone(); }
        else if (ev.type === 'error') { finished = true; h.onError(ev.message); }
      } catch {
        /* skip malformed frame */
      }
    }
  }
  if (!finished) h.onDone();
}

// ---------------------------------------------------------------------------
// On-device assistant (no server, no key) — answers only from servicesDatabase
// ---------------------------------------------------------------------------
const TXT = {
  hello: ['Hi! Tell me what is broken, or ask how much a repair costs.', 'Здравствуйте! Расскажите, что сломалось, или спросите, сколько стоит ремонт.', 'Salom! Nima buzilganini yozing yoki taʼmir narxini soʻrang.'],
  thanks: ['Happy to help!', 'Всегда рад помочь!', 'Yordam berganimdan xursandman!'],
  found: ['That sounds like “{s}”.', 'Похоже, это «{s}».', 'Bu «{s}» ga oʻxshaydi.'],
  price: ['On OLX.uz in Tashkent it costs {p} ({u}).', 'По объявлениям OLX.uz в Ташкенте: {p} ({u}).', 'Toshkent OLX.uz eʼlonlarida: {p} ({u}).'],
  master: ['Best match: {m}{x}.', 'Лучший вариант: {m}{x}.', 'Eng mos: {m}{x}.'],
  phone: [', phone confirmed {p}', ', проверенный телефон {p}', ', tasdiqlangan telefon {p}'],
  olx: ['Live OLX.uz search works when the Ustam server is running (npm run dev:all). Here is what our database says.', 'Живой поиск по OLX.uz работает, когда запущен сервер (npm run dev:all). Пока — данные нашей базы.', 'Jonli OLX.uz qidiruvi server ishlaganda ishlaydi (npm run dev:all). Hozircha — bazamiz maʼlumotlari.'],
  unknown: ['I didn’t quite get it. Name the appliance and the problem — e.g. “the fridge isn’t freezing”.', 'Не совсем понял. Назовите технику и проблему — например, «холодильник не морозит».', 'Toʻliq tushunmadim. Texnika va muammoni yozing — masalan, «muzlatkich sovutmayapti».'],
} as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function stream(text: string, h: ChatHandlers) {
  for (const tok of text.match(/\S+\s*/g) ?? [text]) {
    h.onToken(tok);
    await sleep(14);
  }
}

async function localAssistant(messages: ChatMessage[], h: ChatHandlers, ctx: { district: string; lang: Lang }) {
  try {
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const lang = detectLang(last) as Lang;
    const i = LANG_INDEX[lang];
    const fill = (s: string, p: Record<string, string | number>) => Object.entries(p).reduce((a, [k, v]) => a.split(`{${k}}`).join(String(v)), s);
    const t = last.toLowerCase().trim();
    const cur = ['sum', 'сум', "so'm"][i];

    if (t.length < 40 && /^(привет|здравствуй|салом|салам|assalom|salom|hi\b|hello|hey|добрый)/i.test(t)) { await stream(TXT.hello[i], h); return h.onDone(); }
    if (t.length < 40 && /(спасибо|рахмат|rahmat|thank)/i.test(t)) { await stream(TXT.thanks[i], h); return h.onDone(); }

    const db = await (await getRepo()).getDatabase();
    const allUser = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' \n ');
    const id = matchServices(last, db.services)[0] ?? matchServices(allUser, db.services)[0];
    const district = matchDistrict(last, db.districts) ?? matchDistrict(allUser, db.districts) ?? (ctx.district || null);

    if (/olx/i.test(t)) await stream(TXT.olx[i] + '\n\n', h);
    if (!id) { await stream(TXT.unknown[i], h); return h.onDone(); }

    const s = db.services.find((x) => x.id === id)!;
    const range = s.priceTo != null
      ? `${formatNumber(s.priceFrom)} – ${formatNumber(s.priceTo)} ${cur}`
      : i === 2 ? `${formatNumber(s.priceFrom)} ${cur}dan` : `${['from', 'от'][i]} ${formatNumber(s.priceFrom)} ${cur}`;
    let reply = fill(TXT.found[i], { s: tr(s.id, lang, s.name) }) + ' ' + fill(TXT.price[i], { p: range, u: s.unit === 'от' ? '' : tr(s.unit, lang, s.unit) }).replace(' ()', '');
    const best = bestOption(db.masters, db.services, [id], district);
    if (best) reply += ' ' + fill(TXT.master[i], { m: best.master.name, x: best.master.phoneDisplay ? fill(TXT.phone[i], { p: best.master.phoneDisplay }) : '' });
    await stream(reply, h);

    h.onAction(`/c/${s.categoryId}?svc=${encodeURIComponent(s.id)}`);
    if (best) h.onAction(`/master/${best.master.id}`);
    h.onAction(`/check?service=${encodeURIComponent(s.id)}`);
    h.onDone();
  } catch (e) {
    h.onError(String((e as Error).message ?? e));
  }
}
