import React from 'react';

type Tone = 'default' | 'good' | 'warn' | 'bad' | 'neutral';

const toneClass = (tone: Tone) => {
  if (tone === 'good') return 'is-good';
  if (tone === 'warn') return 'is-warn';
  if (tone === 'bad') return 'is-bad';
  if (tone === 'neutral') return 'is-neutral';
  return '';
};

export const InsightMetricCard = ({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: Tone;
}) => (
  <div className={`ct-insight-card ${toneClass(tone)}`}>
    <div className="ct-card-overline">{label}</div>
    <div className="ct-insight-value">{value}</div>
    {helper ? <div className="ct-insight-helper">{helper}</div> : null}
  </div>
);

export const SegmentedFilter = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string; badge?: string | number }>;
  onChange: (value: string) => void;
}) => (
  <div className="ct-segmented-filter" role="tablist">
    {options.map((option) => (
      <button
        key={option.value}
        className={option.value === value ? 'is-active' : ''}
        onClick={() => onChange(option.value)}
        type="button"
      >
        <span>{option.label}</span>
        {option.badge !== undefined ? <strong>{option.badge}</strong> : null}
      </button>
    ))}
  </div>
);

export const TrendBarChart = ({
  title,
  subtitle,
  data,
  suffix = '%',
  maxValue,
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; value: number; helper?: string }>;
  suffix?: string;
  maxValue?: number;
}) => {
  const computedMax = Math.max(maxValue ?? 0, ...data.map((item) => item.value), 1);

  return (
    <section className="ct-trend-surface">
      <div className="ct-trend-surface-head ct-card-head">
        <div className="ct-card-overline">{title}</div>
        <h3 className="ct-card-title">{subtitle}</h3>
      </div>
      <div className="ct-trend-bars">
        {data.map((item) => (
          <div key={item.label} className="ct-trend-column">
            <div className="ct-trend-column-value">
              {Math.round(item.value)}
              {suffix}
            </div>
            <div className="ct-trend-column-track">
              <div className="ct-trend-column-fill" style={{ height: `${Math.max(12, (item.value / computedMax) * 100)}%` }} />
            </div>
            <div className="ct-trend-column-footer">
              <strong>{item.label}</strong>
              {item.helper ? <span>{item.helper}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const StackedTrendChart = ({
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
  const computedMax = Math.max(...data.map((item) => item.total), 1);

  return (
    <section className="ct-trend-surface">
      <div className="ct-trend-surface-head ct-card-head">
        <div className="ct-card-overline">{title}</div>
        <h3 className="ct-card-title">{subtitle}</h3>
      </div>
      <div className="ct-stacked-bars">
        {data.map((item) => (
          <div key={item.label} className="ct-stacked-column">
            <div className="ct-trend-column-value">{item.total}</div>
            <div className="ct-stacked-track">
              <div className="ct-stacked-track-inner" style={{ height: `${Math.max(14, (item.total / computedMax) * 100)}%` }}>
                {item.segments.map((segment, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className={`ct-stacked-segment ${toneClass(segment.tone)}`}
                    style={{ height: `${item.total ? (segment.value / item.total) * 100 : 0}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="ct-trend-column-footer">
              <strong>{item.label}</strong>
              {item.helper ? <span>{item.helper}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const FunnelChart = ({
  title,
  subtitle,
  stages,
}: {
  title: string;
  subtitle: string;
  stages: Array<{ label: string; count: number; helper?: string; tone?: Tone }>;
}) => {
  const max = Math.max(...stages.map((stage) => stage.count), 1);

  return (
    <section className="ct-trend-surface">
      <div className="ct-trend-surface-head ct-card-head">
        <div className="ct-card-overline">{title}</div>
        <h3 className="ct-card-title">{subtitle}</h3>
      </div>
      <div className="ct-funnel">
        {stages.map((stage) => (
          <div key={stage.label} className="ct-funnel-row">
            <div className="ct-funnel-meta">
              <strong>{stage.label}</strong>
              <span>{stage.count}</span>
            </div>
            <div className="ct-funnel-track">
              <div
                className={`ct-funnel-fill ${toneClass(stage.tone ?? 'neutral')}`}
                style={{ width: `${Math.max(12, (stage.count / max) * 100)}%` }}
              />
            </div>
            {stage.helper ? <div className="ct-trend-helper">{stage.helper}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
};

export const PremiumEmptyState = ({
  badge,
  title,
  description,
  steps,
}: {
  badge: string;
  title: string;
  description: string;
  steps: string[];
}) => (
  <div className="ct-empty-state-premium">
    <div className="ct-card-head">
      <div className="ct-card-overline">{badge}</div>
      <h3 className="ct-card-title">{title}</h3>
      <p className="ct-card-copy">{description}</p>
  </div>
    <div className="ct-empty-step-grid">
      {steps.map((step, index) => (
        <div key={step} className="ct-empty-step">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  </div>
);
