import crypto from "crypto";

export interface BinanceCredentials {
  apiKey?: string;
  apiSecret?: string;
  useTestnet?: boolean;
  useBinanceUs?: boolean;
}

// ── Base URLs for various Binance services ──
const LIVE_SPOT_URLS = [
  "https://api-gcp.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
  "https://api.binance.com",
];
const PUBLIC_DATA_BASE_URL = "https://data-api.binance.vision";
const TESTNET_SPOT_URL = "https://testnet.binance.vision";
const US_SPOT_URL = "https://api.binance.us";

const LIVE_FUTURES_URLS = ["https://fapi.binance.com"];
const TESTNET_FUTURES_URLS = [
  "https://demo-fapi.binance.com",
  "https://testnet.binancefuture.com",
];

const LIVE_DELIVERY_URLS = ["https://dapi.binance.com"];
const TESTNET_DELIVERY_URLS = ["https://demo-dapi.binance.com"];

const LIVE_OPTIONS_URLS = ["https://eapi.binance.com"];

// Server time offset cache in milliseconds (binanceTime - localTime)
let timeOffsetMs = 0;
let lastTimeSync = 0;
let cachedServerIp = "";
let lastIpCheck = 0;

export async function getServerEgressIp(): Promise<string> {
  const now = Date.now();
  if (cachedServerIp && now - lastIpCheck < 60000) {
    return cachedServerIp;
  }

  const providers = [
    "https://api.ipify.org?format=json",
    "https://api64.ipify.org?format=json",
    "https://ifconfig.me/all.json",
  ];

  for (const url of providers) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        const ip = data.ip || data.ip_addr || data.query;
        if (ip && typeof ip === "string") {
          cachedServerIp = ip.trim();
          lastIpCheck = Date.now();
          return cachedServerIp;
        }
      }
    } catch {}
  }

  try {
    const textRes = await fetch("https://checkip.amazonaws.com");
    if (textRes.ok) {
      const text = await textRes.text();
      if (text) {
        cachedServerIp = text.trim();
        lastIpCheck = Date.now();
        return cachedServerIp;
      }
    }
  } catch {}

  return cachedServerIp || "Automático / Dinâmico";
}

export async function syncServerTime(baseUrl = LIVE_SPOT_URLS[0]): Promise<number> {
  const now = Date.now();
  if (now - lastTimeSync < 20000) {
    return timeOffsetMs;
  }
  try {
    const t0 = Date.now();
    const isFutures = baseUrl.includes("fapi") || baseUrl.includes("binancefuture");
    const isDelivery = baseUrl.includes("dapi");
    const timePath = isFutures ? "/fapi/v1/time" : isDelivery ? "/dapi/v1/time" : "/api/v3/time";

    const res = await fetch(`${baseUrl}${timePath}`);
    if (res.ok) {
      const data = await res.json();
      const t1 = Date.now();
      const latency = (t1 - t0) / 2;
      timeOffsetMs = (data.serverTime || data.time) - (t0 + latency);
      lastTimeSync = Date.now();
      return timeOffsetMs;
    }
  } catch {
    try {
      const res = await fetch(`${PUBLIC_DATA_BASE_URL}/api/v3/time`);
      if (res.ok) {
        const data = await res.json();
        timeOffsetMs = data.serverTime - Date.now();
        lastTimeSync = Date.now();
      }
    } catch {}
  }
  return timeOffsetMs;
}

