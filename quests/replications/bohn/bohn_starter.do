* Starter for the Bohn fiscal reaction replication Quest (bra-bohn-replication).
*
* It loads the exact rows the app used and shows them. The estimate itself is yours to write:
* see README.md in this folder for the equation and what to report.
*
* Save the app's download as bohn-bra.csv next to this file, then: do bohn_starter.do

import delimited using "bohn-bra.csv", clear varnames(1)

summarize year
display "Method stated by the app: " method[1]
list year primary_balance_pct_gdp debt_lag_pct_gdp output_gap_pct, noobs clean

count if missing(output_gap_pct)
if r(N) == 0 display "Output gap included: yes"
else display "Output gap included: no (the app ran the regression without it)"

* ---------------------------------------------------------------------------------------------
* Your turn. Regress primary_balance_pct_gdp on debt_lag_pct_gdp (and output_gap_pct when it is
* included), with an intercept, by ordinary least squares, using every row in this file.
* Report the coefficient on debt_lag_pct_gdp to three decimals: that is your entry.
* Optional: Newey-West standard errors (tsset year, then newey) with lag
* floor(4 * (n / 100)^(2 / 9)), at least 1.
* ---------------------------------------------------------------------------------------------
