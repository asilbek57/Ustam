/**
 * Motion design helpers (no animation library — tiny and fast).
 *  <Reveal>      fades/slides content in when it scrolls into view
 *  <Stagger>     children appear one after another
 *  <CountUp>     numbers count up when visible
 *  <SplitLines>  hero headline: each line rises from a mask
 * Everything respects "prefers-reduced-motion".
 */
import { Children, cloneElement, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { formatNumber } from '../../../shared/stats.js';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** true once the element has been at least partly visible */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (reduced() || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold]);
  return { ref, inView };
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', style }: {
  children: ReactNode; delay?: number; as?: 'div' | 'section'; className?: string; style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag ref={ref} className={`reveal ${inView ? 'in' : ''} ${className}`} style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/** Adds a staggered entrance to each child (uses CSS var --i). */
export function Stagger({ children, className = '', step = 60 }: { children: ReactNode; className?: string; step?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.08);
  return (
    <div ref={ref} className={`stagger ${inView ? 'in' : ''} ${className}`}>
      {Children.map(children, (c, i) =>
        isValidElement(c) ? cloneElement(c as ReactElement<{ style?: React.CSSProperties }>, {
          style: { ...((c as ReactElement<{ style?: React.CSSProperties }>).props.style ?? {}), ['--d' as string]: `${i * step}ms` },
        }) : c,
      )}
    </div>
  );
}

export function CountUp({ value, duration = 1100, format = formatNumber }: { value: number; duration?: number; format?: (n: number) => string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced()) { setN(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return <span ref={ref} className="num">{format(n)}</span>;
}

/** Each line slides up from behind a mask, one after another. */
export function SplitLines({ lines, accentLast = true }: { lines: string[]; accentLast?: boolean }) {
  return (
    <>
      {lines.map((l, i) => (
        <span key={i} className="line-mask">
          <span className="line-in" style={{ animationDelay: `${120 + i * 110}ms` }}>
            {accentLast && i === lines.length - 1 ? <em>{l}</em> : l}
          </span>
        </span>
      ))}
    </>
  );
}
