import * as pdfjsLib from "./vendor/pdfjs/pdf.min.mjs";
import { config } from "./config.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(config.pdfWorkerPath, import.meta.url).href;

let currentAnalysis = null;
let sampleAnalysis = null;

const stopWords = new Set(config.stopWords);
const pause = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const report = (callback, message) => callback?.(message);

function blankSlidePreview(imageUrl, alt) {
  return {
    imageUrl,
    alt,
    courseLabel: "",
    kicker: "",
    title: "",
    subtitle: "",
    bullets: [],
    visual: "",
  };
}

function blankTextbookPreview(imageUrl, alt, highlightRegions, highlightText) {
  return {
    imageUrl,
    alt,
    highlightRegions,
    chapterTitle: "",
    sectionTitle: "",
    heading: "",
    contextBefore: "",
    highlightText,
    contextAfter: "",
    marginNote: "",
  };
}

function assertPdf(file, label) {
  if (!file) throw new Error(`Choose a ${label} PDF before starting the analysis.`);

  const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) throw new Error(`${label} must be a PDF file.`);
  if (file.size > config.maxFileSizeMb * 1024 * 1024) {
    throw new Error(`${label} is larger than the ${config.maxFileSizeMb} MB limit.`);
  }
}

async function openPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjsLib.getDocument({
    data,
    cMapUrl: new URL(config.pdfCMapPath, import.meta.url).href,
    cMapPacked: true,
    standardFontDataUrl: new URL(config.pdfStandardFontPath, import.meta.url).href,
    wasmUrl: new URL(config.pdfWasmPath, import.meta.url).href,
  });

  try {
    return await task.promise;
  } catch {
    throw new Error(`${file.name} could not be opened as a readable PDF.`);
  }
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .match(/[\p{L}\p{N}][\p{L}\p{N}'-]{2,}/gu)
    ?.filter((token) => !stopWords.has(token) && !/^\d+$/.test(token)) ?? [];
}

function lineToRegion(line, pageView) {
  const [left, bottom, right, top] = pageView;
  const width = right - left;
  const height = top - bottom;
  return {
    x: Math.max(0, ((line.x - left) / width) * 100 - 0.35),
    y: Math.max(0, ((top - line.y - line.height) / height) * 100 - 0.2),
    width: Math.min(100, (line.width / width) * 100 + 0.7),
    height: Math.min(100, (line.height / height) * 100 + 0.55),
  };
}

function groupTextItems(items, pageView) {
  const usable = items
    .filter((item) => "str" in item && normalizeText(item.str))
    .map((item) => ({
      text: normalizeText(item.str),
      x: item.transform[4],
      y: item.transform[5],
      width: Math.max(item.width || 0, 1),
      height: Math.max(item.height || Math.abs(item.transform[3]) || 8, 1),
    }))
    .sort((a, b) => Math.abs(b.y - a.y) > config.lineMergeTolerance ? b.y - a.y : a.x - b.x);

  const lines = [];
  for (const item of usable) {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= config.lineMergeTolerance);
    if (!line) {
      line = { y: item.y, height: item.height, items: [] };
      lines.push(line);
    }
    line.items.push(item);
    line.height = Math.max(line.height, item.height);
  }

  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = normalizeText(line.items.map((item) => item.text).join(" "));
    line.x = Math.min(...line.items.map((item) => item.x));
    const right = Math.max(...line.items.map((item) => item.x + item.width));
    line.width = right - line.x;
  }

  const paragraphs = [];
  for (const line of lines) {
    const previous = paragraphs.at(-1);
    const previousLine = previous?.lines.at(-1);
    const gap = previousLine ? previousLine.y - line.y : Infinity;
    const naturalGap = Math.max(previousLine?.height ?? line.height, line.height);
    const headingLike = line.text.length < 75 && !/[.!?]$/.test(line.text);
    const previousHeadingLike = previousLine && previousLine.text.length < 75 && !/[.!?]$/.test(previousLine.text);
    const startsNew = !previous || gap > naturalGap * config.paragraphGapMultiplier || previousHeadingLike;

    if (startsNew || headingLike && previous.lines.length > 2) {
      paragraphs.push({ lines: [line] });
    } else {
      previous.lines.push(line);
    }
  }

  return paragraphs.map((paragraph, index) => ({
    index,
    text: normalizeText(paragraph.lines.map((line) => line.text).join(" ")),
    lines: paragraph.lines,
    highlightRegions: paragraph.lines.map((line) => lineToRegion(line, pageView)),
  })).filter((paragraph) => paragraph.text.length > 2);
}

async function extractPage(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const paragraphs = groupTextItems(textContent.items, page.view);
  return {
    page,
    pageNumber,
    paragraphs,
    text: normalizeText(paragraphs.map((paragraph) => paragraph.text).join(" ")),
  };
}

