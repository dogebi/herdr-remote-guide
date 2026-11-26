/* 읽기 진행률, 코드 복사, 언어 전환, 테마 전환을 처리한다. */
const progress = document.querySelector('progress');
const status = document.querySelector('#copy-status');
const root = document.documentElement;

/* ── 언어 ───────────────────────────────────────────────────────────── */
const DICT = window.__HG_I18N__ || {};
const LANGS = ['ko', 'zh', 'ja'];
const HTML_LANG = { ko: 'ko', zh: 'zh-Hans', ja: 'ja' };
const LANG_KEY = 'hg.lang';
const SNAP = {};

document.querySelectorAll('[data-i18n]').forEach((el) => {
  const key = el.getAttribute('data-i18n');
  if (!(key in SNAP)) SNAP[key] = el.textContent;
});

let lang = 'ko';
const t = (key) => {
  const dict = DICT[lang];
  if (dict && dict[key] != null) return dict[key];
  return SNAP[key] != null ? SNAP[key] : '';
};

const themeBtn = document.getElementById('theme-toggle');
const langBtns = [...document.querySelectorAll('.lang-btn')];

/* 복사 버튼의 문구는 언어에 따라 바뀐다. */
const copyButtons = [...document.querySelectorAll('[data-copy]')];
const copyLabels = new WeakMap();

function applyLang(next, persist) {
  lang = LANGS.includes(next) ? next : 'ko';
  root.lang = HTML_LANG[lang];

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = t(el.getAttribute('data-i18n'));
    if (value) el.textContent = value;
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const value = t(el.getAttribute('data-i18n-html'));
    if (value) el.innerHTML = value;
  });

  document.body.dataset.copied = t('ui.copied');
  document.body.dataset.failed = t('ui.copyFail');
  copyButtons.forEach((btn) => { btn.textContent = t('ui.copy'); copyLabels.set(btn, t('ui.copy')); });

  const desc = document.querySelector('meta[name="description"]');
  if (desc && t('meta.description')) desc.content = t('meta.description');

  if (themeBtn) paintTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  langBtns.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));
  if (persist) localStorage.setItem(LANG_KEY, lang);
}

langBtns.forEach((btn) => btn.addEventListener('click', () => applyLang(btn.dataset.lang, true)));

/* ── 테마 ───────────────────────────────────────────────────────────── */
const THEME_KEY = 'hg.theme';

function paintTheme(mode) {
  const dark = mode === 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  if (!themeBtn) return;
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.textContent = t(dark ? 'ui.theme.toLight' : 'ui.theme.toDark');
  themeBtn.setAttribute('aria-label', t(dark ? 'ui.theme.toLightAria' : 'ui.theme.toDarkAria'));
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { saved = null; }
  const mode = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.dataset.theme = mode;
  paintTheme(mode);
}

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* 저장소 차단 */ }
    paintTheme(next);
  });
}

initTheme();

let savedLang = null;
try { savedLang = localStorage.getItem(LANG_KEY); } catch { savedLang = null; }
const nav = (navigator.language || 'ko').toLowerCase();
applyLang(
  LANGS.includes(savedLang) ? savedLang : nav.startsWith('zh') ? 'zh' : nav.startsWith('ja') ? 'ja' : 'ko',
  false,
);

/* ── 읽기 진행률 ────────────────────────────────────────────────────── */
function updateProgress() {
  const length = document.documentElement.scrollHeight - window.innerHeight;
  progress.value = length > 0 ? (100 * window.scrollY) / length : 100;
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
window.addEventListener('load', updateProgress);
updateProgress();

/* ── 코드 복사 ──────────────────────────────────────────────────────── */
for (const button of copyButtons) {
  const code = button.closest('figure').querySelector('code');
  copyLabels.set(button, t('ui.copy'));
  let reset;
  button.hidden = false;
  button.addEventListener('click', async () => {
    clearTimeout(reset);
    let message;
    try {
      await navigator.clipboard.writeText(code.textContent);
      message = document.body.dataset.copied;
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      message = document.body.dataset.failed;
    }
    button.textContent = message;
    status.textContent = message;
    reset = setTimeout(() => {
      button.textContent = copyLabels.get(button) || t('ui.copy');
      status.textContent = '';
    }, 1800);
  });
}
