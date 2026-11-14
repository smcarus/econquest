# EconQuest data helper for R (docs/DATA_API.md). Base R only: no packages to install.
#
#   source("econquest.R")
#   rate   <- eq_series("BRA", "policy_rate")           # one row per date
#   every  <- eq_country_series("BRA")                  # every series for Brazil
#   panel  <- eq_panel(c("BRA", "MEX"), c("policy_rate", "cpi_monthly"), mode = "history")
#   past   <- eq_figures("BRA", as_of = "2026-06-30")   # figures as saved that day
#
# Every row keeps the unit, source and dates. Settings (or pass base= / key=):
#   ECONQUEST_URL  where the app runs, default http://localhost:3000 (Docker: http://localhost:3737)
#   ECONQUEST_KEY  only for a copy with sign-in on: the integration API key, sent in a header

eq_base <- function(base = NULL) {
  b <- if (!is.null(base)) base else Sys.getenv("ECONQUEST_URL", "http://localhost:3000")
  sub("/+$", "", b)
}

eq_get_csv <- function(path, query = list(), base = NULL, key = NULL) {
  query <- query[!vapply(query, is.null, logical(1))]
  q <- if (length(query)) paste0("?", paste(names(query), vapply(query, function(v) utils::URLencode(as.character(v), reserved = TRUE), ""), sep = "=", collapse = "&")) else ""
  u <- paste0(eq_base(base), path, q)
  k <- if (!is.null(key)) key else Sys.getenv("ECONQUEST_KEY", "")
  headers <- c("User-Agent" = "econquest-r-helper")
  if (nzchar(k)) headers <- c(headers, "X-SMCR-API-Key" = k)
  con <- url(u, headers = headers, encoding = "UTF-8-BOM")
  on.exit(close(con))
  df <- utils::read.csv(con, stringsAsFactors = FALSE, check.names = FALSE, encoding = "UTF-8")
  # A byte order mark must never end up in the first column name ("iso3", not "\ufeffiso3").
  names(df) <- sub("^(\ufeff|\u00ef\u00bb\u00bf)", "", names(df))
  if ("value" %in% names(df) && !is.numeric(df$value)) df$value <- suppressWarnings(as.numeric(df$value))
  df
}

eq_code <- function(iso3) utils::URLencode(toupper(iso3), reserved = TRUE)

eq_series <- function(iso3, series_id, base = NULL, key = NULL)
  eq_get_csv(paste0("/api/export/", eq_code(iso3), "/series/", utils::URLencode(series_id, reserved = TRUE), ".csv"), base = base, key = key)

eq_country_series <- function(iso3, base = NULL, key = NULL)
  eq_get_csv(paste0("/api/export/", eq_code(iso3), "/series.csv"), base = base, key = key)

eq_world_series <- function(base = NULL, key = NULL)
  eq_get_csv("/api/export/world/series.csv", base = base, key = key)

eq_panel <- function(countries, figures = NULL, mode = "latest", base = NULL, key = NULL)
  eq_get_csv("/api/export/panel.csv", list(countries = paste(countries, collapse = ","), figures = if (is.null(figures)) NULL else paste(figures, collapse = ","), mode = mode), base = base, key = key)

eq_figures <- function(iso3, as_of = NULL, base = NULL, key = NULL)
  eq_get_csv(paste0("/api/export/", eq_code(iso3), "/figures.csv"), list(asOf = as_of), base = base, key = key)
