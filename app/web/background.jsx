// background.jsx — light/dark adaptive backdrops with dithered organic forms
// Renders nothing interactive; pure painter.

const PALETTES = {
  silver: {
    name: 'Silver',
    theme: 'light',
    base: 'linear-gradient(135deg, #e8e8e8 0%, #f4f3f1 45%, #d4d4d2 100%)',
    fg: '#1a1a1c',
    accent: '#2a2a2e',
    terrainColor: '#1a1a1c',
    terrainStyle: 'wispy',
    terrain: true,
    blobs: [
      { c: '#ffffff', x: 30, y: 25, r: 55, op: 0.4, blend: 'normal' },
      { c: '#c8c8c6', x: 75, y: 70, r: 60, op: 0.35, blend: 'multiply' },
    ],
    overlay: 'transparent',
    vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.08) 100%)',
    grainOp: 0.25,
    hudOpacity: 0.5,
    hudColor: 'rgba(26,26,28,0.55)',
    hudAccent: 'rgba(26,26,28,0.85)',
  },
  pearl: {
    name: 'Pearl',
    theme: 'light',
    base: 'linear-gradient(160deg, #f1eee8 0%, #ede8df 50%, #d8cfc0 100%)',
    fg: '#2a2520',
    accent: '#3a302a',
    terrainColor: '#3a302a',
    terrainStyle: 'wispy',
    terrain: true,
    blobs: [
      { c: '#ffffff', x: 25, y: 30, r: 50, op: 0.5, blend: 'normal' },
      { c: '#c8b89a', x: 80, y: 75, r: 55, op: 0.3, blend: 'multiply' },
    ],
    overlay: 'transparent',
    vignette: 'radial-gradient(ellipse at center, transparent 45%, rgba(80,60,40,0.1) 100%)',
    grainOp: 0.22,
    hudOpacity: 0.5,
    hudColor: 'rgba(42,37,32,0.55)',
    hudAccent: 'rgba(42,37,32,0.85)',
  },
  moss: {
    name: 'Moss',
    theme: 'dark',
    base: '#0d1410',
    fg: '#f3efe7',
    accent: '#8aa86b',
    terrainColor: '#a8c585',
    terrainStyle: 'wispy',
    terrain: true,
    blobs: [
      { c: '#3d5a3a', x: 18, y: 22, r: 55, op: 0.7, blend: 'screen' },
      { c: '#1a2a25', x: 78, y: 28, r: 60, op: 0.55, blend: 'screen' },
      { c: '#566b3f', x: 28, y: 78, r: 70, op: 0.45, blend: 'screen' },
      { c: '#8aa86b', x: 50, y: 50, r: 35, op: 0.16, blend: 'screen' },
    ],
    overlay: 'rgba(13,20,16,0.18)',
    vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
    grainOp: 0.4,
    hudOpacity: 0.85,
    hudColor: 'rgba(243,239,231,0.35)',
    hudAccent: 'rgba(243,239,231,0.85)',
  },
  ink: {
    name: 'Ink',
    theme: 'dark',
    base: '#0a0a0c',
    fg: '#e8e8e3',
    accent: '#c8c8c2',
    terrainColor: '#d6d6cf',
    terrainStyle: 'wispy',
    terrain: true,
    blobs: [
      { c: '#1a1a1f', x: 25, y: 30, r: 50, op: 0.5, blend: 'screen' },
      { c: '#252530', x: 75, y: 75, r: 55, op: 0.45, blend: 'screen' },
    ],
    overlay: 'rgba(8,8,10,0.25)',
    vignette: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)',
    grainOp: 0.42,
    hudOpacity: 0.85,
    hudColor: 'rgba(232,232,227,0.35)',
    hudAccent: 'rgba(232,232,227,0.85)',
  },
};

