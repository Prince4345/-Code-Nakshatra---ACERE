import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { palette } from '../theme';
import { SessionUser } from '../types';

export const sharedStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  shellGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  shellOrbOne: {
    position: 'absolute',
    top: -90,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(45, 109, 246, 0.16)',
  },
  shellOrbTwo: {
    position: 'absolute',
    bottom: 110,
    left: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(32, 211, 255, 0.08)',
  },
  appRoot: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  shellContent: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'column',
    gap: 12,
  },
  headerCopy: {
    gap: 4,
  },
  overline: {
    color: palette.mutedStrong,
    fontSize: 10,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  headerSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  shellBanner: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    backgroundColor: palette.panelElevated,
    gap: 6,
    marginTop: 10,
    marginBottom: 2,
  },
  shellBannerTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  shellBannerBody: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.lineBright,
    backgroundColor: palette.brandSoft,
  },
  roleBadgeText: {
    color: palette.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.panelElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
  },
  profileInitial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.brandSoft,
    borderWidth: 1,
    borderColor: palette.lineBright,
  },
  profileInitialText: {
    color: palette.text,
    fontWeight: '800',
  },
  profileName: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  profileRole: {
    color: palette.muted,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: palette.panelElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
  },
  logoutText: {
    color: palette.text,
    fontWeight: '700',
  },
  bottomNavTray: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 26,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 20, 35, 0.92)',
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: '#010814',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  bottomNavRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  screenContent: {
    paddingTop: 14,
    paddingBottom: 20,
    gap: 16,
  },
  heroPanel: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 12,
    shadowColor: '#010814',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 33,
    letterSpacing: -0.9,
  },
  heroBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  heroMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroMetricCard: {
    minWidth: 92,
    backgroundColor: palette.panelMuted,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.line,
  },
  heroMetricLabel: {
    color: palette.mutedStrong,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroMetricValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 4,
  },
  sectionAction: {
    color: palette.brandBright,
    fontWeight: '700',
  },
  sectionBody: {
    gap: 10,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: palette.mutedStrong,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelMuted,
    color: palette.text,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  modeChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelMuted,
  },
  modeChipCompact: {
    paddingVertical: 10,
  },
  modeChipActive: {
    backgroundColor: palette.brandSoft,
    borderColor: palette.lineBright,
  },
  modeChipText: {
    color: palette.mutedStrong,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: palette.text,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brand,
    borderWidth: 1,
    borderColor: palette.lineBright,
    shadowColor: palette.brand,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryButtonText: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  tabChip: {
    flex: 1,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabChipActive: {
    backgroundColor: palette.brandSoft,
    borderColor: palette.lineBright,
  },
  tabChipText: {
    color: palette.mutedStrong,
    fontWeight: '700',
    fontSize: 11,
  },
  tabChipTextActive: {
    color: palette.text,
  },
  cardRow: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#010814',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardRowCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionLink: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: palette.panelMuted,
    borderWidth: 1,
    borderColor: palette.line,
  },
  actionLinkText: {
    color: palette.brandBright,
    fontWeight: '700',
    fontSize: 12,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  statusPillText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  richCard: {
    borderRadius: 22,
    backgroundColor: palette.panelElevated,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    gap: 12,
    shadowColor: '#010814',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },
  richCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  richCardCopy: {
    flex: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoToken: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.panelMuted,
    borderWidth: 1,
    borderColor: palette.line,
  },
  infoTokenText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  inlineNote: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  noteCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelElevated,
    gap: 6,
  },
  noteCardUnread: {
    borderColor: palette.lineBright,
  },
  noteTimestamp: {
    color: palette.mutedStrong,
    fontSize: 12,
    marginTop: 4,
  },
  inlineActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.panelMuted,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.line,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.brand,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(1, 6, 14, 0.78)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: palette.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 14,
    borderTopWidth: 1,
    borderColor: palette.line,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: palette.lineBright,
    opacity: 0.9,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '800',
  },
  modalBodyScroll: {
    gap: 14,
    paddingBottom: 6,
  },
  sectionGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  infoBox: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelElevated,
    padding: 14,
    gap: 8,
  },
  infoBoxValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  featureChip: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: palette.panelMuted,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
  },
  featureChipCopy: {
    flex: 1,
  },
  featureChipTitle: {
    color: palette.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureChipSubtitle: {
    color: palette.muted,
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 16,
    shadowColor: '#010814',
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  authHeader: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-start',
  },
  authBrandMark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.brandSoft,
    borderWidth: 1,
    borderColor: palette.lineBright,
  },
  authBrandMarkText: {
    color: palette.text,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  authHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  authTitle: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  authSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  modeSwitch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  centerStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  centerCaption: {
    color: palette.mutedStrong,
    fontSize: 15,
  },
});

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={sharedStyles.field}>
    <Text style={sharedStyles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

export const ModeChip = ({
  active,
  label,
  onPress,
  compact,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  compact?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      sharedStyles.modeChip,
      compact && sharedStyles.modeChipCompact,
      active && sharedStyles.modeChipActive,
      pressed && sharedStyles.buttonPressed,
    ]}
  >
    <Text style={[sharedStyles.modeChipText, active && sharedStyles.modeChipTextActive]}>{label}</Text>
  </Pressable>
);

