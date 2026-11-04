import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { buildSections, type IcMemoBuilderProps, type MemoSection, type SectionId } from './IcMemoBuilder';
import { getSnapshotDataStatus, DATA_MODE_LABEL } from '../utils/dataStatus';

/**
 * Present mode: the current country and book as full-screen slides for a meeting.
 * Same content as the IC memo, in large type. Arrow keys or the buttons move between
 * slides; Esc leaves. Each slide keeps the data-status line so nobody presents sample
 * numbers as live.
 */

interface PresentModeProps extends IcMemoBuilderProps {
  onClose: () => void;
}

const ALL_ON: Record<SectionId, boolean> = {
  recommendation: true,
  figures: true,
  thesis: true,
  trades: true,
  portfolio: true,
  risks: true,
  calendar: true,
  sources: true,
};

/** **bold** to <strong>, everything else as text. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

function FiguresSlide({ section }: { section: MemoSection }) {
  const stats = section.lines.map((l) => {
    const m = l.replace(/^- /, '').match(/^([^:]+):\s*(.+?)(\s*\((.+)\))?$/);
    return m ? { label: m[1], value: m[2], note: m[4] } : { label: '', value: l, note: undefined };
  });
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-lg text-slate-500 dark:text-slate-400">{s.label}</div>
          <div className="text-5xl font-semibold text-slate-900 dark:text-white ui-num mt-1">{s.value}</div>
          {s.note && <div className="text-base text-amber-700 dark:text-amber-300 mt-1">{s.note}</div>}
        </div>
      ))}
    </div>
  );
}

function TextSlide({ section }: { section: MemoSection }) {
  const paras = section.lines.filter((l) => !l.startsWith('- '));
  const bullets = section.lines.filter((l) => l.startsWith('- ')).slice(0, 6);
  return (
    <div className="space-y-5 max-w-5xl">
      {paras.slice(0, 2).map((p, i) => (
        <p key={i} className={`${paras.length === 1 && !bullets.length ? 'text-3xl' : 'text-2xl'} leading-snug text-slate-800 dark:text-slate-100`}>
          <Inline text={p.length > 420 ? `${p.slice(0, 417).trimEnd()}…` : p} />
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="space-y-3 list-disc pl-7">
          {bullets.map((b, i) => (
            <li key={i} className="text-xl leading-snug text-slate-800 dark:text-slate-100">
              <Inline text={b.slice(2).length > 220 ? `${b.slice(2, 217).trimEnd()}…` : b.slice(2)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const PresentMode: React.FC<PresentModeProps> = ({ onClose, ...props }) => {
  const { run } = props;
  const sections = useMemo(() => buildSections(props, ALL_ON, 'country'), [props]);
  const status = getSnapshotDataStatus(run.openData);
  const slides = useMemo(
    () => [{ id: 'title' as const }, ...sections.filter((s) => s.id !== 'sources').map((s) => ({ id: s.id, section: s }))],
    [sections]
  );
  const [i, setI] = useState(0);
  const last = slides.length - 1;

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setI((v) => Math.min(last, v + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setI((v) => Math.max(0, v - 1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [last]);

  // Full screen once on open; leaving full screen with the browser's own Esc also closes.
  useEffect(() => {
    let entered = false;
    const onFs = () => {
      if (entered && !document.fullscreenElement) closeRef.current();
    };
    document.documentElement
      .requestFullscreen?.()
      .then(() => {
        entered = true;
      })
      .catch(() => {});
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const slide = slides[i];
  const verdict = sections.find((s) => s.id === 'recommendation')?.lines[0];

  return (
    <div
      className="fixed inset-0 z-[100] bg-white dark:bg-[#0B0F17] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Present mode"
      data-no-stat-ref="true"
      data-no-provenance-overlay="true"
    >
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {run.countryName} · {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-3">
          <span className={status.mode === 'live' ? 'ui-badge ui-badge-positive' : 'ui-badge ui-badge-warning'}>{DATA_MODE_LABEL[status.mode]}</span>
          <button type="button" className="ui-btn" onClick={onClose} aria-label="Leave present mode">
            <X className="w-3.5 h-3.5" /> Esc
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 sm:px-16 py-12 flex flex-col justify-center">
        {slide.id === 'title' ? (
          <div className="space-y-6 max-w-5xl">
            <div className="text-xl text-blue-700 dark:text-blue-300">Investment committee</div>
            <h1 className="text-6xl font-semibold text-slate-900 dark:text-white leading-tight">{run.countryName}</h1>
            {verdict && (
              <p className="text-3xl leading-snug text-slate-700 dark:text-slate-200">
                <Inline text={verdict} />
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <h2 className="text-4xl font-semibold text-slate-900 dark:text-white">{'section' in slide ? slide.section.heading : ''}</h2>
            {'section' in slide &&
              (slide.id === 'figures' ? <FiguresSlide section={slide.section} /> : <TextSlide section={slide.section} />)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-8 py-4 border-t border-slate-200 dark:border-slate-800">
        <button type="button" className="ui-btn" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex items-center gap-1.5" aria-label={`Slide ${i + 1} of ${slides.length}`}>
          {slides.map((s, k) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Go to slide ${k + 1}`}
              className={`w-2.5 h-2.5 rounded-full ${k === i ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            />
          ))}
        </div>
        <button type="button" className="ui-btn ui-btn-primary" onClick={() => setI(Math.min(last, i + 1))} disabled={i === last}>
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
