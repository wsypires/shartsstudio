import { useEffect, useRef, useMemo } from "react";
import type {
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickData,
  Time,
  SeriesMarker,
} from "lightweight-charts";
import { LineStyle } from "lightweight-charts";
import { ema, sma } from "../../lib/indicators.ts";
import { toIndicatorCandles } from "./utils.ts";
import { useSignalAlertStore } from "../../services/alerts/useSignalAlertStore.ts";
import type { Timeframe } from "./constants.ts";

export interface SignalAlertOverlayHookProps {
  chartRef: React.RefObject<IChartApi | null>;
  candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>;
  chartData: CandlestickData<Time>[];
  selectedSymbol: string;
  timeframe: Timeframe;
  chartEpoch: number;
  currentPrice?: number;
  pipDigits?: number;
}

export function useSignalAlertsOverlay({
  chartRef,
  candleSeriesRef,
  chartData,
  selectedSymbol,
  timeframe,
  chartEpoch,
}: SignalAlertOverlayHookProps): void {
  const rules = useSignalAlertStore((state) => state.rules);
  const logs = useSignalAlertStore((state) => state.logs);

  // References for created price lines and indicator series
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  // Filter active rules for the current symbol and timeframe
  const activeRulesForChart = useMemo(() => {
    return rules.filter((r) => {
      if (!r.enabled) return false;
      const symbolMatch = r.symbol === "ALL" || r.symbol === selectedSymbol;
      const tfMatch = r.timeframe === timeframe || r.timeframe === "15m";
      return symbolMatch && tfMatch;
    });
  }, [rules, selectedSymbol, timeframe]);

  // Clean up all price lines and indicator series on chart recreation
  useEffect(() => {
    priceLinesRef.current = new Map();
    indicatorSeriesRef.current = new Map();
  }, [chartEpoch]);

  // 1. Render Price Level Alert Lines
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    const wantedKeys = new Set<string>();

    for (const rule of activeRulesForChart) {
      for (const cond of rule.conditions) {
        if (cond.config.type === "price_level") {
          const target = cond.config.params.targetPrice;
          const key = `price-alert-${rule.id}-${cond.id}`;
          wantedKeys.add(key);

          const isBuy = rule.action.orderConfig.side === "BUY";
          const color =
            rule.color || (isBuy ? "#10b981" : rule.action.orderConfig.side === "SELL" ? "#ef4444" : "#f59e0b");

          const title = `🔔 [${isBuy ? "COMPRA" : "VENDA"}] ${rule.name}`;

          const existing = priceLinesRef.current.get(key);
          if (existing) {
            existing.applyOptions({ price: target, title, color });
          } else {
            const line = series.createPriceLine({
              price: target,
              color,
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title,
            });
            priceLinesRef.current.set(key, line);
          }
        }
      }
    }

    // Remove obsolete price lines
    for (const [key, line] of priceLinesRef.current) {
      if (!wantedKeys.has(key)) {
        try {
          series.removePriceLine(line);
        } catch {
          /* series might already be disposed */
        }
        priceLinesRef.current.delete(key);
      }
    }
  }, [activeRulesForChart, candleSeriesRef, chartEpoch]);

  // 2. Render Indicator Lines configured in Alert Rules (e.g. EMA 21, EMA 50, SMA)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chartData.length === 0) return;

    const indCandles = toIndicatorCandles(chartData);
    const wantedSeriesKeys = new Set<string>();

    for (const rule of activeRulesForChart) {
      for (const cond of rule.conditions) {
        if (cond.config.type === "price_ma") {
          const { period, maType, operator } = cond.config.params;
          const key = `alert-ma-${rule.id}-${cond.id}-${maType}-${period}`;
          wantedSeriesKeys.add(key);

          const data = maType === "EMA" ? ema(indCandles, period) : sma(indCandles, period);
          if (data.length === 0) continue;

          let s = indicatorSeriesRef.current.get(key);
          if (!s) {
            const isBuy =
              operator === "ema_below_price" ||
              operator === "cross_above" ||
              operator === "price_above" ||
              rule.action.orderConfig.side === "BUY";

            const color =
              rule.color || (isBuy ? "#10b981" : "#ef4444");

            s = chart.addLineSeries({
              color,
              lineWidth: 2,
              lineStyle: LineStyle.Solid,
              priceScaleId: "right",
              title: `Alerta ${maType}(${period}): ${rule.name}`,
            });
            indicatorSeriesRef.current.set(key, s);
          }

          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
        } else if (cond.config.type === "ma_cross") {
          const { fastPeriod, fastType, slowPeriod, slowType } = cond.config.params;
          
          // Fast MA
          const fastKey = `alert-ma-fast-${rule.id}-${cond.id}-${fastType}-${fastPeriod}`;
          wantedSeriesKeys.add(fastKey);
          const fastData = fastType === "EMA" ? ema(indCandles, fastPeriod) : sma(indCandles, fastPeriod);
          if (fastData.length > 0) {
            let sFast = indicatorSeriesRef.current.get(fastKey);
            if (!sFast) {
              sFast = chart.addLineSeries({
                color: "#06b6d4",
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                priceScaleId: "right",
                title: `${fastType}(${fastPeriod})`,
              });
              indicatorSeriesRef.current.set(fastKey, sFast);
            }
            sFast.setData(fastData.map((p) => ({ time: p.time as Time, value: p.value })));
          }

          // Slow MA
          const slowKey = `alert-ma-slow-${rule.id}-${cond.id}-${slowType}-${slowPeriod}`;
          wantedSeriesKeys.add(slowKey);
          const slowData = slowType === "EMA" ? ema(indCandles, slowPeriod) : sma(indCandles, slowPeriod);
          if (slowData.length > 0) {
            let sSlow = indicatorSeriesRef.current.get(slowKey);
            if (!sSlow) {
              sSlow = chart.addLineSeries({
                color: "#f59e0b",
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                priceScaleId: "right",
                title: `${slowType}(${slowPeriod})`,
              });
              indicatorSeriesRef.current.set(slowKey, sSlow);
            }
            sSlow.setData(slowData.map((p) => ({ time: p.time as Time, value: p.value })));
          }
        }
      }
    }

    // Clean up removed indicator series
    for (const [key, series] of indicatorSeriesRef.current) {
      if (!wantedSeriesKeys.has(key)) {
        try {
          chart.removeSeries(series);
        } catch {
          /* already removed */
        }
        indicatorSeriesRef.current.delete(key);
      }
    }
  }, [activeRulesForChart, chartData, chartRef, chartEpoch]);

  // 3. Render Historical Trigger Markers on Candlestick Series
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series || chartData.length === 0) return;

    // Filter recent logs for this symbol (last 50 triggers)
    const recentLogs = logs
      .filter((l) => l.symbol === selectedSymbol || l.symbol === "ALL")
      .slice(0, 50);

    if (recentLogs.length === 0) {
      try {
        series.setMarkers([]);
      } catch {
        /* ignore */
      }
      return;
    }

    const markers: SeriesMarker<Time>[] = [];

    // Map each log to the closest candle time
    for (const log of recentLogs) {
      const logSec = Math.floor(log.triggeredAt / 1000);
      // Find closest candle time in chartData
      let closestCandleTime: Time | null = null;
      let minDiff = Infinity;

      for (const bar of chartData) {
        const barSec = bar.time as number;
        const diff = Math.abs(barSec - logSec);
        if (diff < minDiff && diff <= 3600 * 4) {
          minDiff = diff;
          closestCandleTime = bar.time;
        }
      }

      if (closestCandleTime != null) {
        const isBuy = log.orderSide === "BUY" || log.conditionSummary.toLowerCase().includes("compra");
        const sideLabel = isBuy ? "BUY" : "SELL";
        markers.push({
          time: closestCandleTime,
          position: isBuy ? "belowBar" : "aboveBar",
          color: isBuy ? "#10b981" : "#ef4444",
          shape: isBuy ? "arrowUp" : "arrowDown",
          text: `🔔 ${sideLabel}: ${log.ruleName.slice(0, 16)}`,
          size: 1,
        });
      }
    }

    // Sort markers by time ascending as required by lightweight-charts
    markers.sort((a, b) => (a.time as number) - (b.time as number));

    try {
      series.setMarkers(markers);
    } catch {
      /* ignore */
    }
  }, [logs, chartData, candleSeriesRef, selectedSymbol]);
}
