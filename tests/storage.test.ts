import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { Repository } from '../src/storage/repository';
import { makeLog } from './helpers';

let repo: Repository;
let n = 0;
async function fresh() {
  repo = await Repository.open(`test-${n++}`);
  return repo;
}
afterEach(() => repo?.close());

const child = (id: string, birthDate = '2025-01-01') => ({ id, name: id, birthDate, useCorrectedAge: false, createdAt: 'x', updatedAt: 'x' });

describe('Repository', () => {
  it('Einstellungen haben Standardwerte', async () => {
    const r = await fresh();
    expect((await r.getSettings()).theme).toBe('system');
    await r.saveSettings({ ...(await r.getSettings()), theme: 'dark' });
    expect((await r.getSettings()).theme).toBe('dark');
  });

  it('Kind löschen räumt Meilensteine und Verlauf auf, Geschwister-Einträge bleiben', async () => {
    const r = await fresh();
    await r.saveChild(child('a'));
    await r.saveChild(child('b', '2023-01-01'));
    await r.saveMilestoneRecord({ id: 'm1', childId: 'a', milestoneId: 'x', achievedOn: '2025-06-01' });
    await r.saveLog(makeLog('act', '2025-06-01', { id: 'l1', childIds: ['a'] }));
    await r.saveLog(makeLog('act', '2025-06-02', { id: 'l2', childIds: ['a', 'b'] }));
    await r.deleteChild('a');
    expect((await r.listChildren()).map((c) => c.id)).toEqual(['b']);
    expect(await r.listMilestoneRecords('a')).toEqual([]);
    const logs = await r.listLogs();
    expect(logs.map((l) => [l.id, l.childIds])).toEqual([['l2', ['b']]]);
  });

  it('Favoriten an- und abschalten', async () => {
    const r = await fresh();
    await r.setFavorite({ source: 'builtin', id: 'a1' }, true);
    expect((await r.listFavorites()).length).toBe(1);
    await r.setFavorite({ source: 'builtin', id: 'a1' }, false);
    expect(await r.listFavorites()).toEqual([]);
  });

  it('Export und Ersetzen aus Backup', async () => {
    const r = await fresh();
    await r.saveChild(child('a'));
    await r.setFavorite({ source: 'builtin', id: 'a1' }, true);
    const data = await r.exportData();
    const r2 = await Repository.open(`test-${n++}`);
    await r2.saveChild(child('alt'));
    await r2.replaceAll(data);
    expect((await r2.listChildren()).map((c) => c.id)).toEqual(['a']);
    expect((await r2.listFavorites()).length).toBe(1);
    r2.close();
  });
});
