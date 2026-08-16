import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button.tsx";
import { useBinanceStore } from "../../services/binance/useBinanceStore.ts";
import {
  ShieldCheck,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Radio,
  X,
  HelpCircle,
  Check,
  Copy,
  Sparkles,
  Server,
  TrendingUp,
  Layers,
  Zap,
  Lock,
  Trash2,
} from "lucide-react";
import type { BinanceTradingMode } from "../../services/binance/types.ts";
import { binanceClient } from "../../services/binance/binanceClient.ts";

interface BinanceConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BinanceConnectionModal({
  open,
  onOpenChange,
}: BinanceConnectionModalProps) {
  const {
    mode,
    apiKey: storedApiKey,
    apiSecret: storedApiSecret,
    isConfigured,
    isConnected,
    latencyMs,
    accountInfo,
    setCredentials,
    clearCredentials,
    setMode,
    fetchAllData,
  } = useBinanceStore();

  const [selectedMode, setSelectedMode] = useState<BinanceTradingMode>(mode);
  const [apiKey, setApiKey] = useState(storedApiKey);
  const [apiSecret, setApiSecret] = useState(storedApiSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [serverIp, setServerIp] = useState<string>("");
  const [copiedIp, setCopiedIp] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<{
    ok: boolean;
    message: string;
    modules?: {
      spot: { ok: boolean; error?: string };
      restrictions?: { ok: boolean; data?: any };
      wallet?: { ok: boolean };
      futures: { ok: boolean; error?: string };
      margin: { ok: boolean; error?: string };
    };
  } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedMode(mode);
      setApiKey(storedApiKey);
      setApiSecret(storedApiSecret);
      setDiagnosticData(null);
      // Fetch current outbound server IP
      fetch("/api/binance/server-ip")
        .then((r) => r.json())
        .then((d) => {
          if (d?.ip) setServerIp(d.ip);
        })
        .catch(() => {});
    }
  }, [open, mode, storedApiKey, storedApiSecret]);

  const copyIpToClipboard = async () => {
    if (!serverIp) return;
    try {
      await navigator.clipboard.writeText(serverIp);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleModeChange = (newMode: BinanceTradingMode) => {
    setSelectedMode(newMode);
    setDiagnosticData(null);
  };

  const runDiagnostics = async (key: string, sec: string, testnet: boolean) => {
    try {
      const res = await binanceClient.testConnectionAll({
        apiKey: key,
        apiSecret: sec,
        useTestnet: testnet,
      });

      const spotOk = res.modules?.spot?.ok;
      const futuresOk = res.modules?.futures?.ok;
      const marginOk = res.modules?.margin?.ok;

      let msg = "";
      if (spotOk) {
        if (testnet) {
          msg = "Conectado com sucesso ao Binance Spot Testnet! Pronto para enviar ordens simuladas e consultar saldos de teste.";
        } else {
          msg = `Conectado com sucesso! Spot: Ativo${futuresOk ? " | Futuros: Ativo" : ""}${marginOk ? " | Margem: Ativo" : ""}`;
        }
      } else {
        msg = res.modules?.spot?.error || res.modules?.futures?.error || "Falha ao validar chaves da Binance.";
      }

      return {
        ok: res.ok,
        message: msg,
        modules: res.modules,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err.message || "Erro de rede ao conectar à Binance.",
      };
    }
  };

  const handleSaveAndConnect = async () => {
    if (selectedMode === "demo") {
      setMode("demo");
      onOpenChange(false);
      return;
    }

    const cleanKey = apiKey.trim();
    const cleanSecret = apiSecret.trim();

    if (!cleanKey || !cleanSecret) {
      setDiagnosticData({
        ok: false,
        message: "Por favor, preencha tanto a API Key quanto a API Secret da Binance.",
      });
      return;
    }

    setIsLoading(true);
    setDiagnosticData(null);

    const isTestnet = selectedMode === "binance_testnet";
    const diag = await runDiagnostics(cleanKey, cleanSecret, isTestnet);
    setDiagnosticData(diag);

    if (diag.ok) {
      await setCredentials(cleanKey, cleanSecret, isTestnet);
      await fetchAllData();
      setIsLoading(false);
      setTimeout(() => {
        onOpenChange(false);
      }, 1200);
    } else {
      setIsLoading(false);
    }
  };

  const handleTestOnly = async () => {
    const cleanKey = apiKey.trim();
    const cleanSecret = apiSecret.trim();

    if (!cleanKey || !cleanSecret) {
      setDiagnosticData({
        ok: false,
        message: "Por favor digite sua API Key e API Secret para realizar o teste.",
      });
      return;
    }

    setIsLoading(true);
    setDiagnosticData(null);

    const isTestnet = selectedMode === "binance_testnet";
    const diag = await runDiagnostics(cleanKey, cleanSecret, isTestnet);
    setIsLoading(false);
    setDiagnosticData(diag);
  };

  const handleClearCredentials = () => {
    clearCredentials();
    setApiKey("");
    setApiSecret("");
    setSelectedMode("demo");
    setDiagnosticData(null);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-[#121418] border border-[#222730] text-neutral-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#222730] bg-[#161a22] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3BA2F]/10 border border-[#F3BA2F]/30 flex items-center justify-center text-[#F3BA2F] shrink-0">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 2.5L7.2 7.3l2.4 2.4L12 7.3l2.4 2.4 2.4-2.4L12 2.5zm-6.5 6.5L3 11.5l2.5 2.5 2.5-2.5-2.5-2.5zm13 0l-2.5 2.5 2.5 2.5L21 11.5l-2.5-2.5zm-6.5 1.5l-2.4 2.4 2.4 2.4 2.4-2.4-2.4-2.4zM3 16.5l2.5 2.5 2.4-2.4-2.4-2.4L3 16.5zm13 0l2.4 2.4 2.5-2.5-2.5-2.5-2.4 2.4zM12 18.5l-2.4 2.4 2.4 2.4 2.4-2.4L12 18.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Conector Oficial Binance Multi-Produtos
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Integração Spot, Futuros USDⓈ-M, Futuros COIN-M, Margem e Carteiras com assinatura oficial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#202530]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Trading Mode Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Selecione o Ambiente de Execução
              </label>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] text-[#F3BA2F] hover:underline flex items-center gap-1 font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showGuide ? "Ocultar Guia de Chaves" : "Como Obter as Chaves?"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Binance Live */}
              <button
                type="button"
                onClick={() => handleModeChange("binance_live")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedMode === "binance_live"
                    ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/5"
                    : "bg-[#181c24] border-[#262c38] text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    BINANCE OFICIAL
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedMode === "binance_live"
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-neutral-600"
                    }`}
                  >
                    {selectedMode === "binance_live" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-black" />
                    )}
                  </div>
                </div>
                <div className="text-xs font-semibold text-white">Binance Live</div>
                <div className="text-[10px] text-neutral-400 mt-1 leading-tight">
                  Spot, Futuros, Margem & Carteiras Reais
                </div>
              </button>

              {/* Binance Testnet */}
              <button
                type="button"
                onClick={() => handleModeChange("binance_testnet")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedMode === "binance_testnet"
                    ? "bg-[#F3BA2F]/10 border-[#F3BA2F] text-white shadow-lg shadow-[#F3BA2F]/5"
                    : "bg-[#181c24] border-[#262c38] text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    TESTNET (GRÁTIS)
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedMode === "binance_testnet"
                        ? "border-[#F3BA2F] bg-[#F3BA2F]"
                        : "border-neutral-600"
                    }`}
                  >
                    {selectedMode === "binance_testnet" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-black" />
                    )}
                  </div>
                </div>
                <div className="text-xs font-semibold text-white">Binance Testnet</div>
                <div className="text-[10px] text-neutral-400 mt-1 leading-tight">
                  Ambiente de teste simulado oficial Binance
                </div>
              </button>

              {/* Demo Paper */}
              <button
                type="button"
                onClick={() => handleModeChange("demo")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedMode === "demo"
                    ? "bg-blue-500/10 border-blue-500 text-white shadow-lg shadow-blue-500/5"
                    : "bg-[#181c24] border-[#262c38] text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    DEMO LOCAL
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedMode === "demo"
                        ? "border-blue-500 bg-blue-500"
                        : "border-neutral-600"
                    }`}
                  >
                    {selectedMode === "demo" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-black" />
                    )}
                  </div>
                </div>
                <div className="text-xs font-semibold text-white">Simulador Demo</div>
                <div className="text-[10px] text-neutral-400 mt-1 leading-tight">
                  Simulação instantânea sem chaves
                </div>
              </button>
            </div>
          </div>

          {/* Guide Dropdown */}
          {showGuide && (
            <div className="bg-[#181c24] border border-[#2b3342] rounded-xl p-4 text-xs space-y-3 animate-in fade-in duration-200">
              <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-[#F3BA2F]" />
                Guia Rápido de Permissões da API Binance:
              </div>

              <div className="space-y-2 text-neutral-300 text-[11px] leading-relaxed">
                <div className="p-2.5 rounded-lg bg-[#11141a] border border-[#222732] space-y-1">
                  <span className="font-semibold text-emerald-400">Como Liberar Permissões no Painel Binance:</span>
                  <p className="text-neutral-400">
                    No painel da Binance em <strong>Gerenciamento de API</strong>:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-neutral-400">
                    <li>Marque <strong>"Habilitar Leitura"</strong> (Enable Reading).</li>
                    <li>Marque <strong>"Habilitar trading à vista e de margem"</strong> (Spot & Margin Trading).</li>
                    <li>Marque <strong>"Habilitar Futuros"</strong> (Futures Trading) para operar USDT-M e COIN-M.</li>
                    <li>
                      Em <strong>Restrição de Acesso por IP</strong>:
                      <ul className="list-circle pl-3 mt-0.5 space-y-0.5 text-neutral-300">
                        <li>
                          <strong>Recomendado:</strong> Selecione <em>"Restringir acesso apenas a IPs confiáveis"</em> e adicione o endereço IP do servidor abaixo.
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Testnet Step-by-Step Helper Card */}
          {selectedMode === "binance_testnet" && (
            <div className="bg-linear-to-r from-[#F3BA2F]/15 via-[#181c24] to-[#181c24] border border-[#F3BA2F]/30 rounded-xl p-3.5 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
                  <Sparkles className="w-4 h-4 text-[#F3BA2F]" />
                  <span>Como Obter Chaves no Binance Testnet em 30 Segundos:</span>
                </div>
                <a
                  href="https://testnet.binance.vision"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#F3BA2F] text-black font-semibold text-[11px] hover:bg-[#e2aa27] flex items-center gap-1 transition-all"
                >
                  <span>Abrir Testnet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-neutral-300">
                <li>Acesse <strong>https://testnet.binance.vision</strong> e clique em <em>"Log in with GitHub"</em>.</li>
                <li>Clique no botão amarelo <strong>"Generate HMAC_SHA256 Key"</strong> e digite qualquer descrição.</li>
                <li>Copie a <strong>API Key</strong> e a <strong>Secret Key</strong> geradas e cole nos campos abaixo.</li>
              </ol>
            </div>
          )}

          {/* API Credentials Input (Shown for Testnet or Live) */}
          {selectedMode !== "demo" && (
            <div className="space-y-4 bg-[#161a22] border border-[#262c38] p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                  <Key className="w-3.5 h-3.5 text-[#F3BA2F]" />
                  <span>
                    {selectedMode === "binance_testnet"
                      ? "Credenciais do Binance Spot Testnet"
                      : "Credenciais da Conta Binance Oficial"}
                  </span>
                </div>
                {selectedMode === "binance_testnet" ? (
                  <a
                    href="https://testnet.binance.vision"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#F3BA2F] hover:underline flex items-center gap-1 font-medium"
                  >
                    Gerar Chaves Grátis
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <a
                    href="https://www.binance.com/pt-BR/my/settings/api-management"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#F3BA2F] hover:underline flex items-center gap-1 font-medium"
                  >
                    Gerenciador de API Binance
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-neutral-400 font-medium">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole aqui sua API Key da Binance..."
                  className="w-full bg-[#0f1216] border border-[#2b3240] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-[#F3BA2F]"
                />
              </div>

              {/* API Secret */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-neutral-400 font-medium">API Secret (Segredo)</label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[10px] text-neutral-500 hover:text-neutral-300 flex items-center gap-1"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSecret ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Cole aqui seu API Secret..."
                    className="w-full bg-[#0f1216] border border-[#2b3240] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-[#F3BA2F]"
                  />
                </div>
              </div>

              {/* IP Whitelisting Box */}
              {selectedMode === "binance_live" && (
                <div className="p-3 rounded-lg bg-[#11141a] border border-[#262e3d] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Server className="w-3.5 h-3.5 text-[#F3BA2F]" />
                      <span>IP de Saída do Servidor (Para Autorização na Binance)</span>
                    </div>
                    {serverIp && (
                      <button
                        type="button"
                        onClick={copyIpToClipboard}
                        className={`text-[11px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                          copiedIp
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-[#202634] text-[#F3BA2F] hover:bg-[#2a3245] border border-[#343e52]"
                        }`}
                      >
                        {copiedIp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedIp ? "Copiado!" : "Copiar IP"}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#090b0e] px-2.5 py-1.5 rounded border border-[#202735] font-mono text-xs text-amber-300 select-all">
                      {serverIp || "Obtendo endereço IP..."}
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-400 leading-relaxed">
                    💡 <strong>Como liberar na Binance:</strong> No painel da Binance em <em>Restrição de Acesso por IP</em>, selecione <em>"Restringir acesso apenas a IPs confiáveis"</em>, cole este endereço IP e salve.
                  </p>
                </div>
              )}

              {/* Security Badge */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#11141a] border border-[#222732] text-[11px] text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Todas as requisições autenticadas são assinadas no servidor via <strong>HMAC SHA256</strong> com sincronização de relógio.
                </span>
              </div>
            </div>
          )}

          {/* Diagnostic Result Banner */}
          {diagnosticData && (
            <div
              className={`p-4 rounded-xl border flex flex-col gap-3 text-xs ${
                diagnosticData.ok
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-amber-950/40 border-amber-500/40 text-amber-200"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {diagnosticData.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1.5">
                  <div className="font-semibold text-xs text-white">
                    {diagnosticData.ok ? "Diagnóstico Concluído com Sucesso" : "Resultado da Autenticação"}
                  </div>
                  <div className="text-[11px] leading-relaxed text-neutral-300">{diagnosticData.message}</div>
                </div>
              </div>

              {/* Module badges */}
              {diagnosticData.modules && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px]">
                  <div className="p-2 rounded bg-black/40 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Spot:</span>
                    <strong className={diagnosticData.modules.spot.ok ? "text-emerald-400" : "text-rose-400"}>
                      {diagnosticData.modules.spot.ok ? "✅ Ativo" : "❌ Falhou"}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-black/40 flex items-center justify-between">
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Futuros:</span>
                    <strong className={diagnosticData.modules.futures.ok ? "text-emerald-400" : "text-amber-400"}>
                      {diagnosticData.modules.futures.ok ? "✅ Ativo" : "⚠️ Inativo"}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-black/40 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Margem:</span>
                    <strong className={diagnosticData.modules.margin.ok ? "text-emerald-400" : "text-amber-400"}>
                      {diagnosticData.modules.margin.ok ? "✅ Ativo" : "⚠️ Inativo"}
                    </strong>
                  </div>
                </div>
              )}

              {/* Quick Actions if HTTP 451 or failed */}
              {!diagnosticData.ok && (
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleModeChange("binance_testnet");
                      window.open("https://testnet.binance.vision", "_blank");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#F3BA2F] text-black font-semibold text-xs hover:bg-[#d9a424] transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Usar Binance Testnet (Recomendado)</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("demo");
                      onOpenChange(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium transition-all"
                  >
                    Ativar Modo Demo Local
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Status Info if connected */}
          {isConnected && isConfigured && mode !== "demo" && (
            <div className="p-3 bg-[#161a22] border border-[#262c38] rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-neutral-300 font-medium">
                  {mode === "binance_testnet" ? "Binance Testnet Ativo" : "Binance Spot & Multi-Produtos Ativo"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
                {latencyMs > 0 && <span>Latência: {latencyMs}ms</span>}
                {accountInfo && (
                  <span>{accountInfo.balances.length} Ativos</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222730] bg-[#161a22] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#F3BA2F]" />
              <span>Binance REST v3</span>
            </div>
            {(storedApiKey || storedApiSecret || apiKey || apiSecret || isConfigured) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearCredentials}
                className="h-7 px-2.5 text-[11px] border-rose-800/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/50 hover:border-rose-700 transition-colors"
                title="Apagar chaves salvas do navegador e memória"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Limpar Chaves Salvas
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-[#2b3240] text-neutral-300 hover:bg-[#202530]"
            >
              Cancelar
            </Button>
            {selectedMode !== "demo" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestOnly}
                disabled={isLoading || !apiKey.trim() || !apiSecret.trim()}
                className="border-[#2b3240] text-neutral-300 hover:bg-[#202530]"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                Testar Diagnóstico
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSaveAndConnect}
              disabled={isLoading}
              className="bg-[#F3BA2F] hover:bg-[#e0ab29] text-black font-semibold"
            >
              {selectedMode === "demo"
                ? "Ativar Modo Demo"
                : "Salvar & Conectar Binance"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
