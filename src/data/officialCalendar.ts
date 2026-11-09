/**
 * Official scheduled events for the covered sovereigns.
 *
 * Every row was read on the source page listed, on the date in `retrieved`. Nothing
 * here is generated. When a central bank has not published a date (or the page could
 * not be read), there is no row, and the app says "no date on file" instead of guessing.
 *
 * To update: check the source page, edit the rows, bump `retrieved`.
 * Gaps at last check (2026-11-04):
 *   - Egypt (CBE): 2026-27 MPC schedule not readable from cbe.org.eg; no rows.
 *   - Turkey (CBRT): 2027 H2 dates not yet published.
 *   - Mexico (Banxico), Indonesia (BI): 2027 schedules not yet published.
 *   - CPI release calendars: only Mexico's INPC dates were found (secondary source). Superseded
 *     2026-11-09 (G10): CPI and GDP dates for the US, Canada, UK, China, Japan and Australia below.
 * Added 2026-11-08 from each bank's own page: Fed, ECB (shown for Germany, France and Italy), Bank
 * of Canada, RBA, Bank of Korea (2027 not yet published) and Bank of Russia. Not added that day:
 *   - India (RBI): the 2026-27 MPC schedule release was not reachable from the press release pages.
 *   - Egypt (CBE), Chile (BCCh), Poland (NBP): the pages refused an automated reader.
 *   - Argentina (BCRA) and Saudi Arabia (SAMA): no decision calendar found (BCRA announces by
 *     communiqué; SAMA's site gave no text). China: the LPR is published on the 20th of each month,
 *     moved for holidays, so dates are not listed until the holiday calendar is read.
 * Menu > Data health > Calendar flags sources read long ago and schedules running out.
 */

export type OfficialEventCategory = 'MPC_DECISION' | 'CPI_RELEASE' | 'GDP_RELEASE' | 'INFLATION_REPORT' | 'ELECTION' | 'BUDGET' | 'IMF_PROGRAMME';

/** Elections, budgets and IMF programme dates: the political and fiscal calendar. */
export const POLITICAL_FISCAL_CATEGORIES: OfficialEventCategory[] = ['ELECTION', 'BUDGET', 'IMF_PROGRAMME'];

export interface OfficialCalendarEvent {
  iso3: string;
  category: OfficialEventCategory;
  title: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  sourceName: string;
  sourceUrl: string;
  /** True when the date comes from the issuing institution's own page or document. */
  primarySource: boolean;
  retrieved: string;
  /**
   * How firm the date is. Missing = a fixed, announced date. 'legal_deadline' = the latest date
   * the law allows (the event can come earlier).
   */
  dateKind?: 'legal_deadline';
}

const RETRIEVED = '2026-11-04';

const BCB_SRC = {
  sourceName: 'BCB Copom calendar, as reported by Rankia / EuQueroInvestir',
  sourceUrl: 'https://rankia.com.br/proxima-reuniao-copom/',
  primarySource: false,
};
const CBRT_SRC = {
  sourceName: 'CBRT calendar',
  sourceUrl: 'https://www.tcmb.gov.tr/wps/wcm/connect/en/tcmb+en/main+menu/announcements/calendar',
  primarySource: true,
};
const SARB_SRC = {
  sourceName: 'SARB MPC dates',
  sourceUrl: 'https://www.resbank.co.za/MonetaryPolicy/Monetary%20Policy%20Committee/Pages/Dates.aspx',
  primarySource: true,
};
const BANXICO_SRC = {
  sourceName: 'Banxico 2026 monetary policy calendar',
  sourceUrl:
    'https://www.banxico.org.mx/politica-monetaria/d/%7B3B4BDA5B-E7E8-E414-2066-DA0CB3F7C36F%7D.pdf',
  primarySource: true,
};
const INPC_SRC = {
  sourceName: 'INEGI release dates, as listed in BBVA Research Agenda Económica 2026',
  sourceUrl: 'https://www.bbvaresearch.com/wp-content/uploads/2026/03/AgendaEconomica_2026.pdf',
  primarySource: false,
};
const BI_SRC = {
  sourceName: 'Bank Indonesia Board of Governors meeting schedule',
  sourceUrl: 'https://www.bi.go.id/en/publikasi/kalender/default.aspx',
  primarySource: true,
};
const BOJ_SRC = {
  sourceName: 'Bank of Japan MPM schedule',
  sourceUrl: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',
  primarySource: true,
};
const BOE_SRC = {
  sourceName: 'Bank of England upcoming MPC dates',
  sourceUrl: 'https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates',
  primarySource: true,
};

