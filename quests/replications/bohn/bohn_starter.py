"""
Starter for the Bohn fiscal reaction replication Quest (bra-bohn-replication).

It loads the exact rows the app used and shows them. The estimate itself is yours to write:
see README.md in this folder for the equation and what to report.

Run:  python bohn_starter.py bohn-bra.csv
  or: python bohn_starter.py http://localhost:3000/api/bohn/BRA.csv   (with the app running)
Needs: pandas. For the regression you may use statsmodels, numpy or your own code.
"""
import sys

import pandas as pd

source = sys.argv[1] if len(sys.argv) > 1 else "bohn-bra.csv"
rows = pd.read_csv(source)

print(f"{len(rows)} years, {rows['year'].min()} to {rows['year'].max()}")
print("Method stated by the app:", rows["method"].iloc[0])
print(rows[["year", "primary_balance_pct_gdp", "debt_lag_pct_gdp", "output_gap_pct"]].to_string(index=False))

with_gap = rows["output_gap_pct"].notna().all()
print("Output gap included:", "yes" if with_gap else "no (the app ran the regression without it)")

# ---------------------------------------------------------------------------------------------
# Your turn. Regress primary_balance_pct_gdp on debt_lag_pct_gdp (and output_gap_pct when it is
# included), with an intercept, by ordinary least squares, using every row in this file.
# Report the coefficient on debt_lag_pct_gdp to three decimals: that is your entry.
# Optional: Newey-West standard errors with lag floor(4 * (n / 100) ** (2 / 9)), at least 1.
# ---------------------------------------------------------------------------------------------
