import { source } from "./source.js";
import {
  clearResults,
  renderAnalysis,
  setBusy,
  setStatus,
  showEmpty,
  showError,
} from "./ui.js";

const form = document.querySelector("#analysis-form");
const slidesFile = document.querySelector("#slides-file");
const textbookFile = document.querySelector("#textbook-file");
const sampleButton = document.querySelector("#show-sample-button");
const emptyButton = document.querySelector("#show-empty-button");
const errorButton = document.querySelector("#show-error-button");

function setActiveStateButton(activeButton) {
  [sampleButton, emptyButton, errorButton].forEach((button) => {
    button.classList.toggle("is-active", button === activeButton);
  });
}

function updateFileLabel(input, labelSelector) {
  const label = document.querySelector(labelSelector);
  label.textContent = input.files?.[0]?.name ?? "Choose a PDF";
}

async function loadSample(params = {}) {
  clearResults();
  setBusy(true);
  setStatus("Preparing the sample lecture map…");

  try {
    const analysis = await source.load(params);
    renderAnalysis(analysis);
    setStatus(`Sample ready · ${analysis.slides.length} slide pages mapped`);
    setActiveStateButton(sampleButton);
  } catch (error) {
    showError(error instanceof Error ? error.message : "The sample analysis could not be loaded.");
    setStatus("Sample unavailable");
  } finally {
    setBusy(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const pageStart = Number(data.get("pageStart"));
  const pageEnd = Number(data.get("pageEnd"));

  if (!pageStart || !pageEnd || pageStart > pageEnd) {
    showError("Enter a valid textbook page range with the first page before the last page.");
    setStatus("Check the page range");
    setActiveStateButton(errorButton);
    return;
  }

  loadSample({ pageStart, pageEnd });
});

slidesFile.addEventListener("change", () => updateFileLabel(slidesFile, "#slides-file-name"));
textbookFile.addEventListener("change", () => updateFileLabel(textbookFile, "#textbook-file-name"));

sampleButton.addEventListener("click", () => loadSample());
emptyButton.addEventListener("click", () => {
  showEmpty("No analysis is open. Choose Sample to return to the example study guide.");
  setStatus("Workspace cleared");
  setActiveStateButton(emptyButton);
});
errorButton.addEventListener("click", () => {
  showError("We couldn’t prepare this lecture map. Check the selected files and page range, then try again.");
  setStatus("Analysis needs attention");
  setActiveStateButton(errorButton);
});

loadSample();
