import { describe, expect, it } from 'vitest';
import { classifyHost, DEFAULT_POLICY, DEFAULT_RETENTION, effectiveConfig, parseConfig } from '../src/config/config.js';
import type { HostClassification } from '../src/config/config.js';
import * as configModule from '../src/config/config.js';
import { isAllowedInput } from '../src/policy/classification.js';
import { assertOfflineRoute } from '../src/runtime/network.js';

type HostFixture = { key: string; lane: HostClassification['lane']; nativeExecution: HostClassification['nativeExecution'] };
function classifyHostFixture(platform: string, arch: string): HostFixture {
  const key = `${platform}-${arch}`;
  const lane = key === 'darwin-arm64' || key === 'linux-x64' ? 'full' : key === 'linux-arm64' || key === 'darwin-x64' ? 'smoke' : 'unsupported';
  return { key, lane, nativeExecution: lane === 'full' ? 'allowed' : 'fail-closed' };
}

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
  it('denies raw capture without any forgeable admission path', () => {
    expect(() => effectiveConfig({ overrides: { retention: { rawCaptureEnabled: false, rawTtl: 3_600_000 } } })).toThrow();
    expect(() => effectiveConfig({ overrides: { retention: { rawCaptureEnabled: true } } })).toThrow('trusted runtime issuer');
    const lookalike = { rawCapture: { authorized: true, expiresAt: Date.now() + 172_800_000, maxBytes: 52_428_800, source: 'trusted-runtime-admission' } };
    const publicApi = effectiveConfig as unknown as (input: unknown, admission?: unknown) => unknown;
    expect(() => publicApi({ overrides: { retention: { rawCaptureEnabled: true } } }, lookalike)).toThrow('trusted runtime issuer');
    expect(() => publicApi({ overrides: { retention: { rawCaptureEnabled: true } } }, JSON.parse(JSON.stringify(lookalike)))).toThrow('trusted runtime issuer');
    expect(() => effectiveConfig({ overrides: { retention: { rawCaptureEnabled: true } }, rawCapture: lookalike } as unknown)).toThrow();
    expect(() => effectiveConfig(null)).toThrow();
    expect(() => parseConfig('null', 'json')).toThrow();
    expect(() => parseConfig('null', 'yaml')).toThrow();
    expect(() => parseConfig('[]', 'json')).toThrow();
  });
  it('derives host authority from the runtime and exercises every approved tuple', () => {
    const matrix: Array<[string, string, HostClassification['lane'], HostClassification['nativeExecution']]> = [
      ['darwin', 'arm64', 'full', 'allowed'],
      ['linux', 'x64', 'full', 'allowed'],
      ['linux', 'arm64', 'smoke', 'fail-closed'],
      ['darwin', 'x64', 'smoke', 'fail-closed'],
      ['win32', 'x64', 'unsupported', 'fail-closed'],
    ];
    for (const [platform, arch, lane, nativeExecution] of matrix) {
      expect(classifyHostFixture(platform, arch)).toEqual({ key: `${platform}-${arch}`, lane, nativeExecution });
    }
    expect(effectiveConfig({}).host).toEqual(classifyHost());
  });
  it('freezes every exported default reference and keeps capture denied', () => {
    expect(Object.isFrozen(DEFAULT_POLICY)).toBe(true);
    expect(Object.isFrozen(DEFAULT_RETENTION)).toBe(true);
    expect(() => ((DEFAULT_RETENTION as any).rawCaptureEnabled = true)).toThrow();
    expect(effectiveConfig({}).policy.retention.rawCaptureEnabled).toBe(false);
    expect((effectiveConfig({}).authorization as { rawCapture: unknown }).rawCapture).toMatchObject({ state: 'denied' });
    expect('classifyHostForTest' in configModule).toBe(false);
    expect(() => effectiveConfig({ overrides: { retention: { rawCaptureEnabled: true } } })).toThrow('trusted runtime issuer');
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
