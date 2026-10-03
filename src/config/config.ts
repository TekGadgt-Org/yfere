import { createHash } from 'node:crypto';
import os from 'node:os';
import { z } from 'zod';
import { parse as parseYaml } from 'yaml';
import { OFFLINE_POLICY_VERSION } from '../domain/contracts.js';

const FULL_HOSTS = Object.freeze(['darwin-arm64', 'linux-x64'] as const);
const SMOKE_HOSTS = Object.freeze(['linux-arm64', 'darwin-x64'] as const);

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

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

const CANONICAL_DEFAULT_POLICY = deepFreeze({
  retention: { runReceiptTtl: 2_592_000_000, telemetryTtl: 7_776_000_000, artifactTtl: 604_800_000, acceptedApplyBackTtl: 86_400_000, rejectedApplyBackTtl: 604_800_000, rawCaptureEnabled: false, rawTtl: 86_400_000 },
  limits: { rawObjectBytes: 10_485_760, rawBytesPerRun: 52_428_800, artifactBytesPerRun: 104_857_600, runStoreBytes: 2_147_483_648 },
  sweeps: { rawInterval: 3_600_000, artifactReceiptInterval: 86_400_000 },
} as const);
export const DEFAULT_POLICY = CANONICAL_DEFAULT_POLICY;
export const DEFAULT_RETENTION = CANONICAL_DEFAULT_POLICY.retention;

const overrideSchema = z.object({ retention: retentionSchema.partial().optional(), limits: limitsSchema.partial().optional(), sweeps: sweepsSchema.partial().optional() }).strict();
export const inputSchema = z.object({ overrides: overrideSchema.optional() }).strict();
const admissionSchema = z.object({ rawCapture: z.object({ authorized: z.literal(true), expiresAt: z.number().int().safe().finite(), maxBytes: rawRun, source: z.literal('trusted-runtime-admission') }).strict() }).strict();
export type Retention = z.infer<typeof retentionSchema>;
export type EffectivePolicy = z.infer<typeof effectivePolicySchema>;
export type Input = z.infer<typeof inputSchema>;
export type RawCaptureAdmission = z.infer<typeof admissionSchema>;
export type HostClassification = { key: string; lane: 'full' | 'smoke' | 'unsupported'; nativeExecution: 'allowed' | 'fail-closed' };

function classifyHostForMatrix(platform: string, arch: string): HostClassification {
  const key = `${platform}-${arch}`;
  const lane = FULL_HOSTS.includes(key as (typeof FULL_HOSTS)[number]) ? 'full' : SMOKE_HOSTS.includes(key as (typeof SMOKE_HOSTS)[number]) ? 'smoke' : 'unsupported';
  return { key, lane, nativeExecution: lane === 'full' ? 'allowed' : 'fail-closed' };
}

/** Test-only pure matrix helper; runtime authority must use classifyHost(). */
export const classifyHostForTest = classifyHostForMatrix;
export function classifyHost(): HostClassification {
  return classifyHostForMatrix(os.platform(), os.arch());
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonicalize(v)]));
  return value;
}

export function effectiveConfig(input: unknown, trustedAdmission?: unknown): Readonly<Record<string, unknown>> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new Error('configuration must be a non-null object');
  const parsed = inputSchema.parse(input);
  const o = (parsed.overrides ?? {}) as { retention?: Partial<Retention>; limits?: Partial<z.infer<typeof limitsSchema>>; sweeps?: Partial<z.infer<typeof sweepsSchema>> };
  const policy = effectivePolicySchema.parse({
    retention: { ...CANONICAL_DEFAULT_POLICY.retention, ...(o.retention ?? {}) },
    limits: { ...CANONICAL_DEFAULT_POLICY.limits, ...(o.limits ?? {}) },
    sweeps: { ...CANONICAL_DEFAULT_POLICY.sweeps, ...(o.sweeps ?? {}) },
  });
  const admission = trustedAdmission === undefined ? undefined : admissionSchema.parse(trustedAdmission);
  if (policy.retention.rawCaptureEnabled) {
    if (!admission) throw new Error('raw capture requires trusted runtime admission');
    if (admission.rawCapture.expiresAt <= Date.now()) throw new Error('raw capture admission expired');
    if (admission.rawCapture.maxBytes < policy.limits.rawObjectBytes || admission.rawCapture.maxBytes > policy.limits.rawBytesPerRun) throw new Error('raw capture admission byte limit is outside effective policy');
    if (policy.retention.rawTtl > admission.rawCapture.expiresAt - Date.now()) throw new Error('raw capture admission TTL is outside effective policy');
  }
  const host = classifyHost();
  const authorization = { mode: 'offline-controlled-fixtures-only', inputClassesAllowed: ['synthetic', 'public', 'reviewed-minimized'], rawCapture: policy.retention.rawCaptureEnabled ? { state: 'authorized', source: admission!.rawCapture.source, expiresAt: admission!.rawCapture.expiresAt, maxBytes: admission!.rawCapture.maxBytes } : { state: 'denied', source: 'no-trusted-admission' } };
  const network = { liveProviders: 'disabled', providerRoutesConstructed: false, default: 'denied' };
  const authority = { policyVersion: OFFLINE_POLICY_VERSION, defaults: 'approved', overrideSource: Object.keys(o).length ? 'global-config' : 'defaults', host, policy, authorization, network };
  const policyDigest = createHash('sha256').update(JSON.stringify(canonicalize(authority))).digest('hex');
  return deepFreeze({ ...authority, policyDigest });
}

export function parseConfig(text: string, format: 'json' | 'yaml' = 'json'): unknown {
  const value = format === 'json' ? JSON.parse(text) as unknown : parseYaml(text);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('configuration must be a non-null object');
  return value;
}