const __BG_STYLE = `
  .bg-stage {
    position: fixed; inset: 0; z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .bg-stage .bg-photo {
    position: absolute; inset: -20px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transform-origin: center;
    will-change: filter, transform;
  }
  .bg-stage .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    will-change: transform;
    transform: translate(-50%, -50%);
  }
  .bg-stage canvas.terrain {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    opacity: 0.92;
  }
  .bg-overlay {
    position: fixed; inset: 0; z-index: 1;
    pointer-events: none;
  }
  .bg-grain {
    position: fixed; inset: 0; z-index: 2;
    pointer-events: none;
    mix-blend-mode: overlay;
  }
  .bg-vignette {
    position: fixed; inset: 0; z-index: 3;
    pointer-events: none;
  }

  /* HUD — minimal, two thin columns of mono data, very low presence */
  .hud {
    position: fixed; inset: 0; z-index: 3;
    pointer-events: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--hud-fg);
  }
  .hud .col {
    position: absolute;
    top: 56px;
    width: 200px;
    display: flex; flex-direction: column;
    gap: 14px;
    line-height: 1.65;
    transition: opacity 0.5s ease;
  }
  .hud .col.l { left: 56px; text-align: left; }
  .hud .col.r { right: 56px; text-align: right; align-items: flex-end; }
  .hud .col .block { display: flex; flex-direction: column; gap: 1px; }
  .hud .col .block .h {
    color: var(--hud-acc);
    font-weight: 500;
    letter-spacing: 0.18em;
    margin-bottom: 3px;
    font-size: 9.5px;
  }
  .hud .col .block .l {
    opacity: 0.7;
    display: flex; gap: 8px;
    font-feature-settings: "tnum"; font-variant-numeric: tabular-nums;
  }
  .hud .col.r .block .l { justify-content: flex-end; }
  .hud .col .block .l .lbl { opacity: 0.65; }
  .hud .col .block .l .val { opacity: 1; }

  /* Corner readouts — clock + version */
  .hud .corner {
    position: absolute;
    display: flex; flex-direction: column;
    gap: 2px;
    line-height: 1.5;
    font-size: 9px;
  }
  .hud .corner.bl { bottom: 56px; left: 56px; }
  .hud .corner.br { bottom: 56px; right: 56px; text-align: right; align-items: flex-end; }
  .hud .corner .row { display: flex; gap: 8px; }
  .hud .corner.br .row { justify-content: flex-end; }
  .hud .corner .lbl { opacity: 0.55; }
  .hud .corner .val { opacity: 0.9; font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }

  /* Ambient watermark */
  .hud .stamp {
    position: absolute;
    bottom: 36px; left: 50%;
    transform: translateX(-50%);
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 200;
    font-size: 11px;
    letter-spacing: 0.5em;
    text-transform: uppercase;
    color: var(--hud-fg);
    opacity: 0.4;
    pointer-events: none;
    user-select: none;
  }

  @media (max-width: 900px) {
    .hud .col { display: none; }
    .hud .corner.bl { bottom: 24px; left: 24px; }
    .hud .corner.br { bottom: 24px; right: 24px; }
  }
`;

