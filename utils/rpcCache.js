// Aggressive RPC caching to reduce requests by 90%
// Token metadata (decimals, symbols) NEVER changes - cache forever
// Balances/prices - cache for 30 seconds

const cache = {
    metadata: {}, // Never expires (decimals, symbols, addresses)
    dynamic: {},  // Expires after 30s (balances, prices)
};

const DYNAMIC_CACHE_TTL = 30000; // 30 seconds

export function getCachedMetadata(key) {
    return cache.metadata[key];
}

export function setCachedMetadata(key, value) {
    cache.metadata[key] = value;
}

export function getCachedDynamic(key) {
    const cached = cache.dynamic[key];
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > DYNAMIC_CACHE_TTL) {
        delete cache.dynamic[key];
        return null;
    }

    return cached.value;
}

export function setCachedDynamic(key, value) {
    cache.dynamic[key] = {
        value,
        timestamp: Date.now()
    };
}

export function clearDynamicCache() {
    cache.dynamic = {};
}
