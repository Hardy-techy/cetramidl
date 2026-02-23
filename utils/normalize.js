import * as MockTokensModule from "../abis/MockTokens.json"; // Your deployed Mock tokens ABI
import usdcImg from "../assets/usdc.png";
import usdtImg from "../assets/usdtt.png";
import wethImg from "../assets/ethereum.png";
import pushImg from "../assets/midllogo.jpg";
import cetImg from "../assets/cet.png";
import btcImg from "../assets/bitcoin.png";
import { getCachedMetadata, setCachedMetadata, getCachedDynamic, setCachedDynamic } from "./rpcCache";

const tokenImages = {
  USDC: usdcImg,
  USDT: usdtImg,
  WETH: wethImg,
  MBTC: btcImg, // Bitcoin
  LAR: btcImg, // Placeholder (LAR is correlated to BTC value)
  WPC: pushImg, // MIDL Token
  CET: cetImg, // Cetra Token

  // Static Address Mapping (Instant Load - Lowercase for easier matching)
  '0xc45c716f69879340ee813bbaa388f8d62b1871d0': usdcImg, // USDC
  '0x9546abfa05ddd78c9ed3a5b9298973ec78bb6a92': wethImg, // WETH
  '0x9a40f4d1661eefb4192eeb5186d3c245f06a1819': cetImg,  // CET
  '0x1fa703e141d123d00074f28462e52ae32c0d38a2': btcImg, // mBTC
  '0x5c08a9fad08c12e6c177783b28d0c7f3e88c3722': btcImg, // LARToken
};


// ...

// Helper for case-insensitive image lookup
const getImage = (key) => {
  if (!key) return null;

  // 1. Exact Match
  if (tokenImages[key]) return tokenImages[key];

  // 2. Uppercase Match (for Symbols like "usdc" -> "USDC")
  const upper = key.toUpperCase();
  if (tokenImages[upper]) return tokenImages[upper];

  // 3. Lowercase Match (for Addresses like "0x5B..." -> "0x5b...")
  const lower = key.toLowerCase();
  if (tokenImages[lower]) return tokenImages[lower];

  return null;
};

// Extract ABI correctly
const artifact = MockTokensModule.default || MockTokensModule;
const MockTokens = artifact.abi || artifact;

// Set to false for better performance in production
const DEBUG_MODE = false;

