// ── i18n ──────────────────────────────────────────────────────────────────────

const T = {
  en: {
    greeting:           'AutoNote',
    chip_summary:       'Summary',
    chip_keypoints:     'Key points',
    chip_notes:         'Notes',
    chip_custom:        'Custom',
    btn_params:         'Options',
    label_subtitle_lang:'Subtitle language',
    label_format:       'Format',
    btn_copy:           'Copy',
    btn_copied:         'Copied!',
    btn_download:       'Download',
    label_note:         'Note',
    placeholder_prompt: 'Enter instructions for the model...',
    placeholder_lang:   'Language code, e.g.: de, fr, ja...',
    warn_ollama_down:   'Ollama is not running — start it with: ollama serve',
  },
  ru: {
    greeting:           'AutoNote',
    chip_summary:       'Выжимка',
    chip_keypoints:     'Тезисы',
    chip_notes:         'Конспект',
    chip_custom:        'Свой',
    btn_params:         'Параметры',
    label_subtitle_lang:'Язык субтитров',
    label_format:       'Формат',
    btn_copy:           'Копировать',
    btn_copied:         'Скопировано',
    btn_download:       'Скачать',
    label_note:         'Заметка',
    placeholder_prompt: 'Введите инструкцию для модели...',
    placeholder_lang:   'Код языка, напр.: de, fr, ja...',
    warn_ollama_down:   'Ollama не запущена — запустите: ollama serve',
  },
};

let uiLang = 'en';
function t(key) { return T[uiLang][key] ?? key; }

function applyUiLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.documentElement.lang = uiLang;
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const appEl           = document.getElementById('app');
const chatArea        = document.getElementById('chat-area');
const messagesEl      = document.getElementById('messages');
const urlInput        = document.getElementById('url-input');
const generateBtn     = document.getElementById('generate-btn');
const promptInput     = document.getElementById('prompt-input');
const langCustomInput = document.getElementById('lang-custom-input');
const ollamaWarning   = document.getElementById('ollama-warning');
const modelSelect     = document.getElementById('model-select');

const chips        = document.querySelectorAll('.chip');
const subLangBtns  = document.querySelectorAll('[data-sub-lang]');
const formatBtns   = document.querySelectorAll('[data-format]');
const providerBtns = document.querySelectorAll('.provider-btn');
const uiLangBtns   = document.querySelectorAll('.ui-lang-btn');

// ── State ─────────────────────────────────────────────────────────────────────

let selectedSubLang  = 'en';
let selectedProvider = 'ollama';
let selectedFormat   = 'markdown';
let providers        = {};
let hasMessages      = false;

// ── Providers ─────────────────────────────────────────────────────────────────

async function loadProviders() {
  try {
    const res = await fetch('/api/providers');
    providers = await res.json();
  } catch {
    providers = { ollama: { models: ['qwen2.5:7b'], default: 'qwen2.5:7b' } };
  }
  updateModelSelect(selectedProvider);
  if (selectedProvider === 'ollama') checkOllamaStatus();
}

function updateModelSelect(provider) {
  const info = providers[provider];
  if (!info) return;
  modelSelect.innerHTML = info.models
    .map(m => `<option value="${m}"${m === info.default ? ' selected' : ''}>${m}</option>`)
    .join('');
}

providerBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    providerBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedProvider = btn.dataset.provider;
    updateModelSelect(selectedProvider);
    if (selectedProvider === 'ollama') checkOllamaStatus();
    else ollamaWarning.classList.add('hidden');
  });
});

// ── Ollama status ─────────────────────────────────────────────────────────────

async function checkOllamaStatus() {
  try {
    const { running } = await fetch('/api/ollama/status').then(r => r.json());
    ollamaWarning.classList.toggle('hidden', running);
  } catch {
    ollamaWarning.classList.remove('hidden');
  }
}

// ── UI language ───────────────────────────────────────────────────────────────

uiLangBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    uiLangBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    uiLang = btn.dataset.uiLang;
    applyUiLang();
  });
});

// ── Format ────────────────────────────────────────────────────────────────────

formatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    formatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFormat = btn.dataset.format;
  });
});

// ── Subtitle language (inside popover) ───────────────────────────────────────

subLangBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    subLangBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.subLang === 'custom') {
      langCustomInput.classList.remove('hidden');
      langCustomInput.focus();
      selectedSubLang = langCustomInput.value.trim();
    } else {
      langCustomInput.classList.add('hidden');
      selectedSubLang = btn.dataset.subLang;
    }
  });
});

langCustomInput.addEventListener('input', () => { selectedSubLang = langCustomInput.value.trim(); });

