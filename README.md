# MINJAME

> People with wallets still cannot access credit.

Millions of Indonesians use crypto daily airdrops, stablecoins, DeFi. They have wallets. They have funds. But every lending protocol requires more collateral than they want to borrow.

MINJAME fixes that. First loan with no collateral. Build a credit record from your wallet. Get better terms every cycle.

🌐 **[minjame.vercel.app](https://minjame.vercel.app)** &nbsp;·&nbsp; Solana Devnet &nbsp;·&nbsp; DeFi Track — Superteam Indonesia 2026

---

## The User

> Aldi sells resell sneakers in Yogyakarta. He has $40 USDC and a Phantom wallet. He needs $30 for a restock tonight. His bank won't talk to him. Pinjol charges 0.4% per day. MINJAME gives him $10. He repays in a week. His limit grows.

This is the actual user. Not "the unbanked" in theory cryptoactive Indonesian adults who already have wallets but zero access to fair credit.

-

## Why Now?

Southeast Asia has some of the fastest-growing crypto adoption in the world. Indonesia alone has 17M+ registered crypto users. Stablecoin usage is rising. Wallet ownership is growing faster than banking access.

But the credit infrastructure hasn't caught up. The informal economy runs on cash and trust and there's no way to carry that trust into DeFi.

MINJAME is the infrastructure layer that changes that.

---

## How It Works

1. **Connect wallet** — eligibility runs automatically. No KYC, no forms.
2. **Pass check** — get a borrow limit based on wallet history. $5–$10 to start.
3. **Pay $2 intent deposit** — refunded when you repay. Not a fee. Proof of commitment.
4. **Receive your loan** — USDC lands in your wallet via real Solana transaction.
5. **Repay on time** — score increases, rate drops, limit grows.
6. **Your credit record lives on Solana** — public, permanent, readable by any protocol.

---

## Try It

### Simulation Mode
No wallet needed. No setup. Just open the app and walk through the full borrowing flow instantly.

Simulation is not a fake demo it's an interactive product walkthrough that shows the exact experience a real user would have.

### Devnet Mode
Connect a Phantom wallet (set to Devnet), get USDC from [faucet.circle.com](https://faucet.circle.com), and run real Solana transactions.

**For judges:** Start with Simulation for an instant overview. Switch to Devnet to verify the contract is live.

---

## Screens

| Entry | Dashboard | Borrow |
|-------|-----------|--------|
| ![Entry](docs/entry.png) | ![Dashboard](docs/dashboard.png) | ![Borrow](docs/borrow.png) |

| Active Loan | Repaid |
|-------------|--------|
| ![Loan](docs/loan.png) | ![Success](docs/success.png) |

*(Screenshots in /docs folder)*

---

## Why Repay?

**The deposit.** You lock $2 before receiving funds. Default = lose $2 immediately.

**The score.** Default resets your tier to zero. At Tier 2, you have $150 access at 9% APR. Reset means $10 at 18%. That compounding loss outweighs any gain from keeping a small loan.

**The record.** Your score is stored on Solana permanently. A defaulted wallet is blacklisted. For anyone who plans to stay in the ecosystem, that's a real cost.

The protocol absorbs ~20% first-loan defaults and still breaks even. The math is intentional.

---

## Tier System

| Tier | Name | Repayments | Limit | Rate |
|------|------|------------|-------|------|
| 0 | Baru | First loan | $10 | 18% APR |
| 1 | Terpercaya | 3 on-time | $50 | 13% APR |
| 2 | Andalan | 8 on-time | $150 | 9% APR |
| 3 | Mitra | 15 on-time | $500 | 6% APR |

Only on-time repayments advance your tier. Enforced by the smart contract.

---

## Eligibility (No KYC)

The app reads your public wallet history and checks three layers:

- **Basic** — wallet age, activity spread, stablecoin history
- **Behavioral** — time patterns, address diversity
- **Financial intent** — real transfers, DeFi usage, CEX interaction

All computed client-side from public Solana RPC. No server. No database. No permission required.

---

## What Makes MINJAME Different

**vs TrueFi / Maple** — those serve institutional borrowers with governance-based credit. MINJAME serves first-time small borrowers in emerging markets.

**vs Goldfinch** — Goldfinch requires off-chain credit scoring and human auditors. MINJAME's eligibility is fully on-chain and permissionless.

**vs standard DeFi lending** — every other protocol requires more collateral than you want to borrow. MINJAME inverts that for the first loan.

The focus is a specific, underserved user — not a generic lending primitive.

---

## Infrastructure Angle

Your MINJAME score is stored in a public Solana account at address derived from your wallet. Any protocol can read it.

A future payroll app, gig marketplace, or lending protocol could read a MINJAME score directly and offer better terms to trusted wallets — without asking MINJAME for permission.

This is credit infrastructure, not just a lending app.

---

## Why Solana

Sub-cent fees make micro-loans viable. A $10 loan on Ethereum costs more in gas than the loan itself.

Sub-second finality means the experience feels instant — important when competing with apps like Kredivo and Akulaku.

Public accounts mean scores are genuinely portable. No oracle, no API, no trust in MINJAME.

---

## Architecture

```
/program    — Anchor smart contract (Rust)
/app        — Next.js frontend
/app/lib/eligibility.ts   — 3-layer eligibility engine (off-chain)
/app/lib/solana.ts        — Raw web3.js transaction builder
/app/lib/constants.ts     — Program ID, tier config, vault addresses
```

Two Solana accounts per user:
- `LoanAccount` — active loan state
- `UserScore` — permanent credit record (public, composable)

---

## Future Expansion

- **Sybil resistance** — current system raises cost of wallet farming. Full resistance needs ZK identity or social attestation.
- **LP pool** — vault is manually seeded for demo. Architecture supports permissionless LP deposits.
- **Auto-liquidation** — late repayment is score-penalized today. A keeper bot handles enforcement in production.

These are next phases, not gaps.

---

## Run Locally

```bash
cd app && npm install && npm run dev -- --webpack
```

Set Phantom to Devnet. Get test USDC at [faucet.circle.com](https://faucet.circle.com).

---

## Demo

| | |
|--|--|
| 🌐 Live app | [minjame.vercel.app](https://minjame.vercel.app) |
| 📦 Program | `86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4` |
| 🔗 Explorer | [View on Solana Explorer](https://explorer.solana.com/address/86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4?cluster=devnet) |
| 🎥 Demo video | *(coming soon)* |
| 💻 GitHub | [Graziqt6/minjame](https://github.com/Graziqt6/minjame) |

---

*This already works. Now it needs scale.*
