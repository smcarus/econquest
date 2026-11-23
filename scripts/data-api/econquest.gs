/**
 * EconQuest data for Google Sheets (Apps Script). See docs/DATA_API.md, "Google Sheets".
 *
 * Google Sheets fetches from Google's own computers, so this works only when the app is reachable on
 * the internet at an https address (a home server, docs/HOME_SERVER.md), not on http://localhost.
 *
 * 1. In the sheet: Extensions > Apps Script. Paste this whole file and save.
 * 2. Project Settings > Script properties: add ECONQUEST_URL (for example https://econ.example.org)
 *    and, for a copy with sign-in on, ECONQUEST_KEY (an API token with the read:data scope). The key
 *    stays in the script's settings, never in a cell, and travels in a header, never in the address.
 * 3. In a cell: =EQ_SERIES("BRA", "policy_rate"), =EQ_COUNTRY("BRA"),
 *    =EQ_PANEL("BRA,MEX", "policy_rate,cpi_monthly", "history") or =EQ_FIGURES("BRA", "2026-06-30").
 *
 * Nothing is estimated: a figure the app does not hold comes back empty, with the reason in its row,
 * and a series the app does not have shows the app's own "Missing" message in the cell.
 */

function eqProps_() {
  var p = PropertiesService.getScriptProperties();
  var base = String(p.getProperty('ECONQUEST_URL') || '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(base)) {
    throw new Error('Set ECONQUEST_URL in Project Settings > Script properties to the app\'s https address. Google Sheets cannot reach a copy on localhost.');
  }
  return { base: base, key: p.getProperty('ECONQUEST_KEY') || '' };
}

/** Reads one CSV text into rows, keeping quoted commas, quotes and line breaks. */
function eqParseCsv_(text) {
  var rows = [];
  var row = [];
  var cell = '';
  var quoted = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function eqGet_(path, query) {
  var cfg = eqProps_();
  var parts = ['bom=0'];
  for (var k in query || {}) {
    if (query[k] !== undefined && query[k] !== null && query[k] !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]));
  }
  var headers = {};
  if (cfg.key) headers['X-SMCR-API-Key'] = cfg.key;
  var res = UrlFetchApp.fetch(cfg.base + path + '?' + parts.join('&'), { headers: headers, muteHttpExceptions: true });
  var code = res.getResponseCode();
  var body = res.getContentText('UTF-8');
  if (code !== 200) {
    var msg = body;
    try { var j = JSON.parse(body); msg = j.message || j.error || body; } catch (e) { /* plain text */ }
    throw new Error('EconQuest ' + code + ': ' + msg);
  }
  var rows = eqParseCsv_(body);
  if (!rows.length) return [['No rows']];
  // value becomes a number; an empty value (Missing) stays empty. Every other column stays text.
  var vi = rows[0].indexOf('value');
  for (var r = 1; r < rows.length; r++) {
    if (vi >= 0) rows[r][vi] = rows[r][vi] === '' ? '' : Number(rows[r][vi]);
  }
  return rows;
}

function eqCode_(iso) { return encodeURIComponent(String(iso).trim().toUpperCase()); }

/**
 * One series from the app, one row per date.
 * @param {string} iso3 Country code, for example "BRA".
 * @param {string} id Series id, for example "policy_rate".
 * @customfunction
 */
function EQ_SERIES(iso3, id) {
  return eqGet_('/api/export/' + eqCode_(iso3) + '/series/' + encodeURIComponent(id) + '.csv');
}

/**
 * Every series the app holds for one country, as one long table.
 * @param {string} iso3 Country code.
 * @customfunction
 */
function EQ_COUNTRY(iso3) {
  return eqGet_('/api/export/' + eqCode_(iso3) + '/series.csv');
}

/**
 * Series not about one country (commodity prices, stress indexes).
 * @customfunction
 */
function EQ_WORLD() {
  return eqGet_('/api/export/world/series.csv');
}

/**
 * Countries by figures.
 * @param {string} countries For example "BRA,MEX" (up to 60).
 * @param {string} figures For example "policy_rate,cpi_monthly".
 * @param {string} mode "latest" (default) or "history".
 * @customfunction
 */
function EQ_PANEL(countries, figures, mode) {
  return eqGet_('/api/export/panel.csv', { countries: countries, figures: figures, mode: mode || 'latest' });
}

/**
 * The latest figures for one country, or as saved on a past day.
 * @param {string} iso3 Country code.
 * @param {string} asOf Optional day, YYYY-MM-DD.
 * @customfunction
 */
function EQ_FIGURES(iso3, asOf) {
  return eqGet_('/api/export/' + eqCode_(iso3) + '/figures.csv', { asOf: asOf });
}
