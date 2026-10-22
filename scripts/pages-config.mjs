/**
 * Erzeugt .pages.yml für Pages CMS (https://pagescms.org) aus dem Content.
 * Auswahllisten für Bereiche, Kategorien, Material und Quellen kommen aus content/. Ändert sich eine dieser Dateien,
 * .pages.yml neu erzeugen. Verweise auf Ideen und Meilensteine lädt Pages CMS selbst (Feldtyp reference).
 *
 * Aufruf: npm run cms:config  (ein Test prüft, dass .pages.yml zum Content passt)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ID_PATTERN = '^[a-z0-9]+(-[a-z0-9]+)*$';

const read = (dir, p) => JSON.parse(readFileSync(join(dir, p), 'utf8'));
const byLabel = (a, b) => a.label.localeCompare(b.label, 'de');

// --- Feld-Bausteine ---
const text = (name, label, extra = {}) => ({ name, label, type: 'object', ...extra, fields: [{ name: 'de', label: 'Deutsch', type: extra.long ? 'text' : 'string', required: !!extra.required }] });
const longText = (name, label, extra = {}) => {
  const f = text(name, label, { ...extra, long: true });
  delete f.long;
  return f;
};
const textList = (name, label, extra = {}) => ({
  name,
  label,
  type: 'object',
  list: { collapsible: { collapsed: true, summary: '{fields.de}' }, ...(extra.min ? { min: extra.min } : {}) },
  ...(extra.description ? { description: extra.description } : {}),
  fields: [{ name: 'de', label: 'Deutsch', type: 'text', required: true }],
});
const select = (name, label, values, { multiple, ...extra } = {}) => ({ name, label, type: 'select', ...extra, options: { values, ...(multiple ? { multiple: true } : {}) } });
const months = (name, label, extra = {}) => ({ name, label, type: 'number', options: { min: 0, max: 84 }, ...extra });
const review = {
  name: 'review',
  label: 'Prüfstatus',
  type: 'object',
  required: true,
  fields: [
    select('status', 'Status', [
      { value: 'draft', label: 'Entwurf' },
      { value: 'needsCheck', label: 'Zu prüfen' },
      { value: 'reviewed', label: 'Geprüft' },
    ], { required: true, default: 'needsCheck' }),
    { name: 'note', label: 'Was ist noch zu prüfen?', type: 'text' },
    { name: 'reviewedBy', label: 'Geprüft von', type: 'string' },
    { name: 'reviewedOn', label: 'Geprüft am', type: 'date', options: { format: 'yyyy-MM-dd' } },
  ],
};
const idField = (example) => ({
  name: 'id',
  label: 'Kennung',
  type: 'string',
  required: true,
  pattern: { regex: ID_PATTERN, message: 'Nur Kleinbuchstaben, Ziffern und Bindestriche.' },
  description: `Kurz und eindeutig, z. B. ${example}. Wird auch der Dateiname, danach nicht mehr ändern.`,
});
const pedagogy = (kind) => [
  longText('background', 'Pädagogischer Hintergrund', {
    description: kind === 'activity' ? 'Was dabei entwicklungspsychologisch passiert, 2 bis 4 Sätze.' : 'Was in dieser Phase passiert, 2 bis 4 Sätze.',
  }),
  textList('observe', 'Worauf du achten kannst', { description: 'Beobachtungen im Alltag: Freude, Fortschritt, Überforderung.' }),
];
const view = { fields: ['title.de', 'id', 'review.status'], primary: 'title.de', sort: ['title.de', 'id'], default: { sort: 'title.de', order: 'asc' } };

/** Konfiguration als Objekt (für Tests). */
export function pagesConfig(contentDir) {
  const domains = read(contentDir, 'domains.json').map((d) => ({ value: d.id, label: d.name.de }));
  const categories = read(contentDir, 'categories.json').map((c) => ({ value: c.id, label: c.name.de }));
  const materials = read(contentDir, 'materials.json').map((m) => ({ value: m.id, label: m.name.de })).sort(byLabel);
  const references = read(contentDir, 'references.json').map((r) => ({ value: r.id, label: r.title })).sort(byLabel);
  const link = (name, label, collection) => ({
    name,
    label,
    type: 'reference',
    options: { collection, multiple: true, value: '{fields.id}', label: '{fields.title.de}' },
  });

  const referenceList = (extra = {}) => ({
    name: 'references',
    label: 'Quellen und Prinzipien',
    type: 'object',
    list: { collapsible: { collapsed: true, summary: '{fields.referenceId}' }, ...(extra.min ? { min: 1 } : {}) },
    description: 'Nur Quellen aus der Liste. Fehlt eine, bitte nicht erfinden, sondern im Prüfstatus notieren.',
    fields: [select('referenceId', 'Quelle', references, { required: true }), text('note', 'Bezug (optional)')],
  });

  const activity = [
    idField('a-seifenblasen'),
    text('title', 'Titel', { required: true }),
    longText('summary', 'Kurzbeschreibung', { required: true }),
    {
      name: 'ageRange',
      label: 'Alter in Monaten',
      type: 'object',
      required: true,
      description: 'Ab (inklusiv) bis unter (exklusiv). 1 Jahr = 12, 2 Jahre = 24, 3 = 36, 4 = 48, 5 = 60, 6 = 72, 7 = 84.',
      fields: [months('minMonths', 'Ab', { required: true }), months('maxMonths', 'Bis unter', { required: true })],
    },
    {
      name: 'domains',
      label: 'Entwicklungsbereiche',
      type: 'object',
      required: true,
      fields: [select('primary', 'Hauptbereich', domains, { required: true }), select('secondary', 'Nebenbereiche', domains, { multiple: true })],
    },
    select('category', 'Kategorie', categories, { required: true }),
    {
      name: 'durationMinutes',
      label: 'Dauer in Minuten',
      type: 'object',
      required: true,
      fields: [
        { name: 'min', label: 'Mindestens', type: 'number', required: true, options: { min: 1 } },
        { name: 'max', label: 'Höchstens', type: 'number', required: true, options: { min: 1 } },
      ],
    },
    select('location', 'Ort', [
      { value: 'indoor', label: 'Drinnen' },
      { value: 'outdoor', label: 'Draußen' },
      { value: 'both', label: 'Drinnen und draußen' },
    ], { required: true }),
    select('prepEffort', 'Vorbereitung', [
      { value: 'none', label: 'Keine' },
      { value: 'low', label: 'Wenig' },
      { value: 'medium', label: 'Mittel' },
      { value: 'high', label: 'Viel' },
    ], { required: true }),
    select('socialSettings', 'Mit wem?', [
      { value: 'oneOnOne', label: 'Zu zweit' },
      { value: 'siblings', label: 'Mit Geschwistern' },
      { value: 'group', label: 'In der Gruppe' },
    ], { required: true, multiple: true }),
    {
      name: 'materials',
      label: 'Material',
      type: 'object',
      list: { collapsible: { collapsed: true, summary: '{fields.materialId}' } },
      description: 'Fehlt ein Material in der Liste, im Prüfstatus notieren; es wird dann im Materialkatalog ergänzt.',
      fields: [select('materialId', 'Material', materials, { required: true }), { name: 'optional', label: 'Optional', type: 'boolean', default: false }, text('amount', 'Menge (optional)')],
    },
    textList('steps', 'So geht’s (Schritte)', { min: 1 }),
    {
      name: 'variations',
      label: 'Variationen',
      type: 'object',
      fields: [textList('easier', 'Leichter'), textList('harder', 'Schwieriger')],
    },
    textList('guidanceTips', 'Tipps zur Begleitung'),
    textList('learningOutcomes', 'Das lernt dein Kind dabei', { min: 1 }),
    longText('rationale', 'Warum fördert das die Entwicklung?', { required: true }),
    {
      name: 'safety',
      label: 'Sicherheit',
      type: 'object',
      list: { collapsible: { collapsed: true, summary: '{fields.kind}' } },
      description: 'Pflicht: Verschlucken bei Kleinteilen unter 3 Jahren, Wasser unter 4 Jahren. Unter 1 Jahr immer Aufsicht.',
      fields: [
        select('kind', 'Art', [
          { value: 'supervision', label: 'Aufsicht' },
          { value: 'choking', label: 'Verschlucken' },
          { value: 'water', label: 'Wasser' },
          { value: 'heat', label: 'Hitze' },
          { value: 'sharp', label: 'Scharf oder spitz' },
          { value: 'allergy', label: 'Allergie' },
          { value: 'cord', label: 'Schnüre' },
          { value: 'outdoor', label: 'Draußen' },
          { value: 'other', label: 'Sonstiges' },
        ], { required: true }),
        longText('text', 'Hinweis', { required: true }),
      ],
    },
    ...pedagogy('activity'),
    textList('everyday', 'Im Alltag weiterführen', { description: 'Wie die Idee ohne Aufwand in den Alltag passt.' }),
    referenceList({ min: 1 }),
    link('relatedMilestoneIds', 'Passende Entwicklungsschritte', 'milestones'),
    { name: 'tags', label: 'Suchbegriffe', type: 'string', list: true },
    review,
  ];

  const milestone = [
    idField('la-erste-woerter'),
    select('domain', 'Entwicklungsbereich', domains, { required: true }),
    text('title', 'Titel', { required: true }),
    longText('description', 'Beschreibung', { required: true }),
    {
      name: 'window',
      label: 'Zeitfenster in Monaten',
      type: 'object',
      required: true,
      description: 'Ab: erste Kinder zeigen es. Bis: die meisten Kinder zeigen es. 1 Jahr = 12, 2 = 24, 3 = 36, 4 = 48, 5 = 60, 6 = 72, 7 = 84.',
      fields: [months('fromMonths', 'Ab', { required: true }), months('toMonths', 'Bis', { required: true })],
    },
    months('consultHintFromMonths', 'Arzthinweis ab (Monate)', {
      description: 'Nur mit Quelle setzen und nie vor dem Ende des Zeitfensters. Leer lassen, wenn unsicher.',
    }),
    textList('supportTips', 'So kannst du unterstützen', { min: 1 }),
    longText('rationale', 'Warum das wichtig ist', { required: true }),
    ...pedagogy('milestone'),
    longText('variety', 'So unterschiedlich kann es aussehen', { description: 'Normale Vielfalt, damit nichts nach Prüfung klingt.' }),
    referenceList({ min: 1 }),
    link('relatedActivityIds', 'Passende Ideen', 'activities'),
    review,
  ];

  const config = {
    // Ohne „merge“: Pages CMS schreibt die Datei nur aus den Feldern unten. So wirkt auch das Leeren eines Feldes.
    // Darum muss jedes Feld aus content/ hier stehen (Test „Pages CMS“); nur `origin` fehlt bewusst (Standard builtin).
    settings: {
      commit: {
        templates: {
          create: 'Inhalt neu: {path}',
          update: 'Inhalt geändert: {path}',
          delete: 'Inhalt gelöscht: {path}',
          rename: 'Inhalt umbenannt: {oldPath} -> {newPath}',
        },
      },
    },
    content: [
      { name: 'activities', label: 'Ideen', type: 'collection', path: 'content/activities', format: 'json', filename: '{fields.id}.json', subfolders: false, view, fields: activity },
      { name: 'milestones', label: 'Entwicklungsschritte', type: 'collection', path: 'content/milestones', format: 'json', filename: '{fields.id}.json', subfolders: false, view, fields: milestone },
    ],
  };
  return config;
}

