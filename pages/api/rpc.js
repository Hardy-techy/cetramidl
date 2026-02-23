// Multi-node RPC proxy with failover, queuing, and DETAILED ANALYTICS
// Tracks every request to diagnose rate limiting issues

// 🔐 PRIVATE RPC for all READ operations (eth_call, eth_getBalance, etc.)
// 🌐 PUBLIC nodes ONLY for WRITE operations (eth_sendTransaction, eth_estimateGas)
const PRIVATE_RPC = process.env.PRIVATE_RPC_URL || 'https://rpc.staging.midl.xyz';
const PUBLIC_NODES = [
    'https://rpc.staging.midl.xyz'
];

// Combine all nodes for health tracking
// Private first, then public
const RPC_NODES = [PRIVATE_RPC, ...PUBLIC_NODES];

// Methods that require wallet interaction OR transaction tracking (use public nodes)
// CRITICAL: Transaction receipts MUST use same nodes as sendTransaction for consistency
const WALLET_METHODS = [
    'eth_sendTransaction',
    'eth_sendRawTransaction',
    'eth_sign',
    'eth_signTransaction',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v4',
    'wallet_switchEthereumChain',
    'wallet_addEthereumChain',
    'eth_getTransactionReceipt',  // ✅ Must use same node as transaction
    'eth_getTransactionByHash',   // ✅ Must use same node as transaction
    'eth_estimateGas',            // ✅ Wallet interaction
    'eth_gasPrice',               // ✅ Wallet interaction
];

// Determine which RPC to use based on method and request type
function getRPCNodes(method, type = 'user') {
    if (WALLET_METHODS.includes(method)) {
        // Wallet methods: Only generic public nodes
        return PUBLIC_NODES;
    }

    if (type === 'market') {
        // 📊 Market Data: Prioritize Private RPC (High throughput, allowed to be slightly behind)
        // Fallback to Public if Private fails
        return [PRIVATE_RPC, ...PUBLIC_NODES];
    }

    // 👤 User Data (Default): Prioritize Public Nodes (Freshness)
    // Fallback: Node 1 -> Node 2 (Private RPC excluded to prevent rate limit impact)
    return PUBLIC_NODES;
}

// Request queue
const requestQueue = [];
let isProcessing = false;
const QUEUE_DELAY = 50;

// Track node health
const nodeHealth = RPC_NODES.map(() => ({
    failures: 0,
    lastFailure: 0,
    backoffUntil: 0
}));

// 📊 ANALYTICS - Track everything
const analytics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    queuedRequests: 0,
    methodCounts: {},
    nodeStats: RPC_NODES.map((url) => ({
        url,
        requests: 0,
        successes: 0,
        failures: 0,
        rateLimits: 0,
        serverErrors: 0,
        timeouts: 0
    })),
    startTime: Date.now()
};

// Log analytics every 10 seconds
// Analytics logging removed for production

// Process queue sequentially
async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;

    isProcessing = true;
    while (requestQueue.length > 0) {
        const { resolve, reject, body, type } = requestQueue.shift();
        try {
            const result = await makeRpcRequest(body, type);
            resolve(result);
        } catch (error) {
            reject(error);
        }
        // No delay - caching prevents bursts
    }
    isProcessing = false;
}

// Make actual RPC request with node failover
async function makeRpcRequest(body, type) {
    const now = Date.now();
    const method = body?.method || 'unknown';

    // Track method
    analytics.methodCounts[method] = (analytics.methodCounts[method] || 0) + 1;

    // 🎯 SMART ROUTING - Use private RPC for reads, public nodes for writes
    const nodesToUse = getRPCNodes(method, type);

    // Find healthy nodes
    // CRITICAL FIX: Map based on GLOBAL index in RPC_NODES, not local index in nodesToUse
    const healthyNodes = nodesToUse.map(url => {
        const globalIndex = RPC_NODES.indexOf(url);
        return {
            url,
            index: globalIndex,
            health: nodeHealth[globalIndex]
        };
    }).filter(node => now >= node.health.backoffUntil)
        .sort((a, b) => a.health.failures - b.health.failures);

    if (healthyNodes.length === 0) {
        // If all healthy nodes for this method are down, pick the one with oldest failure (from available nodes)
        // We must check only nodes relevant to this method
        // But for simplicity, we fallback to the first relevant node
        const fallbackUrl = nodesToUse[0];
        const fallbackIndex = RPC_NODES.indexOf(fallbackUrl);

        nodeHealth[fallbackIndex].backoffUntil = 0;
        nodeHealth[fallbackIndex].failures = 0;
        healthyNodes.push({ url: fallbackUrl, index: fallbackIndex, health: nodeHealth[fallbackIndex] });
    }

    let lastError;

    for (const { url, index, health } of healthyNodes) {
        const nodeStats = analytics.nodeStats[index];
        nodeStats.requests++;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeout);

            // Handle rate limiting
            if (response.status === 429) {
                nodeStats.rateLimits++;
                nodeStats.failures++;
                health.failures++;
                health.lastFailure = now;
                health.backoffUntil = now + (Math.pow(2, Math.min(health.failures, 6)) * 1000);
                console.warn(`⚠️  Node [${url}] RATE LIMITED (429) - ${method}`);
                lastError = new Error(`Node ${url} rate limited`);
                continue;
            }

            // Handle server errors
            if (response.status >= 500) {
                nodeStats.serverErrors++;
                nodeStats.failures++;
                health.failures++;
                health.lastFailure = now;
                health.backoffUntil = now + 2000;
                console.warn(`⚠️  Node [${url}] SERVER ERROR (${response.status}) - ${method}`);
                lastError = new Error(`Node ${url} server error: ${response.status}`);
                continue;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Success!
            nodeStats.successes++;
            health.failures = Math.max(0, health.failures - 1);

            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                nodeStats.timeouts++;
                nodeStats.failures++;
                health.failures++;
                health.lastFailure = now;
                health.backoffUntil = now + 3000;
                // console.warn(`⚠️  Node [${url}] TIMEOUT - ${method}`);
            }
            lastError = error;
            continue;
        }
    }

    // All nodes failed
    throw lastError || new Error('All RPC nodes unavailable');
}

export default async function handler(req, res) {
    // 🛡️ CORS Handling
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin (including wallet.push.org)
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type } = req.query; // 'market' or 'user' (default)

    analytics.totalRequests++;
    analytics.queuedRequests++;

    try {
        const result = await new Promise((resolve, reject) => {
            requestQueue.push({ resolve, reject, body: req.body, type });
            processQueue();
        });

        analytics.successfulRequests++;
        analytics.queuedRequests--;
        return res.status(200).json(result);
    } catch (error) {
        analytics.failedRequests++;
        analytics.queuedRequests--;
        // Only log if NOT an AbortError/Timeout
        if (error.name !== 'AbortError' && !error.message.includes('aborted')) {
            console.error('❌ RPC Proxy Error:', error.message, '- Method:', req.body?.method);
        }
        return res.status(502).json({
            jsonrpc: '2.0',
            id: req.body?.id || null,
            error: {
                code: -32603,
                message: 'All RPC nodes temporarily unavailable. Please retry.'
            }
        });
    }
}

