/**
 * Map of Tashkent.
 *  - With VITE_YANDEX_MAPS_KEY: real Yandex Maps (JS API v3), markers and click-to-pick.
 *  - Without a key (or if Yandex can't load): a fast schematic SVG map of the
 *    13 districts with the same features, so the site always works.
 * Get a free key: https://developer.tech.yandex.ru → "JavaScript API и HTTP Геокодер".
 */
import { useEffect, useRef, useState } from 'react';
import { DISTRICT_CENTERS, TASHKENT_BOUNDS, TASHKENT_CENTER, nearestDistrict } from '../../domain/geo';
import type { GeoPoint } from '../../domain/types';
import { usePrefs } from '../../state/PrefsContext';
import { Modal } from './primitives';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: 'olx' | 'ustam' | 'you';
}

interface Props {
  points?: MapPoint[];
  you?: GeoPoint | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onPick?: (p: GeoPoint) => void;   // enables click-to-set-point
  height?: number;
}

const KEY = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined;

// ---------------------------------------------------------------------------
// Yandex Maps loader (once per page)
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
let ymapsPromise: Promise<any> | null = null;
function loadYandex(lang: string): Promise<any> {
  if (!KEY) return Promise.reject(new Error('no key'));
  return (ymapsPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://api-maps.yandex.ru/v3/?apikey=${KEY}&lang=${lang === 'uz' ? 'uz_UZ' : lang === 'en' ? 'en_US' : 'ru_RU'}`;
    s.onload = () => (window as any).ymaps3.ready.then(() => resolve((window as any).ymaps3), reject);
    s.onerror = reject;
    document.head.appendChild(s);
  }));
}

function pinElement(kind: MapPoint['kind'], label: string, selected: boolean) {
  const el = document.createElement('div');
  el.className = `ymap-pin ${kind} ${selected ? 'sel' : ''}`;
  el.title = label;
  el.innerHTML = `<span></span>`;
  return el;
}

