import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  STAT_CHART_ALL_SERIES,
  STAT_CHART_DEFAULT_VISIBLE,
  STAT_CHART_GOLD,
  STAT_CHART_GOLD_DIM,
  STAT_CHART_GROUPS,
  resolveChartIconUri,
} from './buildStatChartConfig';
import { ChartPointTooltip } from './ChartPointTooltip';
import { optimizeItemOrder } from './buildStatProgression';

const MARGIN = { top: 28, right: 24, bottom: 12, left: 52 };
const X_AXIS_HEIGHT = 72;

function resolveIconUri(localIcon) {
  return resolveChartIconUri(localIcon);
}

function buildLinearPath(points) {
  if (!points.length) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function buildAreaPath(linePath, points, bottomY) {
  if (!points.length || !linePath) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${bottomY.toFixed(1)} L ${first.x.toFixed(1)} ${bottomY.toFixed(1)} Z`;
}

function computeNiceYMax(maxVal) {
  if (maxVal <= 0) return 10;
  if (maxVal <= 40) {
    const step = maxVal <= 12 ? 2 : 5;
    return Math.max(step, Math.ceil(maxVal / step) * step);
  }
  const step = 250;
  const rounded = Math.ceil(maxVal / step) * step;
  return Math.max(step, rounded);
}

function ChartSvg({
  chartId,
  width,
  plotHeight,
  yMax,
  yTicks,
  xTicks,
  paths,
  hoverPoint,
  hoverIndex,
  animate,
  onSelectIndex,
}) {
  const plotBottom = plotHeight - MARGIN.bottom;
  const plotTop = MARGIN.top;
  const pointCount = paths[0]?.points?.length || 0;
  const hitRadius = pointCount > 6 ? 14 : 18;

  const defs = paths
    .filter((s) => s.area)
    .map((s) =>
      React.createElement(
        'linearGradient',
        {
          key: `grad-${s.key}`,
          id: `${chartId}-grad-${s.key}`,
          x1: '0',
          y1: '0',
          x2: '0',
          y2: '1',
        },
        React.createElement('stop', { offset: '5%', stopColor: s.color, stopOpacity: 0.35 }),
        React.createElement('stop', { offset: '95%', stopColor: s.color, stopOpacity: 0.02 })
      )
    );

  return React.createElement(
    'svg',
    {
      width,
      height: plotHeight,
      xmlns: 'http://www.w3.org/2000/svg',
      style: { display: 'block', pointerEvents: 'none' },
    },
    React.createElement('defs', null, ...defs),
    yTicks.map((tick) =>
      React.createElement(
        'g',
        { key: tick.key },
        React.createElement('line', {
          x1: MARGIN.left,
          y1: tick.y,
          x2: width - MARGIN.right,
          y2: tick.y,
          stroke: 'rgba(148, 163, 184, 0.14)',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        }),
        React.createElement(
          'text',
          {
            x: MARGIN.left - 10,
            y: tick.y + 4,
            fill: '#64748b',
            fontSize: 11,
            fontWeight: 500,
            textAnchor: 'end',
          },
          tick.label
        )
      )
    ),
    xTicks.map((tick) =>
      React.createElement('line', {
        key: tick.key,
        x1: tick.x,
        y1: plotTop,
        x2: tick.x,
        y2: plotBottom,
        stroke: 'rgba(148, 163, 184, 0.1)',
        strokeWidth: 1,
        strokeDasharray: '4 4',
      })
    ),
    paths.map((series) =>
      React.createElement(
        'g',
        { key: series.key },
        series.areaPath
          ? React.createElement('path', {
              d: series.areaPath,
              fill: `url(#${chartId}-grad-${series.key})`,
              stroke: 'none',
            })
          : null,
        React.createElement('path', {
          d: series.d,
          stroke: series.color,
          strokeWidth: 2,
          fill: 'none',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: animate
            ? {
                strokeDasharray: 1400,
                animation: 'buildStatChartDraw 1s ease-out forwards',
              }
            : undefined,
        }),
        series.points.map((pt, i) =>
          React.createElement('circle', {
            key: `${series.key}-pt-${i}`,
            cx: pt.x,
            cy: pt.y,
            r: hoverIndex === i ? 0 : 5,
            fill: series.color,
            opacity: hoverIndex != null ? 0.35 : 0.9,
          })
        )
      )
    ),
    pointCount > 0
      ? Array.from({ length: pointCount }, (_, i) => {
          const x = paths[0]?.points?.[i]?.x;
          if (typeof x !== 'number') return null;
          return React.createElement('circle', {
            key: `hit-${i}`,
            cx: x,
            cy: (plotTop + plotBottom) / 2,
            r: hitRadius,
            fill: 'transparent',
            style: { pointerEvents: 'all', cursor: 'pointer' },
            onClick: (e) => {
              e?.stopPropagation?.();
              onSelectIndex?.(i);
            },
          });
        })
      : null,
    hoverPoint
      ? React.createElement('line', {
          x1: hoverPoint.x,
          y1: plotTop,
          x2: hoverPoint.x,
          y2: plotBottom,
          stroke: STAT_CHART_GOLD_DIM,
          strokeWidth: 1.5,
        })
      : null,
    hoverIndex != null
      ? paths.flatMap((series) => {
          const pt = series.points[hoverIndex];
          if (!pt) return [];
          return [
            React.createElement('circle', {
              key: `${series.key}-hover-ring`,
              cx: pt.x,
              cy: pt.y,
              r: 7,
              fill: '#0a0e18',
              stroke: series.color,
              strokeWidth: 2.5,
            }),
            React.createElement('circle', {
              key: `${series.key}-hover-dot`,
              cx: pt.x,
              cy: pt.y,
              r: 4,
              fill: series.color,
            }),
          ];
        })
      : null,
    React.createElement(
      'text',
      {
        x: 14,
        y: plotHeight / 2,
        fill: '#475569',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.6,
        transform: `rotate(-90 14 ${plotHeight / 2})`,
        textAnchor: 'middle',
      },
      'Cumulative value'
    )
  );
}

