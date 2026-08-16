export type BinanceTradingMode = "demo" | "binance_testnet" | "binance_live";

export interface BinanceAssetBalance {
  asset: string;
  free: string;
  locked: string;
  usdValue?: number;
  btcValue?: number;
}

export interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: BinanceAssetBalance[];
  permissions: string[];
}

export interface BinanceApiRestrictions {
  ipRestrict: boolean;
  createTime: number;
  enableWithdrawals: boolean;
  enableInternalTransfer: boolean;
  permitsUniversalTransfer: boolean;
  enableVanillaOptions: boolean;
  enableReading: boolean;
  enableFutures: boolean;
  enableMargin: boolean;
  enableSpotAndMarginTrading: boolean;
  enablePortfolioMarginTrading?: boolean;
}

export interface BinanceWalletBalanceItem {
  activate: boolean;
  balance: string;
  walletName: string;
}

export interface BinanceUserAssetItem {
  asset: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  ipoable: string;
  btcValuation: string;
}

// ── USDS-M Futures Types ──
export interface BinanceFuturesPosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: "cross" | "isolated" | string;
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: "BOTH" | "LONG" | "SHORT";
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

export interface BinanceFuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  maintMargin: string;
  initialMargin: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  maxWithdrawAmount: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  marginAvailable: boolean;
  updateTime: number;
}

export interface BinanceFuturesAccount {
  feeTier: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: number;
  totalInitialMargin: string;
  totalMaintMargin: string;
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  totalPositionInitialMargin: string;
  totalOpenOrderInitialMargin: string;
  totalCrossWalletBalance: string;
  totalCrossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  assets: BinanceFuturesAsset[];
  positions: BinanceFuturesPosition[];
}

// ── COIN-M Delivery Futures Types ──
export interface BinanceDeliveryAccount {
  assets: {
    asset: string;
    walletBalance: string;
    unrealizedProfit: string;
    marginBalance: string;
    maintMargin: string;
    initialMargin: string;
    positionInitialMargin: string;
    openOrderInitialMargin: string;
    maxWithdrawAmount: string;
    crossWalletBalance: string;
    crossUnPnl: string;
    availableBalance: string;
  }[];
  positions: {
    symbol: string;
    positionAmt: string;
    initialMargin: string;
    maintMargin: string;
    unrealizedProfit: string;
    positionInitialMargin: string;
    openOrderInitialMargin: string;
    leverage: string;
    isolated: boolean;
    entryPrice: string;
    markPrice: string;
    liquidationPrice: string;
    positionSide: string;
  }[];
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  feeTier: number;
  updateTime: number;
}

// ── Margin Trading Types ──
export interface BinanceMarginUserAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface BinanceMarginAccount {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: BinanceMarginUserAsset[];
}

export interface BinanceIsolatedMarginAccount {
  assets: {
    baseAsset: {
      asset: string;
      borrowed: string;
      free: string;
      interest: string;
      locked: string;
      netAsset: string;
    };
    quoteAsset: {
      asset: string;
      borrowed: string;
      free: string;
      interest: string;
      locked: string;
      netAsset: string;
    };
    symbol: string;
    isolatedCreated: boolean;
    enabled: boolean;
    marginLevel: string;
    marginLevelStatus: "EXCESSIVE" | "SAFE" | "MARGIN_CALL" | "PRE_LIQUIDATION" | "FORCE_LIQUIDATION";
    marginRatio: string;
    indexPrice: string;
    liquidatePrice: string;
    liquidateRate: string;
    tradeEnabled: boolean;
  }[];
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
}

// ── Options Types ──
export interface BinanceOptionsAccount {
  asset: {
    asset: string;
    marginBalance: string;
    equity: string;
    available: string;
    initialMargin: string;
    maintMargin: string;
    unrealizedPNL: string;
  }[];
}

// ── Symbol and Market Types ──
export interface BinanceSymbolFilterLotSize {
  filterType: "LOT_SIZE";
  minQty: string;
  maxQty: string;
  stepSize: string;
}

export interface BinanceSymbolFilterPrice {
  filterType: "PRICE_FILTER";
  minPrice: string;
  maxPrice: string;
  tickSize: string;
}

export interface BinanceSymbolFilterMinNotional {
  filterType: "MIN_NOTIONAL" | "NOTIONAL";
  minNotional?: string;
  notional?: string;
  applyToMarket?: boolean;
  avgPriceMins?: number;
}

export type BinanceSymbolFilter =
  | BinanceSymbolFilterLotSize
  | BinanceSymbolFilterPrice
  | BinanceSymbolFilterMinNotional
  | { filterType: string; [key: string]: any };

export interface BinanceSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  baseAssetPrecision: number;
  quoteAsset: string;
  quotePrecision: number;
  quoteAssetPrecision: number;
  orderTypes: string[];
  icebergAllowed: boolean;
  ocoAllowed: boolean;
  quoteOrderQtyMarketAllowed: boolean;
  allowTrailingStop: boolean;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  filters: BinanceSymbolFilter[];
  permissions: string[];
}

export interface BinanceOrder {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime?: number;
  time?: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "PENDING_CANCEL" | "REJECTED" | "EXPIRED";
  timeInForce: "GTC" | "IOC" | "FOK";
  type: "LIMIT" | "MARKET" | "STOP_LOSS" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT" | "TAKE_PROFIT_LIMIT" | "LIMIT_MAKER";
  side: "BUY" | "SELL";
  stopPrice?: string;
  icebergQty?: string;
  updateTime?: number;
  isWorking?: boolean;
  origQuoteOrderQty?: string;
}

export interface BinanceTrade {
  symbol: string;
  id: number;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

export interface Binance24hrTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface BinanceDepth {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

export interface PlaceBinanceOrderParams {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT" | "TAKE_PROFIT_LIMIT";
  timeInForce?: "GTC" | "IOC" | "FOK";
  quantity?: number | string;
  quoteOrderQty?: number | string;
  price?: number | string;
  stopPrice?: number | string;
  newClientOrderId?: string;
}
