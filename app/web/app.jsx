// app.jsx — auto·note main app
// Clean glassmorphism aesthetic — soft refractive panels over an atmospheric backdrop.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "storm",
  "showOllamaWarning": false,
  "language": "EN",
  "imageBlur": 12,
  "imageDim": 45,
  "glassTint": 16
}/*EDITMODE-END*/;

const BG_STORAGE_KEY = 'autonote.customBg.v1';

// ── Copy ────────────────────────────────────────────────────────────────
const I18N = {
  EN: {
    greeting: 'What would you like to capture?',
    sub: 'Drop a YouTube link — subtitles go in, structured notes come out.',
    chips: { Summary: 'Summary', 'Key points': 'Key points', Notes: 'Notes', Custom: 'Custom' },
    urlPlaceholder: 'Paste a YouTube link',
    customPlaceholder: 'Describe what to extract from the subtitles…',
    subsLang: 'Subtitles',
    format: 'Format',
    addLang: 'Add language',
    addLangPlaceholder: 'lang code',
    provider: 'Engine',
    model: 'Model',
    ollamaDown: 'Ollama runtime unreachable — switched to Claude',
    send: 'Run',
    thinking: 'Parsing subtitles',
    you: 'you',
    note: 'note',
    newChat: 'New session',
    tagline: 'subtitles → notes',
  },
  RU: {
    greeting: 'Что нужно зафиксировать?',
    sub: 'Вставьте ссылку YouTube — на входе субтитры, на выходе заметка.',
    chips: { Summary: 'Кратко', 'Key points': 'Тезисы', Notes: 'Заметки', Custom: 'Свой' },
    urlPlaceholder: 'Ссылка YouTube',
    customPlaceholder: 'Опишите, что извлечь из субтитров…',
    subsLang: 'Субтитры',
    format: 'Формат',
    addLang: 'Добавить',
    addLangPlaceholder: 'код языка',
    provider: 'Движок',
    model: 'Модель',
    ollamaDown: 'Ollama недоступна — переключено на Claude',
    send: 'Запуск',
    thinking: 'Разбираю субтитры',
    you: 'вы',
    note: 'заметка',
    newChat: 'Новая сессия',
    tagline: 'субтитры → заметки',
  },
};

const MODELS = { ollama: [], claude: [] };

const PROMPTS_FALLBACK = {
  Summary: 'Analyze this text and return a brief, clear summary',
  'Key points': 'Extract the key points from the text as a numbered list',
  Notes: 'Create detailed notes from the text organized by topic',
};

const FORMAT_MAP = { MD: 'markdown', TXT: 'txt', JSON: 'json' };

// ── Helpers ─────────────────────────────────────────────────────────────
function cx(...xs) { return xs.filter(Boolean).join(' '); }

function Glyph({ size = 14, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
      <path d="M12 4 V20 M4 12 H20" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

function ArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12 H19 M13 6 L19 12 L13 18" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5 V19 M5 12 H19" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" />
    </svg>
  );
}

// ── BgUploader (custom Tweak control) ──────────────────────────────────
const __BG_UPLOADER_STYLE = `
  .bg-up { display: flex; flex-direction: column; gap: 6px; }
  .bg-up .preview {
    position: relative;
    width: 100%; aspect-ratio: 16/9;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(0,0,0,0.08) center/cover no-repeat;
    border: 1px dashed rgba(0,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
    color: rgba(41,38,27,0.45);
    font: 400 11px/1 'Space Grotesk', sans-serif;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .bg-up .preview:hover { border-color: rgba(0,0,0,0.4); background-color: rgba(0,0,0,0.04); }
  .bg-up .preview.has { border-style: solid; border-color: rgba(0,0,0,0.12); color: transparent; }
  .bg-up .preview.dragover { border-color: #1a7f4f; background-color: rgba(26,127,79,0.06); }
  .bg-up .actions { display: flex; gap: 6px; }
  .bg-up .actions button {
    appearance: none; flex: 1; height: 28px;
    border: 0; border-radius: 8px;
    background: rgba(0,0,0,0.06); color: inherit;
    font: 500 11px/1 'Space Grotesk', sans-serif;
    cursor: pointer;
  }
  .bg-up .actions button:hover { background: rgba(0,0,0,0.1); }
  .bg-up .actions button.primary {
    background: rgba(0,0,0,0.78); color: #fff;
  }
  .bg-up .actions button.primary:hover { background: rgba(0,0,0,0.88); }
  .bg-up input[type="file"] { display: none; }
`;

