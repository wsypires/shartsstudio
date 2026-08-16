export interface BinanceWsKlineMessage {
  e: string; // Event type ("kline")
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
}

export interface BinanceWsTickerMessage {
  e: string; // Event type ("24hrTicker")
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w: string; // Weighted average price
  x: string; // First trade price
  c: string; // Last price
  Q: string; // Last quantity
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade Id
  n: number; // Total number of trades
}

export interface BinanceWsDepthMessage {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

type KlineCallback = (kline: {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}) => void;

type TickerCallback = (ticker: {
  symbol: string;
  bid: number;
  ask: number;
  lastPrice: number;
  priceChangePercent: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}) => void;

type DepthCallback = (depth: {
  bids: [number, number][];
  asks: [number, number][];
}) => void;

class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private currentStreams: Set<string> = new Set();
  private klineListeners: Map<string, Set<KlineCallback>> = new Map();
  private tickerListeners: Map<string, Set<TickerCallback>> = new Map();
  private depthListeners: Map<string, Set<DepthCallback>> = new Map();
  private reconnectTimer: any = null;
  private isExplicitlyClosed = false;

  private getBaseWsUrl(): string {
    return "wss://stream.binance.com:9443/stream";
  }

  public subscribeKline(symbol: string, timeframe: string, callback: KlineCallback): () => void {
    const stream = `${symbol.toLowerCase()}@kline_${timeframe}`;
    if (!this.klineListeners.has(stream)) {
      this.klineListeners.set(stream, new Set());
    }
    this.klineListeners.get(stream)!.add(callback);
    this.addStream(stream);

    return () => {
      const set = this.klineListeners.get(stream);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.klineListeners.delete(stream);
          this.removeStream(stream);
        }
      }
    };
  }

  public subscribeTicker(symbol: string, callback: TickerCallback): () => void {
    const stream = `${symbol.toLowerCase()}@ticker`;
    if (!this.tickerListeners.has(stream)) {
      this.tickerListeners.set(stream, new Set());
    }
    this.tickerListeners.get(stream)!.add(callback);
    this.addStream(stream);

    return () => {
      const set = this.tickerListeners.get(stream);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.tickerListeners.delete(stream);
          this.removeStream(stream);
        }
      }
    };
  }

  public subscribeDepth(symbol: string, callback: DepthCallback): () => void {
    const stream = `${symbol.toLowerCase()}@depth20@100ms`;
    if (!this.depthListeners.has(stream)) {
      this.depthListeners.set(stream, new Set());
    }
    this.depthListeners.get(stream)!.add(callback);
    this.addStream(stream);

    return () => {
      const set = this.depthListeners.get(stream);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.depthListeners.delete(stream);
          this.removeStream(stream);
        }
      }
    };
  }

  private addStream(stream: string): void {
    if (this.currentStreams.has(stream)) return;
    this.currentStreams.add(stream);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: [stream],
          id: Date.now(),
        }),
      );
    } else {
      this.connect();
    }
  }

  private removeStream(stream: string): void {
    if (!this.currentStreams.has(stream)) return;
    this.currentStreams.delete(stream);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          method: "UNSUBSCRIBE",
          params: [stream],
          id: Date.now(),
        }),
      );
    }
  }

  public connect(): void {
    if (this.currentStreams.size === 0) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const streamsList = Array.from(this.currentStreams).join("/");
    const url = `${this.getBaseWsUrl()}?streams=${streamsList}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Connection ready
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const streamName = payload.stream;
          const data = payload.data;

          if (!streamName || !data) return;

          if (streamName.includes("@kline_")) {
            const listeners = this.klineListeners.get(streamName);
            if (listeners && data.k) {
              const k = data.k;
              const formatted = {
                time: Math.floor(k.t / 1000),
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
                volume: parseFloat(k.v),
                isClosed: k.x,
              };
              for (const cb of listeners) {
                cb(formatted);
              }
            }
          } else if (streamName.includes("@ticker")) {
            const listeners = this.tickerListeners.get(streamName);
            if (listeners) {
              const formatted = {
                symbol: data.s,
                bid: parseFloat(data.b),
                ask: parseFloat(data.a),
                lastPrice: parseFloat(data.c),
                priceChangePercent: parseFloat(data.P),
                high: parseFloat(data.h),
                low: parseFloat(data.l),
                volume: parseFloat(data.v),
                timestamp: data.E,
              };
              for (const cb of listeners) {
                cb(formatted);
              }
            }
          } else if (streamName.includes("@depth")) {
            const listeners = this.depthListeners.get(streamName);
            if (listeners && data.bids && data.asks) {
              const formatted = {
                bids: data.bids.map((b: [string, string]) => [parseFloat(b[0]), parseFloat(b[1])] as [number, number]),
                asks: data.asks.map((a: [string, string]) => [parseFloat(a[0]), parseFloat(a[1])] as [number, number]),
              };
              for (const cb of listeners) {
                cb(formatted);
              }
            }
          }
        } catch {
          // Ignore parsing errors
        }
      };

      this.ws.onerror = () => {
        // Handled by close
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.isExplicitlyClosed && this.currentStreams.size > 0) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, 3000);
        }
      };
    } catch {
      // WebSocket creation failed
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const binanceWs = new BinanceWebSocketManager();
