export const config = Object.freeze({
  samplePath: "./data/sample.json",
  sampleLoadDelayMs: 650,
  maxExcerptLength: 280,
  maxSlidePages: 80,
  maxTextbookPages: 120,
  maxMatchesPerSlide: 4,
  maxExercisesPerSlide: 4,
  confidenceLevels: ["low", "medium", "high"],
  features: Object.freeze({
    pdfAnalysis: false,
    webPractice: false,
  }),
});
