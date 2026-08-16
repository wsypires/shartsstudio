import type { CandleData } from "../../lib/indicators.ts";
import { atr, bollingerBands, ema, macd, rsi, sma } from "../../lib/indicators.ts";
import type { ConditionParams, RuleCondition, SignalRule } from "./types.ts";

export interface EvaluationResult {
  triggered: boolean;
  suggestedSide: "BUY" | "SELL";
  conditionSummaries: string[];
  currentPrice: number;
}

export function formatConditionDescription(config: ConditionParams): string {
  switch (config.type) {
    case "price_level": {
      const opNames = {
        cross_above: "Cruza Acima de",
        cross_below: "Cruza Abaixo de",
        greater_than: "Preço >",
        less_than: "Preço <",
      };
      return `${opNames[config.params.operator]} ${config.params.targetPrice}`;
    }
    case "rsi": {
      return `RSI(${config.params.period}) ${config.params.operator} ${config.params.threshold}`;
    }
    case "ma_cross": {
      const dirName = config.params.direction === "golden_cross" ? "Cruza Acima (Golden Cross)" : "Cruza Abaixo (Death Cross)";
      return `${config.params.fastType}(${config.params.fastPeriod}) ${dirName} ${config.params.slowType}(${config.params.slowPeriod})`;
    }
    case "price_ma": {
      const { period, maType, operator } = config.params;
      if (operator === "cross_above") {
        return `Preço Cruza Acima de ${maType}(${period}) [Cruzamento Bullish]`;
      }
      if (operator === "cross_below") {
        return `Preço Cruza Abaixo de ${maType}(${period}) [Cruzamento Bearish]`;
      }
      if (operator === "price_above" || operator === "ema_below_price") {
        return `${maType}(${period}) Confirmada Abaixo do Preço (Preço > ${maType}) [Sinal COMPRA]`;
      }
      if (operator === "price_below" || operator === "ema_above_price") {
        return `${maType}(${period}) Confirmada Acima do Preço (Preço < ${maType}) [Sinal VENDA]`;
      }
      return `Preço ${operator} ${maType}(${period})`;
    }
    case "macd": {
      const eventNames = {
        macd_cross_signal_bullish: "Linha MACD Cruza Acima do Sinal",
        macd_cross_signal_bearish: "Linha MACD Cruza Abaixo do Sinal",
        hist_turn_positive: "Histograma MACD vira Positivo (>0)",
        hist_turn_negative: "Histograma MACD vira Negativo (<0)",
      };
      return `MACD(${config.params.fastPeriod},${config.params.slowPeriod},${config.params.signalPeriod}): ${eventNames[config.params.event]}`;
    }
    case "bollinger": {
      const bbEvents = {
        touch_upper: "Toca Banda Superior (Upper)",
        touch_lower: "Toca Banda Inferior (Lower)",
        breakout_upper: "Rompimento Acima da Banda Superior",
        breakout_lower: "Rompimento Abaixo da Banda Inferior",
      };
      return `Bollinger(${config.params.period}, ${config.params.stdDev}σ): ${bbEvents[config.params.event]}`;
    }
    case "atr_volatility": {
      return `ATR(${config.params.period}) ${config.params.operator} ${config.params.threshold}`;
    }
    case "volume_surge": {
      return `Volume > ${config.params.multiplier}x da Média(${config.params.period})`;
    }
  }
}

