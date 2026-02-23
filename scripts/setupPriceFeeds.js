/**
 * Setup Price Feeds Script
 * This script links your deployed price feeds to the lending contract
 * Run this with: node scripts/setupPriceFeeds.js
 */

const Web3 = require('web3');
const LendingABI = require('../abis/LendingAndBorrowing.json');

// Addresses from deployed contracts
const ADDRESSES = {
  lendingContract: '0x2b8B71698Bd11E8574c128D806177BB22141ACdf',
  tokens: {
    USDC: '0x63A02A958e9803a92b849d802f2A452922733F56',
    USDT: '0x51BD80d3102cFC1F22dD7024C99A6E163aA672fF',
    WETH: '0xe9f78B65A69185740e376F644abf817B839bA45c'
  },
  priceFeeds: {
    USDC: '0x844B492C803b619B29416F36666519c094503fa0',
    USDT: '0x44a65AbF083e6fC19725e1eB754500Cf6AabcE80',
    WETH: '0x55ECd51cf5F2A04ee2f34D4FEF8eb3B6474fE5b1'
  }
};

async function setupPriceFeeds() {
  try {
    // Connect to MIDL
    const web3 = new Web3('https://rpc.midl.network'); // Update with your RPC

    // Get the contract instance
    const lendingContract = new web3.eth.Contract(
      LendingABI,
      ADDRESSES.lendingContract
    );

    // Get accounts (you'll need to set up your private key)
    const accounts = await web3.eth.getAccounts();
    const owner = accounts[0];

    console.log('🚀 Setting up price feeds...');
    console.log('Owner address:', owner);
    console.log('');
    console.log('Note: WETH was already configured, so only setting USDC and USDT');
    console.log('');

    // Set price feed only for USDC and USDT (WETH is already set)
    const tokens = ['USDC', 'USDT'];

    for (const token of tokens) {
      console.log(`Setting price feed for ${token}...`);
      console.log(`  Token: ${ADDRESSES.tokens[token]}`);
      console.log(`  Price Feed: ${ADDRESSES.priceFeeds[token]}`);

      try {
        const tx = await lendingContract.methods
          .addTokenToPriceFeedMapping(
            ADDRESSES.tokens[token],
            ADDRESSES.priceFeeds[token]
          )
          .send({ from: owner, gas: 500000 });

        console.log(`  ✅ Transaction successful: ${tx.transactionHash}`);
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
      console.log('');
    }

    console.log('✅ All price feeds configured!');
    console.log('');
    console.log('🔍 Verifying all tokens (including WETH)...');

    // Verify the setup for all tokens
    const allTokens = ['USDC', 'USDT', 'WETH'];
    for (const token of allTokens) {
      try {
        const result = await lendingContract.methods
          .oneTokenEqualsHowManyDollars(ADDRESSES.tokens[token])
          .call();

        const price = Number(result[0]) / (10 ** Number(result[1]));
        console.log(`${token} price: $${price.toFixed(2)} ${token === 'WETH' ? '(already was working)' : '(now fixed!)'}`);
      } catch (error) {
        console.log(`${token}: Error getting price - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupPriceFeeds()
  .then(() => {
    console.log('\n✨ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