export function resolveCredentials(
  reqHeaders: Record<string, string | string[] | undefined>,
  reqBody?: Record<string, any>,
): { apiKey: string; apiSecret: string; useTestnet: boolean; useBinanceUs: boolean } {
  const headerKey = Array.isArray(reqHeaders["x-binance-api-key"])
    ? reqHeaders["x-binance-api-key"][0]
    : reqHeaders["x-binance-api-key"];
  const headerSecret = Array.isArray(reqHeaders["x-binance-api-secret"])
    ? reqHeaders["x-binance-api-secret"][0]
    : reqHeaders["x-binance-api-secret"];
  const headerTestnet = Array.isArray(reqHeaders["x-binance-testnet"])
    ? reqHeaders["x-binance-testnet"][0]
    : reqHeaders["x-binance-testnet"];
  const headerUs = Array.isArray(reqHeaders["x-binance-us"])
    ? reqHeaders["x-binance-us"][0]
    : reqHeaders["x-binance-us"];

  const rawKey = headerKey || reqBody?.apiKey || process.env.BINANCE_API_KEY || "";
  const rawSecret = headerSecret || reqBody?.apiSecret || process.env.BINANCE_API_SECRET || "";
  const apiKey = String(rawKey).trim();
  const apiSecret = String(rawSecret).trim();

  const useTestnet =
    headerTestnet !== undefined
      ? headerTestnet === "true" || headerTestnet === "1"
      : reqBody?.useTestnet !== undefined
      ? Boolean(reqBody.useTestnet)
      : process.env.BINANCE_USE_TESTNET === "true";

  const useBinanceUs =
    headerUs !== undefined
      ? headerUs === "true" || headerUs === "1"
      : reqBody?.useBinanceUs !== undefined
      ? Boolean(reqBody.useBinanceUs)
      : false;

  return { apiKey, apiSecret, useTestnet, useBinanceUs };
}

/**
 * Sign query string with HMAC SHA256 using API Secret
 * (Conforms to official binance-connector-js & Binance API specification)
 */
export function signQuery(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret.trim()).update(queryString).digest("hex");
}

export function translateBinanceError(code?: number, originalMsg?: string, status?: number): string {
  if (status === 451 || (originalMsg && originalMsg.includes("restricted location"))) {
    return "Acesso à Binance Live restrito pelo datacenter (HTTP 451). Para testar funcionalidades e envio de ordens, selecione o modo Binance Testnet (https://testnet.binance.vision) ou Modo Demo.";
  }

  switch (code) {
    case -2014:
      return "Formato de Chave de API inválido. Verifique se copiou a chave completa sem espaços adicionais.";
    case -2015:
      return "Chave de API inválida, IP não autorizado ou tipo de chave incorreto. Se estiver usando Testnet, a chave deve ser gerada em https://testnet.binance.vision (chaves da conta real Binance.com não funcionam no Testnet). Se estiver na Binance Real, verifique permissões de Spot/Futuros e liberação de IP no painel da Binance.";
    case -1021:
      return "Diferença de horário com o servidor Binance (Timestamp fora da janela). O horário foi sincronizado automaticamente, tente novamente.";
    case -1022:
      return "Assinatura HMAC inválida. O API Secret digitado não corresponde à API Key informada ou foi colado incompleto.";
    case -1002:
      return "Requisição não autorizada pela Binance. Verifique se a API Key e Secret estão corretos.";
    case -2010:
      return "Saldo insuficiente na carteira da Binance para executar esta ordem.";
    case -1013:
      return "Valor ou quantidade da ordem inválida para os filtros da Binance (tamanho mínimo do lote ou preço mínimo).";
    case -4001:
    case -4003:
      return "Conta de Futuros não ativada ou sem permissão de negociação nesta API Key.";
    case -5001:
      return "Conta de Margem não ativada na sua conta Binance.";
    default:
      return originalMsg || "Erro na comunicação com a API da Binance.";
  }
}

export type BinanceServiceType = "spot" | "sapi" | "fapi" | "dapi" | "eapi";

export function detectServiceType(endpoint: string): BinanceServiceType {
  if (endpoint.startsWith("/fapi")) return "fapi";
  if (endpoint.startsWith("/dapi")) return "dapi";
  if (endpoint.startsWith("/eapi")) return "eapi";
  if (endpoint.startsWith("/sapi")) return "sapi";
  return "spot";
}

/**
 * Make a public or signed request to any Binance REST API (Spot, SAPI, FAPI, DAPI, EAPI)
 */
