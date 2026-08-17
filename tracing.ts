import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
});

const sdk = new NodeSDK({
  serviceName: "opencharts-binance-engine",
  traceExporter: exporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        ignoreOutgoingUrls: [/localhost:4318/, /127.0.0.1:4318/],
      },
    }),
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown().then(
    () => process.exit(0),
    () => process.exit(1),
  );
});