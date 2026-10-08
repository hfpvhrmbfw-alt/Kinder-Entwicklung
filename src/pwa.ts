/** Service-Worker-Registrierung: Offline-Fähigkeit und Update-Hinweis. */
import { registerSW } from 'virtual:pwa-register';
import { t } from './i18n';
import { toast } from './ui/app';

export function setupPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    onNeedRefresh() {
      toast(t('app.updateAvailable'), { label: t('app.updateNow'), run: () => updateSW(true) });
    },
    onOfflineReady() {
      toast(t('app.offlineReady'));
    },
  });
}