// ── Wispy organic terrain ─────────────────────────────────────────────
// Renders a soft dithered/wireframe form similar to the silver reference.
// Light mode: dark dots on light bg. Dark mode: light dots on dark bg.
function TerrainCanvas({ color = '#1a1a1c', theme = 'light', seed = 11 }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = cvs.clientWidth * dpr;
      const H = cvs.clientHeight * dpr;
      cvs.width = W; cvs.height = H;
      const ctx = cvs.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      const rand = (x, y) => {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
      };
      const smoothNoise = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const a = rand(xi, yi), b = rand(xi + 1, yi);
        const c = rand(xi, yi + 1), d = rand(xi + 1, yi + 1);
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);
        return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
      };
      const fbm = (x, y) => {
        let v = 0, amp = 0.5, fr = 1;
        for (let i = 0; i < 5; i++) {
          v += amp * smoothNoise(x * fr, y * fr);
          fr *= 2; amp *= 0.5;
        }
        return v;
      };

      const hex = color.replace('#', '');
      const r0 = parseInt(hex.slice(0, 2), 16);
      const g0 = parseInt(hex.slice(2, 4), 16);
      const b0 = parseInt(hex.slice(4, 6), 16);

      // Central wispy mass — diffuse oval in middle-right area
      const cx = W * 0.52;
      const cy = H * 0.55;
      const rx = W * 0.28;
      const ry = H * 0.55;

      const cellSize = 1.8 * dpr;
      const cols = Math.ceil(W / cellSize);
      const rows = Math.ceil(H / cellSize);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const px = i * cellSize;
          const py = j * cellSize;
          const nx = px / W;
          const ny = py / H;

          // Distance to soft elliptical core
          const dx = (px - cx) / rx;
          const dy = (py - cy) / ry;
          const d = Math.sqrt(dx * dx + dy * dy);

          // Form mask: dense near center, falls off
          const formMask = Math.max(0, 1 - d);
          if (formMask < 0.02) continue;

          // Wispy displacement — fbm noise warps the form
          const warp = fbm(nx * 4 + 0.5, ny * 6) * 1.4 - 0.7;
          const angle = fbm(nx * 3, ny * 3 + 7) * Math.PI * 2;
          const wx = px + Math.cos(angle) * 20 * dpr * warp;
          const wy = py + Math.sin(angle) * 20 * dpr * warp;
          const wdx = (wx - cx) / rx;
          const wdy = (wy - cy) / ry;
          const wd = Math.sqrt(wdx * wdx + wdy * wdy);
          const warpMask = Math.max(0, 1 - wd);

          // Fine structure — high-freq noise gives the dithered look
          const fine = fbm(nx * 30, ny * 30 + 3);
          const surface = warpMask * (0.4 + fine * 0.9);

          // Edge density — bias toward the rim where wireframe should show
          const rim = Math.max(0, 1 - Math.abs(d - 0.65) * 3) * formMask;
          const density = surface + rim * 0.7;

          // Threshold against random
          const r = rand(i, j);
          if (r > density * 1.6) continue;

          let a = density * (0.3 + 0.7 * rand(i + 31, j + 17));
          // Subtle hint of color speckle near center (matches reference's iridescence)
          let cr = r0, cg = g0, cb = b0;
          if (theme === 'light' && d < 0.5 && rand(i + 99, j) > 0.95) {
            // tiny chance of cool/warm hue speckle
            const hue = rand(i + 7, j + 13);
            if (hue < 0.33) { cr = 110; cg = 110; cb = 140; }      // cool
            else if (hue < 0.66) { cr = 140; cg = 100; cb = 120; } // warm
            else { cr = 100; cg = 130; cb = 130; }                 // teal
          }

          a = Math.min(0.9, a);
          if (a < 0.04) continue;

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
          const jx = (rand(i, j) - 0.5) * cellSize * 0.4;
          const jy = (rand(i + 7, j + 3) - 0.5) * cellSize * 0.4;
          const sz = 1 * dpr + (rand(i + 1, j + 1) > 0.9 ? 1 : 0);
          ctx.fillRect(px + jx, py + jy, sz, sz);
        }
      }

      // Add a few flowing curves on top — wireframe contour lines
      ctx.strokeStyle = `rgba(${r0},${g0},${b0},${theme === 'light' ? 0.16 : 0.22})`;
      ctx.lineWidth = 0.5 * dpr;
      const numCurves = 24;
      for (let k = 0; k < numCurves; k++) {
        const ang = (k / numCurves) * Math.PI * 2;
        const startR = 0.4 + k * 0.02;
        ctx.beginPath();
        let firstPoint = true;
        for (let tt = 0; tt < Math.PI * 2; tt += 0.05) {
          const radNoise = fbm(Math.cos(tt) * 2 + k, Math.sin(tt) * 2);
          const r = (startR + radNoise * 0.25);
          const x = cx + Math.cos(tt + ang * 0.3) * rx * r;
          const y = cy + Math.sin(tt + ang * 0.3) * ry * r;
          if (firstPoint) { ctx.moveTo(x, y); firstPoint = false; }
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.globalAlpha = 0.06 + rand(k, 1) * 0.06;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cvs);
    return () => ro.disconnect();
  }, [color, theme, seed]);

  return <canvas ref={ref} className="terrain" />;
}

