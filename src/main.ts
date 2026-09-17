import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes/notes.esm.js';
import 'reveal.js/dist/reveal.css';
import './styles.css';
import mapSvg from './assets/career-map.svg?raw';
import walkerSvg from './assets/pixel-walker.svg?raw';

const PRESENTATION_WIDTH = 1440;
const PRESENTATION_HEIGHT = 810;
const FIRST_SLIDE = 0;
const FIRST_ROW = 0;
const INITIAL_FRAGMENT = -1;
const PROGRAMMATIC_FOCUS_TAB_INDEX = -1;
const INITIAL_STAGE = 0;
const TOTAL_STEPS = 3;
const PRINT_QUERY = 'print-pdf';
const SPEAKER_RECEIVER_QUERY = 'receiver';
const CHARGE_DURATION_MS = 2200;
const FULL_CHARGE = 100;
const PENDING_CHARGE_LIMIT = 90;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const START_KEYS = new Set(['ArrowRight', ' ', 'Enter']);
const READY_ANNOUNCEMENT = '화면 클릭, 오른쪽 방향키, 스페이스 또는 엔터로 발표를 시작할 수 있습니다.';
const INITIAL_ANNOUNCEMENT = '서울과 분당 지도입니다. 화면 클릭, 오른쪽 방향키, 스페이스로 진행할 수 있습니다.';
const FONT_SPECIFICATION = '500 24px "Wanted Sans"';
const INTERACTIVE_ELEMENTS = 'button, a, input, select, textarea, [contenteditable="true"]';
const KEYS = { previous: 37, next: 39, space: 32 };
const SELECTORS = {
  deck: '.reveal', slide: '#career', map: '#career-map', readiness: '#readiness',
  battery: '#loading-battery', cells: '.battery-cell', percentage: '#loading-percent',
  status: '#readiness-status', previous: '#previous', next: '#next',
  reset: '#reset', count: '#step-count', announcement: '#career-announcement',
  entries: '.history-entry', mapEvents: '[data-map-step]',
  intro: '#career-intro', walker: '#pixel-walker',
};

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Presentation element missing: ${selector}`);
  return element;
}

const root = requireElement<HTMLElement>(SELECTORS.deck);
const slide = requireElement<HTMLElement>(SELECTORS.slide);
const readiness = requireElement<HTMLElement>(SELECTORS.readiness);
const intro = requireElement<HTMLElement>(SELECTORS.intro);
const battery = requireElement<HTMLElement>(SELECTORS.battery);
const batteryCells = [...document.querySelectorAll<HTMLElement>(SELECTORS.cells)];
const loadingPercentage = requireElement<HTMLElement>(SELECTORS.percentage);
const previousButton = requireElement<HTMLButtonElement>(SELECTORS.previous);
const nextButton = requireElement<HTMLButtonElement>(SELECTORS.next);
const resetButton = requireElement<HTMLButtonElement>(SELECTORS.reset);
const stepCount = requireElement<HTMLElement>(SELECTORS.count);
const announcement = requireElement<HTMLElement>(SELECTORS.announcement);
const entries = [...document.querySelectorAll<HTMLElement>(SELECTORS.entries)];
const viewParameters = new URLSearchParams(window.location.search);
const printMode = viewParameters.has(PRINT_QUERY);
const speakerReceiver = viewParameters.has(SPEAKER_RECEIVER_QUERY);
type OpeningPhase = 'loading' | 'intro' | 'career';
const runtime = { phase: 'loading' as OpeningPhase, printing: printMode, ready: false, chargeFrame: 0 };

requireElement<HTMLElement>(SELECTORS.map).innerHTML = mapSvg;
requireElement<HTMLElement>(SELECTORS.walker).innerHTML = walkerSvg;
const mapEvents = [...document.querySelectorAll<SVGElement>(SELECTORS.mapEvents)];
document.documentElement.classList.toggle('print-mode', printMode);

const deck = new Reveal(root, {
  width: PRESENTATION_WIDTH,
  height: PRESENTATION_HEIGHT,
  margin: 0,
  minScale: 0.1,
  maxScale: 2,
  center: false,
  controls: false,
  progress: false,
  slideNumber: false,
  hash: false,
  transition: 'none',
  mouseWheel: false,
  touch: false,
  overview: false,
  hideInactiveCursor: false,
  autoSlide: 0,
  pdfSeparateFragments: false,
  pdfMaxPagesPerSlide: 1,
  showNotes: false,
  plugins: [Notes],
  keyboardCondition: (event: KeyboardEvent) => runtime.phase === 'career' && !runtime.printing && !event.repeat,
});

function currentStage(): number {
  if (runtime.printing) return TOTAL_STEPS;
  const fragmentIndex = deck.getIndices().f ?? INITIAL_FRAGMENT;
  return Math.max(INITIAL_STAGE, Math.min(TOTAL_STEPS, fragmentIndex + 1));
}

function syncCareerView(): void {
  const stage = currentStage();
  slide.dataset.stage = String(stage);
  mapEvents.forEach((element) => {
    const eventStep = Number(element.dataset.mapStep);
    const isRevealed = runtime.printing || eventStep === stage;
    element.classList.toggle('is-revealed', isRevealed);
    element.classList.toggle('is-current', eventStep === stage);
    element.setAttribute('aria-hidden', String(!isRevealed));
  });
  entries.forEach((entry, index) => {
    const isCurrent = index + 1 === stage;
    entry.classList.toggle('is-current', isCurrent);
    entry.setAttribute('aria-hidden', String(!runtime.printing && !isCurrent));
  });
  previousButton.disabled = stage === INITIAL_STAGE;
  resetButton.disabled = stage === INITIAL_STAGE;
  nextButton.disabled = stage === TOTAL_STEPS && deck.isLastSlide();
  stepCount.textContent = `${String(stage).padStart(2, '0')} / ${String(TOTAL_STEPS).padStart(2, '0')}`;
  announcement.textContent = stage === INITIAL_STAGE
    ? INITIAL_ANNOUNCEMENT
    : entries[stage - 1].textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function nextStep(): void {
  if (runtime.phase !== 'career' || runtime.printing) return;
  deck.next();
  syncCareerView();
}

function previousStep(): void {
  if (runtime.phase !== 'career' || runtime.printing) return;
  deck.prev();
  syncCareerView();
}

function resetCareer(): void {
  if (runtime.printing) return;
  deck.slide(FIRST_SLIDE, FIRST_ROW, INITIAL_FRAGMENT);
  syncCareerView();
}

function beginPresentation(): void {
  if (!runtime.ready || runtime.phase === 'career') return;
  runtime.phase = 'career';
  readiness.hidden = true;
  intro.hidden = true;
  root.inert = false;
  document.body.classList.add('has-started');
  slide.tabIndex = PROGRAMMATIC_FOCUS_TAB_INDEX;
  slide.focus({ preventScroll: true });
  syncCareerView();
}

function advanceOpening(): void {
  if (!runtime.ready || runtime.printing || runtime.phase === 'career') return;
  if (runtime.phase === 'loading') {
    runtime.phase = 'intro';
    readiness.hidden = true;
    intro.hidden = false;
    intro.focus({ preventScroll: true });
    return;
  }
  beginPresentation();
}

function beginOnKey(event: KeyboardEvent): void {
  if (runtime.phase === 'career' || runtime.printing) return;
  if (!START_KEYS.has(event.key)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.repeat) return;
  advanceOpening();
}

function showCharge(percentage: number): void {
  const charge = Math.round(percentage);
  battery.setAttribute('aria-valuenow', String(charge));
  loadingPercentage.textContent = `${charge}%`;
  batteryCells.forEach((cell, index) => {
    cell.classList.toggle('is-filled', percentage >= (index + 1) / batteryCells.length * FULL_CHARGE);
  });
}

function animateCharge(): Promise<void> {
  if (printMode || speakerReceiver || window.matchMedia(REDUCED_MOTION_QUERY).matches) return Promise.resolve();
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const frame = (timestamp: number): void => {
      const progress = Math.min((timestamp - startedAt) / CHARGE_DURATION_MS, 1);
      showCharge(progress * PENDING_CHARGE_LIMIT);
      if (progress >= 1) return resolve();
      runtime.chargeFrame = requestAnimationFrame(frame);
    };
    runtime.chargeFrame = requestAnimationFrame(frame);
  });
}

function advanceOnSlideClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(INTERACTIVE_ELEMENTS)) return;
  if (window.getSelection()?.toString()) return;
  nextStep();
}

async function preparePresentation(): Promise<void> {
  const charging = animateCharge();
  await document.fonts.load(FONT_SPECIFICATION).catch(() => undefined);
  await deck.initialize();
  deck.addKeyBinding({ keyCode: KEYS.previous, key: '←', description: '이전 근무 이력' }, previousStep);
  deck.addKeyBinding({ keyCode: KEYS.next, key: '→', description: '다음 근무 이력' }, nextStep);
  deck.addKeyBinding({ keyCode: KEYS.space, key: 'Space', description: '다음 근무 이력' }, nextStep);
  deck.slide(FIRST_SLIDE, FIRST_ROW, INITIAL_FRAGMENT);
  deck.on('fragmentshown', syncCareerView);
  deck.on('fragmenthidden', syncCareerView);
  deck.on('slidechanged', syncCareerView);
  syncCareerView();
  await charging;
  runtime.ready = true;

  if (printMode || speakerReceiver) {
    beginPresentation();
    document.documentElement.dataset.ready = 'true';
    return;
  }

  showCharge(FULL_CHARGE);
  requireElement<HTMLElement>(SELECTORS.status).textContent = READY_ANNOUNCEMENT;
  readiness.classList.add('is-ready');
  readiness.setAttribute('aria-busy', 'false');
  readiness.focus({ preventScroll: true });
  document.documentElement.dataset.ready = 'true';
}

readiness.addEventListener('click', advanceOpening);
intro.addEventListener('click', advanceOpening);
window.addEventListener('keydown', beginOnKey, { capture: true });
nextButton.addEventListener('click', nextStep);
previousButton.addEventListener('click', previousStep);
resetButton.addEventListener('click', resetCareer);
slide.addEventListener('click', advanceOnSlideClick);
window.addEventListener('beforeprint', () => {
  runtime.printing = true;
  syncCareerView();
});
window.addEventListener('afterprint', () => {
  runtime.printing = printMode;
  syncCareerView();
});

void preparePresentation().catch((error: unknown) => {
  cancelAnimationFrame(runtime.chargeFrame);
  readiness.classList.add('has-error');
  readiness.setAttribute('aria-busy', 'false');
  const status = requireElement<HTMLElement>(SELECTORS.status);
  status.classList.remove('sr-only');
  status.textContent = '발표를 준비하지 못했습니다. 새로고침하거나 PDF를 열어주세요.';
  console.error(error);
});
