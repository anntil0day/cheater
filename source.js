import { config } from "./config.js";

let cachedAnalysis = null;

const pause = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function getSample() {
  if (cachedAnalysis) return structuredClone(cachedAnalysis);

  const response = await fetch(config.samplePath);
  if (!response.ok) {
    throw new Error("The sample analysis could not be loaded. Please refresh and try again.");
  }

  cachedAnalysis = await response.json();
  return structuredClone(cachedAnalysis);
}

export const source = Object.freeze({
  async load(params = {}) {
    await pause(config.sampleLoadDelayMs);
    const analysis = await getSample();

    if (params.pageStart && params.pageEnd) {
      analysis.textbookPageRange = {
        start: Number(params.pageStart),
        end: Number(params.pageEnd),
      };
    }

    return analysis;
  },

  async detail(id) {
    const analysis = await getSample();
    return analysis.slides.find((slide) => slide.slideId === id) ?? null;
  },

  async morePractice() {
    throw new Error("Public practice questions are not used in Phase 0.");
  },

  async list() {
    return [await getSample()];
  },
});
