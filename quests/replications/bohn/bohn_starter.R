# Starter for the Bohn fiscal reaction replication Quest (bra-bohn-replication).
#
# It loads the exact rows the app used and shows them. The estimate itself is yours to write:
# see README.md in this folder for the equation and what to report.
#
# Run:  Rscript bohn_starter.R bohn-bra.csv
#   or: Rscript bohn_starter.R http://localhost:3000/api/bohn/BRA.csv   (with the app running)
# Needs: base R only. For Newey-West you may use the sandwich package, or write it yourself.

args <- commandArgs(trailingOnly = TRUE)
source_file <- if (length(args) > 0) args[1] else "bohn-bra.csv"
rows <- read.csv(source_file, stringsAsFactors = FALSE)

cat(nrow(rows), "years,", min(rows$year), "to", max(rows$year), "\n")
cat("Method stated by the app:", rows$method[1], "\n")
print(rows[, c("year", "primary_balance_pct_gdp", "debt_lag_pct_gdp", "output_gap_pct")], row.names = FALSE)

with_gap <- all(!is.na(rows$output_gap_pct))
cat("Output gap included:", if (with_gap) "yes" else "no (the app ran the regression without it)", "\n")

# ---------------------------------------------------------------------------------------------
# Your turn. Regress primary_balance_pct_gdp on debt_lag_pct_gdp (and output_gap_pct when it is
# included), with an intercept, by ordinary least squares, using every row in this file.
# Report the coefficient on debt_lag_pct_gdp to three decimals: that is your entry.
# Optional: Newey-West standard errors with lag floor(4 * (n / 100)^(2 / 9)), at least 1.
# ---------------------------------------------------------------------------------------------
