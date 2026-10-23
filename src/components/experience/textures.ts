import * as THREE from "three";

/**
 * Procedural canvas textures. Everything is drawn at runtime, so the scene ships
 * without image assets (no licensing or download cost). Created lazily, cached.
 */

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, opts: { repeat?: boolean; srgb?: boolean; aniso?: number } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = opts.aniso ?? 4;
  t.needsUpdate = true;
  return t;
}

function cached(key: string, make: () => THREE.Texture) {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number, seed: number, size = 2) {
  const r = rand(seed);
  for (let i = 0; i < (w * h) / (size * size * 3); i++) {
    const v = Math.floor(r() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    ctx.fillRect(r() * w, r() * h, size, size);
  }
}

/** Large warm floor tiles (lobby / workspace). One texture repeat = 2 m. */
export function tileTexture() {
  return cached("tile", () => {
    const { c, ctx } = canvas(256, 256);
    ctx.fillStyle = "#ead9c2";
    ctx.fillRect(0, 0, 256, 256);
    const r = rand(7);
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const v = 226 + Math.floor(r() * 16);
        ctx.fillStyle = `rgb(${v},${v - 18},${v - 44})`;
        ctx.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
      }
    noise(ctx, 256, 256, 0.05, 3);
    ctx.strokeStyle = "rgba(150,125,95,0.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    return finish(c, { repeat: true });
  });
}

/** Wooden planks. One repeat = 2 m. */
export function woodTexture(dark = false) {
  return cached(dark ? "woodDark" : "wood", () => {
    const { c, ctx } = canvas(256, 256);
    const base = dark ? [120, 82, 56] : [214, 172, 124];
    ctx.fillStyle = `rgb(${base.join(",")})`;
    ctx.fillRect(0, 0, 256, 256);
    const r = rand(dark ? 11 : 5);
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const y = (i * 256) / rows;
      let x = -r() * 200;
      while (x < 256) {
        const len = 110 + r() * 120;
        const k = 0.86 + r() * 0.22;
        ctx.fillStyle = `rgb(${base.map((v) => Math.min(255, Math.floor(v * k))).join(",")})`;
        ctx.fillRect(x, y + 1, len - 2, 256 / rows - 2);
        ctx.strokeStyle = `rgba(80,50,30,${0.06 + r() * 0.06})`;
        for (let g = 0; g < 3; g++) {
          ctx.beginPath();
          const gy = y + 4 + r() * (256 / rows - 8);
          ctx.moveTo(x, gy);
          ctx.bezierCurveTo(x + len * 0.3, gy + 2, x + len * 0.6, gy - 2, x + len, gy);
          ctx.stroke();
        }
        x += len;
      }
    }
    return finish(c, { repeat: true });
  });
}

/** Lawn with soft variation. One repeat = 8 m. */
export function grassTexture() {
  return cached("grass", () => {
    const { c, ctx } = canvas(256, 256);
    ctx.fillStyle = "#6fb84c";
    ctx.fillRect(0, 0, 256, 256);
    const r = rand(17);
    for (let i = 0; i < 1600; i++) {
      const g = 150 + Math.floor(r() * 60);
      ctx.fillStyle = `rgba(${70 + Math.floor(r() * 40)},${g},${50 + Math.floor(r() * 30)},0.35)`;
      ctx.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
    }
    return finish(c, { repeat: true });
  });
}

