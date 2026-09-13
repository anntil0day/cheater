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

function renderSlideGraphic(visual) {
  const graphics = {
    market: `
      <div class="market-visual" aria-hidden="true">
        <span class="market-group">Buyers<small>Demand</small></span>
        <span class="market-exchange">↔</span>
        <span class="market-group market-sellers">Sellers<small>Supply</small></span>
      </div>`,
    demand: `
      <svg class="chart-visual" viewBox="0 0 360 220" role="img" aria-label="A downward-sloping demand curve">
        <path class="chart-axis" d="M48 22V184H332" />
        <path class="demand-line" d="M78 52L300 164" />
        <text x="305" y="160">D</text><text x="18" y="30">Price</text><text x="262" y="207">Quantity</text>
      </svg>`,
    shift: `
      <svg class="chart-visual" viewBox="0 0 360 220" role="img" aria-label="Demand curve shifting to the right">
        <path class="chart-axis" d="M48 22V184H332" />
        <path class="demand-line muted-line" d="M78 52L250 164" />
        <path class="demand-line" d="M132 52L304 164" />
        <path class="shift-arrow" d="M154 102H220M211 91L222 102L211 113" />
        <text x="238" y="160">D₁</text><text x="298" y="160">D₂</text>
      </svg>`,
    equilibrium: `
      <svg class="chart-visual" viewBox="0 0 360 220" role="img" aria-label="Supply and demand curves meeting at equilibrium">
        <path class="chart-axis" d="M48 22V184H332" />
        <path class="demand-line" d="M78 52L300 164" />
        <path class="supply-line" d="M78 164L300 52" />
        <circle class="equilibrium-point" cx="189" cy="108" r="7" />
        <path class="guide-line" d="M48 108H189V184" />
        <text x="196" y="99">E</text><text x="302" y="58">S</text><text x="302" y="165">D</text>
      </svg>`,
  };

  return graphics[visual] ?? graphics.market;
}

function renderFullSlide(slide) {
  const preview = slide.slidePreview;
  if (preview?.imageUrl) {
    return `<img class="original-page-image original-slide-image" src="${escapeHtml(preview.imageUrl)}" alt="${escapeHtml(preview.alt)}">`;
  }

  return `
    <div class="sample-slide-page" aria-label="Full sample slide page: ${escapeHtml(slide.slideTopic)}">
      <div class="sample-slide-topline">
        <span>${escapeHtml(preview?.courseLabel ?? "Lecture")}</span>
        <span>${String(slide.slidePage).padStart(2, "0")}</span>
      </div>
      <div class="sample-slide-body">
        <div class="sample-slide-copy">
          <p>${escapeHtml(preview?.kicker ?? slide.slideTopic)}</p>
          <h4>${escapeHtml(preview?.title ?? slide.slideTopic)}</h4>
          <p class="sample-slide-subtitle">${escapeHtml(preview?.subtitle ?? slide.slideTextExcerpt)}</p>
          <ul>${(preview?.bullets ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        <div class="sample-slide-graphic">${renderSlideGraphic(preview?.visual)}</div>
      </div>
      <div class="sample-slide-footer"><span>Principles of Microeconomics</span><span>Lecture 03</span></div>
    </div>`;
}