/** Inhalt von .pages.yml. */
export function buildPagesConfig(contentDir) {
  return (
    '# Pages CMS: Ideen und Entwicklungsschritte bearbeiten (https://app.pagescms.org).\n' +
    '# Erzeugt von scripts/pages-config.mjs, nicht von Hand ändern: npm run cms:config\n' +
    toYaml(pagesConfig(contentDir)) +
    '\n'
  );
}

/** Kleiner YAML-Schreiber: Strings immer in doppelten Anführungszeichen (gültiges YAML). */
function toYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  const scalar = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));
  const isScalar = (v) => v === null || typeof v !== 'object';
  const isInline = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string') && v.length <= 4;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (isScalar(item)) return `${pad}- ${scalar(item)}`;
        const body = toYaml(item, indent + 2);
        return `${pad}- ${body.slice(indent + 2)}`;
      })
      .join('\n');
  }
  return Object.entries(value)
    .map(([k, v]) => {
      if (isScalar(v)) return `${pad}${k}: ${scalar(v)}`;
      if (isInline(v)) return `${pad}${k}: [${v.map(scalar).join(', ')}]`;
      return `${pad}${k}:\n${toYaml(v, indent + 2)}`;
    })
    .join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  writeFileSync(join(root, '.pages.yml'), buildPagesConfig(join(root, 'content')));
  console.log('.pages.yml geschrieben');
}
