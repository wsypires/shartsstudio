import { useEffect, useRef } from "react";
import type { CandleData } from "../../lib/indicators.ts";
import { useSignalAlertStore } from "./useSignalAlertStore.ts";

interface UseSignalAlertsEngineOptions {
  symbol?: string;
  selectedSymbol?: string;
  candles?: CandleData[];
  currentPrice?: number;
  timeframe?: string;
  tick?: { bid: number; ask: number; timestamp?: number };
  liveCandle?: { open: number; high: number; low: number; close: number; volume?: number; timestamp?: number };
  accountId: string | null;
  isFeedConnected: boolean;
  onOrderSuccess?: () => void;
}

export function useSignalAlertsEngine({
  symbol,
  selectedSymbol,
  candles,
  currentPrice: explicitCurrentPrice,
  tick,
  liveCandle,
  accountId,
  isFeedConnected,
  onOrderSuccess,
}: UseSignalAlertsEngineOptions) {
  const processMarketTick = useSignalAlertStore((s) => s.processMarketTick);
  const activeSymbol = symbol || selectedSymbol || "";
  
  const calcCurrentPrice = explicitCurrentPrice ?? (tick ? (tick.bid + tick.ask) / 2 : liveCandle?.close ?? 0);
  const prevPriceRef = useRef<number>(calcCurrentPrice);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!isFeedConnected || !activeSymbol || calcCurrentPrice <= 0) {
      prevPriceRef.current = calcCurrentPrice;
      return;
    }

    const prevPrice = prevPriceRef.current || calcCurrentPrice;
    prevPriceRef.current = calcCurrentPrice;

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    void processMarketTick({
      symbol: activeSymbol,
      candles: candles || [],
      currentPrice: calcCurrentPrice,
      prevPrice,
      accountId,
      isFeedConnected,
      onOrderSuccess,
    }).finally(() => {
      isProcessingRef.current = false;
    });
  }, [activeSymbol, candles, calcCurrentPrice, accountId, isFeedConnected, onOrderSuccess, processMarketTick]);
}