function renderTextbookPage(match) {
  const preview = match.textbookPagePreview;
  if (preview?.imageUrl) {
    return `
      <div class="textbook-image-wrap">
        <img class="original-page-image" src="${escapeHtml(preview.imageUrl)}" alt="${escapeHtml(preview.alt)}">
        ${(preview.highlightRegions ?? []).map((region) => `<span class="image-highlight" aria-hidden="true" style="left:${Number(region.x)}%;top:${Number(region.y)}%;width:${Number(region.width)}%;height:${Number(region.height)}%"></span>`).join("")}
      </div>`;
  }

  return `
    <div class="sample-textbook-page" aria-label="Full sample textbook page ${escapeHtml(match.textbookPage)} with a related paragraph highlighted">
      <header><span>${escapeHtml(preview?.chapterTitle ?? "Chapter")}</span><strong>${escapeHtml(match.textbookPage)}</strong></header>
      <p class="book-running-title">${escapeHtml(preview?.sectionTitle ?? "Related reading")}</p>
      <h5>${escapeHtml(preview?.heading ?? "Key concept")}</h5>
      <p>${escapeHtml(preview?.contextBefore ?? "The surrounding discussion introduces the terms and assumptions used in this section.")}</p>
      <mark>${escapeHtml(preview?.highlightText ?? match.excerpt)}</mark>
      <p>${escapeHtml(preview?.contextAfter ?? "The next section applies the idea with an example and connects it to the broader chapter.")}</p>
      <div class="book-note"><strong>Check your understanding</strong><span>${escapeHtml(preview?.marginNote ?? "How does this idea appear in the lecture slide?")}</span></div>
      <footer><span>The market forces of supply and demand</span><strong>${escapeHtml(match.textbookPage)}</strong></footer>
    </div>`;
}

function renderMatches(matches) {
  if (!matches.length) {
    return '<p class="section-empty">No confident textbook passages were found for this slide.</p>';
  }

  return matches.map((match) => `
    <article class="page-match-card">
      <div class="card-meta">
        <span class="page-reference">Textbook p. ${escapeHtml(match.textbookPage)}</span>
        ${confidenceLabel(match.confidence)}
      </div>
      ${renderTextbookPage(match)}
      <p class="relationship"><strong>Why this paragraph connects</strong>${escapeHtml(match.relationship)}</p>
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
        <p class="eyebrow">Slide ${escapeHtml(slide.slidePage)} · Full page</p>
        <h3>${escapeHtml(slide.slideTopic)}</h3>
      </div>
      <span class="range-chip">Textbook ${escapeHtml(currentAnalysis.textbookPageRange.start)}–${escapeHtml(currentAnalysis.textbookPageRange.end)}</span>
    </header>
    <section class="slide-page-section" aria-label="Selected slide page">
      <div class="page-frame page-frame-slide">${renderFullSlide(slide)}</div>
      <p class="page-caption"><span>${slide.slidePreview?.imageUrl ? "Original slide page" : "Complete sample slide page"}</span>${slide.slidePreview?.imageUrl ? "Rendered locally from the uploaded PDF." : "Upload PDFs above to replace the sample with your own material."}</p>
    </section>
    <section class="detail-section" aria-labelledby="matches-heading">
      <div class="section-heading">
        <div><p class="eyebrow">Evidence in context</p><h4 id="matches-heading">Related textbook pages</h4></div>
        <span>${slide.textbookMatches.length} page${slide.textbookMatches.length === 1 ? "" : "s"}</span>
      </div>
      <p class="section-intro">Each full page stays visible so you can understand the paragraph in its original context. The strongest match is highlighted.</p>
      <div class="textbook-page-grid">${renderMatches(slide.textbookMatches)}</div>
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
  const warnings = currentAnalysis?.warnings ?? [];
  elements.summaryContent.innerHTML = `
    <span class="topic-label">${escapeHtml(topic)}</span>
    <p class="summary-overview">${escapeHtml(summary.overview)}</p>
    <h4>Key concepts</h4>
    <ul class="tag-list">${summary.keyConcepts.map((concept) => `<li>${escapeHtml(concept)}</li>`).join("")}</ul>
    <h4>Important pages</h4>
    <p class="important-pages">${summary.importantPages.map((page) => `<span>${escapeHtml(page)}</span>`).join("")}</p>
    <h4>Review focus</h4>
    <ol class="review-list">${summary.reviewFocus.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
    ${warnings.length ? `<div class="warning-list"><strong>Analysis notes</strong><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></div>` : ""}
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
