/**
 * Minimaler DOM-Helfer statt Framework: h('p', { class: 'muted' }, 'Text').
 * Texte werden immer als Textknoten eingefügt (kein innerHTML → kein XSS durch Nutzereingaben).
 */
type Child = Node | string | number | false | null | undefined | Child[];
type Props = Record<string, unknown> & {
  class?: string;
  style?: string;
  dataset?: Record<string, string>;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = String(value);
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (key in el && key !== 'style' && key !== 'list' && key !== 'form') {
        (el as unknown as Record<string, unknown>)[key] = value;
      } else {
        el.setAttribute(key, value === true ? '' : String(value));
      }
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Ersetzt den Inhalt eines Elements. */
export function replaceChildren(el: Element, ...children: Child[]): void {
  el.replaceChildren();
  append(el, children);
}

/** Inline-SVG-Icon aus einem Pfad (24×24, Linienstil). Pfade sind feste Konstanten im Code. */
export function icon(path: string, label?: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (label) svg.setAttribute('aria-label', label);
  else svg.setAttribute('aria-hidden', 'true');
  for (const d of path.split('|')) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
  }
  return svg;
}

export const ICONS = {
  today: 'M12 3v2|M12 19v2|M5 12H3|M21 12h-2|M6.3 6.3 4.9 4.9|M19.1 19.1l-1.4-1.4|M6.3 17.7l-1.4 1.4|M19.1 4.9l-1.4 1.4|M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  growth: 'M4 20h16|M6 16l4-5 4 3 5-7',
  ideas: 'M9 18h6|M10 21h4|M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8|M3 3v5h5|M12 7v5l3 3',
  more: 'M5 12h.01|M12 12h.01|M19 12h.01',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  check: 'M5 12l5 5L20 7',
  back: 'M15 18l-6-6 6-6',
  child: 'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z|M6 21v-2a6 6 0 0 1 12 0v2',
  home: 'M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5Z',
  themeLight: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M12 2.5v2|M12 19.5v2|M2.5 12h2|M19.5 12h2|M5.3 5.3l1.4 1.4|M17.3 17.3l1.4 1.4|M5.3 18.7l1.4-1.4|M17.3 6.7l1.4-1.4',
  themeDark: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
  themeSystem: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z|M12 3.5v17|M12 6.5h5|M12 10h7|M12 14h7|M12 17.5h5',
  arrow: 'M5 12h14|M13 6l6 6-6 6',
};
