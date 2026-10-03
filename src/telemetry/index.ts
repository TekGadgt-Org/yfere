export type RedactedTelemetry = Readonly<{ event: string; occurredAt: string; payloadDigest?: string }>;

export function redactTelemetry(event: string, occurredAt: string): RedactedTelemetry {
  return { event, occurredAt };
}
