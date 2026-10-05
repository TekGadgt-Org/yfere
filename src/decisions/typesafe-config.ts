/** Contract identity is deliberately separate from yfere's request sdkVersion digest. */
export const TYPESAFE_SDK_VERSION = '0.6.0' as const;
export const TYPESAFE_SDK_LICENSE = 'MIT' as const;
export const TYPESAFE_SDK_INTEGRITY = 'sha512-IddX+Q0XM+VagOUZFeP7wZjaO4SHMdvnh2zEBdrZZnXedWI3BNK1lKhMx3ayrkFWvVLbVcUHJy6AVZlY+e6Jaw==' as const;
export type TypeSafeModel = { readonly kind: 'pinned'; readonly value: string } | { readonly kind: 'alias'; readonly value: 'jev-latest' | 'jev-preview' };
export type TypeSafeConfig = Readonly<{ model: TypeSafeModel; maxAttempts?: number; backoffMs?: number; maxBackoffMs?: number }>;
export const typeSafeConfig = (config: TypeSafeConfig): TypeSafeConfig => {
  const model = config?.model;
  const validModel = model && ((model.kind === 'pinned' && /^jev-[0-9]+\.[0-9]+\.[0-9]+$/.test(model.value)) || (model.kind === 'alias' && (model.value === 'jev-latest' || model.value === 'jev-preview')));
  const validNumber = (n: number | undefined, min: number, max: number) => n === undefined || (Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max);
  if (!validModel || !validNumber(config.maxAttempts, 1, 4) || !validNumber(config.backoffMs, 0, 60_000) || !validNumber(config.maxBackoffMs, 0, 60_000)) throw new Error('invalid typesafe configuration');
  return Object.freeze({ backoffMs: 0, maxBackoffMs: 5000, ...config });
};