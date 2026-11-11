# Tests registered before their tools are built

These tests were fixed and hashed on 11 November 2026, before the tools that will run them exist
(Wave 0 of the build order). Writing the rule down first means building the tool cannot shape it.

| File | Step | Claim |
| --- | --- | --- |
| crisis_warning.json | G23 Crisis early-warning | A BIS credit-to-GDP gap above 10 points is followed by a systemic banking crisis within 3 years more often than usual |
| yield_curve_recession.json | G25 Yield curve | A year with the 10-year yield below the policy rate is followed by a fall in real GDP more often than usual |
| inflation_expectations_lead.json | G32 Behavioural finance agent | When households' expected price trends rose over the year, inflation is higher a year later more than half the time (EU countries) |

`manifest.json` holds each file's SHA-256. When a step is built, its file moves unchanged to
`docs/validation/preregistered/` (same hash), gets a model register entry and joins the Holm family
with the other tests. Changing a file before then needs a new version and a new hash, committed
before any run. `npm test` checks the hashes.

No forward record starts until the runner is built; the gain is that the rule is fixed now.