function BgUploader({ value, onUpload, onClear }) {
  const inputRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(false);
  const pick = () => inputRef.current && inputRef.current.click();
  const onChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) onUpload(f);
    e.target.value = '';
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onUpload(f);
  };
  return (
    <>
      <style>{__BG_UPLOADER_STYLE}</style>
      <div className="bg-up">
        <div
          className={cx('preview', value && 'has', dragOver && 'dragover')}
          style={value ? { backgroundImage: `url(${value})` } : {}}
          onClick={pick}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {!value && (dragOver ? 'Drop' : 'Drop or click')}
        </div>
        <div className="actions">
          <button className="primary" onClick={pick}>
            {value ? 'Replace' : 'Upload'}
          </button>
          {value && <button onClick={onClear}>Clear</button>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onChange} />
      </div>
    </>
  );
}

// ── Glass tokens & styles ───────────────────────────────────────────────
const __APP_STYLE = `
  /* Theme tokens — driven by body[data-theme] from Background */
  body[data-theme="dark"] {
    --fg-strong: rgba(245,245,242,0.96);
    --fg-mid: rgba(245,245,242,0.74);
    --fg-soft: rgba(245,245,242,0.5);
    --fg-faint: rgba(245,245,242,0.3);

    --glass-line: rgba(255,255,255,0.16);
    --glass-line-strong: rgba(255,255,255,0.3);
    --glass-fill: rgba(255,255,255, calc(var(--tint, 16) / 100 * 0.4));
    --glass-fill-soft: rgba(255,255,255, calc(var(--tint, 16) / 100 * 0.25));
    --glass-fill-strong: rgba(255,255,255, calc(var(--tint, 16) / 100 * 0.55));

    --highlight-top: rgba(255,255,255,0.45);
    --highlight-side: rgba(255,255,255,0.08);

    --shadow-glass: 0 24px 60px -20px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.08) inset;
    --shadow-glass-strong: 0 36px 80px -24px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.1) inset;

    --invert: #0a0b0e;
    --send-bg: rgba(245,245,242,0.94);
  }
  body[data-theme="light"] {
    --fg-strong: rgba(20,20,22,0.96);
    --fg-mid: rgba(20,20,22,0.7);
    --fg-soft: rgba(20,20,22,0.45);
    --fg-faint: rgba(20,20,22,0.28);

    --glass-line: rgba(20,20,22,0.1);
    --glass-line-strong: rgba(20,20,22,0.2);
    --glass-fill: rgba(255,255,255, calc(var(--tint, 16) / 100 * 1.6));
    --glass-fill-soft: rgba(255,255,255, calc(var(--tint, 16) / 100 * 1.1));
    --glass-fill-strong: rgba(255,255,255, calc(var(--tint, 16) / 100 * 2.2));

    --highlight-top: rgba(255,255,255,0.85);
    --highlight-side: rgba(255,255,255,0.4);

    --shadow-glass: 0 18px 50px -16px rgba(40,40,40,0.18), 0 1px 0 rgba(255,255,255,0.6) inset;
    --shadow-glass-strong: 0 28px 70px -20px rgba(40,40,40,0.25), 0 1px 0 rgba(255,255,255,0.7) inset;

    --invert: #fafafa;
    --send-bg: rgba(20,20,22,0.88);
  }
  body { color: var(--fg-strong); }

  /* Reusable glass primitive */
  .glass {
    position: relative;
    background: var(--glass-fill);
    border: 1px solid var(--glass-line);
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    box-shadow: var(--shadow-glass);
  }
  .glass::before {
    content: "";
    position: absolute; inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(140deg, var(--highlight-top), transparent 35%, transparent 65%, var(--highlight-side));
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
    opacity: 0.85;
  }

  .app {
    position: relative; z-index: 4;
    height: 100%; width: 100%;
    display: flex; flex-direction: column;
    padding: 44px 56px 36px;
  }

  .topbar {
    position: relative; z-index: 6;
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0;
  }
  .brand {
    display: flex; align-items: center; gap: 12px;
    color: var(--fg-strong);
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 400;
    font-size: 16px;
    letter-spacing: -0.005em;
  }
  .brand .mark {
    width: 32px; height: 32px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    background: var(--glass-fill-soft);
    border: 1px solid var(--glass-line);
    color: var(--fg-mid);
  }
  .brand .reset {
    appearance: none;
    border: 1px solid var(--glass-line);
    border-radius: 999px;
    background: var(--glass-fill-soft);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    color: var(--fg-mid);
    font: 500 12px/1 'Space Grotesk', sans-serif;
    padding: 8px 14px;
    cursor: pointer;
    margin-left: 12px;
    transition: color 0.18s, border-color 0.18s, background 0.18s;
  }
  .brand .reset:hover {
    color: var(--fg-strong);
    border-color: var(--glass-line-strong);
    background: var(--glass-fill);
  }

  .top-actions { display: flex; gap: 10px; align-items: center; }

  .lang-pill {
    display: inline-flex;
    padding: 4px;
    border-radius: 999px;
    border: 1px solid var(--glass-line);
    background: var(--glass-fill-soft);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    box-shadow: var(--shadow-glass);
  }
  .lang-pill button {
    appearance: none; border: 0;
    background: transparent;
    color: var(--fg-soft);
    font: 500 12px/1 'Space Grotesk', sans-serif;
    letter-spacing: 0.02em;
    padding: 8px 14px;
    border-radius: 999px;
    cursor: pointer;
    transition: color 0.15s, background 0.2s;
  }
  .lang-pill button:hover { color: var(--fg-strong); }
  .lang-pill button[aria-pressed="true"] {
    color: var(--invert);
    background: var(--fg-strong);
  }

  .stage {
    flex: 1;
    display: flex; flex-direction: column;
    min-height: 0;
    position: relative; z-index: 5;
  }
  .stage.empty { justify-content: center; align-items: center; }
  .stage.full { justify-content: flex-end; }

  .greet {
    text-align: center;
    margin-bottom: 44px;
    max-width: 680px;
    display: flex; flex-direction: column; align-items: center; gap: 22px;
  }
  .greet .star {
    width: 56px; height: 56px;
    border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    background: var(--glass-fill);
    border: 1px solid var(--glass-line);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    color: var(--fg-mid);
    box-shadow: var(--shadow-glass);
  }
  .greet h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 400;
    font-size: clamp(38px, 5.4vw, 60px);
    line-height: 1.08;
    letter-spacing: -0.03em;
    margin: 0;
    color: var(--fg-strong);
    text-wrap: balance;
  }
  .greet .sub {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 15px;
    font-weight: 400;
    color: var(--fg-soft);
    letter-spacing: -0.005em;
    max-width: 480px;
    line-height: 1.55;
    text-wrap: balance;
  }

  .chat {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    flex: 1;
    overflow-y: auto;
    padding: 80px 4px 32px;
    display: flex; flex-direction: column; gap: 16px;
    scrollbar-width: thin;
    scrollbar-color: var(--glass-line-strong) transparent;
    mask-image: linear-gradient(to bottom, transparent 0%, #000 7%, #000 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 7%, #000 100%);
  }
  .chat::-webkit-scrollbar { width: 4px; }
  .chat::-webkit-scrollbar-thumb {
    background: var(--glass-line-strong); border-radius: 4px;
  }

  .msg-user {
    align-self: flex-end;
    max-width: 80%;
    padding: 14px 18px;
    border-radius: 22px 22px 8px 22px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--fg-strong);
  }
  .msg-user .url {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12.5px;
    color: var(--fg-soft);
    display: block;
    margin-top: 8px;
    padding-top: 8px;
    word-break: break-all;
    border-top: 1px solid var(--glass-line);
  }
  .msg-user .meta-row {
    display: flex; gap: 8px; align-items: center;
    margin-bottom: 8px;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--fg-soft);
  }
  .msg-user .meta-row .sep { opacity: 0.4; }
  .msg-user .preset-tag {
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--glass-fill-strong);
    color: var(--fg-strong);
    border: 1px solid var(--glass-line);
  }

  .msg-bot {
    align-self: flex-start;
    max-width: 90%;
    padding: 26px 28px;
    border-radius: 8px 24px 24px 24px;
    font-size: 14px;
    line-height: 1.65;
    color: var(--fg-mid);
  }
  .msg-bot .head {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--glass-line);
    font-size: 12px;
    font-weight: 500;
    color: var(--fg-soft);
    letter-spacing: -0.005em;
  }
  .msg-bot h1, .msg-bot h2, .msg-bot h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 400;
    letter-spacing: -0.025em;
    line-height: 1.15;
    margin: 0 0 14px;
    color: var(--fg-strong);
  }
  .msg-bot h1 { font-size: 28px; }
  .msg-bot h2 { font-size: 22px; }
  .msg-bot h3 { font-size: 18px; }
  .msg-bot p { margin: 0 0 10px; font-weight: 400; }
  .msg-bot ul { margin: 8px 0 0; padding-left: 0; list-style: none; }
  .msg-bot li {
    position: relative;
    margin-bottom: 8px;
    padding-left: 18px;
  }
  .msg-bot li::before {
    content: '';
    position: absolute; left: 0; top: 0.7em;
    width: 8px; height: 1px;
    background: var(--fg-faint);
  }
  .msg-bot strong { font-weight: 500; color: var(--fg-strong); }
  .msg-bot em { font-style: italic; color: var(--fg-soft); }
  .msg-bot pre {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    overflow-x: auto;
    white-space: pre-wrap;
    margin: 0;
    line-height: 1.6;
  }

  .thinking {
    align-self: flex-start;
    display: flex; align-items: center; gap: 12px;
    padding: 12px 18px;
    border-radius: 999px;
    font-size: 12.5px;
    color: var(--fg-mid);
  }
  .thinking .bars { display: flex; gap: 3px; }
  .thinking .bars span {
    display: block;
    width: 2.5px; height: 11px;
    background: var(--fg-mid);
    border-radius: 2px;
    animation: bar 1.1s ease-in-out infinite;
  }
  .thinking .bars span:nth-child(2) { animation-delay: 0.12s; }
  .thinking .bars span:nth-child(3) { animation-delay: 0.24s; }
  .thinking .bars span:nth-child(4) { animation-delay: 0.36s; }
  @keyframes bar {
    0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
    50% { transform: scaleY(1); opacity: 1; }
  }

  .dock-wrap {
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    flex-shrink: 0;
    display: flex; flex-direction: column; gap: 14px;
    padding-bottom: 8px;
  }

  .chips {
    display: flex; gap: 2px;
    padding: 4px;
    border-radius: 999px;
    width: fit-content;
  }
  .chips button {
    appearance: none; border: 0;
    background: transparent;
    color: var(--fg-soft);
    font: 500 12.5px/1 'Space Grotesk', sans-serif;
    letter-spacing: -0.005em;
    padding: 10px 18px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .chips button:hover {
    color: var(--fg-strong);
    background: var(--glass-fill-soft);
  }
  .chips button[aria-pressed="true"] {
    color: var(--invert);
    background: var(--fg-strong);
  }

  .warning {
    align-self: flex-start;
    display: flex; align-items: center; gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(238,160,80,0.14);
    border: 1px solid rgba(238,160,80,0.32);
    color: #b8651c;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    font-size: 12px;
    font-weight: 500;
  }
  body[data-theme="dark"] .warning { color: rgba(238,180,120,0.95); }
  .warning::before {
    content: ''; width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(238,160,80,0.95);
    box-shadow: 0 0 10px rgba(238,160,80,0.7);
  }

  .box {
    border-radius: 28px;
    padding: 0;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .box.glass { box-shadow: var(--shadow-glass-strong); }
  .box:focus-within { border-color: var(--glass-line-strong); }

  .box-inner {
    padding: 18px 20px 14px;
    display: flex; flex-direction: column; gap: 4px;
    position: relative;
    z-index: 1;
  }

  .custom-area {
    width: 100%;
    border: 0; background: transparent;
    color: var(--fg-strong);
    font: 400 15px/1.5 'Space Grotesk', sans-serif;
    resize: none;
    padding: 4px 4px 6px;
    min-height: 60px;
    max-height: 160px;
    letter-spacing: -0.01em;
  }
  .custom-area::placeholder { color: var(--fg-faint); }

  .sublang-input {
    width: 100%;
    border: 0; background: transparent;
    color: var(--fg-strong);
    font: 500 13px/1 'Space Grotesk', sans-serif;
    padding: 8px 4px;
    border-bottom: 1px dashed var(--glass-line-strong);
  }
  .sublang-input::placeholder { color: var(--fg-faint); }

  .url-row {
    display: flex; align-items: center;
    gap: 14px;
    padding: 4px 4px 2px;
  }
  .url-row .marker {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: var(--fg-soft);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding-right: 12px;
    border-right: 1px solid var(--glass-line);
  }
  .url-input {
    flex: 1;
    border: 0; background: transparent;
    color: var(--fg-strong);
    font: 400 17px/1.4 'Space Grotesk', sans-serif;
    letter-spacing: -0.015em;
    padding: 10px 0;
    min-width: 0;
  }
  .url-input::placeholder { color: var(--fg-faint); }

  .box-foot {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0 0;
    margin-top: 4px;
    border-top: 1px solid var(--glass-line);
    gap: 12px;
  }
  .foot-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .provider-toggle {
    display: flex;
    padding: 3px;
    border-radius: 999px;
    background: var(--glass-fill-soft);
    border: 1px solid var(--glass-line);
  }
  .provider-toggle button {
    appearance: none; border: 0;
    background: transparent;
    color: var(--fg-soft);
    font: 500 11.5px/1 'Space Grotesk', sans-serif;
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: color 0.15s, background 0.2s;
  }
  .provider-toggle button:hover { color: var(--fg-strong); }
  .provider-toggle button[aria-pressed="true"] {
    color: var(--fg-strong);
    background: var(--glass-fill-strong);
  }
  .provider-toggle .dot-on { width: 6px; height: 6px; border-radius: 50%; background: #6dd3a2; box-shadow: 0 0 8px rgba(109,211,162,0.7); }
  .provider-toggle .dot-off { width: 6px; height: 6px; border-radius: 50%; background: var(--fg-faint); }

  .model-select {
    appearance: none; -webkit-appearance: none;
    border: 0;
    background: transparent;
    color: var(--fg-mid);
    font: 500 11.5px/1 'Space Grotesk', sans-serif;
    padding: 7px 22px 7px 12px;
    border-radius: 999px;
    cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'><path fill='gray' d='M0 0h8L4 6z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 10px center;
    max-width: 220px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  .model-select option { background: var(--invert); color: var(--fg-strong); font-family: 'Space Grotesk', sans-serif; }
  .model-select:hover { color: var(--fg-strong); background-color: var(--glass-fill-soft); }

  .send-btn {
    appearance: none; border: 0;
    height: 40px;
    padding: 0 18px;
    border-radius: 999px;
    background: var(--send-bg);
    color: var(--invert);
    display: flex; align-items: center; gap: 8px;
    cursor: pointer;
    font: 500 13px/1 'Space Grotesk', sans-serif;
    letter-spacing: -0.005em;
    transition: all 0.18s cubic-bezier(.3,.7,.4,1);
    box-shadow: 0 4px 14px rgba(0,0,0,0.18);
  }
  .send-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    padding-right: 20px;
    box-shadow: 0 8px 22px rgba(0,0,0,0.22);
  }
  .send-btn:disabled {
    background: var(--glass-fill-soft);
    color: var(--fg-faint);
    cursor: not-allowed;
    box-shadow: none;
  }

  .params {
    display: flex; align-items: center; gap: 24px;
    padding: 0 4px;
    flex-wrap: wrap;
  }
  .params-group {
    display: flex; align-items: center; gap: 10px;
  }
  .params-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--fg-soft);
    letter-spacing: -0.005em;
  }
  .params-pills {
    display: flex; gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: var(--glass-fill-soft);
    border: 1px solid var(--glass-line);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .params-pill {
    appearance: none; border: 0;
    background: transparent;
    color: var(--fg-soft);
    font: 500 11.5px/1 'Space Grotesk', sans-serif;
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.18s;
    display: flex; align-items: center; gap: 4px;
  }
  .params-pill:hover { color: var(--fg-strong); }
  .params-pill[aria-pressed="true"] {
    color: var(--invert);
    background: var(--fg-strong);
  }
  .params-pill.add { color: var(--fg-faint); }

  @media (max-width: 720px) {
    .app { padding: 28px 22px; }
    .greet h1 { font-size: 32px; }
    .greet .sub { font-size: 13.5px; }
    .params { gap: 14px; }
    .brand { font-size: 14px; }
    .brand .reset { padding: 6px 10px; font-size: 11px; }
  }
`;

