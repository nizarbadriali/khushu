export function formatTime(ms: number, format: '12h' | '24h'): string {
  const d = new Date(ms);
  const min = String(d.getMinutes()).padStart(2, '0');
  if (format === '24h') return `${String(d.getHours()).padStart(2, '0')}:${min}`;
  const h = d.getHours() % 12 || 12;
  return `${h}:${min} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** "00:42:18", for the simulated countdowns. Native surfaces draw their own timers. */
export function formatCountdown(targetMs: number, nowMs: number): string {
  const total = Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