function ChartStyles() {
  if (Platform.OS !== 'web') return null;
  return React.createElement(
    'style',
    null,
    `@keyframes buildStatChartDraw {
      from { stroke-dashoffset: 1400; opacity: 0.4; }
      to { stroke-dashoffset: 0; opacity: 1; }
    }`
  );
}

function SeriesLegend({ visible, onToggle, compact }) {
  return (
    <View style={[styles.legendWrap, compact && styles.legendWrapCompact]}>
      {STAT_CHART_GROUPS.map((group) => (
        <View key={group.id} style={styles.legendGroupRow}>
          <Text style={styles.legendGroupLabel}>{group.label}</Text>
          <View style={styles.legendChipRow}>
            {group.series.map((s) => {
              const on = visible[s.key];
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.legendChip,
                    on && styles.legendChipOn,
                    on && { borderColor: s.color, backgroundColor: `${s.color}22` },
                  ]}
                  onPress={() => onToggle(s.key)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.legendDot, { backgroundColor: s.color, opacity: on ? 1 : 0.35 }]} />
                  <Text style={[styles.legendChipText, on && { color: s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function XAxisIcons({ chartData, xLabels, getStepIconUri, godPortraitUri, activeIndex, onSelectIndex }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.xAxisScroll}
      contentContainerStyle={styles.xAxisScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {xLabels.map((label) => {
        const row = chartData[label.index];
        const uri = row?.isBase ? godPortraitUri : getStepIconUri?.(row);
        const name = row?.label || label.label;
        const isActive = activeIndex === label.index;
        return (
          <Pressable
            key={label.key}
            style={[styles.xAxisSlotFlex, isActive && styles.xAxisSlotFlexActive]}
            onPress={() => onSelectIndex?.(label.index)}
          >
            <View style={[styles.xAxisIconFrame, isActive && styles.xAxisIconFrameActive]}>
              {uri ? (
                <Image source={{ uri }} style={styles.xAxisIcon} resizeMode="contain" />
              ) : (
                <View style={styles.xAxisIconPlaceholder} />
              )}
            </View>
            <Text style={[styles.xAxisLabel, isActive && styles.xAxisLabelActive]} numberOfLines={2}>
              {name.length > 14 ? `${name.slice(0, 13)}…` : name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function StatChartBody({
  data = [],
  plotHeight = 320,
  compact = false,
  getStepIconUri,
  godPortraitUri,
  god,
  godLevel = 20,
  finalItems = [],
  onApplyOptimizedOrder,
}) {
  const chartId = useId().replace(/:/g, '');
  const [visible, setVisible] = useState(() => ({ ...STAT_CHART_DEFAULT_VISIBLE }));
  const [chartWidth, setChartWidth] = useState(640);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [animateKey, setAnimateKey] = useState(0);
  const [optimizing, setOptimizing] = useState(false);

  const chartData = useMemo(() => data.map((row) => ({ ...row, name: row.shortLabel || row.label })), [data]);
  const activeSeries = STAT_CHART_ALL_SERIES.filter((s) => visible[s.key]);
  const optimizeStatKey = activeSeries[0]?.key || 'int';
  const optimizeStatLabel = activeSeries[0]?.label || 'INT';
  const seriesSignature = useMemo(
    () => `${activeSeries.map((s) => s.key).join(',')}:${chartData.length}`,
    [activeSeries, chartData.length]
  );

  useEffect(() => {
    setAnimateKey((k) => k + 1);
  }, [seriesSignature]);

  const chartModel = useMemo(() => {
    const innerW = Math.max(1, chartWidth - MARGIN.left - MARGIN.right);
    const innerH = Math.max(1, plotHeight - MARGIN.top - MARGIN.bottom);
    const plotBottom = plotHeight - MARGIN.bottom;
    const n = chartData.length;

    if (n < 2 || !activeSeries.length) {
      return { paths: [], yTicks: [], xLabels: [], hoverPoint: null, yMax: 250 };
    }

    const values = chartData.flatMap((row) => activeSeries.map((s) => Number(row[s.key] || 0)));
    const yMax = computeNiceYMax(Math.max(...values, 1));

    const xAt = (index) => MARGIN.left + (index / (n - 1)) * innerW;
    const yAt = (value) => MARGIN.top + innerH - (value / yMax) * innerH;

    const paths = activeSeries.map((s) => {
      const points = chartData.map((row, i) => ({
        x: xAt(i),
        y: yAt(Number(row[s.key] || 0)),
      }));
      const d = buildLinearPath(points);
      return {
        key: s.key,
        color: s.color,
        area: s.area,
        d,
        points,
        areaPath: s.area ? buildAreaPath(d, points, plotBottom) : null,
      };
    });

    const tickCount = 4;
    const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
      const value = (yMax * i) / tickCount;
      return { key: `y-${i}`, y: yAt(value), label: Math.round(value).toString() };
    });

    const xLabels = chartData.map((row, i) => ({
      key: `x-${i}`,
      x: xAt(i),
      label: row.name,
      index: i,
    }));

    let hoverPoint = null;
    if (hoverIndex != null && chartData[hoverIndex]) {
      hoverPoint = { x: xAt(hoverIndex), row: chartData[hoverIndex] };
    }

    return { paths, yTicks, xLabels, hoverPoint, yMax };
  }, [chartData, activeSeries, chartWidth, plotHeight, hoverIndex]);

  const toggleSeries = (key) => setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleOptimizeCurves = () => {
    if (!god || !onApplyOptimizedOrder) return;
    const slots = Array.isArray(finalItems) ? finalItems : [];
    const equippedCount = slots.filter(Boolean).length;
    if (equippedCount < 2) return;
    setOptimizing(true);
    try {
      const ordered = optimizeItemOrder(god, godLevel, slots, optimizeStatKey);
      onApplyOptimizedOrder(ordered);
      setAnimateKey((k) => k + 1);
    } finally {
      setOptimizing(false);
    }
  };

  const handlePointer = (evt) => {
    const ne = evt?.nativeEvent;
    let x = ne?.offsetX;
    if (typeof x !== 'number' && typeof ne?.locationX === 'number') {
      x = ne.locationX;
    }
    if (typeof x !== 'number' && Platform.OS === 'web') {
      const touch = ne?.touches?.[0] || ne?.changedTouches?.[0];
      const target = evt?.currentTarget;
      if (touch && target?.getBoundingClientRect) {
        const rect = target.getBoundingClientRect();
        x = touch.clientX - rect.left;
      }
    }
    if (typeof x !== 'number' || chartData.length < 2) return;
    const innerW = Math.max(1, chartWidth - MARGIN.left - MARGIN.right);
    const ratio = (x - MARGIN.left) / innerW;
    const idx = Math.round(ratio * (chartData.length - 1));
    setHoverIndex(Math.max(0, Math.min(chartData.length - 1, idx)));
  };

  const selectPoint = (index) => {
    if (index == null || index < 0 || index >= chartData.length) return;
    setHoverIndex(index);
  };

  if (!chartData.length || chartData.length < 2) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Stat chart</Text>
        <Text style={styles.emptyText}>Add items to see cumulative progression.</Text>
      </View>
    );
  }

  const tooltipLeft = chartModel.hoverPoint
    ? chartModel.hoverPoint.x > chartWidth * 0.55
      ? Math.max(8, chartModel.hoverPoint.x - 168)
      : Math.min(chartModel.hoverPoint.x + 14, chartWidth - 160)
    : 0;

  const hoverIconUri = chartModel.hoverPoint
    ? chartModel.hoverPoint.row.isBase
      ? godPortraitUri
      : getStepIconUri?.(chartModel.hoverPoint.row)
    : null;

  const useDockedTooltip = compact || chartWidth < 520;

  return (
    <View style={styles.bodyWrap}>
      <ChartStyles />
      <SeriesLegend visible={visible} onToggle={toggleSeries} compact={compact} />

      {!compact ? (
        <View style={styles.toolbarRow}>
          <TouchableOpacity
            style={[styles.toolbarBtn, optimizing && styles.toolbarBtnBusy]}
            onPress={handleOptimizeCurves}
            disabled={optimizing || !onApplyOptimizedOrder || (finalItems || []).filter(Boolean).length < 2}
            activeOpacity={0.85}
          >
            <Text style={styles.toolbarBtnText}>{optimizing ? 'Optimizing…' : 'Optimize curves'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {!compact ? (
        <Text style={styles.optimizeHint}>
          Optimizing for:{' '}
          <Text style={styles.optimizeHintAccent}>{optimizeStatLabel}</Text>
          {' · '}Reorders item slots for best {optimizeStatLabel} per purchase (moderate gold bias)
        </Text>
      ) : null}

      <View
        style={[styles.chartShell, compact && styles.chartShellCompact]}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        <View style={{ height: plotHeight, position: 'relative' }}>
          <ChartSvg
            key={animateKey}
            chartId={chartId}
            width={chartWidth}
            plotHeight={plotHeight}
            yMax={chartModel.yMax}
            yTicks={chartModel.yTicks}
            xTicks={chartModel.xLabels}
            paths={chartModel.paths}
            hoverPoint={chartModel.hoverPoint}
            hoverIndex={hoverIndex}
            animate
            onSelectIndex={selectPoint}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.chartTouchLayer,
            ]}
            onMouseMove={handlePointer}
            onMouseLeave={() => setHoverIndex(null)}
            onTouchStart={handlePointer}
            onTouchMove={handlePointer}
          />
          {chartModel.hoverPoint && !useDockedTooltip ? (
            <ChartPointTooltip
              row={chartModel.hoverPoint.row}
              series={activeSeries}
              iconUri={hoverIconUri}
              style={{ left: tooltipLeft }}
            />
          ) : null}
        </View>
        <XAxisIcons
          chartData={chartData}
          xLabels={chartModel.xLabels}
          getStepIconUri={getStepIconUri}
          godPortraitUri={godPortraitUri}
          activeIndex={hoverIndex}
          onSelectIndex={setHoverIndex}
        />
        {chartModel.hoverPoint && useDockedTooltip ? (
          <ChartPointTooltip
            row={chartModel.hoverPoint.row}
            series={activeSeries}
            iconUri={hoverIconUri}
            docked
          />
        ) : null}
      </View>
    </View>
  );
}

export function BuildStatChartModal({
  visible,
  onClose,
  onStatSheet,
  data,
  getStepIconUri,
  godPortraitUri,
  god,
  godLevel,
  finalItems,
  onApplyOptimizedOrder,
}) {
  if (Platform.OS !== 'web') return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e?.stopPropagation?.()}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Stat chart</Text>
            <TouchableOpacity
              style={styles.modalStatSheetBtn}
              onPress={() => {
                onStatSheet?.();
                onClose?.();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalStatSheetText}>Stat sheet</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <StatChartBody
              data={data}
              plotHeight={340}
              getStepIconUri={getStepIconUri}
              godPortraitUri={godPortraitUri}
              god={god}
              godLevel={godLevel}
              finalItems={finalItems}
              onApplyOptimizedOrder={onApplyOptimizedOrder}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function BuildStatChart({
  data = [],
  height = 220,
  godPortraitUri,
  getStepIconUri,
  onOpenModal,
}) {
  if (Platform.OS !== 'web') return null;

  const compactPlotHeight = Math.max(160, height - X_AXIS_HEIGHT - 8);

  return (
    <View style={styles.wrap}>
      <View style={styles.inlineHeaderRow}>
        <Text style={styles.inlineTitle}>Stat chart</Text>
        {onOpenModal ? (
          <TouchableOpacity style={styles.expandBtn} onPress={onOpenModal} activeOpacity={0.85}>
            <Text style={styles.expandBtnText}>Expand</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <StatChartBody
        data={data}
        plotHeight={compactPlotHeight + X_AXIS_HEIGHT}
        compact
        getStepIconUri={getStepIconUri}
        godPortraitUri={godPortraitUri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    marginTop: 4,
  },
  bodyWrap: {
    width: '100%',
  },
  inlineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inlineTitle: {
    color: STAT_CHART_GOLD,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  expandBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: STAT_CHART_GOLD_DIM,
    backgroundColor: 'rgba(201, 162, 39, 0.08)',
  },
  expandBtnText: {
    color: STAT_CHART_GOLD,
    fontSize: 11,
    fontWeight: '700',
  },
  legendWrap: {
    gap: 8,
    marginBottom: 10,
  },
  legendWrapCompact: {
    gap: 6,
    marginBottom: 6,
  },
  legendGroupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  legendGroupLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    width: 72,
    paddingTop: 6,
  },
  legendChipRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0b1220',
  },
  legendChipOn: {
    borderWidth: 1.5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendChipText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  toolbarBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: STAT_CHART_GOLD_DIM,
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
  },
  toolbarBtnBusy: {
    opacity: 0.65,
  },
  toolbarBtnText: {
    color: STAT_CHART_GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optimizeHint: {
    color: '#475569',
    fontSize: 10,
    marginBottom: 8,
    lineHeight: 14,
  },
  optimizeHintAccent: {
    color: STAT_CHART_GOLD,
    fontWeight: '800',
  },
  chartShell: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STAT_CHART_GOLD_DIM,
    backgroundColor: '#060a12',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: 'inset 0 0 0 1px rgba(201,162,39,0.08), 0 16px 40px rgba(0,0,0,0.45)' }
      : {}),
  },
  chartShellCompact: {
    borderColor: 'rgba(125, 211, 252, 0.22)',
  },
  chartTouchLayer: {
    zIndex: 3,
    ...(Platform.OS === 'web' ? { cursor: 'crosshair', touchAction: 'none' } : {}),
  },
  xAxisScroll: {
    marginTop: 4,
    marginBottom: 6,
    maxHeight: X_AXIS_HEIGHT,
  },
  xAxisScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  xAxisSlotFlex: {
    width: 56,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  xAxisSlotFlexActive: {
    opacity: 1,
  },
  xAxisIconFrameActive: {
    borderColor: STAT_CHART_GOLD,
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
  },
  xAxisIconFrame: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: STAT_CHART_GOLD_DIM,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  xAxisIcon: {
    width: 28,
    height: 28,
  },
  xAxisIconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  xAxisLabel: {
    marginTop: 3,
    color: '#64748b',
    fontSize: 8,
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: 10,
    maxWidth: 56,
  },
  xAxisLabelActive: {
    color: STAT_CHART_GOLD,
  },
  emptyWrap: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1220',
  },
  emptyTitle: {
    color: STAT_CHART_GOLD,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 960,
    maxHeight: '92vh',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: STAT_CHART_GOLD,
    backgroundColor: '#060a12',
    padding: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 24px 64px rgba(0,0,0,0.65)' }
      : {}),
  },
  modalScroll: {
    flexGrow: 0,
    maxHeight: '78vh',
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STAT_CHART_GOLD_DIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: STAT_CHART_GOLD,
    fontSize: 16,
    fontWeight: '700',
  },
  modalTitle: {
    flex: 1,
    color: STAT_CHART_GOLD,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  modalStatSheetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: STAT_CHART_GOLD,
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
  },
  modalStatSheetText: {
    color: STAT_CHART_GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
