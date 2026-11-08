* EconQuest data helper for Stata (docs/DATA_API.md). No add-ons to install.
*
*   do econquest.do
*   econquest_series BRA policy_rate            // one row per date
*   econquest_country BRA                       // every series for Brazil
*   econquest_panel BRA,MEX policy_rate,cpi_monthly history
*   econquest_figures BRA 2026-06-30            // figures as saved that day (leave the date off for latest)
*
* Each command replaces the data in memory (clear first if you need to keep it).
* Where the app runs: global ECONQUEST_URL, default http://localhost:3000 (Docker: http://localhost:3737).
* A copy with sign-in on needs the integration API key in global ECONQUEST_KEY; Stata cannot send a
* header itself, so the file is then fetched with curl (built into macOS, Windows 10+ and Linux).

capture program drop econquest_get
program define econquest_get
  args path
  local base "$ECONQUEST_URL"
  if "`base'" == "" local base "http://localhost:3000"
  local u "`base'`path'"
  if "$ECONQUEST_KEY" == "" {
    import delimited using "`u'", clear varnames(1) encoding("utf-8") stringcols(_all)
  }
  else {
    tempfile f
    shell curl -s -f -H "X-SMCR-API-Key: $ECONQUEST_KEY" -o "`f'" "`u'"
    import delimited using "`f'", clear varnames(1) encoding("utf-8") stringcols(_all)
  }
  capture destring value, replace
end

capture program drop econquest_series
program define econquest_series
  args iso3 id
  econquest_get "/api/export/`=upper("`iso3'")'/series/`id'.csv"
end

capture program drop econquest_country
program define econquest_country
  args iso3
  econquest_get "/api/export/`=upper("`iso3'")'/series.csv"
end

capture program drop econquest_panel
program define econquest_panel
  args countries figures mode
  if "`mode'" == "" local mode "latest"
  econquest_get "/api/export/panel.csv?countries=`countries'&figures=`figures'&mode=`mode'"
end

capture program drop econquest_figures
program define econquest_figures
  args iso3 asof
  local q ""
  if "`asof'" != "" local q "?asOf=`asof'"
  econquest_get "/api/export/`=upper("`iso3'")'/figures.csv`q'"
end
