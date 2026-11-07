import { ReactNode } from 'react';

/** Native devices report their own insets. See the .web file for the preview frame. */
export function PreviewSafeArea({ children }: { children: ReactNode }) {
  return children;
}
