export const NETWORK_STATE = Object.freeze({ default:'denied', liveProviders:'disabled', providerRoutesConstructed:false } as const);
export function assertOfflineRoute(route: string): never { throw new Error(`offline mode: route unavailable (${route})`); }
