"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MINJAME — page.tsx  (UI-only redesign, zero business logic changes)
// ─────────────────────────────────────────────────────────────────────────────
// All borrow / repay / wallet-adapter / solana.ts logic is preserved verbatim.
// Only className strings, layout structure, and typography have been updated.
// ─────────────────────────────────────────────────────────────────────────────

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState, useRef } from "react";
import {
  fetchUserScore,
  fetchActiveLoan,
  createLoan,
  repayLoan,
} from "../lib/solana";
import { checkEligibility } from "../lib/eligibility";
import { TIERS } from "../lib/constants";

// ─── Types (unchanged) ───────────────────────────────────────────────────────
interface UserScore {
  score: number;
  tier: number;
  repaymentCount: number;
  onTimeCount: number;
  loanCount?: number;
  repaidCount?: number;
  defaultCount?: number;
}

interface LoanAccount {
  borrower: string;
  amount: number;
  intentDeposit: number;
  dueDate: number;
  repaid: boolean;
}

interface EligibilityResult {
  eligible: boolean;
  maxAmount: number;
  reason?: string;
  details?: {
    layer1: boolean;
    layer2: boolean;
    layer3: boolean;
    walletAge?: number;
    txDays?: number;
    hasStablecoin?: boolean;
  };
}

// ─── Splash / Disclaimer screen ──────────────────────────────────────────────
function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0c10] flex flex-col items-center justify-center px-6">
      {/* Logo mark */}
      <div className="mb-8 w-16 h-16 rounded-2xl bg-[#141519] border border-white/[0.06] flex items-center justify-center shadow-xl">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 4L6 10V22L16 28L26 22V10L16 4Z" fill="#7C3AED" fillOpacity="0.15" stroke="#7C3AED" strokeWidth="1.5"/>
          <path d="M16 8L10 12V20L16 24L22 20V12L16 8Z" fill="#7C3AED" fillOpacity="0.3"/>
          <path d="M16 12L13 14V18L16 20L19 18V14L16 12Z" fill="#7C3AED"/>
        </svg>
      </div>

      {/* Headline */}
      <h1 className="text-[1.75rem] font-semibold text-white tracking-tight mb-2 text-center">
        Your first loan starts here.
      </h1>
      <p className="text-[0.9rem] text-[#6b7280] text-center mb-10 leading-relaxed">
        Build credit from your wallet. No documents.
      </p>

      {/* Acknowledge checkbox */}
      <label className="flex items-center gap-3 cursor-pointer mb-8 group select-none">
        <div
          onClick={() => setAgreed(!agreed)}
          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150
            ${agreed
              ? "bg-[#7C3AED] border-[#7C3AED]"
              : "bg-transparent border-[#3a3d48] group-hover:border-[#7C3AED]/50"
            }`}
        >
          {agreed && (
            <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
              <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span className="text-[0.875rem] text-[#9ca3af]">
          I understand this is a Solana Devnet demo
        </span>
      </label>

      {/* CTA */}
      <button
        onClick={onEnter}
        disabled={!agreed}
        className={`w-full max-w-sm h-12 rounded-xl font-medium text-[0.9rem] transition-all duration-200
          ${agreed
            ? "bg-[#7C3AED] text-white hover:bg-[#6d28d9] shadow-lg shadow-purple-900/25 cursor-pointer"
            : "bg-[#1c1e24] text-[#4b5563] cursor-not-allowed"
          }`}
      >
        Enter App
      </button>

      <p className="mt-6 text-[0.75rem] text-[#374151] tracking-wide">
        Solana Devnet · No real funds at risk
      </p>
    </div>
  );
}

// ─── Score ring (SVG arc) ─────────────────────────────────────────────────────
function ScoreRing({ score, max = 500 }: { score: number; max?: number }) {
  const pct = Math.min(score / max, 1);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e2027" strokeWidth="7" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke="#22c55e" strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white leading-none">{score}</span>
        <span className="text-[0.65rem] text-[#6b7280] mt-0.5 tracking-wider uppercase">Score</span>
      </div>
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────
const TIER_COLORS: Record<number, { dot: string; text: string }> = {
  0: { dot: "bg-[#6b7280]",  text: "text-[#9ca3af]"  },
  1: { dot: "bg-[#3b82f6]",  text: "text-[#93c5fd]"  },
  2: { dot: "bg-[#a855f7]",  text: "text-[#d8b4fe]"  },
  3: { dot: "bg-[#22c55e]",  text: "text-[#86efac]"  },
};

function TierBadge({ tier }: { tier: number }) {
  const t = TIERS[tier];
  const c = TIER_COLORS[tier] ?? TIER_COLORS[0];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-widest ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {t?.name ?? "Baru"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const { publicKey, connected, ...walletRest } = useWallet();
  const wallet = { publicKey, connected, ...walletRest };

  // ── App state ──────────────────────────────────────────────────────────────
  const [showSplash, setShowSplash]         = useState(true);
  const [userScore, setUserScore]           = useState<UserScore | null>(null);
  const [loanAccount, setLoanAccount]       = useState<LoanAccount | null>(null);
  const [eligibility, setEligibility]       = useState<EligibilityResult | null>(null);
  const [amount, setAmount]                 = useState(10);
  const [loading, setLoading]               = useState(false);
  const [status, setStatus]                 = useState<string | null>(null);
  const [repaidSuccess, setRepaidSuccess]   = useState<{ txSig: string } | null>(null);
  const [borrowSuccess, setBorrowSuccess]   = useState<{ txSig: string; amount: number } | null>(null);
  const [txError, setTxError]               = useState<string | null>(null);
  const [loadingData, setLoadingData]       = useState(false);
  const [showIdInfo, setShowIdInfo]         = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentTier   = userScore ? TIERS[userScore.tier] : null;
  const maxAmount     = eligibility?.maxAmount ?? currentTier?.limit ?? 10;
  const interestRate  = currentTier?.rate ?? 0.18;
  const interest      = parseFloat(((amount * interestRate / 100 * 14) / 365).toFixed(2));
  const totalRepay    = (amount + interest).toFixed(2);
  const intentDeposit = 2;
  const dueDate       = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ── Load onchain data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !publicKey) {
      setUserScore(null);
      setLoanAccount(null);
      setEligibility(null);
      return;
    }

    const load = async () => {
      setLoadingData(true);
      try {
        const [score, loan, elig] = await Promise.all([
          fetchUserScore(publicKey, wallet),
          fetchActiveLoan(publicKey, wallet),
          checkEligibility(publicKey.toString()),
        ]);
        setUserScore(score);
        setLoanAccount(loan);
        setEligibility(elig);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [connected, publicKey]);

  // ── Borrow ─────────────────────────────────────────────────────────────────
  const handleBorrow = async () => {
    if (!publicKey) return;
    setLoading(true);
    setTxError(null);
    setStatus("Awaiting wallet signature…");
    try {
      const txSig = await createLoan(wallet, amount);
      setBorrowSuccess({ txSig, amount });
      setStatus(null);
      // Refresh
      const [score, loan] = await Promise.all([
        fetchUserScore(publicKey, wallet),
        fetchActiveLoan(publicKey, wallet),
      ]);
      setUserScore(score);
      setLoanAccount(loan);
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "Transaction failed");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Repay ──────────────────────────────────────────────────────────────────
  const handleRepay = async () => {
    if (!publicKey || !loanAccount) return;
    setLoading(true);
    setTxError(null);
    setStatus("Awaiting wallet signature…");
    try {
      const txSig = await repayLoan(wallet);
      setRepaidSuccess({ txSig });
      setStatus(null);
      const [score, loan] = await Promise.all([
        fetchUserScore(publicKey, wallet),
        fetchActiveLoan(publicKey, wallet),
      ]);
      setUserScore(score);
      setLoanAccount(loan);
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "Transaction failed");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Splash gate ────────────────────────────────────────────────────────────
  if (showSplash) {
    return <SplashScreen onEnter={() => setShowSplash(false)} />;
  }

  // ── Repaid success modal ───────────────────────────────────────────────────
  if (repaidSuccess) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center px-6">
        <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl">
          {/* Check icon */}
          <div className="w-14 h-14 bg-[#052e16] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-[1.4rem] font-semibold text-[#22c55e] mb-2">Repaid!</h2>
          <p className="text-[0.875rem] text-white mb-1">You unlocked higher borrowing power</p>
          <p className="text-[0.8rem] text-[#6b7280] mb-6">
            $2 deposit has been returned to your wallet.
          </p>
          <a
            href={`https://explorer.solana.com/tx/${repaidSuccess.txSig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[0.8rem] text-[#7C3AED] hover:text-purple-300 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            View on Solana Explorer
          </a>

          <button
            onClick={() => setRepaidSuccess(null)}
            className="mt-6 w-full h-10 rounded-xl bg-[#1c1e24] text-[#9ca3af] text-sm hover:text-white hover:bg-[#22252d] transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Borrow success modal ───────────────────────────────────────────────────
  if (borrowSuccess) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center px-6">
        <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-[#1e1235] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-[1.4rem] font-semibold text-white mb-2">
            ${borrowSuccess.amount} USDC Sent
          </h2>
          <p className="text-[0.875rem] text-[#9ca3af] mb-6">
            Funds are on their way to your wallet.
          </p>
          <a
            href={`https://explorer.solana.com/tx/${borrowSuccess.txSig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[0.8rem] text-[#7C3AED] hover:text-purple-300 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            View on Solana Explorer
          </a>
          <button
            onClick={() => setBorrowSuccess(null)}
            className="mt-6 w-full h-10 rounded-xl bg-[#1c1e24] text-[#9ca3af] text-sm hover:text-white hover:bg-[#22252d] transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white font-sans">

      {/* ── Topbar ────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-white/[0.05] flex items-center justify-between px-6 bg-[#0e0f14]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L6 10V22L16 28L26 22V10L16 4Z" fill="#7C3AED" fillOpacity="0.4" stroke="#7C3AED" strokeWidth="2"/>
              <path d="M16 10L11 13V19L16 22L21 19V13L16 10Z" fill="#7C3AED"/>
            </svg>
          </div>
          <div>
            <span className="text-[0.875rem] font-semibold tracking-wide text-white">MINJAME</span>
            <span className="hidden sm:inline text-[0.7rem] text-[#374151] ml-2 tracking-widest uppercase">
              Devnet
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* ID info button */}
          <button
            onClick={() => setShowIdInfo(!showIdInfo)}
            className="w-8 h-8 rounded-lg bg-[#1c1e24] border border-white/[0.06] text-[#6b7280] text-[0.7rem] font-semibold hover:text-white hover:border-white/10 transition-all"
          >
            ID
          </button>

          {/* Wallet button — styled via global css or wallet-adapter defaults */}
          <WalletMultiButton
            style={{
              height: "32px",
              padding: "0 14px",
              fontSize: "0.8rem",
              fontWeight: 500,
              borderRadius: "10px",
              background: "#7C3AED",
              border: "none",
            }}
          />
        </div>
      </header>

      {/* ── ID info popover ───────────────────────────────────────────────── */}
      {showIdInfo && (
        <div className="fixed top-16 right-6 z-50 bg-[#13141a] border border-white/[0.06] rounded-xl p-4 w-72 shadow-2xl">
          <p className="text-[0.7rem] text-[#6b7280] uppercase tracking-wider mb-2">Program ID</p>
          <p className="text-[0.75rem] text-[#9ca3af] font-mono break-all leading-relaxed">
            86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4
          </p>
          <div className="mt-3 pt-3 border-t border-white/[0.05]">
            <a
              href="https://explorer.solana.com/address/86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4?cluster=devnet"
              target="_blank" rel="noreferrer"
              className="text-[0.75rem] text-[#7C3AED] hover:text-purple-300 transition-colors"
            >
              View on Explorer →
            </a>
          </div>
          <button
            onClick={() => setShowIdInfo(false)}
            className="absolute top-3 right-3 w-6 h-6 rounded-md bg-[#1c1e24] text-[#6b7280] text-xs hover:text-white flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Pre-connect landing ──────────────────────────────────────────── */}
      {!connected && (
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
            MINJAME
          </h1>
          <p className="text-[1rem] text-[#9ca3af] mb-2">
            Onchain credit for everyday crypto users
          </p>
          <p className="text-[0.85rem] text-[#4b5563] mb-10">
            No collateral. No KYC. Build your onchain credit score.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            {[
              { icon: "🔒", label: "No collateral required" },
              { icon: "📋", label: "No KYC or documents" },
              { icon: "📈", label: "Build permanent onchain credit" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 bg-[#13141a] border border-white/[0.05] rounded-xl px-4 py-2.5"
              >
                <span className="text-base">{f.icon}</span>
                <span className="text-[0.8rem] text-[#9ca3af]">{f.label}</span>
              </div>
            ))}
          </div>

          <WalletMultiButton
            style={{
              height: "48px",
              padding: "0 28px",
              fontSize: "0.925rem",
              fontWeight: 600,
              borderRadius: "12px",
              background: "#7C3AED",
              border: "none",
            }}
          />
        </main>
      )}

      {/* ── Connected dashboard ──────────────────────────────────────────── */}
      {connected && (
        <main className="max-w-[1100px] mx-auto px-5 py-8">
          {loadingData ? (
            <div className="flex items-center justify-center py-32 text-[#4b5563] text-sm gap-3">
              <div className="w-4 h-4 border-2 border-[#4b5563] border-t-[#7C3AED] rounded-full animate-spin" />
              Loading your onchain data…
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">

              {/* ══════════════════════════════════════════════════════════
                  LEFT — Credit Profile (HERO)
              ══════════════════════════════════════════════════════════ */}
              <div className="flex flex-col gap-4">

                {/* Score card */}
                <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-6">
                  <div className="flex items-start gap-5">
                    <ScoreRing score={userScore?.score ?? 0} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.7rem] text-[#6b7280] uppercase tracking-widest mb-1.5">Level</p>
                      <div className="flex items-center gap-2.5 mb-1">
                        <h2 className="text-2xl font-bold text-white leading-none">
                          {currentTier?.name ?? "Baru"}
                        </h2>
                        <span className="text-[0.65rem] bg-[#1c1e24] border border-white/[0.08] text-[#9ca3af] px-2 py-0.5 rounded-md uppercase tracking-wider font-medium">
                          On-Chain
                        </span>
                      </div>
                      <p className="text-[0.78rem] text-[#6b7280] leading-relaxed">
                        Increases with on-time repayments
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="bg-[#0e0f14] rounded-xl p-4">
                      <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">Limit</p>
                      <p className="text-xl font-bold text-white">
                        ${maxAmount}
                        <span className="text-[0.75rem] font-normal text-[#6b7280] ml-1">USDC</span>
                      </p>
                    </div>
                    <div className="bg-[#0e0f14] rounded-xl p-4">
                      <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">Interest / Year</p>
                      <p className="text-xl font-bold text-white">
                        {(interestRate).toFixed(0)}
                        <span className="text-[0.75rem] font-normal text-[#6b7280] ml-0.5">%</span>
                      </p>
                    </div>
                  </div>

                  {/* Wallet address */}
                  {publicKey && (
                    <p className="mt-4 text-[0.72rem] text-[#374151] font-mono truncate">
                      {publicKey.toString()}
                    </p>
                  )}
                </div>

                {/* Progress nudge */}
                <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl px-6 py-5">
                  <p className="text-[0.875rem] text-[#9ca3af] leading-relaxed mb-1">
                    Your limit and rate improve as your reputation grows.
                  </p>
                    
                  {userScore && userScore.tier >= 3 ? (
                    <p className="text-[0.8rem] text-[#22c55e]">
                      You have reached the highest level — Mitra.
                    </p>
                  ) : (
                    <p className="text-[0.8rem] text-[#7C3AED]">
                      Repay on time to unlock better terms.
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-[0.72rem] text-[#374151]">
                    <span>· All data stored onchain</span>
                  </div>
                </div>

                {/* Tier progression */}
                <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-6">
                  <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-4">
                    Tier Progression
                  </p>
                  <div className="flex flex-col gap-2">
                    {TIERS.map((tier, i) => {
                      const isCurrent = userScore?.tier === i;
                      const isPast    = (userScore?.tier ?? 0) > i;
                      return (
                        <div
                          key={tier.name}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors
                            ${isCurrent
                              ? "bg-[#0e0f14] border border-white/[0.08]"
                              : "bg-transparent"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0
                              ${isCurrent ? TIER_COLORS[i].dot
                              : isPast    ? TIER_COLORS[i].dot
                              : "bg-[#1e2027]"}`}
                            />
                            <span className={`text-[0.825rem] font-medium
                              ${isCurrent ? "text-white"
                              : isPast    ? "text-[#6b7280]"
                              : "text-[#374151]"}`}
                            >
                              {tier.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[0.6rem] bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                current
                              </span>
                            )}
                          </div>
                          <span className="text-[0.78rem] text-[#4b5563]">
                            ${tier.limit} · {tier.rate}% APR
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════
                  RIGHT — Borrow or Active Loan
              ══════════════════════════════════════════════════════════ */}
              <div className="flex flex-col gap-4">

                {/* ── Active loan view ─────────────────────────────────── */}
                {loanAccount && !loanAccount.repaid && (
                  <>
                    {/* Loan summary card */}
                    <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-6">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                          <h3 className="text-[0.95rem] font-semibold text-white">Active Loan</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.65rem] bg-[#0e0f14] border border-white/[0.06] text-[#6b7280] px-2 py-1 rounded-md uppercase tracking-wider">
                            On-Chain
                          </span>
                          <span className="text-[0.65rem] bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] px-2 py-1 rounded-md uppercase tracking-wider">
                            Active
                          </span>
                        </div>
                      </div>

                      {/* Grid stats */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-[#0e0f14] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">Loan Amount</p>
                          <p className="text-2xl font-bold text-white">
                            ${loanAccount.amount}
                            <span className="text-[0.7rem] font-normal text-[#6b7280] ml-1">USDC</span>
                          </p>
                        </div>
                        <div className="bg-[#0e0f14] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">Deposit Held</p>
                          <p className="text-2xl font-bold text-[#f59e0b]">
                            ${loanAccount.intentDeposit}
                            <span className="text-[0.7rem] font-normal text-[#6b7280] ml-1">USDC</span>
                          </p>
                        </div>
                        <div className="bg-[#0e0f14] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">Due Date</p>
                          <p className="text-base font-semibold text-white">
                            {loanAccount.dueDate.toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <div className="bg-[#0e0f14] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">Wallet</p>
                          <p className="text-[0.75rem] font-mono text-[#6b7280] truncate">
                            {publicKey?.toString().slice(0, 8)}…
                          </p>
                        </div>
                      </div>

                      <a
                        href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[0.75rem] text-[#7C3AED] hover:text-purple-300 transition-colors mt-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        View on Solana Explorer
                      </a>
                    </div>

                    {/* Repay card */}
                    <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-6">
                      <h3 className="text-[0.95rem] font-semibold text-white mb-5">Repay Now</h3>

                      <div className="space-y-2 mb-5">
                        <div className="flex justify-between items-center py-2.5 border-b border-white/[0.04]">
                          <span className="text-[0.825rem] text-[#6b7280]">Principal + interest</span>
                          <span className="text-[0.875rem] font-medium text-white">
                            ${(loanAccount.amount + parseFloat(((loanAccount.amount * interestRate / 100 * 14) / 365).toFixed(2))).toFixed(2)} USDC
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-[0.825rem] text-[#6b7280]">Deposit returned</span>
                          <span className="text-[0.875rem] font-semibold text-[#22c55e]">
                            +${loanAccount.intentDeposit} USDC
                          </span>
                        </div>
                      </div>

                      <p className="text-[0.75rem] text-[#22c55e] mb-5">
                        → Repay on time to unlock a higher limit
                      </p>

                      {txError && (
                        <div className="bg-red-950/40 border border-red-900/40 rounded-xl px-4 py-3 mb-4">
                          <p className="text-[0.78rem] text-red-400">{txError}</p>
                        </div>
                      )}
                      {status && (
                        <p className="text-[0.78rem] text-[#9ca3af] mb-4 flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-[#9ca3af] border-t-transparent rounded-full animate-spin" />
                          {status}
                        </p>
                      )}

                      <button
                        onClick={handleRepay}
                        disabled={loading}
                        className={`w-full h-12 rounded-xl font-semibold text-[0.9rem] transition-all duration-200
                          ${loading
                            ? "bg-[#1c1e24] text-[#4b5563] cursor-not-allowed"
                            : "bg-[#16a34a] hover:bg-[#15803d] text-white shadow-lg shadow-green-900/25 cursor-pointer"
                          }`}
                      >
                        {loading ? "Processing…" : "Repay Now"}
                      </button>
                    </div>
                  </>
                )}

                {/* ── Borrow view (no active loan) ─────────────────────── */}
                {(!loanAccount || loanAccount.repaid) && (
                  <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-[0.95rem] font-semibold text-white mb-5">Borrow Now</h3>

                    {/* Eligibility warning */}
                    {eligibility && !eligibility.eligible && (
                      <div className="bg-[#1c1510] border border-[#f59e0b]/20 rounded-xl px-4 py-3.5 mb-5">
                        <p className="text-[0.8rem] text-[#f59e0b] font-medium mb-1">Not eligible yet</p>
                        <p className="text-[0.75rem] text-[#92400e] leading-relaxed">
                          {eligibility.reason}
                        </p>
                        {eligibility.details && (
                          <div className="mt-2.5 space-y-1">
                            {[
                              { label: "Basic filter", pass: eligibility.details.layer1 },
                              { label: "Human signal", pass: eligibility.details.layer2 },
                              { label: "Financial intent", pass: eligibility.details.layer3 },
                            ].map((l) => (
                              <div key={l.label} className="flex items-center gap-2 text-[0.72rem]">
                                <span className={l.pass ? "text-[#22c55e]" : "text-[#6b7280]"}>
                                  {l.pass ? "✓" : "·"}
                                </span>
                                <span className={l.pass ? "text-[#9ca3af]" : "text-[#4b5563]"}>
                                  {l.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Amount label */}
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[0.7rem] text-[#4b5563] uppercase tracking-widest">Amount</label>
                      <div className="flex items-center gap-1.5 bg-[#0e0f14] border border-white/[0.06] rounded-lg px-3 py-1.5">
                        <span className="text-[0.75rem] text-[#4b5563]">$</span>
                        <input
                          type="number"
                          min={1}
                          max={maxAmount}
                          value={amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className="w-10 bg-transparent text-[0.875rem] font-semibold text-white text-right outline-none"
                        />
                        <span className="text-[0.72rem] text-[#4b5563]">USDC</span>
                      </div>
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min={1}
                      max={maxAmount}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-[#1c1e24] mb-2
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[#7C3AED] [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-lg"
                      style={{
                        background: `linear-gradient(to right, #7C3AED ${(amount / maxAmount) * 100}%, #1c1e24 ${(amount / maxAmount) * 100}%)`,
                      }}
                    />
                    <div className="flex justify-between text-[0.65rem] text-[#374151] mb-5">
                      <span>$1</span>
                      <span>${maxAmount}</span>
                    </div>

                    {/* Quick picks */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {[10, 25, maxAmount].map((v, i) =>  (
                        <button
                          key={i}
                          onClick={() => setAmount(v)}
                          className={`h-9 rounded-lg text-[0.8rem] font-medium transition-all duration-150
                            ${amount === v
                              ? "bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-white"
                              : "bg-[#0e0f14] border border-white/[0.05] text-[#6b7280] hover:text-white hover:border-white/10"
                            }`}
                        >
                          {i === 2 ? "MAX" : `$${v}`}
                        </button>
                      ))}
                    </div>

                    {/* Summary rows */}
                    <div className="space-y-0 mb-5 bg-[#0e0f14] rounded-xl overflow-hidden">
                      {[
                        { label: "You receive",      value: `$${amount.toFixed(2)} USDC`,    color: "text-white" },
                        { label: "Intent deposit",   value: `$${intentDeposit.toFixed(2)} USDC`, color: "text-[#f59e0b]" },
                        { label: "Total repayment",  value: `$${totalRepay} USDC`,           color: "text-white" },
                        {
                          label: "Due date",
                          value: `${dueDate.toLocaleDateString("id-ID")} (14 days)`,
                          color: "text-white",
                        },
                        {
                          label: "Interest",
                          value: `$${interest} (${(interestRate).toFixed(0)}% APR)`,
                          color: "text-white",
                        },
                      ].map((row, idx, arr) => (
                        <div
                          key={row.label}
                          className={`flex justify-between items-center px-4 py-3 ${idx < arr.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                        >
                          <span className="text-[0.8rem] text-[#6b7280]">{row.label}</span>
                          <span className={`text-[0.8rem] font-medium ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[0.7rem] text-[#374151] mb-5">
                      * The $2 deposit is not a fee — it is returned when you repay.
                    </p>

                    {txError && (
                      <div className="bg-red-950/40 border border-red-900/40 rounded-xl px-4 py-3 mb-4">
                        <p className="text-[0.78rem] text-red-400">{txError}</p>
                      </div>
                    )}
                    {status && (
                      <p className="text-[0.78rem] text-[#9ca3af] mb-4 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#9ca3af] border-t-transparent rounded-full animate-spin" />
                        {status}
                      </p>
                    )}

                    <button
                      onClick={handleBorrow}
                      disabled={loading || (eligibility !== null && !eligibility.eligible)}
                      className={`w-full h-12 rounded-xl font-semibold text-[0.9rem] transition-all duration-200
                        ${loading || (eligibility !== null && !eligibility.eligible)
                          ? "bg-[#1c1e24] text-[#4b5563] cursor-not-allowed"
                          : "bg-[#7C3AED] hover:bg-[#6d28d9] text-white shadow-lg shadow-purple-900/25 cursor-pointer"
                        }`}
                    >
                      {loading ? "Processing…" : `Take Loan · $${amount} USDC`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