function YandexMap({ points = [], you, selectedId, onSelect, onPick, height = 420, onFail }: Props & { onFail: () => void }) {
  const { lang } = usePrefs();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;
    loadYandex(lang).then((y) => {
      if (destroyed || !box.current) return;
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = y;
      map.current = new YMap(box.current, { location: { center: [TASHKENT_CENTER.lng, TASHKENT_CENTER.lat], zoom: 11.5 } });
      map.current.addChild(new YMapDefaultSchemeLayer());
      map.current.addChild(new YMapDefaultFeaturesLayer());
      if (onPick) {
        map.current.addChild(new YMapListener({
          layer: 'any',
          onClick: (_o: unknown, e: any) => { const [lng, lat] = e.coordinates; onPick({ lat, lng, label: nearestDistrict({ lat, lng }) }); },
        }));
      }
      setReady(true);
    }).catch(onFail);
    return () => { destroyed = true; map.current?.destroy?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (re)draw markers
  useEffect(() => {
    if (!ready) return;
    const y = (window as any).ymaps3;
    layer.current.forEach((m) => map.current.removeChild(m));
    layer.current = [];
    const all = [...points, ...(you ? [{ id: '__you', lat: you.lat, lng: you.lng, label: 'you', kind: 'you' as const }] : [])];
    for (const p of all) {
      const el = pinElement(p.kind, p.label, p.id === selectedId);
      if (onSelect && p.kind !== 'you') el.onclick = (ev) => { ev.stopPropagation(); onSelect(p.id); };
      const m = new y.YMapMarker({ coordinates: [p.lng, p.lat] }, el);
      map.current.addChild(m);
      layer.current.push(m);
    }
  }, [ready, points, you, selectedId, onSelect]);

  return <div ref={box} className="map-box" style={{ height }} />;
}

// ---------------------------------------------------------------------------
// Schematic SVG map (no key needed)
// ---------------------------------------------------------------------------
const W = 800, H = 560;
const { minLat, maxLat, minLng, maxLng } = TASHKENT_BOUNDS;
const toXY = (p: GeoPoint) => ({ x: ((p.lng - minLng) / (maxLng - minLng)) * W, y: (1 - (p.lat - minLat) / (maxLat - minLat)) * H });
const fromXY = (x: number, y: number): GeoPoint => ({ lng: minLng + (x / W) * (maxLng - minLng), lat: minLat + (1 - y / H) * (maxLat - minLat) });

function SchemeMap({ points = [], you, selectedId, onSelect, onPick, height = 420 }: Props) {
  const { tc, t } = usePrefs();
  const svg = useRef<SVGSVGElement>(null);
  const c = toXY(TASHKENT_CENTER);

  function click(e: React.MouseEvent<SVGSVGElement>) {
    if (!onPick || !svg.current) return;
    const pt = svg.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const loc = pt.matrixTransform(svg.current.getScreenCTM()!.inverse());
    const g = fromXY(loc.x, loc.y);
    onPick({ ...g, label: nearestDistrict(g) });
  }

  return (
    <div className="map-box scheme" style={{ aspectRatio: `${W} / ${H}`, maxHeight: Math.max(height, 260) * 1.6 }}>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" onClick={click} style={{ cursor: onPick ? 'crosshair' : 'default' }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" className="map-grid" /></pattern>
        </defs>
        <rect width={W} height={H} className="map-bg" />
        <rect width={W} height={H} fill="url(#grid)" />
        {/* ring roads and the Ankhor canal, stylised */}
        <ellipse cx={c.x} cy={c.y} rx={150} ry={120} className="map-road" />
        <ellipse cx={c.x} cy={c.y} rx={300} ry={235} className="map-road thin" />
        <path d={`M ${c.x - 330} ${c.y - 40} C ${c.x - 120} ${c.y - 120}, ${c.x + 40} ${c.y + 60}, ${c.x + 330} ${c.y - 10}`} className="map-water" />
        {Object.entries(DISTRICT_CENTERS).map(([name, p]) => {
          const { x, y } = toXY(p);
          return (
            <g key={name}>
              <circle cx={x} cy={y} r={34} className="map-district" />
              <text x={x} y={y + 4} textAnchor="middle" className="map-label">{tc(name).replace(/(ский|ий)$/, '')}</text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const { x, y } = toXY(p);
          const sel = p.id === selectedId;
          return (
            <g key={p.id} transform={`translate(${x} ${y})`} className="map-pin-g" onClick={(e) => { e.stopPropagation(); onSelect?.(p.id); }}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}>
              <g className="pin-drop" style={{ animationDelay: `${i * 40}ms` }}>
                <path d="M0 0 C -9 -12, -12 -18, -12 -24 A 12 12 0 1 1 12 -24 C 12 -18, 9 -12, 0 0 Z" className={`map-pin ${p.kind} ${sel ? 'sel' : ''}`} />
                <circle cx={0} cy={-24} r={4.5} className="map-pin-dot" />
              </g>
              {sel && <text y={-44} textAnchor="middle" className="map-tip">{p.label.length > 34 ? p.label.slice(0, 33) + '…' : p.label}</text>}
            </g>
          );
        })}
        {you && (() => {
          const { x, y } = toXY(you);
          return (
            <g transform={`translate(${x} ${y})`}>
              <circle r={10} className="map-you-pulse pulse" />
              <circle r={8} className="map-you" />
              <text y={-16} textAnchor="middle" className="map-tip">{t('map.you')}</text>
            </g>
          );
        })()}
      </svg>
      <div className="map-note">{t('map.schematic')}</div>
    </div>
  );
}

/** Real Yandex map if a key is configured, otherwise the schematic map. */
export function MapView(props: Props) {
  const [fallback, setFallback] = useState(!KEY);
  return fallback ? <SchemeMap {...props} /> : <YandexMap {...props} onFail={() => setFallback(true)} />;
}

/** Modal to choose a point (client address or master's workshop). */
export function MapPicker({ open, title, value, onClose, onSave }: {
  open: boolean; title: string; value: GeoPoint | null; onClose: () => void; onSave: (p: GeoPoint) => void;
}) {
  const { t, tc } = usePrefs();
  const [p, setP] = useState<GeoPoint | null>(value);
  useEffect(() => { if (open) setP(value); }, [open, value]);
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<button className="btn lg" disabled={!p} onClick={() => p && onSave(p)}>{t('common.save')}</button>}>
      <p className="small muted" style={{ marginBottom: 12 }}>{p?.label ? t('map.near', { d: tc(p.label) }) : t('map.pickHint')}</p>
      <MapView you={p} onPick={setP} height={360} />
    </Modal>
  );
}
