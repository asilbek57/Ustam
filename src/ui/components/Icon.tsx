/**
 * Minimal line-icon set (1.5px strokes, 24×24 grid), drawn for Ustam.
 * Usage: <Icon name="search" size={18} />
 */
const P: Record<string, string> = {
  // categories
  plumbing: 'M3 9h10a4 4 0 0 1 4 4v1M8 9V5M5 5h6M15 14h4M17 18.5c0 1 .7 1.8 1.5 1.8s1.5-.8 1.5-1.8c0-1-1.5-2.8-1.5-2.8S17 17.5 17 18.5Z',
  electrical: 'M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z',
  appliances: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 8h16M7 5.5h1M10 5.5h1M12 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM10 15.2c1.2-.8 2.8.8 4 0',
  furniture: 'M6 11V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5M4 11a2 2 0 0 1 2 2v2h12v-2a2 2 0 1 1 4 0v4H2v-4a2 2 0 0 1 2-2ZM5 17v3M19 17v3',
  finishing: 'M4 4h13a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM18 6.5h2a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-8v3M10.5 15h3v6h-3z',
  minor: 'M14.5 4.5a3.5 3.5 0 0 0-4.6 4.4L3.5 15.3a1.8 1.8 0 0 0 2.5 2.6l6.4-6.4a3.5 3.5 0 0 0 4.4-4.6l-2.1 2.1-2.1-.6-.6-2.1 2.5-1.8Z',
  'air-conditioners': 'M3 5h18v7H3zM6 9h12M7 15v2M12 15v4M17 15v2',
  'washing-machines': 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 8h16M7 5.5h1M10 5.5h1M12 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM10 15.2c1.2-.8 2.8.8 4 0',
  refrigerators: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM5 10h14M8 5v2M8 13v3',
  dishwashers: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 7h16M7 5h.01M10 5h.01M8 11v6M12 11v6M16 11v6',
  tvs: 'M3 5h18v12H3zM8 21h8M12 17v4',
  stoves: 'M4 3h16v18H4zM4 8h16M8 5.5h.01M12 5.5h.01M16 5.5h.01M8 12h8v6H8z',
  microwaves: 'M2 5h20v14H2zM5 8h10v8H5zM18 9h1M18 12h1M18 15h1',
  handyman: 'M14.5 4.5a3.5 3.5 0 0 0-4.6 4.4L3.5 15.3a1.8 1.8 0 0 0 2.5 2.6l6.4-6.4a3.5 3.5 0 0 0 4.4-4.6l-2.1 2.1-2.1-.6-.6-2.1 2.5-1.8Z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  bolt: 'M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z',
  // ui
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17l9-10',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2L12 8.5Z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  home: 'M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  workshop: 'M3 20h18M4 20V9l5 3V9l5 3V6l6 3v11M8 16h1M12 16h1M16 16h1',
  chat: 'M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12Z',
  send: 'M5 12h13M12 5l7 7-7 7',
  shield: 'M12 3 5 6v5.5c0 4.3 3 7.9 7 9.5 4-1.6 7-5.2 7-9.5V6l-7-3ZM9 12l2 2 4-4',
  up: 'M4 17l6-6 4 4 6-7M14 8h6v6',
  down: 'M4 7l6 6 4-4 6 7M14 16h6v-6',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  tag: 'M3 12V4h8l9 9-8 8-9-9ZM7.5 7.5h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z',
  chevron: 'M9 6l6 6-6 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
};

export function Icon({ name, size = 20, stroke = 1.5, fill = false, className }: {
  name: keyof typeof P | string;
  size?: number;
  stroke?: number;
  fill?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[name] ?? P.minor} />
    </svg>
  );
}
