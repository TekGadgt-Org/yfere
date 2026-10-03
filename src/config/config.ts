import { createHash } from 'node:crypto';
import os from 'node:os';
import { z } from 'zod';
import { parse as parseYaml } from 'yaml';

export const HOST_MATRIX = {
  full: ['darwin-arm64', 'linux-x64'],
  smoke: ['linux-arm64', 'darwin-x64'],
} as const;
const durations = z.number().int().safe().finite().nonnegative().max(31536000000);
const bytes = z.number().int().safe().finite().positive();
export const retentionSchema = z.object({
  receiptsMs: durations, redactedTelemetryMs: durations, terminalArtifactsMs: durations,
  acceptedApplyBackArtifactsMs: durations, rejectedAbandonedMs: durations, rawMs: durations,
  rawObjectBytes: bytes.max(10485760), rawRunBytes: bytes.max(52428800), artifactsRunBytes: bytes.max(104857600), projectStoreBytes: bytes.max(2147483648),
  rawEnabled: z.boolean(), rawSweepHours: z.literal(1), artifactReceiptSweepHours: z.literal(24),
}).strict().superRefine((v, ctx) => { if (v.rawEnabled && v.rawMs === 0) ctx.addIssue({code:'custom',path:['rawMs'],message:'enabled raw capture requires finite positive retention'}); if (!v.rawEnabled && v.rawMs !== 0) ctx.addIssue({code:'custom',path:['rawMs'],message:'raw retention cannot implicitly enable capture'}); });
export const DEFAULT_RETENTION = retentionSchema.parse({receiptsMs:2592000000,redactedTelemetryMs:7776000000,terminalArtifactsMs:604800000,acceptedApplyBackArtifactsMs:86400000,rejectedAbandonedMs:604800000,rawMs:0,rawObjectBytes:10485760,rawRunBytes:52428800,artifactsRunBytes:104857600,projectStoreBytes:2147483648,rawEnabled:false,rawSweepHours:1,artifactReceiptSweepHours:24});
export const inputSchema = z.object({ overrides: z.object({ receiptsMs: durations.optional(), redactedTelemetryMs: durations.optional(), terminalArtifactsMs: durations.optional(), acceptedApplyBackArtifactsMs: durations.optional(), rejectedAbandonedMs: durations.optional(), rawMs: durations.optional(), rawObjectBytes: bytes.optional(), rawRunBytes: bytes.optional(), artifactsRunBytes: bytes.optional(), projectStoreBytes: bytes.optional(), rawEnabled: z.boolean().optional() }).strict().optional() }).strict();
export type Retention = z.infer<typeof retentionSchema>;
export type Input = z.infer<typeof inputSchema>;
export function classifyHost(platform = os.platform(), arch = os.arch()): { key: string; lane: 'full'|'smoke'|'unsupported'; nativeExecution: 'allowed'|'fail-closed' } {
  const key = `${platform}-${arch}`;
  const lane = (HOST_MATRIX.full as readonly string[]).includes(key) ? 'full' : (HOST_MATRIX.smoke as readonly string[]).includes(key) ? 'smoke' : 'unsupported';
  return { key, lane, nativeExecution: lane === 'unsupported' ? 'fail-closed' : 'allowed' };
}
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}
export function effectiveConfig(input: unknown, host = classifyHost()): Record<string, unknown> {
  const parsed = inputSchema.parse(input ?? {}); const merged = {...DEFAULT_RETENTION, ...(parsed.overrides ?? {})};
  const retention = retentionSchema.parse(merged);
  const policy = { version:'offline-policy-v1', inputClassesAllowed:['synthetic','public','reviewed-minimized'], rawCaptureDefault:false, overrides:'global-only' };
  const digest = createHash('sha256').update(JSON.stringify(canonicalize({host,retention,policy}))).digest('hex');
  return { authorization:'offline-controlled-fixtures-only', host, retention, overrides: parsed.overrides ?? {}, policy, policyDigest:digest, network:{liveProviders:'disabled',providerRoutesConstructed:false,default:'denied'} };
}
export function parseConfig(text: string, format: 'json'|'yaml' = 'json'): unknown {
  if (format === 'json') return JSON.parse(text) as unknown;
  return parseYaml(text);
}
