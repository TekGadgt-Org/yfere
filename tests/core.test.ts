import { describe, expect, it } from 'vitest';
import { classifyHost, classifyHostForTest, DEFAULT_POLICY, DEFAULT_RETENTION, effectiveConfig, parseConfig } from '../src/config/config.js';
import { isAllowedInput } from '../src/policy/classification.js';
import { assertOfflineRoute } from '../src/runtime/network.js';

describe('offline configuration', () => {
  it('uses the approved complete defaults', () => {
    const config = effectiveConfig({});
    expect(config.policy).toEqual(DEFAULT_POLICY);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.policy)).toBe(true);
  });
  it('rejects invalid minima and ordered retention/size combinations', () => {
    const invalid = [
      { retention: { runReceiptTtl: 0 } },
      { limits: { rawObjectBytes: 1023 } },
      { limits: { rawObjectBytes: 2_000, rawBytesPerRun: 1_000 } },
      { retention: { acceptedApplyBackTtl: 7_200_000, artifactTtl: 3_600_000 } },
      { retention: { rawTtl: 2_592_000_000, runReceiptTtl: 3_600_000 } },
      { sweeps: { rawInterval: 86_400_001, artifactReceiptInterval: 60_000 } },
    ];
    for (const retention of invalid) expect(() => effectiveConfig({ overrides: retention })).toThrow();
  });
  it('requires trusted admission for raw capture and rejects malformed roots', () => {
    expect(() => effectiveConfig({ overrides: { retention: { rawCaptureEnabled: false, rawTtl: 3_600_000 } } })).toThrow();
    expect(() => effectiveConfig({ overrides: { retention: { rawCaptureEnabled: true } } })).toThrow('trusted runtime admission');
    const admission = { rawCapture: { authorized: true as const, expiresAt: Date.now() + 172_800_000, maxBytes: 52_428_800, source: 'trusted-runtime-admission' as const } };
    const authorized = effectiveConfig({ overrides: { retention: { rawCaptureEnabled: true } } }, admission);
    expect((authorized.authorization as any).rawCapture).toMatchObject({ state: 'authorized', source: 'trusted-runtime-admission' });
    expect(authorized.policy.retention.rawCaptureEnabled).toBe(true);
    expect(() => effectiveConfig({ overrides: { retention: { rawCaptureEnabled: true } } }, { rawCapture: { ...admission.rawCapture, expiresAt: Date.now() - 1 } })).toThrow();
    expect(() => effectiveConfig(null)).toThrow();
    expect(() => parseConfig('null', 'json')).toThrow();
    expect(() => parseConfig('null', 'yaml')).toThrow();
    expect(() => parseConfig('[]', 'json')).toThrow();
  });
  it('derives host authority from the runtime and fails closed outside full hosts', () => {
    expect(classifyHostForTest('linux', 'x64')).toMatchObject({ lane: 'full', nativeExecution: 'allowed' });
    expect(classifyHostForTest('linux', 'arm64')).toMatchObject({ lane: 'smoke', nativeExecution: 'fail-closed' });
    expect(classifyHostForTest('win32', 'x64')).toMatchObject({ lane: 'unsupported', nativeExecution: 'fail-closed' });
    expect(effectiveConfig({}).host).toEqual(classifyHost());
  });
  it('freezes every exported default reference and binds admission to the digest', () => {
    expect(Object.isFrozen(DEFAULT_POLICY)).toBe(true);
    expect(Object.isFrozen(DEFAULT_RETENTION)).toBe(true);
    expect(() => ((DEFAULT_RETENTION as any).rawCaptureEnabled = true)).toThrow();
    expect(effectiveConfig({}).policy.retention.rawCaptureEnabled).toBe(false);
    const admission = { rawCapture: { authorized: true as const, expiresAt: Date.now() + 172_800_000, maxBytes: 52_428_800, source: 'trusted-runtime-admission' as const } };
    const a = effectiveConfig({ overrides: { retention: { rawCaptureEnabled: true } } }, admission);
    const b = effectiveConfig({ overrides: { retention: { rawCaptureEnabled: true } } }, { rawCapture: { ...admission.rawCapture, maxBytes: 52_428_799 } });
    expect(a.policyDigest).not.toBe(b.policyDigest);
  });
  it('digests all authority and prevents mutation', () => {
    const a = effectiveConfig({});
    const b = effectiveConfig({ overrides: { limits: { rawObjectBytes: 20_480 } } });
    expect(a.policyDigest).not.toBe(b.policyDigest);
    expect(() => ((a as any).network.default = 'allowed')).toThrow();
    expect((a.network as any).default).toBe('denied');
  });
  it('rejects unknown secret-bearing configuration and disables network', () => {
    expect(() => effectiveConfig({ secret: 'never-print' })).toThrow();
    expect(JSON.stringify(effectiveConfig({}))).toContain('disabled');
  });
  it('accepts YAML through the same closed schema', () => {
    expect(parseConfig('overrides:\n  retention:\n    runReceiptTtl: 86400000\n', 'yaml')).toEqual({ overrides: { retention: { runReceiptTtl: 86400000 } } });
  });
});
describe('classification', () => {
  it.each(['synthetic', 'public', 'reviewed-minimized'])('%s allowed', v => expect(isAllowedInput(v)).toBe(true));
  it.each(['private', 'proprietary', 'sensitive', 'unknown'])('%s denied', v => expect(isAllowedInput(v)).toBe(false));
});
describe('routes', () => it('constructs no live route', () => expect(() => assertOfflineRoute('provider')).toThrow('offline mode')));
