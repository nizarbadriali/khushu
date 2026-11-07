import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import {
  createLiveActivity,
  createWidget,
  LiveActivityEnvironment,
  WidgetEnvironment,
} from 'expo-widgets';

import type { LiveActivityProps, WidgetSnapshot } from '@/core/widgetData';

/*
 * Each function marked 'widget' is compiled into an isolated runtime. It cannot use
 * hooks, the store, or anything else from this module, so its colors are declared
 * inside it and all data arrives through props. Only type imports may reach the app.
 */

const NextPrayerLayout = (p: WidgetSnapshot, _env: WidgetEnvironment) => {
  'widget';
  const ink = '#FAF8F3';
  const soft = '#BFD2C9';
  const gold = '#D6B66F';
  return (
    <HStack
      modifiers={[containerBackground('#064635', 'widget'), widgetURL(p.url)]}>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(gold)]}>KUSHU</Text>
        <Spacer />
        {p.next ? (
          <VStack alignment="leading" spacing={1}>
            <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(soft)]}>
              NEXT PRAYER
            </Text>
            <Text
              modifiers={[
                font({ size: 28, weight: 'semibold', design: 'serif' }),
                foregroundStyle(ink),
                lineLimit(1),
              ]}>
              {p.next.label}
            </Text>
            <Text modifiers={[font({ size: 15, weight: 'medium' }), foregroundStyle(ink)]}>
              {p.next.tomorrow ? `Tomorrow ${p.next.timeLabel}` : p.next.timeLabel}
            </Text>
            {p.countdown ? (
              <HStack spacing={3}>
                <Text modifiers={[font({ size: 11 }), foregroundStyle(soft)]}>Begins in</Text>
                <Text
                  date={new Date(p.next.startMs)}
                  dateStyle="relative"
                  modifiers={[font({ size: 11 }), foregroundStyle(soft), lineLimit(1)]}
                />
              </HStack>
            ) : null}
          </VStack>
        ) : (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(ink)]}>
            Open Kushu to update prayer times
          </Text>
        )}
      </VStack>
      <Spacer />
    </HStack>
  );
};

const TodayLayout = (p: WidgetSnapshot, _env: WidgetEnvironment) => {
  'widget';
  const ink = '#FAF8F3';
  const soft = '#BFD2C9';
  const gold = '#D6B66F';
  const green = '#4FD08F';
  return (
    <VStack
      alignment="leading"
      spacing={3}
      modifiers={[containerBackground('#064635', 'widget'), widgetURL(p.url)]}>
      <HStack>
        <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(gold)]}>
          KUSHU — TODAY&apos;S PRAYERS
        </Text>
        <Spacer />
      </HStack>
      {p.rows.map((r) => (
        <HStack key={r.prayer} spacing={8}>
          <Text
            modifiers={[
              font({ size: 13, weight: r.isNext ? 'bold' : 'regular' }),
              foregroundStyle(r.isNext ? gold : ink),
            ]}>
            {r.label}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 13, weight: r.isNext ? 'bold' : 'regular' }),
              foregroundStyle(r.isNext ? gold : soft),
              monospacedDigit(),
            ]}>
            {r.timeLabel}
          </Text>
          <Image
            systemName={r.done ? 'checkmark.circle.fill' : 'circle'}
            size={14}
            color={r.done ? green : soft}
          />
        </HStack>
      ))}
    </VStack>
  );
};

const DashboardLayout = (p: WidgetSnapshot, _env: WidgetEnvironment) => {
  'widget';
  const ink = '#FAF8F3';
  const soft = '#BFD2C9';
  const gold = '#D6B66F';
  const green = '#4FD08F';
  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[containerBackground('#064635', 'widget'), widgetURL(p.url)]}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(gold)]}>KUSHU</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(soft)]}>{p.dateLabel}</Text>
      </HStack>
      {p.next ? (
        <HStack alignment="bottom">
          <VStack alignment="leading" spacing={0}>
            <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(soft)]}>
              NEXT PRAYER
            </Text>
            <Text
              modifiers={[
                font({ size: 30, weight: 'semibold', design: 'serif' }),
                foregroundStyle(ink),
              ]}>
              {p.next.label}
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={0}>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(soft)]}>
              {p.next.tomorrow ? `Tomorrow ${p.next.timeLabel}` : p.next.timeLabel}
            </Text>
            {p.countdown ? (
              <Text
                timerInterval={{ lower: new Date(p.atMs), upper: new Date(p.next.startMs) }}
                modifiers={[
                  font({ size: 22, weight: 'semibold' }),
                  foregroundStyle(gold),
                  monospacedDigit(),
                ]}
              />
            ) : null}
          </VStack>
        </HStack>
      ) : (
        <Text modifiers={[font({ size: 14 }), foregroundStyle(ink)]}>
          Open Kushu to update prayer times
        </Text>
      )}
      {p.windowNote ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(gold)]}>{p.windowNote}</Text>
      ) : null}
      <VStack alignment="leading" spacing={5}>
        {p.rows.map((r) => (
          <HStack key={r.prayer} spacing={8}>
            <Text
              modifiers={[
                font({ size: 15, weight: r.isNext ? 'bold' : 'regular' }),
                foregroundStyle(r.isNext ? gold : ink),
              ]}>
              {r.label}
            </Text>
            <Spacer />
            <Text
              modifiers={[
                font({ size: 15, weight: r.isNext ? 'bold' : 'regular' }),
                foregroundStyle(r.isNext ? gold : soft),
                monospacedDigit(),
              ]}>
              {r.timeLabel}
            </Text>
            <Image
              systemName={r.done ? 'checkmark.circle.fill' : 'circle'}
              size={16}
              color={r.done ? green : soft}
            />
          </HStack>
        ))}
      </VStack>
      <Spacer />
      <VStack alignment="leading" spacing={4}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(soft)]}>
          {`${p.completed} of ${p.total} confirmed today`}
        </Text>
        <ProgressView value={p.total ? p.completed / p.total : 0} modifiers={[tint(green)]} />
      </VStack>
    </VStack>
  );
};