/** Paving slabs. One repeat = 3 m. */
export function pavingTexture(kind: "paving" | "plaza" | "poolDeck" = "paving") {
  return cached(`paving-${kind}`, () => {
    const { c, ctx } = canvas(256, 256);
    const base = kind === "plaza" ? "#e3ddd2" : kind === "poolDeck" ? "#e9e4da" : "#d2ccc0";
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    const r = rand(kind.length * 13);
    const n = kind === "plaza" ? 4 : 3;
    const s = 256 / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const off = y % 2 === 0 ? 0 : s / 2;
        const v = Math.floor(r() * 18) - 9;
        ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 100})`;
        ctx.fillRect(((x * s + off) % 256) + 1, y * s + 1, s - 2, s - 2);
      }
    noise(ctx, 256, 256, 0.06, 9);
    ctx.strokeStyle = "rgba(120,112,98,0.45)";
    ctx.lineWidth = 1.5;
    for (let y = 0; y <= n; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * s);
      ctx.lineTo(256, y * s);
      ctx.stroke();
      for (let x = 0; x <= n; x++) {
        const off = y % 2 === 0 ? 0 : s / 2;
        ctx.beginPath();
        ctx.moveTo((x * s + off) % 257, y * s);
        ctx.lineTo((x * s + off) % 257, (y + 1) * s);
        ctx.stroke();
      }
    }
    return finish(c, { repeat: true });
  });
}

export function asphaltTexture() {
  return cached("asphalt", () => {
    const { c, ctx } = canvas(128, 128);
    ctx.fillStyle = "#5d6168";
    ctx.fillRect(0, 0, 128, 128);
    noise(ctx, 128, 128, 0.12, 21, 1);
    return finish(c, { repeat: true });
  });
}

export function deckTexture() {
  return cached("deck", () => {
    const { c, ctx } = canvas(256, 256);
    ctx.fillStyle = "#b98858";
    ctx.fillRect(0, 0, 256, 256);
    const r = rand(31);
    for (let i = 0; i < 16; i++) {
      const k = 0.85 + r() * 0.25;
      ctx.fillStyle = `rgb(${Math.floor(185 * k)},${Math.floor(136 * k)},${Math.floor(88 * k)})`;
      ctx.fillRect(i * 16 + 1, 0, 14, 256);
    }
    return finish(c, { repeat: true });
  });
}

export function roofTexture() {
  return cached("roof", () => {
    const { c, ctx } = canvas(128, 128);
    ctx.fillStyle = "#8d949b";
    ctx.fillRect(0, 0, 128, 128);
    noise(ctx, 128, 128, 0.08, 41, 1);
    ctx.strokeStyle = "rgba(60,64,70,0.25)";
    ctx.strokeRect(0, 0, 128, 128);
    return finish(c, { repeat: true });
  });
}

export function carpetTexture(color = "#59636f") {
  return cached(`carpet-${color}`, () => {
    const { c, ctx } = canvas(64, 64);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
    noise(ctx, 64, 64, 0.12, 51, 1);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 64; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 64);
      ctx.stroke();
    }
    return finish(c, { repeat: true });
  });
}

/** Vertical wood slats for the reception feature wall. */
export function slatTexture() {
  return cached("slat", () => {
    const { c, ctx } = canvas(128, 128);
    ctx.fillStyle = "#6b3f22";
    ctx.fillRect(0, 0, 128, 128);
    const r = rand(61);
    for (let i = 0; i < 16; i++) {
      const k = 0.9 + r() * 0.2;
      ctx.fillStyle = `rgb(${Math.floor(176 * k)},${Math.floor(112 * k)},${Math.floor(64 * k)})`;
      ctx.fillRect(i * 8 + 1, 0, 6, 128);
    }
    return finish(c, { repeat: true });
  });
}

/** Animated-water normal map (tileable value noise). */
export function waterNormalTexture() {
  return cached("waterNormal", () => {
    const size = 128;
    const { c, ctx } = canvas(size, size);
    const h = new Float32Array(size * size);
    const r = rand(71);
    const grid = 8;
    const g: number[] = [];
    for (let i = 0; i < grid * grid; i++) g.push(r());
    const smooth = (t: number) => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let v = 0;
        for (const [oct, amp] of [
          [1, 1],
          [2, 0.5],
          [4, 0.25],
        ] as const) {
          const fx = ((x / size) * grid * oct) % grid;
          const fy = ((y / size) * grid * oct) % grid;
          const x0 = Math.floor(fx);
          const y0 = Math.floor(fy);
          const tx = smooth(fx - x0);
          const ty = smooth(fy - y0);
          const at = (gx: number, gy: number) => g[((gy % grid) * grid + (gx % grid)) % g.length];
          const a = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
          const b2 = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
          v += (a * (1 - ty) + b2 * ty) * amp;
        }
        h[y * size + x] = v;
      }
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const l = h[y * size + ((x - 1 + size) % size)];
        const rr = h[y * size + ((x + 1) % size)];
        const u = h[((y - 1 + size) % size) * size + x];
        const d = h[((y + 1) % size) * size + x];
        const nx = (l - rr) * 2.2;
        const ny = (u - d) * 2.2;
        const nz = 1;
        const len = Math.hypot(nx, ny, nz);
        const i = (y * size + x) * 4;
        img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    return finish(c, { repeat: true, srgb: false });
  });
}

/* ---------------------------------------------------------------------------------------------
 * Screens and signage
 * ------------------------------------------------------------------------------------------- */

const FONT = '"Inter Variable", "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Text sign on a transparent background (white letters for dark fascia bands). */
export function signTexture(text: string, variant = 0) {
  return cached(`sign-${text}-${variant}`, () => {
    const w = 1024;
    const h = 128;
    const { c, ctx } = canvas(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = variant === 2 ? "#f4f1ea" : "#ffffff";
    let size = 96;
    ctx.font = `700 ${size}px ${FONT}`;
    while (ctx.measureText(text).width > w * 0.94 && size > 20) {
      size -= 4;
      ctx.font = `700 ${size}px ${FONT}`;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (variant === 1) {
      ctx.fillStyle = "#13224a";
      roundRect(ctx, 8, 8, w - 16, h - 16, 24);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      size = Math.min(size, 72);
      ctx.font = `700 ${size}px ${FONT}`;
    }
    ctx.fillText(text, w / 2, h / 2 + 4);
    return finish(c);
  });
}

/** Logo mark: three ascending bars (matches the HTML logo). */
function drawLogoMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = "#ffffff") {
  ctx.fillStyle = color;
  const bw = s * 0.24;
  const gap = s * 0.1;
  const hs = [0.55, 0.8, 1];
  hs.forEach((hh, i) => {
    roundRect(ctx, x + i * (bw + gap), y + s * (1 - hh), bw, s * hh, bw * 0.25);
    ctx.fill();
  });
}

export function logoWallTexture(name: string) {
  return cached(`logoWall-${name}`, () => {
    const { c, ctx } = canvas(1024, 384);
    ctx.clearRect(0, 0, 1024, 384);
    drawLogoMark(ctx, 120, 92, 200, "#ffffff");
    ctx.fillStyle = "#ffffff";
    const words = name.toUpperCase().split(/\s+/);
    const lines = words.length > 1 ? [words[0], words.slice(1).join(" ")] : [words[0] ?? ""];
    let size = 120;
    ctx.font = `800 ${size}px ${FONT}`;
    while (lines.some((l) => ctx.measureText(l).width > 600) && size > 40) {
      size -= 6;
      ctx.font = `800 ${size}px ${FONT}`;
    }
    ctx.textBaseline = "alphabetic";
    if (lines.length === 2) {
      ctx.fillText(lines[0], 380, 182);
      ctx.fillText(lines[1], 380, 300);
    } else ctx.fillText(lines[0], 380, 236);
    return finish(c);
  });
}

export interface DirectoryLine {
  heading: string;
  items: string[];
  color?: string;
}

/** Building directory board listing floors and rooms (from the office layout). */
export function directoryTexture(title: string, columns: DirectoryLine[]) {
  return cached(`directory-${title}-${columns.map((c) => c.heading + c.items.join()).join("|")}`, () => {
    const w = 1024;
    const h = 756;
    const { c, ctx } = canvas(w, h);
    ctx.fillStyle = "#0f1c3a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText(title, 48, 84);
    ctx.fillStyle = "#8fb2ff";
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText("Building directory — click for the staff directory", 48, 128);
    const colW = (w - 96) / 2;
    const rowH = 196;
    columns.slice(0, 6).forEach((col, i) => {
      const x = 48 + (i % 2) * colW;
      const y = 200 + Math.floor(i / 2) * rowH;
      ctx.fillStyle = col.color ?? "#5b8cff";
      ctx.fillRect(x, y - 30, 10, 38);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 32px ${FONT}`;
      ctx.fillText(col.heading, x + 24, y);
      ctx.fillStyle = "#c7d4f5";
      ctx.font = `500 25px ${FONT}`;
      col.items.slice(0, 4).forEach((item, j) => ctx.fillText(item, x + 24, y + 40 + j * 34));
    });
    return finish(c);
  });
}

