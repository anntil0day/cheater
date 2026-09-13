# Manual Regression Checks

Run this checklist after every phase. It is designed to take less than three minutes. Add later-phase checks to the end; never remove an earlier check.

## Phase 0

- [ ] Page loads with no console errors.
- [ ] The main action shows a busy state, then produces a visible sample result.
- [ ] Choosing **Empty** shows a specific, readable empty state.
- [ ] Choosing **Error** shows a readable error message rather than a stack trace.
- [ ] The busy state disables the main action and clears after loading.
- [ ] The dashboard is usable at 375px wide with no unintended horizontal page scrolling.
- [ ] No secret appears in files tracked by Git.
- [ ] Clicking each slide page updates the main detail panel.
- [ ] Every sample textbook excerpt includes a page number and relationship explanation.
- [ ] Every sample textbook exercise includes a label, page number, question excerpt, and tested knowledge point.
- [ ] An invalid page range produces a readable error and does not blank the page.
- [ ] File controls accept PDF files only and selected filenames remain visible.
- [ ] The sample JSON contains all keys defined in `CONTRACTS.md`.
