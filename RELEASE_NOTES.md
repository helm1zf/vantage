## Unreleased

- **Fix: one damaged report could break the Dashboard and the Morning report page.** A report's JSON is written by a language model; a list written as text, an empty slot inside a list, or an object where text belongs made the page stop drawing. Reports are now cleaned once where they are read, and a good report is left exactly as it is. New test `tools/ui-tests/badreport.js` (13 kinds of damage on 5 pages).
- **Fix: System check (Profile) did nothing when `doctor.py` printed something unexpected.** It now says "not available" instead of failing silently. New test `tools/ui-tests/doctor.js`.
- **Fix: a long run of the daily search could be mistaken for a dead one.** Three tries with waits can take about 2.5 hours; the lock now lasts 4 hours and the Windows time limit is 3 hours (it was 90 minutes and 2 hours). The Windows task also names its principal, as every exported task does. The page no longer says "needs macOS or Windows" when the status merely could not be read; it offers "Check again".
- **Tests no longer hide errors.** The test harness silently dropped page errors that mentioned `forEach`, `filter` or `cv_modified`; that hid the System check bug above. Nothing is filtered now.
- **The daily Morning Report is now a real task of your computer.** It was a timer inside the app, so no report came when Vantage was closed. Now macOS (launchd) or Windows (Task Scheduler) starts the search at your time, even with Vantage closed, and a Mac that was asleep runs it when it wakes. The Morning report page shows when it runs next and when it last ran; if the last run failed it says why (for example "Claude Code is not logged in") and offers Try again. A failed run is tried up to three times. Anyone who had the old switch on is moved to the new task automatically. Windows is built from the same code but has not been tried on a real Windows PC yet.
- **A calmer Morning report page.** One control card holds the search and the schedule. The report has three tabs (Today, Considered, Search) instead of one long scroll, and the one orange button is the top recommendation's. Empty fields no longer show as "undefined" or "Invalid Date".
- **Fix: tests for the Dashboard and the new page were not part of the checks.** `dashboard.js` was never run by `tools/ui-tests/run.js` (so not in CI either); it is now, together with `morning.js`.
- **A Dashboard that leads with what to do now.** The Today card is the biggest thing on the page: the most important step (an Offer first, then an interview, then the most overdue) is shown large with the one orange button; the other steps are smaller and their late labels muted. The numbers (Active, In interview, Reply rate, Offer) are one quiet line under it, the funnel is one line you can unfold, and the secondary cards have quieter titles and are only as tall as their content. Each next step is shown once (an Offer's step is in Today too). Only urgent items in Needs attention have a coloured dot. The backup reminder is a slim line at the bottom, the paste box is a plain field, and the weekly goal is a thin line under Today. New test `tools/ui-tests/dashboard.js`.
- **Fix: overdue steps were listed twice on the Dashboard.** The first paint showed every overdue step in the Today card and again in Needs attention (the page was drawn before the feature scripts had loaded and the later redraw was skipped). Needs attention now follows the saved Today setting directly. New test `tools/ui-tests/first_paint.js`.

## What's new in 0.9.1

- **Work replies are no longer cut short.** Arga, Bayu, Tari, Laras and the Applications chat now show what they checked (documents the posting asks for, dates, language, location) and the gaps, instead of a two-sentence summary. Nova and Raka stay short. In a test the short rule made Arga write that required documents "can be met" without looking; the full reply costs about the same.
- **Reply detail** (Short / Standard / Full) in each chat's menu. Standard is the default; the Inbox tidy-up always stays short.
- **Cost limit** for the Applications chat and Laras raised to $8 as a safety stop only.
- **Checks.** `tools/check_all.sh` runs every CI step before a push, and a UI test that depended on today's date no longer fails as time passes.
- **Arga** checks the documents a posting asks for before saying they can be met, and reads the city from identity.json to rate the location.

## What's new in 0.9.0

- **Dark theme.** A button next to "?" switches between light, dark and automatic.
- **Add an application by hand**, for a job you found yourself. The folder and the tracker entry are made in one step, and a company you already have is flagged.
- **Contacts and notes** in every application, and a **follow-up draft** (English, German, Bahasa) for sent applications. What you note is also written to a read-only file the agents read.
- **Today card** with the due next steps (tick or snooze) and a weekly goal. These steps are no longer repeated in Needs attention while the card is shown.
- **Board tools:** search, minimum match, sort, hide closed, and Select to move several cards at once.
- **Export** the applications as a spreadsheet (CSV) and a calendar file (.ics).
- **Needs a look** card for old Vantage folders filed under materials and applications whose folder is gone; a **backup reminder** after 7 days; **Customize** to hide any Dashboard card.
- **Fixes.** The tutorial's "Copy path" button did nothing (a missing helper); a malformed script answer could break a dialog; notes saved in the app now reach the agents within seconds, not only after the next redraw.
- **Cleanup.** Removed dead code, unused styles and translations of the old Claude chat flow, and the generated UPDATE.md (the change history is riwayat_migrasi.md). README and INSTALL.md now describe the app as it works today.
- **Checks.** Rust unit tests, kit script tests, UI tests and a CI workflow (clippy, tests, translations, kit consistency) run on every push to main.

## What's new in 0.8.8

- **Conversations carry on after an update.** Nothing is forgotten: the same conversation goes on, and the agent is told once that its instructions and tools are new, so it follows them instead of old answers. The recap for a new day or a long pause again includes the agents' own replies.

## What's new in 0.8.7

- **Buttons go straight to the right person.** Find jobs now (and the daily search) starts Sinta herself, Update Master CV starts Bayu, study plans start Arga, and a message that names a member ("@Sinta ...", "Arga: ...") goes to that member. Nova is no longer asked first just to pass the job on, so fewer tokens are spent and the answer is not diluted by small talk between agents.
- **Tokens per agent.** Under a reply that several agents worked on, the label now shows who used how much ("Sinta 12k · Arga 4k").
- **No more "coming soon" for the daily search.** The daily Morning Report exists since 0.8.0; Nova no longer says it is not available.
- **Old behaviour no longer comes back after an update.** The specialist agents in your folder are replaced by the new ones when they changed (the old copy is kept).
- **Approval cards work for long commands.** The whole command is kept (it is only shown shortened), and "Allow once" no longer pastes a cut-off command back into the chat. Programs typed into the command line are not run; the agent is told to use a Vantage script instead.
- **Folders move the same way from chat and from the board.** New move_application script (instead of mv or Move-Item, which chat may not run): moves the folder, updates the tracker and sets the next step.
- **Learn page layout fixed** (the checklist no longer sits against the panel edge and the progress bar is visible).
- **Safer.** Only documents, images and text files can be opened from the document list; a program that came in with an imported folder cannot be started from there. A missing script now offers "Update now" right away.

## What's new in 0.8.6

- **Export and import your account.** In Profile, **Export account** saves everything (documents, workflow, Inbox, your notes in the app, chats) as one zip with a list of every file. **Import account** takes that file back in on any computer, exactly. Nothing is overwritten: a file that differs is kept next to the existing one, and your tracker and app notes are merged.
- **Proof that nothing is missing.** After an import Vantage compares every file with the package and tells you "Every file of the package is accounted for", or names each file that failed in plain words (open in another program, a folder in the way, path too long, disk full, damaged) with what to do. **Check import** repeats the comparison at any time.
- **Nova finishes what is open.** The import writes a report that Nova, Raka and Laras read: **Ask Nova to finish** works through every open item until the report is clean. Safe to run again.

## What's new in 0.8.5

- **The app and the chat agree.** Moving a card in the app now also sets the next step the way Nova does it: a sent application gets its 14-day follow-up, a closed one clears the old reminder, and Undo restores the old values exactly. Every change made in the app is written to a short log (app_changes.log) that Nova, Raka and Laras read at the start of a conversation.
- **What you note in the app reaches the agents.** Interview prep and practice scores, learning goals and offer weights are also saved as plain text (ui_context.md), so you do not have to repeat them in chat.
- **Nothing is lost when two things save at once.** applications.json and your settings are now written in one step, and the app refuses to overwrite applications.json if Nova changed it meanwhile (you get a short message and try again). A damaged settings file is kept aside instead of being replaced by an empty one.
- **Clearer message when Python is missing.**

## What's new in 0.8.4

- **Cleaner pages.** The period buttons on the Dashboard report card no longer touch the card edge; the last row of a page is no longer hidden behind the chat button; Applications board columns keep a readable width and scroll sideways on a small window.
- **Profile tools in one place.** Back up, Import, Fix misplaced files, System check and Personal page now sit together in one "Your data and tools" row under your name, instead of at the bottom of the page.
- **Fixed two stray boxes.** An empty box appeared next to "Check the fit with Arga" and next to "Got it" in the Since-you-were-last-here banner.
- **Line breaks in messages.** Messages in dialogs now show their line breaks.
- **Morning report.** The "max" count is only shown when the report has one.

## What's new in 0.8.3

- **Fix misplaced files.** Profile has a new button. If parts of an old Vantage already ended up inside your materials (a folder called Archive, workflows, workflow_import with 01_Pipeline, Daily_Recommendation and so on), one click puts them back where they belong. You see the list first; the originals are moved, not deleted, to --usersettings/imported.

## What's new in 0.8.2

- **Tidy up recognises an old Vantage.** If you drop a whole old Vantage folder, or just 02_workflow, role_model, the Daily_Recommendation folder, JD_Insights.md or your old raw facts into the Inbox, Vantage now puts each part back where it belongs before Raka starts. Nothing ends up under "Archive" any more, and your Skills page fills from the old JD_Insights. The originals are kept under --usersettings/imported.
- **Fewer invented folders.** Raka keeps the original CV and photo loose in materials and uses a fixed list of categories (plus Languages).

## What's new in 0.8.1

- **Back up and import in one click.** Profile has two new buttons. **Back up my data** saves your whole folder as one zip. **Import old data** brings in an old Vantage folder or a backup: you see the plan first, nothing is overwritten (a different file is kept next to the existing one) and the old folder is never changed. No more copying workflow, documents and materials by hand.
- **Research and other categories show up properly.** If Raka sorts your materials into folders like research or education, every project now appears on its own line inside its category, instead of one flat list of all files.
- **Tidy up no longer refuses.** Raka may now move your raw facts file and old morning reports too. If a file with the same name already exists, both are kept (the new one ends in _from_inbox). If Windows says a file is in use, you get a plain message to close the program and try again.
- **Profile page scrolls.** The materials list is taller and easier to read.

## What's new in 0.8.0

- **Tutorial in topics.** The tutorial is now split into five topics (Getting started, Find jobs, Applications, Interview and learning, You and your tools) with 23 short steps that point at the real buttons. New topics are marked "New" and open by itself only when something new was added. A "Do not show me again" button turns the automatic tutorial off; the ? button always opens it.
- **Search everything (Ctrl/Cmd+K).** One box finds pages, actions, applications, chats and materials.
- **Daily search.** Turn it on in Morning report and Vantage runs the search by itself at the time you choose while it is open (or once when you open it).
- **Paste a job.** Paste a link or a whole ad on the Dashboard; Vantage reads it and one button sends it to Arga for the fit check.
- **Since you were last here.** A Dashboard card lists what changed while Vantage was closed.
- **Pre-send check and send pack.** Check the final PDFs of an application and build a clean zip to upload.
- **Compare offers.** An Offers tab scores your offers with the weights you set.
- **Interview prep tracker.** A real checklist with a practice log (score 1 to 5) per application.
- **Learn tab.** Your skill gaps with a goal (from zero, job-ready, hero), a week tracker, the "enough for the market" marker and a study pack (.zip).
- **Personal page.** Turn your Master CV into one private web page on your computer.
- **System check.** See what the computer still needs and fix each item with one button.
- **Updates by script.** Vantage files are now updated by comparing and replacing them (with a backup), instead of an AI retyping an 11,000 line file. The old claude.ai Project instructions and the manual tool setup are gone.