export async function binanceRequest(
  endpoint: string,
  options: {
    method?: string;
    params?: Record<string, any>;
    signed?: boolean;
    apiKey?: string;
    apiSecret?: string;
    useTestnet?: boolean;
    useBinanceUs?: boolean;
  } = {},
): Promise<{ ok: boolean; status: number; data: any; raw?: string }> {
  const {
    method = "GET",
    params = {},
    signed = false,
    useTestnet = false,
    useBinanceUs = false,
  } = options;

  const apiKey = (options.apiKey || "").trim();
  const apiSecret = (options.apiSecret || "").trim();
  const serviceType = detectServiceType(endpoint);

  let candidateBaseUrls: string[] = [];

  if (serviceType === "fapi") {
    candidateBaseUrls = useTestnet ? TESTNET_FUTURES_URLS : LIVE_FUTURES_URLS;
  } else if (serviceType === "dapi") {
    candidateBaseUrls = useTestnet ? TESTNET_DELIVERY_URLS : LIVE_DELIVERY_URLS;
  } else if (serviceType === "eapi") {
    candidateBaseUrls = LIVE_OPTIONS_URLS;
  } else {
    // Spot and SAPI
    if (useTestnet) {
      candidateBaseUrls = [TESTNET_SPOT_URL];
    } else if (useBinanceUs) {
      candidateBaseUrls = [US_SPOT_URL];
    } else {
      if (!signed) {
        candidateBaseUrls = [PUBLIC_DATA_BASE_URL, ...LIVE_SPOT_URLS];
      } else {
        candidateBaseUrls = LIVE_SPOT_URLS;
      }
    }
  }

  if (signed && (!apiKey || !apiSecret)) {
    return {
      ok: false,
      status: 401,
      data: {
        code: -2014,
        msg: "API-key or secret missing. Please provide your Binance API Key and Secret.",
        userFriendlyMessage: "Por favor informe a Chave de API e o API Secret da Binance.",
      },
    };
  }

  // Pre-sync time offset for signed requests
  if (signed) {
    await syncServerTime(candidateBaseUrls[0]);
  }

  const executeAttempt = async (targetBaseUrl: string) => {
    const cleanParams: Record<string, string> = {};

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        cleanParams[k] = String(v);
      }
    }

    if (signed) {
      const adjustedTimestamp = Date.now() + timeOffsetMs;
      cleanParams.timestamp = String(adjustedTimestamp);
      cleanParams.recvWindow = cleanParams.recvWindow || "60000"; // Max 60s
    }

    let queryString = new URLSearchParams(cleanParams).toString();

    if (signed) {
      const signature = signQuery(queryString, apiSecret);
      queryString = `${queryString}&signature=${signature}`;
    }

    const headers: Record<string, string> = {
      "User-Agent": "OpenCharts-BinanceOfficialConnector/2.0",
      Accept: "application/json",
    };

    if (apiKey) {
      headers["X-MBX-APIKEY"] = apiKey;
    }

    let url = `${targetBaseUrl}${endpoint}`;
    let body: string | undefined = undefined;

    if (method === "GET" || method === "DELETE") {
      if (queryString) {
        url = `${url}?${queryString}`;
      }
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = queryString;
    }

    const res = await fetch(url, {
      method,
      headers,
      body,
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok && typeof data === "object" && data !== null) {
      data.userFriendlyMessage = translateBinanceError(data.code, data.msg, res.status);
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  };

  let lastResult = {
    ok: false,
    status: 500,
    data: {
      code: -1000,
      msg: "Failed to connect to Binance API",
      userFriendlyMessage: "Falha ao conectar com os servidores da Binance.",
    },
  };

  for (const baseUrl of candidateBaseUrls) {
    try {
      const result = await executeAttempt(baseUrl);

      if (!result.ok && result.data?.code === -1021) {
        lastTimeSync = 0;
        await syncServerTime(baseUrl);
        const retryResult = await executeAttempt(baseUrl);
        return retryResult;
      }

      if (result.status === 451) {
        lastResult = {
          ok: false,
          status: 451,
          data: {
            code: 451,
            msg: "Service unavailable from a restricted location",
            userFriendlyMessage:
              "Acesso à Binance Live restrito pelo datacenter (HTTP 451). Para testar funcionalidades e ordens, selecione o modo Binance Testnet (https://testnet.binance.vision) ou Modo Demo.",
          },
        };
        continue;
      }

      return result;
    } catch (err: any) {
      lastResult = {
        ok: false,
        status: 500,
        data: {
          code: -1000,
          msg: `Failed to connect to ${baseUrl}: ${err.message || String(err)}`,
          userFriendlyMessage: `Erro de rede ao conectar com ${baseUrl}.`,
        },
      };
    }
  }

  return lastResult;
}
