# Kanji Learning PWA — Core Summary

## Vision
Build a lightweight, offline-first Progressive Web App for learning Japanese kanji from TSV datasets.

## Core goals
- Vanilla HTML, CSS, and JavaScript.
- Works as a PWA and can be installed.
- Supports browse and quiz study flows.
- Loads kanji data from TSV files without mutating the data files.
- Stores user progress separately from the TSV content.
- Grows through small versioned changes.

## Data model
The TSV files use a stable `ID` column so user progress can be tracked across sessions.

Current files:
- `N5_v1.0.tsv`
- `N4_v1.0.tsv`
- `N3_v1.0.tsv`

## UI behavior
Browse mode:
- Show one kanji at a time.
- Provide previous and next navigation.
- Show the meaning and example fields.

Quiz mode:
- Shuffle the selected range.
- Quiz only the selected range.
- Accept semicolon-separated meanings case-insensitively.
- Turn the card green for correct answers.
- Turn the card pink for incorrect answers.
- Reveal the answer after three failed attempts.
- Show a Continue button after reveal.
- Show a completion grid at the end of the quiz.
- Provide a Statistics view in quiz mode.

## Invariants
These should remain true in every future build:
- The Levels dropdown must always populate.
- The dropdown must first use a built-in fallback list.
- The dropdown may then refresh from `data-index.json` if available.
- The settings cog must still work.
- The Add TSV action must remain available from settings.
- Browse and quiz modes must remain distinct.
- Quiz statistics must be recorded separately from the TSV files.
- The app must not require manual editing of the TSV files.

## Persistent state
Stored in localStorage:
- current TSV selection
- quiz mode
- quiz range
- added TSV files
- settings panel visibility
- quiz statistics

## Next steps
- Turn quiz statistics into a clearer progress dashboard.
- Add export and import for progress data.
- Consider IndexedDB for richer long-term storage.
- Add filtering by level or tag.
- Add more review types later.

## Repository rule
Treat the dropdown population code as core infrastructure, not optional UI code.
