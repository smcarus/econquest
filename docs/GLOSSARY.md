# Glossary

Plain-language explanations of the terms and figures EconQuest shows. Each entry says what the thing is, why it matters, and how to read it. The same text appears in the app under "What is this?" next to each figure, and in Menu > User manual > Glossary.

Nothing here is a figure for any country. Where the app has no live or official value it shows "Missing" with the reason, never a number from this page.

_Written from src/data/glossary.ts by `npm run docs:glossary`. Edit that file, not this one._

## Growth and jobs

### GDP (gross domestic product)

The value of everything a country produces in a year: goods, services and buildings, added up in money terms.

**Why it matters.** It is the standard measure of the size of an economy. Many other figures (debt, the budget, the current account) are shown as a share of GDP so countries of different sizes can be compared.

**Limits.** GDP measures output, not well-being. It says nothing about how income is shared, and it is revised for years after first release.

### Real GDP growth

How much more (or less) the economy produced this year than last year, after removing the effect of rising prices.

**Why it matters.** Growth drives jobs, wages and tax revenue. When growth is strong a government can carry more debt; when it falls, unemployment usually rises and budgets weaken.

**How to read it.** Above zero means the economy grew; below zero means it shrank. Two quarters of shrinking in a row are often called a recession. For fast-growing emerging economies, 4 to 6% a year is common; for rich economies, 1 to 2% is normal.

**Limits.** The app shows the IMF World Economic Outlook figure, which is a yearly number published twice a year and partly a forecast for the current year.

### Unemployment rate

The share of people who want a job and are looking for one but do not have one.

**Why it matters.** It is the most direct sign of hardship in the economy. Rising unemployment cuts spending, lowers tax revenue and often raises political pressure on the government.

**How to read it.** Higher is worse. What counts as normal differs a lot by country, so compare a country with its own past rather than with others.

**Limits.** People who have given up looking, or work informally, are not counted, so in many emerging economies the rate understates how many people lack decent work.

### Youth unemployment

The share of young people aged 15 to 24 who want a job and are looking for one but do not have one.

**Why it matters.** Young people are usually the first to lose work and the last to find it. Many young people out of work for a long time has often come before protests and unrest.

**How to read it.** Higher is worse. It is normally about twice the overall unemployment rate, so compare it with the country's own past.

**Limits.** This is the International Labour Organization's modelled estimate: where a country has not run a labour survey for a year, a model fills the gap. Students not looking for work are not counted as unemployed.

### Labour force participation

The share of people aged 15 and over who are working or looking for work.

**Why it matters.** An economy grows faster when more people work. A low or falling rate can mean people have given up looking, or that many women are kept out of paid work.

**How to read it.** Higher means more people take part in paid work. Most countries are between 50% and 75%. Ageing pulls it down, because retired people are counted.

**Limits.** This is the International Labour Organization's modelled estimate, so years without a survey are filled by a model. Unpaid work at home is not counted.

### Poverty rate (international poverty lines)

The share of people living on less than a fixed amount a day, the poverty line. The World Bank uses one line for extreme poverty and two higher lines that fit lower-middle-income and upper-middle-income countries. The amounts are in dollars at purchasing power parity, so a dollar buys the same in every country.

**Why it matters.** It shows how many people a policy change, a price rise or a crisis can push into hardship, which matters most in the poorest countries.

**How to read it.** Higher is worse. The lowest line measures extreme poverty; the higher lines show how many people are still poor by the standards of richer developing countries. The app shows the dollar amount, the survey year and whether the survey measured income or consumption.

**Limits.** It comes from household surveys that many countries run only every few years, so the latest figure can be old. The World Bank moves the lines from time to time when it updates price comparisons, so figures from before and after a change are not directly comparable.

### Age dependency ratio

How many children (under 15) and older people (over 64) there are for every 100 people of working age (15 to 64).

**Why it matters.** Fewer working-age people for each child or retired person means less income to pay for schools, pensions and health care. It changes slowly but shapes budgets for decades.

**How to read it.** Higher means more dependants for each working-age person. Young, fast-growing countries are high because of children; ageing rich countries are rising because of older people.

**Limits.** It counts by age only, so it ignores who actually works: many people aged 15 to 24 are students and many over 64 still work.

### Gini index (inequality)

One number for how evenly income (or spending) is shared among households, from 0 (everyone has the same) to 100 (one household has everything).

**Why it matters.** Two countries with the same average income can feel very different to live in. High inequality can weaken support for reforms, and the same policy can help or hurt very different numbers of people.

