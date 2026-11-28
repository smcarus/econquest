# Bohn 1998 replication challenge

**Languages:** English · [Español](README.es.md) · [Français](README.fr.md) · [Português](README.pt.md)

This folder goes with the Quest **"Reproduce the Bohn fiscal reaction estimate for Brazil"** (`bra-bohn-replication`). You rebuild one number the app shows, with your own code, from the same public data. If many people get the same number, readers can trust the app. If a careful script gets a different number, the app may be wrong, and that also solves the Quest.

## The idea in plain words

In 1998 Henning Bohn asked a simple question about the United States: when government debt is high, does the government run larger budget surpluses (before interest) the next year? If it does, debt tends to come back down over time. A positive response is a sign that, in the years studied, debt was kept on a sustainable path. No response does not prove debt is unsustainable; it only means the record gives no such assurance.

The app asks the same question for any country with enough IMF history. For this Quest the country is Brazil.

The equation is:

    primary balance(t) = a + rho × debt(t−1) + gamma × output gap(t) + error

- **primary balance**: the government's budget balance before interest payments, in % of GDP (IMF Fiscal Monitor).
- **debt(t−1)**: government debt at the end of the year before, in % of GDP (IMF World Economic Outlook).
- **output gap**: how far the economy is above or below its normal level, from the app's own estimate. It takes out the effect of good and bad years. When the gap does not cover enough years, the app leaves it out and says so.
- **rho** is the number you reproduce: how much the primary balance rises, in points of GDP, for each extra point of debt.

## Steps

1. **Get the data.** In the app, open **Research**, pick Brazil, then **History & data**, then the **Fiscal reaction** panel. Press **Download these rows (CSV)**. The file `bohn-bra.csv` holds every year the app used, the three columns above, and the method the app states (sources, sample years, settings). With the app running you can also read it straight from `http://localhost:3000/api/bohn/BRA.csv`.
2. **Open a starter.** Pick `bohn_starter.R`, `bohn_starter.py` or `bohn_starter.do`. Each one loads the file, prints the rows and says whether the output gap is included. None of them runs the regression: that part is yours.
3. **Write the estimate.** Ordinary least squares with an intercept, primary balance on last year's debt (and the output gap when it is included), using every row in the file. Report the coefficient on debt to three decimals.
4. **Optional: standard errors.** The app uses Newey-West standard errors with lag floor(4 × (n/100)^(2/9)), at least 1. They do not change rho, only how sure we can be about it.
5. **Publish your script** where anyone can read it (a GitHub repository or gist; the link starts with https://).
6. **Enter** in Menu > Quests: open the Quest, then either Log privately (on this computer only) or Prepare public entry (a pull request on GitHub). Give your figure, the link to your script and, if you like, a note: which data vintage you used and any difference you found.

## How it is settled

After entries close, the maintainer opens the same panel with the settings the Quest states and records the figure the app shows. An entry within the Quest's tolerance of that figure reproduces it. An entry that differs is not "wrong": if its notes show the app made a mistake, the maintainer records that, opens a fix, and the entry solves the Quest. Replications are listed on contributor pages and never ranked.

## Things to watch

- The IMF revises its history with each WEO edition. Use the file the app gives you and say which vintage it is (the method column names it).
- Years the IMF marks as projections are left out; only outturns are used.
- Bohn's own paper used United States data from 1916 to 1995 and extra controls for wartime spending. This Quest reproduces the app's version of the test on Brazil's IMF data, not the paper's table.

## Reading

- Bohn, H. (1998), "The Behavior of U.S. Public Debt and Deficits", *Quarterly Journal of Economics* 113(3), 949-963.
- Mendoza, E. G. and Ostry, J. D. (2008), "International evidence on fiscal solvency: Is fiscal policy 'responsible'?", *Journal of Monetary Economics* 55(6), 1081-1093.
- Newey, W. K. and West, K. D. (1987), "A Simple, Positive Semi-Definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix", *Econometrica* 55(3), 703-708.

This guide and the starter scripts are licensed under CC BY 4.0, like the rest of `quests/`.
