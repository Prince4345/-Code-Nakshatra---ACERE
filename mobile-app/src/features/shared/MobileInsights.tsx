import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../../theme';

type Tone = 'default' | 'good' | 'warn' | 'bad' | 'neutral';

const toneBorder = (tone: Tone) => {
  if (tone === 'good') return palette.goodLine;
  if (tone === 'warn') return palette.warnLine;
  if (tone === 'bad') return palette.badLine;
  if (tone === 'neutral') return palette.neutralLine;
  return palette.line;
};

const toneFill = (tone: Tone) => {
  if (tone === 'good') return 'rgba(52,211,153,0.96)';
  if (tone === 'warn') return 'rgba(250,204,21,0.95)';
  if (tone === 'bad') return 'rgba(248,113,113,0.95)';
  if (tone === 'neutral') return 'rgba(120,146,185,0.95)';
  return palette.brandBright;
};

export const InsightGrid = ({ children }: { children: React.ReactNode }) => <View style={styles.grid}>{children}</View>;

export const InsightCard = ({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: Tone;
}) => (
  <View style={[styles.card, { borderColor: toneBorder(tone) }]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.helper}>{helper}</Text>
  </View>
);

export const SegmentedControl = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string; badge?: number | string }>;
  onChange: (value: string) => void;
}) => (
  <View style={styles.segmented}>
    {options.map((option) => (
      <Text
        key={option.value}
        onPress={() => onChange(option.value)}
        style={[
          styles.segment,
          option.value === value && styles.segmentActive,
        ]}
      >
        {option.label}
        {option.badge !== undefined ? ` ${option.badge}` : ''}
      </Text>
    ))}
  </View>
);

export const TrendBars = ({
  title,
  subtitle,
  data,
  suffix = '%',
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; value: number; helper?: string }>;
  suffix?: string;
}) => {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.chartTitle}>{subtitle}</Text>
      <View style={styles.barRow}>
        {data.map((item) => (
          <View key={item.label} style={styles.barColumn}>
            <Text style={styles.barValue}>
              {Math.round(item.value)}
              {suffix}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${Math.max(12, (item.value / max) * 100)}%` }]} />
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
            {item.helper ? <Text style={styles.barHelper}>{item.helper}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
};

export const StackedRiskBars = ({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: Array<{
    label: string;
    total: number;
    helper?: string;
    segments: Array<{ value: number; tone: Tone }>;
  }>;
}) => {
  const max = Math.max(...data.map((item) => item.total), 1);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.chartTitle}>{subtitle}</Text>
      <View style={styles.barRow}>
        {data.map((item) => (
          <View key={item.label} style={styles.barColumn}>
            <Text style={styles.barValue}>{item.total}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.stackShell, { height: `${Math.max(12, (item.total / max) * 100)}%` }]}>
                {item.segments.map((segment, index) => (
                  <View
                    key={`${item.label}-${index}`}
                    style={[
                      styles.stackSegment,
                      { height: `${item.total ? (segment.value / item.total) * 100 : 0}%`, backgroundColor: toneFill(segment.tone) },
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
            {item.helper ? <Text style={styles.barHelper}>{item.helper}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
};

export const FunnelChart = ({
  title,
  subtitle,
  stages,
}: {
  title: string;
  subtitle: string;
  stages: Array<{ label: string; count: number; tone?: Tone }>;
}) => {
  const max = Math.max(...stages.map((stage) => stage.count), 1);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.chartTitle}>{subtitle}</Text>
      <View style={styles.funnel}>
        {stages.map((stage) => (
          <View key={stage.label} style={styles.funnelRow}>
            <View style={styles.funnelHead}>
              <Text style={styles.barLabel}>{stage.label}</Text>
              <Text style={styles.barValue}>{stage.count}</Text>
            </View>
            <View style={styles.funnelTrack}>
              <View style={[styles.funnelFill, { width: `${Math.max(12, (stage.count / max) * 100)}%`, backgroundColor: toneFill(stage.tone ?? 'neutral') }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const EmptyStateCard = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <View style={styles.card}>
    <Text style={styles.chartTitle}>{title}</Text>
    <Text style={styles.helper}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelElevated,
    padding: 16,
    gap: 8,
  },
  label: {
    color: palette.mutedStrong,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  value: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  helper: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    color: palette.mutedStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  segmentActive: {
    borderColor: palette.lineBright,
    backgroundColor: palette.brandSoft,
    color: palette.text,
  },
  chartCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelElevated,
    padding: 16,
    gap: 14,
  },
  chartTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  barRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  barColumn: {
    flex: 1,
    gap: 8,
    alignItems: 'center',
  },
  barValue: {
    color: palette.brandBright,
    fontSize: 12,
    fontWeight: '800',
  },
  barTrack: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelMuted,
    padding: 6,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: palette.brandBright,
    minHeight: 10,
  },
  stackShell: {
    width: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  stackSegment: {
    width: '100%',
    borderRadius: 8,
    minHeight: 8,
  },
  barLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  barHelper: {
    color: palette.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  funnel: {
    gap: 12,
  },
  funnelRow: {
    gap: 6,
  },
  funnelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelTrack: {
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panelMuted,
    overflow: 'hidden',
  },
  funnelFill: {
    height: '100%',
    borderRadius: 999,
  },
});

