import { router } from 'expo-router';

import { LocationPicker } from '@/components/location-picker';
import { Screen } from '@/components/ui';
import { useApp } from '@/store/app';

export default function LocationScreen() {
  const update = useApp((s) => s.updateSettings);
  return (
    <Screen title="Location" back>
      <LocationPicker
        onPick={(location) => {
          update({ location });
          router.back();
        }}
      />
    </Screen>
  );
}