// 🛡️ REFACTORED: Accepts MARKET Web3 (Bulk/Cached) and USER Web3 (Fresh/Interactive)
export const normalizeToken = async (web3, contract, currentToken, connectedAccount = null, marketWeb3 = null, userWeb3 = null) => {
  // Convert from token units to human-readable based on actual decimals
  const fromTokenUnits = (amount, decimals) => {
    return (Number(amount) / (10 ** Number(decimals))).toString();
  };

  const toBN = (amount) => {
    return web3.utils.toBN(amount);
  };

  const account = connectedAccount || null;

  // 🛡️ MARKET DATA PROVIDER (Private RPC - High Throughput, Global Data)
  const web3ForMarket = marketWeb3 || web3;

  // 👤 USER DATA PROVIDER (Public RPC - Freshness, User Balances)
  const web3ForUser = userWeb3 || web3;

  const tokenInstMarket = new web3ForMarket.eth.Contract(MockTokens, currentToken.tokenAddress);
  const tokenInstUser = new web3ForUser.eth.Contract(MockTokens, currentToken.tokenAddress);

  // 🚀 AGGRESSIVE CACHING - Reduces RPC calls by 90%

  // Cache Key Helpers
  // Handle potential index-based struct keys (Web3 quirk)
  const tokenAddr = currentToken.tokenAddress || currentToken[0];
  const tokenName = currentToken.name || currentToken[3];

  const metadataKey = `metadata_${tokenAddr}`;
  const symbolKey = `symbol_${tokenAddr}`;
  const priceKey = `price_${tokenAddr}`;
  const totalSuppliedKey = `totalSupplied_${tokenAddr}`;
  const totalBorrowedKey = `totalBorrowed_${tokenAddr}`;
  const balanceKey = `balance_${tokenAddr}_${account}`;
  const userBorrowedKey = `userBorrowed_${tokenAddr}_${account}`;
  const userLentKey = `userLent_${tokenAddr}_${account}`;
  const userWithdrawKey = `userWithdraw_${account}`;
  const userBorrowLimitKey = `userBorrowLimit_${account}`;

  // Helper Promises
  const fetchDecimals = async () => {
    const cachedMetadata = getCachedMetadata(metadataKey);
    if (cachedMetadata) return cachedMetadata;
    try {
      const d = await tokenInstMarket.methods.decimals().call();
      setCachedMetadata(metadataKey, d);
      return d;
    } catch (e) {
      console.error(`Error fetching decimals for ${tokenAddr}:`, e);
      return "18"; // Default
    }
  };

  const fetchSymbol = async () => {
    const cachedSymbol = getCachedMetadata(symbolKey);
    if (cachedSymbol) return cachedSymbol;
    try {
      const s = await tokenInstMarket.methods.symbol().call();
      setCachedMetadata(symbolKey, s);
      return s;
    } catch (e) {
      return tokenName || "UNKNOWN";
    }
  };

  const fetchPrice = async () => {
    const cachedPrice = getCachedDynamic(priceKey);
    if (cachedPrice) return cachedPrice;
    try {
      // Use Market Provider for Contract Reads too?
      // Yes, if we can. But 'contract' object passed in is usually linked to specific web3.
      // We should create a contract instance with marketWeb3.
      const contractForMarket = new web3ForMarket.eth.Contract(contract.options.jsonInterface, contract.options.address);
      const p = await contractForMarket.methods.oneTokenEqualsHowManyDollars(tokenAddr).call();
      setCachedDynamic(priceKey, p);
      return p;
    } catch (e) {
      console.error(`Error fetching price for ${tokenAddr}:`, e);
      return ["0", "0"];
    }
  };

  const fetchTotalSupplied = async () => {
    const cached = getCachedDynamic(totalSuppliedKey);
    if (cached) return cached;
    try {
      const contractForMarket = new web3ForMarket.eth.Contract(contract.options.jsonInterface, contract.options.address);
      const s = await contractForMarket.methods.getTotalTokenSupplied(tokenAddr).call();
      setCachedDynamic(totalSuppliedKey, s);
      return s;
    } catch (e) {
      return "0";
    }
  };

  const fetchTotalBorrowed = async () => {
    const cached = getCachedDynamic(totalBorrowedKey);
    if (cached) return cached;
    try {
      const contractForMarket = new web3ForMarket.eth.Contract(contract.options.jsonInterface, contract.options.address);
      const b = await contractForMarket.methods.getTotalTokenBorrowed(tokenAddr).call();
      setCachedDynamic(totalBorrowedKey, b);
      return b;
    } catch (e) {
      return "0";
    }
  };

  // User Data Promises
  const fetchUserData = async (symbol) => {
    if (!account) return {
      walletBalance: "0",
      userTokenLentAmount: "0",
      userTokenBorrowedAmount: "0",
      userTotalAmountAvailableToWithdrawInDollars: "0",
      userTotalAmountAvailableForBorrowInDollars: "0"
    };

    try {
      // 🚀 BATCH REQUEST OPTIMIZATION
      // Combine all 5 user-specific calls into ONE HTTP request
      // This reduces public RPC load by 80% (220 limit becomes effectively 1100 ops)

      const batch = new web3ForUser.BatchRequest();
      const readContractUser = new web3ForUser.eth.Contract(contract.options.jsonInterface, contract.options.address);

      // Promisify the batch execution
      const batchPromise = new Promise((resolve, reject) => {
        const results = {};
        let requestCount = 5; // We are making 5 requests
        let completedCount = 0;
        let hasError = false;

        const handleResult = (key, err, result) => {
          if (hasError) return;
          if (err) {
            // If one fails, we can log it and default to 0, or fail the batch.
            // For robustness, let's default to "0" and log the error.
            console.error(`Batch Error [${key}]:`, err);
            results[key] = "0";
          } else {
            results[key] = result;
          }
          completedCount++;
          if (completedCount === requestCount) {
            resolve(results);
          }
        };

        // 1. Wallet Balance
        batch.add(tokenInstUser.methods.balanceOf(account).call.request({}, (err, res) => handleResult('walletBalance', err, res)));

        // 2. Lent Amount
        batch.add(readContractUser.methods.tokensLentAmount(tokenAddr, account).call.request({}, (err, res) => handleResult('lentAmount', err, res)));

        // 3. Borrowed Amount (Standard)
        batch.add(readContractUser.methods.tokensBorrowedAmount(tokenAddr, account).call.request({}, (err, res) => handleResult('borrowedStandard', err, res)));

        // 4. Borrowed Amount (Swapped)
        batch.add(readContractUser.methods.tokensBorrowedAmount(account, tokenAddr).call.request({}, (err, res) => handleResult('borrowedSwapped', err, res)));

        // 5. Available to Borrow
        batch.add(readContractUser.methods.getUserTotalAmountAvailableForBorrowInDollars(account).call.request({}, (err, res) => handleResult('availBorrow', err, res)));

        // Execute
        try {
          batch.execute();
        } catch (e) {
          reject(e);
        }
      });

      const { walletBalance, lentAmount, borrowedStandard, borrowedSwapped, availBorrow } = await batchPromise;

      let userTokenBorrowedAmount = borrowedStandard;
      if (borrowedSwapped !== "0" && borrowedStandard === "0") {
        // console.log(`DEBUG: ${symbol} Borrow Check - SWAPPED detected!`);
        userTokenBorrowedAmount = borrowedSwapped;
      }

      setCachedDynamic(balanceKey, walletBalance);
      setCachedDynamic(userBorrowedKey, userTokenBorrowedAmount);
      setCachedDynamic(userLentKey, lentAmount);
      setCachedDynamic(userBorrowLimitKey, availBorrow);

      return {
        walletBalance,
        userTokenLentAmount: lentAmount,
        userTokenBorrowedAmount: userTokenBorrowedAmount,
        userTotalAmountAvailableToWithdrawInDollars: "0", // Original didn't fetch this
        userTotalAmountAvailableForBorrowInDollars: availBorrow
      };

    } catch (e) {
      console.error(`Error fetching user data for ${symbol}:`, e);
      return {
        walletBalance: "0",
        userTokenLentAmount: "0",
        userTokenBorrowedAmount: "0",
        userTotalAmountAvailableToWithdrawInDollars: "0",
        userTotalAmountAvailableForBorrowInDollars: "0"
      };
    }
  };

  // 1. Kick off all independent requests in parallel
  const [
    decimals,
    symbol,
    priceResult,
    totalSuppliedInContract,
    totalBorrowedInContract
  ] = await Promise.all([
    fetchDecimals(),
    fetchSymbol(),
    fetchPrice(),
    fetchTotalSupplied(),
    fetchTotalBorrowed()
  ]);

  // 2. Fetch User Data (depends on symbol potentially for logging, but mostly independent)
  // We can actually run this in parallel with step 1 if we don't need symbol for logging errors inside it.
  // The fetchUserData uses `symbol` for logging. We can pass "TOKEN" if symbol isn't ready or just await symbol first.
  // To truly parallelize, we should run it with the others.
  const userData = await fetchUserData(symbol || tokenName);

  const {
    walletBalance,
    userTokenLentAmount,
    userTokenBorrowedAmount,
    userTotalAmountAvailableToWithdrawInDollars,
    userTotalAmountAvailableForBorrowInDollars
  } = userData;


  const price = priceResult[0] || "0";
  const priceDecimals = priceResult[1] || "18";
  const oneTokenToDollar = parseFloat(price) / (10 ** parseInt(priceDecimals));

  const utilizationRate = Number(totalSuppliedInContract) > 0
    ? (Number(totalBorrowedInContract) * 100) / Number(totalSuppliedInContract)
    : 0;

  const availableAmountInContract = toBN(totalSuppliedInContract).sub(toBN(totalBorrowedInContract)).toString();

  // OPTIMIZATION 2: Convert to dollars using oneTokenToDollar (already have it!) instead of more contract calls
  const walletBalanceInDollars = web3.utils.toWei((fromTokenUnits(walletBalance, decimals) * oneTokenToDollar).toString());
  const totalSuppliedInContractInDollars = web3.utils.toWei((fromTokenUnits(totalSuppliedInContract, decimals) * oneTokenToDollar).toString());
  const totalBorrowedInContractInDollars = web3.utils.toWei((fromTokenUnits(totalBorrowedInContract, decimals) * oneTokenToDollar).toString());
  const userTokenBorrowedAmountInDollars = web3.utils.toWei((fromTokenUnits(userTokenBorrowedAmount, decimals) * oneTokenToDollar).toString());
  const userTokenLentAmountInDollars = web3.utils.toWei((fromTokenUnits(userTokenLentAmount, decimals) * oneTokenToDollar).toString());
  const availableAmountInContractInDollars = web3.utils.toWei((fromTokenUnits(availableAmountInContract, decimals) * oneTokenToDollar).toString())


  // Helper for case-insensitive image lookup
  const getImage = (key) => {
    if (!key) return null;
    if (tokenImages[key]) return tokenImages[key];

    const upper = key.toUpperCase();
    return tokenImages[upper] || tokenImages[key];
  };

  return {
    name: tokenName,
    symbol: symbol,
    tokenSymbol: symbol,
    image: getImage(tokenAddr) || getImage(tokenName) || getImage(symbol) || tokenImages['USDC'], // Fallback
    tokenAddress: tokenAddr,
    userTotalAmountAvailableToWithdrawInDollars: web3.utils.fromWei(userTotalAmountAvailableToWithdrawInDollars), // Dollars are always 18 decimals
    userTotalAmountAvailableForBorrowInDollars: web3.utils.fromWei(userTotalAmountAvailableForBorrowInDollars), // Dollars are always 18 decimals
    walletBalance: {
      amount: fromTokenUnits(walletBalance, decimals), // Use actual token decimals
      inDollars: web3.utils.fromWei(walletBalanceInDollars), // Dollars are always 18 decimals
      raw: walletBalance, // Raw Wei string for BN operations
    },
    totalSuppliedInContract: {
      amount: fromTokenUnits(totalSuppliedInContract, decimals), // Use actual token decimals
      inDollars: web3.utils.fromWei(totalSuppliedInContractInDollars), // Dollars are always 18 decimals
    },
    totalBorrowedInContract: {
      amount: fromTokenUnits(totalBorrowedInContract, decimals), // Use actual token decimals
      inDollars: web3.utils.fromWei(totalBorrowedInContractInDollars), // Dollars are always 18 decimals
    },
    availableAmountInContract: {
      amount: fromTokenUnits(availableAmountInContract, decimals), // Use actual token decimals
      inDollars: web3.utils.fromWei(availableAmountInContractInDollars), // Dollars are always 18 decimals
    },
    userTokenBorrowedAmount: {
      amount: fromTokenUnits(userTokenBorrowedAmount, decimals), // Use actual token decimals
      inDollars: web3.utils.fromWei(userTokenBorrowedAmountInDollars), // Dollars are always 18 decimals
    },
    userTokenLentAmount: {
      amount: fromTokenUnits(userTokenLentAmount, decimals), // Use actual token decimals
      inDollars: web3.utils.fromWei(userTokenLentAmountInDollars), // Dollars are always 18 decimals
    },
    LTV: web3.utils.fromWei(currentToken.LTV),
    borrowAPYRate: "0.08", // Fixed 8% APY as requested
    supplyAPYRate: (() => {
      try {
        if (!currentToken || !currentToken.name) return "0.00";
        const s = currentToken.name.toUpperCase();
        if (s.includes('PC') || s.includes('PUSH')) return "0.06"; // 6%
        if (s.includes('WETH')) return "0.0125"; // 1.25%
        if (s.includes('CET')) return "0.066"; // 6.6%
        if (s.includes('USDC')) return "0.05"; // 5%
        if (s.includes('MBTC') || s.includes('BTC')) return "0.03"; // 3%
        return "0.00";
      } catch (e) {
        return "0.00";
      }
    })(),
    utilizationRate: utilizationRate,
    oneTokenToDollar,
    decimals
  };
};
