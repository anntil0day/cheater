# Lecture Textbook Mapper

A focused study dashboard that maps lecture slides to relevant textbook passages and exercises. Phase 1 analyzes text-based PDFs entirely in the browser and keeps the Phase 0 sample available as a quick demonstration.

## Run locally

The app uses browser ES modules and loads `data/sample.json`, so serve the folder over HTTP rather than opening `index.html` directly.

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Current phase

Phase 1 includes:

- a responsive study dashboard;
- local upload handling for one slides PDF and one textbook PDF;
- text extraction from every slide and an inclusive, manually selected textbook page range;
- transparent keyword-overlap mapping, possible-exercise detection, and lecture summarization;
- complete original slide pages paired with complete original textbook pages and highlighted matching paragraphs;
- readable warnings for partial results and errors for invalid or low-text material;
- the original sample slide-to-textbook mappings and interface states;
- loading, empty, error, and success states;
- stable UI, source, and data contracts.

PDF files remain in the current browser session: the app has no upload endpoint, backend, model call, API key, or saved history. Scanned/image-only PDFs require OCR and are not supported in this phase. Public-web practice questions belong to Phase 2.

## Limits

- Slides: up to 80 pages.
- Selected textbook range: up to 120 pages.
- Each PDF: up to 60 MB.
- Matching is lexical and transparent, so synonyms that share no wording may be missed.

## Project structure

- `index.html` — stable application markup
- `style.css` — visual design and responsive layout
- `app.js` — user event wiring
- `ui.js` — all visible rendering and states
- `source.js` — sample data access
- `config.js` — tunable values and feature flags
- `data/sample.json` — representative analysis data
- `vendor/pdfjs/` — vendored PDF.js browser runtime and supporting assets
- `CONTRACTS.md` — protected interfaces for later phases
- `CHECKS.md` — manual regression checklist

## Dependency

Phase 1 vendors Mozilla PDF.js 6.3.289 under its Apache 2.0 license. See `vendor/pdfjs/LICENSE`. No package manager or build step is required to run the app.

## Deployment

The project is a static site and can be deployed directly to Vercel. The PDF.js runtime is committed with the site, so deployment does not run a package installation or build step.
