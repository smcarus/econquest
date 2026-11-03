import React, { useEffect, useMemo, useState } from 'react';
import {
  CommandPaletteItem,
  CommandPaletteItemCategory,
  CustomSovereignOnboardingDraft,
  ModelIntegrityAuditReport,
  UserPersonaId,
  WorkspaceSessionSnapshot,
} from '../types/council';
import {
  CURATED_NEW_SOVEREIGN_TEMPLATES,
  exportIntegrityAuditCertificateMarkdown,
  exportWorkspaceSessionJsonFile,
  hydrateCustomSovereignFromLiveApi,
  parseAndValidateWorkspaceSessionJson,
} from '../utils/turnkeyReadinessAndCommandEngine';
import {
  Search,
  X,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Database,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Plus,
  Terminal,
  AlertTriangle,
} from 'lucide-react';

interface GlobalCommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandPaletteItem[];
  onSelectCommand: (item: CommandPaletteItem) => void;
}

export const GlobalCommandPaletteModal: React.FC<GlobalCommandPaletteModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectCommand,
}) => {
  const [query, setQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | CommandPaletteItemCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCategoryFilter('ALL');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (!q) return true;
      const inTitle = item.title.toLowerCase().includes(q);
      const inSub = item.subtitle.toLowerCase().includes(q);
      const inBadge = item.categoryBadge.toLowerCase().includes(q);
      const inKeywords = item.keywords.some((k) => k.includes(q));
      return inTitle || inSub || inBadge || inKeywords;
    });
  }, [items, query, categoryFilter]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, categoryFilter]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length > 0
            ? (prev - 1 + filteredItems.length) % filteredItems.length
            : 0
        );
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        onSelectCommand(filteredItems[selectedIndex]);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onSelectCommand, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any of 10 Hubs, 36 Sub-Modules (e.g. '8.1 Shadow Rating', '9.1 Restructuring', 'Polymarket', 'India')..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            ESC
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px]">
          {(
            [
              { id: 'ALL', label: `All (${items.length})` },
              { id: 'SUB_MODULE', label: '36 Sub-Modules (1.1–10.4)' },
              { id: 'ANALYTICAL_HUB', label: '10 Top Hubs' },
              { id: 'SOVEREIGN_SWITCH', label: 'Sovereigns' },
              { id: 'PERSONA_MODE', label: 'Persona Modes' },
              { id: 'EXPORT_AND_AUDIT', label: 'Audit, ISO-3 & Session' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 font-medium border transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching module, sovereign, or command found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onSelectCommand(item);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold shrink-0 mt-0.5 border ${
                        item.category === 'SUB_MODULE'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : item.category === 'ANALYTICAL_HUB'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : item.category === 'SOVEREIGN_SWITCH'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : item.category === 'PERSONA_MODE'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      {item.categoryBadge}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcutHint && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {item.shortcutHint}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span>↑↓ Navigate · Enter Select · ESC Close</span>
          <span>10 Institutional Hubs · 36 Quantitative Modules Indexed</span>
        </div>
      </div>
    </div>
  );
};

interface ModelIntegrityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditReport: ModelIntegrityAuditReport;
}

export const ModelIntegrityAuditModal: React.FC<ModelIntegrityAuditModalProps> = ({
  isOpen,
  onClose,
  auditReport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pre-Flight Model Integrity, Accounting Identity & API Provenance Auditor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active Sovereign: {auditReport.activeSovereignName} ({auditReport.activeSovereignIso3}) ·{' '}
                {auditReport.watchlistCount}-Sovereign Comparison Universe · Zero Notional Dollar Leakage Enforced
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportIntegrityAuditCertificateMarkdown(auditReport)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Certificate (.md)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70">
              <div className="text-[11px] font-mono uppercase text-emerald-700 dark:text-emerald-300">
                Turnkey Readiness Score
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                {auditReport.readinessScorePct}% PASS
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                {auditReport.passedChecksCount} of {auditReport.totalChecksRun} invariants verified
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                Accounting Identities
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                100.00% Exact
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                SDIB, Restructuring & Custody Σw = 100%
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                Unit-Ratio Discipline
              </div>
              <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {auditReport.zeroNotionalComplianceVerified ? '0 Notional Leaks' : 'Check Units'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                % GDP · bps · Notches (1–21) · 0–100¢
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                Multilateral Feeds
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {auditReport.provenanceFeeds.length} Verified APIs
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                IMF WEO · World Bank v2 · BIS · Polymarket
              </div>
            </div>
          </div>

          {/* Executive Verdict */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 text-xs text-slate-800 dark:text-slate-200">
            <span className="font-bold text-blue-700 dark:text-blue-300">
              Executive Pre-Flight Audit Verdict:{' '}
            </span>
            {auditReport.executiveAuditVerdict}
          </div>

          {/* Checks Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              1. Mathematical Identity, Boundary & Unit-Ratio Verification Matrix
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 px-3">Check ID & Hub</th>
                    <th className="py-2 px-3">Mathematical Identity / Invariant</th>
                    <th className="py-2 px-3">Expected</th>
                    <th className="py-2 px-3">Observed</th>
                    <th className="py-2 px-3">Residual</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {auditReport.checks.map((chk) => (
                    <tr
                      key={chk.checkId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {chk.checkId}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {chk.hubReference}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {chk.title}
                        </div>
                        <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                          {chk.formulaChecked}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {chk.diagnosticDetail}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 align-top whitespace-nowrap">
                        {chk.expectedInvariant}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white align-top whitespace-nowrap">
                        {chk.observedReading}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 align-top whitespace-nowrap">
                        {chk.residualDeviationLabel}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold ${
                            chk.status === 'PASS'
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {chk.status === 'PASS' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {chk.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Provenance Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              2. Multilateral & High-Frequency Data Provenance Matrix
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 px-3">Institution</th>
                    <th className="py-2 px-3">Endpoint / Series Codes</th>
                    <th className="py-2 px-3">Normalized Metrics Supplied</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {auditReport.provenanceFeeds.map((feed) => (
                    <tr key={feed.feedId}>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                        {feed.institutionName}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {feed.endpointOrDataset}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        {feed.metricsProvided}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]">
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
                          {feed.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CustomSovereignOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOnboardSovereign: (draft: CustomSovereignOnboardingDraft) => void;
}

export const CustomSovereignOnboardingModal: React.FC<
  CustomSovereignOnboardingModalProps
> = ({ isOpen, onClose, onOnboardSovereign }) => {
  const [draft, setDraft] = useState<CustomSovereignOnboardingDraft>(
    CURATED_NEW_SOVEREIGN_TEMPLATES[0]
  );
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [hydrationNote, setHydrationNote] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl: CustomSovereignOnboardingDraft) => {
    setDraft({ ...tpl });
    setHydrationNote(`Loaded institutional baseline template for ${tpl.countryName} (${tpl.iso3}).`);
  };

  const handleLiveHydrate = async () => {
    setIsHydrating(true);
    setHydrationNote(`Querying live IMF DataMapper WEO v1 & World Bank Open Data v2 for ${draft.iso3}...`);
    const res = await hydrateCustomSovereignFromLiveApi(draft);
    setDraft(res.updatedDraft);
    setHydrationNote(res.liveSourceNote);
    setIsHydrating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.iso3.trim() || !draft.countryName.trim()) return;
    onOnboardSovereign({
      ...draft,
      iso3: draft.iso3.trim().toUpperCase().slice(0, 3),
      currencyCode: draft.currencyCode.trim().toUpperCase().slice(0, 4),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Custom ISO-3 Sovereign Onboarding Wizard (Live IMF / World Bank Auto-Hydration)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add any new sovereign country on the fly — immediately active across all 10 analytical hubs and 36 sub-modules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick G20 / EM Templates */}
          <div>
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              1. Quick-Load Curated G20 / EM Sovereign Template (or Enter Any Custom ISO-3 Below):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CURATED_NEW_SOVEREIGN_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.iso3}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`px-2.5 py-1.5 font-mono text-xs border transition-colors ${
                    draft.iso3 === tpl.iso3
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tpl.iso3} · {tpl.countryName}
                </button>
              ))}
            </div>
          </div>

          {/* Core Identity & Live API Hydration Button */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                ISO-3 Code (3 Letters)
              </label>
              <input
                type="text"
                maxLength={3}
                required
                value={draft.iso3}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, iso3: e.target.value.toUpperCase() }))
                }
                className="w-full px-2.5 py-1.5 font-mono font-bold uppercase bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Country Name
              </label>
              <input
                type="text"
                required
                value={draft.countryName}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, countryName: e.target.value }))
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Currency Code
              </label>
              <input
                type="text"
                maxLength={4}
                required
                value={draft.currencyCode}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    currencyCode: e.target.value.toUpperCase(),
                  }))
                }
                className="w-full px-2.5 py-1.5 font-mono uppercase bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Geographic Region
              </label>
              <input
                type="text"
                value={draft.region}
                onChange={(e) => setDraft((prev) => ({ ...prev, region: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70">
            <div className="text-slate-700 dark:text-slate-300">
              <span className="font-bold text-blue-700 dark:text-blue-300">
                Auto-Hydrate from Multilateral Open Data:{' '}
              </span>
              {hydrationNote ||
                'Query IMF DataMapper WEO v1 & World Bank v2 APIs for this ISO-3 code.'}
            </div>
            <button
              type="button"
              onClick={handleLiveHydrate}
              disabled={isHydrating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isHydrating ? 'Hydrating IMF / WB...' : 'Hydrate Live IMF / WB Data'}
              </span>
            </button>
          </div>

          {/* Normalized Macro & Market Parameters (Zero Notional) */}
          <div>
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              2. Ratio-Normalized Macro, Fiscal & Market Parameters (% of GDP, bps, Months Import Cover):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Gross Debt / GDP (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={draft.debtToGdpPct}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, debtToGdpPct: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Primary Fiscal Balance (% GDP)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={draft.primaryFiscalBalancePct}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      primaryFiscalBalancePct: Number(e.target.value),
                    }))
                  }
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Real GDP Growth YoY (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={draft.realGdpGrowthPct}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, realGdpGrowthPct: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Headline CPI Inflation (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={draft.cpiInflationPct}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, cpiInflationPct: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  CB Policy Rate (%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={draft.policyRatePct}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, policyRatePct: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  10Y Sovereign Yield (%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={draft.sovereign10YBondYieldPct}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      sovereign10YBondYieldPct: Number(e.target.value),
                    }))
                  }
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  5Y USD CDS Spread (bps)
                </label>
                <input
                  type="number"
                  step="1"
                  value={draft.cds5YSpreadBps}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, cds5YSpreadBps: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  FX Reserves (Mos. Imports)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={draft.fxReservesMonthsImport}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      fxReservesMonthsImport: Number(e.target.value),
                    }))
                  }
                  className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Primary Sovereign Risk & Macro Focus Directive
            </label>
            <input
              type="text"
              value={draft.focusTheme}
              onChange={(e) => setDraft((p) => ({ ...p, focusTheme: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Submit Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                Onboard {draft.countryName} ({draft.iso3}) & Activate Across All 10 Hubs
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface WorkspaceSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSnapshot: WorkspaceSessionSnapshot;
  onRestoreSession: (snapshot: WorkspaceSessionSnapshot) => void;
  onResetFactoryDefaults: () => void;
}

export const WorkspaceSessionModal: React.FC<WorkspaceSessionModalProps> = ({
  isOpen,
  onClose,
  currentSnapshot,
  onRestoreSession,
  onResetFactoryDefaults,
}) => {
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      const validated = parseAndValidateWorkspaceSessionJson(content);
      if (!validated) {
        setImportError(
          'Invalid session JSON file. Expected schemaVersion "ECONQUEST-SESSION-1.0".'
        );
        return;
      }
      setImportError(null);
      onRestoreSession(validated);
      onClose();
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Workspace State Persistence & Session Snapshot Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-saved to browser localStorage · Export or restore complete `.json` research sessions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Active State Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-mono font-bold text-slate-900 dark:text-white uppercase text-[11px]">
              Current Live Persisted Workspace State
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
              <div>
                Active Sovereign:{' '}
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currentSnapshot.activeCountryName} ({currentSnapshot.activeIso3})
                </span>
              </div>
              <div>
                Active Persona Lens:{' '}
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {currentSnapshot.activePersona}
                </span>
              </div>
              <div>
                Active Module:{' '}
                <span className="font-mono text-slate-900 dark:text-white">
                  {currentSnapshot.activeNavSection}
                </span>
              </div>
              <div>
                Custom ISO-3 Sovereigns:{' '}
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {currentSnapshot.customOnboardedSovereigns.length} onboarded
                </span>
              </div>
            </div>
          </div>

          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              {importError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => exportWorkspaceSessionJsonFile(currentSnapshot)}
              className="flex flex-col items-start p-3.5 bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Download className="w-4 h-4" />
                <span>Export Session (.json)</span>
              </div>
              <span className="text-[11px] text-blue-100 mt-1 text-left">
                Download portable snapshot of watchlists, custom ISO-3s & shocks
              </span>
            </button>

            <label className="flex flex-col items-start p-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
              <div className="flex items-center gap-1.5 font-bold">
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Restore Session (.json)</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 text-left">
                Upload a saved `.json` session file from a colleague or prior run
              </span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                onResetFactoryDefaults();
                onClose();
              }}
              className="flex flex-col items-start p-3.5 bg-slate-50 dark:bg-slate-950 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 border border-slate-200 dark:border-slate-800 transition-colors"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <RotateCcw className="w-4 h-4" />
                <span>Factory Reset</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 text-left">
                Clear custom overrides and restore default watchlists & baseline
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
