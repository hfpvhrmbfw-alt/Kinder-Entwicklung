/**
 * Lädt den gesamten Content (wird beim Build eingebunden und vom Service Worker gecacht).
 * Aktivitäten und Meilensteine liegen in mehreren Dateien; neue Dateien werden automatisch gefunden.
 */
import type { Activity, AgeBand, Category, ContentBundle, Domain, Material, Milestone, Reference } from '../core/models/content';
import ageBands from '../../content/age-bands.json';
import domains from '../../content/domains.json';
import categories from '../../content/categories.json';
import materials from '../../content/materials.json';
import references from '../../content/references.json';

const milestoneFiles = import.meta.glob<Milestone[]>('../../content/milestones/*.json', { eager: true, import: 'default' });
const activityFiles = import.meta.glob<Activity[]>('../../content/activities/*.json', { eager: true, import: 'default' });

let cache: ContentBundle | undefined;

export function loadContent(): ContentBundle {
  cache ??= {
    ageBands: ageBands as AgeBand[],
    domains: domains as Domain[],
    categories: categories as Category[],
    materials: materials as Material[],
    references: references as Reference[],
    milestones: Object.values(milestoneFiles).flat(),
    activities: Object.values(activityFiles).flat(),
  };
  return cache;
}
