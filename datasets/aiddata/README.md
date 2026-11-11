# AidData: official lending from China (summary of GCDF 3.0)

`china-lending.json` holds, for each of 131 borrowing countries, the official loan commitments from
China's government and state lenders between 2000 and 2021, added up from AidData's Global Chinese
Development Finance Dataset, Version 3.0 (`AidDatasGlobalChineseDevelopmentFinanceDataset_v3.0.xlsx`,
downloaded from aiddata.org on 2026-11-11). Only the sums are shipped, not the project file. Read by
`src/utils/aiddataStore.ts`; shown in the issuer brief and by the Fiscal & Debt Agent.

**Rules** (src/utils/lowIncomeDebt.ts, `aiddataTable`): loans only; rows AidData recommends for
aggregates; firm commitments (pledges, cancelled and suspended loans left out); short-term loans
(mostly central bank currency swap drawdowns, which AidData records again each year they are rolled
over) and refinancing of earlier loans left out; Amount (Constant USD 2021). The recent figure is the
last five years of the file (2017-2021). These are amounts committed when each loan was signed, to
public and private borrowers, not money paid out or still owed.

**Licence:** Open Data Commons Attribution License (ODC-By 1.0). "Any use of the dataset and its
content must include appropriate attribution to AidData."

**Cite:** Custer, S., Dreher, A., Elston, T.B., Escobar, B., Fedorochko, R., Fuchs, A., Ghose, S., Lin,
J., Malik, A., Parks, B.C., Solomon, K., Strange, A., Tierney, M.J., Vlasto, L., Walsh, K., Wang, F.,
Zaleski, L., and Zhang, S. 2023. *Tracking Chinese Development Finance: An Application of AidData's
TUFF 3.0 Methodology.* Williamsburg, VA: AidData at William & Mary. And: Dreher, A., Fuchs, A., Parks,
B. C., Strange, A., & Tierney, M.J. 2022. *Banking on Beijing: The Aims and Impacts of China's Overseas
Development Program.* Cambridge University Press.

**Updating:** when AidData publishes a new version, put the file (or its .zip) in
`data/local/aiddata/` and run `npm run aiddata:summary` to rewrite this file. A file in
`data/local/aiddata/` is used directly and wins over this summary.
