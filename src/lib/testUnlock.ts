// Daily / weekly test unlocks. Admin sets one unlock time per test (same for every
// student); before it the test is listed with a lock and the API returns no questions.

type UnlockableTest = { name?: string; sequence?: number | null; createdAt?: string; unlockAt?: string | null; locked?: boolean };

// Milliseconds to add to the phone clock to get server time (phone clocks drift or
// are changed on purpose to open tests early).
export const serverOffsetMs = (serverTime?: string | null): number => {
  const t = serverTime ? Date.parse(serverTime) : NaN;
  return Number.isFinite(t) ? t - Date.now() : 0;
};

export const isTestLocked = (test: UnlockableTest | null | undefined, offsetMs = 0): boolean => {
  if (!test) return false;
  if (test.locked) return true;
  const at = test.unlockAt ? Date.parse(test.unlockAt) : NaN;
  return Number.isFinite(at) && at > Date.now() + offsetMs;
};

export const formatUnlock = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]}, ${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
};

// "Test - 12" after "Test - 2": order by the first number in the name, then by the
// admin sequence, then by creation time.
export const compareTests = (a: UnlockableTest, b: UnlockableTest): number => {
  const na = parseInt((String(a.name || '').match(/\d+/) || [])[0] || '', 10);
  const nb = parseInt((String(b.name || '').match(/\d+/) || [])[0] || '', 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  if ((a.sequence || 0) !== (b.sequence || 0)) return (a.sequence || 0) - (b.sequence || 0);
  return (Date.parse(a.createdAt || '') || 0) - (Date.parse(b.createdAt || '') || 0);
};
