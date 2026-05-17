// app.jsx — auto·note main app
// HUD aesthetic: thin tech typography, dithered terrain backdrop, hairline chat panels.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "silver",
  "showOllamaWarning": false,
  "language": "EN",
  "imageBlur": 12,
  "imageDim": 45,
  "showHud": true
}/*EDITMODE-END*/;

const BG_STORAGE_KEY = 'autonote.customBg.v1';

// ── Copy ────────────────────────────────────────────────────────────────
const I18N = {
  EN: {
    greeting: 'What would you like to capture?',
    sub: 'Drop a YouTube link. Subtitles in, structured notes out.',
    chips: { Summary: 'summary', 'Key points': 'key·points', Notes: 'notes', Custom: 'custom' },
    urlPlaceholder: 'paste youtube url',
    customPlaceholder: 'describe what to extract from the subtitles…',
    subsLang: 'subs',
    format: 'fmt',
    addLang: '+ add',
    addLangPlaceholder: 'lang code',
    provider: 'engine',
    model: 'model',
    ollamaDown: 'ollama runtime unreachable — switched to claude',
    send: 'run',
    thinking: 'parsing subtitle stream',
    you: 'you',
    note: 'note',
    newChat: 'new session',
    tagline: 'subtitles → notes',
  },
  RU: {
    greeting: 'Что нужно зафиксировать?',
    sub: 'Вставьте ссылку YouTube. На входе субтитры — на выходе заметка.',
    chips: { Summary: 'кратко', 'Key points': 'тезисы', Notes: 'заметки', Custom: 'свой' },
    urlPlaceholder: 'ссылка youtube',
    customPlaceholder: 'опишите, что извлечь из субтитров…',
    subsLang: 'sub',
    format: 'fmt',
    addLang: '+ add',
    addLangPlaceholder: 'код языка',
    provider: 'engine',
    model: 'model',
    ollamaDown: 'ollama недоступна — переключено на claude',
    send: 'run',
    thinking: 'разбираю субтитры',
    you: 'вы',
    note: 'заметка',
    newChat: 'новая сессия',
    tagline: 'субтитры → заметки',
  },
};

const MODELS = {
  ollama: [],
  claude: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'],
};

const PROMPTS = {
  Summary: 'Analyze this text and return a brief, clear summary',
  'Key points': 'Extract the key points from the text as a numbered list',
  Notes: 'Create detailed notes from the text organized by topic',
};

const FORMAT_MAP = { MD: 'markdown', TXT: 'txt', JSON: 'json' };

// ── Helpers ─────────────────────────────────────────────────────────────
function cx(...xs) { return xs.filter(Boolean).join(' '); }

function Glyph({ size = 14, opacity = 1 }) {
  // Plus / target glyph used as the brand mark
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
      <path d="M5 12 H19 M13 6 L19 12 L13 18" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function PlusIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5 V19 M5 12 H19" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="square" />
    </svg>
  );
}

