/**
 * Illustrationen als Inline-SVG (Stil „Beet“ wie im Zyklus-Tracker).
 * Nur feste Konstanten aus dem Code, nie Nutzereingaben – daher ist das Parsen per Template unkritisch.
 * Farben, die sich mit Hell/Dunkel ändern, kommen aus CSS-Variablen (--color-sparkle).
 */
import type { Enjoyment } from '../core/models/user';

const svg = (vb: string, body: string, cls = '') => `<svg viewBox="${vb}" class="${cls}" aria-hidden="true" focusable="false">${body}</svg>`;

/** Wandelt eine SVG-Konstante in ein Element. */
export function art(markup: string): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as SVGSVGElement;
}

// ---------- Kleine Bausteine ----------
const face = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#5B3A1A" stroke-width="1.3" stroke-linecap="round">` +
  `<path d="M-3.5 -1.2 q1 -1 2 0M1.5 -1.2 q1 -1 2 0"/><path d="M-2 1.8 q2 1.8 4 0"/></g>`;
const sleepFace = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#5B3A1A" stroke-width="1.3" stroke-linecap="round">` +
  `<path d="M-3.5 -1.4 q1 1 2 0M1.5 -1.4 q1 1 2 0"/><path d="M-1.5 2 q1.5 1.2 3 0"/></g>`;
const rays = (cx: number, cy: number, r1: number, r2: number, n = 8) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `<line x1="${(cx + c * r1).toFixed(1)}" y1="${(cy + s * r1).toFixed(1)}" x2="${(cx + c * r2).toFixed(1)}" y2="${(cy + s * r2).toFixed(1)}"/>`;
  }).join('');
const sun = (cx: number, cy: number, r: number) =>
  `<g stroke="#F2A93B" stroke-width="2" stroke-linecap="round">${rays(cx, cy, r + 3, r + 7)}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="#F7C548"/>`;
const cloudPath = 'M9 30 q-7 0 -7 -6.5 q0 -6 6.5 -6.5 q1.5 -8 10 -8 q6 0 9 5 q2 -1.5 4.5 -1.5 q7 0 7.5 7 q5 1 5 5.5 q0 5 -6 5 Z';
const cloud = (dx: number, dy: number, s: number, fill = '#EEF1F4') =>
  `<path transform="translate(${dx} ${dy}) scale(${s})" d="${cloudPath}" fill="${fill}" stroke="#9AA4AF" stroke-width="${(1.4 / s).toFixed(2)}" stroke-linejoin="round"/>`;
const sparkles = (pts: [number, number, number, string?][]) =>
  pts.map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c ?? 'var(--color-sparkle)'}"/>`).join('');
const star = (x: number, y: number, r: number, fill = '#F7C548') => {
  const p = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${p}" fill="${fill}"/>`;
};
const leaf = (x: number, y: number, rot: number, len: number, fill: string) =>
  `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${len / 26})" d="M0 0 C6 -8 20 -8 26 0 C20 8 6 8 0 0Z" fill="${fill}"/>`;
const heart = (x: number, y: number, s: number, fill = '#E0614A') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6 C-8 0 -10 -6 -5 -8 C-2 -9 0 -6 0 -5 C0 -6 2 -9 5 -8 C10 -6 8 0 0 6Z" fill="${fill}"/>`;

// ---------- Zweige oben in den Ecken ----------
const sprigBody =
  '<path d="M-6 -6 C24 14 52 40 78 100" stroke="#2F6F5E" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
  leaf(8, 5, -12, 26, '#86B98A') + leaf(16, 10, 98, 25, '#5E9C6C') + leaf(28, 20, -6, 27, '#5E9C6C') + leaf(36, 28, 110, 26, '#86B98A') +
  leaf(46, 40, 4, 25, '#86B98A') + leaf(54, 52, 118, 23, '#5E9C6C') + leaf(62, 64, 14, 21, '#5E9C6C') + leaf(68, 76, 124, 18, '#86B98A') +
  sparkles([[92, 30, 1.8], [104, 54, 1.4, '#F47A4B'], [30, 62, 1.6], [96, 86, 1.2], [80, 12, 1.2, '#F47A4B']]);
export const SPRIG = svg('0 0 120 110', sprigBody, 'sprig');

