import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "apikey",
      "apiKey",
      "PROWLARR_API_KEY",
      "TORZNAB_API_KEY",
      "*.apikey",
    ],
    censor: "[Redacted]",
  },
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
