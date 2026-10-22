/**
 * Lädt den gesamten Content (wird beim Build eingebunden und vom Service Worker gecacht).
 * Aktivitäten und Meilensteine liegen je Eintrag in einer Datei; neue Dateien werden automatisch gefunden.
 */
import type { Activity, AgeBand, Category, Checkup, ContentBundle, Domain, Material, Milestone, Reference } from '../core/models/content';
import { normalizeActivity, normalizeMilestone } from '../core/normalize';
import ageBands from '../../content/age-bands.json';
import domains from '../../content/domains.json';
import categories from '../../content/categories.json';
import materials from '../../content/materials.json';
import references from '../../content/references.json';
import checkups from '../../content/checkups.json';

const milestoneFiles = import.meta.glob<Partial<Milestone>>('../../content/milestones/*.json', { eager: true, import: 'default' });
const activityFiles = import.meta.glob<Partial<Activity>>('../../content/activities/*.json', { eager: true, import: 'default' });

let cache: ContentBundle | undefined;

export function loadContent(): ContentBundle {
  cache ??= {
    ageBands: ageBands as AgeBand[],
    domains: domains as Domain[],
    categories: categories as Category[],
    materials: materials as Material[],
    references: references as Reference[],
    milestones: Object.values(milestoneFiles).map(normalizeMilestone),
    activities: Object.values(activityFiles).map(normalizeActivity),
    checkups: checkups as Checkup[],
  };
  return cache;
}
