import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Image } from 'expo-image';
import {
  STAT_CHART_ALL_SERIES,
  STAT_CHART_DEFAULT_VISIBLE,
  STAT_CHART_GOLD,
  STAT_CHART_GOLD_DIM,
  STAT_CHART_GROUPS,
} from './buildStatChartConfig';
import { ChartPointTooltip } from './ChartPointTooltip';
import { optimizeItemOrder } from './buildStatProgression';

const MARGIN = { top: 28, right: 24, bottom: 12, left: 52 };
const X_AXIS_HEIGHT = 72;

function buildLinearPath(points) {
  if (!points.length) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
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

function SeriesLegend({ visible, onToggle }) {
  return (
    <View style={styles.legendWrap}>
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

function NativeChartSvg({ width, plotHeight, yMax, yTicks, paths, hoverIndex }) {
  const plotBottom = plotHeight - MARGIN.bottom;
  const plotTop = MARGIN.top;

  return (
    <Svg width={width} height={plotHeight}>
      {yTicks.map((tick) => (
        <React.Fragment key={tick.key}>
          <Line
            x1={MARGIN.left}
            y1={tick.y}
            x2={width - MARGIN.right}
            y2={tick.y}
            stroke="rgba(148, 163, 184, 0.14)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <SvgText
            x={MARGIN.left - 10}
            y={tick.y + 4}
            fill="#64748b"
            fontSize={11}
            fontWeight="500"
            textAnchor="end"
          >
            {tick.label}
          </SvgText>
        </React.Fragment>
      ))}
      {paths.map((series) => (
        <React.Fragment key={series.key}>
          {series.d ? (
            <Path
              d={series.d}
              stroke={series.color}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {series.points.map((pt, i) => (
            <Circle
              key={`${series.key}-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoverIndex === i ? 5 : 3}
              fill={series.color}
              opacity={hoverIndex != null && hoverIndex !== i ? 0.35 : 0.9}
            />
          ))}
        </React.Fragment>
      ))}
      <Line
        x1={MARGIN.left}
        y1={plotTop}
        x2={MARGIN.left}
        y2={plotBottom}
        stroke="rgba(148, 163, 184, 0.2)"
        strokeWidth={1}
      />
      <Line
        x1={MARGIN.left}
        y1={plotBottom}
        x2={width - MARGIN.right}
        y2={plotBottom}
        stroke="rgba(148, 163, 184, 0.2)"
        strokeWidth={1}
      />
    </Svg>
  );
}

function StatChartBody({
  data = [],
  plotHeight = 320,
  getStepIconUri,
  godPortraitUri,
  god,
  godLevel = 20,
  finalItems = [],
  onApplyOptimizedOrder,
}) {
  const [visible, setVisible] = useState(() => ({ ...STAT_CHART_DEFAULT_VISIBLE }));
  const [chartWidth, setChartWidth] = useState(320);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  const chartData = useMemo(() => data.map((row) => ({ ...row, name: row.shortLabel || row.label })), [data]);
  const activeSeries = STAT_CHART_ALL_SERIES.filter((s) => visible[s.key]);
  const optimizeStatKey = activeSeries[0]?.key || 'int';
  const optimizeStatLabel = activeSeries[0]?.label || 'INT';

  const chartModel = useMemo(() => {
    const innerW = Math.max(1, chartWidth - MARGIN.left - MARGIN.right);
    const innerH = Math.max(1, plotHeight - MARGIN.top - MARGIN.bottom);
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
      return { key: s.key, color: s.color, d: buildLinearPath(points), points };
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

  const handlePointer = (evt) => {
    const x = evt?.nativeEvent?.locationX;
    if (typeof x !== 'number' || chartData.length < 2) return;
    const innerW = Math.max(1, chartWidth - MARGIN.left - MARGIN.right);
    const ratio = (x - MARGIN.left) / innerW;
    const idx = Math.round(ratio * (chartData.length - 1));
    setHoverIndex(Math.max(0, Math.min(chartData.length - 1, idx)));
  };

  const handleOptimizeCurves = () => {
    if (!god || !onApplyOptimizedOrder) return;
    const slots = Array.isArray(finalItems) ? finalItems : [];
    const equippedCount = slots.filter(Boolean).length;
    if (equippedCount < 2) return;
    setOptimizing(true);
    try {
      const ordered = optimizeItemOrder(god, godLevel, slots, optimizeStatKey);
      onApplyOptimizedOrder(ordered);
    } finally {
      setOptimizing(false);
    }
  };

  if (!chartData.length || chartData.length < 2) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Stat chart</Text>
        <Text style={styles.emptyText}>Add items to see cumulative progression.</Text>
      </View>
    );
  }

  const hoverIconUri = chartModel.hoverPoint
    ? chartModel.hoverPoint.row.isBase
      ? godPortraitUri
      : getStepIconUri?.(chartModel.hoverPoint.row)
    : null;

  return (
    <View style={styles.bodyWrap}>
      <SeriesLegend visible={visible} onToggle={toggleSeries} />
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
      <Text style={styles.optimizeHint}>
        Optimizing for: <Text style={styles.optimizeHintAccent}>{optimizeStatLabel}</Text>
      </Text>
      <View
        style={styles.chartShell}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        <View style={{ height: plotHeight, position: 'relative' }}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <NativeChartSvg
              width={chartWidth}
              plotHeight={plotHeight}
              yMax={chartModel.yMax}
              yTicks={chartModel.yTicks}
              paths={chartModel.paths}
              hoverIndex={hoverIndex}
            />
          </View>
          <View
            style={[StyleSheet.absoluteFill, styles.chartTouchLayer]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handlePointer}
            onResponderMove={handlePointer}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.xLabelScroll}>
          {chartData.map((row, i) => {
            const uri = row.isBase ? godPortraitUri : getStepIconUri?.(row);
            const isActive = hoverIndex === i;
            return (
              <Pressable
                key={`x-${i}`}
                style={[styles.xLabelSlot, isActive && styles.xLabelSlotActive]}
                onPress={() => setHoverIndex(i)}
              >
                <View style={[styles.xAxisIconFrame, isActive && styles.xAxisIconFrameActive]}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.xAxisIcon} contentFit="contain" />
                  ) : (
                    <View style={styles.xAxisIconPlaceholder} />
                  )}
                </View>
                <Text style={[styles.xAxisLabel, isActive && styles.xAxisLabelActive]} numberOfLines={2}>
                  {row.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {chartModel.hoverPoint ? (
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
  data,
  getStepIconUri,
  godPortraitUri,
  god,
  godLevel,
  finalItems,
  onApplyOptimizedOrder,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e?.stopPropagation?.()}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Stat chart</Text>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <StatChartBody
              data={data}
              plotHeight={280}
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

export default function BuildStatChart() {
  return null;
}

const styles = StyleSheet.create({
  bodyWrap: { width: '100%' },
  emptyWrap: { padding: 20, alignItems: 'center' },
  emptyTitle: { color: STAT_CHART_GOLD, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  legendWrap: { gap: 8, marginBottom: 10 },
  legendGroupRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  legendGroupLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    width: 72,
    paddingTop: 6,
  },
  legendChipRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
  legendChipOn: { borderWidth: 1.5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendChipText: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  toolbarRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  toolbarBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: STAT_CHART_GOLD_DIM,
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
  },
  toolbarBtnBusy: { opacity: 0.65 },
  toolbarBtnText: {
    color: STAT_CHART_GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optimizeHint: { color: '#475569', fontSize: 10, marginBottom: 8, lineHeight: 14 },
  optimizeHintAccent: { color: STAT_CHART_GOLD, fontWeight: '800' },
  chartShell: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STAT_CHART_GOLD_DIM,
    backgroundColor: '#060a12',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  chartTouchLayer: {
    zIndex: 3,
  },
  xLabelScroll: { marginTop: 4, paddingHorizontal: 8 },
  xLabelSlot: { width: 56, alignItems: 'center', marginRight: 8 },
  xLabelSlotActive: { opacity: 1 },
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
  xAxisIconFrameActive: {
    borderColor: STAT_CHART_GOLD,
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
  },
  xAxisIcon: { width: 28, height: 28 },
  xAxisIconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  xAxisLabel: { color: '#64748b', fontSize: 9, textAlign: 'center', marginTop: 4 },
  xAxisLabelActive: { color: STAT_CHART_GOLD, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0b1220',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderBottomWidth: 0,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    gap: 10,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
  modalTitle: { color: STAT_CHART_GOLD, fontSize: 16, fontWeight: '800', flex: 1 },
  modalScroll: { maxHeight: '100%' },
  modalScrollContent: { padding: 12, paddingBottom: 28 },
});
