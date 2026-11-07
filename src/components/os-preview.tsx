/** The Home and Lock Screen simulation is browser-only. See os-preview.web.tsx. */
export type PreviewMode = 'app' | 'home' | 'lock';

export function OsPreview(_props: { mode: Exclude<PreviewMode, 'app'>; onOpenApp: () => void }) {
  return null;
}