// ── App ─────────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const L = I18N[t.language] || I18N.EN;

  React.useEffect(() => {
    document.documentElement.style.setProperty('--tint', t.glassTint);
  }, [t.glassTint]);

  const [customBg, setCustomBg] = React.useState(() => {
    try { return localStorage.getItem(BG_STORAGE_KEY) || null; } catch (e) { return null; }
  });
  const onUploadBg = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      try { localStorage.setItem(BG_STORAGE_KEY, dataUrl); } catch (err) {}
      setCustomBg(dataUrl);
    };
    reader.readAsDataURL(file);
  };
  const clearBg = () => {
    try { localStorage.removeItem(BG_STORAGE_KEY); } catch (e) {}
    setCustomBg(null);
  };

  const [preset, setPreset] = React.useState('Summary');
  const [url, setUrl] = React.useState('');
  const [customPrompt, setCustomPrompt] = React.useState('');
  const [subsLang, setSubsLang] = React.useState('EN');
  const [customSubsLang, setCustomSubsLang] = React.useState('');
  const [showCustomLang, setShowCustomLang] = React.useState(false);
  const [format, setFormat] = React.useState('MD');
  const [provider, setProvider] = React.useState('ollama');
  const [models, setModels] = React.useState(MODELS);
  const [model, setModel] = React.useState('');
  const [prompts, setPrompts] = React.useState(PROMPTS_FALLBACK);
  const [messages, setMessages] = React.useState([]);
  const [busy, setBusy] = React.useState(false);

  const chatEndRef = React.useRef(null);
  React.useEffect(() => {
    if (chatEndRef.current && messages.length) {
      chatEndRef.current.parentElement.scrollTo({
        top: chatEndRef.current.parentElement.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, busy]);

  React.useEffect(() => {
    const list = models[provider];
    setModel(list && list.length ? list[0] : '');
  }, [provider, models]);

  React.useEffect(() => {
    fetch('/api/ollama/models')
      .then(r => r.json())
      .then(list => { if (list.length) setModels(m => ({ ...m, ollama: list })); })
      .catch(() => {});
    fetch('/api/ollama/status')
      .then(r => r.json())
      .then(data => { if (!data.running) setTweak('showOllamaWarning', true); })
      .catch(() => {});
    fetch('/api/providers')
      .then(r => r.json())
      .then(data => { if (data.claude?.models?.length) setModels(m => ({ ...m, claude: data.claude.models })); })
      .catch(() => {});
    fetch('/api/prompts')
      .then(r => r.json())
      .then(data => { if (Object.keys(data).length) setPrompts(data); })
      .catch(() => {});
  }, []);

  const hasMessages = messages.length > 0 || busy;
  const canSend = url.trim().length > 4 && !busy;

  const onSend = async () => {
    if (!canSend) return;
    const userMsg = {
      role: 'user',
      url: url.trim(),
      preset,
      customPrompt: preset === 'Custom' ? customPrompt : null,
      subsLang: showCustomLang && customSubsLang ? customSubsLang.toUpperCase() : subsLang,
      format,
      provider,
      model,
      ts: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setMessages((m) => [...m, userMsg]);
    setUrl('');
    setBusy(true);

    const finalLang = showCustomLang && customSubsLang
      ? customSubsLang.toLowerCase()
      : subsLang.toLowerCase();
    const finalPrompt = preset === 'Custom' ? customPrompt : (prompts[preset] || prompts.Summary);
    const params = new URLSearchParams({
      url: userMsg.url, lang: finalLang, prompt: finalPrompt,
      provider, format: FORMAT_MAP[format] || 'markdown',
      ...(model ? { model } : {}),
    });

    try {
      const r = await fetch(`/api/get_note?${params}`, { method: 'POST' });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.detail || 'server error');
      }

      const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setMessages(m => [...m, { role: 'bot', text: '', ts, format, model }]);
      setBusy(false);

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages(m => {
          const updated = [...m];
          updated[updated.length - 1] = { ...updated[updated.length - 1], text };
          return updated;
        });
      }
    } catch (err) {
      const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setMessages(m => [...m, { role: 'bot', text: `⚠ ${err.message}`, ts, format, model, error: true }]);
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const reset = () => {
    setMessages([]);
    setUrl('');
    setBusy(false);
  };

  return (
    <>
      <style>{__APP_STYLE}</style>
      <Background
        palette={t.palette}
        hasMessages={hasMessages}
        customImage={customBg}
        imageBlur={t.imageBlur}
        imageDim={t.imageDim}
      />

      <div className="app">
        <div className="topbar">
          <div className="brand">
            <span className="mark"><Glyph size={16} opacity={0.85} /></span>
            <span>auto · note</span>
            {hasMessages && (
              <button className="reset" onClick={reset}>{L.newChat}</button>
            )}
          </div>
          <div className="top-actions">
            <div className="lang-pill" role="group" aria-label="language">
              <button aria-pressed={t.language === 'EN'} onClick={() => setTweak('language', 'EN')}>EN</button>
              <button aria-pressed={t.language === 'RU'} onClick={() => setTweak('language', 'RU')}>RU</button>
            </div>
          </div>
        </div>

        <div className={cx('stage', hasMessages ? 'full' : 'empty')}>
          {hasMessages && (
            <div className="chat" key="chat">
              {messages.map((m, i) => (
                m.role === 'user' ? (
                  <div className="msg-user glass" key={i}>
                    <div className="meta-row">
                      <span className="preset-tag">{L.chips[m.preset]}</span>
                      <span className="sep">·</span>
                      <span>Subs {m.subsLang}</span>
                      <span className="sep">·</span>
                      <span>{m.format}</span>
                      <span className="sep">·</span>
                      <span>{m.model}</span>
                    </div>
                    {m.customPrompt && <div style={{ marginBottom: 6 }}>{m.customPrompt}</div>}
                    <span className="url">{m.url}</span>
                  </div>
                ) : (
                  <div className="msg-bot glass" key={i}>
                    <div className="head">
                      <Glyph size={11} opacity={0.7} />
                      <span>{L.note}</span>
                      <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{m.ts} · {m.format}</span>
                    </div>
                    {m.format === 'JSON'
                      ? <pre>{m.text}</pre>
                      : <div dangerouslySetInnerHTML={{ __html: window.marked.parse(m.text || '') }} />
                    }
                  </div>
                )
              ))}
              {busy && (
                <div className="thinking glass">
                  <span className="bars">
                    <span></span><span></span><span></span><span></span>
                  </span>
                  <span>{L.thinking}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {!hasMessages && (
            <div className="greet">
              <div className="star"><Glyph size={28} /></div>
              <h1>{L.greeting}</h1>
              <div className="sub">{L.sub}</div>
            </div>
          )}

          <div className="dock-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div className="chips glass" role="tablist">
                {Object.keys(L.chips).map((k) => (
                  <button
                    key={k}
                    role="tab"
                    aria-pressed={preset === k}
                    onClick={() => setPreset(k)}
                  >{L.chips[k]}</button>
                ))}
              </div>
              {t.showOllamaWarning && <div className="warning">{L.ollamaDown}</div>}
            </div>

            <div className="box glass">
              <div className="box-inner">
                {preset === 'Custom' && (
                  <textarea
                    className="custom-area"
                    placeholder={L.customPlaceholder}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                )}
                {showCustomLang && (
                  <input
                    className="sublang-input"
                    placeholder={L.addLangPlaceholder}
                    value={customSubsLang}
                    onChange={(e) => setCustomSubsLang(e.target.value)}
                    maxLength={6}
                  />
                )}
                <div className="url-row">
                  <span className="marker">URL</span>
                  <input
                    type="text"
                    className="url-input"
                    placeholder={L.urlPlaceholder}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoFocus
                  />
                </div>

                <div className="box-foot">
                  <div className="foot-left">
                    <div className="provider-toggle">
                      <button aria-pressed={provider === 'ollama'} onClick={() => setProvider('ollama')}>
                        <span className={provider === 'ollama' ? 'dot-on' : 'dot-off'}></span>
                        Ollama
                      </button>
                      <button aria-pressed={provider === 'claude'} onClick={() => setProvider('claude')}>
                        <span className={provider === 'claude' ? 'dot-on' : 'dot-off'}></span>
                        Claude
                      </button>
                    </div>
                    <select
                      className="model-select"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      aria-label={L.model}
                    >
                      {(models[provider] || []).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <button className="send-btn" onClick={onSend} disabled={!canSend} aria-label={L.send}>
                    <span>{L.send}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="params">
              <div className="params-group">
                <span className="params-label">{L.subsLang}</span>
                <div className="params-pills">
                  {['EN', 'RU'].map((l) => (
                    <button
                      key={l}
                      className="params-pill"
                      aria-pressed={!showCustomLang && subsLang === l}
                      onClick={() => { setShowCustomLang(false); setSubsLang(l); }}
                    >{l}</button>
                  ))}
                  <button
                    className={cx('params-pill', !showCustomLang && 'add')}
                    aria-pressed={showCustomLang}
                    onClick={() => setShowCustomLang(!showCustomLang)}
                    title={L.addLang}
                  >
                    <PlusIcon size={10} />
                    {showCustomLang && customSubsLang ? customSubsLang.toUpperCase() : ''}
                  </button>
                </div>
              </div>

              <div className="params-group">
                <span className="params-label">{L.format}</span>
                <div className="params-pills">
                  {['MD', 'TXT', 'JSON'].map((f) => (
                    <button
                      key={f}
                      className="params-pill"
                      aria-pressed={format === f}
                      onClick={() => setFormat(f)}
                    >{f}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TweaksPanel title="auto·note">
        <TweakSection label="Atmosphere">
          <TweakRadio label="Palette" value={t.palette}
                      options={[
                        { value: 'storm', label: 'Storm' },
                        { value: 'ink', label: 'Ink' },
                        { value: 'moss', label: 'Moss' },
                        { value: 'silver', label: 'Silver' },
                        { value: 'pearl', label: 'Pearl' },
                      ]}
                      onChange={(v) => setTweak('palette', v)} />
          <TweakSlider label="Glass tint" value={t.glassTint} min={4} max={40} step={1} unit="%"
                       onChange={(v) => setTweak('glassTint', v)} />
        </TweakSection>
        <TweakSection label="Custom background">
          <BgUploader value={customBg} onUpload={onUploadBg} onClear={clearBg} />
          {customBg && (
            <>
              <TweakSlider label="Blur" value={t.imageBlur} min={0} max={60} step={1} unit="px"
                           onChange={(v) => setTweak('imageBlur', v)} />
              <TweakSlider label="Dim" value={t.imageDim} min={0} max={80} step={1} unit="%"
                           onChange={(v) => setTweak('imageDim', v)} />
            </>
          )}
        </TweakSection>
        <TweakSection label="Interface">
          <TweakRadio label="Language" value={t.language}
                      options={['EN', 'RU']}
                      onChange={(v) => setTweak('language', v)} />
          <TweakToggle label="Show Ollama warning" value={t.showOllamaWarning}
                       onChange={(v) => setTweak('showOllamaWarning', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
