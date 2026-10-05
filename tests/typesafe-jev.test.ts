import { describe, expect, it } from 'vitest';
import { projectSystemOneRequest, typeSafeConfig, TYPESAFE_SDK_INTEGRITY, TYPESAFE_SDK_LICENSE, TYPESAFE_SDK_VERSION } from '../src/decisions/index.js';

describe('hermetic TypeSafe contract', () => {
  it('pins the audited package identity without constructing a client', () => {
    expect([TYPESAFE_SDK_VERSION, TYPESAFE_SDK_LICENSE, TYPESAFE_SDK_INTEGRITY]).toEqual([
      '0.6.0', 'MIT', 'sha512-IddX+Q0XM+VagOUZFeP7wZjaO4SHMdvnh2zEBdrZZnXedWI3BNK1lKhMx3ayrkFWvVLbVcUHJy6AVZlY+e6Jaw==',
    ]);
    expect(typeSafeConfig({ model: { kind: 'pinned', value: 'jev-1.13.0' } }).model).toEqual({ kind: 'pinned', value: 'jev-1.13.0' });
  });

  it('projects only the exact System One keys and preserves ordering', () => {
    const request: any = { state: { text: 'synthetic' }, questions: {
      route: { kind: 'choice', instructions: 'Choose', options: { a: 'A', b: 'B' } },
      fit: { kind: 'score', instructions: 'Rate', levels: ['low', 'high'] },
      ok: { kind: 'noul', instructions: 'Does it fit?' },
    } };
    expect(projectSystemOneRequest(request, 'jev-1.13.0')).toEqual({ model: 'jev-1.13.0', state: request.state, questions: {
      route: { type: 'choice', instructions: 'Choose', criteria: { a: 'A', b: 'B' } },
      fit: { type: 'score', instructions: 'Rate', criteria: ['low', 'high'] },
      ok: { type: 'noul', instructions: 'Does it fit?' },
    } });
  });
});
