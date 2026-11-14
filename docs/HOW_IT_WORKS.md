# How EconQuest works, in plain words

**Version 1.2, 13 November 2026.** Licensed under [CC BY 4.0](../LICENSE-docs.md). Research, not
validated advice.

This guide explains, without jargon, where EconQuest's figures come from, what its AI does and does
not do, how it decides whether a rule is worth anything, and what it cannot do. It is written for
anyone: students, teachers, journalists and readers with no background in economics or statistics.
The full technical account, with every method, file and reference, is the
[Methodology](./METHODOLOGY.md). Where the two seem to differ, the Methodology is the exact statement.
Any term you don't know is explained in the [Glossary](./GLOSSARY.md).

---

## Contents

- [Why EconQuest was made](#why-econquest-was-made)
1. [What EconQuest is, and what it is not](#1-what-econquest-is-and-what-it-is-not)
2. [Where it runs](#2-where-it-runs)
3. [Where the numbers come from](#3-where-the-numbers-come-from)
4. [What the AI does, and what it does not](#4-what-the-ai-does-and-what-it-does-not)
5. [How a rule is tested](#5-how-a-rule-is-tested)
6. [Why luck has to be counted](#6-why-luck-has-to-be-counted)
7. [The labels you will see](#7-the-labels-you-will-see)
8. [What has been found so far](#8-what-has-been-found-so-far)
9. [Reading one result, step by step](#9-reading-one-result-step-by-step)
10. [Geopolitical risk VaR, explained](#10-geopolitical-risk-var-explained)
11. [What if a past crisis happened again?](#11-what-if-a-past-crisis-happened-again)
12. [Quests: coming later](#12-quests-coming-later)
13. [How much the app explains](#13-how-much-the-app-explains)
14. [What it cannot do](#14-what-it-cannot-do)

---

## Why EconQuest was made

> *"In 2026 we feel and see the economic effects of poor economic policies. I wanted to see if I could
> make a tool that could assist people in learning and understanding economics, finding multiple and
> optimal financial and policy options, and attempting to bring the best tools to the most
> underserved countries."*

In the maintainer's words.

Poor economic policy is not an abstract problem. It shows up as prices that outrun wages, currencies
that collapse, debt crises that close schools and hospitals, and governments that run out of options.
Understanding why these things happen, and what the alternatives were, should not be reserved for a few
specialists.

Judging whether a country can pay its debts, whether its currency is likely to fall, or how exposed it
is to war and political trouble matters to far more people than the professionals who do it for a
living. Yet the tools for that work are mostly out of reach. Professional terminals and rating data
cost thousands a year, so students, teachers, journalists, smaller institutions and many analysts in
the countries being judged go without. Many tools fill gaps with estimates without saying so, so you can't
tell a real figure from a guess. And the claims behind their signals are rarely tested in public: when a
model stops working, it tends to disappear without a report.

AI has made one part of this worse. It is now easy to produce fluent, confident commentary about any
country, with numbers that look right and come from nowhere.

EconQuest was made to show that serious country-risk research can be done differently:

- **Free.** It runs on public data that anyone can get, on your own computer.
- **Traceable.** Every number says where it came from, and a gap is shown as a gap.
- **Tested in the open.** Every rule is written down and locked before it is tested, and the results,
  failures included, are published and never changed.
- **AI kept on a short leash.** AI can help explain the figures, but it is never allowed to supply
  them, and its answers are checked and labelled.
- **For learning as well as analysis.** Everything is explained in plain words, so it can be used to
  teach and to check claims, not only by specialists.
- **Several options, not one answer.** For a country's budget or policy choices, the app sets out more
  than one option with its stated costs and trade-offs, so people can compare them; it does not claim
  to know the single right policy.
- **Built for the countries that need it most.** It is free, runs on an ordinary computer, and covers
  emerging and developing economies, whose analysts and citizens are least likely to have paid tools.

It began as a desk for measuring geopolitical risk (how much a country's markets can lose when the
world is tense; see section 10) and grew into a full terminal for sovereign and economic risk. It is a
non-commercial, open-source research project: nothing in it is for sale, and no one can pay to change
its methods or its results.

## 1. What EconQuest is, and what it is not

EconQuest is a free research tool. It gathers public figures about countries (growth, prices,
interest rates, government debt, trade, politics and conflict), helps people understand them, and
tests whether simple rules built on them say anything useful about what comes next.

It is **not** investment advice. It does not place trades, tell anyone what to buy or sell, issue
credit ratings or promise any forecast. It does not replace the assessments of the IMF, the World Bank
or the rating agencies. Every report and download it produces ends with the words "Research, not
validated advice".

## 2. Where it runs

There is no EconQuest website to sign up to. Each person runs the app on their own computer (or on a
server they control). It fetches figures straight from the public sources, such as the IMF, the World
Bank and central banks. Your keys, your saved research and the questions you ask stay on your
computer. The [install guide](./INSTALL.md) walks through it step by step.

Why not a website everyone shares? Three reasons. Some free sources allow personal use but not passing
their data on to others, so each person fetches their own. Keys and saved work are safer on your own
machine than gathered in one place. And the AI can run on your own computer, so your questions never
leave it.

A household, a team or a class can also run one copy on a shared computer or server. Then everyone
signs in, with a password made in the app or with an account they already have at Google, Microsoft or
a similar provider, and each person has a role (viewer, analyst or admin). On a modest laptop, a light
mode runs the app without a local AI model and downloads less.

Another program, such as a portfolio tool, can also read EconQuest's figures, if you give it a
**token**: a long password made for that program alone, which can do only what you allow (for example
read figures but not change anything) and which you can cancel at any time. Every use is written in
the app's log. You can also keep a list of **hidden names**, countries or securities that must never
appear on any screen or in anything sent out; the app then shows only how many are hidden.

## 3. Where the numbers come from

- **Every number has a source.** Each figure names where it came from and which period it describes:
  for example "IMF, World Economic Outlook, 2025".
- **Missing means missing.** If no real source provided a figure, the app shows **Missing** and says
  why ("Needs setup", "Feed did not answer", "No source yet"). It never fills the gap with a guess, a
  sample number or an AI estimate. Some things always read Missing because no free source exists:
  credit ratings, business surveys (PMIs), government bond auction results and economists' consensus
  forecasts. Credit default swap prices are hidden for the same reason; a bond spread stands in and is
  labelled as one.
- **Only free and open sources by default.** If you have a paid data account of your own, you can
  switch it on, but it is off unless you do.
- **Old figures are labelled with their date.** If a source fails one week, the last good figure from that same
  source is kept and labelled with the date it came from. Every download is saved by day, so you can
  see exactly what the app showed on any past date.
- **Figures for poorer countries too.** Money sent home by workers abroad (remittances), aid received,
  who has a bank account, commodity prices and what they mean for the country, food prices and
  natural disasters all come from the World Bank and other public sources. A few sources do not allow
  the app to download or pass on their files; for those, you download the file yourself and put it in
  a folder the [install guide](./INSTALL.md#files-you-save-yourself) names, and until then the parts
  that need it read Missing.
- **Credit where it is due.** Some figures come from researchers' own files, such as the Chinn-Ito
  index of how open a country is to money moving in and out. Those are shown with the authors' names
  and never passed on to others.

## 4. What the AI does, and what it does not

You can ask the "council" questions about the countries you follow. In council chat, each agent covers
one area: the central bank, the budget, politics and events, currencies, and so on. The agents are
**fixed rules written in code**, not AI: they read the figures and state what they find, each with its
source. An **AI model then writes a short answer from those findings alone.** (In the deeper "full
council", the desks themselves are AI models that debate each other, and the run stops for your
approval before the final report.)

Two automatic checks run on every AI answer before you see it:

- **The number check.** Every number in the answer must match a figure the agents were given. Any
  sentence with a number that can't be traced is removed, and the removed sentences are listed under
  the answer.
- **The stance check.** If an agent says, for example, that a central bank's policy is "tight", and
  the AI's sentence calls it "loose", that sentence is removed too.

The AI never supplies figures, and every AI-written answer is labelled as written by an AI model,
with the name of the model. The checks catch made-up numbers and contradicted calls; they cannot catch
poor emphasis or something important left out. Treat an AI answer as one interpretation.

## 5. How a rule is tested

A *signal* is a rule that claims to say something about the future, for example "currencies paying
high interest tend to earn more than they lose". Before EconQuest trusts a rule, it tests it like
this:

1. **Only ideas that were already published.** No rule is found by trawling the data for patterns.
2. **The test is written down and locked first.** The rule, the countries, the dates, the costs and
   the pass mark are written in a file before anyone runs it. The file gets a digital fingerprint (a
   hash): if anyone changed a single character afterwards, the fingerprint would no longer match and
   the app would refuse to run it. So the goalposts can't be moved after seeing the result.
3. **Only what was known at the time.** Figures are used only from the date they were actually
   published. For example, inflation for March is not used until it would have come out in May.
4. **After costs, against the simplest guess.** Trading rules are charged a cost every time they
   trade. Every rule must beat the simplest possible alternative: doing nothing, assuming nothing
   changes, or the usual frequency of the event.
5. **Failures stay failures.** A rule that fails is shown as failed and is never tweaked until it
   passes. A second version is allowed only to fix a stated mistake, and it counts as one more test.

## 6. Why luck has to be counted

If you flip twenty coins, one may well come up heads five times in a row by pure chance. Testing rules
is the same: try enough of them and one will "pass" by luck. EconQuest counts every test it has ever
run (twenty so far, failures included) and applies a standard correction for luck (the Holm method).
A pass that still holds after the correction is much stronger evidence than one that only passed on
its own.

## 7. The labels you will see

Each model or signal in the app carries a badge:

| Label | What it means |
| --- | --- |
| **Validated** (green) | Passed its locked test, and still passes after counting luck across every test; or later confirmed by at least two years of calls written down in advance |
| **Provisional pass** (amber) | Passed its own test, but not after counting luck, or the luck correction can't be read yet |
| **Under review** (amber) | Its calls written down in advance have been doing worse than the usual frequency |
| **Withdrawn** (red) | Its calls written down in advance have been clearly worse; it stays withdrawn unless a new locked version passes |
| **Review due** (amber) | Its test last ran more than a year ago |
| **Failed** | Did not meet its pass mark |
| **Too few cases** | Not enough history to tell either way |
| **Description, not a tested signal** | Shows what happened, makes no claim about the future |

"Validated" is a research label with this exact meaning. It is not the official model approval a bank
or regulator would do.

## 8. What has been found so far

Of twenty tests, six passed, twelve failed and two had too few cases. The full list is the
[Track record](./TRACK_RECORD.md).

- **The strongest finding:** when speculators' bets on a currency future are at an extreme, those bets
  usually shrink within eight weeks (in 85.5% of cases, against 65.8% normally). This holds after
  counting luck. It was tested twice, in two ways, on the same data, so it is one finding, not two.
  Note that it is about the bets shrinking, not about which way the currency then moves.
- **Promising but not proven:** the currency carry rule (section 9 below), a timing rule for those
  same currency bets, and a model that estimates this quarter's economic growth before the official
  figure is out. These passed their own tests but are Provisional until the luck correction can be
  read or calls written down in advance confirm them.
- **Passed, but no edge:** the "cycle clock" shows that central banks that have just raised rates tend
  to raise them again. That's true, but every forecaster already expects it, so it is not counted as
  a discovery.
- **Failed:** most forecasting models did not beat the simplest guess, which matches what economists
  generally find. Rules based on the Taylor rule, leading indicators, growth-and-inflation phases,
  unrest in the news, and currency value and momentum all failed. They stay on the record.
- **Locked, waiting to run:** some tests are written down and locked before the tool that runs them
  exists, so building the tool cannot bend the test. Two wait like this: whether a fast rise in
  borrowing comes before a banking crisis (it waits for permission to use a list of past crisis dates),
  and whether weak government, as measured by the World Bank's governance scores, comes before a
  country stops paying its debts (locked on 13 November 2026). Until they run, the panels that use
  them say Not validated.

## 9. Reading one result, step by step

Take the currency carry line: *3.34% a year net of costs (3.65% gross), 90% range 0.58% to 6.04%,
Sharpe 0.45, p 0.026, Holm-adjusted p 0.46, Provisional pass.*

- **The rule.** Each month, imagine borrowing in the currencies that pay the lowest interest and
  holding the currencies that pay the highest (the top third against the bottom third of 25
  currencies). This is "carry", an idea described in the academic literature long before this test.
- **3.65% gross, 3.34% net.** Over 321 months from 2000 to 2026, that imaginary position would have
  earned about 3.65% a year before costs. After charging 0.25% each time money moves in or out of a
  currency, it would have earned 3.34% a year. No real money was invested: it is a hypothetical result.
- **90% range 0.58% to 6.04%.** The test reshuffles whole years of history thousands of times to see
  how much the average could have differed by chance. In 90 of every 100 reshuffles the yearly return
  fell between 0.58% and 6.04%. The whole range is above zero, which is encouraging, but it is wide.
- **Sharpe 0.45.** Return divided by how much it swung about. The yearly swing was a little over
  twice the average return, so an ordinary bad year could wipe out more than a year of average gains.
- **p 0.026.** If carry really earned nothing, a result at least this good would come up by luck about
  2.6 times in 100. The pass mark was 5 in 100, so on its own the test passed.
- **Holm-adjusted p 0.46.** But twenty tests have been run, and with that many tries, one result this
  good is quite likely to appear by luck somewhere. After allowing for all twenty, the chance rises to
  about 46 in 100, far above the pass mark.
- **So: Provisional pass.** The recorded verdict stays "passed", because it met its own locked pass
  mark. Its grade is Provisional until either at least two years of calls written down in advance
  confirm it, or a new locked version passes with luck counted. Until then it is a lead worth watching,
  not an established edge.
- **What the averages hide.** Carry is known for sudden crashes: large losses in a few months when
  markets panic. Its worst year and largest fall from a peak have not been measured yet; when they
  are, the figures will come from a real run of the app, never typed in.

## 10. Geopolitical risk VaR, explained

The project began from the idea of measuring how much a country's markets can lose when the world is
tense. The *Geopolitical risk VaR* panel (Country Research > History & data > Global shock scenarios)
does this for the country's currency.

- **Which months count as tense.** Two economists, Caldara and Iacoviello, publish an index that
  counts newspaper articles about wars, threats and terrorism each month. A month counts as "tense"
  when the index is in its top tenth. The world index is used, and the country's own index where one
  exists.
- **What the VaR says.** The panel looks at how the currency moved against the US dollar in those
  tense months and finds the bad month that only 1 in 20 of them was worse than. That is the "95% value
  at risk" (VaR). The "expected shortfall" is the average of the months that were worse still. Both
  are shown beside the same figures for all months, so you can see how much worse tense months have
  been. For example, a VaR of 4 would mean the currency lost more than 4% against the dollar in one of
  every twenty tense months.
- **Why it happens.** Tense months often bring moves in US interest rates and the dollar. The panel
  shows how much of the currency's fall those moves explain.
- **What it is not.** It describes the past. It makes no prediction about next month, so it carries
  the label "Description, not a tested signal". It needs at least 100 months of data, 20 of them tense,
  or it reads Missing.
- **Its limits.** Tension lasts for months at a time, so 20 to 40 tense months may be only a handful of
  separate episodes, and a "1 in 20" figure from them is rough. It covers the currency only, not bonds
  or shares. And the index measures how much the news talks about risk, which is not the same as the
  risk itself.

## 11. What if a past crisis happened again?

A program connected with a token can ask EconQuest what a list of bonds and currencies would have
lost or gained in a shock it describes (for example, emerging-market currencies 10% weaker against the
dollar, or US rates one percentage point higher), or if one of seven past crises happened again:
Asia 1997, Russia 1998, 2001, the 2008 financial crisis, the 2013 "taper tantrum", COVID in 2020 and
the 2022 rate rises.

- **How the moves are found.** For a past crisis, the app compares the average level of each interest
  rate, bond spread and exchange rate in the calm month before with the average in the worst month,
  from official monthly series (OECD and US Federal Reserve figures via FRED, and bond spreads from
  Peru's central bank).
- **How the result is worked out.** In the simplest way: a bond loses roughly its duration times the
  rise in its yield, and a holding in another currency gains or loses the currency's move. This is a
  rough first estimate, labelled hypothetical. It is not a forecast and not a price.
- **What it leaves out.** Interest earned along the way, the curve of bond prices, and the worst days:
  because it uses monthly averages, the real worst day inside a crisis was usually worse.
- **Missing means missing here too.** If no source has a move (for example bond spreads before 2016),
  that part reads Missing with the reason, and the position's total is left blank rather than
  guessed.

## 12. Quests: coming later

Quests are built but **switched off**: you can't use them yet. When they go live, a Quest will be an
open question that anyone can answer, for example "Will Brazil's policy rate be above 14% on 31
March?". Each one states in advance exactly which official figure will settle it. When the date comes,
the app reads that figure and records the result in a file where any later change would show. People's
forecasts are scored on how much better they did than the simplest guess, and nobody is ranked until
they have at least twelve settled forecasts.

Some questions have no single right answer ("What would most reliably rebuild Egypt's foreign
reserves?"). These are **Debate Quests**: people argue a position, the app checks every figure they
quote against its own, and nobody is ever scored or declared right. An AI model writes a short opening
brief on each side; it is labelled as AI-written and is not allowed to state any figure of its own.

## 13. How much the app explains

The help button at the top of the page sets how much the app explains:

- **Key help** (the default): a guide on every chart, a short introduction on each panel, a "What it
  means" line under each observation, and *What is this?* on the main figures.
- **Full help:** *What is this?* on every figure and term as well.
- **Help off:** figures, sources and observations only.
- **Expert:** figures, sources and forecast ranges, without the plain-language explanations.

These explanations are written in advance and stored in the app. They are not produced by AI and
contain no figures of their own. The one exception is the **Explain** button on a figure, which asks
the council: that answer is written by the AI model, labelled as such, and number-checked like any
other.

## 14. What it cannot do

- **The past is not the future.** A rule that worked on past data may stop working. That is why
  passing rules keep writing down their calls in advance and are scored as the results come in.
- **Not everything is free.** Ratings, business surveys, auction results and consensus forecasts read
  Missing.
- **Figures get revised.** Most countries' history is available only as revised today, not as first
  published, which can make a rule look better than it was. Only some US and IMF figures are
  available as first published.
- **Some countries are missing from the tests.** Tests use the countries with long enough free
  history. Countries that stopped reporting or had a crisis can drop out, leaving calmer cases behind.
- **AI models differ and change.** A different model, or a new version of the same one, can lean
  differently on the same figures.
- **Small samples.** Many emerging-market histories are short, and crises cluster, so results are
  rough.
- **Not a compliance tool.** The sanctions panel counts entries on official lists; it does not screen
  names properly.
- **Crisis replays are rough.** They use monthly averages and the simplest bond arithmetic, so they
  understate the worst days of a crisis.
- **The log can be checked, not made unbreakable.** Every entry in the app's log is linked to the one
  before, so a changed line shows. Someone with full access could rewrite the whole log, unless the
  owner sets up the optional seal key and locked copies in outside storage.

---

*How EconQuest works, version 1.2 (13 November 2026). Text licensed under CC BY 4.0: you may share and
adapt it with credit to "EconQuest Terminal contributors". Research, not validated advice.*
