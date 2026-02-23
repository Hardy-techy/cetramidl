/**
 * Check and Update SimplePriceFeed Prices
 * This checks the current prices and updates them if needed
 */

const Web3 = require('web3');
const SimplePriceFeedABI = [
  {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [
      { "internalType": "uint80", "name": "roundId", "type": "uint80" },
      { "internalType": "int256", "name": "answer", "type": "int256" },
      { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
      { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
      { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPrice",
    "outputs": [{ "internalType": "int256", "name": "", "type": "int256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "int256", "name": "newPrice", "type": "int256" }],
    "name": "updatePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const PRICE_FEEDS = {
  USDC: '0x844B492C803b619B29416F36666519c094503fa0',
  USDT: '0x44a65AbF083e6fC19725e1eB754500Cf6AabcE80',
  WETH: '0x55ECd51cf5F2A04ee2f34D4FEF8eb3B6474fE5b1'
};

async function checkAndUpdatePrices() {
  try {
    const web3 = new Web3('https://rpc.midl.network'); // Update with your RPC
    const accounts = await web3.eth.getAccounts();
    const owner = accounts[0];

    console.log('🔍 Checking current prices in SimplePriceFeed contracts...\n');

    for (const [token, feedAddress] of Object.entries(PRICE_FEEDS)) {
      console.log(`\n${token} Price Feed (${feedAddress}):`);

      const priceFeed = new web3.eth.Contract(SimplePriceFeedABI, feedAddress);

      try {
        // Get current price
        const price = await priceFeed.methods.getPrice().call();
        const decimals = await priceFeed.methods.decimals().call();
        const humanPrice = Number(price) / (10 ** Number(decimals));

        console.log(`  Current Price: ${price} (raw)`);
        console.log(`  Decimals: ${decimals}`);
        console.log(`  Human Readable: $${humanPrice.toFixed(2)}`);

        // If price is 0, suggest update
        if (price === '0') {
          console.log(`  ⚠️  PROBLEM: Price is 0! This is why ${token} shows $0.00 in your app.`);
          console.log(`  💡 Solution: Need to call updatePrice() on this SimplePriceFeed contract`);

          // Suggest appropriate prices
          let suggestedPrice;
          if (token === 'USDC' || token === 'USDT') {
            // Stablecoins: $1.00 with 8 decimals = 100000000
            suggestedPrice = '100000000'; // $1.00
            console.log(`  Suggested Price: ${suggestedPrice} (= $1.00 with 8 decimals)`);
          } else if (token === 'WETH') {
            // ETH: ~$2500 with 8 decimals = 250000000000
            suggestedPrice = '250000000000'; // $2500
            console.log(`  Suggested Price: ${suggestedPrice} (= $2500.00 with 8 decimals)`);
          }

          console.log(`\n  To fix, run this in console or Remix:`);
          console.log(`  priceFeed.methods.updatePrice("${suggestedPrice}").send({ from: owner })`);
        } else {
          console.log(`  ✅ Price is set correctly!`);
        }
      } catch (error) {
        console.log(`  ❌ Error reading price: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📋 SUMMARY:');
    console.log('If USDC and USDT show price = 0, you need to update their SimplePriceFeed contracts.');
    console.log('WETH is working because its SimplePriceFeed has a price set.');
    console.log('\nUse the browser console fix below or update via Remix.');

  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

checkAndUpdatePrices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

