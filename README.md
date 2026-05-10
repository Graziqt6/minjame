# MINJAME

> People with wallets still cannot access credit.

Millions of Indonesians use crypto daily airdrops, stablecoins, DeFi. They have wallets. They have funds. But every lending protocol requires more collateral than they want to borrow.

MINJAME fixes that. First loan with no collateral. Build a credit record from your wallet. Get better terms every cycle.

🌐 **[minjame.vercel.app](https://minjame.vercel.app)** &nbsp;·&nbsp; Solana Devnet

---

## The User

> Aldi sells resell sneakers in Yogyakarta. He has $40 USDC and a Phantom wallet. He needs $30 for a restock tonight. His bank won't talk to him. Pinjol charges 0.4% per day. MINJAME gives him $10. He repays in a week. His limit grows.

This is the actual user not "the unbanked" in theory. Crypto active Indonesian adults who already have wallets but zero access to fair credit.

---

## Why Now?

Southeast Asia has some of the fastest-growing crypto adoption in the world. Indonesia alone has 17M+ registered crypto users. Stablecoin usage is rising. Wallet ownership is growing faster than banking access.

But the credit infrastructure hasn't caught up. The informal economy runs on cash and trust — and there's no way to carry that trust into DeFi.

MINJAME is the infrastructure layer that changes that.

---

## How It Works

1. **Connect wallet** — eligibility runs automatically. No KYC, no forms.
2. **Pass check** — get a borrow limit based on wallet history. $10 to start.
3. **Pay $2 intent deposit** — refunded when you repay. Not a fee. Proof of commitment.
4. **Receive your loan** — USDC lands in your wallet via real Solana transaction.
5. **Repay on time** — score increases, tier rises, limit grows.
6. **Your credit record lives on Solana** — public, permanent, readable by any protocol.

---

## Try It

### Devnet Mode
Connect a Phantom wallet (set to Devnet), get USDC from [faucet.circle.com](https://faucet.circle.com), and run real Solana transactions.

**For judges:** The full borrow and repay cycle is live on Devnet. Program ID is verifiable on Explorer. Every score update is a real on-chain write.

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

**The score.** Default resets your tier to zero. At Tier 3, you have $100 access. A reset means back to $10. That compounding loss outweighs any gain from keeping a small loan.

**The record.** Your score is stored on Solana permanently. A defaulted wallet is blacklisted. For anyone who plans to stay in the ecosystem, that's a real cost.

The protocol absorbs roughly 20% first-loan defaults and still breaks even. The math is intentional.

---

## Tier System

Tier controls how much you can borrow. The more on-time repayments you make, the higher your tier and the larger your limit.

| Tier | Name | Limit |
|------|------|-------|
| 0 | Baru | $10 |
| 1 | Terpercaya | $25 |
| 2 | Andalan | $50 |
| 3 | Mitra | $100 |
| 4 | Utama | $250 |

Only on-time repayments advance your tier. Enforced by the smart contract.

## APR

APR is determined by how much you borrow — not your tier. Larger loans carry lower rates because they signal more serious borrowers.

| Loan Amount | APR |
|-------------|-----|
| $1–$10 | 15% |
| $11–$25 | 12% |
| $26–$50 | 10% |
| $51–$100 | 8% |
| $101–$250 | 6% |

Tier = trust and capacity. APR = loan pricing. These are two separate systems.

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

Your MINJAME score is stored in a public Solana account at an address derived from your wallet. Any protocol can read it directly — no API, no permission, no trust in MINJAME required.

```
// Any protocol can read a MINJAME score with two lines:
const [scorePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("score"), walletAddress.toBuffer()],
  MINJAME_PROGRAM_ID
);
```

A future payroll app, gig marketplace, or lending protocol could read a MINJAME score directly and offer better terms to trusted wallets — without asking MINJAME for permission. This is credit infrastructure, not just a lending app.

---

## Why Solana

Sub-cent fees make micro-loans viable. A $10 loan on Ethereum costs more in gas than the loan itself.

Sub-second finality means the experience feels instant — important when competing with apps like Kredivo and Akulaku.

Public accounts mean scores are genuinely portable. No oracle, no API, no intermediary.

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

## Roadmap

**Sybil resistance** — current eligibility raises the cost of wallet farming significantly (21-day wallet age, multi-day activity spread). Full resistance in V2 via ZK identity or social attestation (Civic, World ID).

**LP pool** — vault is manually seeded for this demo. The architecture already supports permissionless LP deposits. V2 adds yield for liquidity providers funded by loan interest.

**On-chain enforcement** — late repayment is currently score-penalized via the frontend. V2 moves due-date enforcement into the Anchor program directly, with a keeper bot for auto-liquidation.

These are next phases, not gaps. The core credit loop — borrow, repay, score grows — is fully on-chain and working today.

---

## Run Locally

```bash
cd app && npm install && npm run dev
```

Set Phantom to Devnet. Get test USDC at [faucet.circle.com](https://faucet.circle.com).

---

## Demo

| | |
|--|--|
| 🌐 Live app | [minjame.vercel.app](https://minjame.vercel.app) |
| 📦 Program ID | `86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4` |
| 🔗 Explorer | [View on Solana Explorer](https://explorer.solana.com/address/86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4?cluster=devnet) |
| 🎥 Demo video | *(coming soon)* |
| 💻 GitHub | [Graziqt6/minjame](https://github.com/Graziqt6/minjame) |

---

*The core loop works. Borrow, repay, score grows — fully on-chain, live on Solana.*
