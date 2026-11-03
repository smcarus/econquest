import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Pin, Copy, Check, X, Sigma } from 'lucide-react';
import { resolveStatRefDefinition } from '../utils/statisticalReferenceRegistry';

export interface StatRefBadgeProps {
  refText: string;
  variant?: 'block' | 'inline';
  className?: string;
}

export const StatRefBadge: React.FC<StatRefBadgeProps> = ({
  refText,
  variant = 'block',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  }>({ top: 0, left: 0, placement: 'top' });

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const isOpen = isHovered || isPinned;
  const resolved = resolveStatRefDefinition(refText);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(480, window.innerWidth - 24);
    const estimatedHeight = 430;

    // Horizontal clamping inside viewport
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 12) left = 12;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    // Vertical flip if not enough space above
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'top' | 'bottom' =
      spaceAbove >= estimatedHeight || spaceAbove >= spaceBelow ? 'top' : 'bottom';

    const top = placement === 'top' ? Math.max(12, rect.top - 10) : rect.bottom + 10;

    setCoords({ top, left, placement });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Outside click and Escape key handling when pinned or open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPinned(false);
        setIsHovered(false);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsPinned(false);
        setIsHovered(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleMouseEnterTrigger = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (isPinned || isHovered) return;
    openTimerRef.current = window.setTimeout(() => {
      updatePosition();
      setIsHovered(true);
    }, 140);
  };

  const handleMouseLeaveTrigger = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (isPinned) return;
    closeTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 220);
  };

  const handleMouseEnterPopover = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMouseLeavePopover = () => {
    if (isPinned) return;
    closeTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setIsPinned((prev) => {
      const next = !prev;
      if (next) setIsHovered(true);
      return next;
    });
  };

  const handleCopyCitation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formattedCitation = [
      `${resolved.title} (${resolved.categoryLabel})`,
      `Formula: ${resolved.formulaMono}`,
      `Active Telemetry: ${refText}`,
      `Source Citation: ${resolved.primarySourceCitation}`,
    ].join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(formattedCitation).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const triggerClasses =
    variant === 'inline'
      ? `inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 text-[11px] font-mono tabular-nums border transition-colors cursor-pointer select-none align-baseline ${
          isPinned
            ? 'bg-blue-100 dark:bg-blue-950/90 border-blue-500 text-blue-800 dark:text-blue-200 font-semibold'
            : 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
        } ${className}`
      : `group inline-flex flex-wrap items-center justify-between gap-2 w-full px-2.5 py-1.5 text-[11px] font-mono tabular-nums border transition-colors cursor-pointer select-none ${
          isPinned
            ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 text-blue-800 dark:text-blue-200'
            : 'bg-slate-50/90 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-slate-900'
        } ${className}`;

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        title="Hover for mathematical definition & source citation · Click to pin"
        onMouseEnter={handleMouseEnterTrigger}
        onMouseLeave={handleMouseLeaveTrigger}
        onClick={handleTogglePin}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTogglePin(e as unknown as React.MouseEvent);
          }
        }}
        className={triggerClasses}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Sigma className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="underline decoration-dotted decoration-slate-400 dark:decoration-slate-500 underline-offset-2 break-words">
            {refText}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-blue-600 dark:text-blue-400 shrink-0 opacity-85 group-hover:opacity-100">
          {isPinned ? (
            <>
              <Pin className="w-2.5 h-2.5 fill-current" />
              <span>PINNED</span>
            </>
          ) : (
            <span className="hidden sm:inline">[Formula &amp; Source]</span>
          )}
        </span>
      </span>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={handleMouseEnterPopover}
            onMouseLeave={handleMouseLeavePopover}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none',
              width: 'min(480px, calc(100vw - 24px))',
              zIndex: 9999,
            }}
            className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-2xl text-slate-900 dark:text-slate-100 p-4 space-y-3 text-xs animate-in fade-in duration-100"
          >
            {/* Header Bar */}
            <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                  <BookOpen className="w-3 h-3 shrink-0" />
                  <span>{resolved.categoryLabel}</span>
                  {isPinned && (
                    <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-mono">
                      PINNED
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-snug">
                  {resolved.title}
                </h4>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleTogglePin}
                  title={isPinned ? 'Unpin tooltip' : 'Pin tooltip open'}
                  className={`p-1 border text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer transition-colors ${
                    isPinned
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500'
                  }`}
                >
                  <Pin className="w-3 h-3" />
                  <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPinned(false);
                    setIsHovered(false);
                  }}
                  title="Close tooltip (Esc)"
                  className="p-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Active Sovereign Telemetry Extracted from the Badge */}
            {resolved.extractedMetrics.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Live Sovereign Telemetry in Badge
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {resolved.extractedMetrics.map((m, idx) => (
                    <div
                      key={`${m.label}-${idx}`}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono"
                    >
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block truncate">
                        {m.label}
                      </span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums block truncate">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formal Mathematical Specification */}
            <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 p-2.5 text-slate-100">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>FORMAL MATHEMATICAL SPECIFICATION</span>
                <span className="text-emerald-400">STRUCTURAL IDENTITY</span>
              </div>
              <div className="font-mono text-[11px] text-emerald-300 leading-relaxed break-words select-all">
                {resolved.formulaMono}
              </div>
            </div>

            {/* Plain-English Intuition */}
            <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="text-slate-900 dark:text-slate-100">Plain-English Meaning: </strong>
              {resolved.plainEnglishSummary}
            </div>

            {/* Variable Glossary */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Variable &amp; Parameter Glossary
              </div>
              <div className="border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 max-h-36 overflow-y-auto">
                {resolved.variables.map((v) => (
                  <div
                    key={v.symbol}
                    className="px-2 py-1 flex items-baseline justify-between gap-2 text-[11px] bg-white dark:bg-slate-900/60"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-1.5">
                        {v.symbol}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">{v.meaning}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{v.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Institutional Warning & Distress Thresholds */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Institutional Calibration &amp; Distress Thresholds
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] font-mono">
                {resolved.thresholds.map((t) => {
                  const badgeStyle =
                    t.severity === 'SAFE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300'
                      : t.severity === 'WATCH'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300';
                  return (
                    <div key={t.label} className={`p-1.5 border ${badgeStyle}`}>
                      <div className="font-sans font-bold text-[10px] truncate">{t.label}</div>
                      <div className="mt-0.5 font-mono font-semibold">{t.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Primary Data Source Citation & Copy Action */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                <strong className="text-slate-700 dark:text-slate-200">Source Citation: </strong>
                {resolved.primarySourceCitation}
              </div>

              <button
                type="button"
                onClick={handleCopyCitation}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-mono font-semibold hover:opacity-90 transition-opacity shrink-0 cursor-pointer self-start sm:self-center"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
                    <span>Copied Citation</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Citation</span>
                  </>
                )}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

/**
 * Automatically parses inline parenthetical statistical references like `(Ref: ...)` or
 * `(Statistical Ref: ...)` inside plain-English prose and AI Council debate transcripts,
 * rendering them as interactive hover/pin `<StatRefBadge variant="inline" />` pills.
 */
export const RichTextWithStatRefs: React.FC<{
  text: string;
  className?: string;
}> = ({ text, className = '' }) => {
  if (!text) return null;

  const pattern = /(\((?:Statistical\s+Reference|Statistical\s+Ref|Ref)\s*:[^)]+\))/gi;
  const parts = text.split(pattern);

  if (parts.length === 1) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (/^\((?:Statistical\s+Reference|Statistical\s+Ref|Ref)\s*:[^)]+\)$/i.test(part)) {
          const inner = part.slice(1, -1).trim();
          return <StatRefBadge key={index} refText={inner} variant="inline" />;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
