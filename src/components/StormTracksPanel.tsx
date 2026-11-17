import React, { useCallback, useEffect, useState } from 'react';
import { Wind } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import { STORM_RADII, STORM_DEFAULT_RADIUS, STORM_NO_DATA, type StormView, type StormNear } from '../utils/stormTracks';
import { explainInChat } from '../utils/explainHandoff';
import { useLang, useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Tropical cyclones (I8, src/utils/stormTracks.ts): IBTrACS
 * storm tracks since 1980 passing near the country, by strength and year. The tracks come from a
 * copy the user saves in data/local/ibtracs/ or a download the user starts here.
 */

interface Status {
  state: 'idle' | 'downloading' | 'reading' | 'failed';
  bytes?: number;
  error?: string;
}

type Reply = Partial<StormView> & {
  iso3: string;
  radiusKm: number;
  status: Status;
  refreshDays: number;
  sources: string;
  missing?: string;
  file?: string;
  pulledAt?: string;
  source?: 'local' | 'download';
  stale?: boolean;
  wmoWindPoints?: number;
  sentence?: string;
};

const amber = 'text-amber-700 dark:text-amber-400';
const muted = 'text-xs text-slate-500 dark:text-slate-400';

export const StormTracksPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [radius, setRadius] = useState<number>(STORM_DEFAULT_RADIUS);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [all, setAll] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();
  const lang = useLang();

  useEffect(() => {
    let live = true;
    setError(null);
    fetch(`/api/storms/${encodeURIComponent(iso3)}?radius=${radius}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3, radius, tick]);

  const busy = reply?.status.state === 'downloading' || reply?.status.state === 'reading';
  useEffect(() => {
    if (!busy) return;
    const id = setTimeout(() => setTick((x) => x + 1), 4000);
    return () => clearTimeout(id);
  }, [busy, reply]);

  const download = useCallback(() => {
    fetch('/api/storms/download', { method: 'POST' })
      .then(() => setTick((x) => x + 1))
      .catch((e: Error) => setError(e.message));
  }, []);

  const n = (v: number) => v.toLocaleString(lang);
  const every = (v?: number) => (v === undefined || v < 2 ? '' : ` ${t('st_every', { n: v < 10 ? v.toFixed(1) : String(Math.round(v)) })}`);
  const cat = (s: StormNear) => (s.category >= 1 ? t('st_cat', { n: String(s.category) }) : t('st_ts'));
  const has = reply && reply.storms !== undefined && !reply.missing;
  const canDownload = reply && reply.source !== 'local' && !busy && (!has || reply.stale);
  const shown = has ? (all ? reply!.list! : reply!.strongest!) : [];

  return (
    <section className="ui-panel" data-storm-tracks="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Wind className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('st_title', { country: countryName })}
          <ValidationBadge id="storm_tracks" />
          {has && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Tropical cyclones, ${countryName}`,
                  value: reply!.sentence || '',
                  source: reply!.sources,
                  asOf: String(reply!.to ?? ''),
                  iso3,
                  countryName,
                  detail: [STORM_METHOD_EN],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('st_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        <label className="flex items-center gap-2 text-xs">
          {t('st_radius')}
          <select
            className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1 py-0.5"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            data-st-radius="true"
          >
            {STORM_RADII.map((r) => (
              <option key={r} value={r}>
                {t('st_km', { n: String(r) })}
              </option>
            ))}
          </select>
        </label>
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className={`text-sm ${amber}`}>{t('c_couldNotRead', { what: t('st_what'), error })}</p>}
        {reply?.missing && (
          <p className={`text-sm ${amber}`} data-missing="true">
            {t('c_missingReason', { reason: tx(reply.missing) })}
          </p>
        )}
        {reply && busy && (
          <p className="text-xs" data-st-busy="true">
            {reply.status.state === 'downloading' ? t('st_downloading', { mb: ((reply.status.bytes ?? 0) / 1e6).toFixed(0) }) : t('st_reading')}
          </p>
        )}
        {reply?.status.state === 'failed' && <p className={`text-xs ${amber}`}>{t('st_failed', { error: reply.status.error || '' })}</p>}
        {canDownload && (
          <div className="space-y-1">
            <button type="button" className="ui-btn text-xs" onClick={download} data-st-download="true">
              {has ? t('st_downloadAgain') : t('st_download')}
            </button>
            <p className={muted}>{has ? t('st_staleNote', { days: String(reply!.refreshDays) }) : t('st_downloadNote')}</p>
          </div>
        )}
        {has && (
          <>
            <p className="ui-body" data-st-summary={String(reply!.storms)}>
              {t('st_summary', { storms: n(reply!.storms!), km: String(reply!.radiusKm), seasons: String(reply!.seasons), from: String(reply!.from), to: String(reply!.to), hurricanes: n(reply!.hurricanes!), major: n(reply!.major!), crossed: n(reply!.crossed!) })}
            </p>
            {reply!.storms! > 0 && (
              <ul className="text-xs space-y-0.5" data-st-chances="true">
                <li>{t('st_anyShare', { pct: reply!.anyPct!.toFixed(0) })}{every(reply!.anyEvery)}</li>
                <li>{t('st_hurricaneShare', { pct: reply!.hurricanePct!.toFixed(0) })}{every(reply!.hurricaneEvery)}</li>
                <li>{t('st_majorShare', { pct: reply!.majorPct!.toFixed(0) })}{every(reply!.majorEvery)}</li>
              </ul>
            )}
            {reply!.storms! > 0 && (
              <>
                <h3 className="ui-label flex items-center gap-2">
                  {all ? t('st_listAll') : t('st_listStrongest')}
                  <button type="button" className="ui-btn ml-auto text-xs" onClick={() => setAll((x) => !x)} data-st-toggle="true">
                    {all ? t('st_showStrongest') : t('st_showAll')}
                  </button>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-st-list="true">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-medium">{t('st_tSeason')}</th>
                        <th className="py-1 pr-3 font-medium">{t('st_tName')}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('st_tWind')}</th>
                        <th className="py-1 pr-3 font-medium">{t('st_tStrength')}</th>
                        <th className="py-1 font-medium text-right">{t('st_tClosest')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((s) => (
                        <tr key={s.sid} className="border-t border-slate-100 dark:border-slate-800" data-st-storm={s.sid}>
                          <td className="py-0.5 pr-3">{s.season}</td>
                          <td className="py-0.5 pr-3">{s.name || t('st_unnamed')}</td>
                          <td className="py-0.5 pr-3 text-right">{s.windKt}</td>
                          <td className="py-0.5 pr-3">{cat(s)}</td>
                          <td className="py-0.5 text-right">{s.closestKm === 0 ? t('st_crossed') : s.closestKm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <details className="text-xs" data-st-years="true">
              <summary className="cursor-pointer text-slate-600 dark:text-slate-300">{t('st_yearsTitle', { from: String(reply!.from), to: String(reply!.to) })}</summary>
              <div className="overflow-x-auto mt-1">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('st_tSeason')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('st_tStorms')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('st_tHurricanes')}</th>
                      <th className="py-1 font-medium text-right">{t('st_tMajor')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...reply!.years!].reverse().map((y) => (
                      <tr key={y.year} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-0.5 pr-3">{y.year}</td>
                        <td className="py-0.5 pr-3 text-right">{y.storms}</td>
                        <td className="py-0.5 pr-3 text-right">{y.hurricanes}</td>
                        <td className="py-0.5 text-right">{y.major}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            {(reply!.wmoWindPoints ?? 0) > 0 && <p className={muted}>{t('st_wmoNote')}</p>}
          </>
        )}
        {reply?.file && <p className={muted}>{reply.source === 'local' ? t('st_fileLocal', { file: reply.file }) : t('st_fileDownload', { date: (reply.pulledAt || '').slice(0, 10) })}</p>}
        {reply && (
          <p className={muted}>
            {t('st_method')} {t('c_sources', { sources: tx(reply.sources) })}
          </p>
        )}
        {reply?.missing === STORM_NO_DATA && <p className={muted}>{t('st_localHelp')}</p>}
      </div>
    </section>
  );
};

const STORM_METHOD_EN =
  'IBTrACS v04r01 main tracks since 1980, positions every 3 hours filled in every 25 km; a storm counts when its centre passes within the chosen distance of the country outline with 34 knots or more there; strength is the highest US 1-minute wind within that distance, on the Saffir-Simpson scale. The centre distance is not the reach of the winds and wind is not damage.';