const CHART_COLORS = ["#4f8cff", "#36c28f", "#ffb547", "#ff6b8b", "#9b7bff"];

export function screenTexture(kind: "monitor" | "tv" | "chart" | "kiosk" | "project" | "timeline" | "moodboard" | "whiteboard" | "poster" | "art", variant = 0, text = "") {
  return cached(`screen-${kind}-${variant}-${text}`, () => {
    const wide = kind === "timeline" ? [2048, 448] : kind === "kiosk" ? [256, 384] : kind === "moodboard" ? [1024, 320] : [512, 300];
    const [w, h] = wide;
    const { c, ctx } = canvas(w, h);
    const r = rand(variant * 97 + kind.length * 7 + 1);

    if (kind === "monitor") {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1b2d55");
      g.addColorStop(1, "#14203b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length] + "aa";
        ctx.fillRect(24 + r() * 40, 24 + i * 18, 80 + r() * 300, 7);
      }
      ctx.fillStyle = "#ffffff22";
      ctx.fillRect(w - 170, 30, 140, h - 60);
      return finish(c);
    }

    if (kind === "art") {
      const palettes = [
        ["#f4efe6", "#e07a5f", "#3d405b", "#81b29a", "#f2cc8f"],
        ["#f1ebe1", "#264653", "#2a9d8f", "#e9c46a", "#e76f51"],
      ];
      const pal = palettes[variant % palettes.length];
      ctx.fillStyle = pal[0];
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = pal[1 + (i % 4)];
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        if (i % 2 === 0) ctx.arc(80 + r() * (w - 160), 60 + r() * (h - 120), 30 + r() * 70, 0, Math.PI * 2);
        else ctx.rect(40 + r() * (w - 200), 30 + r() * (h - 140), 60 + r() * 140, 40 + r() * 90);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return finish(c);
    }

    if (kind === "whiteboard") {
      ctx.fillStyle = "#fbfbf9";
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = CHART_COLORS[i % 5];
        ctx.beginPath();
        const x = 40 + r() * 380;
        const y = 40 + r() * 200;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 40, y - 30, x + 80, y + 30, x + 120 + r() * 60, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "#2b3442";
      ctx.strokeRect(300, 60, 160, 110);
      return finish(c);
    }

    if (kind === "moodboard") {
      ctx.fillStyle = "#efe9df";
      ctx.fillRect(0, 0, w, h);
      const palette = ["#e07a5f", "#3d405b", "#81b29a", "#f2cc8f", "#4f8cff", "#c45c4a", "#2f5b4c", "#ffd6a5"];
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = palette[i % palette.length];
        const pw = 80 + r() * 90;
        const ph = 60 + r() * 80;
        ctx.save();
        ctx.translate(30 + (i % 9) * 110 + r() * 10, 30 + Math.floor(i / 9) * 140 + r() * 10);
        ctx.rotate((r() - 0.5) * 0.12);
        ctx.fillRect(0, 0, pw, ph);
        ctx.restore();
      }
      return finish(c);
    }

    if (kind === "timeline") {
      ctx.fillStyle = "#13224a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 64px ${FONT}`;
      ctx.fillText("Our Story", 60, 100);
      ctx.fillStyle = "#9fb7ff";
      ctx.font = `500 30px ${FONT}`;
      ctx.fillText("From a three-person studio to 120+ people", 60, 150);
      const years = ["2012", "2015", "2017", "2019", "2021", "2023", "2026"];
      const labels = ["Founded", "First 10 clients", "Design studio", "100 products", "Harbour Campus", "Global team", "300+ launches"];
      ctx.strokeStyle = "#4f8cff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(80, 290);
      ctx.lineTo(w - 80, 290);
      ctx.stroke();
      years.forEach((y, i) => {
        const x = 120 + (i * (w - 240)) / (years.length - 1);
        ctx.fillStyle = CHART_COLORS[i % 5];
        ctx.beginPath();
        ctx.arc(x, 290, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 40px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(y, x, 250);
        ctx.font = `500 28px ${FONT}`;
        ctx.fillStyle = "#c7d4f5";
        ctx.fillText(labels[i], x, 350);
        ctx.textAlign = "left";
      });
      return finish(c);
    }

    if (kind === "poster") {
      ctx.fillStyle = "#f6f4ef";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#13224a";
      ctx.font = `800 34px ${FONT}`;
      ctx.fillText(text || "Our clients", 30, 60);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = "#c9cfdb";
        roundRect(ctx, 30 + (i % 4) * 118, 100 + Math.floor(i / 4) * 90, 100, 60, 10);
        ctx.fill();
      }
      return finish(c);
    }

    if (kind === "project") {
      const themes = [
        ["#1d4fd8", "#5b8cff", "Atlas", "Mobile Banking"],
        ["#0f766e", "#34d399", "Orbit", "Logistics Platform"],
        ["#b45309", "#fbbf24", "Terra", "Energy Insights"],
      ];
      const [a, b2, name, sub] = themes[variant % themes.length];
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, a);
      g.addColorStop(1, b2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffffee";
      ctx.font = `800 54px ${FONT}`;
      ctx.fillText(name, 30, 80);
      ctx.font = `500 28px ${FONT}`;
      ctx.fillText(sub, 32, 120);
      ctx.fillStyle = "#ffffff33";
      roundRect(ctx, 300, 40, 170, 230, 22);
      ctx.fill();
      ctx.fillStyle = "#ffffffcc";
      roundRect(ctx, 316, 70, 138, 40, 8);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = "#ffffff66";
        roundRect(ctx, 316, 126 + i * 34, 138, 22, 6);
        ctx.fill();
      }
      ctx.fillStyle = "#ffffff99";
      ctx.font = `600 22px ${FONT}`;
      ctx.fillText("Case study →", 32, 250);
      return finish(c);
    }

    if (kind === "kiosk") {
      ctx.fillStyle = "#0f1c3a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 30px ${FONT}`;
      ctx.fillText("Services", 22, 52);
      ["Strategy", "Design", "Engineering", "Growth"].forEach((s, i) => {
        ctx.fillStyle = CHART_COLORS[i];
        roundRect(ctx, 22, 80 + i * 66, 212, 52, 10);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 22px ${FONT}`;
        ctx.fillText(s, 36, 113 + i * 66);
      });
      return finish(c);
    }

    // tv / chart dashboards
    ctx.fillStyle = "#0f1c3a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 26px ${FONT}`;
    const titles = ["Quarterly growth", "Pipeline", "Campaign results", "Customer health"];
    ctx.fillText(kind === "tv" ? "Sprint 42 · Demo day" : titles[variant % titles.length], 24, 40);
    if (variant % 2 === 0 || kind === "tv") {
      for (let i = 0; i < 8; i++) {
        const bh = 40 + r() * 170;
        ctx.fillStyle = CHART_COLORS[i % 5];
        ctx.fillRect(34 + i * 56, h - 30 - bh, 34, bh);
      }
    } else {
      ctx.strokeStyle = "#36c28f";
      ctx.lineWidth = 6;
      ctx.beginPath();
      let y = h - 60;
      ctx.moveTo(30, y);
      for (let x = 30; x < w - 30; x += 40) {
        y = Math.max(70, y - r() * 40 + 10);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = "#4f8cff";
      ctx.beginPath();
      y = h - 40;
      ctx.moveTo(30, y);
      for (let x = 30; x < w - 30; x += 40) {
        y = Math.max(90, y - r() * 30 + 8);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return finish(c);
  });
}

export function disposeTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
