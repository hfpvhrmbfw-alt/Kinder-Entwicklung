/** Übersicht für den Kinderarzttermin: zum Drucken, als PDF oder zum Zeigen auf dem Handy. */
import { checkupStatuses, lastDoneCheckup, nextCheckup } from '../../core/checkups';
import { doctorOverview, DOCTOR_DEFAULT_MONTHS } from '../../core/doctor';
import type { Milestone } from '../../core/models/content';
import { localize } from '../../core/text';
import { getLocale, t } from '../../i18n';
import type { AppContext } from '../app';
import { emptyState, nextId, pageTitle } from '../components/common';
import { formatChildAge, formatDate, formatDateRange, formatWindow } from '../format';
import { h, icon, ICONS } from '../lib/h';

export async function doctorScreen(ctx: AppContext): Promise<HTMLElement> {
  const child = ctx.activeChild;
  if (!child) return h('section', null, pageTitle(t('doctor.title'), '#/entwicklung'), emptyState(t('today.noChild'), h('a', { class: 'btn btn--primary', href: '#/kinder/neu' }, t('today.addChild'))));
  const loc = getLocale();
  const age = ctx.ageOf(child);
  const [records, checkupRecords, questions] = await Promise.all([
    ctx.repo.listMilestoneRecords(child.id),
    ctx.repo.listCheckupRecords(child.id),
    ctx.repo.getDoctorQuestions(child.id),
  ]);
  const statuses = checkupStatuses(ctx.content.checkups, child.birthDate, ctx.today, checkupRecords);
  const last = lastDoneCheckup(statuses);
  const next = nextCheckup(statuses);
  const overview = doctorOverview({ milestones: ctx.content.milestones, records, ageMonths: age.effectiveMonths, today: ctx.today, since: last?.record?.doneOn });

  const qId = nextId('q');
  const textarea = h('textarea', { id: qId, class: 'no-print', value: questions, placeholder: t('doctor.questionsPlaceholder'), maxLength: 4000 });
  // Gedruckt wird der Text als Absatz, weil Textfelder beim Drucken abgeschnitten werden.
  const printed = h('p', { class: 'print-only doctor__questions' }, questions);
  let timer: number | undefined;
  textarea.addEventListener('input', () => {
    printed.textContent = textarea.value;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void ctx.repo.saveDoctorQuestions(child.id, textarea.value), 400);
  });

  const fact = (label: string, value: string) => h('div', null, h('dt', null, label), h('dd', null, value));
  const milestoneItem = (m: Milestone, extra?: string) =>
    h('li', null, localize(m.title, loc), h('span', { class: 'muted' }, ` (${extra ?? t('development.window', { range: formatWindow(m.window.fromMonths, m.window.toMonths) })})`));

  return h(
    'article',
    { class: 'doctor' },
    h('div', { class: 'no-print' }, pageTitle(t('doctor.title'), '#/entwicklung'), h('p', { class: 'muted small' }, t('doctor.intro'))),
    h(
      'div',
      { class: 'no-print', style: 'margin-bottom: var(--space-5)' },
      h('button', { class: 'btn btn--primary btn--block', onclick: () => window.print() }, icon(ICONS.print), t('doctor.print')),
      h('p', { class: 'muted small', style: 'margin: var(--space-2) 0 0; text-align: center' }, t('doctor.printHint')),
    ),

    h(
      'div',
      { class: 'card doctor__sheet' },
      h('h2', { class: 'doctor__name' }, child.name),
      h(
        'dl',
        { class: 'doctor__facts' },
        fact(t('doctor.age'), formatChildAge(age)),
        fact(t('children.birthDate'), formatDate(child.birthDate)),
        child.dueDate && fact(t('children.dueDate'), formatDate(child.dueDate)),
        last && fact(t('doctor.lastCheckup'), `${last.checkup.name}, ${formatDate(last.record!.doneOn!)}`),
        next && fact(t('doctor.nextCheckup'), `${next.checkup.name}, ${formatDateRange(next.window.start, next.window.end)}`),
      ),

      h(
        'h3',
        { class: 'doctor__since' },
        last?.record?.doneOn ? t('doctor.sinceCheckup', { name: last.checkup.name, date: formatDate(last.record.doneOn) }) : t('doctor.sinceMonths', { n: DOCTOR_DEFAULT_MONTHS }),
      ),
      overview.domains.length === 0 && h('p', { class: 'muted small' }, t('doctor.nothing')),
      overview.domains.map((d) =>
        h(
          'section',
          { class: 'doctor__domain' },
          h('h4', null, t(`domain.${d.domain}`)),
          d.achieved.length > 0 &&
            h('div', null, h('p', { class: 'doctor__label' }, t('doctor.achieved')), h('ul', null, d.achieved.map((a) => milestoneItem(a.milestone, formatDate(a.date))))),
          d.inWindow.length > 0 && h('div', null, h('p', { class: 'doctor__label' }, t('doctor.inWindow')), h('ul', null, d.inWindow.map((m) => milestoneItem(m)))),
          d.consult.length > 0 &&
            h('div', { class: 'doctor__consult' }, h('p', { class: 'doctor__label' }, t('doctor.consult')), h('ul', null, d.consult.map((m) => milestoneItem(m)))),
        ),
      ),
      overview.domains.some((d) => d.consult.length) && h('p', { class: 'muted small' }, t('doctor.consultIntro')),
      overview.undated.length > 0 &&
        h('section', { class: 'doctor__domain' }, h('h4', null, t('doctor.undated')), h('p', { class: 'small' }, overview.undated.map((m) => localize(m.title, loc)).join(', '))),

      h(
        'section',
        { class: 'doctor__domain' },
        h('h4', null, h('label', { for: qId }, t('doctor.questions'))),
        textarea,
        h('p', { class: 'muted small no-print', style: 'margin: var(--space-1) 0 0' }, t('doctor.questionsHint')),
        printed,
        h('div', { class: 'print-only doctor__lines', 'aria-hidden': 'true' }),
      ),
      h('p', { class: 'doctor__footer' }, t('doctor.footer'), ' ', t('doctor.created', { date: formatDate(ctx.today) })),
    ),
  );
}
