import type { EngineEvent } from "./types.ts";

export interface TelegramConfig {
  token: string;
  chatId: string;
}

export class TelegramNotifier {
  private config: TelegramConfig | null = null;
  private enabled = true;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      this.config = { token, chatId };
    }
  }

  isConfigured() {
    return Boolean(this.config?.token && this.config?.chatId);
  }

  getConfig(): TelegramConfig | null {
    return this.config ? { ...this.config } : null;
  }

  setConfig(config: TelegramConfig) {
    this.config = { token: config.token.trim(), chatId: config.chatId.trim() };
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async send(text: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.config) {
      return { ok: false, error: "Telegram não configurado. Informe o token do bot e o chatId." };
    }
    try {
      const url = `https://api.telegram.org/bot${this.config.token}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: this.config.chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data?.description || `Telegram HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  async notify(event: EngineEvent): Promise<void> {
    if (!this.enabled || !this.isConfigured()) return;
    const text = this.format(event);
    if (text) await this.send(text);
  }

  private format(event: EngineEvent): string {
    switch (event.type) {
      case "signal_received": {
        const s = event.signal;
        const status = event.accepted ? "✅" : `⛔ (${event.reason})`;
        return `<b>📡 SINAL</b> ${status}\n${s.side} <b>${s.symbol}</b>${s.price ? ` @ ${s.price}` : ""}${s.strategy ? `\nEstratégia: ${s.strategy}` : ""}`;
      }
      case "order_opened": {
        const t = event.trade;
        const sl = t.stopLoss ? ` | SL ${t.stopLoss}` : "";
        const tp = t.takeProfit ? ` | TP ${t.takeProfit}` : "";
        return `<b>🟢 POSIÇÃO ABERTA</b>\n${t.side} <b>${t.symbol}</b> ${t.quantity} @ ${t.entryPrice} (${t.mode}${t.leverage > 1 ? ` ${t.leverage}x` : ""})${sl}${tp}`;
      }
      case "order_closed": {
        const t = event.trade;
        const emoji = t.realizedPnl >= 0 ? "🟢" : "🔴";
        return `<b>${emoji} TRADE FECHADO</b>\n${t.symbol} ${t.side} ${t.quantity} @ ${t.exitPrice}\nMotivo: ${t.reason}\n<b>PnL: ${t.realizedPnl >= 0 ? "+" : ""}${t.realizedPnl} USDT</b> (fees ${t.fees})`;
      }
      case "error":
        return `<b>⚠️ ERRO</b> [${event.context}]\n${event.message}`;
      case "balance":
        return `<b>💰 SALDO</b>\n${event.balance.toFixed(2)} ${event.currency}`;
      default:
        return "";
    }
  }
}