function Background({ palette = 'silver', hasMessages = false, customImage = null, imageBlur = 0, imageDim = 30, showHud = true }) {
  const p = PALETTES[palette] || PALETTES.silver;
  const [m, setM] = React.useState({ x: 0.5, y: 0.5 });
  React.useEffect(() => {
    const onMove = (e) => {
      setM({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Toggle a global theme attribute on <body> so CSS can swap glass styles.
  React.useEffect(() => {
    document.body.setAttribute('data-theme', p.theme);
  }, [p.theme]);

  const hasCustom = !!customImage;

  return (
    <>
      <style>{__BG_STYLE}</style>
      <div className="bg-stage" style={{ background: p.base }}>
        {hasCustom && (
          <div
            className="bg-photo"
            style={{
              backgroundImage: `url(${customImage})`,
              filter: `blur(${imageBlur}px)`,
              transform: `scale(${1 + imageBlur / 200})`,
            }}
          />
        )}
        {p.terrain && !hasCustom && (
          <TerrainCanvas color={p.terrainColor} theme={p.theme} />
        )}
        {p.blobs.map((b, i) => {
          const dx = (m.x - 0.5) * (i % 2 === 0 ? 24 : -18);
          const dy = (m.y - 0.5) * (i % 2 === 0 ? 18 : -14);
          return (
            <div
              key={i}
              className="blob"
              style={{
                left: `calc(${b.x}% + ${dx}px)`,
                top: `calc(${b.y}% + ${dy}px)`,
                width: `${b.r}vmax`,
                height: `${b.r}vmax`,
                background: b.c,
                opacity: hasCustom ? b.op * 0.4 : b.op,
                transition: 'left 0.7s ease-out, top 0.7s ease-out, opacity 0.4s',
                mixBlendMode: hasCustom ? 'soft-light' : (b.blend || 'normal'),
              }}
            />
          );
        })}
      </div>
      <div
        className="bg-overlay"
        style={{
          background: hasCustom
            ? (p.theme === 'light' ? `rgba(240,240,238,${imageDim / 100})` : `rgba(5,6,7,${imageDim / 100})`)
            : p.overlay,
        }}
      />
      <Grain op={p.grainOp} theme={p.theme} />
      <div className="bg-vignette" style={{ background: p.vignette }} />
      {showHud && (
        <HudChrome
          color={p.hudColor}
          accent={p.hudAccent}
          dim={hasMessages}
          baseOpacity={p.hudOpacity}
        />
      )}
    </>
  );
}

function Grain({ op = 0.4, theme = 'dark' }) {
  return (
    <svg className="bg-grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
         style={{ opacity: op, mixBlendMode: theme === 'light' ? 'multiply' : 'overlay' }}>
      <filter id="grain-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values={theme === 'light'
          ? "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0"
          : "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0"} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-noise)" />
    </svg>
  );
}

// ── HUD chrome — light, minimal, two thin columns ─────────────────────
function HudChrome({ color, accent, dim = false, baseOpacity = 0.85 }) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  const date = now.toISOString().slice(0, 10);
  const session = String(Math.floor(performance.now() / 100) % 999999).padStart(6, '0');

  const opacity = (dim ? 0.5 : 1) * baseOpacity;

  return (
    <div
      className="hud"
      style={{ '--hud-fg': color, '--hud-acc': accent, opacity }}
    >
      <div className="col l">
        <div className="block">
          <div className="h">auto · note</div>
          <div className="l"><span className="lbl">ver</span><span className="val">0.1.4</span></div>
          <div className="l"><span className="lbl">node</span><span className="val">loc-7f</span></div>
          <div className="l"><span className="lbl">mode</span><span className="val">quiet</span></div>
        </div>
        <div className="block">
          <div className="h">listening</div>
          <div className="l"><span className="lbl">in</span><span className="val">subtitles</span></div>
          <div className="l"><span className="lbl">lang</span><span className="val">en · ru</span></div>
          <div className="l"><span className="lbl">stream</span><span className="val">idle</span></div>
        </div>
        <div className="block">
          <div className="h">engine</div>
          <div className="l"><span className="lbl">primary</span><span className="val">claude</span></div>
          <div className="l"><span className="lbl">local</span><span className="val">ollama</span></div>
          <div className="l"><span className="lbl">temp</span><span className="val">0.4</span></div>
        </div>
      </div>

      <div className="col r">
        <div className="block">
          <div className="h">{time}</div>
          <div className="l"><span className="val">{date}</span></div>
          <div className="l"><span className="lbl">tz</span><span className="val">+03:00</span></div>
          <div className="l"><span className="lbl">sess</span><span className="val">{session}</span></div>
        </div>
        <div className="block">
          <div className="h">output</div>
          <div className="l"><span className="lbl">format</span><span className="val">md · txt · json</span></div>
          <div className="l"><span className="lbl">dest</span><span className="val">memo</span></div>
        </div>
        <div className="block">
          <div className="h">system</div>
          <div className="l"><span className="lbl">cpu</span><span className="val">21%</span></div>
          <div className="l"><span className="lbl">mem</span><span className="val">412mb</span></div>
          <div className="l"><span className="lbl">build</span><span className="val">2026·05·17</span></div>
        </div>
      </div>

      <div className="corner bl">
        <div className="row"><span className="lbl">field</span><span className="val">subtitle stream</span></div>
        <div className="row"><span className="lbl">res</span><span className="val">∞</span></div>
      </div>
      <div className="corner br">
        <div className="row"><span className="val">53.9° N · 27.5° E</span></div>
        <div className="row"><span className="lbl">©</span><span className="val">a·n · 2026</span></div>
      </div>

      <div className="stamp">a · n</div>
    </div>
  );
}

window.Background = Background;
window.PALETTES = PALETTES;