// ── Template chips ────────────────────────────────────────────────────────────

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    if (chip.dataset.prompt === 'custom') {
      promptInput.classList.remove('hidden');
      promptInput.focus();
    } else {
      promptInput.value = chip.dataset.prompt;
      promptInput.classList.add('hidden');
    }
  });
});

// ── Generate ──────────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', generate);
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });

async function generate() {
  const url = urlInput.value.trim();
  if (!url) { flash(urlInput); return; }
  if (!selectedSubLang) { langCustomInput.classList.remove('hidden'); flash(langCustomInput); return; }

  const activeChip = document.querySelector('.chip.active');
  const prompt = activeChip?.dataset.prompt === 'custom'
    ? promptInput.value.trim()
    : activeChip?.dataset.prompt;

  if (!prompt) { flash(promptInput); return; }

  if (!hasMessages) {
    hasMessages = true;
    appEl.classList.add('has-messages');
  }

  generateBtn.disabled = true;

  addUserMessage(url);
  const assistantEl = addLoadingMessage();
  scrollBottom();

  try {
    const params = new URLSearchParams({
      url, lang: selectedSubLang, prompt,
      provider: selectedProvider, model: modelSelect.value, format: selectedFormat,
    });
    const res = await fetch(`/api/get_note?${params}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    const raw = typeof data === 'string' ? data : (data.text ?? JSON.stringify(data, null, 2));
    fillAssistant(assistantEl, raw, selectedFormat);
    urlInput.value = '';
  } catch (err) {
    fillError(assistantEl, err.message);
  } finally {
    generateBtn.disabled = false;
    scrollBottom();
  }
}

// ── Message helpers ───────────────────────────────────────────────────────────

function addUserMessage(url) {
  const el = document.createElement('div');
  el.className = 'message user';
  el.innerHTML = `<div class="bubble">
    <span class="msg-url">${esc(url)}</span>
    <div class="msg-meta">
      <span>${selectedSubLang.toUpperCase()}</span><span>·</span>
      <span>${esc(modelSelect.value || selectedProvider)}</span><span>·</span>
      <span>${selectedFormat.toUpperCase()}</span>
    </div>
  </div>`;
  messagesEl.appendChild(el);
}

function addLoadingMessage() {
  const el = document.createElement('div');
  el.className = 'message assistant';
  el.innerHTML = `<div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  messagesEl.appendChild(el);
  return el;
}

function fillAssistant(el, raw, fmt) {
  el.innerHTML = `<div class="bubble">
    <div class="result-text ${fmt === 'markdown' ? 'markdown' : fmt === 'json' ? 'json' : ''}">${renderContent(raw, fmt)}</div>
    <div class="msg-actions">
      <button class="btn-msg-action" data-raw="${escAttr(raw)}" data-action="copy">${t('btn_copy')}</button>
      <button class="btn-msg-action" data-raw="${escAttr(raw)}" data-action="download" data-fmt="${fmt}">${t('btn_download')}</button>
    </div>
  </div>`;
}

function fillError(el, msg) {
  el.innerHTML = `<div class="bubble" style="color:var(--brand);font-size:13px">${esc(msg)}</div>`;
}

function renderContent(raw, fmt) {
  if (fmt === 'markdown') return marked.parse(raw);
  if (fmt === 'json') { try { return esc(JSON.stringify(JSON.parse(raw), null, 2)); } catch { return esc(raw); } }
  return esc(raw);
}

// ── Copy / Download ───────────────────────────────────────────────────────────

messagesEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const raw = btn.dataset.raw;
  if (btn.dataset.action === 'copy') {
    navigator.clipboard.writeText(raw).then(() => {
      btn.textContent = t('btn_copied');
      setTimeout(() => { btn.textContent = t('btn_copy'); }, 2000);
    });
  } else {
    const fmt  = btn.dataset.fmt;
    const ext  = fmt === 'markdown' ? 'md' : fmt;
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([raw], { type: fmt === 'json' ? 'application/json' : 'text/plain' })),
      download: `note.${ext}`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }
});

// ── Utilities ─────────────────────────────────────────────────────────────────

function scrollBottom() { chatArea.scrollTop = chatArea.scrollHeight; }

function flash(el) {
  el.classList.remove('hidden');
  el.style.outline = '2px solid var(--brand)';
  el.focus();
  setTimeout(() => { el.style.outline = ''; }, 700);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

// ── Init ──────────────────────────────────────────────────────────────────────

applyUiLang();
promptInput.value = document.querySelector('.chip.active')?.dataset.prompt ?? '';
loadProviders();