/** isStale turns true at the prayer time by itself, which is what lets this stay honest. */
const NextPrayerActivityLayout = (p: LiveActivityProps, env: LiveActivityEnvironment) => {
  'widget';
  const ink = '#FAF8F3';
  const soft = '#BFD2C9';
  const gold = '#D6B66F';
  const timer = { lower: new Date(p.fromMs), upper: new Date(p.startMs) };
  const arrived = env.isStale === true;
  const heading = p.tomorrow ? `${p.label.toUpperCase()}, TOMORROW` : p.label.toUpperCase();

  return {
    banner: (
      <HStack modifiers={[padding({ all: 16 }), activityBackgroundTint('#064635')]}>
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(gold)]}>KUSHU</Text>
          {arrived ? (
            <Text modifiers={[font({ size: 20, weight: 'semibold' }), foregroundStyle(ink)]}>
              {`It's time for ${p.label}`}
            </Text>
          ) : (
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(ink)]}>
              {`NEXT PRAYER: ${heading}`}
            </Text>
          )}
          <Text modifiers={[font({ size: 13 }), foregroundStyle(soft)]}>
            {arrived ? 'Open Kushu for the next prayer' : `${p.timeLabel} · ${p.progress}`}
          </Text>
        </VStack>
        <Spacer />
        {arrived ? null : (
          <VStack alignment="trailing" spacing={0}>
            <Text
              timerInterval={timer}
              modifiers={[
                font({ size: 26, weight: 'semibold' }),
                foregroundStyle(gold),
                monospacedDigit(),
                frame({ width: 112 }),
              ]}
            />
            <Text modifiers={[font({ size: 11 }), foregroundStyle(soft)]}>remaining</Text>
          </VStack>
        )}
      </HStack>
    ),
    compactLeading: (
      <HStack spacing={3}>
        <Image systemName="moon.stars.fill" size={13} color={gold} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(ink)]}>
          {p.shortLabel}
        </Text>
      </HStack>
    ),
    compactTrailing: arrived ? (
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(gold)]}>Now</Text>
    ) : (
      <Text
        timerInterval={timer}
        modifiers={[
          font({ size: 13, weight: 'semibold' }),
          foregroundStyle(gold),
          monospacedDigit(),
          frame({ width: 56 }),
        ]}
      />
    ),
    minimal: <Image systemName="moon.stars.fill" size={13} color={gold} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(soft)]}>
          NEXT PRAYER
        </Text>
        <Text modifiers={[font({ size: 22, weight: 'semibold' }), foregroundStyle(ink)]}>
          {p.label}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={1}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(soft)]}>
          {p.tomorrow ? 'TOMORROW' : 'STARTS'}
        </Text>
        <Text modifiers={[font({ size: 18, weight: 'medium' }), foregroundStyle(ink)]}>
          {p.timeLabel}
        </Text>
      </VStack>
    ),
    expandedBottom: (
      <HStack>
        {arrived ? (
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(gold)]}>
            {`It's time for ${p.label}`}
          </Text>
        ) : (
          <Text
            timerInterval={timer}
            modifiers={[
              font({ size: 24, weight: 'semibold' }),
              foregroundStyle(gold),
              monospacedDigit(),
              frame({ width: 112 }),
            ]}
          />
        )}
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(soft)]}>
          Open Kushu
        </Text>
      </HStack>
    ),
  };
};

/** Shown until the app first runs and sends real data. */
const EMPTY: WidgetSnapshot = {
  atMs: 0,
  dateLabel: '',
  next: null,
  rows: [],
  completed: 0,
  total: 0,
  countdown: false,
  windowNote: null,
  url: 'kushu://',
};

export const NextPrayerWidget = createWidget('NextPrayer', NextPrayerLayout, EMPTY);
export const TodayWidget = createWidget('TodaysPrayers', TodayLayout, EMPTY);
export const DashboardWidget = createWidget('PrayerDashboard', DashboardLayout, EMPTY);
export const NextPrayerActivity = createLiveActivity('NextPrayerActivity', NextPrayerActivityLayout);