export const TabChip = ({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 370;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.tabChip,
        active && sharedStyles.tabChipActive,
        isNarrow && { paddingHorizontal: 6, paddingVertical: 8 },
        pressed && sharedStyles.buttonPressed,
      ]}
    >
      <Feather name={icon} size={isNarrow ? 17 : 18} color={active ? palette.text : palette.mutedStrong} />
      <Text style={[sharedStyles.tabChipText, active && sharedStyles.tabChipTextActive, isNarrow && { fontSize: 10 }]}>{label}</Text>
    </Pressable>
  );
};

export const ProductShell = ({
  session,
  title,
  subtitle,
  onLogout,
  tabs,
  banner,
  children,
}: {
  session: SessionUser;
  title: string;
  subtitle: string;
  onLogout: () => Promise<void>;
  tabs?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 430;
  const isNarrow = width < 370;

  return (
    <SafeAreaView style={sharedStyles.safeArea}>
      <LinearGradient colors={[palette.bg, palette.bgAlt, palette.bg]} style={sharedStyles.shellGradient} />
      <View style={sharedStyles.shellOrbOne} />
      <View style={sharedStyles.shellOrbTwo} />
      <View style={[sharedStyles.appRoot, { paddingHorizontal: isNarrow ? 14 : 18, paddingTop: isNarrow ? 12 : 14 }]}>
        <View style={sharedStyles.header}>
          <View style={sharedStyles.headerCopy}>
            <Text style={sharedStyles.overline}>CarbonTrace / {session.role}</Text>
            <Text style={[sharedStyles.headerTitle, { fontSize: isNarrow ? 24 : isCompact ? 27 : 30 }]}>{title}</Text>
            <Text style={[sharedStyles.headerSubtitle, { fontSize: isNarrow ? 12 : 13 }]}>{subtitle}</Text>
          </View>
          <View style={[sharedStyles.headerActions, isNarrow && { gap: 6 }]}>
            <View style={[sharedStyles.roleBadge, isNarrow && { paddingHorizontal: 10, paddingVertical: 8 }]}>
              <Text style={[sharedStyles.roleBadgeText, isNarrow && { fontSize: 10 }]}>{session.role}</Text>
            </View>
            <View style={[sharedStyles.profileChip, { flexShrink: 1 }]}>
              <View style={sharedStyles.profileInitial}>
                <Text style={sharedStyles.profileInitialText}>{(session.name || 'U').trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text numberOfLines={1} style={sharedStyles.profileName}>{(session.name || 'User').trim().split(' ')[0]}</Text>
                <Text style={sharedStyles.profileRole}>Active</Text>
              </View>
            </View>
            <Pressable style={[sharedStyles.logoutButton, isNarrow && { paddingHorizontal: 10 }]} onPress={onLogout}>
              <Feather name="log-out" color={palette.text} size={16} />
              {!isNarrow ? <Text style={sharedStyles.logoutText}>Exit</Text> : null}
            </Pressable>
          </View>
        </View>
        {banner}
        <View style={sharedStyles.shellContent}>{children}</View>
        {tabs ? (
          <View style={sharedStyles.bottomNavTray}>
            <View style={sharedStyles.bottomNavRow}>{tabs}</View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export const HeroPanel = ({
  eyebrow,
  title,
  body,
  metrics,
}: {
  eyebrow: string;
  title: string;
  body: string;
  metrics: Array<{ label: string; value: string }>;
}) => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 370;
  const metricWidth = width < 430 ? '47%' : undefined;

  return (
    <LinearGradient colors={[palette.panelElevated, palette.panel]} style={[sharedStyles.heroPanel, { padding: isNarrow ? 18 : 20 }]}>
      <Text style={sharedStyles.overline}>{eyebrow}</Text>
      <Text style={[sharedStyles.heroTitle, { fontSize: isNarrow ? 24 : 28, lineHeight: isNarrow ? 29 : 33 }]}>{title}</Text>
      <Text style={[sharedStyles.heroBody, { fontSize: isNarrow ? 13 : 14 }]}>{body}</Text>
      <View style={sharedStyles.heroMetricRow}>
        {metrics.map((metric) => (
          <View key={metric.label} style={[sharedStyles.heroMetricCard, metricWidth ? { width: metricWidth } : null]}>
            <Text style={sharedStyles.heroMetricLabel}>{metric.label}</Text>
            <Text style={sharedStyles.heroMetricValue}>{metric.value}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
};

export const RuntimeBanner = ({
  title,
  body,
  tone = 'neutral',
  action,
}: {
  title: string;
  body: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  action?: React.ReactNode;
}) => {
  const borderColor =
    tone === 'good'
      ? palette.goodLine
      : tone === 'warn'
        ? palette.warnLine
        : tone === 'bad'
          ? palette.badLine
          : palette.lineBright;
  const backgroundColor =
    tone === 'good'
      ? palette.goodBg
      : tone === 'warn'
        ? palette.warnBg
        : tone === 'bad'
          ? palette.badBg
          : palette.brandSoft;

  return (
    <View style={[sharedStyles.shellBanner, { borderColor, backgroundColor }]}>
      <Text style={sharedStyles.shellBannerTitle}>{title}</Text>
      <Text style={sharedStyles.shellBannerBody}>{body}</Text>
      {action}
    </View>
  );
};

export const Section = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  children: React.ReactNode;
}) => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 370;

  return (
    <View style={sharedStyles.section}>
      <View style={[sharedStyles.sectionHeader, isNarrow && { alignItems: 'flex-start', flexDirection: 'column' }]}>
        <View>
          <Text style={sharedStyles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={sharedStyles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {action ? <Text style={sharedStyles.sectionAction}>{action}</Text> : null}
      </View>
      <View style={sharedStyles.sectionBody}>{children}</View>
    </View>
  );
};

export const CardRow = ({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) => (
  <View style={sharedStyles.cardRow}>
    <View style={sharedStyles.cardRowCopy}>
      <Text numberOfLines={1} style={sharedStyles.cardTitle}>{title}</Text>
      <Text style={sharedStyles.cardSubtitle}>{subtitle}</Text>
    </View>
    {right}
  </View>
);

export const ActionLink = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [sharedStyles.actionLink, pressed && sharedStyles.buttonPressed]}>
    <Text style={sharedStyles.actionLinkText}>{label}</Text>
  </Pressable>
);

export const StatusPill = ({ label, backgroundColor, borderColor }: { label: string; backgroundColor: string; borderColor: string }) => (
  <View style={[sharedStyles.statusPill, { backgroundColor, borderColor }]}>
    <Text style={sharedStyles.statusPillText}>{label}</Text>
  </View>
);

export const RichCard = ({ children }: { children: React.ReactNode }) => <View style={sharedStyles.richCard}>{children}</View>;

export const RichCardTop = ({ children }: { children: React.ReactNode }) => <View style={sharedStyles.richCardTop}>{children}</View>;

export const RichCardCopy = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={sharedStyles.richCardCopy}>
    <Text numberOfLines={1} style={sharedStyles.cardTitle}>{title}</Text>
    <Text style={sharedStyles.cardSubtitle}>{subtitle}</Text>
  </View>
);

export const InfoToken = ({
  icon,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
}) => (
  <View style={sharedStyles.infoToken}>
    <Feather name={icon} size={13} color={palette.text} />
    <Text style={sharedStyles.infoTokenText}>{label}</Text>
  </View>
);

export const LoadingScreen = ({ label }: { label: string }) => (
  <SafeAreaView style={sharedStyles.safeArea}>
    <LinearGradient colors={[palette.bg, palette.bgAlt, palette.bg]} style={sharedStyles.shellGradient} />
    <View style={sharedStyles.centerStage}>
      <ActivityIndicator color={palette.brandBright} size="large" />
      <Text style={sharedStyles.centerCaption}>{label}</Text>
    </View>
  </SafeAreaView>
);

export const NotificationList = ({
  notifications,
  emptyLabel,
}: {
  notifications: Array<{ id: string; title: string; message: string; createdAt: string; read: boolean }>;
  emptyLabel: string;
}) => (
  <Section title="Inbox">
    {notifications.length ? (
      notifications.map((notification) => (
        <View key={notification.id} style={[sharedStyles.noteCard, !notification.read && sharedStyles.noteCardUnread]}>
          <Text style={sharedStyles.cardTitle}>{notification.title}</Text>
          <Text style={sharedStyles.cardSubtitle}>{notification.message}</Text>
          <Text style={sharedStyles.noteTimestamp}>{new Date(notification.createdAt).toLocaleString()}</Text>
        </View>
      ))
    ) : (
      <View style={sharedStyles.noteCard}>
        <Text style={sharedStyles.cardSubtitle}>{emptyLabel}</Text>
      </View>
    )}
  </Section>
);

export const AuthCard = ({ children }: { children: React.ReactNode }) => (
  <ScrollView contentContainerStyle={sharedStyles.authScroll} keyboardShouldPersistTaps="handled">
    <LinearGradient colors={[palette.panelElevated, palette.panel]} style={sharedStyles.authCard}>
      {children}
    </LinearGradient>
  </ScrollView>
);

export const AuthHeader = () => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 390;

  return (
    <View style={[sharedStyles.authHeader, isNarrow && { gap: 10 }]}>
      <View style={[sharedStyles.authBrandMark, isNarrow && { width: 52, height: 52, borderRadius: 18 }]}>
        <Text style={sharedStyles.authBrandMarkText}>CT</Text>
      </View>
      <View style={sharedStyles.authHeaderCopy}>
        <Text style={sharedStyles.overline}>CarbonTrace Mobile</Text>
        <Text style={[sharedStyles.authTitle, { fontSize: isNarrow ? 26 : 30 }]}>Move compliance faster.</Text>
        <Text style={sharedStyles.authSubtitle}>Capture plots, approve cases, and open shipment packages from the field.</Text>
      </View>
    </View>
  );
};

export const FeatureChip = ({ icon, title, subtitle }: { icon: keyof typeof Feather.glyphMap; title: string; subtitle: string }) => (
  <View style={sharedStyles.featureChip}>
    <Feather name={icon} size={18} color={palette.brandBright} />
    <View style={sharedStyles.featureChipCopy}>
      <Text style={sharedStyles.featureChipTitle}>{title}</Text>
      <Text style={sharedStyles.featureChipSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

export const InfoModal = ({
  visible,
  title,
  subtitle,
  body,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  body: React.ReactNode;
  onClose: () => void;
}) => {
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [translateY, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 1.1) {
            Animated.timing(translateY, {
              toValue: height,
              duration: 180,
              useNativeDriver: true,
            }).start(onClose);
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 5,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 5,
          }).start();
        },
      }),
    [height, onClose, translateY],
  );

  return (
    <Modal animationType="fade" visible={visible} transparent onRequestClose={onClose}>
      <View style={sharedStyles.modalScrim}>
        <Pressable style={sharedStyles.modalBackdrop} onPress={onClose} />
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            sharedStyles.modalSheet,
            {
              maxHeight: height * 0.88,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={sharedStyles.sheetHandle} />
          <View style={sharedStyles.modalHeader}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={sharedStyles.overline}>Detail</Text>
              <Text style={sharedStyles.modalTitle}>{title}</Text>
              {subtitle ? <Text style={sharedStyles.cardSubtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={palette.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sharedStyles.modalBodyScroll}>
            {body}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const noteTextStyles = sharedStyles;

export const sharedInputStyles = sharedStyles;