**How to read it.** Higher means more unequal. Most rich European countries are around 25 to 35; parts of Latin America and southern Africa are above 50. The app shows the survey year and whether the survey measured income or consumption.

**Limits.** It comes from household surveys that many countries run only every few years, so the latest figure can be old. A consumption Gini usually reads lower than an income Gini, because spending is shared more evenly than income, so do not compare the two directly. Very rich households are often missed by surveys.

### Business and consumer surveys (not a PMI)

Each month the European Commission asks thousands of firms and households in every EU country how things are going and how they expect them to go. The answers are turned into confidence measures for industry, services and consumers, an overall Economic Sentiment Indicator and an Employment Expectations Indicator.

**Why it matters.** Surveys arrive weeks before official figures for output and jobs, so they are an early sign of where the economy is heading. They are free, unlike the purchasing managers' indexes (PMIs) that markets watch.

**How to read it.** The sentiment and employment indexes have a long-term average of 100: above 100 means more upbeat than usual. Confidence balances are the share answering "better" minus the share answering "worse"; watch whether they are rising or falling more than their level.

**Limits.** These are not PMIs: different questions, firms and scale (a PMI's dividing line is 50, not 100), so the two cannot be compared number for number. Moods can swing on news without a change in what people actually do. Only EU members are covered.

### Output gap

The difference between what the economy is producing and what it could produce over time without pushing up inflation, as a share of that potential.

**Why it matters.** A positive gap means the economy is running hot (firms and workers are stretched, prices tend to rise faster). A negative gap means spare capacity (idle workers and machines, inflation tends to ease).

**How to read it.** Above zero: running above its sustainable pace. Below zero: slack. It feeds the policy rule check (Taylor rule).

**Limits.** Potential output cannot be observed, only estimated, so the gap is uncertain and is often revised a lot. The app uses the IMF estimate and says so.

### Nowcast

An estimate of growth for the current quarter, made from monthly figures that come out before the official GDP number.

**Why it matters.** Official GDP arrives weeks or months after the quarter ends. A nowcast gives an early read.

**Limits.** It is a model estimate, labelled "model" in the app, and its track record is shown under Menu > Models & validation.

### GDP release

The day the statistics office publishes its first estimate of how much the economy grew in the last quarter.

**Why it matters.** The first estimate is the one markets and the central bank react to, even though it is often revised later.

## Prices and inflation

### CPI inflation

How fast the prices people pay for a typical basket of goods and services (food, rent, fuel, transport and so on) are rising, compared with a year earlier.

**Why it matters.** Inflation eats into wages and savings. It hits poorer households hardest because more of their income goes on food and energy. Central banks raise interest rates to bring it down.

**How to read it.** Higher means prices are rising faster. Most central banks aim for about 2 to 4% a year. Below zero (deflation) is also a warning sign, because it can mean weak demand.

**Limits.** The headline figure includes volatile food and energy prices, so a single month can jump for reasons that fade.

### Inflation target

The inflation rate a central bank has publicly promised to aim for, for example 3% with a band of 1 point either side.

**Why it matters.** It is the yardstick for judging whether inflation is a problem and whether interest rates are likely to go up or down.

### Inflation expectations

What households, firms, forecasters or markets think inflation will be in the future, from surveys or from bond prices.

**Why it matters.** If people expect high inflation they ask for higher wages and set higher prices, which can make inflation stick. Central banks watch expectations closely.

**How to read it.** Expectations close to the target mean people trust the central bank. Expectations drifting above the target are a warning sign.

### CPI release

The day the national statistics office publishes the latest inflation figure.

**Why it matters.** A surprise in either direction can move interest-rate expectations, the currency and bond prices on the day.

## Central banks and interest rates

### Policy rate

The interest rate the central bank sets. It is the anchor for what banks charge each other overnight, and through that for loans, mortgages and savings rates across the economy.

**Why it matters.** Raising it makes borrowing dearer, which slows spending and inflation and tends to support the currency. Cutting it does the opposite.

**How to read it.** Compare it with inflation: a rate well above inflation is tight (holding the economy back), a rate below inflation is loose (supporting it).

### Real interest rate

An interest rate minus inflation. It shows what borrowing really costs, or what saving really earns, once rising prices are taken into account.

**Why it matters.** It is a better guide to how tight policy is than the headline rate. A 10% rate with 12% inflation is still cheap money; a 5% rate with 1% inflation is expensive.

**How to read it.** Positive and high: tight, borrowing is costly, the currency tends to be supported. Negative: loose, savers lose money in real terms.

**Limits.** The app subtracts the latest inflation figure, which looks backwards; markets care about expected inflation, which is not always available. The row is labelled "model" because it is calculated here.

### Taylor rule (policy rule check)

A simple formula, proposed by the economist John Taylor in 1993, for where a central bank's interest rate "should" be given inflation, the inflation target and the output gap.

**Why it matters.** Comparing the actual rate with the formula gives a quick, transparent reading of whether policy looks tight, neutral or loose.

**How to read it.** Actual rate well above the rule: tight. Well below: loose. Within the band: neutral.

**Limits.** It is a rule of thumb, not a forecast of what the central bank will do. Central banks weigh many things the formula leaves out, such as the currency or financial stability. The app labels it "not validated".

### Rate decision

A scheduled meeting where the central bank announces whether it is raising, cutting or holding its policy rate.

**Why it matters.** Markets often move sharply on the day, especially when the decision differs from what was expected.

### Fed balance sheet and net liquidity

Everything the US Federal Reserve owns (mainly government bonds) and owes (mainly bank reserves and the US Treasury's cash account). "Net liquidity" is total assets minus the Treasury's account and the money parked at the Fed overnight (reverse repos).

**Why it matters.** When the Fed buys bonds it adds money to the financial system; when it shrinks its holdings it drains money. Because the dollar is the world's main currency, these changes can affect borrowing conditions everywhere, including emerging markets.

**How to read it.** Rising net liquidity: more money in the system. Falling: less.

**Limits.** Net liquidity is a popular market shorthand, not an official Fed measure. The app shows it only when all its parts are for the same Wednesday.

## Government budget and debt

### Risk of debt distress (IMF/World Bank rating)

A rating the IMF and World Bank give each low-income country after a debt sustainability analysis: low, moderate, high, or already in debt distress.

**Why it matters.** It decides how much of their help comes as grants rather than loans, and lenders and governments read it as the official view of whether the debt can be paid.

**How to read it.** Low is best. "High" means a serious chance of trouble paying; "in debt distress" means the country is already behind on payments or restructuring. The date shows how old the analysis is.

**Limits.** It covers only countries that can borrow from the IMF's concessional fund, and each rating is only as recent as the latest analysis, which can be a year or more old.

### Debt Service Suspension Initiative (DSSI)

A pause, agreed by the G20 during the pandemic, on debt payments that the poorest countries owed to other governments, from May 2020 to December 2021.

**Why it matters.** Taking part freed money for health and support during the crisis. The paused payments were not cancelled; they fall due later, which still weighs on budgets.

**How to read it.** Shows whether the country took part. Forty-eight of the 73 eligible countries did.

**Limits.** Private lenders such as bondholders were asked to join but almost none did, so it covered only part of what countries owed.

### Common Framework (G20 debt treatment)

The G20's process, set up in 2020, for a low-income country to ask all its government lenders, including China, to restructure its debt together.

**Why it matters.** Applying is a sign the country cannot pay as agreed. Talks can take years, and while they go on the country usually cannot borrow from markets.

**How to read it.** Shows whether the country applied. As of 2024 four had: Chad, Zambia, Ethiopia and Ghana.

**Limits.** Applying says nothing about how far talks have gone or how much relief was given.

### Official lending from China

Loans that China's government and its state banks (such as China Development Bank and China Eximbank) committed to the country, added up from AidData's project records.

**Why it matters.** China became one of the largest lenders to poorer countries. Its loans are often not in other public debt figures, and they shape how a debt restructuring can go.

**How to read it.** The total since the first year in the file, and the amount in the most recent five years of the file, in US dollars.

**Limits.** These are amounts promised when each loan was signed, not money paid out or still owed. AidData builds them from public records, so some loans are missed, and the file stops a few years before today.

### Government debt to GDP

Everything the government owes, divided by the size of the economy in a year.

**Why it matters.** It shows how heavy the debt is compared with the income the country can tax to repay it. A higher ratio leaves less room to respond to a crisis and can make lenders nervous.

**How to read it.** Higher is a heavier burden. The IMF looks more closely at emerging economies above about 70% of GDP, but many rich countries carry more than 100% without trouble, because who lends, in which currency and at what rate matters as much as the level.

**Limits.** The IMF figure is general government gross debt: it does not subtract the government's own savings, and it may not include debts of state companies.

### Primary balance

The government's budget result before interest payments on its debt: revenue minus spending, leaving interest out.

**Why it matters.** It shows whether the government's day-to-day policies (taxes and spending) are adding to the debt or paying it down, separate from the cost of past borrowing.

**How to read it.** A surplus (positive) means taxes cover spending other than interest. A deficit (negative) means the government borrows even before paying interest.

### Overall budget balance

The government's full budget result in a year: all revenue minus all spending, interest included.

**Why it matters.** A deficit has to be borrowed, so it adds to the debt. A surplus can pay debt down.

**How to read it.** Negative is a deficit. Deficits of a few percent of GDP are common; persistent large deficits push debt up quickly.

### Revenue and expenditure

Revenue is what the government takes in (taxes, fees, grants, income from state assets). Expenditure is what it spends (wages, pensions, investment, subsidies, interest).

**Why it matters.** Shown as a share of GDP, they reveal the size of the state and where a budget gap comes from.

### Tax revenue (central government)

The taxes the central government collects in a year, as a share of GDP.

**Why it matters.** Taxes pay for public services and debt. A low tax take limits what a government can spend or borrow, and raising it is often the slowest part of a reform.

**How to read it.** Higher means the state collects more. Many low-income countries collect under 15% of GDP; rich countries often 20 to 30% at central level, more once regions and social security are added.

**Limits.** This World Bank figure covers the central government only, so it is lower than the IMF revenue figure, which counts all levels of government and social security contributions. It is yearly and arrives a year or two late.

### Tax split (income, goods and services, trade)

How the central government's revenue is split between taxes on income and profits, taxes on goods and services (VAT, sales and excise taxes), and taxes on trade (mostly import duties).

**Why it matters.** It shows who bears the taxes and how stable they are. Income taxes rise more with income; goods taxes fall on everyone who buys; trade taxes depend on imports and shrink when tariffs are cut.

**How to read it.** Each is a share of central government revenue, so they need not add to 100 (fees, grants and social contributions make up the rest). A large trade share is common in poorer countries and is a risk if imports drop.

### Net interest paid

How much of the economy's yearly output goes on interest on government debt, after interest the government earns. The app works it out as the primary balance minus the overall balance for the same year.

**Why it matters.** Interest is money that cannot go on schools, hospitals or investment. When it climbs, budgets get squeezed and debt can start to feed on itself.

**How to read it.** Higher is a heavier burden: a bigger slice of what the economy produces goes to lenders each year.

**Limits.** Calculated here (labelled "model") and only shown when both IMF balances are for the same year.

### Interest rate minus growth (r minus g)

The real interest rate the government pays on its debt minus the real growth rate of the economy.

**Why it matters.** It decides whether debt grows on its own. If the interest rate is below growth, the debt ratio tends to fall even with a small deficit; if interest is above growth, the government must run a surplus just to stop the ratio rising.

**How to read it.** Negative helps; positive hurts, and the bigger the debt, the more it hurts.

**Limits.** The app approximates the interest rate from the 10-year yield and inflation, because the average rate actually paid on all government debt is not in a free feed.

### Balance that keeps debt stable

The primary balance (budget before interest) the government would need each year to keep debt from rising as a share of GDP, given today's interest rate, growth and debt level.

**Why it matters.** Comparing it with the actual primary balance shows how much the budget would have to change for debt to stop growing: the size of the adjustment.

**How to read it.** If the actual balance is below this figure, debt is on a rising path at today's rates.

**Limits.** A simple textbook calculation (labelled "model"), not an IMF or World Bank assessment.

### Debt sustainability and stress tests

A check of whether the government can keep paying its debts without a crisis. The app projects debt five years ahead with today's figures held still, then again with standard shocks: lower growth, higher interest rates, a weaker budget, and all three together.

**Why it matters.** It shows how fragile the debt path is. If one plausible shock sends debt sharply higher, the country has little room for bad luck.

**How to read it.** Compare the shocked paths with the baseline. A wide spread means the debt is sensitive to things the government does not control.

**Limits.** The projection holds today's figures fixed, so it is a "what if" exercise, not a forecast. The shock sizes are fixed and stated. It is much simpler than an IMF debt sustainability analysis and is not one.

### Gross financing need

How much the government must raise in a year: the budget deficit plus all debt that falls due and has to be repaid or rolled over.

**Why it matters.** Even a country with moderate debt can get into trouble if a lot falls due at once and lenders are nervous. The IMF treats above about 15% of GDP a year as a warning level for emerging economies.

**How to read it.** Higher means more dependence on lenders being willing to lend again each year.

### Debt falling due

Loans and bonds that must be repaid within a period, usually the next 12 months, by the government or the whole country.

**Why it matters.** These repayments must be paid from savings or new borrowing. A large amount falling due when markets are closed is a classic path to a debt crisis.

**How to read it.** Compare with FX reserves: if reserves cover the debt falling due, the country can pay even if lenders stop lending for a while.

**Limits.** QEDS (World Bank and IMF quarterly external debt statistics) and IDS (World Bank international debt statistics) cover debt owed to foreigners. Debt owed to local lenders in local currency is mostly not in a free feed.

### Government debt securities

Bonds and bills the government has sold to investors and not yet repaid. "International markets" means bonds sold abroad, usually in dollars or euros; "all markets" adds bonds sold at home.

**Why it matters.** Foreign-currency bonds are riskier for the borrower: if the local currency falls, the debt gets bigger in local money.

**Limits.** From the Bank for International Settlements (BIS), quarterly.

### Credit rating

A grade (such as AAA, BBB or B) that agencies like S&P, Moody's and Fitch give to a borrower for how likely it is to repay.

**Why it matters.** Many investors may only buy bonds rated BBB- or higher ("investment grade"), so a downgrade below that line can force selling and raise borrowing costs.

**Limits.** Ratings are licensed data. The app shows them as Missing rather than guessing, because no free feed provides them.

### Treasury auction and bid-to-cover

The US government sells its bills, notes and bonds at regular auctions. Bid-to-cover is the amount investors bid divided by the amount sold; the high yield is the highest yield accepted, which every winning bidder receives.

**Why it matters.** They show how keen investors are to lend to the US government. Weak demand can push up the yield the government pays, and with it borrowing costs across the world, because US Treasuries are the benchmark for most other bonds.

**How to read it.** A bid-to-cover of 2.5 means $2.50 was bid for every $1 sold; higher means more demand. Compare an auction with earlier auctions of the same term, not with other terms. Indirect bidders are mostly foreign central banks and investment funds bidding through dealers.

**Limits.** One auction can be weak for passing reasons (a holiday week, a big supply of other bonds). Only the United States has a free auction feed the app can read; other countries' auctions are not shown.

## Trade, the currency and money from abroad

### Remittances received

Money sent home by people working abroad, as a share of GDP.

**Why it matters.** For many poorer countries it is one of the largest sources of foreign currency, larger than aid or foreign investment. It helps households pay for food, school and housing, and it supports the currency because the money is changed into local currency.

**How to read it.** Higher means the country leans more on its workers abroad. Above about 10% of GDP it is a main support of the economy. It tends to be steady, and often rises when the home country is in trouble.

**Limits.** Money sent outside banks and money transfer firms, such as cash carried home, is often not counted, so the true amount can be higher. It falls when the countries where the workers live slow down.

### Current account

The country's balance with the rest of the world: what it earns from exports, income from abroad and money sent home by workers, minus what it pays for imports and to foreign investors.

**Why it matters.** A deficit has to be paid for by borrowing from or selling assets to foreigners. A large deficit makes a country depend on foreign money continuing to arrive, which can stop suddenly.

**How to read it.** Positive (surplus): the country earns more than it spends abroad. Negative (deficit): it relies on money from abroad. A deficit above about 4 to 5% of GDP is often seen as a vulnerability.

### FX reserves (foreign exchange reserves)

Foreign currency and gold held by the central bank, mostly in dollars.

**Why it matters.** Reserves are the country's savings for a rainy day. They pay for imports and debt if foreign money stops arriving, and let the central bank steady the currency.

**How to read it.** "Months of imports" says how long reserves could pay for imports with no other income. Three months is the traditional minimum; more is safer.

**Limits.** Months of imports ignores debt falling due and money that could leave the country; the reserve adequacy panel looks at those too where data allow.

### External debt

Everything the country (government, banks and companies together) owes to lenders abroad.

**Why it matters.** Most external debt is in foreign currency, so a fall in the local currency makes it heavier, and it has to be repaid with export earnings or reserves.

**How to read it.** Shown as a share of GNI (gross national income, which is GDP plus net income from abroad). Higher is a heavier burden.

### Applied tariff (weighted and simple mean)

The average tax charged on imported goods, from the tariffs the country applies. The weighted mean counts each product by how much of it is imported; the simple mean counts every product line the same.

**Why it matters.** Tariffs raise prices for buyers and protect local producers. They change what a trade shock or a trade deal does to a country.

**How to read it.** Higher means more protection. The weighted mean is usually lower than the simple mean, because very high tariffs keep imports of those goods small, so they count for little in the weights. A big gap between the two means some goods are heavily protected.

**Limits.** Yearly, from the WITS/TRAINS database, so tariff changes made since the latest year shown are not included. It leaves out quotas, bans and other barriers that are not tariffs.

### Exchange rate (spot FX)

How many units of the local currency one US dollar buys today.

**Why it matters.** A weaker currency makes imports (fuel, food, machines) dearer, which pushes up inflation, and makes foreign-currency debt heavier. It also makes exports cheaper for foreign buyers.

**How to read it.** In the app it is local currency per US dollar, so a higher number means the local currency is weaker.

### Real exchange rate (real FX)

The exchange rate adjusted for differences in inflation between the country and its trading partners, averaged across those partners. It shows whether the country's goods are getting dearer or cheaper for foreigners.

**Why it matters.** A currency that is strong in real terms makes exports harder to sell and imports cheaper, which can widen the current account deficit. A weak one does the opposite.

**How to read it.** The app compares it with its own long-run average: well above average means strong (possibly overvalued), well below means weak (possibly undervalued).

**Limits.** From the BIS. Being far from average is not proof that a currency will move back; the related signal is labelled with its test result.

### Capital flows

Money moving into or out of the country to buy or sell shares, bonds, companies and loans.

**Why it matters.** Inflows can fund growth; sudden outflows can force the currency down and rates up. "Hot money" in bonds and shares can leave faster than direct investment in factories.

## Financial markets

### Bond yield (10-year government yield)

The yearly return an investor gets from lending to the government for ten years at today's market price. It is the market interest rate on government debt.

**Why it matters.** It is what new borrowing costs the government, and it sets the floor for many loan and mortgage rates in the country. When investors worry about a country, they demand a higher yield.

**How to read it.** Higher means borrowing is dearer and, often, that investors see more risk or expect more inflation. Compare it with the country's own history and with similar countries.

**Limits.** A local-currency yield mixes three things: expected inflation, expected policy rates, and a premium for risk. A high yield is not by itself a sign of trouble in a high-inflation country.

### Yield curve and 2s10s slope

The line joining interest rates on government bonds of different lengths. The "2s10s" slope is the 10-year yield minus the 2-year yield.

**Why it matters.** Normally longer loans pay more, so the curve slopes up. When short rates rise above long rates (an "inverted" curve), it has often come before a slowdown, because markets expect rates to be cut later.

**How to read it.** Positive: normal. Near zero: flat. Negative: inverted.

### Basis point (bp, bps)

One hundredth of a percentage point. 100 basis points = 1 percentage point.

**Why it matters.** Spreads and small rate changes are quoted in basis points to avoid long decimals: "the spread rose 25 bps" means it rose by 0.25 percentage points.

### Carry (FX carry)

Borrowing in a currency with low interest rates and lending in one with high interest rates, to earn the difference.

**Why it matters.** Carry trades bring money into high-rate emerging markets, but they can unwind fast when fear rises, pushing those currencies down together.

**Limits.** The app tests a carry signal against its standard; its result (including that it does not survive the multiple-testing correction) is under Menu > Models & validation.

### Spread

The extra interest a borrower pays over a safer benchmark. For a country's dollar bonds, it is the yield above US Treasury bonds of similar length.

**Why it matters.** It is the price markets put on the risk of not being repaid. Spreads widen when investors worry and narrow when they relax.

**How to read it.** Higher means investors see more risk. Under about 200 basis points is typical of strong borrowers; above 1,000 usually means markets fear a default.

### CDS (credit default swap)

A contract that works like insurance against a government not paying its debts. Its price, in basis points a year, is what it costs to insure 10,000 units of debt for five years.

**Why it matters.** It is a direct market price of default risk.

**How to read it.** Higher means markets see more risk. The bands the app uses to describe market access: under 200 bps strong, 200 to 400 high-yield, 400 to 1,000 stressed, above 1,000 distressed.

**Limits.** CDS prices are licensed data. The app hides CDS unless you load your own file, and never uses estimates.

### Market access

Whether a government can sell new bonds to investors at a price it can bear.

**Why it matters.** A government that loses market access must cut spending, use reserves, or turn to the IMF or other official lenders.

### Execution window

The coming weeks in which a government could sell bonds, with the official dates (rate decisions, inflation releases) that might move the market.

**Why it matters.** Issuers usually avoid selling bonds right before a big announcement, when prices can swing.

### Positioning (CFTC)

How many bets on a currency rising versus falling are held by speculators on US futures exchanges, published weekly by the US Commodity Futures Trading Commission.

**Why it matters.** When almost everyone is on the same side ("crowded"), a surprise can make many people rush out at once, causing a sharp move the other way.

### Prediction markets (Kalshi, Polymarket)

Exchanges where people bet money on whether an event will happen, such as an election result or a rate decision. The price reads as the crowd's probability.

**Why it matters.** They give a quick, market-based reading of how likely an event is seen to be, and how that changes day to day.

**Limits.** Crowds can be wrong, thin markets can be moved by a few bets, and the odds are not a forecast by the app.

### Financial stress indices (STLFSI, NFCI, GSCPI)

Single numbers that combine many market prices to show how strained the financial system is: the St. Louis Fed Financial Stress Index (STLFSI), the Chicago Fed National Financial Conditions Index (NFCI), and the New York Fed Global Supply Chain Pressure Index (GSCPI).

**Why it matters.** Stress in US markets tends to spill over into emerging markets as investors pull back from risk.

**How to read it.** Zero is about average. Above zero means more stress or tighter conditions than usual; below zero means calmer than usual.

### Commodity prices

World prices of raw materials such as oil, gas, copper, wheat and gold, from the World Bank Pink Sheet.

**Why it matters.** For a country that exports a commodity, a higher price means more export income and tax revenue; for one that imports it, a higher price raises inflation and the import bill.

## Politics, conflict and news

### Political stability (WGI)

The World Bank's Worldwide Governance Indicators score for how likely it is that the government is destabilised by unrest, violence or terrorism, ranked against all countries.

**Why it matters.** Instability can disrupt policy, scare off investors and make debt harder to repay.

**How to read it.** A percentile: 80th means more stable than 80% of countries. Higher is more stable.

**Limits.** Built from surveys and expert opinions, published yearly with a lag of about a year, so it moves slowly.

### News tone (GDELT)

The average mood of news articles about the country, scored by the GDELT project from the words used, across many news sites worldwide.

**Why it matters.** A sharp turn negative can be an early sign of unrest, a crisis or a policy shock, before it shows up in official figures.

**How to read it.** Below zero means the coverage is more negative than positive. Most countries sit a little below zero, so look at changes over time rather than the level.

**Limits.** It measures words, not facts, and is noisy. Big stories in a few outlets can move it.

### Armed conflict (UCDP)

Counts of organised violence and deaths from the Uppsala Conflict Data Program (UCDP) at Uppsala University, which records conflicts worldwide from news and other sources.

**Why it matters.** Conflict destroys output, drives people from their homes, strains budgets and scares off investment.

**Limits.** The app uses UCDP files you download, with the date they cover. "Candidate" data is preliminary and can change.

### Geopolitical risk index (GPR)

An index by economists Dario Caldara and Matteo Iacoviello that counts how often major newspapers write about wars, terrorism and military tensions.

**Why it matters.** Higher readings have tended to come with lower investment and more market stress.

**How to read it.** Higher means more press coverage of geopolitical threats than usual.

### Sanctions

Restrictions a government (such as the US, EU or UK) or the UN places on dealing with named countries, companies or people.

**Why it matters.** Sanctions can cut a country off from markets, trade and payments, and dealing with a listed party can be illegal.

**Limits.** The app reads the official lists you download; it does not decide whether a particular deal is allowed.

## How the app tests and labels things

### Percentage point (pt, pts)

The plain difference between two percentages. Going from 4% to 6% is a rise of 2 percentage points (and a 50% rise in relative terms).

**Why it matters.** The app writes "pts" for differences so they are not confused with percentage changes.

### Missing

No live feed, official series or file of yours provided this figure, so the app shows nothing rather than a guess.

**Why it matters.** A made-up or sample number can look just as convincing as a real one. Showing "Missing" with the reason keeps every figure on screen traceable to a real source.

**How to read it.** Hover or tap a Missing figure to see why it is missing and what would fill it.

### "model" figure

A number the app calculated from other live figures (for example the real policy rate, which is the policy rate minus inflation), rather than one read directly from a source.

**Why it matters.** It tells you the figure is only as good as its inputs and the formula, which is named next to it.

### Source label

The small line under each figure that names where it came from (IMF, World Bank, BIS, a central bank, your file) and, where known, the date.

**Why it matters.** It lets you check any number against the original.

### Real-time data and publication lags

Using only the figures that had actually been published on a given past date. Official figures come out weeks or months after the period they describe, and are often revised later.

**Why it matters.** Testing a signal with today's revised figures, or with figures that were not yet published at the time, makes it look better than it could really have been. The app applies the delay before a figure could be used.

### Backtest

Checking how a rule or signal would have done in the past, using the data that was available at the time.

**Why it matters.** It is the first test of whether a signal has any value. A signal that did not work in the past is unlikely to work in future.

**Limits.** Passing a backtest does not guarantee future results. Testing many ideas and keeping the best ones produces false winners, which is why the app pre-registers tests and corrects for multiple testing.

### Pre-registration

Writing down a test's rules, data, and pass mark before running it, and recording a fingerprint (hash) of that plan so it cannot be changed afterwards without it showing.

**Why it matters.** It stops the rules being adjusted after seeing the results until something "works".

### Naive benchmark

The simplest possible forecast to beat, such as "next year will be the same as this year".

**Why it matters.** A model is only useful if it does better than this. Many sophisticated forecasts do not.

### p-value

The chance of seeing a result at least this good by pure luck if the signal actually had no value.

**Why it matters.** A small p-value (the app's usual pass mark is 0.05, a 5% chance) suggests the result is not just luck.

**Limits.** If you test 20 ideas, one will usually pass at 0.05 by luck alone. That is why the app also applies the Holm correction.

### Holm correction (multiple testing)

A standard way to raise the bar when many tests are run at once, so that lucky passes are weeded out. The smallest p-value must clear a stricter mark, the next a slightly less strict one, and so on.

**Why it matters.** Without it, running many tests guarantees some false passes. The track record shows which passes survive it across every test on record.

### Bootstrap

Re-running a calculation thousands of times on random re-samples of the data to see how much the answer could vary by chance.

**Why it matters.** It gives a realistic range for a result when the usual textbook formulas do not apply.

### RMSE and relative RMSE

Root mean squared error: the typical size of a forecast's miss. Relative RMSE divides a model's RMSE by the naive benchmark's.

**Why it matters.** It is how forecasts are scored.

**How to read it.** Relative RMSE below 1 means the model missed by less than the naive forecast; above 1 means it did worse.

### Credit-to-GDP gap

How far lending to households and companies, as a share of GDP, sits above or below its long-run trend. Published by the BIS.

**Why it matters.** Credit growing much faster than the economy has often come before banking crises. Bank regulators use the gap to decide whether banks should hold extra capital.

**How to read it.** Above zero: credit is running ahead of its trend. International bank rules (Basel III) start to consider extra capital for banks above about 2 points and call for the full extra buffer at about 10 points. Below zero: credit is weak relative to trend.

### z-score (standard deviations from average)

How unusual a value is compared with its own history, measured in standard deviations (the typical distance from the average).

**Why it matters.** It puts very different figures on one scale, so a jump in a yield and a jump in news tone can be compared by how rare each is.

**How to read it.** Zero is average. Plus or minus 1 is common; beyond plus or minus 2 is unusual and happens only about 5% of the time.

### Test labels and evidence grades

Labels on each model and signal saying how far it has been tested. Not validated: never tested against a pre-registered standard. Backtest passed or failed: the result of its one pre-registered test on past data. Too few cases to test: not enough history to tell. A test that passed also gets a grade. Validated: it still holds after the correction for testing many rules, or a long enough live record has confirmed it. Provisional pass: it passed on its own but not after that correction. Under review: since the test, its live calls are doing worse than chance would suggest. Withdrawn: its live calls have done clearly worse, so it is no longer relied on until a new version passes. Review due: its test last ran more than a year ago.

**Why it matters.** They tell you how much weight a reading can bear. A recorded verdict is never changed after the fact. "Validated" is a research label with this defined meaning, not an independent or regulatory sign-off.

### Council of agents

A set of specialist AI agents, each covering one area (for example the central bank, the budget, politics), that read the live figures for a country and write findings. A synthesis agent then writes the answer, and may quote only figures the agents had.

**Why it matters.** Splitting the work keeps each answer tied to named figures and sources, and makes it clear which agent said what.

**Limits.** Answers are written by an AI model and are labelled so. They are interpretation of the figures shown, not advice, and the app checks that every number they quote appears in the source figures.
