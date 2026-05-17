// background.jsx — calm atmospheric backdrops tuned for glassmorphism.
// No HUD by default. No dithered terrain by default. Just deep gradients,
// large blurred light sources, and a touch of grain.

const PALETTES = {
  storm: {
    name: 'Storm',
    theme: 'dark',
    // Deep moody atmosphere — soft vertical gradient with a hint of cool blue
    base: 'radial-gradient(ellipse 120% 80% at 70% 10%, #2a2e35 0%, #14161b 45%, #07080a 100%)',
    blobs: [
      // A warm light bleed near the top right (the "lightning" suggestion)
      { c: '#f4e6c8', x: 78, y: 14, r: 60, op: 0.22, blend: 'screen', blur: 160 },
      // A cool body of cloud in the middle
      { c: '#5d6a78', x: 38, y: 55, r: 80, op: 0.32, blend: 'screen', blur: 180 },
      // A deep cold pocket bottom left
      { c: '#1a2330', x: 15, y: 85, r: 70, op: 0.6, blend: 'multiply', blur: 160 },
      // Faint highlight to give the glass something to refract
      { c: '#9aa6b4', x: 62, y: 35, r: 36, op: 0.16, blend: 'screen', blur: 120 },
    ],
    overlay: 'transparent',
    vignette: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)',
    grainOp: 0.32,
  },
  pearl: {
    name: 'Pearl',
    theme: 'light',
    base: 'radial-gradient(ellipse 120% 80% at 30% 20%, #f5f1e8 0%, #ede7da 50%, #d8cebc 100%)',
    blobs: [
      { c: '#ffffff', x: 28, y: 24, r: 70, op: 0.55, blend: 'normal', blur: 180 },
      { c: '#c8b89a', x: 80, y: 78, r: 70, op: 0.4, blend: 'multiply', blur: 180 },
      { c: '#a6967c', x: 60, y: 45, r: 30, op: 0.18, blend: 'multiply', blur: 120 },
    ],
    overlay: 'transparent',
    vignette: 'radial-gradient(ellipse at center, transparent 45%, rgba(80,60,40,0.1) 100%)',
    grainOp: 0.22,
  },
  silver: {
    name: 'Silver',
    theme: 'light',
    base: 'radial-gradient(ellipse 110% 80% at 60% 20%, #f4f3f1 0%, #e2e2e0 55%, #c8c8c6 100%)',
    blobs: [
      { c: '#ffffff', x: 30, y: 25, r: 70, op: 0.5, blend: 'normal', blur: 180 },
      { c: '#a8a8a6', x: 78, y: 78, r: 70, op: 0.32, blend: 'multiply', blur: 180 },
    ],
    overlay: 'transparent',
    vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.08) 100%)',
    grainOp: 0.2,
  },
  moss: {
    name: 'Moss',
    theme: 'dark',
    base: 'radial-gradient(ellipse 120% 80% at 60% 30%, #1f2a22 0%, #111914 50%, #070b08 100%)',
    blobs: [
      { c: '#3d5a3a', x: 22, y: 25, r: 70, op: 0.55, blend: 'screen', blur: 180 },
      { c: '#1a2a25', x: 78, y: 30, r: 70, op: 0.5, blend: 'screen', blur: 180 },
      { c: '#8aa86b', x: 50, y: 55, r: 40, op: 0.18, blend: 'screen', blur: 140 },
    ],
    overlay: 'rgba(13,20,16,0.18)',
    vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
    grainOp: 0.3,
  },
  ink: {
    name: 'Ink',
    theme: 'dark',
    base: 'radial-gradient(ellipse 120% 80% at 50% 20%, #1a1a1f 0%, #0c0c10 55%, #050507 100%)',
    blobs: [
      { c: '#2a2a35', x: 25, y: 28, r: 70, op: 0.55, blend: 'screen', blur: 180 },
      { c: '#1a1a25', x: 78, y: 75, r: 70, op: 0.5, blend: 'screen', blur: 180 },
      { c: '#c8c8d0', x: 60, y: 40, r: 22, op: 0.08, blend: 'screen', blur: 100 },
    ],
    overlay: 'rgba(8,8,10,0.18)',
    vignette: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)',
    grainOp: 0.32,
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
    will-change: transform;
    transform: translate(-50%, -50%);
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
`;

function Background({ palette = 'storm', hasMessages = false, customImage = null, imageBlur = 0, imageDim = 30 }) {
  const p = PALETTES[palette] || PALETTES.storm;
  const [m, setM] = React.useState({ x: 0.5, y: 0.5 });
  React.useEffect(() => {
    const onMove = (e) => {
      setM({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

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
                filter: `blur(${b.blur || 140}px)`,
                transition: 'left 1.2s cubic-bezier(.2,.7,.3,1), top 1.2s cubic-bezier(.2,.7,.3,1), opacity 0.4s',
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
    </>
  );
}

function Grain({ op = 0.3, theme = 'dark' }) {
  return (
    <svg className="bg-grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
         style={{ opacity: op, mixBlendMode: theme === 'light' ? 'multiply' : 'overlay' }}>
      <filter id="grain-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values={theme === 'light'
          ? "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.1 0"
          : "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0"} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-noise)" />
    </svg>
  );
}

window.Background = Background;
window.PALETTES = PALETTES;
