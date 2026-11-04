/**
 * Loaded into the server under test with NODE_OPTIONS="--import ...".
 * Replaces fetch so the server never touches the network: the official yield feeds answer with
 * fixed fixtures, and every other host fails at once, as if the machine were offline.
 * Each request is logged to stderr as "[offline-fetch] <url> key=<present|missing>" so tests can
 * check what the server asked for.
 */
const TESOURO_CSV = [
  'Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha',
  'Tesouro Prefixado com Juros Semestrais;01/01/2037;30/10/2026;15,23;15,35;800,10;795,22;795,01',
  'Tesouro Prefixado com Juros Semestrais;01/01/2035;30/10/2026;14,90;15,02;850,10;845,22;845,01',
].join('\r\n');

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  process.stderr.write(`[offline-fetch] ${url} key=${headers.has('key') ? 'present' : 'missing'}\n`);

  // FRED API: answers for Mexico only, refuses South Africa so the CSV fallback is exercised.
  if (url.includes('api.stlouisfed.org')) {
    if (url.includes('IRLTLT01MXM156N')) {
      return json({ observations: [{ date: '2026-09-01', value: '9.35' }, { date: '2026-08-01', value: '9.28' }] });
    }
    return json({ error_code: 400, error_message: 'Bad Request' }, 400);
  }
  // FRED CSV download (no key).
  if (url.includes('fredgraph.csv')) {
    const id = new URL(url).searchParams.get('id');
    return new Response(`observation_date,${id}\n2026-07-01,8.60\n2026-08-01,8.71\n2026-09-01,.\n`, { status: 200 });
  }
  // Brazil Treasury, Tesouro Direto.
  if (url.includes('tesourotransparente.gov.br')) return new Response(TESOURO_CSV, { status: 200 });
  // Turkey, CBRT EVDS3: the key must arrive in the "key" header and never in the URL.
  if (url.includes('evds3.tcmb.gov.tr')) {
    if (!headers.has('key') || /[?&]key=/i.test(url)) return json({ error: "Required request header 'key' is not present" }, 403);
    return json({ totalCount: 2, items: [{ Tarih: '29-10-2026', TP_TEST_Y10: '31.85' }, { Tarih: '30-10-2026', TP_TEST_Y10: '31.92' }] });
  }
  // World Bank QEDS (source 22) and IDS (source 6): answer for Indonesia only.
  if (url.includes('api.worldbank.org') && url.includes('/IDN/')) {
    if (url.includes('source=22')) {
      const v = { '03': 3.1e9, '36': 2.4e9, '69': 4.0e9, '0912': 1.5e9 };
      return json([
        { page: 1, pages: 1, per_page: 200, total: 8 },
        ...[Object.entries(v).flatMap(([k, val]) => [
          { indicator: { id: `DT.AMT.DECT.CD.GG.${k}` }, countryiso3code: 'IDN', date: '2026Q2', value: val },
          { indicator: { id: `DT.AMT.DECT.CD.GG.${k}` }, countryiso3code: 'IDN', date: '2026Q1', value: val / 2 },
        ])],
      ]);
    }
    if (url.includes('/sources/6/')) {
      const rec = (series, year, value) => ({
        variable: [
          { concept: 'Country', id: 'IDN' },
          { concept: 'Series', id: series },
          { concept: 'Counterpart-Area', id: 'WLD' },
          { concept: 'Time', id: `YR${year}` },
        ],
        value,
      });
      return json({
        page: 1,
        source: {
          id: '6',
          data: [rec('DT.TDS.DPPG.CD', 2027, 25276253138.8), rec('DT.AMT.DPPG.CD', 2027, 17e9), rec('DT.TDS.DPPG.CD', 2028, 29924084687.9)],
        },
      });
    }
  }
  // BIS debt securities (CSV): answer for Indonesia (ID) only, values from the live 2026-11-04 answers.
  if (url.includes('stats.bis.org') && url.includes('/WS_DEBT_SEC2_PUB/Q.ID.')) {
    const head =
      'FREQ,ISSUER_RES,ISSUER_NAT,ISSUER_BUS_IMM,ISSUER_BUS_ULT,MARKET,ISSUE_TYPE,ISSUE_CUR_GROUP,ISSUE_CUR,ISSUE_OR_MAT,ISSUE_RE_MAT,ISSUE_RATE,ISSUE_RISK,ISSUE_COL,MEASURE,DECIMALS,UNIT_MEASURE,UNIT_MULT,COLLECTION,TIME_FORMAT,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_PRE_BREAK,OBS_CONF';
    const r = (cur, re, v) => `Q,ID,3P,2,1,C,A,${cur},TO1,A,${re},A,A,A,I,0,USD,6,,,2026-Q2,${v},A,,F`;
    return new Response([head, r('A', 'A', '88044'), r('A', 'U', '3615')].join('\n'), { status: 200 });
  }
  if (url.includes('stats.bis.org') && url.includes('/WS_NA_SEC_DSS/Q.N.ID.')) {
    const head =
      'FREQ,ADJUSTMENT,REF_AREA,COUNTERPART_AREA,REF_SECTOR,COUNTERPART_SECTOR,CONSOLIDATION,ACCOUNTING_ENTRY,STO,INSTR_ASSET,MATURITY,EXPENDITURE,UNIT_MEASURE,CURRENCY_DENOM,VALUATION,PRICES,TRANSFORMATION,CUST_BREAKDOWN,TITLE,UNIT_MULT,TIME_PERIOD,OBS_VALUE,OBS_STATUS';
    return new Response(`${head}\nQ,N,ID,XW,S13,S1,N,L,LE,F3,T,_Z,USD,_T,N,V,N,_T,"Indonesia - Debt sec, issued by gen govt",9,2026-Q1,507.4643714097,A\n`, { status: 200 });
  }
  throw new TypeError(`offline: ${new URL(url).host}`);
};
