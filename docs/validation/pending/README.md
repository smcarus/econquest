# Tests registered before their tools are built

These tests were fixed and hashed before the tools that will run them exist
(crisis_warning on 11 November 2026 in Wave 0 of the build order; scorecard_default on 13 November 2026). Writing the rule down first means building the tool cannot shape it.

| File | Step | Claim |
| --- | --- | --- |
| crisis_warning.json | G23 Crisis early-warning | A BIS credit-to-GDP gap above 10 points is followed by a systemic banking crisis within 3 years more often than usual |
| scorecard_default.json | Country risk scorecard (registered 13 November 2026) | A governance reading in the bottom quarter that year (average of the six WGI estimates) is followed by the start of a sovereign default within 3 years more often than usual |

inflation_expectations_lead.json (G32) moved to `docs/validation/preregistered/` unchanged on 12 November 2026, when its runner was built; yield_curve_recession.json (G25) moved the same way on 12 November 2026.

`manifest.json` holds each file's SHA-256. When a step is built, its file moves unchanged to
`docs/validation/preregistered/` (same hash), gets a model register entry and joins the Holm family
with the other tests. Changing a file before then needs a new version and a new hash, committed
before any run. `npm test` checks the hashes.

No forward record starts until the runner is built; the gain is that the rule is fixed now.
