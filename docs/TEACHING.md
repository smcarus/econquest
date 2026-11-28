# Teaching with EconQuest

**Version 1.0, 28 November 2026.** Licensed under [CC BY 4.0](../LICENSE-docs.md).

A guide for teachers who want to use EconQuest Quests with a class: forecasts and debates on real
economic data, scored when the data comes in. It covers one term from setup to the end of the
class. Nothing here needs programming. Each step names the button to press.

Also in [Español](./TEACHING.es.md) and [Français](./TEACHING.fr.md). For school IT staff there is a
one-page summary: [SCHOOL_IT.md](./SCHOOL_IT.md). The full description of every classroom feature
is in [QUESTS.md](./QUESTS.md#classes-quests-in-the-classroom).

## What a class gets

- **Questions about real data.** A Forecast Quest asks, for example, "Will Brent crude be higher on
  29 January than when entries close?" Students answer with a probability (70%) or a number. When
  the date comes, the app reads the answer from the official series and scores it. Nobody, the
  teacher included, can change the result.
- **Debates.** A Debate Quest has two to four positions. Students choose one and argue for it.
  Debates are argued, not scored.
- **A record that teaches calibration.** Each student sees how often their 70% answers came true,
  and whether they beat the plain base rate. A forecaster who says 70% should be right about 7 times
  in 10.
- **No made-up figures.** Every figure comes from a public source. When a source is down, the app
  says Missing and why; it never fills the gap.
- **The teacher grades.** The app gives figures (participation, accuracy, calibration). It never
  gives a grade on its own.

A good forecast can turn out wrong, and a careless one can turn out right. The screens say this
wherever results appear. Mark the reasoning as well as the outcome.

## Before the term

### 1. Choose where the app runs

EconQuest runs on one computer: your laptop or a school server. Students open it in an ordinary
browser on the same network; nothing is installed on their devices. A modest laptop serves a class
of 40: in the load test (`npm run class:load`) every step for 40 students answered within about a
second, with the app held to two processor cores. Keep the computer on and awake during class.

Send [SCHOOL_IT.md](./SCHOOL_IT.md) to your IT staff. It says which port students use (3000), that
nothing needs to be opened to the internet, and what is stored.

### 2. Set it up for the class

After installing the app ([INSTALL.md](./INSTALL.md)), run once, in the app's folder:

```
npm run class:setup -- --until 2027-05-07 --admin yourname
```

Use the last day of your term after `--until`. This:

- turns classes on and opens the app to the school network;
- makes your administrator account (the password is printed once; change it in Menu > Account);
- keeps the app on this version until the last day of term, so nothing changes under the class;
- prints the address students open, such as `http://192.168.1.20:3000`.

Then start the app as usual (`npm run go` on a Mac, `npm run dev` on any computer). Add
`--local` to try it on your own computer first.

### 3. Make the class

Sign in, open **Menu > Quests** and choose the **Classes** tab.

1. Under *Make a class*, give a name ("Macro 101"), the class's time zone, a term label and the
   first and last day of term. Press *Make the class*.
2. The class card shows an eight-character **join code** such as `K7QM-P3XD`.
3. Add students in one of two ways:
   - **Student accounts:** paste a list of nicknames (one per line) under *Make student accounts*
     and press *Make the accounts*. Each password is shown once: hand them out, and each student changes theirs in
     Menu > Account. Nicknames keep real names off the computer if you prefer.
   - **Join code:** students who already have an account sign in and type the code on their own
     Classes tab.
4. To share marking, add a colleague's account as a **marker** (*Add someone who already has an
   account*). Markers see every entry and write
   feedback; they do not change the class.

Students see the class, the term and who teaches it. They never see each other's names in the
member list or the join code.

### 4. Plan the first weeks with replays

Real Forecast Quests take weeks to settle. To give students practice from day one, use the
**Replays** tab: four packs of four weeks each (oil and currencies for beginners, then policy rates,
exchange rates, and positioning). Each try picks a past date, shows what was known then, and scores
the answer at once. Students see how often they beat the base rate.

For the weeks after that, short Forecast Quests are on file for a January to May term: a one-week Brent
Quest closing each Friday (scored about two weeks later), a four-week Brent Quest each week, and
monthly Quests on eleven central banks' policy rates, in English, Spanish, French and Portuguese.
Setting one weekly and one four-week Quest from week 3 gives each student the 10 settled answers the
calibration chart needs by about week 10.

## During the term

### Set a Quest for the class

On the class card press *Set a Quest for this class*:

- **Quest:** any approved Quest on file, or a **class Quest** you write for this class only (press
  *Write a class Quest*: a Forecast on one of the series a Quest may read, or a Debate with two to four
  positions, with a level: intro, intermediate or advanced). The app checks a class Quest with the
  same rules as every other Quest.
- **Due date and time,** in the class's time zone. Everyone also sees it in their own time. Each
  student can download a calendar file with their due times.
- **The rule on AI tools:** allowed; allowed with a note saying how they were used; or not allowed,
  where the student confirms they did not use them.
- **Instructions,** if any.
- **Peer review** (Debate Quests) and **sensitive topic** (see below), if wanted.

Students hand in before their due time; a new entry before then replaces the earlier one. You can
give one student more time (the others do not see it). Students see classmates' entries only after
the last due time, or once you press *Show entries to students now*.

To reuse last term's work, use *Copy assignments from another class you teach*: the dates move by
the gap between the terms.

### Feedback and marks