async function renderPage(page) {
  const viewport = page.getViewport({ scale: config.pdfRenderScale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/jpeg", config.pdfImageQuality);
}

function relevanceScore(firstText, secondText) {
  const first = new Set(tokenize(firstText));
  const second = new Set(tokenize(secondText));
  if (!first.size || !second.size) return { score: 0, shared: [] };
  const shared = [...first].filter((token) => second.has(token));
  const score = shared.length / Math.sqrt(first.size * second.size);
  return { score, shared };
}

function confidenceFor(score) {
  if (score >= config.highConfidenceScore) return "high";
  if (score >= config.mediumConfidenceScore) return "medium";
  return "low";
}

function relationshipFor(shared, confidence) {
  if (!shared.length) return "This is the nearest available passage, but the connection is weak and should be checked manually.";
  const terms = shared.slice(0, 4).join(", ");
  const strength = confidence === "high" ? "directly develops" : confidence === "medium" ? "adds context to" : "may support";
  return `This paragraph ${strength} the slide through their shared focus on ${terms}. Review the highlighted text in its page context.`;
}

function pageHeading(pageData) {
  return pageData.paragraphs.find((paragraph) => (
    paragraph.text.length >= 4
    && paragraph.text.length <= 90
    && !/\b(lecture|slide|course)\b/i.test(paragraph.text)
  ))?.text ?? "";
}

function topicFromText(text, fallback) {
  const counts = new Map();
  for (const token of tokenize(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  const terms = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([token]) => token);
  if (!terms.length) return fallback;
  return terms.map((term) => term.charAt(0).toUpperCase() + term.slice(1)).join(" · ");
}

function bestTextbookMatches(slideData, textbookPages) {
  const bestByPage = [];
  for (const pageData of textbookPages) {
    const candidates = pageData.paragraphs
      .map((paragraph) => ({ paragraph, ...relevanceScore(slideData.text, paragraph.text) }))
      .sort((a, b) => b.score - a.score);
    if (candidates[0]) bestByPage.push({ pageData, ...candidates[0] });
  }

  return bestByPage
    .filter((candidate) => candidate.score >= config.minimumMatchScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxMatchesPerSlide);
}

function possibleExercises(textbookPages) {
  const labelPattern = /\b(exercise|problem|review question|practice|question)\s*([\w.-]+)?/i;
  const numberedPattern = /^\s*(\d{1,3}[.)]|[a-z][.)])\s+/i;
  const results = [];

  for (const pageData of textbookPages) {
    for (const paragraph of pageData.paragraphs) {
      const labelMatch = paragraph.text.match(labelPattern);
      const looksLikeQuestion = paragraph.text.includes("?") && paragraph.text.length <= 650;
      if (!labelMatch && !numberedPattern.test(paragraph.text) && !looksLikeQuestion) continue;
      results.push({
        pageData,
        paragraph,
        label: labelMatch ? normalizeText(labelMatch[0]) : "Possible exercise",
      });
    }
  }

  return results;
}

function exercisesForSlide(slideData, exercises) {
  return exercises
    .map((exercise) => ({ ...exercise, ...relevanceScore(slideData.text, exercise.paragraph.text) }))
    .filter((exercise) => exercise.score >= config.minimumExerciseScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxExercisesPerSlide)
    .map((exercise, index) => ({
      exerciseId: `exercise-${slideData.pageNumber}-${exercise.pageData.pageNumber}-${index + 1}`,
      exerciseLabel: exercise.label,
      textbookPage: exercise.pageData.pageNumber,
      questionExcerpt: exercise.paragraph.text.slice(0, config.maxExcerptLength),
      testedKnowledgePoint: topicFromText(exercise.paragraph.text, "Lecture concept review"),
      confidence: confidenceFor(exercise.score),
    }));
}

function lectureSummary(slidePages, slides) {
  const counts = new Map();
  for (const token of tokenize(slidePages.map((page) => page.text).join(" "))) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const keyConcepts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, config.maxKeyConcepts)
    .map(([token]) => token);
  const importantPages = [...new Set(slides.flatMap((slide) => slide.textbookMatches.map((match) => match.textbookPage)))].slice(0, 8);

  return {
    keyConcepts,
    overview: keyConcepts.length
      ? `This lecture centers on ${keyConcepts.slice(0, 4).join(", ")}. The map links each slide to the strongest passages found inside the selected textbook range.`
      : "The lecture was extracted, but too little text was available to produce a reliable topic overview.",
    importantPages,
    reviewFocus: keyConcepts.slice(0, 3).map((concept) => `Review how “${concept}” appears in both the slide and highlighted textbook paragraph.`),
  };
}

async function getSample() {
  if (sampleAnalysis) return structuredClone(sampleAnalysis);
  const response = await fetch(config.samplePath);
  if (!response.ok) throw new Error("The sample analysis could not be loaded. Please refresh and try again.");
  sampleAnalysis = await response.json();
  return structuredClone(sampleAnalysis);
}

