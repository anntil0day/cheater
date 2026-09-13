const elements = {
  analyzeButton: document.querySelector("#analyze-button"),
  statusRegion: document.querySelector("#status-region"),
  messagePanel: document.querySelector("#message-panel"),
  loadingPanel: document.querySelector("#loading-panel"),
  analysisPanel: document.querySelector("#analysis-panel"),
  slideList: document.querySelector("#slide-list"),
  slideCount: document.querySelector("#slide-count"),
  slideDetail: document.querySelector("#slide-detail"),
  summaryContent: document.querySelector("#summary-content"),
};

let currentAnalysis = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function confidenceLabel(confidence) {
  return `<span class="confidence confidence-${escapeHtml(confidence)}">${escapeHtml(confidence)} confidence</span>`;
}

function renderMatches(matches) {
  if (!matches.length) {
    return '<p class="section-empty">No confident textbook passages were found for this slide.</p>';
  }

  return matches.map((match) => `
    <article class="evidence-card">
      <div class="card-meta">
        <span class="page-reference">Textbook p. ${escapeHtml(match.textbookPage)}</span>
        ${confidenceLabel(match.confidence)}
      </div>
      <blockquote>“${escapeHtml(match.excerpt)}”</blockquote>
      <p class="relationship"><strong>Why it connects</strong>${escapeHtml(match.relationship)}</p>
    </article>
  `).join("");
}

function renderExercises(exercises) {
  if (!exercises.length) {
    return '<p class="section-empty">No related exercises were identified in the selected pages.</p>';
  }

  return exercises.map((exercise) => `
    <article class="exercise-card">
      <div class="card-meta">
        <span class="exercise-label">${escapeHtml(exercise.exerciseLabel)}</span>
        <span class="page-reference">p. ${escapeHtml(exercise.textbookPage)}</span>
      </div>
      <p>${escapeHtml(exercise.questionExcerpt)}</p>
      <p class="knowledge-point"><span>Tests</span>${escapeHtml(exercise.testedKnowledgePoint)}</p>
    </article>
  `).join("");
}

function renderSlide(slideId) {
  const slide = currentAnalysis?.slides.find((item) => item.slideId === slideId);
  if (!slide) return;

  elements.slideList.querySelectorAll("button").forEach((button) => {
    const selected = button.dataset.slideId === slideId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-current", selected ? "page" : "false");
  });

  elements.slideDetail.innerHTML = `
    <header class="detail-header">
      <div>
        <p class="eyebrow">Slide ${escapeHtml(slide.slidePage)}</p>
        <h3>${escapeHtml(slide.slideTopic)}</h3>
      </div>
      <span class="range-chip">Textbook ${escapeHtml(currentAnalysis.textbookPageRange.start)}–${escapeHtml(currentAnalysis.textbookPageRange.end)}</span>
    </header>
    <p class="slide-excerpt">${escapeHtml(slide.slideTextExcerpt)}</p>
    <section class="detail-section" aria-labelledby="matches-heading">
      <div class="section-heading">
        <h4 id="matches-heading">Related textbook passages</h4>
        <span>${slide.textbookMatches.length}</span>
      </div>
      <div class="card-stack">${renderMatches(slide.textbookMatches)}</div>
    </section>
    <section class="detail-section" aria-labelledby="exercises-heading">
      <div class="section-heading">
        <h4 id="exercises-heading">Practice from the textbook</h4>
        <span>${slide.textbookExercises.length}</span>
      </div>
      <div class="exercise-grid">${renderExercises(slide.textbookExercises)}</div>
    </section>
  `;
}

function renderSummary(summary, topic) {
  elements.summaryContent.innerHTML = `
    <span class="topic-label">${escapeHtml(topic)}</span>
    <p class="summary-overview">${escapeHtml(summary.overview)}</p>
    <h4>Key concepts</h4>
    <ul class="tag-list">${summary.keyConcepts.map((concept) => `<li>${escapeHtml(concept)}</li>`).join("")}</ul>
    <h4>Important pages</h4>
    <p class="important-pages">${summary.importantPages.map((page) => `<span>${escapeHtml(page)}</span>`).join("")}</p>
    <h4>Review focus</h4>
    <ol class="review-list">${summary.reviewFocus.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
  `;
}

export function setBusy(isBusy) {
  elements.analyzeButton.disabled = isBusy;
  elements.analyzeButton.setAttribute("aria-busy", String(isBusy));
  elements.loadingPanel.hidden = !isBusy;
  elements.loadingPanel.setAttribute("aria-hidden", String(!isBusy));
  if (isBusy) {
    elements.analysisPanel.hidden = true;
    elements.messagePanel.hidden = true;
  }
}

export function setStatus(message) {
  elements.statusRegion.textContent = message;
}

export function showError(message) {
  clearResults();
  elements.messagePanel.className = "message-panel message-error";
  elements.messagePanel.innerHTML = `<span class="message-icon" aria-hidden="true">!</span><div><strong>Something needs attention</strong><p>${escapeHtml(message)}</p></div>`;
  elements.messagePanel.hidden = false;
}

export function showEmpty(message) {
  clearResults();
  elements.messagePanel.className = "message-panel message-empty";
  elements.messagePanel.innerHTML = `<span class="message-icon" aria-hidden="true">○</span><div><strong>Your study workspace is empty</strong><p>${escapeHtml(message)}</p></div>`;
  elements.messagePanel.hidden = false;
}

export function renderAnalysis(analysis) {
  clearResults();
  currentAnalysis = analysis;
  elements.slideCount.textContent = `${analysis.slides.length} pages`;
  elements.slideList.innerHTML = analysis.slides.map((slide, index) => `
    <button class="slide-item${index === 0 ? " is-selected" : ""}" type="button" data-slide-id="${escapeHtml(slide.slideId)}" aria-current="${index === 0 ? "page" : "false"}">
      <span class="slide-number">${String(slide.slidePage).padStart(2, "0")}</span>
      <span><strong>${escapeHtml(slide.slideTopic)}</strong><small>${slide.textbookMatches.length} passage${slide.textbookMatches.length === 1 ? "" : "s"}</small></span>
    </button>
  `).join("");

  elements.slideList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => renderSlide(button.dataset.slideId));
  });

  renderSummary(analysis.lectureSummary, analysis.detectedCourseTopic);
  elements.analysisPanel.hidden = false;
  if (analysis.slides.length) renderSlide(analysis.slides[0].slideId);
  else showEmpty("This analysis does not contain any slide pages.");
}

export function clearResults() {
  currentAnalysis = null;
  elements.analysisPanel.hidden = true;
  elements.messagePanel.hidden = true;
  elements.slideList.innerHTML = "";
  elements.slideDetail.innerHTML = "";
  elements.summaryContent.innerHTML = "";
}
