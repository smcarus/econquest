/**
 * ISO 3166-1 alpha-3 to alpha-2 codes, all 249 countries and territories (from the ISO list as
 * packaged by pycountry, the same list as iso3166.ts and isoNumeric.ts), plus Kosovo, which has no
 * ISO code: the app uses the IMF's UVK (and the World Bank's XKX) for alpha-3 and the code XK that
 * the European Commission and most banks use for alpha-2. Outside systems can name a country by
 * either code; every API answer carries both. Pure data.
 */
export const ISO3_TO_ISO2: Readonly<Record<string, string>> = {
  ABW: 'AW', AFG: 'AF', AGO: 'AO', AIA: 'AI', ALA: 'AX', ALB: 'AL', AND: 'AD', ARE: 'AE', ARG: 'AR', ARM: 'AM',
  ASM: 'AS', ATA: 'AQ', ATF: 'TF', ATG: 'AG', AUS: 'AU', AUT: 'AT', AZE: 'AZ', BDI: 'BI', BEL: 'BE', BEN: 'BJ',
  BES: 'BQ', BFA: 'BF', BGD: 'BD', BGR: 'BG', BHR: 'BH', BHS: 'BS', BIH: 'BA', BLM: 'BL', BLR: 'BY', BLZ: 'BZ',
  BMU: 'BM', BOL: 'BO', BRA: 'BR', BRB: 'BB', BRN: 'BN', BTN: 'BT', BVT: 'BV', BWA: 'BW', CAF: 'CF', CAN: 'CA',
  CCK: 'CC', CHE: 'CH', CHL: 'CL', CHN: 'CN', CIV: 'CI', CMR: 'CM', COD: 'CD', COG: 'CG', COK: 'CK', COL: 'CO',
  COM: 'KM', CPV: 'CV', CRI: 'CR', CUB: 'CU', CUW: 'CW', CXR: 'CX', CYM: 'KY', CYP: 'CY', CZE: 'CZ', DEU: 'DE',
  DJI: 'DJ', DMA: 'DM', DNK: 'DK', DOM: 'DO', DZA: 'DZ', ECU: 'EC', EGY: 'EG', ERI: 'ER', ESH: 'EH', ESP: 'ES',
  EST: 'EE', ETH: 'ET', FIN: 'FI', FJI: 'FJ', FLK: 'FK', FRA: 'FR', FRO: 'FO', FSM: 'FM', GAB: 'GA', GBR: 'GB',
  GEO: 'GE', GGY: 'GG', GHA: 'GH', GIB: 'GI', GIN: 'GN', GLP: 'GP', GMB: 'GM', GNB: 'GW', GNQ: 'GQ', GRC: 'GR',
  GRD: 'GD', GRL: 'GL', GTM: 'GT', GUF: 'GF', GUM: 'GU', GUY: 'GY', HKG: 'HK', HMD: 'HM', HND: 'HN', HRV: 'HR',
  HTI: 'HT', HUN: 'HU', IDN: 'ID', IMN: 'IM', IND: 'IN', IOT: 'IO', IRL: 'IE', IRN: 'IR', IRQ: 'IQ', ISL: 'IS',
  ISR: 'IL', ITA: 'IT', JAM: 'JM', JEY: 'JE', JOR: 'JO', JPN: 'JP', KAZ: 'KZ', KEN: 'KE', KGZ: 'KG', KHM: 'KH',
  KIR: 'KI', KNA: 'KN', KOR: 'KR', KWT: 'KW', LAO: 'LA', LBN: 'LB', LBR: 'LR', LBY: 'LY', LCA: 'LC', LIE: 'LI',
  LKA: 'LK', LSO: 'LS', LTU: 'LT', LUX: 'LU', LVA: 'LV', MAC: 'MO', MAF: 'MF', MAR: 'MA', MCO: 'MC', MDA: 'MD',
  MDG: 'MG', MDV: 'MV', MEX: 'MX', MHL: 'MH', MKD: 'MK', MLI: 'ML', MLT: 'MT', MMR: 'MM', MNE: 'ME', MNG: 'MN',
  MNP: 'MP', MOZ: 'MZ', MRT: 'MR', MSR: 'MS', MTQ: 'MQ', MUS: 'MU', MWI: 'MW', MYS: 'MY', MYT: 'YT', NAM: 'NA',
  NCL: 'NC', NER: 'NE', NFK: 'NF', NGA: 'NG', NIC: 'NI', NIU: 'NU', NLD: 'NL', NOR: 'NO', NPL: 'NP', NRU: 'NR',
  NZL: 'NZ', OMN: 'OM', PAK: 'PK', PAN: 'PA', PCN: 'PN', PER: 'PE', PHL: 'PH', PLW: 'PW', PNG: 'PG', POL: 'PL',
  PRI: 'PR', PRK: 'KP', PRT: 'PT', PRY: 'PY', PSE: 'PS', PYF: 'PF', QAT: 'QA', REU: 'RE', ROU: 'RO', RUS: 'RU',
  RWA: 'RW', SAU: 'SA', SDN: 'SD', SEN: 'SN', SGP: 'SG', SGS: 'GS', SHN: 'SH', SJM: 'SJ', SLB: 'SB', SLE: 'SL',
  SLV: 'SV', SMR: 'SM', SOM: 'SO', SPM: 'PM', SRB: 'RS', SSD: 'SS', STP: 'ST', SUR: 'SR', SVK: 'SK', SVN: 'SI',
  SWE: 'SE', SWZ: 'SZ', SXM: 'SX', SYC: 'SC', SYR: 'SY', TCA: 'TC', TCD: 'TD', TGO: 'TG', THA: 'TH', TJK: 'TJ',
  TKL: 'TK', TKM: 'TM', TLS: 'TL', TON: 'TO', TTO: 'TT', TUN: 'TN', TUR: 'TR', TUV: 'TV', TWN: 'TW', TZA: 'TZ',
  UGA: 'UG', UKR: 'UA', UMI: 'UM', URY: 'UY', USA: 'US', UZB: 'UZ', VAT: 'VA', VCT: 'VC', VEN: 'VE', VGB: 'VG',
  VIR: 'VI', VNM: 'VN', VUT: 'VU', WLF: 'WF', WSM: 'WS', YEM: 'YE', ZAF: 'ZA', ZMB: 'ZM', ZWE: 'ZW',
  UVK: 'XK', XKX: 'XK',
};

const ISO2_TO_ISO3: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ISO3_TO_ISO2)
    .filter(([iso3]) => iso3 !== 'XKX')
    .map(([iso3, iso2]) => [iso2, iso3])
);

/** Alpha-2 code for an alpha-3 code, or null when the code is not a country (WORLD, a region). */
export function iso2For(iso3: string | null | undefined): string | null {
  return ISO3_TO_ISO2[String(iso3 || '').toUpperCase()] ?? null;
}

/**
 * The app's alpha-3 code for a country named by alpha-2 or alpha-3, any case ("br", "BRA").
 * Null when it is neither. Kosovo's XK gives UVK, the code the app's feeds use.
 */
export function iso3FromCode(code: string | null | undefined): string | null {
  const c = String(code || '').trim().toUpperCase();
  if (c.length === 3) return ISO3_TO_ISO2[c] ? c : null;
  if (c.length === 2) return ISO2_TO_ISO3[c] ?? null;
  return null;
}

/** Both codes for one country, as every API answer gives them. */
export function countryCodes(iso3: string): { iso2: string | null; iso3: string } {
  const up = String(iso3 || '').toUpperCase();
  return { iso2: iso2For(up), iso3: up };
}