function evaluateCondition(
  condition: RuleCondition,
  candles: CandleData[],
  currentPrice: number,
  prevPrice: number,
): { met: boolean; summary: string; bullishOrBearish: "BUY" | "SELL" | "NEUTRAL" } {
  if (candles.length < 5) {
    return { met: false, summary: "Aguardando histórico suficiente de velas", bullishOrBearish: "NEUTRAL" };
  }

  const lastCandle = candles[candles.length - 1]!;
  const prevCandle = candles[candles.length - 2]!;
  const config = condition.config;

  switch (config.type) {
    case "price_level": {
      const target = config.params.targetPrice;
      let met = false;
      let bias: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";

      if (config.params.operator === "greater_than") {
        met = currentPrice >= target;
        bias = "BUY";
      } else if (config.params.operator === "less_than") {
        met = currentPrice <= target;
        bias = "SELL";
      } else if (config.params.operator === "cross_above") {
        met = prevPrice < target && currentPrice >= target;
        bias = "BUY";
      } else if (config.params.operator === "cross_below") {
        met = prevPrice > target && currentPrice <= target;
        bias = "SELL";
      }

      return {
        met,
        summary: `Preço (${currentPrice.toFixed(2)}) ${formatConditionDescription(config)}`,
        bullishOrBearish: bias,
      };
    }

    case "rsi": {
      const rsiPoints = rsi(candles, config.params.period);
      if (rsiPoints.length < 2) return { met: false, summary: "RSI calculando...", bullishOrBearish: "NEUTRAL" };
      const currentRsi = rsiPoints[rsiPoints.length - 1]!.value;
      const prevRsi = rsiPoints[rsiPoints.length - 2]!.value;
      const threshold = config.params.threshold;

      let met = false;
      if (config.params.operator === ">") met = currentRsi > threshold;
      else if (config.params.operator === "<") met = currentRsi < threshold;
      else if (config.params.operator === "cross_above") met = prevRsi <= threshold && currentRsi > threshold;
      else if (config.params.operator === "cross_below") met = prevRsi >= threshold && currentRsi < threshold;

      const bias = threshold <= 40 ? "BUY" : threshold >= 60 ? "SELL" : currentRsi > threshold ? "BUY" : "SELL";
      return {
        met,
        summary: `RSI(${config.params.period}) = ${currentRsi.toFixed(1)} (alvo: ${config.params.operator} ${threshold})`,
        bullishOrBearish: bias,
      };
    }

    case "ma_cross": {
      const { fastPeriod, fastType, slowPeriod, slowType, direction } = config.params;
      const fastSeries = fastType === "EMA" ? ema(candles, fastPeriod) : sma(candles, fastPeriod);
      const slowSeries = slowType === "EMA" ? ema(candles, slowPeriod) : sma(candles, slowPeriod);

      if (fastSeries.length < 2 || slowSeries.length < 2) {
        return { met: false, summary: "Médias Móveis calculando...", bullishOrBearish: "NEUTRAL" };
      }

      const currFast = fastSeries[fastSeries.length - 1]!.value;
      const prevFast = fastSeries[fastSeries.length - 2]!.value;
      const currSlow = slowSeries[slowSeries.length - 1]!.value;
      const prevSlow = slowSeries[slowSeries.length - 2]!.value;

      let met = false;
      let bias: "BUY" | "SELL" = "BUY";
      if (direction === "golden_cross") {
        met = prevFast <= prevSlow && currFast > currSlow;
        bias = "BUY";
      } else {
        met = prevFast >= prevSlow && currFast < currSlow;
        bias = "SELL";
      }

      return {
        met,
        summary: `${fastType}${fastPeriod} (${currFast.toFixed(2)}) x ${slowType}${slowPeriod} (${currSlow.toFixed(2)})`,
        bullishOrBearish: bias,
      };
    }

    case "price_ma": {
      const { period, maType, operator } = config.params;
      const maSeries = maType === "EMA" ? ema(candles, period) : sma(candles, period);
      if (maSeries.length < 2) return { met: false, summary: "Média Móvel calculando...", bullishOrBearish: "NEUTRAL" };

      const currMa = maSeries[maSeries.length - 1]!.value;
      const prevMa = maSeries[maSeries.length - 2]!.value;

      let met = false;
      let bias: "BUY" | "SELL" = "BUY";
      let summaryText = "";

      if (operator === "cross_above") {
        met = prevPrice <= prevMa && currentPrice > currMa;
        bias = "BUY";
        summaryText = `Cruzou Acima: Preço (${currentPrice.toFixed(2)}) > ${maType}${period} (${currMa.toFixed(2)})`;
      } else if (operator === "cross_below") {
        met = prevPrice >= prevMa && currentPrice < currMa;
        bias = "SELL";
        summaryText = `Cruzou Abaixo: Preço (${currentPrice.toFixed(2)}) < ${maType}${period} (${currMa.toFixed(2)})`;
      } else if (operator === "price_above" || operator === "ema_below_price") {
        // EMA confirmed below price / Price above EMA
        met = currentPrice > currMa;
        bias = "BUY";
        summaryText = `${maType}${period} (${currMa.toFixed(2)}) Abaixo do Preço (${currentPrice.toFixed(2)}) [Sinal COMPRA]`;
      } else if (operator === "price_below" || operator === "ema_above_price") {
        // EMA confirmed above price / Price below EMA
        met = currentPrice < currMa;
        bias = "SELL";
        summaryText = `${maType}${period} (${currMa.toFixed(2)}) Acima do Preço (${currentPrice.toFixed(2)}) [Sinal VENDA]`;
      }

      return {
        met,
        summary: summaryText || `Preço (${currentPrice.toFixed(2)}) x ${maType}${period} (${currMa.toFixed(2)})`,
        bullishOrBearish: bias,
      };
    }

    case "macd": {
      const { fastPeriod, slowPeriod, signalPeriod, event } = config.params;
      const result = macd(candles, fastPeriod, slowPeriod, signalPeriod);
      if (result.macd.length < 2 || result.signal.length < 2) {
        return { met: false, summary: "MACD calculando...", bullishOrBearish: "NEUTRAL" };
      }

      const currMacd = result.macd[result.macd.length - 1]!.value;
      const prevMacd = result.macd[result.macd.length - 2]!.value;
      const currSignal = result.signal[result.signal.length - 1]!.value;
      const prevSignal = result.signal[result.signal.length - 2]!.value;
      const currHist = currMacd - currSignal;
      const prevHist = prevMacd - prevSignal;

      let met = false;
      let bias: "BUY" | "SELL" = "BUY";

      if (event === "macd_cross_signal_bullish") {
        met = prevMacd <= prevSignal && currMacd > currSignal;
        bias = "BUY";
      } else if (event === "macd_cross_signal_bearish") {
        met = prevMacd >= prevSignal && currMacd < currSignal;
        bias = "SELL";
      } else if (event === "hist_turn_positive") {
        met = prevHist <= 0 && currHist > 0;
        bias = "BUY";
      } else if (event === "hist_turn_negative") {
        met = prevHist >= 0 && currHist < 0;
        bias = "SELL";
      }

      return {
        met,
        summary: `MACD (${currMacd.toFixed(2)}) / Sinal (${currSignal.toFixed(2)})`,
        bullishOrBearish: bias,
      };
    }

    case "bollinger": {
      const { period, stdDev, event } = config.params;
      const bands = bollingerBands(candles, period, stdDev);
      if (bands.upper.length < 2) return { met: false, summary: "Bandas calculando...", bullishOrBearish: "NEUTRAL" };

      const upper = bands.upper[bands.upper.length - 1]!.value;
      const lower = bands.lower[bands.lower.length - 1]!.value;

      let met = false;
      let bias: "BUY" | "SELL" = "BUY";

      if (event === "touch_upper" || event === "breakout_upper") {
        met = currentPrice >= upper || lastCandle.high >= upper;
        bias = "SELL"; // Mean reversion sell or momentum
      } else if (event === "touch_lower" || event === "breakout_lower") {
        met = currentPrice <= lower || lastCandle.low <= lower;
        bias = "BUY"; // Mean reversion buy
      }

      return {
        met,
        summary: `Preço (${currentPrice.toFixed(2)}) vs Bandas [${lower.toFixed(2)} - ${upper.toFixed(2)}]`,
        bullishOrBearish: bias,
      };
    }

    case "atr_volatility": {
      const { period, operator, threshold } = config.params;
      const atrPoints = atr(candles, period);
      if (atrPoints.length < 1) return { met: false, summary: "ATR calculando...", bullishOrBearish: "NEUTRAL" };
      const currentAtr = atrPoints[atrPoints.length - 1]!.value;

      const met = operator === ">" ? currentAtr >= threshold : currentAtr <= threshold;
      return {
        met,
        summary: `ATR(${period}) = ${currentAtr.toFixed(4)} (Alvo: ${operator} ${threshold})`,
        bullishOrBearish: "NEUTRAL",
      };
    }

    case "volume_surge": {
      const { period, multiplier } = config.params;
      if (candles.length < period + 1) return { met: false, summary: "Volume calculando...", bullishOrBearish: "NEUTRAL" };

      let sumVol = 0;
      for (let i = candles.length - 1 - period; i < candles.length - 1; i++) {
        sumVol += candles[i]?.volume ?? 0;
      }
      const avgVol = sumVol / period;
      const currentVol = lastCandle.volume ?? 0;
      const targetVol = avgVol * multiplier;
      const met = currentVol >= targetVol && targetVol > 0;

      return {
        met,
        summary: `Volume Atual (${currentVol.toLocaleString()}) >= ${multiplier}x Média (${avgVol.toLocaleString()})`,
        bullishOrBearish: lastCandle.close >= lastCandle.open ? "BUY" : "SELL",
      };
    }
  }
}

