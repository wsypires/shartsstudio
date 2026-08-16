import type { SignalRule } from "./types.ts";

export interface StrategyPreset {
  id: string;
  name: string;
  category: "MOMENTUM" | "TREND" | "VOLATILITY" | "PRICE_ACTION";
  description: string;
  recommendedTimeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  ruleTemplate: Omit<SignalRule, "id" | "createdAt" | "updatedAt" | "triggerCount">;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "preset-ema-below-price-buy",
    name: "EMA Abaixo do Preço (COMPRA)",
    category: "TREND",
    description: "Dispara sinal de COMPRA quando a EMA confirma posição abaixo do preço no gráfico (Tendência de Alta).",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "EMA 21 Abaixo do Preço (Sinal de Compra)",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 15,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "price_ma",
            params: {
              period: 21,
              maType: "EMA",
              operator: "ema_below_price",
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "chime",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "BUY",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 150,
          stopLossPips: 60,
          comment: "[Sinal] EMA Abaixo do Preço (Compra)",
        },
      },
      color: "#10b981",
    },
  },
  {
    id: "preset-ema-above-price-sell",
    name: "EMA Acima do Preço (VENDA)",
    category: "TREND",
    description: "Dispara sinal de VENDA quando a EMA confirma posição acima do preço no gráfico (Tendência de Baixa).",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "EMA 21 Acima do Preço (Sinal de Venda)",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 15,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "price_ma",
            params: {
              period: 21,
              maType: "EMA",
              operator: "ema_above_price",
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "alarm",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "SELL",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 150,
          stopLossPips: 60,
          comment: "[Sinal] EMA Acima do Preço (Venda)",
        },
      },
      color: "#ef4444",
    },
  },
  {
    id: "preset-ema-breakout-cross-buy",
    name: "Preço Cruza Acima da EMA (Breakout)",
    category: "MOMENTUM",
    description: "Dispara sinal de COMPRA no momento exato em que o preço cruza para cima da EMA e deixa a EMA abaixo.",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "Preço Cruza Acima da EMA 50 (Compra)",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 20,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "price_ma",
            params: {
              period: 50,
              maType: "EMA",
              operator: "cross_above",
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "sonar",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "BUY",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 180,
          stopLossPips: 70,
          comment: "[Sinal] Breakout Acima da EMA",
        },
      },
      color: "#10b981",
    },
  },
  {
    id: "preset-ema-breakdown-cross-sell",
    name: "Preço Cruza Abaixo da EMA (Breakdown)",
    category: "MOMENTUM",
    description: "Dispara sinal de VENDA no momento exato em que o preço cruza para baixo da EMA e deixa a EMA acima.",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "Preço Cruza Abaixo da EMA 50 (Venda)",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 20,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "price_ma",
            params: {
              period: 50,
              maType: "EMA",
              operator: "cross_below",
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "alarm",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "SELL",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 180,
          stopLossPips: 70,
          comment: "[Sinal] Breakdown Abaixo da EMA",
        },
      },
      color: "#dc2626",
    },
  },
  {
    id: "preset-rsi-oversold-buy",
    name: "RSI Oversold Auto-Buy",
    category: "MOMENTUM",
    description: "Detects when RSI(14) drops below 30 (oversold) and executes or alerts a BUY signal.",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "RSI Oversold Reversal (BUY)",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 15,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "rsi",
            params: {
              period: 14,
              operator: "<",
              threshold: 30,
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "chime",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "BUY",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 100,
          stopLossPips: 50,
          comment: "[Signal] RSI Oversold Buy",
        },
      },
      color: "#10b981",
    },
  },
  {
    id: "preset-rsi-overbought-sell",
    name: "RSI Overbought Auto-Sell",
    category: "MOMENTUM",
    description: "Detects when RSI(14) rises above 70 (overbought) and prepares a SELL / Short signal.",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "RSI Overbought Exhaustion (SELL)",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 15,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "rsi",
            params: {
              period: 14,
              operator: ">",
              threshold: 70,
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "alarm",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "SELL",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 100,
          stopLossPips: 50,
          comment: "[Signal] RSI Overbought Sell",
        },
      },
      color: "#ef4444",
    },
  },
  {
    id: "preset-ema-golden-cross",
    name: "EMA Golden Cross (20/50)",
    category: "TREND",
    description: "Bullish trend confirmation when fast EMA 20 crosses above slow EMA 50.",
    recommendedTimeframe: "1h",
    ruleTemplate: {
      name: "EMA 20/50 Golden Cross",
      symbol: "BTCUSD",
      timeframe: "1h",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 30,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "ma_cross",
            params: {
              fastPeriod: 20,
              fastType: "EMA",
              slowPeriod: 50,
              slowType: "EMA",
              direction: "golden_cross",
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "sonar",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "BUY",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 200,
          stopLossPips: 80,
          comment: "[Signal] EMA Golden Cross",
        },
      },
      color: "#f59e0b",
    },
  },
  {
    id: "preset-ema-death-cross",
    name: "EMA Death Cross (20/50)",
    category: "TREND",
    description: "Bearish trend warning when fast EMA 20 crosses below slow EMA 50.",
    recommendedTimeframe: "1h",
    ruleTemplate: {
      name: "EMA 20/50 Death Cross",
      symbol: "BTCUSD",
      timeframe: "1h",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 30,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "ma_cross",
            params: {
              fastPeriod: 20,
              fastType: "EMA",
              slowPeriod: 50,
              slowType: "EMA",
              direction: "death_cross",
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "alarm",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "SELL",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 200,
          stopLossPips: 80,
          comment: "[Signal] EMA Death Cross",
        },
      },
      color: "#dc2626",
    },
  },
  {
    id: "preset-macd-bullish-cross",
    name: "MACD Bullish Signal Cross",
    category: "MOMENTUM",
    description: "MACD line crosses above Signal line (12, 26, 9) indicating accelerating upward momentum.",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "MACD Bullish Cross",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 15,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "macd",
            params: {
              fastPeriod: 12,
              slowPeriod: 26,
              signalPeriod: 9,
              event: "macd_cross_signal_bullish",
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "ping",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "BUY",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 120,
          stopLossPips: 60,
          comment: "[Signal] MACD Bullish Cross",
        },
      },
      color: "#3b82f6",
    },
  },
  {
    id: "preset-bollinger-breakout-buy",
    name: "Bollinger Lower Band Dip Buy",
    category: "VOLATILITY",
    description: "Price touches or dips below Lower Bollinger Band (20, 2) signaling statistical discount.",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "Bollinger Lower Band Reversion",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 20,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "bollinger",
            params: {
              period: 20,
              stdDev: 2,
              event: "touch_lower",
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "chime",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "BUY",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 150,
          stopLossPips: 60,
          comment: "[Signal] Bollinger Lower Band Reversion",
        },
      },
      color: "#8b5cf6",
    },
  },
  {
    id: "preset-confluence-trend-pullback",
    name: "Triple Confluence (Trend + RSI + Volume)",
    category: "TREND",
    description: "High-probability setup: Price above EMA 50 + RSI pullback (< 45) + Volume Surge.",
    recommendedTimeframe: "15m",
    ruleTemplate: {
      name: "Triple Confluence Trend Pullback",
      symbol: "BTCUSD",
      timeframe: "15m",
      enabled: true,
      isOneTime: false,
      cooldownMinutes: 30,
      logic: "AND",
      conditions: [
        {
          id: "cond-1",
          config: {
            type: "price_ma",
            params: {
              period: 50,
              maType: "EMA",
              operator: "cross_above",
            },
          },
        },
        {
          id: "cond-2",
          config: {
            type: "rsi",
            params: {
              period: 14,
              operator: "<",
              threshold: 45,
            },
          },
        },
        {
          id: "cond-3",
          config: {
            type: "volume_surge",
            params: {
              period: 20,
              multiplier: 1.5,
            },
          },
        },
      ],
      action: {
        notifyToast: true,
        notifyAudio: true,
        soundType: "sonar",
        executionMode: "SEMI_AUTO",
        orderConfig: {
          side: "BUY",
          type: "MARKET",
          quantity: 1,
          takeProfitPips: 250,
          stopLossPips: 100,
          comment: "[Signal] Triple Confluence Setup",
        },
      },
      color: "#06b6d4",
    },
  },
];
