# Lecture Textbook Mapper Contracts

These contracts establish the stable seams for every later build phase.

## Analysis data shape

Every complete analysis must include every key below. Missing values use `""`, `null`, or `[]`; keys are never omitted.

```js
{
  lectureTitle: "",
  detectedCourseTopic: "",
  textbookPageRange: { start: null, end: null },
  slides: [
    {
      slideId: "",
      slidePage: 1,
      slideTopic: "",
      slideTextExcerpt: "",
      textbookMatches: [
        {
          matchId: "",
          textbookPage: 1,
          excerpt: "",
          relationship: "",
          confidence: "medium"
        }
      ],
      textbookExercises: [
        {
          exerciseId: "",
          exerciseLabel: "",
          textbookPage: 1,
          questionExcerpt: "",
          testedKnowledgePoint: "",
          confidence: "medium"
        }
      ],
      webExercises: []
    }
  ],
  lectureSummary: {
    keyConcepts: [],
    overview: "",
    importantPages: [],
    reviewFocus: []
  },
  warnings: []
}
```

Confidence values are `"low"`, `"medium"`, or `"high"`.

## Stable HTML IDs

`analysis-form`, `slides-file`, `slides-file-name`, `textbook-file`, `textbook-file-name`, `page-start`, `page-end`, `analyze-button`, `workspace-title`, `show-sample-button`, `show-empty-button`, `show-error-button`, `status-region`, `message-panel`, `loading-panel`, `analysis-panel`, `slide-list-title`, `slide-count`, `slide-list`, `slide-detail`, `summary-panel`, `summary-title`, and `summary-content`.

## Stable UI exports

`ui.js` exports:

```js
setBusy(isBusy)
setStatus(message)
showError(message)
showEmpty(message)
renderAnalysis(analysis)
clearResults()
```

The UI layer owns all visible rendering and never fetches or extracts data.

## Stable source exports

`source.js` exports an object named `source` with async methods:

```js
source.load(params)
source.detail(id)
source.morePractice(params)
source.list()
```

The source layer is the only place data enters the application. Unused phase methods remain exported and return or throw a readable phase-specific result.

## File responsibility contract

- `index.html`: markup and stable IDs only; no inline product logic.
- `style.css`: all presentation and responsive rules.
- `app.js`: event wiring and calls between source and UI only.
- `ui.js`: visible states and rendering only.
- `source.js`: all incoming data and future extraction/retrieval coordination.
- `config.js`: all tunable limits, thresholds, delays, and feature flags.

## DO NOT CHANGE WITHOUT ASKING

Do not rename or remove analysis keys, stable HTML IDs, UI exports, source methods, or the file responsibilities above without explicit user approval. Later phases must extend these contracts additively.
