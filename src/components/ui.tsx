import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/art';
import { fonts, useTheme } from '@/components/theme';

export function Screen({ children, title, back }: { children: ReactNode; title?: string; back?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 20, gap: 16 }}
        keyboardShouldPersistTaps="handled">
        {title ? (
          <View style={styles.titleRow}>
            {back ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={12}
                onPress={() => router.back()}>
                <Icon name="back" color={t.text} size={24} />
              </Pressable>
            ) : null}
            <T variant="title">{title}</T>
          </View>
        ) : null}
        {children}
      </ScrollView>
      {/* Keeps scrolled content from running under the status bar or camera cutout. */}
      <View style={[styles.statusArea, { height: insets.top, backgroundColor: t.bg }]} />
    </View>
  );
}

type Variant = 'title' | 'heading' | 'body' | 'small' | 'label';

export function T({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const t = useTheme();
  const base = {
    title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
    heading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
    body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
    small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
    label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.1 },
  }[variant];
  const fallback = variant === 'small' ? t.muted : variant === 'label' ? t.muted : t.text;
  return <Text {...rest} style={[base, { color: color ?? fallback }, style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.border, shadowOpacity: t.dark ? 0 : 0.05 },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Section({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <T variant="label" style={{ marginLeft: 4 }}>
        {label.toUpperCase()}
      </T>
      <Card style={{ paddingVertical: 4 }}>{children}</Card>
      {note ? (
        <T variant="small" style={{ marginHorizontal: 4 }}>
          {note}
        </T>
      ) : null}
    </View>
  );
}

export function Row({
  title,
  detail,
  value,
  onPress,
  right,
  last,
}: {
  title: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
        pressed && { opacity: 0.6 },
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T>{title}</T>
        {detail ? <T variant="small">{detail}</T> : null}
      </View>
      {value ? (
        <T color={t.muted} style={{ flexShrink: 1, maxWidth: '55%', textAlign: 'right' }} numberOfLines={2}>
          {value}
        </T>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevron" size={16} color={t.muted} /> : null}
    </Pressable>
  );
}

export function ToggleRow({
  title,
  detail,
  value,
  onChange,
  disabled,
  last,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Row
      title={title}
      detail={detail}
      last={last}
      right={
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ true: t.emerald, false: t.border }}
          thumbColor={t.ivory}
        />
      }
    />
  );
}

export function Button({
  title,
  onPress,
  icon,
  kind = 'primary',
  disabled,
  flex,
  size,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  kind?: 'primary' | 'confirm' | 'secondary' | 'danger';
  disabled?: boolean;
  flex?: number;
  size?: 'regular' | 'pair';
}) {
  const t = useTheme();
  const palette = {
    primary: { bg: t.emerald, fg: t.ivory, border: t.emerald },
    confirm: { bg: t.green, fg: '#FFFFFF', border: t.green },
    secondary: { bg: 'transparent', fg: t.text, border: t.border },
    danger: { bg: 'transparent', fg: t.danger, border: t.danger },
  }[kind];
  const pair = size === 'pair';
  const big = kind === 'confirm' && !pair;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          minHeight: pair ? 60 : big ? 68 : 50,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        flex !== undefined && { flex, paddingHorizontal: 8 },
      ]}>
      {icon ? <Icon name={icon} size={big ? 26 : 19} color={palette.fg} width={big || pair ? 3 : 2} /> : null}
      <T
        numberOfLines={pair ? 1 : undefined}
        style={{
          color: palette.fg,
          fontFamily: fonts.semibold,
          fontSize: big ? 19 : 15,
          letterSpacing: big ? 0.6 : 0,
        }}>
        {title}
      </T>
    </Pressable>
  );
}

/** The two answers to "Have you prayed?". Yes is wider so it reads as the main action. */
export function PrayerAnswers({
  onYes,
  onNotYet,
  disabled,
}: {
  onYes: () => void;
  onNotYet: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.answers}>
      <Button
        kind="confirm"
        size="pair"
        flex={1.7}
        icon="check"
        title="Yes, I Prayed"
        disabled={disabled}
        onPress={onYes}
      />
      <Button
        kind="secondary"
        size="pair"
        flex={1}
        title="Not Yet"
        disabled={disabled}
        onPress={onNotYet}
      />
    </View>
  );
}

export function Banner({
  tone,
  text,
  action,
  onPress,
}: {
  tone: 'warn' | 'danger' | 'ok';
  text: string;
  action?: string;
  onPress?: () => void;
}) {
  const t = useTheme();
  const [bg, fg] = {
    warn: [t.warnSoft, t.warn],
    danger: [t.dangerSoft, t.danger],
    ok: [t.greenSoft, t.green],
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <T variant="small" color={fg} style={{ flex: 1 }}>
        {text}
      </T>
      {action && onPress ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress}>
          <T variant="small" color={fg} style={{ fontFamily: fonts.semibold }}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.dark ? t.bg : '#F2EEE4' }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && { backgroundColor: t.emerald }]}>
            <T variant="small" color={on ? t.ivory : t.text} style={{ fontFamily: fonts.medium }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PickerRow<V extends string | number>({
  title,
  detail,
  value,
  options,
  onChange,
  last,
}: {
  title: string;
  detail?: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  last?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <Row
        title={title}
        detail={detail}
        last={last}
        value={options.find((o) => o.value === value)?.label ?? String(value)}
        onPress={() => setOpen(true)}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 12 }]}>
            <T variant="heading" style={{ padding: 16 }}>
              {title}
            </T>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={String(o.value)}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={styles.option}>
                  <T style={{ flex: 1 }}>{o.label}</T>
                  {o.value === value ? <Icon name="check" color={t.emerald} size={20} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** A bottom sheet of actions. Alert.alert does nothing on web, so screens use this instead. */
export function ActionSheet({
  title,
  message,
  actions,
  onClose,
}: {
  title: string;
  message?: string;
  actions: { label: string; onPress: () => void }[];
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 12 }]}>
          <View style={{ padding: 16, gap: 2 }}>
            <T variant="heading">{title}</T>
            {message ? <T variant="small">{message}</T> : null}
          </View>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={styles.option}>
              <T color={t.emerald} style={{ fontFamily: fonts.semibold }}>
                {a.label}
              </T>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.option}>
            <T>Cancel</T>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  answers: { flexDirection: 'row', gap: 10 },
  statusArea: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#064635',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 10 },
  button: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  banner: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '75%' },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16 },
});
