import { ReportEngine } from "./reportEngine.ts";
import { TelegramNotifier } from "./telegram.ts";
import { TradeEngine } from "./tradeEngine.ts";
import type { EngineSignal } from "./types.ts";

export { TradeEngine } from "./tradeEngine.ts";
export { ReportEngine } from "./reportEngine.ts";
export { TelegramNotifier } from "./telegram.ts";
export type * from "./types.ts";

export interface EngineRuntime {
  tradeEngine: TradeEngine;
  reportEngine: ReportEngine;
  telegram: TelegramNotifier;
}

let runtime: EngineRuntime | null = null;

export function getEngine(): EngineRuntime {
  if (runtime) return runtime;

  const tradeEngine = new TradeEngine();
  const reportEngine = new ReportEngine();
  const telegram = new TelegramNotifier();

  const onEvent = (event: any) => {
    reportEngine.subscribe()(event);
    telegram.notify(event);
  };
  tradeEngine.onEvent(onEvent);

  tradeEngine.start();
  tradeEngine.getBalance().catch(() => {});

  runtime = { tradeEngine, reportEngine, telegram };
  return runtime;
}

export async function processEngineSignal(signal: EngineSignal) {
  const engine = getEngine();
  return engine.tradeEngine.processSignal(signal);
}

export function getEngineSnapshot() {
  const engine = getEngine();
  const state = engine.tradeEngine.getSnapshot();
  const report = engine.reportEngine.getSnapshot(state.openTrades);
  return {
    state,
    report,
    telegramConfigured: engine.telegram.isConfigured(),
    telegramConfig: engine.telegram.getConfig(),
    mode: process.env.BINANCE_USE_TESTNET === "true" ? "binance_testnet" : "binance_live",
  };
}