// ── BgUploader (custom Tweak control) ──────────────────────────────────
const __BG_UPLOADER_STYLE = `
  .bg-up { display: flex; flex-direction: column; gap: 6px; }
  .bg-up .preview {
    position: relative;
    width: 100%; aspect-ratio: 16/9;
    border-radius: 4px;
    overflow: hidden;
    background: rgba(0,0,0,0.08) center/cover no-repeat;
    border: 0.5px dashed rgba(0,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
    color: rgba(41,38,27,0.45);
    font: 400 9.5px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.14em; text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .bg-up .preview:hover { border-color: rgba(0,0,0,0.4); background-color: rgba(0,0,0,0.04); }
  .bg-up .preview.has { border-style: solid; border-color: rgba(0,0,0,0.12); color: transparent; }
  .bg-up .preview.dragover { border-color: #1a7f4f; background-color: rgba(26,127,79,0.06); }
  .bg-up .actions { display: flex; gap: 6px; }
  .bg-up .actions button {
    appearance: none; flex: 1; height: 26px;
    border: 0; border-radius: 4px;
    background: rgba(0,0,0,0.06); color: inherit;
    font: 400 10.5px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.12em; text-transform: uppercase;
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
          {!value && (dragOver ? 'drop' : 'drop / click')}
        </div>
        <div className="actions">
          <button className="primary" onClick={pick}>
            {value ? 'replace' : 'upload'}
          </button>
          {value && <button onClick={onClear}>clear</button>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onChange} />
      </div>
    </>
  );
}

// ── Glass / HUD style ───────────────────────────────────────────────────
const __APP_STYLE = `
  /* Theme tokens — overridden when body[data-theme="light"] */
  body[data-theme="dark"] {
    --fg-strong: rgba(232,232,227,0.98);
    --fg-mid: rgba(232,232,227,0.75);
    --fg-soft: rgba(232,232,227,0.5);
    --fg-faint: rgba(232,232,227,0.32);
    --line: rgba(232,232,227,0.14);
    --line-strong: rgba(232,232,227,0.28);
    --glass: rgba(232,232,227,0.05);
    --glass-strong: rgba(232,232,227,0.09);
    --glass-msg: rgba(8,9,11,0.72);
    --invert: #050607;
    --send-bg: rgba(232,232,227,0.94);
    --shadow-glass: 0 30px 60px -20px rgba(0,0,0,0.7);
  }
  body[data-theme="light"] {
    --fg-strong: rgba(26,26,28,0.96);
    --fg-mid: rgba(26,26,28,0.72);
    --fg-soft: rgba(26,26,28,0.48);
    --fg-faint: rgba(26,26,28,0.3);
    --line: rgba(26,26,28,0.08);
    --line-strong: rgba(26,26,28,0.18);
    --glass: rgba(255,255,255,0.38);
    --glass-strong: rgba(255,255,255,0.55);
    --glass-msg: rgba(255,255,255,0.78);
    --invert: #fafafa;
    --send-bg: rgba(26,26,28,0.88);
    --shadow-glass: 0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px -20px rgba(0,0,0,0.18);
  }
  body { color: var(--fg-strong); }

  .app {
    position: relative; z-index: 4;
    height: 100%; width: 100%;
    display: flex; flex-direction: column;
    padding: 48px 56px;
  }

  .topbar {
    position: relative; z-index: 6;
    display: flex; justify-content: flex-end; align-items: center;
    flex-shrink: 0;
  }
  .top-actions { display: flex; gap: 10px; align-items: center; }

  /* Language pill — fully rounded glass */
  .lang-pill {
    display: inline-flex;
    padding: 4px;
    border-radius: 999px;
    border: 0.5px solid var(--line);
    background: var(--glass);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    box-shadow: var(--shadow-glass);
  }
  .lang-pill button {
    appearance: none; border: 0;
    background: transparent;
    color: var(--fg-soft);
    font: 400 10px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 7px 14px;
    border-radius: 999px;
    cursor: pointer;
    transition: color 0.15s, background 0.2s;
  }
  .lang-pill button:hover { color: var(--fg-strong); }
  .lang-pill button[aria-pressed="true"] {
    color: var(--invert);
    background: var(--fg-strong);
  }

  /* Stage */
  .stage {
    flex: 1;
    display: flex; flex-direction: column;
    min-height: 0;
    position: relative; z-index: 5;
  }
  .stage.empty { justify-content: center; align-items: center; }
  .stage.full { justify-content: flex-end; }

  /* Greeting */
  .greet {
    text-align: center;
    margin-bottom: 40px;
    max-width: 640px;
    display: flex; flex-direction: column; align-items: center; gap: 20px;
  }
  .greet .star {
    width: 46px; height: 46px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: var(--glass);
    border: 0.5px solid var(--line);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    color: var(--fg-mid);
    box-shadow: var(--shadow-glass);
  }
  .greet h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 300;
    font-size: clamp(36px, 5.4vw, 60px);
    line-height: 1.08;
    letter-spacing: -0.025em;
    margin: 0;
    color: var(--fg-strong);
    text-wrap: balance;
  }
  .greet .sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    font-weight: 300;
    color: var(--fg-soft);
    letter-spacing: 0.16em;
    max-width: 460px;
    line-height: 1.6;
    text-transform: uppercase;
  }

  /* Chat list */
  .chat {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    flex: 1;
    overflow-y: auto;
    padding: 100px 4px 32px;
    display: flex; flex-direction: column; gap: 18px;
    scrollbar-width: thin;
    scrollbar-color: var(--line-strong) transparent;
    mask-image: linear-gradient(to bottom, transparent 0%, #000 8%, #000 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 8%, #000 100%);
  }
  .chat::-webkit-scrollbar { width: 4px; }
  .chat::-webkit-scrollbar-thumb {
    background: var(--line-strong); border-radius: 4px;
  }

  /* User message — soft rounded glass */
  .msg-user {
    align-self: flex-end;
    max-width: 80%;
    padding: 14px 18px;
    border-radius: 18px 18px 6px 18px;
    background: var(--glass-strong);
    border: 0.5px solid var(--line);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    box-shadow: var(--shadow-glass);
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--fg-strong);
  }
  .msg-user .url {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--fg-soft);
    display: block;
    margin-top: 8px;
    padding-top: 8px;
    word-break: break-all;
    border-top: 0.5px solid var(--line);
  }
  .msg-user .meta-row {
    display: flex; gap: 10px; align-items: center;
    margin-bottom: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--fg-soft);
  }
  .msg-user .meta-row .sep { opacity: 0.4; }
  .msg-user .preset-tag {
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--glass-strong);
    color: var(--fg-strong);
  }

  /* Bot — softer, rounded, glassy card */
  .msg-bot {
    align-self: flex-start;
    max-width: 86%;
    padding: 26px 28px;
    border-radius: 6px 22px 22px 22px;
    background: var(--glass-msg);
    border: 0.5px solid var(--line);
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    box-shadow: var(--shadow-glass);
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--fg-strong);
  }
  .msg-bot .head {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 0.5px solid var(--line);
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--fg-soft);
  }
  .msg-bot h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 300;
    font-size: 28px;
    letter-spacing: -0.025em;
    line-height: 1.12;
    margin: 0 0 14px;
    color: var(--fg-strong);
  }
  .msg-bot p { margin: 0 0 10px; font-weight: 300; }
  .msg-bot ul { margin: 8px 0 0; padding-left: 0; list-style: none; }
  .msg-bot li {
    position: relative;
    margin-bottom: 6px;
    padding-left: 22px;
    font-weight: 300;
  }
  .msg-bot li::before {
    content: '—';
    position: absolute; left: 0;
    color: var(--fg-faint);
    font-family: 'JetBrains Mono', monospace;
  }
  .msg-bot em {
    font-style: normal;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--fg-soft);
    text-transform: uppercase;
    margin-right: 6px;
  }

  /* Thinking — rounded pill */
  .thinking {
    align-self: flex-start;
    display: flex; align-items: center; gap: 12px;
    padding: 12px 18px;
    border-radius: 999px;
    background: var(--glass-msg);
    border: 0.5px solid var(--line);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow: var(--shadow-glass);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    color: var(--fg-mid);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .thinking .bars { display: flex; gap: 2px; }
  .thinking .bars span {
    display: block;
    width: 2px; height: 10px;
    background: var(--fg-mid);
    border-radius: 1px;
    animation: bar 1.1s ease-in-out infinite;
  }
  .thinking .bars span:nth-child(2) { animation-delay: 0.12s; }
  .thinking .bars span:nth-child(3) { animation-delay: 0.24s; }
  .thinking .bars span:nth-child(4) { animation-delay: 0.36s; }
  @keyframes bar {
    0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
    50% { transform: scaleY(1); opacity: 1; }
  }

  /* Dock */
  .dock-wrap {
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    flex-shrink: 0;
    display: flex; flex-direction: column; gap: 14px;
    padding-bottom: 8px;
  }

  /* Chips — fully rounded pill group */
  .chips {
    display: flex; gap: 2px;
    padding: 4px;
    border-radius: 999px;
    border: 0.5px solid var(--line);
    background: var(--glass);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    box-shadow: var(--shadow-glass);
    width: fit-content;
  }
  .chips button {
    appearance: none; border: 0;
    background: transparent;
    color: var(--fg-soft);
    font: 400 10.5px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 9px 16px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .chips button:hover {
    color: var(--fg-strong);
    background: var(--glass);
  }
  .chips button[aria-pressed="true"] {
    color: var(--invert);
    background: var(--fg-strong);
  }

  /* Warning */
  .warning {
    align-self: flex-start;
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: rgba(212,140,80,0.12);
    border: 0.5px solid rgba(212,140,80,0.3);
    color: #a05a20;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    font: 400 9.5px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  body[data-theme="dark"] .warning { color: rgba(238,180,120,0.95); }
  .warning::before {
    content: ''; width: 5px; height: 5px;
    border-radius: 50%;
    background: rgba(238,160,80,0.95);
    box-shadow: 0 0 8px rgba(238,160,80,0.6);
  }

  /* Input box — BIG glass slab, fully rounded */
  .box {
    border-radius: 26px;
    padding: 0;
    background: var(--glass);
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    border: 0.5px solid var(--line);
    box-shadow: var(--shadow-glass);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .box:focus-within { border-color: var(--line-strong); }

  .box-inner {
    padding: 16px 18px 12px;
    display: flex; flex-direction: column; gap: 6px;
  }

  .custom-area {
    width: 100%;
    border: 0; background: transparent;
    color: var(--fg-strong);
    font: 300 13.5px/1.5 'Space Grotesk', sans-serif;
    resize: none;
    padding: 4px 4px 6px;
    min-height: 58px;
    max-height: 160px;
    letter-spacing: -0.005em;
  }
  .custom-area::placeholder { color: var(--fg-faint); }

  .sublang-input {
    width: 100%;
    border: 0; background: transparent;
    color: var(--fg-strong);
    font: 400 11px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 8px 4px;
    border-bottom: 0.5px dashed var(--line-strong);
  }
  .sublang-input::placeholder { color: var(--fg-faint); }

  .url-row {
    display: flex; align-items: center;
    gap: 14px;
    padding: 4px 4px 2px;
  }
  .url-row .marker {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--fg-soft);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding-right: 12px;
    border-right: 0.5px solid var(--line);
  }
  .url-input {
    flex: 1;
    border: 0; background: transparent;
    color: var(--fg-strong);
    font: 300 16px/1.4 'Space Grotesk', sans-serif;
    letter-spacing: -0.005em;
    padding: 8px 0;
    min-width: 0;
  }
  .url-input::placeholder { color: var(--fg-faint); }

  /* Bottom controls */
  .box-foot {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 0 0;
    margin-top: 4px;
    border-top: 0.5px solid var(--line);
    gap: 12px;
  }
  .foot-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .provider-toggle {
    display: flex;
    padding: 3px;
    border-radius: 999px;
    background: var(--glass);
    border: 0.5px solid var(--line);
  }
  .provider-toggle button {
    appearance: none; border: 0;
    background: transparent;
    color: var(--fg-soft);
    font: 400 9.5px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
  }
  .provider-toggle button[aria-pressed="true"] {
    color: var(--fg-strong);
    background: var(--glass-strong);
  }
  .provider-toggle .dot-on { width: 5px; height: 5px; border-radius: 50%; background: #6dd3a2; box-shadow: 0 0 6px rgba(109,211,162,0.7); }
  .provider-toggle .dot-off { width: 5px; height: 5px; border-radius: 50%; background: var(--fg-faint); }

  .model-select {
    appearance: none; -webkit-appearance: none;
    border: 0;
    background: transparent;
    color: var(--fg-mid);
    font: 400 10px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.06em;
    padding: 6px 22px 6px 12px;
    border-radius: 999px;
    cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'><path fill='gray' d='M0 0h8L4 6z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 10px center;
    max-width: 200px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  .model-select option { background: var(--invert); color: var(--fg-strong); font-family: 'JetBrains Mono', monospace; }
  .model-select:hover { color: var(--fg-strong); background-color: var(--glass); }

  .send-btn {
    appearance: none; border: 0;
    height: 36px;
    padding: 0 16px;
    border-radius: 999px;
    background: var(--send-bg);
    color: var(--invert);
    display: flex; align-items: center; gap: 8px;
    cursor: pointer;
    font: 500 10px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    transition: all 0.18s cubic-bezier(.3,.7,.4,1);
    box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  }
  .send-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    padding-right: 18px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  }
  .send-btn:disabled {
    background: var(--glass-strong);
    color: var(--fg-faint);
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Params row */
  .params {
    display: flex; align-items: center; gap: 22px;
    padding: 0 4px;
    flex-wrap: wrap;
    font-family: 'JetBrains Mono', monospace;
  }
  .params-group {
    display: flex; align-items: center; gap: 10px;
  }
  .params-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--fg-faint);
  }
  .params-pills {
    display: flex; gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: var(--glass);
    border: 0.5px solid var(--line);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .params-pill {
    appearance: none; border: 0;
    background: transparent;
    color: var(--fg-soft);
    font: 400 10px/1 'JetBrains Mono', monospace;
    letter-spacing: 0.14em;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.18s;
    display: flex; align-items: center; gap: 4px;
    text-transform: uppercase;
  }
  .params-pill:hover { color: var(--fg-strong); }
  .params-pill[aria-pressed="true"] {
    color: var(--invert);
    background: var(--fg-strong);
  }
  .params-pill.add { color: var(--fg-faint); }

  /* Brand mark when chat is active */
  .brandmark {
    position: absolute;
    top: 52px; left: 64px;
    z-index: 6;
    display: flex; align-items: center; gap: 12px;
    color: var(--fg-strong);
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 300;
    font-size: 18px;
    letter-spacing: -0.01em;
    transition: opacity 0.5s ease;
  }
  .brandmark .reset {
    appearance: none;
    border: 0.5px solid var(--line);
    border-radius: 999px;
    background: var(--glass);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    color: var(--fg-mid);
    font: 400 9.5px/1 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    padding: 8px 14px;
    cursor: pointer;
    margin-left: 14px;
    transition: all 0.18s;
    box-shadow: var(--shadow-glass);
  }
  .brandmark .reset:hover {
    color: var(--fg-strong);
    border-color: var(--line-strong);
  }

  @media (max-width: 720px) {
    .app { padding: 28px 22px; }
    .greet h1 { font-size: 32px; }
    .greet .sub { font-size: 9.5px; }
    .params { gap: 14px; }
    .brandmark { top: 28px; left: 28px; font-size: 16px; }
    .brandmark .reset { padding: 6px 10px; font-size: 9px; }
  }
`


// ── App ─────────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const L = I18N[t.language] || I18N.EN;

  // Custom background — persisted via localStorage (data URLs too big for tweaks JSON)
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
  const [model, setModel] = React.useState(MODELS.ollama[0]);
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
  }, [provider]);

  React.useEffect(() => {
    fetch('/api/ollama/models')
      .then(r => r.json())
      .then(list => {
        if (list.length) setModels(m => ({ ...m, ollama: list }));
      })
      .catch(() => {});
    fetch('/api/ollama/status')
      .then(r => r.json())
      .then(data => { if (!data.running) setTweak('showOllamaWarning', true); })
      .catch(() => {});
  }, []);

  const hasMessages = messages.length > 0 || busy;
  const canSend = url.trim().length > 4 && !busy;

  const onSend = () => {
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
    const finalPrompt = preset === 'Custom' ? customPrompt : (PROMPTS[preset] || PROMPTS.Summary);
    const params = new URLSearchParams({
      url: userMsg.url, lang: finalLang, prompt: finalPrompt,
      provider, format: FORMAT_MAP[format] || 'markdown',
      ...(model ? { model } : {}),
    });

    fetch(`/api/get_note?${params}`, { method: 'POST' })
      .then(r => {
        if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'server error'); });
        return r.json();
      })
      .then(data => {
        const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setMessages(m => [...m, { role: 'bot', text: data.text, ts, format, model }]);
        setBusy(false);
      })
      .catch(err => {
        const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setMessages(m => [...m, { role: 'bot', text: `⚠ ${err.message}`, ts, format, model, error: true }]);
        setBusy(false);
      });
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
        showHud={t.showHud}
      />

      <div className="app">
        {hasMessages && (
          <div className="brandmark">
            <Glyph size={16} opacity={0.7} />
            <span>auto · note</span>
            <button className="reset" onClick={reset}>{L.newChat}</button>
          </div>
        )}

        <div className="topbar">
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
                  <div className="msg-user" key={i}>
                    <div className="meta-row">
                      <span className="preset-tag">{L.chips[m.preset]}</span>
                      <span className="sep">·</span>
                      <span>SUB {m.subsLang}</span>
                      <span className="sep">·</span>
                      <span>FMT {m.format}</span>
                      <span className="sep">·</span>
                      <span>{m.model}</span>
                    </div>
                    {m.customPrompt && <div style={{ marginBottom: 6 }}>{m.customPrompt}</div>}
                    <span className="url">{m.url}</span>
                  </div>
                ) : (
                  <div className="msg-bot" key={i}>
                    <div className="head">
                      <Glyph size={10} opacity={0.6} />
                      <span>{L.note}</span>
                      <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{m.ts} · {m.format}</span>
                    </div>
                    {m.format === 'JSON'
                      ? <pre style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0 }}>{m.text}</pre>
                      : <div dangerouslySetInnerHTML={{ __html: window.marked.parse(m.text || '') }} />
                    }
                  </div>
                )
              ))}
              {busy && (
                <div className="thinking">
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
              <div className="star"><Glyph size={26} /></div>
              <h1>{L.greeting}</h1>
              <div className="sub">{L.sub}</div>
            </div>
          )}

          <div className="dock-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div className="chips" role="tablist">
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

            <div className="box">
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
                  <span className="marker">url</span>
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
                        ollama
                      </button>
                      <button aria-pressed={provider === 'claude'} onClick={() => setProvider('claude')}>
                        <span className={provider === 'claude' ? 'dot-on' : 'dot-off'}></span>
                        claude
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
                    <ArrowRight size={12} />
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
                    <PlusIcon size={9} />
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
                        { value: 'silver', label: 'Silver' },
                        { value: 'pearl', label: 'Pearl' },
                        { value: 'ink', label: 'Ink' },
                        { value: 'moss', label: 'Moss' },
                      ]}
                      onChange={(v) => setTweak('palette', v)} />
          <TweakToggle label="HUD chrome" value={t.showHud}
                       onChange={(v) => setTweak('showHud', v)} />
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
