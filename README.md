# Token Vesting Platform

A complete **Solana token vesting application** built with modern React and Rust. This platform enables companies to create sophisticated token vesting schedules for employees, advisors, and partners with on-chain enforcement.

## Overview

This is a production-ready template for building **token vesting platforms** on Solana. The application includes:

- **Smart Contract**: Rust-based Anchor program with modular vesting logic
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Wallet Integration**: Full Solana wallet adapter support
- **Vesting Features**: Cliff periods, linear vesting, and automatic token distribution

## Architecture

### Backend (Smart Contract)

- **Language**: Rust using Anchor framework v0.30.1
- **Features**:
  - Company vesting account management
  - Employee vesting schedule tracking
  - Cliff period enforcement
  - Linear vesting calculations
  - Automatic treasury funding
  - SPL token support

### Frontend (Web Application)

- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **State Management**: Jotai + TanStack Query v5
- **Wallet**: Solana Wallet Adapter
- **Theme**: Dark/light mode support via next-themes

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [pnpm](https://pnpm.io/) or [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install) (for smart contract development)
- [Anchor](https://book.anchor-lang.com/getting_started/installation) v0.30.1+

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/samar-58/token-vesting
cd token-vesting
```

2. **Install dependencies**

```bash
pnpm install
# or
bun install
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

## Features

### For Companies/Founders

- Create company vesting accounts linked to any SPL token
- Define vesting schedules with cliff periods
- Add employees with custom vesting terms
- Automatic treasury funding when adding employees
- Track vesting progress across all employees

### For Employees/Beneficiaries

- View personal vesting schedules
- Claim vested tokens after cliff period
- Track claim history and remaining allocation
- Monitor vesting progress with visual timeline
- View claimable amounts in real-time

### Smart Contract Features

- **On-chain enforcement**: Vesting rules enforced by blockchain
- **Linear vesting**: Smooth token release between start and end times
- **Cliff periods**: Tokens locked until cliff timestamp is reached
- **PDA treasury**: Secure token custody in program-derived accounts
- **Automatic ATA creation**: Beneficiary token accounts created on first claim

## Development

### Available Scripts

| Script                 | Description                       |
| ---------------------- | --------------------------------- |
| `pnpm dev`             | Start development server          |
| `pnpm build`           | Build for production              |
| `pnpm preview`         | Preview production build          |
| `pnpm lint`            | Run ESLint                        |
| `pnpm format`          | Format all files with Prettier    |
| `pnpm format:check`    | Check formatting                  |
| `pnpm ci`              | Run build, lint, and format check |
| `pnpm anchor-build`    | Build smart contract              |
| `pnpm anchor-test`     | Run contract tests (LiteSVM)      |
| `pnpm anchor-localnet` | Start local validator             |

### Project Structure

```
token-vesting/
├── anchor/                          # Smart contract (Rust + Anchor)
│   ├── programs/counter/            # Token vesting program
│   │   └── src/
│   │       ├── lib.rs               # Program entry point
│   │       ├── errors.rs            # Custom error codes
│   │       ├── instructions/        # Instruction handlers
│   │       │   ├── initialize_vesting.rs
│   │       │   ├── initialize_employee.rs
│   │       │   └── claim_tokens.rs
│   │       └── states/              # Account structures
│   │           ├── vesting_account.rs
│   │           └── employee_account.rs
│   ├── src/                         # TypeScript exports
│   │   ├── index.ts
│   │   └── token-exports.ts         # IDL and program helpers
│   ├── tests/
│   │   └── tokenvesting.test.ts     # LiteSVM test suite
│   └── Anchor.toml
├── src/                             # Frontend application
│   ├── app.tsx                      # Main app component
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Global styles
│   ├── lib/
│   │   └── utils.ts
│   └── components/
│       ├── vesting/                 # Vesting feature
│       │   ├── vesting-feature.tsx  # Main page
│       │   ├── vesting-ui.tsx       # UI components
│       │   └── vesting-data-access.tsx  # Data hooks
│       ├── cluster/                 # Cluster management
│       ├── solana/                  # Wallet integration
│       └── ui/                      # shadcn/ui components
├── public/
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## API Reference

### Smart Contract Accounts

#### VestingAccount

```rust
pub struct VestingAccount {
    pub owner: Pubkey,                   // Company owner wallet
    pub mint: Pubkey,                    // SPL token mint
    pub treasury_token_account: Pubkey,  // PDA treasury for tokens
    pub company_name: String,            // Company identifier (max 64 chars)
    pub treasury_bump: u8,               // Treasury PDA bump
    pub bump: u8,                        // Account PDA bump
}
```

#### EmployeeAccount

```rust
pub struct EmployeeAccount {
    pub beneficiary: Pubkey,      // Employee wallet
    pub vesting_account: Pubkey,  // Parent vesting account
    pub total_allocated: u64,     // Total tokens allocated
    pub total_claimed: u64,       // Tokens already claimed
    pub start_time: i64,          // Vesting start timestamp
    pub end_time: i64,            // Vesting end timestamp
    pub cliff_time: i64,          // Cliff period timestamp
    pub bump: u8,                 // Account PDA bump
}
```

### Program Instructions

| Instruction                   | Parameters                                       | Description                                      |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `initialize_vesting_account`  | `company_name: String`                           | Create company vesting account with treasury PDA |
| `initialize_employee_account` | `start_time, end_time, total_amount, cliff_time` | Add employee and fund treasury                   |
| `claim_tokens`                | `company_name: String`                           | Claim vested tokens (enforces cliff)             |

### Error Codes

| Error             | Description                           |
| ----------------- | ------------------------------------- |
| `CliffNotReached` | Cliff period has not been reached yet |
| `NothingToClaim`  | No tokens available to claim          |

## Testing

The project uses LiteSVM for fast, local smart contract testing without requiring a network connection.

```bash
# Run smart contract tests
pnpm anchor-test

# Run CI checks (build + lint + format)
pnpm ci
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Cluster Support

The frontend supports multiple Solana clusters:

- **Localnet**: Local development with test validator
- **Devnet**: Solana devnet for testing
- **Testnet**: Solana testnet
- **Mainnet**: Production deployment

### TypeScript Path Aliases

```json
{
  "@project/anchor": "anchor/src",
  "@/*": "./src/*"
}
```

## Deployment

### To Devnet

```bash
# Build and deploy
pnpm anchor-build
cd anchor && anchor deploy --provider.cluster devnet

# Sync program ID
anchor keys sync
```

### To Mainnet

```bash
# Update Anchor.toml for mainnet
cd anchor && anchor deploy --provider.cluster mainnet-beta

# Build frontend for production
pnpm build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm ci` to verify
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Solana Foundation](https://solana.foundation/)
- [Anchor Framework](https://anchor-lang.com/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [shadcn/ui](https://ui.shadcn.com/)
- [LiteSVM](https://github.com/LiteSVM/litesvm)

---

**Built for the Solana ecosystem**
