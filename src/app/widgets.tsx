import { Platform, ScrollView, View } from 'react-native';

import { LargeWidget, LockActivity, MediumWidget, SmallWidget } from '@/components/os-surfaces';
import { Banner, Row, Screen, Section, T } from '@/components/ui';
import { useWidgetSnapshot } from '@/hooks/use-widget-snapshot';
import { surfaceStatus } from '@/services/surfaces';
import { useApp } from '@/store/app';

export default function WidgetsScreen() {
  const settings = useApp((s) => s.settings);
  const { snapshot, now } = useWidgetSnapshot();
  const status = surfaceStatus(settings);

  return (
    <Screen title="Widgets" back>
      <Banner
        tone="warn"
        text={
          status.simulated
            ? 'Simulated in the browser. These use your real prayer data, but real widgets and Live Activities only exist in an iPhone build.'
            : 'These previews use your real prayer data. The system draws the real versions, so they can differ slightly.'
        }
      />

      <Section label="This device">
        {status.rows.map((r, i) => (
          <Row
            key={r.title}
            title={r.title}
            detail={r.detail}
            value={r.value}
            last={i === status.rows.length - 1}
          />
        ))}
      </Section>

      {snapshot ? (
        <>
          <Section label="Live Activity">
            <View style={{ paddingVertical: 10 }}>
              <LockActivity s={snapshot} now={now} />
            </View>
          </Section>
          <T variant="label" style={{ marginLeft: 4 }}>
            HOME SCREEN WIDGETS
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <SmallWidget s={snapshot} now={now} />
              <MediumWidget s={snapshot} />
              <LargeWidget s={snapshot} now={now} />
            </View>
          </ScrollView>
        </>
      ) : (
        <Banner tone="warn" text="Choose a location to preview your prayer times." />
      )}

      <T variant="small" style={{ marginHorizontal: 4 }}>
        {Platform.OS === 'android'
          ? 'Home Screen widgets are planned for Android. The countdown notification works without them.'
          : 'To add a widget, touch and hold the Home Screen, tap Edit, then Add Widget, and choose Kushu.'}
      </T>
    </Screen>
  );
}
