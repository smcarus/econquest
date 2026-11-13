/**
 * Console events (item 4): what turns into an event, the envelope, de-duplication, signed
 * deliveries with retries, and the delivery log. Inputs are recorded shapes; nothing is fetched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { EVENT_TYPES, makeEvent, retryDelayS, MAX_ATTEMPTS, signDelivery, wants, sseFrame, shareableSource, idempotencyKey, type EventInput } from '../src/utils/consoleEvents';
import { EventHub, WebhookStore, emitEvents, eventFiles, eventsAfter, readDeliveries, readEvents, type Fetcher } from '../src/server/eventBus';
import { badgeChangeInputs, dailyRunInputs, figureEventInputs, releaseUpcomingInputs, sanctionsChangeInputs, signalChangeInputs, councilRunInput } from '../src/server/eventSources';
import type { OfficialCalendarEvent } from '../src/data/officialCalendar';

const tmp = () => mkdtempSync(path.join(tmpdir(), 'econquest-events-'));

const daily = (startedAt = '2026-11-13T06:00:00.000Z'): EventInput => ({
  type: 'daily_download_ready',
  entity: { kind: 'app', name: 'Daily download' },
  as_of: startedAt.slice(0, 10),
  source: 'EconQuest daily download',
  summary: 'Daily download finished; every step done.',
  discriminator: startedAt,
});

test('the envelope carries id, type, entity, severity, times, source, evidence, shareable, badge and an idempotency key', () => {
  const e = makeEvent({ ...daily(), evidence_url: '/api/daily/status' }, new Date('2026-11-13T06:21:00Z'));
  assert.match(e.id, /^evt_/);
  assert.equal(e.occurred_at, '2026-11-13T06:21:00.000Z');
  assert.equal(e.as_of, '2026-11-13');
  assert.equal(e.severity, 'info');
  assert.equal(e.badge, 'official');
  assert.equal(e.shareable, true, 'the app itself carries no third-party figure');
  assert.equal(e.idempotency_key.length, 32);
  assert.equal(e.idempotency_key, makeEvent(daily()).idempotency_key, 'the same happening has the same key');
  assert.notEqual(e.idempotency_key, idempotencyKey(daily('2026-11-14T06:00:00.000Z')));
  assert.equal(EVENT_TYPES.length, 10);
});

test('shareable comes from the licence register; an unknown source is not shareable', () => {
  assert.equal(shareableSource('EconQuest pre-registered tests'), true);
  assert.equal(shareableSource('A source nobody has checked'), false);
});

test('emitEvents drops a second write of the same happening; eventsAfter filters by id, time, type and country', () => {
  const dir = tmp();
  try {
    const files = eventFiles(dir);
    assert.equal(emitEvents(files, [daily()]).length, 1);
    assert.equal(emitEvents(files, [daily()]).length, 0);
    const fig = figureEventInputs([{ at: '2026-11-13T07:00:00Z', iso3: 'BRA', country: 'Brazil', figure: 'policy', label: 'Policy rate', kind: 'revised', detail: '10.5% to 10.75%', from: 10.5, to: 10.75, period: '2026-10' }]);
    emitEvents(files, fig);
    const all = readEvents(files);
    assert.equal(all.length, 2);
    assert.equal(all[1]!.entity.iso2, 'BR');
    assert.deepEqual(eventsAfter(all, { after: all[0]!.id }).map((e) => e.type), ['figure_revised']);
    assert.deepEqual(eventsAfter(all, { countries: ['BRA'] }).map((e) => e.type), ['figure_revised']);
    assert.deepEqual(eventsAfter(all, { types: ['daily_download_ready'] }).length, 1);
    assert.equal(wants({ countries: ['MEX'] }, all[1]!), false);
    assert.match(sseFrame(all[0]!), /^id: evt_.*\nevent: daily_download_ready\ndata: \{/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('event sources: figure watch, signals (first sighting not reported), badges, daily run, sanctions, council', () => {
  const kinds = figureEventInputs([
    { at: '2026-11-13T07:00:00Z', iso3: 'TUR', country: 'Turkey', figure: 'cpi', label: 'CPI', kind: 'stale', detail: 'last 2026-07' },
    { at: '2026-11-13T07:00:00Z', iso3: 'TUR', country: 'Turkey', figure: 'yield', label: '10y yield', kind: 'missing', detail: 'feed down' },
    { at: '2026-11-13T07:00:00Z', iso3: 'TUR', country: 'Turkey', figure: 'yield', label: '10y yield', kind: 'jump', detail: 'x' } as never,
  ]).map((i) => i.type);
  assert.deepEqual(kinds, ['data_stale', 'feed_failed'], 'jumps stay in Data health');

  const row = (state: number) => ({ iso3: 'MEX', countryName: 'Mexico', cftc: { percentile: state, reportDate: '2026-11-10' } }) as never;
  const first = signalChangeInputs(null, [row(95)], {});
  assert.equal(first.inputs.length, 0);
  const next = signalChangeInputs(first.states, [row(5)], { cftc_crowding: 'validated' });
  assert.equal(next.inputs.length, 1);
  assert.equal(next.inputs[0]!.type, 'signal_state_changed');
  assert.equal(next.inputs[0]!.badge, 'validated');
  assert.equal(next.inputs[0]!.as_of, '2026-11-10');

  const badges = badgeChangeInputs({ m1: 'provisional', m2: 'validated' }, { m1: 'validated', m2: 'withdrawn', m3: 'validated' }, { m1: 'One' }, '2026-11-13T05:00:00Z');
  assert.deepEqual(badges.map((b) => [b.entity.id, b.severity]), [['m1', 'info'], ['m2', 'warning']], 'a new model is not a change');

  const run = { startedAt: '2026-11-13T06:00:00Z', finishedAt: '2026-11-13T06:30:00Z', steps: [{ id: 'imf', label: 'IMF', outcome: 'done' }, { id: 'bis', label: 'BIS', outcome: 'failed', note: 'timeout' }] } as never;
  const d = dailyRunInputs(run);
  assert.deepEqual(d.map((x) => x.type), ['feed_failed', 'daily_download_ready']);
  assert.equal(d[1]!.severity, 'warning');
  assert.deepEqual(dailyRunInputs({ startedAt: 'x', steps: [] } as never), [], 'an unfinished run says nothing');

  const s = sanctionsChangeInputs({ ofac_sdn: { entries: 10, modified: '2026-11-01' } } as never, { ofac_sdn: { entries: 12, modified: '2026-11-12' } } as never);
  assert.equal(s.length, 1);
  assert.equal(s[0]!.type, 'sanctions_list_changed');
  assert.equal(sanctionsChangeInputs({ ofac_sdn: { entries: 12, modified: '2026-11-12' } } as never, { ofac_sdn: { entries: 12, modified: '2026-11-12' } } as never).length, 0);

  const c = councilRunInput({ iso3: 'BRA', countryName: 'Brazil', finishedAt: '2026-11-13T09:00:00Z' });
  assert.equal(c.badge, 'not_validated');
});

test('release_upcoming: the day before, from the official calendar and announced Treasury auctions only', () => {
  const cal = [
    { iso3: 'BRA', date: '2026-11-14', category: 'MPC_DECISION', title: 'Copom decision', sourceName: 'Banco Central do Brasil', sourceUrl: 'https://www.bcb.gov.br', primarySource: true, retrieved: '2026-11-01' },
    { iso3: 'BRA', date: '2026-11-15', category: 'CPI_RELEASE', title: 'IPCA', sourceName: 'IBGE', sourceUrl: 'https://www.ibge.gov.br', primarySource: true, retrieved: '2026-11-01' },
  ] as unknown as OfficialCalendarEvent[];
  const out = releaseUpcomingInputs(new Date('2026-11-13T12:00:00Z'), [{ date: '2026-11-14', tenor: '10y', reopening: true, offeringUsdBn: 39 } as never], cal);
  assert.equal(out.length, 2);
  assert.match(out[0]!.summary, /Copom/);
  assert.equal(out[1]!.entity.iso3, 'USA');
});

test('webhooks: secret shown once and encrypted when a master key is set; owners only remove their own', () => {
  const dir = tmp();
  try {
    const files = eventFiles(dir);
    const store = new WebhookStore(files, null);
    assert.ok('error' in store.add({ url: 'https://x.example/h', types: ['nope'], owner: 'a' }));
    assert.ok('error' in store.add({ url: 'https://x.example/h', countries: ['BRAZIL'], owner: 'a' }));
    const made = store.add({ url: 'https://x.example/h', types: ['badge_changed'], owner: 'a' });
    assert.ok('webhook' in made);
    assert.equal(store.remove(made.webhook.id, 'b'), null);
    assert.ok(store.remove(made.webhook.id, 'a'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('deliveries: signed, retried with backoff on failure, logged, and given up after the last attempt', async () => {
  const dir = tmp();
  try {
    const files = eventFiles(dir);
    const store = new WebhookStore(files, null);
    const made = store.add({ url: 'https://console.example/hook', owner: 'a' });
    assert.ok('webhook' in made);
    const seen: { headers: Record<string, string>; body: string }[] = [];
    let status = 503;
    const fetcher: Fetcher = async (_url, init) => {
      seen.push({ headers: init.headers, body: init.body });
      return { status, text: async () => (status === 200 ? 'ok' : 'busy') };
    };
    const broadcast: string[] = [];
    const hub = new EventHub({ files, webhooks: store, urlProblem: () => null, fetcher, broadcast: (e) => broadcast.push(e.id) });
    emitEvents(files, [daily('2026-11-12T06:00:00.000Z')]);
    hub.start();
    assert.equal(hub.pull().length, 0, 'events from before the first start are not sent to webhooks');
    emitEvents(files, [daily()]);
    // A half-written line is left for next time.
    writeFileSync(files.events, '{"partial":', { flag: 'a' });
    const t0 = new Date('2026-11-13T07:00:00Z');
    assert.equal(hub.pull(t0).length, 1);
    assert.equal(broadcast.length, 1);
    // The rest of the line arrives; it is not an event, so nothing more is sent.
    writeFileSync(files.events, '1}\n', { flag: 'a' });
    assert.equal(hub.pull(t0).length, 0);
    const r1 = await hub.deliver(t0);
    assert.equal(r1[0]!.ok, false);
    assert.equal(r1[0]!.nextAttemptAt, new Date(t0.getTime() + 30_000).toISOString());
    assert.equal((await hub.deliver(t0)).length, 0, 'not due yet');
    const h = seen[0]!.headers;
    assert.equal(h['X-EconQuest-Signature-256'], `sha256=${createHmac('sha256', made.secret).update(`${h['X-EconQuest-Timestamp']}.${seen[0]!.body}`).digest('hex')}`);
    assert.equal(h['X-EconQuest-Signature-256'], signDelivery(made.secret, h['X-EconQuest-Timestamp']!, seen[0]!.body));
    assert.equal(h['X-EconQuest-Attempt'], '1');
    status = 200;
    const r2 = await hub.deliver(new Date(t0.getTime() + 31_000));
    assert.equal(r2[0]!.ok, true);
    assert.equal(seen[1]!.headers['X-EconQuest-Attempt'], '2');
    assert.equal(seen[1]!.headers['X-EconQuest-Delivery-Id'], h['X-EconQuest-Delivery-Id'], 'a retry keeps its delivery id');
    assert.equal(hub.queued().length, 0);
    assert.equal(readDeliveries(files, [made.webhook.id]).length, 2);

    // Always failing: given up after MAX_ATTEMPTS.
    status = 500;
    emitEvents(files, [daily('2026-11-14T06:00:00.000Z')]);
    let at = new Date('2026-11-14T07:00:00Z');
    hub.pull(at);
    let last;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const recs = await hub.deliver(at);
      last = recs[0];
      at = new Date(at.getTime() + ((retryDelayS(i + 1) ?? 0) + 1) * 1000);
    }
    assert.equal(last?.gaveUp, true);
    assert.equal(last?.attempt, MAX_ATTEMPTS);
    assert.equal(hub.queued().length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a refused address is not called', async () => {
  const dir = tmp();
  try {
    const files = eventFiles(dir);
    const store = new WebhookStore(files, null);
    store.add({ url: 'http://169.254.169.254/x', owner: 'a' });
    let called = 0;
    const hub = new EventHub({ files, webhooks: store, urlProblem: () => 'Cloud metadata addresses cannot be used.', fetcher: async () => ((called += 1), { status: 200, text: async () => '' }), broadcast: () => undefined });
    hub.start();
    emitEvents(files, [daily()]);
    hub.pull();
    const recs = await hub.deliver();
    assert.equal(called, 0);
    assert.equal(recs[0]!.gaveUp, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('watches: fire on crossing (also at the first check), not again until the figure goes back; sample yields never fire', async () => {
  const { watchCrossingInputs } = await import('../src/server/eventSources');
  const rule = { id: 'w_1', iso3: 'MEX', metric: 'policy_rate', op: '>=', value: 7, createdAt: '2026-11-13T00:00:00Z' } as const;
  const row = (rate: number | undefined, date = '2026-11-12') => ({ iso3: 'MEX', countryName: 'Mexico', policyRateSource: 'bis', policyRatePct: rate, policyRateDate: date }) as never;
  const a = watchCrossingInputs([rule], [row(7.25)], null, new Date('2026-11-13T07:00:00Z'));
  assert.equal(a.inputs.length, 1);
  const e = makeEvent(a.inputs[0]!);
  assert.equal(e.type, 'threshold_crossed');
  assert.equal(e.entity.iso2, 'MX');
  assert.equal(e.entity.id, 'w_1');
  assert.equal(e.as_of, '2026-11-12');
  assert.equal(e.source, 'BIS central bank policy rates');
  const b = watchCrossingInputs([rule], [row(7.5, '2026-11-13')], a.states);
  assert.equal(b.inputs.length, 0, 'still crossed: no new event');
  const c = watchCrossingInputs([rule], [row(undefined)], b.states);
  assert.equal(c.inputs.length, 0);
  assert.equal(c.states['w_1:MEX']!.crossed, true, 'a Missing figure keeps the last state');
  const d = watchCrossingInputs([rule], [row(6.5)], c.states);
  assert.equal(d.inputs.length, 0);
  assert.equal(watchCrossingInputs([rule], [row(7)], d.states).inputs.length, 1, 'fires again after going back');
  const y = { id: 'w_2', iso3: '*', metric: 'yield_level', op: '>=', value: 1, createdAt: 'x' } as const;
  assert.equal(watchCrossingInputs([y], [{ iso3: 'BRA', countryName: 'Brazil', yield10YPct: 14, yield10YSource: 'sample' } as never], null).inputs.length, 0);
  assert.equal(watchCrossingInputs([y], [{ iso3: 'BRA', countryName: 'Brazil', yield10YPct: 14, yield10YSource: 'official', yield10YPeriod: '2026-10' } as never], null).inputs.length, 1);
});

test('a trimmed events file: the hub carries on after the last event it read, missing none', () => {
  const dir = tmp();
  try {
    const files = eventFiles(dir);
    const store = new WebhookStore(files, null);
    const seen: string[] = [];
    const hub = new EventHub({ files, webhooks: store, urlProblem: () => null, broadcast: (e) => seen.push(e.summary), fetcher: async () => ({ status: 200, text: async () => '' }) });
    hub.start();
    emitEvents(files, [{ ...daily('2026-11-01T00:00:00Z'), summary: 'one' }, { ...daily('2026-11-02T00:00:00Z'), summary: 'two' }]);
    hub.pull();
    // Another process trims the file to the last event and appends a new one, all shorter than before.
    // Rewritten like trim() does (a new file renamed over the old one), padded so it is not shorter.
    const last = readEvents(files).at(-1)!;
    writeFileSync(`${files.events}.tmp`, '{"padding":"' + 'x'.repeat(400) + '"}\n' + JSON.stringify(last) + '\n');
    renameSync(`${files.events}.tmp`, files.events);
    emitEvents(files, [{ ...daily('2026-11-03T00:00:00Z'), summary: '3' }]);
    hub.pull();
    assert.deepEqual(seen, ['one', 'two', '3']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
