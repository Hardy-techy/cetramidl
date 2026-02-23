# Cetra - DeFi Lending & Borrowing Protocol

## 🌟 Overview

Cetra is a decentralized finance (DeFi) protocol that enables users to lend and borrow cryptocurrency assets in a trustless, secure, and efficient manner. Built on blockchain technology, Cetra empowers users to earn interest on their crypto holdings or access liquidity by borrowing against their collateral.

## ✨ Key Features

- **🏦 Lending**: Deposit your crypto assets and earn competitive interest rates
- **💰 Borrowing**: Access liquidity by borrowing against your collateralized assets
- **📊 Price Feeds**: Accurate asset pricing powered by decentralized oracles
- **💎 Multiple Asset Support**: Support for various tokens including WETH, USDC, USDT, and more
- **⚡ Instant Transactions**: Fast and efficient blockchain transactions
- **🎨 Modern UI**: Intuitive and responsive user interface built with Next.js
- **🌐 MIDL Integration**: Deployed on MIDL network for enhanced scalability and low fees

## 🛠️ Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Smart Contracts**: Solidity
- **Blockchain**: MIDL & Ethereum/EVM-compatible chains
- **Web3 Integration**: ethers.js
- **Price Oracles**: Self-deployed price feeds

## 📦 Project Structure

```text
Cetra/
├── contracts/            # Smart contract source files
├── components/           # React components
├── pages/                # Next.js pages
├── scripts/              # Deployment and utility scripts
├── abis/                 # Contract ABIs
└── utils/                # Helper functions
```

## 💡 How It Works

### Lending (Supply)

1. Connect your Web3 wallet
2. Select the asset you want to lend
3. Enter the amount to supply
4. Approve the transaction
5. Start earning interest immediately

### Borrowing

1. Supply collateral to the protocol
2. View your borrowing power
3. Select the asset you want to borrow
4. Enter the amount (within your limit)
5. Confirm the transaction
6. Receive borrowed assets instantly

### Repayment

1. Navigate to "Your Borrows"
2. Select the loan to repay
3. Enter repayment amount
4. Confirm transaction
5. Collateral is released proportionally

### Withdrawal

1. Go to "Your Supplies"
2. Select the asset to withdraw
3. Enter withdrawal amount
4. Confirm transaction (if no active borrows against it)

   
## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MetaMask or compatible Web3 wallet
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cetra.git
   cd cetra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS=your_contract_address
   NEXT_PUBLIC_LAR_TOKEN_ADDRESS=your_lar_token_address
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔗 MIDL Network Integration

Cetra is deployed on **MIDL Regtestnet**, a high-performance blockchain network designed for scalability and efficiency.

### What is MIDL?

Midl introduces a Bitcoin execution environment with the power of Ethereum’s VM that processes smart contracts and enables dApps to function natively. 

Developers get the familiar DevEx.
Users never leave the network.

And Bitcoin gets what it always lacked: the engine for the biggest token economy.

### Connect to MIDL

To connect your wallet to the MIDL network:

**Network Details:**
- **Network Name**: MIDL Regtestnet
- **RPC URL**: https://rpc.staging.midl.xyz
- **Chain ID**: 2049
- **Currency Symbol**: MIDL
- **Block Explorer**: https://explorer.midl.network/

Add these details to your MetaMask or Web3 wallet to interact with Cetra on MIDL.


## 📊 Supported Assets

| Token | Symbol | Network | Collateral Factor |
|-------|--------|---------|-------------------|
| Wrapped Ether | WETH | MIDL | 80% |
| USD Coin | USDC | MIDL | 80% |
| CETRA | CET | MIDL | 80% |
|mBTC | mBTC | MIDL | 80% |




## 🤝 Contributing

We welcome contributions from the community! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This project is for educational and experimental purposes. Use at your own risk. Always do your own research before interacting with any DeFi protocol. Never invest more than you can afford to lose.

**Built with ❤️ by the Cetra Team**

*Empowering financial freedom through decentralized lending*