// ---------- Szenen für die Kinderkarte (je Entwicklungsabschnitt) ----------
export type Stage = 'newborn' | 'baby' | 'toddler' | 'preschool' | 'school' | 'none';

/** Abschnitt aus dem Alter in Monaten: 0–3, 3–12, 12–36, 36–72, ab 72. */
export function stageFor(months: number | undefined): Stage {
  if (months === undefined) return 'none';
  if (months < 3) return 'newborn';
  if (months < 12) return 'baby';
  if (months < 36) return 'toddler';
  if (months < 72) return 'preschool';
  return 'school';
}

const blob = (fill: string) =>
  `<path d="M22 38 C12 14 50 4 80 14 C112 0 156 14 150 50 C160 86 122 112 82 102 C42 116 6 96 14 70 C17 58 26 50 22 38Z" fill="${fill}"/>`;
const SCENES: Record<Stage, string> = {
  // Neugeboren: Mond und Sterne, viel Schlaf
  newborn:
    blob('#1F2A5C') +
    '<path d="M98 26 a20 20 0 1 0 16 34 a16 16 0 1 1 -16 -34z" fill="#F4D77C"/>' + sleepFace(88, 48, 1.2) +
    star(40, 34, 6) + star(62, 70, 4.5) + star(128, 78, 5) + star(52, 50, 2.5, '#FFFFFF') +
    sparkles([[30, 62, 1.6, '#fff'], [74, 28, 1.4, '#fff'], [140, 40, 1.6, '#fff'], [110, 92, 1.4, '#fff'], [88, 84, 1.2, '#F47A4B']]),
  // Baby: die Welt wird hell, Sonne mit Gesicht
  baby:
    blob('#F8D9A0') + sun(80, 58, 24) + face(80, 59, 1.9) + star(36, 40, 5, '#F47A4B') + star(130, 84, 4, '#F47A4B') +
    sparkles([[124, 30, 2, '#fff'], [40, 84, 1.8, '#fff'], [140, 52, 1.4, '#fff'], [28, 62, 1.4, '#F47A4B']]),
  // Kleinkind: Pflänzchen im Topf, wächst kräftig
  toddler:
    blob('#BFD8C2') +
    '<path d="M66 82 h28 l-4 22 h-20 z" fill="#E07A52"/><rect x="62" y="76" width="36" height="8" rx="3" fill="#C9653F"/>' +
    '<path d="M80 76 C80 60 80 48 80 36" stroke="#3F7D58" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    leaf(80, 52, -150, 30, '#5E9C6C') + leaf(80, 44, -35, 30, '#7DB487') + leaf(80, 64, -20, 22, '#5E9C6C') + leaf(80, 36, -100, 18, '#7DB487') +
    sparkles([[40, 40, 2, '#fff'], [122, 36, 1.8, '#F47A4B'], [130, 70, 1.6, '#fff'], [34, 74, 1.4, '#F47A4B'], [110, 92, 1.4, '#fff']]),
  // Vorschulalter: Blume blüht
  preschool:
    blob('#F3C4BC') +
    '<path d="M80 104 V58" stroke="#3F7D58" stroke-width="3" stroke-linecap="round"/>' + leaf(80, 92, -150, 26, '#5E9C6C') + leaf(80, 84, -30, 26, '#7DB487') +
    [0, 72, 144, 216, 288].map((a) => `<ellipse cx="80" cy="30" rx="10" ry="15" fill="#F4A3A0" transform="rotate(${a} 80 46)"/>`).join('') +
    '<circle cx="80" cy="46" r="11" fill="#F7C548"/>' + face(80, 46, 1.1) +
    sparkles([[36, 40, 2, '#fff'], [128, 34, 1.8, '#F47A4B'], [134, 76, 1.6, '#fff'], [34, 80, 1.4, '#F47A4B']]),
  // Schulstart: junges Bäumchen mit ersten Früchten
  school:
    blob('#C9DCEB') +
    '<path d="M80 104 V62" stroke="#8A5A3B" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="80" cy="46" r="26" fill="#7DB487"/><circle cx="64" cy="54" r="14" fill="#5E9C6C"/><circle cx="97" cy="52" r="15" fill="#5E9C6C"/>' +
    '<circle cx="70" cy="40" r="4" fill="#E0614A"/><circle cx="92" cy="36" r="4" fill="#E0614A"/><circle cx="86" cy="58" r="4" fill="#E0614A"/>' +
    sparkles([[36, 36, 2, '#fff'], [130, 30, 1.8, '#F47A4B'], [134, 80, 1.6, '#fff'], [34, 84, 1.4, '#F47A4B']]),
  none:
    blob('#D9CBB3') +
    '<path d="M80 102 C80 80 76 60 70 40" stroke="#3F7D58" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    leaf(76, 76, -160, 30, '#5E9C6C') + leaf(78, 66, -20, 28, '#7DB487') + leaf(72, 50, -150, 24, '#7DB487') + leaf(72, 44, -60, 20, '#5E9C6C') +
    sparkles([[44, 40, 2, '#fff'], [120, 40, 1.8, '#F47A4B'], [128, 76, 1.6, '#fff'], [40, 80, 1.4, '#F47A4B']]),
};
export const scene = (stage: Stage) => svg('0 0 164 120', SCENES[stage], 'scene');

