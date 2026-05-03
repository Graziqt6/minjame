# MINJAME

**Pinjaman pertamamu. Tanpa jaminan. Tanpa bank.**

Live: https://minjame.vercel.app
Program ID: 86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4
Explorer: https://explorer.solana.com/address/86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4?cluster=devnet
GitHub: https://github.com/Graziqt6/minjame

---

## The Problem

60 million Indonesians have no access to formal credit. Not because they are broke — because they are invisible to the system. The alternative is pinjol: predatory lenders charging 0.4% per day with no path to ever getting better terms.

For crypto-active Indonesians — people who already have wallets and stablecoins — there is still no borrowing option that fits their reality.

## What MINJAME Does

MINJAME is an on-chain micro-lending protocol on Solana. It gives users their first loan with no collateral and no paperwork, then builds a permanent credit record from their repayment behavior.

The better you behave, the cheaper you borrow.

## How It Works

1. Connect your Phantom wallet
2. The app runs a 3-layer wallet behavior check (no KYC, no documents)
3. Pay a refundable $2 intent deposit — returned when you repay
4. Borrow $5 or $10 USDC for 14 days at 18% APR
5. Repay on time → score increases → better terms on the next loan

## The Intent Deposit

The $2 intent deposit is not a fee. It is a commitment device. Honest borrowers get it back in full when they repay. If you default, you lose $2 — and your wallet is flagged. This single mechanic makes the zero-collateral first loan economically defensible without KYC.

## The Credit Score

Your score is stored in a public Solana program account at address:
86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4

It belongs to your wallet — not to MINJAME. Any other protocol can read it. If MINJAME shuts down tomorrow, your score still exists on-chain. This is what makes it infrastructure, not just an app.

## Eligibility System (No KYC)

The app reads your public wallet history and runs three layers of checks:

**Layer 1 — Basic Filter**
Wallet age at least 21 days, transactions spread across 3+ separate days, evidence of stablecoin holding.

**Layer 2 — Human Signal**
Transaction timing spread across different hours of the day, outbound transfers to multiple different addresses.

**Layer 3 — Financial Intent**
At least one of: any transaction above $3 in value, balance held above $5 for consecutive days, interaction with DeFi protocols, or transfer to a known exchange address.

Pass all three layers: $10 limit. Pass Layer 1 only: $5 limit. Fail: clear explanation of what to fix and when to return.

## Tier System

| Tier | Name | Collateral | Limit | Rate |
|------|------|------------|-------|------|
| 0 | Baru | None (first loan) | $10 | 18% APR |
| 1 | Terpercaya | 120% | $75 | 13% APR |
| 2 | Andalan | 100% | $200 | 9% APR |
| 3 | Mitra | 75% | $500 | 6% APR |

## Why Solana

Transaction fees below $0.01 make micro-loans economically viable. A $5 loan on Ethereum costs more in gas than the loan itself. Solana is the only L1 where this works at this scale.

## Stack

- Smart Contract: Anchor (Rust) — Solana Devnet
- Frontend: Next.js + Tailwind CSS
- Wallet: Phantom via @solana/wallet-adapter
- Eligibility: Off-chain, reads public Solana RPC data

## Project Structure

- /program — Anchor smart contract (createLoan, repayLoan, UserScore, LoanAccount)
- /app — Next.js frontend
- /app/lib/eligibility.ts — 3-layer eligibility engine (off-chain)
- /app/lib/constants.ts — Program ID, tier config, network settings

## Track

DeFi — Superteam Indonesia Frontier Hackathon 2026
