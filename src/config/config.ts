import { createHash } from 'node:crypto';
import os from 'node:os';
import { z } from 'zod';
import { parse as parseYaml } from 'yaml';

export const HOST_MATRIX = {
  full: ['darwin-arm64', 'linux-x64'],
  smoke: ['linux-arm64', 'darwin-x64'],
} as const;

const TTL_MIN = 3_600_000;
const TTL_MAX = 31_536_000_000;
const SWEEP_MIN = 60_000;
const SWEEP_MAX = 604_800_000;
const duration = z.number().int().safe().finite().min(TTL_MIN).max(TTL_MAX);
const sweep = z.number().int().safe().finite().min(SWEEP_MIN).max(SWEEP_MAX);
const rawObject = z.number().int().safe().finite().min(1_024).max(1_073_741_824);
const rawRun = z.number().int().safe().finite().min(1_024).max(4_294_967_296);
const artifactRun = z.number().int().safe().finite().min(1_024).max(8_589_934_592);
const runStore = z.number().int().safe().finite().min(1_048_576).max(1_099_511_627_776);

const retentionFields = {
  runReceiptTtl: duration,
  telemetryTtl: duration,
  artifactTtl: duration,
  acceptedApplyBackTtl: duration,
  rejectedApplyBackTtl: duration,
  rawCaptureEnabled: z.boolean(),
  rawTtl: duration,
};
const limitsFields = {
  rawObjectBytes: rawObject,
  rawBytesPerRun: rawRun,
  artifactBytesPerRun: artifactRun,
  runStoreBytes: runStore,
};
const sweepsFields = { rawInterval: sweep, artifactReceiptInterval: sweep };

export const retentionSchema = z.object(retentionFields).strict();
export const limitsSchema = z.object(limitsFields).strict();
export const sweepsSchema = z.object(sweepsFields).strict();
export const effectivePolicySchema = z.object({ retention: retentionSchema, limits: limitsSchema, sweeps: sweepsSchema }).strict().superRefine((v, ctx) => {
  const { retention: r, limits: l, sweeps: s } = v;
  if (r.acceptedApplyBackTtl > r.artifactTtl) ctx.addIssue({ code: 'custom', path: ['retention', 'acceptedApplyBackTtl'], message: 'must not exceed artifactTtl' });
  if (r.rejectedApplyBackTtl > r.artifactTtl) ctx.addIssue({ code: 'custom', path: ['retention', 'rejectedApplyBackTtl'], message: 'must not exceed artifactTtl' });
  if (r.rawTtl > r.runReceiptTtl) ctx.addIssue({ code: 'custom', path: ['retention', 'rawTtl'], message: 'must not exceed runReceiptTtl' });
  if (l.rawObjectBytes > l.rawBytesPerRun) ctx.addIssue({ code: 'custom', path: ['limits', 'rawObjectBytes'], message: 'must not exceed rawBytesPerRun' });
  if (l.rawBytesPerRun > l.artifactBytesPerRun) ctx.addIssue({ code: 'custom', path: ['limits', 'rawBytesPerRun'], message: 'must not exceed artifactBytesPerRun' });
  if (l.artifactBytesPerRun > l.runStoreBytes) ctx.addIssue({ code: 'custom', path: ['limits', 'artifactBytesPerRun'], message: 'must not exceed runStoreBytes' });
  if (s.rawInterval > r.rawTtl) ctx.addIssue({ code: 'custom', path: ['sweeps', 'rawInterval'], message: 'must not exceed rawTtl' });
  const shortestArtifactTtl = Math.min(r.runReceiptTtl, r.telemetryTtl, r.artifactTtl, r.acceptedApplyBackTtl, r.rejectedApplyBackTtl);
  if (s.artifactReceiptInterval > shortestArtifactTtl) ctx.addIssue({ code: 'custom', path: ['sweeps', 'artifactReceiptInterval'], message: 'must not exceed shortest applicable TTL' });
  if (!r.rawCaptureEnabled && r.rawTtl !== 86_400_000) ctx.addIssue({ code: 'custom', path: ['retention', 'rawTtl'], message: 'disabled raw capture must retain the approved default TTL' });
});

export const DEFAULT_POLICY = {
  retention: { runReceiptTtl: 2_592_000_000, telemetryTtl: 7_776_000_000, artifactTtl: 604_800_000, acceptedApplyBackTtl: 86_400_000, rejectedApplyBackTtl: 604_800_000, rawCaptureEnabled: false, rawTtl: 86_400_000 },
  limits: { rawObjectBytes: 10_485_760, rawBytesPerRun: 52_428_800, artifactBytesPerRun: 104_857_600, runStoreBytes: 2_147_483_648 },
  sweeps: { rawInterval: 3_600_000, artifactReceiptInterval: 86_400_000 },
} as const;
export const DEFAULT_RETENTION = DEFAULT_POLICY.retention;

const overrideSchema = z.object({ retention: retentionSchema.partial().optional(), limits: limitsSchema.partial().optional(), sweeps: sweepsSchema.partial().optional() }).strict();
export const inputSchema = z.object({ overrides: overrideSchema.optional() }).strict();
export type Retention = z.infer<typeof retentionSchema>;
export type EffectivePolicy = z.infer<typeof effectivePolicySchema>;
export type Input = z.infer<typeof inputSchema>;
export type HostClassification = { key: string; lane: 'full' | 'smoke' | 'unsupported'; nativeExecution: 'allowed' | 'fail-closed' };

export function classifyHost(platform = os.platform(), arch = os.arch()): HostClassification {
  const key = `${platform}-${arch}`;
  const lane = (HOST_MATRIX.full as readonly string[]).includes(key) ? 'full' : (HOST_MATRIX.smoke as readonly string[]).includes(key) ? 'smoke' : 'unsupported';
  return { key, lane, nativeExecution: lane === 'full' ? 'allowed' : 'fail-closed' };
}
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonicalize(v)]));
  return value;
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); }
  return value;
}

export function effectiveConfig(input: unknown): Readonly<Record<string, unknown>> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new Error('configuration must be a non-null object');
  const parsed = inputSchema.parse(input);
  const o = (parsed.overrides ?? {}) as { retention?: Partial<Retention>; limits?: Partial<z.infer<typeof limitsSchema>>; sweeps?: Partial<z.infer<typeof sweepsSchema>> };
  const policy = effectivePolicySchema.parse({
    retention: { ...DEFAULT_POLICY.retention, ...(o.retention ?? {}) },
    limits: { ...DEFAULT_POLICY.limits, ...(o.limits ?? {}) },
    sweeps: { ...DEFAULT_POLICY.sweeps, ...(o.sweeps ?? {}) },
  });
  const host = classifyHost();
  const authorization = { mode: 'offline-controlled-fixtures-only', inputClassesAllowed: ['synthetic', 'public', 'reviewed-minimized'] };
  const network = { liveProviders: 'disabled', providerRoutesConstructed: false, default: 'denied' };
  const authority = { policyVersion: 'offline-policy-v2', defaults: 'approved', overrideSource: Object.keys(o).length ? 'global-config' : 'defaults', host, policy, authorization, network };
  const policyDigest = createHash('sha256').update(JSON.stringify(canonicalize(authority))).digest('hex');
  return deepFreeze({ ...authority, policyDigest });
}

export function parseConfig(text: string, format: 'json' | 'yaml' = 'json'): unknown {
  const value = format === 'json' ? JSON.parse(text) as unknown : parseYaml(text);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('configuration must be a non-null object');
  return value;
}