// ---------- Kleine Bilder für die Ausblick-Kacheln ----------
export const CARD_ART = {
  leaf: svg('0 0 60 60', '<path d="M10 52 C20 40 32 30 50 10" stroke="#3F7D58" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    leaf(18, 43, -100, 18, '#5E9C6C') + leaf(24, 37, 10, 18, '#7DB487') + leaf(32, 29, -110, 18, '#7DB487') + leaf(38, 23, 0, 18, '#5E9C6C') + leaf(46, 15, -90, 14, '#5E9C6C') +
    sparkles([[50, 44, 1.6], [10, 20, 1.4, '#F47A4B'], [30, 52, 1.2]])),
  flower: svg('0 0 60 60', '<path d="M30 58 V34" stroke="#3F7D58" stroke-width="2.5" stroke-linecap="round"/>' + leaf(30, 50, -150, 16, '#5E9C6C') + leaf(30, 46, -30, 16, '#7DB487') +
    [0, 72, 144, 216, 288].map((a) => `<ellipse cx="30" cy="16" rx="6" ry="9" fill="#F4A3A0" transform="rotate(${a} 30 26)"/>`).join('') +
    '<circle cx="30" cy="26" r="6" fill="#F7C548"/>' + sparkles([[8, 12, 1.6], [52, 40, 1.4, '#F47A4B'], [50, 8, 1.2]])),
  sun: svg('0 0 60 60', sun(30, 30, 12) + face(30, 30.5, 1.1) + sparkles([[8, 10, 1.6], [52, 50, 1.4, '#F47A4B'], [52, 10, 1.2]])),
  heart: svg('0 0 60 60', heart(30, 32, 2.6) + '<path d="M20 26 q0 -5 4 -6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>' +
    sparkles([[10, 14, 1.6], [50, 12, 1.4, '#F47A4B'], [52, 46, 1.2]])),
  moon: svg('0 0 60 60', '<path d="M34 10 a20 20 0 1 0 16 32 a16 16 0 1 1 -16 -32z" fill="#F4D77C"/>' + star(14, 14, 4) + star(50, 12, 3) +
    sparkles([[10, 44, 1.4], [48, 52, 1.6, '#F47A4B']])),
};

// ---------- Spielwoche: Bild je Tag nach „Wie hat es gefallen?“ ----------
export const DAY_ICON: Record<Enjoyment | 'done', string> = {
  high: svg('0 0 40 40', sun(20, 20, 9) + face(20, 20.5)),
  medium: svg('0 0 40 40', sun(15, 15, 7) + cloud(6, 9, 0.62) + face(19.5, 26, 0.85)),
  low: svg('0 0 40 40', cloud(1, 6, 0.85) + face(19.5, 25, 0.9)),
  // gespielt, ohne Bewertung
  done: svg('0 0 40 40', heart(20, 20, 2) + sparkles([[8, 10, 1.2], [33, 9, 1.2, '#F47A4B']])),
};
export const EMPTY_DAY = svg('0 0 40 40', '<circle cx="20" cy="20" r="8" fill="none" stroke="var(--color-border)" stroke-width="1.5" stroke-dasharray="2.5 3"/>');