export function evaluateSignalRule(
  rule: SignalRule,
  candles: CandleData[],
  currentPrice: number,
  prevPrice: number,
): EvaluationResult {
  if (!rule.enabled || rule.conditions.length === 0 || candles.length < 5) {
    return {
      triggered: false,
      suggestedSide: rule.action.orderConfig.side === "SELL" ? "SELL" : "BUY",
      conditionSummaries: [],
      currentPrice,
    };
  }

  // Check cooldown
  if (rule.lastTriggeredAt && rule.cooldownMinutes > 0) {
    const elapsedMinutes = (Date.now() - rule.lastTriggeredAt) / 60000;
    if (elapsedMinutes < rule.cooldownMinutes) {
      return {
        triggered: false,
        suggestedSide: rule.action.orderConfig.side === "SELL" ? "SELL" : "BUY",
        conditionSummaries: [],
        currentPrice,
      };
    }
  }

  const results = rule.conditions.map((cond) =>
    evaluateCondition(cond, candles, currentPrice, prevPrice),
  );

  const triggered =
    rule.logic === "AND"
      ? results.every((r) => r.met)
      : results.some((r) => r.met);

  let suggestedSide: "BUY" | "SELL" = "BUY";
  if (rule.action.orderConfig.side === "BUY") {
    suggestedSide = "BUY";
  } else if (rule.action.orderConfig.side === "SELL") {
    suggestedSide = "SELL";
  } else {
    // AUTO mode: infer side from the conditions
    const buyCount = results.filter((r) => r.bullishOrBearish === "BUY").length;
    const sellCount = results.filter((r) => r.bullishOrBearish === "SELL").length;
    suggestedSide = sellCount > buyCount ? "SELL" : "BUY";
  }

  return {
    triggered,
    suggestedSide,
    conditionSummaries: results.map((r) => r.summary),
    currentPrice,
  };
}
