import * as Location from 'expo-location';

import { AppLocation } from '@/core/types';

export const CITIES: AppLocation[] = (
  [
    ['New York, USA', 40.7128, -74.006],
    ['Chicago, USA', 41.8781, -87.6298],
    ['Houston, USA', 29.7604, -95.3698],
    ['Dallas, USA', 32.7767, -96.797],
    ['Detroit, USA', 42.3314, -83.0458],
    ['Los Angeles, USA', 34.0522, -118.2437],
    ['San Francisco, USA', 37.7749, -122.4194],
    ['Toronto, Canada', 43.6532, -79.3832],
    ['London, UK', 51.5074, -0.1278],
    ['Birmingham, UK', 52.4862, -1.8904],
    ['Paris, France', 48.8566, 2.3522],
    ['Istanbul, Türkiye', 41.0082, 28.9784],
    ['Cairo, Egypt', 30.0444, 31.2357],
    ['Makkah, Saudi Arabia', 21.3891, 39.8579],
    ['Madinah, Saudi Arabia', 24.5247, 39.5692],
    ['Dubai, UAE', 25.2048, 55.2708],
    ['Karachi, Pakistan', 24.8607, 67.0011],
    ['Lahore, Pakistan', 31.5204, 74.3587],
    ['Delhi, India', 28.6139, 77.209],
    ['Dhaka, Bangladesh', 23.8103, 90.4125],
    ['Kuala Lumpur, Malaysia', 3.139, 101.6869],
    ['Jakarta, Indonesia', -6.2088, 106.8456],
    ['Lagos, Nigeria', 6.5244, 3.3792],
    ['Sydney, Australia', -33.8688, 151.2093],
  ] as const
).map(([label, latitude, longitude]) => ({ label, latitude, longitude, source: 'manual' }));

export type LocateResult =
  | { ok: true; location: AppLocation }
  | { ok: false; reason: 'denied' | 'unavailable' };

export async function detectLocation(): Promise<LocateResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 6 * 60 * 60 * 1000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const { latitude, longitude } = position.coords;
    return {
      ok: true,
      location: { latitude, longitude, label: await placeName(latitude, longitude), source: 'gps' },
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Geocoding needs the network, while prayer times do not, so it degrades to coordinates. */
async function placeName(latitude: number, longitude: number): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const name = [place?.city ?? place?.subregion, place?.region ?? place?.country]
      .filter(Boolean)
      .join(', ');
    if (name) return name;
  } catch {
    // Fall through to coordinates.
  }
  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}
