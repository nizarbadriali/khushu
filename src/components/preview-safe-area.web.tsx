import { ReactNode, useEffect, useState } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { OsPreview, PreviewMode } from '@/components/os-preview';

/** What a 393 x 852 iPhone reports in portrait: Dynamic Island above, home indicator below. */
const IPHONE_INSETS = { top: 59, right: 0, bottom: 34, left: 0 };

interface PreviewHost {
  kushuPreviewMode?: PreviewMode;
  kushuSetPreviewMode?: (mode: PreviewMode) => void;
}

function iphonePreviewHost(): PreviewHost | null {
  try {
    const inFrame =
      window.parent !== window && window.parent.location.pathname.endsWith('/iphone-preview.html');
    return inFrame ? (window.parent as unknown as PreviewHost) : null;
  } catch {
    return null; // A cross-origin parent is not our preview page.
  }
}

function FramedApp({ host, children }: { host: PreviewHost; children: ReactNode }) {
  const [mode, setMode] = useState<PreviewMode>(host.kushuPreviewMode ?? 'app');

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.kushuPreviewMode) {
        setMode(e.data.kushuPreviewMode);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <SafeAreaInsetsContext.Provider value={IPHONE_INSETS}>
      {/* The app stays mounted beneath, so switching views keeps its state. */}
      {children}
      {mode === 'app' ? null : (
        <OsPreview mode={mode} onOpenApp={() => host.kushuSetPreviewMode?.('app')} />
      )}
    </SafeAreaInsetsContext.Provider>
  );
}

/**
 * A browser reports zero insets, which would put content under the preview frame's
 * Dynamic Island. Only public/iphone-preview.html triggers this: the plain web app and
 * native builds are unaffected, and this .web file never reaches a phone.
 */
export function PreviewSafeArea({ children }: { children: ReactNode }) {
  const host = iphonePreviewHost();
  return host ? <FramedApp host={host}>{children}</FramedApp> : children;
}
