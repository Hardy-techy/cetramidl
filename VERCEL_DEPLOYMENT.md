# Vercel Deployment Setup

## Environment Variables

You need to add these environment variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each of these variables:

```
NEXT_PUBLIC_MIDL_CHAIN_ID=42101
NEXT_PUBLIC_MIDL_RPC_URL=https://explorer.midl.network/
NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS=0x2b8B71698Bd11E8574c128D806177BB22141ACdf
NEXT_PUBLIC_LAR_TOKEN_ADDRESS=0x0415ef13Cc912C84752Ca39dFAF572CE89906F67
NEXT_PUBLIC_ADE_TOKEN_ADDRESS=0x27ef0A2ebA087c9a686477b3482BbCE6a9eeFA72
NEXT_PUBLIC_USDC_ADDRESS=0x63A02A958e9803a92b849d802f2A452922733F56
NEXT_PUBLIC_USDT_ADDRESS=0x51BD80d3102cFC1F22dD7024C99A6E163aA672fF
NEXT_PUBLIC_WETH_ADDRESS=0xe9f78B65A69185740e376F644abf817B839bA45c
NEXT_PUBLIC_USDC_PRICE_FEED=0x844B492C803b619B29416F36666519c094503fa0
NEXT_PUBLIC_USDT_PRICE_FEED=0x44a65AbF083e6fC19725e1eB754500Cf6AabcE80
NEXT_PUBLIC_WETH_PRICE_FEED=0x55ECd51cf5F2A04ee2f34D4FEF8eb3B6474fE5b1
NEXT_PUBLIC_EXPLORER_URL=https://explorer.midl.network/
```

4. After adding all variables, redeploy your application

## Important Notes

- Make sure all contract addresses are valid and deployed on MIDL testnet
- Verify the contracts are working by checking them on the explorer
- If you see $0.00 everywhere, it means either:
  - Contracts aren't deployed
  - Wrong contract addresses
  - Network connection issues
  - You haven't connected your wallet yet

## Troubleshooting

If data shows as $0.00:
1. Connect your wallet
2. Make sure you're on MIDL Testnet
3. Verify contract addresses on the explorer
4. Check browser console for errors
