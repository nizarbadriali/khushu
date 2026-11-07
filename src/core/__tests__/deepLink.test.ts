import { DASHBOARD_URL } from '../widgetData';

// The project has no Node types, since app code must not depend on them.
declare const process: { cwd(): string };
const fs: {
  readFileSync(path: string, encoding: string): string;
  existsSync(path: string): boolean;
} = jest.requireActual('fs');

const join = (...parts: string[]) => parts.join('/');
const { readFileSync, existsSync } = fs;
const root = process.cwd();
const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;

describe('I: deep links', () => {
  it('uses the scheme the app registers', () => {
    expect(DASHBOARD_URL).toBe(`${config.scheme}://`);
  });

  it('lands on a route that exists, the Home dashboard', () => {
    expect(existsSync(join(root, 'src/app/(tabs)/index.tsx'))).toBe(true);
  });

  it('matches the link the Android notification opens', () => {
    const kotlin = readFileSync(
      join(
        root,
        'modules/kushu-countdown/android/src/main/java/expo/modules/kushucountdown/CountdownController.kt',
      ),
      'utf8',
    );
    expect(kotlin).toContain(`Uri.parse("${DASHBOARD_URL}")`);
  });
});

describe('widget configuration', () => {
  const plugin = config.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-widgets');
  const source = readFileSync(join(root, 'src/widgets/index.tsx'), 'utf8');

  it('registers a config entry for every widget created in code', () => {
    const created = [...source.matchAll(/createWidget\('(\w+)'/g)].map((m) => m[1]);
    expect(plugin[1].widgets.map((w: { name: string }) => w.name)).toEqual(created);
    expect(created).toHaveLength(3);
  });

  it('gives each widget exactly its family', () => {
    const families = plugin[1].widgets.map(
      (w: { ios: { supportedFamilies: string[] } }) => w.ios.supportedFamilies,
    );
    expect(families).toEqual([['systemSmall'], ['systemMedium'], ['systemLarge']]);
  });

  it('keeps Android widgets off, and the widget runtime out of the Android build', () => {
    expect(plugin[1].enableAndroid ?? false).toBe(false);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(pkg.expo.autolinking.android.exclude).toEqual(
      expect.arrayContaining(['expo-widgets', '@expo/ui']),
    );
  });

  it('only the iOS service imports the widgets', () => {
    const shared = readFileSync(join(root, 'src/services/surfaces.ts'), 'utf8');
    expect(shared).not.toContain("from '@/widgets'");
    expect(shared).not.toContain("from 'expo-widgets'");
  });
});
