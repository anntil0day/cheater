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
- [ ] The selected slide displays as a complete 16:9 page rather than a text excerpt.
- [ ] Each textbook match displays a complete portrait page with the related paragraph visibly highlighted.
- [ ] Changing slide pages updates both the full slide preview and its related highlighted textbook pages.
- [ ] Full-page previews remain readable and do not cause horizontal page scrolling at 375px wide.

## Phase 1

- [ ] Submitting without both PDF files shows a readable missing-file message.
- [ ] Non-PDF files are rejected and selected PDF filenames remain visible.
- [ ] Invalid, oversized, or out-of-bounds textbook ranges show a readable error.
- [ ] A text-based slide PDF and textbook PDF produce one selectable result for every slide page.
- [ ] Extraction and matching use only textbook pages inside the entered inclusive range.
- [ ] Every uploaded slide result displays the complete original slide page.
- [ ] Every confident textbook match displays the complete original textbook page with the related paragraph highlighted.
- [ ] Every match includes its textbook page number, a short excerpt, a plain-language relationship, and confidence.
- [ ] Possible exercises are listed only from the selected textbook pages and include the required exercise fields.
- [ ] A lecture summary shows detected concepts, an overview, important pages, and review focus.
- [ ] No-match, no-exercise, and low-text cases produce readable warnings or errors instead of a blank screen.
- [ ] PDF analysis happens locally in the browser and introduces no secret, model call, or upload endpoint.
- [ ] The Phase 0 sample, empty, and error states still work after uploaded-PDF analysis is added.
