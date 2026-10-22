/**
 * Dauerhafter Speicher (StorageManager): bittet den Browser, die Daten dieser App nicht
 * von sich aus zu löschen (z. B. Safari nach einigen Tagen ohne Nutzung, oder bei Speichermangel).
 * Swift-Pendant: nicht nötig, App-Daten bleiben dort ohnehin erhalten.
 */

/** true/false, oder undefined, wenn der Browser es nicht unterstützt. */
export async function isStoragePersisted(): Promise<boolean | undefined> {
  try {
    if (!navigator.storage?.persisted) return undefined;
    return await navigator.storage.persisted();
  } catch {
    return undefined;
  }
}

/** Fragt dauerhaften Speicher an. Liefert, ob er jetzt eingeschaltet ist. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Läuft die App vom Home-Bildschirm bzw. installiert (nicht im Browser-Tab)? */
export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone oder iPad (auch iPadOS, das sich als Mac ausgibt). */
export function isAppleMobile(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
