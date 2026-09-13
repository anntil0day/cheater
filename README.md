# Lecture Textbook Mapper

A focused study dashboard that will map lecture slides to relevant textbook passages and exercises. Phase 0 establishes the static interface and stable contracts using representative sample content.

## Run locally

The app uses browser ES modules and loads `data/sample.json`, so serve the folder over HTTP rather than opening `index.html` directly.

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Current phase

Phase 0 includes:

- a responsive study dashboard;
- sample slide-to-textbook mappings and exercises;
- loading, empty, error, and success states;
- stable UI, source, and data contracts.

It does not parse uploaded PDFs or make model, API, or web-search calls. Those capabilities belong to later phases.

## Project structure

- `index.html` — stable application markup
- `style.css` — visual design and responsive layout
- `app.js` — user event wiring
- `ui.js` — all visible rendering and states
- `source.js` — sample data access
- `config.js` — tunable values and feature flags
- `data/sample.json` — representative analysis data
- `CONTRACTS.md` — protected interfaces for later phases
- `CHECKS.md` — manual regression checklist

## Deployment

The project is a dependency-free static site and can be deployed directly to Vercel.