const R8 = '2026-11-08';
const FED_SRC = { sourceName: 'Federal Reserve FOMC meeting calendar (each date tentative until confirmed at the meeting before)', sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', primarySource: true, retrieved: R8 };
const ECB_SRC = { sourceName: 'ECB Governing Council meeting calendar (monetary policy meetings, day 2)', sourceUrl: 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html', primarySource: true, retrieved: R8 };
const BOC_SRC = { sourceName: 'Bank of Canada schedule of interest rate announcements', sourceUrl: 'https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/', primarySource: true, retrieved: R8 };
const RBA_SRC = { sourceName: 'RBA Monetary Policy Board meeting schedule (decision on day 2)', sourceUrl: 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', primarySource: true, retrieved: R8 };
const BOK_SRC = { sourceName: 'Bank of Korea Monetary Policy Board meeting dates (2027 not yet published)', sourceUrl: 'https://www.bok.or.kr/eng/main/contents.do?menuNo=400020', primarySource: true, retrieved: R8 };
const CBR_SRC = { sourceName: 'Bank of Russia calendar of key rate meetings', sourceUrl: 'https://www.cbr.ru/eng/dkp/cal_mp/', primarySource: true, retrieved: R8 };

/*
 * Statistics release dates (data plan G10), read 2026-11-09 from each office's own calendar. The
 * GDP rows are each quarter's first estimate (advance, flash or first preliminary). Offices whose
 * calendar could not be read are in RELEASE_GAPS below with the reason.
 */
const R9 = '2026-11-09';
const STAT = (sourceName: string, sourceUrl: string) => ({ sourceName, sourceUrl, primarySource: true, retrieved: R9 });
const BLS_SRC = STAT('BLS CPI release schedule', 'https://www.bls.gov/schedule/news_release/cpi.htm');
const BEA_SRC = STAT('BEA release schedule', 'https://www.bea.gov/news/schedule/full');
const STATCAN_SRC = STAT('Statistics Canada 2026-2027 release dates', 'https://www150.statcan.gc.ca/release-diffusion/2026-eng.pdf');
const ONS_SRC = STAT('ONS release calendar', 'https://www.ons.gov.uk/releasecalendar');
const NBS_SRC = STAT('NBS regular press release calendar 2026 (dates preliminary)', 'https://www.stats.gov.cn/english/PressRelease/ReleaseCalendar/202512/t20251226_1962154.html');
const SBJ_SRC = STAT('Statistics Bureau of Japan CPI release schedule', 'https://www.stat.go.jp/english/data/cpi/1582.html');
const ESRI_SRC = STAT('Cabinet Office (ESRI) GDP release schedule', 'https://www.esri.cao.go.jp/en/sna/kouhyou/kouhyou_top.html');
const ABS_SRC = STAT('ABS release calendar (rolling six months)', 'https://www.abs.gov.au/release-calendar/future-releases');

type Row = [iso3: string, category: OfficialEventCategory, title: string, date: string];

function rows(src: Omit<OfficialCalendarEvent, 'iso3' | 'category' | 'title' | 'date' | 'retrieved'> & { retrieved?: string }, list: Row[]): OfficialCalendarEvent[] {
  return list.map(([iso3, category, title, date]) => ({ iso3, category, title, date, ...src, retrieved: src.retrieved || RETRIEVED }));
}

const COPOM = 'BCB Copom Selic rate decision';
const CBRT = 'CBRT MPC policy rate decision';
const SARB = 'SARB MPC repo rate announcement';
const BANXICO = 'Banxico monetary policy decision';
const BI = 'Bank Indonesia BI-Rate decision (Board of Governors meeting, day 2)';
const BOJ = 'BoJ Monetary Policy Meeting decision';
const BOE = 'BoE MPC Bank Rate decision';
const FED = 'FOMC federal funds rate decision';
const ECB = 'ECB Governing Council monetary policy decision (euro area)';
const BOC = 'Bank of Canada interest rate announcement';
const RBA = 'RBA cash rate decision';
const BOK = 'Bank of Korea Base Rate decision';
const CBR = 'Bank of Russia key rate decision';

/*
 * Elections, budgets and IMF programmes. Checked 2026-11-04. Budget rows are the deadline the
 * constitution sets for sending next year's budget to parliament, so they are "no later than"
 * dates. Brazil's deadline (ADCT art. 35) is not listed: its source page could not be read.
 */
const PF = (sourceName: string, sourceUrl: string, primarySource: boolean, dateKind?: 'legal_deadline') => ({
  sourceName,
  sourceUrl,
  primarySource,
  ...(dateKind ? { dateKind } : {}),
});
const POLITICAL_FISCAL: OfficialCalendarEvent[] = [
  ...rows(PF('Government Gazette, via SAnews', 'https://www.sanews.gov.za/south-africa/minister-gazettes-date-local-government-elections', true), [
    ['ZAF', 'ELECTION', 'Local government elections', '2026-11-04'],
  ]),
  ...rows(PF('The National, 29 Oct 2026 (final review targeted for mid-December)', 'https://www.thenationalnews.com/news/us/2026/10/29/imf-sets-december-target-to-clear-egypts-last-programme-review/', false), [
    ['EGY', 'IMF_PROGRAMME', 'IMF EFF arrangement ends; final review due before', '2026-12-15'],
  ]),
  ...rows(PF('Constitution of Egypt, Art. 124 (90 days before the 1 July fiscal year)', 'https://ictpolicyafrica.org/en/document/m48snpc5dgn?page=34', true, 'legal_deadline'), [
    ['EGY', 'BUDGET', 'FY2027/28 budget due in parliament', '2027-04-02'],
  ]),
  ...rows(PF('Constitution of Mexico, Art. 74 IV (by 8 September)', 'https://leyes-mx.com/constitucion/74.htm', true, 'legal_deadline'), [
    ['MEX', 'BUDGET', '2028 budget package (Paquete Económico) due in Congress', '2027-09-08'],
  ]),
  ...rows(PF('Constitution of Poland, Art. 222 (3 months before the fiscal year)', 'https://www.senat.gov.pl/en/about-the-senate/konstytucja/chapter-x/', true, 'legal_deadline'), [
    ['POL', 'BUDGET', 'Draft 2028 budget due in the Sejm', '2027-09-30'],
  ]),
  ...rows(PF('Constitution of Chile, Art. 67 (3 months before the fiscal year)', 'https://iura.cl/cpr/67', true, 'legal_deadline'), [
    ['CHL', 'BUDGET', '2028 budget bill due in Congress', '2027-09-30'],
  ]),
  ...rows(PF('Constitution of Turkey (75 days before the fiscal year)', 'https://constitution.org/1-Constitution/cons/turkey/part4.htm', true, 'legal_deadline'), [
    ['TUR', 'BUDGET', '2028 budget bill due in the Grand National Assembly', '2027-10-18'],
  ]),
];

export const OFFICIAL_CALENDAR: OfficialCalendarEvent[] = [
  ...POLITICAL_FISCAL,
  ...rows(BCB_SRC, [
    ['BRA', 'MPC_DECISION', COPOM, '2026-11-04'],
    ['BRA', 'MPC_DECISION', COPOM, '2026-12-09'],
    ['BRA', 'MPC_DECISION', COPOM, '2027-01-27'],
    ['BRA', 'MPC_DECISION', COPOM, '2027-03-17'],
    ['BRA', 'MPC_DECISION', COPOM, '2027-04-28'],
    ['BRA', 'MPC_DECISION', COPOM, '2027-06-16'],
    ['BRA', 'MPC_DECISION', COPOM, '2027-08-04'],
    ['BRA', 'MPC_DECISION', COPOM, '2027-09-22'],
    ['BRA', 'MPC_DECISION', COPOM, '2027-10-27'],
    ['BRA', 'MPC_DECISION', COPOM, '2027-12-08'],
  ]),
  ...rows(CBRT_SRC, [
    ['TUR', 'INFLATION_REPORT', 'CBRT Inflation Report', '2026-11-12'],
    ['TUR', 'MPC_DECISION', CBRT, '2026-12-10'],
    ['TUR', 'MPC_DECISION', CBRT, '2027-01-21'],
    ['TUR', 'MPC_DECISION', CBRT, '2027-03-18'],
    ['TUR', 'MPC_DECISION', CBRT, '2027-04-22'],
    ['TUR', 'MPC_DECISION', CBRT, '2027-06-10'],
  ]),
  ...rows(SARB_SRC, [
    ['ZAF', 'MPC_DECISION', SARB, '2026-11-19'],
    ['ZAF', 'MPC_DECISION', SARB, '2027-01-28'],
    ['ZAF', 'MPC_DECISION', SARB, '2027-03-18'],
    ['ZAF', 'MPC_DECISION', SARB, '2027-05-27'],
    ['ZAF', 'MPC_DECISION', SARB, '2027-07-22'],
    ['ZAF', 'MPC_DECISION', SARB, '2027-09-29'],
    ['ZAF', 'MPC_DECISION', SARB, '2027-11-25'],
  ]),
  ...rows(BANXICO_SRC, [
    ['MEX', 'MPC_DECISION', BANXICO, '2026-11-05'],
    ['MEX', 'INFLATION_REPORT', 'Banxico Quarterly Inflation Report (Q3 2026)', '2026-11-26'],
    ['MEX', 'MPC_DECISION', BANXICO, '2026-12-17'],
  ]),
  ...rows(INPC_SRC, [
    ['MEX', 'CPI_RELEASE', 'INEGI CPI (INPC), October', '2026-11-09'],
    ['MEX', 'CPI_RELEASE', 'INEGI CPI (INPC), first half of November', '2026-11-24'],
    ['MEX', 'CPI_RELEASE', 'INEGI CPI (INPC), November', '2026-12-09'],
    ['MEX', 'CPI_RELEASE', 'INEGI CPI (INPC), first half of December', '2026-12-23'],
  ]),
  ...rows(BI_SRC, [
    ['IDN', 'MPC_DECISION', BI, '2026-11-18'],
    ['IDN', 'MPC_DECISION', BI, '2026-12-16'],
  ]),
  ...rows(BOJ_SRC, [
    ['JPN', 'MPC_DECISION', BOJ, '2026-12-18'],
    ['JPN', 'MPC_DECISION', BOJ, '2027-01-22'],
    ['JPN', 'MPC_DECISION', BOJ, '2027-03-18'],
    ['JPN', 'MPC_DECISION', BOJ, '2027-04-28'],
    ['JPN', 'MPC_DECISION', BOJ, '2027-06-11'],
    ['JPN', 'MPC_DECISION', BOJ, '2027-07-22'],
    ['JPN', 'MPC_DECISION', BOJ, '2027-09-22'],
    ['JPN', 'MPC_DECISION', BOJ, '2027-10-29'],
    ['JPN', 'MPC_DECISION', BOJ, '2027-12-17'],
  ]),
  ...rows(BOE_SRC, [
    ['GBR', 'MPC_DECISION', BOE, '2026-11-05'],
    ['GBR', 'MPC_DECISION', BOE, '2026-12-17'],
    ['GBR', 'MPC_DECISION', BOE, '2027-02-04'],
    ['GBR', 'MPC_DECISION', BOE, '2027-03-18'],
    ['GBR', 'MPC_DECISION', BOE, '2027-04-29'],
    ['GBR', 'MPC_DECISION', BOE, '2027-06-17'],
    ['GBR', 'MPC_DECISION', BOE, '2027-07-29'],
    ['GBR', 'MPC_DECISION', BOE, '2027-09-16'],
    ['GBR', 'MPC_DECISION', BOE, '2027-11-04'],
    ['GBR', 'MPC_DECISION', BOE, '2027-12-16'],
  ]),
  ...rows(FED_SRC, [
    ['USA', 'MPC_DECISION', FED, '2026-12-09'],
    ['USA', 'MPC_DECISION', FED, '2027-01-27'],
    ['USA', 'MPC_DECISION', FED, '2027-03-17'],
    ['USA', 'MPC_DECISION', FED, '2027-04-28'],
    ['USA', 'MPC_DECISION', FED, '2027-06-09'],
    ['USA', 'MPC_DECISION', FED, '2027-07-28'],
    ['USA', 'MPC_DECISION', FED, '2027-09-15'],
    ['USA', 'MPC_DECISION', FED, '2027-10-27'],
    ['USA', 'MPC_DECISION', FED, '2027-12-08'],
  ]),
  ...rows(ECB_SRC, [
    ['DEU', 'MPC_DECISION', ECB, '2026-12-17'],
    ['DEU', 'MPC_DECISION', ECB, '2027-02-04'],
    ['DEU', 'MPC_DECISION', ECB, '2027-03-18'],
    ['DEU', 'MPC_DECISION', ECB, '2027-04-29'],
    ['DEU', 'MPC_DECISION', ECB, '2027-06-10'],
    ['DEU', 'MPC_DECISION', ECB, '2027-07-22'],
    ['DEU', 'MPC_DECISION', ECB, '2027-09-09'],
    ['DEU', 'MPC_DECISION', ECB, '2027-10-28'],
    ['DEU', 'MPC_DECISION', ECB, '2027-12-16'],
  ]),
  ...rows(ECB_SRC, [
    ['FRA', 'MPC_DECISION', ECB, '2026-12-17'],
    ['FRA', 'MPC_DECISION', ECB, '2027-02-04'],
    ['FRA', 'MPC_DECISION', ECB, '2027-03-18'],
    ['FRA', 'MPC_DECISION', ECB, '2027-04-29'],
    ['FRA', 'MPC_DECISION', ECB, '2027-06-10'],
    ['FRA', 'MPC_DECISION', ECB, '2027-07-22'],
    ['FRA', 'MPC_DECISION', ECB, '2027-09-09'],
    ['FRA', 'MPC_DECISION', ECB, '2027-10-28'],
    ['FRA', 'MPC_DECISION', ECB, '2027-12-16'],
  ]),
  ...rows(ECB_SRC, [
    ['ITA', 'MPC_DECISION', ECB, '2026-12-17'],
    ['ITA', 'MPC_DECISION', ECB, '2027-02-04'],
    ['ITA', 'MPC_DECISION', ECB, '2027-03-18'],
    ['ITA', 'MPC_DECISION', ECB, '2027-04-29'],
    ['ITA', 'MPC_DECISION', ECB, '2027-06-10'],
    ['ITA', 'MPC_DECISION', ECB, '2027-07-22'],
    ['ITA', 'MPC_DECISION', ECB, '2027-09-09'],
    ['ITA', 'MPC_DECISION', ECB, '2027-10-28'],
    ['ITA', 'MPC_DECISION', ECB, '2027-12-16'],
  ]),
  ...rows(BOC_SRC, [
    ['CAN', 'MPC_DECISION', BOC, '2026-12-09'],
    ['CAN', 'MPC_DECISION', BOC, '2027-01-27'],
    ['CAN', 'MPC_DECISION', BOC, '2027-03-03'],
    ['CAN', 'MPC_DECISION', BOC, '2027-04-28'],
    ['CAN', 'MPC_DECISION', BOC, '2027-06-02'],
    ['CAN', 'MPC_DECISION', BOC, '2027-07-21'],
    ['CAN', 'MPC_DECISION', BOC, '2027-09-08'],
    ['CAN', 'MPC_DECISION', BOC, '2027-10-27'],
    ['CAN', 'MPC_DECISION', BOC, '2027-12-08'],
  ]),
  ...rows(RBA_SRC, [
    ['AUS', 'MPC_DECISION', RBA, '2026-11-03'],
    ['AUS', 'MPC_DECISION', RBA, '2026-12-08'],
    ['AUS', 'MPC_DECISION', RBA, '2027-02-09'],
    ['AUS', 'MPC_DECISION', RBA, '2027-03-23'],
    ['AUS', 'MPC_DECISION', RBA, '2027-05-04'],
    ['AUS', 'MPC_DECISION', RBA, '2027-06-22'],
    ['AUS', 'MPC_DECISION', RBA, '2027-08-10'],
    ['AUS', 'MPC_DECISION', RBA, '2027-09-28'],
    ['AUS', 'MPC_DECISION', RBA, '2027-11-02'],
    ['AUS', 'MPC_DECISION', RBA, '2027-12-14'],
  ]),
  ...rows(BOK_SRC, [
    ['KOR', 'MPC_DECISION', BOK, '2026-11-26'],
  ]),
  ...rows(CBR_SRC, [
    ['RUS', 'MPC_DECISION', CBR, '2026-12-18'],
    ['RUS', 'MPC_DECISION', CBR, '2027-02-12'],
    ['RUS', 'MPC_DECISION', CBR, '2027-03-19'],
    ['RUS', 'MPC_DECISION', CBR, '2027-04-30'],
    ['RUS', 'MPC_DECISION', CBR, '2027-06-11'],
    ['RUS', 'MPC_DECISION', CBR, '2027-07-30'],
    ['RUS', 'MPC_DECISION', CBR, '2027-09-10'],
    ['RUS', 'MPC_DECISION', CBR, '2027-10-22'],
    ['RUS', 'MPC_DECISION', CBR, '2027-12-17'],
  ]),
  ...rows(BLS_SRC, [
    ['USA', 'CPI_RELEASE', 'BLS CPI, October 2026', '2026-11-10'],
    ['USA', 'CPI_RELEASE', 'BLS CPI, November 2026', '2026-12-10'],
    ['USA', 'CPI_RELEASE', 'BLS CPI, December 2026', '2027-01-13'],
    ['USA', 'CPI_RELEASE', 'BLS CPI, January 2027', '2027-02-11'],
    ['USA', 'CPI_RELEASE', 'BLS CPI, February 2027', '2027-03-10'],
    ['USA', 'CPI_RELEASE', 'BLS CPI, March 2027', '2027-04-13'],
    ['USA', 'CPI_RELEASE', 'BLS CPI, April 2027', '2027-05-12'],
    ['USA', 'CPI_RELEASE', 'BLS CPI, May 2027', '2027-06-10'],
  ]),
  ...rows(BEA_SRC, [
    ['USA', 'GDP_RELEASE', 'BEA GDP advance estimate, Q4 2026', '2027-01-28'],
    ['USA', 'GDP_RELEASE', 'BEA GDP advance estimate, Q1 2027', '2027-04-29'],
  ]),
  ...rows(STATCAN_SRC, [
    ['CAN', 'CPI_RELEASE', 'Statistics Canada CPI, October 2026', '2026-11-16'],
    ['CAN', 'CPI_RELEASE', 'Statistics Canada CPI, November 2026', '2026-12-14'],
    ['CAN', 'CPI_RELEASE', 'Statistics Canada CPI, December 2026', '2027-01-18'],
    ['CAN', 'CPI_RELEASE', 'Statistics Canada CPI, January 2027', '2027-02-16'],
    ['CAN', 'CPI_RELEASE', 'Statistics Canada CPI, February 2027', '2027-03-15'],
    ['CAN', 'GDP_RELEASE', 'Statistics Canada GDP, income and expenditure, Q3 2026', '2026-11-30'],
    ['CAN', 'GDP_RELEASE', 'Statistics Canada GDP, income and expenditure, Q4 2026', '2027-03-01'],
  ]),
  ...rows(ONS_SRC, [
    ['GBR', 'GDP_RELEASE', 'ONS GDP first quarterly estimate, Q3 2026', '2026-11-12'],
    ['GBR', 'CPI_RELEASE', 'ONS consumer price inflation, October 2026', '2026-11-18'],
    ['GBR', 'CPI_RELEASE', 'ONS consumer price inflation, November 2026', '2026-12-16'],
    ['GBR', 'CPI_RELEASE', 'ONS consumer price inflation, December 2026', '2027-01-20'],
    ['GBR', 'GDP_RELEASE', 'ONS GDP first quarterly estimate, Q4 2026', '2027-02-12'],
    ['GBR', 'CPI_RELEASE', 'ONS consumer price inflation, January 2027', '2027-02-17'],
    ['GBR', 'CPI_RELEASE', 'ONS consumer price inflation, February 2027', '2027-03-24'],
    ['GBR', 'CPI_RELEASE', 'ONS consumer price inflation, March 2027', '2027-04-21'],
    ['GBR', 'GDP_RELEASE', 'ONS GDP first quarterly estimate, Q1 2027', '2027-05-14'],
    ['GBR', 'CPI_RELEASE', 'ONS consumer price inflation, April 2027', '2027-05-19'],
  ]),
  ...rows(NBS_SRC, [
    ['CHN', 'CPI_RELEASE', 'NBS CPI, October 2026', '2026-11-09'],
    ['CHN', 'CPI_RELEASE', 'NBS CPI, November 2026', '2026-12-09'],
  ]),
  ...rows(SBJ_SRC, [
    ['JPN', 'CPI_RELEASE', 'Japan CPI, October 2026', '2026-11-20'],
    ['JPN', 'CPI_RELEASE', 'Japan CPI, November 2026', '2026-12-18'],
    ['JPN', 'CPI_RELEASE', 'Japan CPI, December 2026', '2027-01-22'],
    ['JPN', 'CPI_RELEASE', 'Japan CPI, January 2027', '2027-02-19'],
    ['JPN', 'CPI_RELEASE', 'Japan CPI, February 2027', '2027-03-19'],
  ]),
  ...rows(ESRI_SRC, [
    ['JPN', 'GDP_RELEASE', 'Japan GDP first preliminary estimate, Q3 2026', '2026-11-16'],
    ['JPN', 'GDP_RELEASE', 'Japan GDP first preliminary estimate, Q4 2026', '2027-02-15'],
  ]),
  ...rows(ABS_SRC, [
    ['AUS', 'CPI_RELEASE', 'ABS monthly CPI, October 2026', '2026-11-26'],
    ['AUS', 'GDP_RELEASE', 'ABS national accounts, September quarter 2026', '2026-12-02'],
    ['AUS', 'CPI_RELEASE', 'ABS monthly CPI, November 2026', '2027-01-06'],
    ['AUS', 'CPI_RELEASE', 'ABS monthly CPI, December 2026', '2027-01-27'],
    ['AUS', 'CPI_RELEASE', 'ABS monthly CPI, January 2027', '2027-02-25'],
    ['AUS', 'GDP_RELEASE', 'ABS national accounts, December quarter 2026', '2027-03-04'],
    ['AUS', 'CPI_RELEASE', 'ABS monthly CPI, February 2027', '2027-03-24'],
    ['AUS', 'CPI_RELEASE', 'ABS monthly CPI, March 2027', '2027-04-29'],
  ]),
];

/** Whole days from today (local) to an event date; negative once the date has passed. */
export function daysUntil(dateIso: string, now: Date = new Date()): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  const event = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((event - today) / 86400000);
}

/** Next event (today or later) of a category for a country, or null when none is on file. */
export function nextOfficialEvent(
  iso3: string,
  category: OfficialEventCategory,
  now: Date = new Date()
): (OfficialCalendarEvent & { daysUntil: number }) | null {
  const upcoming = OFFICIAL_CALENDAR.filter((e) => e.iso3 === iso3 && e.category === category)
    .map((e) => ({ ...e, daysUntil: daysUntil(e.date, now) }))
    .filter((e) => e.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming[0] || null;
}

/** All upcoming official events within `horizonDays` for the given countries. */
export function upcomingOfficialEvents(
  iso3s: string[],
  horizonDays: number,
  now: Date = new Date()
): Array<OfficialCalendarEvent & { daysUntil: number }> {
  const set = new Set(iso3s);
  return OFFICIAL_CALENDAR.filter((e) => set.has(e.iso3))
    .map((e) => ({ ...e, daysUntil: daysUntil(e.date, now) }))
    .filter((e) => e.daysUntil >= 0 && e.daysUntil <= horizonDays)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.iso3.localeCompare(b.iso3));
}

/** True when central bank or statistics dates are on file (elections and budgets don't count). */
export function hasOfficialSchedule(iso3: string): boolean {
  return OFFICIAL_CALENDAR.some((e) => e.iso3 === iso3 && !POLITICAL_FISCAL_CATEGORIES.includes(e.category));
}

/** The two statistics releases the calendar tracks per country (data plan G10). */
export type ReleaseCategory = 'CPI_RELEASE' | 'GDP_RELEASE';

/**
 * Why a country has no CPI or GDP release date on file, where the office's calendar was looked
 * for and could not be read (data plan G10). Read 2026-11-09. A country not listed here simply has
 * not been checked yet. Nothing is ever estimated from a usual release pattern.
 */
export const RELEASE_GAPS: Record<string, Partial<Record<ReleaseCategory, string>>> = {
  CHN: { GDP_RELEASE: "The NBS 2026 calendar has no more GDP releases this year, and its 2027 calendar is not out yet." },
  DEU: { CPI_RELEASE: "Destatis's release calendar refused an automated reader.", GDP_RELEASE: "Destatis's release calendar refused an automated reader." },
  FRA: { CPI_RELEASE: "INSEE's release calendar builds its table in the browser, so its dates could not be read.", GDP_RELEASE: "INSEE's release calendar builds its table in the browser, so its dates could not be read." },
  ITA: { CPI_RELEASE: "Istat's release calendar gave a server error.", GDP_RELEASE: "Istat's release calendar gave a server error." },
  KOR: { CPI_RELEASE: "Statistics Korea's calendar now redirects to a new site that has not been checked yet.", GDP_RELEASE: "The Bank of Korea's English site shows no GDP release calendar." },
  IND: { CPI_RELEASE: "MoSPI's release calendar builds its table in the browser, so its dates could not be read.", GDP_RELEASE: "MoSPI's release calendar builds its table in the browser, so its dates could not be read." },
  IDN: { CPI_RELEASE: "BPS's release schedule refused an automated reader.", GDP_RELEASE: "BPS's release schedule refused an automated reader." },
  BRA: { CPI_RELEASE: "IBGE's release calendar refused an automated reader.", GDP_RELEASE: "IBGE's release calendar refused an automated reader." },
  MEX: { GDP_RELEASE: "INEGI's calendar link no longer works; CPI dates come from a secondary source." },
  ARG: { CPI_RELEASE: "INDEC's calendar builds its dates in the browser, so they could not be read.", GDP_RELEASE: "INDEC's calendar builds its dates in the browser, so they could not be read." },
  ZAF: { CPI_RELEASE: "Stats SA's release schedule refused an automated reader.", GDP_RELEASE: "Stats SA's release schedule refused an automated reader." },
  TUR: { CPI_RELEASE: "TurkStat's site asks automated readers to stay away (robots.txt), so it was not read.", GDP_RELEASE: "TurkStat's site asks automated readers to stay away (robots.txt), so it was not read." },
  RUS: { CPI_RELEASE: "Rosstat's site asks automated readers to stay away (robots.txt), so it was not read.", GDP_RELEASE: "Rosstat's site asks automated readers to stay away (robots.txt), so it was not read." },
  SAU: { CPI_RELEASE: "GASTAT's release calendar refused an automated reader.", GDP_RELEASE: "GASTAT's release calendar refused an automated reader." },
};

const NOT_CHECKED = 'No release dates on file: this statistics office has not been checked yet.';

/** Why there is no upcoming release date for a country, in plain words. */
export function releaseGap(iso3: string, category: ReleaseCategory, now: Date = new Date()): string {
  const listed = OFFICIAL_CALENDAR.some((e) => e.iso3 === iso3 && e.category === category);
  if (listed && !nextOfficialEvent(iso3, category, now)) return 'Every listed date has passed: the next dates still need reading from the office\'s calendar.';
  return RELEASE_GAPS[iso3]?.[category] ?? NOT_CHECKED;
}

/** Short label for how firm a date is, for display next to it. */
export function dateKindLabel(e: Pick<OfficialCalendarEvent, 'dateKind'>): string | undefined {
  return e.dateKind === 'legal_deadline' ? 'latest date in law' : undefined;
}
