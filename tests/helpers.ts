import type { Activity, Milestone } from '../src/core/models/content';
import type { ActivityLog } from '../src/core/models/user';

export function makeActivity(o: Partial<Activity> & { id: string }): Activity {
  return {
    origin: 'builtin',
    title: { de: o.id },
    summary: { de: '' },
    ageRange: { minMonths: 0, maxMonths: 72 },
    domains: { primary: 'cognition', secondary: [] },
    category: 'play',
    durationMinutes: { min: 5, max: 15 },
    location: 'indoor',
    prepEffort: 'none',
    socialSettings: ['oneOnOne'],
    materials: [],
    steps: [],
    variations: { easier: [], harder: [] },
    guidanceTips: [],
    learningOutcomes: [],
    rationale: { de: '' },
    safety: [],
    references: [{ referenceId: 'x' }],
    relatedMilestoneIds: [],
    review: { status: 'draft' },
    ...o,
  };
}

export function makeMilestone(o: Partial<Milestone> & { id: string }): Milestone {
  return {
    domain: 'grossMotor',
    title: { de: o.id },
    description: { de: '' },
    window: { fromMonths: 0, toMonths: 6 },
    supportTips: [],
    rationale: { de: '' },
    references: [{ referenceId: 'x' }],
    review: { status: 'draft' },
    ...o,
  };
}

export function makeLog(activityId: string, date: string, extra: Partial<ActivityLog> = {}): ActivityLog {
  return {
    id: `log-${activityId}-${date}`,
    childIds: ['c1'],
    activityRef: { source: 'builtin', id: activityId },
    date,
    photoIds: [],
    createdAt: `${date}T10:00:00.000Z`,
    ...extra,
  };
}