Press *Entries* on an assignment. Under each entry, write feedback and, if you like, a short mark
("B+", "7/10", "85%"). A newer note from you replaces your older one. The student reads it under
*Feedback* on their assignment, with who wrote it.

### Peer review on debates

On a Debate Quest, press *Turn on peer review* (or tick it when you set the Quest). Once everyone's time is up, each student who
argued a position gets two classmates' arguments, labelled Classmate A and B, and writes what is
strong in each and what would make it stronger. Nobody reviews their own; each argument gets two
reviewers; authors read the reviews without the reviewers' names. You see who wrote what.

### Sensitive topics

For a question students may find personal, press **Mark as a sensitive topic** (or tick it when you set the Quest). Names are
then hidden from students and markers (you still see them), and these entries never leave this
computer: they are not in the gradebook, any download or any backup. Once entries are in, the
switch cannot be turned off, because students answered on that promise.

### The class table, teams and reports

- **Class table:** scores the class's settled answers. Choose what students see: only their own
  row, classmates by nickname, or classmates as numbers.
- **Teams:** make teams of 3 to 5 that share a row on the table.
- **Report:** a printable page for one student with their entries, results, comments received and,
  after 10 settled probability answers, a calibration chart with a short note on where they were
  too sure or not sure enough. Students open their own with *My report*.

### Students working on their own copy

A student who cannot reach the class's computer (at home, or on another network) can hand in by
file:

1. On the assignment, press **Download hand-in sheet** and send the file to the student.
2. On their own copy of EconQuest, the student opens **Menu > Quests > Hand in**, opens the sheet,
   writes their answer and presses **Seal and save the file**, then sends the file back.
3. Press **Load sealed files** and pick the files (several at once is fine).

Only your class's copy can open a sealed file, and any change to it is detected. Each file loads
once. The time inside comes from the student's computer and is shown as such; a file sealed after
the due time is loaded and marked late. You and the student see the same short fingerprint, so you
both know it is the same file.

## End of term

### The gradebook

Open **Gradebook** on the class card. Each student has four parts out of 100:

| Part | What it measures |
| --- | --- |
| Participation | The share of assignments handed in |
| Accuracy | 100 × (1 − average Brier score). Always saying 50% gives 75 |
| Calibration | How closely their 70% answers came true 70% of the time (after 10 settled answers) |
| Marks | The marks you and your markers gave that read as a number, a fraction or a letter grade |

Set your own weights (they add up to 100; 25, 25, 20 and 30 until you change them). A part with no
figure yet shares out its weight. Press *Download the gradebook (CSV)* for a file to open in a
spreadsheet. Quests that were withdrawn or could not be settled drop out of the marks. Each student
can download their own record with *Download my record (CSV)*.

### Archive and deletion

A class is archived 30 days after its last day of term. An archived class is read-only: the
gradebook and reports can still be read and downloaded. You choose how long it is kept, from 30
days to 10 years (a year until you change it). Every member sees the day it will be deleted, with
a warning in its last 30 days. On that day the class is deleted with its entries, feedback, reviews
and class Quests. Restoring an archived class cancels its deletion.

## Privacy, in short

- Everything stays on the computer that runs the app. There is no EconQuest cloud service.
- Class files are readable only by the app's own user on that computer.
- Students see classmates' entries only after the due time, and never on a sensitive topic.
- Every change to a class is written to the audit log.
- The full list of what is stored is in [PRIVACY.md](./PRIVACY.md).

## Accessibility

The classroom screens are designed for phone width first and checked on every change against WCAG
2.2 levels A and AA: names for every button and field, contrast, a visible keyboard focus, and
nothing that needs sideways scrolling at 320 pixels wide. See [ACCESSIBILITY.md](./ACCESSIBILITY.md).

## A sample term (12 weeks)

| Week | In class | In EconQuest |
| --- | --- | --- |
| 1 | What a forecast is; probabilities and base rates | Replays: oil and currencies, weeks 1 and 2 |
| 2 | Scoring rules: why the Brier score rewards giving the probability you really believe | Replays: weeks 3 and 4; first look at *My report* |
| 3 | Commodity prices and terms of trade | First Forecast Quest set (settles in about 6 weeks) |
| 4 | Central banks and policy rates | Replays: policy rates; second Forecast Quest |
| 5 | Exchange rates | Replays: exchange rates |
| 6 | Arguing a policy position | Debate Quest with peer review |
| 7 | Reading the peer reviews | Feedback on the debate |
| 8 | Inflation | Forecast Quest on inflation or a class Quest |
| 9 | First results: luck and skill | Class table and calibration charts |
| 10 | Fiscal policy and debt | Debate Quest |
| 11 | Revising forecasts | Last Forecast Quest |
| 12 | Review | Reports printed; gradebook downloaded |

## When something goes wrong

| What you see | What to do |
| --- | --- |
| Students cannot open the address | Check that the app is running and that the computer and students are on the same network. If the school Wi-Fi isolates devices, ask IT to allow port 3000 to this computer (see SCHOOL_IT.md). |
| A figure says Missing | The data source did not answer, or has not published yet. The reason is shown. The Quest settles once the figure arrives. |
| A student forgot their password | An administrator resets it in Menu > Users; the new password is shown once. |
| "Too many class requests" | A person pressed very quickly; wait a few seconds. |
| A sealed file is refused | The message says why: changed, made for another class or assignment, already loaded, or the username is not a student in this class. |
| The class is read-only | The term ended more than 30 days ago and the class was archived. Restore it on the class card if you need to change something. |

Questions and problems: open an issue on the project's GitHub page, or write to the address in
[SECURITY.md](./SECURITY.md) for anything about security.
