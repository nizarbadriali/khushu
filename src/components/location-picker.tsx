import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, TextInput, View } from 'react-native';

import { fonts, useTheme } from '@/components/theme';
import { Banner, Button, Row, Section } from '@/components/ui';
import { AppLocation } from '@/core/types';
import { CITIES, detectLocation } from '@/services/location';

export function LocationPicker({ onPick }: { onPick: (location: AppLocation) => void }) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'denied' | 'unavailable' | null>(null);
  const [query, setQuery] = useState('');

  const detect = async () => {
    setBusy(true);
    setProblem(null);
    const result = await detectLocation();
    setBusy(false);
    if (result.ok) onPick(result.location);
    else setProblem(result.reason);
  };

  const cities = CITIES.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View style={{ gap: 14 }}>
      {busy ? (
        <ActivityIndicator color={t.emerald} style={{ minHeight: 50 }} />
      ) : (
        <Button icon="pin" title="Use my location" onPress={detect} />
      )}
      {problem === 'denied' ? (
        <Banner
          tone="warn"
          text={
            Platform.OS === 'web'
              ? 'This browser did not share your location. Browsers only allow it on secure pages, so please choose a city below.'
              : 'Location is off for Kushu. Choose a city below instead.'
          }
          action={Platform.OS === 'web' ? undefined : 'Settings'}
          onPress={Platform.OS === 'web' ? undefined : () => Linking.openSettings()}
        />
      ) : null}
      {problem === 'unavailable' ? (
        <Banner tone="warn" text="Your location could not be found. Choose a city below." />
      ) : null}
      <TextInput
        accessibilityLabel="Search cities"
        placeholder="Search cities"
        placeholderTextColor={t.muted}
        value={query}
        onChangeText={setQuery}
        style={{
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          minHeight: 50,
          color: t.text,
          fontFamily: fonts.regular,
          fontSize: 16,
        }}
      />
      <Section label="Cities">
        {cities.map((c, i) => (
          <Row key={c.label} title={c.label} onPress={() => onPick(c)} last={i === cities.length - 1} />
        ))}
      </Section>
    </View>
  );
}
