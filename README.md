# Token Vesting Platform 🚀

A complete **Solana token vesting application** built with modern React and Rust. This platform enables companies to create sophisticated token vesting schedules for employees, advisors, and partners with on-chain enforcement.

## 🎯 Overview

This is a production-ready template for building **token vesting platforms** on Solana. The application includes:

- **Smart Contract**: Rust-based Anchor program with vesting logic
- **Frontend**: React + TypeScript + Tailwind CSS
- **Wallet Integration**: Full Solana wallet support
- **Vesting Features**: Cliff periods, linear vesting, and automatic token distribution

## 🏗️ Architecture

### Backend (Smart Contract)
- **Language**: Rust using Anchor framework
- **Features**:
  - Company vesting account management
  - Employee vesting schedule tracking
  - Cliff period enforcement
  - Automatic token distribution
  - SPL token support

### Frontend (Web Application)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Jotai + TanStack Query
- **Wallet**: Solana Wallet Adapter

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [pnpm](https://pnpm.io/) (v9+ recommended)
- [Rust](https://www.rust-lang.org/tools/install) (for smart contract development)
- [Anchor](https://book.anchor-lang.com/getting_started/installation) (Solana development framework)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd token-vesting
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Build the smart contract**
```bash
pnpm anchor-build
```

4. **Start local development**
```bash
# Start Solana test validator with deployed program
pnpm anchor-localnet

# In another terminal, start the frontend
pnpm dev
```

## 📋 Features

### For Companies/Founders
- ✅ Create company vesting accounts
- ✅ Define vesting schedules with cliff periods
- ✅ Add employees with custom vesting terms
- ✅ Manage multiple vesting programs
- ✅ Track vesting progress

### For Employees/Beneficiaries
- ✅ View vesting schedules
- ✅ Claim vested tokens automatically
- ✅ Track claim history
- ✅ Monitor vesting progress
- ✅ View account details

### Smart Contract Features
- 🛡️ **On-chain enforcement**: Vesting rules enforced by blockchain
- ⚡ **Automatic distribution**: Tokens released based on schedule
- 🔒 **Security**: All operations require proper signatures
- 📈 **Cliff periods**: Support for initial lock-up periods
- 🔄 **Linear vesting**: Smooth token release over time

## 🛠️ Development

### Smart Contract Commands

```bash
# Build the program
pnpm anchor-build

# Test the program locally
pnpm anchor-test

# Deploy to devnet
pnpm anchor deploy --provider.cluster devnet

# Sync program ID (after deployment)
pnpm anchor keys sync
```

### Frontend Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format
```

### Project Structure

```
token-vesting/
├── anchor/                    # Smart contract (Rust + Anchor)
│   ├── programs/counter/
│   │   └── src/lib.rs        # Main vesting logic
│   ├── Anchor.toml           # Anchor configuration
│   └── Cargo.toml            # Rust dependencies
├── src/                      # Frontend application
│   ├── components/           # React components
│   ├── lib/                  # Utilities and constants
│   ├── app.tsx               # Main application
│   └── main.tsx              # Entry point
├── public/                   # Static assets
└── README.md                 # This file
```

## 🎨 Screenshots

> **Note**: Add screenshots of your application here to showcase the UI

- Dashboard view
- Vesting schedule management
- Employee claim interface
- Account details

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Solana Configuration
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# Application Configuration
VITE_APP_NAME="Token Vesting Platform"
VITE_APP_VERSION="1.0.0"
```

### Smart Contract Deployment

1. Update program ID in frontend after deployment
2. Configure cluster settings in `Anchor.toml`
3. Set up wallet for deployment

## 📚 API Reference

### Smart Contract Accounts

#### VestingAccount
```rust
pub struct VestingAccount {
    pub owner: Pubkey,           // Company owner
    pub mint: Pubkey,            // Token mint
    pub treasury_token_account: Pubkey,  // Company treasury
    pub company_name: String,    // Company identifier
    pub treasury_bump: u8,       // PDA bump seed
    pub bump: u8,               // PDA bump seed
}
```

#### EmployeeAccount
```rust
pub struct EmployeeAccount {
    pub beneficiary: Pubkey,     // Employee wallet
    pub vesting_account: Pubkey, // Associated vesting account
    pub total_allocated: i64,    // Total tokens allocated
    pub total_claimed: i64,      // Already claimed tokens
    pub start_time: i64,         // Vesting start timestamp
    pub end_time: i64,           // Vesting end timestamp
    pub cliff_time: i64,         // Cliff period timestamp
    pub bump: u8,               // PDA bump seed
}
```

### Program Instructions

- `initialize_vesting_account` - Create company vesting account
- `initialize_employee_account` - Add employee to vesting program
- `claim_tokens` - Allow employees to claim vested tokens

## 🧪 Testing

```bash
# Run smart contract tests
pnpm anchor-test

# Run frontend tests (if configured)
pnpm test

# Run linting and formatting checks
pnpm ci
```

## 🚀 Deployment

### To Devnet
```bash
# Build and deploy
pnpm anchor deploy --provider.cluster devnet

# Update frontend with new program ID
# Update Anchor.toml with devnet configuration
```

### To Mainnet (Production)
```bash
# Update Anchor.toml for mainnet
# Deploy to mainnet
pnpm anchor deploy --provider.cluster mainnet-beta

# Build frontend for production
pnpm build

# Deploy frontend to your hosting provider
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Solana Foundation](https://solana.foundation/)
- [Anchor Framework](https://anchor-lang.com/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

## 📞 Support

For support and questions:
- Create an [issue](../../issues)
- Join our [Discord](https://discord.gg/solana)
- Visit [Solana Stack Exchange](https://solana.stackexchange.com/)

---

**Built with ❤️ for the Solana ecosystem**