async function analyzePdfs(params) {
  const { slidesFile, textbookFile, pageStart, pageEnd, onProgress } = params;
  assertPdf(slidesFile, "lecture slides");
  assertPdf(textbookFile, "textbook");

  const start = Number(pageStart);
  const end = Number(pageEnd);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || start > end) {
    throw new Error("Enter a valid textbook page range with the first page before the last page.");
  }
  if (end - start + 1 > config.maxTextbookPages) {
    throw new Error(`The selected textbook range exceeds the ${config.maxTextbookPages}-page limit.`);
  }

  report(onProgress, "Opening both PDFs locally…");
  const [slidesPdf, textbookPdf] = await Promise.all([openPdf(slidesFile), openPdf(textbookFile)]);

  try {
    if (slidesPdf.numPages > config.maxSlidePages) {
      throw new Error(`The slide deck exceeds the ${config.maxSlidePages}-page limit.`);
    }
    if (end > textbookPdf.numPages) {
      throw new Error(`The textbook has ${textbookPdf.numPages} pages, so page ${end} is outside the file.`);
    }

    const slidePages = [];
    for (let pageNumber = 1; pageNumber <= slidesPdf.numPages; pageNumber += 1) {
      report(onProgress, `Reading slide ${pageNumber} of ${slidesPdf.numPages}…`);
      slidePages.push(await extractPage(slidesPdf, pageNumber));
    }

    const textbookPages = [];
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      report(onProgress, `Reading textbook page ${pageNumber} of ${end}…`);
      textbookPages.push(await extractPage(textbookPdf, pageNumber));
    }

    if (!slidePages.some((page) => page.text.length > 20)) {
      throw new Error("The slides contain little or no extractable text. Scanned PDFs are not supported in this version.");
    }
    if (!textbookPages.some((page) => page.text.length > 40)) {
      throw new Error("The selected textbook pages contain little or no extractable text. Try another range or a text-based PDF.");
    }

    report(onProgress, "Comparing slide concepts with textbook paragraphs…");
    const exercises = possibleExercises(textbookPages);
    const pageImageCache = new Map();
    const getTextbookImage = async (pageData) => {
      if (!pageImageCache.has(pageData.pageNumber)) {
        pageImageCache.set(pageData.pageNumber, await renderPage(pageData.page));
      }
      return pageImageCache.get(pageData.pageNumber);
    };

    const slides = [];
    for (const slideData of slidePages) {
      report(onProgress, `Building the map for slide ${slideData.pageNumber}…`);
      const matches = bestTextbookMatches(slideData, textbookPages);
      const textbookMatches = [];
      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        const previewImage = await getTextbookImage(match.pageData);
        textbookMatches.push({
          matchId: `match-${slideData.pageNumber}-${match.pageData.pageNumber}-${index + 1}`,
          textbookPage: match.pageData.pageNumber,
          excerpt: match.paragraph.text.slice(0, config.maxExcerptLength),
          textbookPagePreview: blankTextbookPreview(
            previewImage,
            `Original textbook page ${match.pageData.pageNumber} with the related paragraph highlighted`,
            match.paragraph.highlightRegions,
            match.paragraph.text,
          ),
          relationship: relationshipFor(match.shared, confidenceFor(match.score)),
          confidence: confidenceFor(match.score),
        });
      }

      const slideImage = await renderPage(slideData.page);
      slides.push({
        slideId: `slide-${slideData.pageNumber}`,
        slidePage: slideData.pageNumber,
        slideTopic: pageHeading(slideData) || topicFromText(slideData.text, `Slide ${slideData.pageNumber}`),
        slideTextExcerpt: slideData.text.slice(0, config.maxExcerptLength),
        slidePreview: blankSlidePreview(slideImage, `Original lecture slide ${slideData.pageNumber}`),
        textbookMatches,
        textbookExercises: exercisesForSlide(slideData, exercises),
        webExercises: [],
      });
    }

    const warnings = [];
    if (slides.some((slide) => !slide.textbookMatches.length)) warnings.push("Some slides did not have a confident textbook match in the selected pages.");
    if (!slides.some((slide) => slide.textbookExercises.length)) {
      warnings.push("Slides loaded, but no exercises were found in the selected textbook pages.");
    }
    if (slidePages.some((page) => page.text.length < 30)) warnings.push("Some slide pages contained very little extractable text, so their mappings may be incomplete.");

    currentAnalysis = {
      lectureTitle: slidesFile.name.replace(/\.pdf$/i, ""),
      detectedCourseTopic: topicFromText(slidePages.map((page) => page.text).join(" "), "Uploaded lecture"),
      textbookPageRange: { start, end },
      slides,
      lectureSummary: lectureSummary(slidePages, slides),
      warnings,
    };
    return currentAnalysis;
  } finally {
    await slidesPdf.cleanup();
    await textbookPdf.cleanup();
  }
}

export const source = Object.freeze({
  async load(params = {}) {
    if ("slidesFile" in params || "textbookFile" in params) return analyzePdfs(params);
    await pause(config.sampleLoadDelayMs);
    currentAnalysis = await getSample();
    return currentAnalysis;
  },

  async detail(id) {
    const analysis = currentAnalysis ?? await getSample();
    return analysis.slides.find((slide) => slide.slideId === id) ?? null;
  },

  async morePractice() {
    throw new Error("Public practice questions are not used in Phase 1.");
  },

  async list() {
    return currentAnalysis ? [currentAnalysis] : [await getSample()];
  },
});
