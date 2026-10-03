import { describe, expect, it } from 'vitest';
import { classifyHost, DEFAULT_RETENTION, effectiveConfig, parseConfig } from '../src/config/config.js';
import { isAllowedInput } from '../src/policy/classification.js';
import { assertOfflineRoute } from '../src/runtime/network.js';
describe('offline configuration', () => {
 it('uses approved defaults', () => expect(DEFAULT_RETENTION).toMatchObject({receiptsMs:2592000000,redactedTelemetryMs:7776000000,rawEnabled:false,rawMs:0}));
 it('rejects profile/provider overrides and implicit raw', () => { expect(() => effectiveConfig({provider:{receiptsMs:1}})).toThrow(); expect(() => effectiveConfig({overrides:{rawMs:86400000}})).toThrow(); });
 it('classifies hosts and fails closed', () => { expect(classifyHost('linux','x64').lane).toBe('full'); expect(classifyHost('linux','arm64').lane).toBe('smoke'); expect(classifyHost('win32','x64').nativeExecution).toBe('fail-closed'); });
 it('has stable and changing digests', () => { const a=effectiveConfig({}), b=effectiveConfig({}), c=effectiveConfig({overrides:{receiptsMs:86400000}}); expect(a.policyDigest).toBe(b.policyDigest); expect(a.policyDigest).not.toBe(c.policyDigest); });
 it('rejects unknown secret-bearing configuration and disables network', () => { expect(() => effectiveConfig({secret:'never-print'})).toThrow(); expect(JSON.stringify(effectiveConfig({}))).toContain('disabled'); });
 it('accepts YAML through the same closed schema', () => { expect(parseConfig('overrides:\n  receiptsMs: 86400000\n', 'yaml')).toEqual({overrides:{receiptsMs:86400000}}); });
});
describe('classification', () => { it.each(['synthetic','public','reviewed-minimized'])('%s allowed', v => expect(isAllowedInput(v)).toBe(true)); it.each(['private','proprietary','sensitive','unknown'])('%s denied', v => expect(isAllowedInput(v)).toBe(false)); });
describe('routes', () => it('constructs no live route', () => expect(() => assertOfflineRoute('provider')).toThrow('offline mode')));
