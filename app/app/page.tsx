"use client";

const T = {
  en: {
    level: "Level", limit: "Limit", interestYear: "Interest / Year",
    score: "Score", amount: "Amount", borrowNow: "Borrow Now",
    repayNow: "Repay Now", activeLoan: "Active Loan",
    tierProgression: "Tier Progression", processing: "Processing…",
    increases: "Increases with on-time repayments",
    yourLimit: "Your limit and rate improve as your reputation grows.",
    repayUnlock: "Repay on time to unlock better terms.",
    allData: "All data stored onchain",
    loansRepaid: "Loans Repaid", onTime: "On-Time",
    dueDate: "Due Date", daysLeft: "Days Left",
    totalRepay: "Total to Repay", depositReturn: "Deposit Returned",
    youReceive: "You receive", intentDeposit: "Intent deposit",
    totalRepayment: "Total repayment", interest: "Interest",
    awaitingSig: "Awaiting wallet signature…",
    highest: "You have reached the highest level — Mitra.",
  },
  id: {
    level: "Level", limit: "Limit", interestYear: "Bunga / Tahun",
    score: "Skor", amount: "Jumlah", borrowNow: "Pinjam Sekarang",
    repayNow: "Bayar Sekarang", activeLoan: "Pinjaman Aktif",
    tierProgression: "Progres Tier", processing: "Memproses…",
    increases: "Naik saat bayar tepat waktu",
    yourLimit: "Limit dan bunga membaik seiring reputasimu.",
    repayUnlock: "Bayar tepat waktu untuk syarat lebih baik.",
    allData: "Semua data tersimpan onchain",
    loansRepaid: "Pinjaman Dibayar", onTime: "Tepat Waktu",
    dueDate: "Jatuh Tempo", daysLeft: "Sisa Hari",
    totalRepay: "Total Bayar", depositReturn: "Deposit Kembali",
    youReceive: "Kamu terima", intentDeposit: "Deposit niat",
    totalRepayment: "Total pembayaran", interest: "Bunga",
    awaitingSig: "Menunggu tanda tangan dompet…",
    highest: "Kamu sudah di level tertinggi — Mitra.",
  },
};
import { ModeSelect } from "./mode-select";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import {
  fetchUserScore,
  fetchActiveLoan,
  createLoan,
  repayLoan,
} from "../lib/solana";
import { checkEligibility } from "../lib/eligibility";
import { TIERS } from "../lib/constants";

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
  borrower?: string;
  amount: number;
  intentDeposit: number;
  dueDate: Date | number;
  repaid: boolean;
  active?: boolean;
}

interface EligibilityResult {
  eligible: boolean;
  maxAmount?: number;
  limit?: number;
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

function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0c10] flex flex-col items-center justify-center px-6">
      <div className="mb-8 w-16 h-16 rounded-2xl bg-[#141519] border border-white/[0.06] flex items-center justify-center shadow-xl">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 4L6 10V22L16 28L26 22V10L16 4Z" fill="#7C3AED" fillOpacity="0.15" stroke="#7C3AED" strokeWidth="1.5"/>
          <path d="M16 8L10 12V20L16 24L22 20V12L16 8Z" fill="#7C3AED" fillOpacity="0.3"/>
          <path d="M16 12L13 14V18L16 20L19 18V14L16 12Z" fill="#7C3AED"/>
        </svg>
      </div>

      <h1 className="text-[1.75rem] font-semibold text-white tracking-tight mb-2 text-center">
        Your first loan starts here.
      </h1>
      <p className="text-[0.9rem] text-[#6b7280] text-center mb-10 leading-relaxed">
        Build credit from your wallet. No documents.
      </p>

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
        <span className="text-[0.65rem] text-[#6b7280] mt-0.5 tracking-wider uppercase">"Score"</span>
      </div>
    </div>
  );
}

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

export default function Home() {
  const { publicKey, connected, ...walletRest } = useWallet();
  const wallet = { publicKey, connected, ...walletRest };

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
  // ── NEW: countdown clock + score delta tracking ──
  const [now, setNow]                       = useState(Date.now());
  const [prevScore, setPrevScore]           = useState<number | null>(null);
  // translations
  const [lang, setLang] = useState<"en" | "id">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("minjame_lang") as "en" | "id") || "en";
    }
    return "en";
  });
  const t = T[lang];
  const [mode, setMode] = useState<"simulation" | "devnet" | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("minjame_mode");
      if (saved === "simulation" || saved === "devnet") return saved;
    }
    return null;
  });

  const currentTier   = userScore ? TIERS[userScore.tier] : null;
  const maxAmount     = eligibility?.maxAmount ?? currentTier?.limit ?? 10;
  const interestRate  = currentTier?.rate ?? 0.18;
  const interest      = parseFloat(((amount * interestRate / 100 * 14) / 365).toFixed(2));
  const totalRepay    = (amount + interest).toFixed(2);
  const intentDeposit = 2;
  const dueDate       = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ── Countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Load onchain data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === "simulation") {
      setUserScore({ score: 120, tier: 0, repaymentCount: 0, onTimeCount: 0 });
      setLoanAccount(null);
      setEligibility({ eligible: true, limit: 50, signals: { layer1: true, layer2: true, layer3: false, layer3Count: 3 } });
      return;
    }

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
    setLoading(true);
    setTxError(null);

    // Simulation mode — instant mock borrow
    if (mode === "simulation") {
      await new Promise(r => setTimeout(r, 800));
      const mockDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      setLoanAccount({ amount, intentDeposit: 2, dueDate: mockDue, repaid: false });
      setBorrowSuccess({ txSig: "simulation", amount });
      setLoading(false);
      return;
    }

    if (!publicKey) { setLoading(false); return; }
    setStatus(t.awaitingSig);
    try {
      const txSig = await createLoan(wallet, amount);
      setBorrowSuccess({ txSig, amount });
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

  // ── Repay ──────────────────────────────────────────────────────────────────
  const handleRepay = async () => {
    if (!loanAccount) return;
    setLoading(true);
    setTxError(null);

    // Simulation mode — instant mock repay
    if (mode === "simulation") {
      await new Promise(r => setTimeout(r, 800));
      const oldScore = userScore?.score ?? 120;
      setPrevScore(oldScore);
      setUserScore({ score: oldScore + 30, tier: Math.min((userScore?.tier ?? 0) + 0, 3), repaymentCount: (userScore?.repaymentCount ?? 0) + 1, onTimeCount: (userScore?.onTimeCount ?? 0) + 1 });
      setLoanAccount(null);
      setRepaidSuccess({ txSig: "simulation" });
      setLoading(false);
      return;
    }

    if (!publicKey) { setLoading(false); return; }
    setStatus(t.awaitingSig);
    try {
      // ── NEW: capture score before repay so we can show the delta ──
      const scoreBeforeRepay = userScore?.score ?? null;
      const txSig = await repayLoan(wallet);
      setPrevScore(scoreBeforeRepay);
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

  if (showSplash) {
    return <SplashScreen onEnter={() => setShowSplash(false)} />;
  }

  if (!mode) {
    return (
      <ModeSelect
        lang="en"
        onSelect={(selected) => {
          setMode(selected);
          localStorage.setItem("minjame_mode", selected);
        }}
      />
    );
  }

  // ── Repaid success modal ───────────────────────────────────────────────────
  if (repaidSuccess) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center px-6">
        <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-[#052e16] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-[1.4rem] font-semibold text-[#22c55e] mb-2">Repaid!</h2>
          <p className="text-[0.875rem] text-white mb-3">You unlocked higher borrowing power</p>

          {/* ── NEW: score delta display ── */}
          {prevScore !== null && userScore && userScore.score > prevScore && (
            <div className="inline-flex items-center gap-2 bg-[#052e16] border border-[#22c55e]/20 rounded-lg px-3 py-1.5 mb-4">
              <span className="text-[0.8rem] text-[#6b7280]">{t.score}</span>
              <span className="text-[0.8rem] text-[#6b7280]">{prevScore}</span>
              <span className="text-[0.75rem] text-[#4b5563]">→</span>
              <span className="text-[0.9rem] font-bold text-[#22c55e]">{userScore.score}</span>
              <span className="text-[0.75rem] font-semibold text-[#22c55e]">
                +{userScore.score - prevScore}
              </span>
            </div>
          )}

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

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white font-sans">

      <header className="h-14 border-b border-white/[0.05] flex items-center justify-between px-6 bg-[#0e0f14]">
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
              {mode === "simulation" ? "Simulation" : "Devnet"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowIdInfo(!showIdInfo)}
              className="h-8 px-3 rounded-lg bg-[#1c1e24] border border-white/[0.06] text-[#9ca3af] text-[0.7rem] font-semibold hover:text-white hover:border-white/10 transition-all flex items-center gap-1"
            >
              {lang === "en" ? "EN" : "ID"}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5"/></svg>
            </button>
            {showIdInfo && (
              <div className="absolute top-10 right-0 z-50 bg-[#13141a] border border-white/[0.06] rounded-xl overflow-hidden shadow-2xl w-28">
                {["en", "id"].map((l) => (
                  <button key={l} onClick={() => { setLang(l as "en"|"id"); localStorage.setItem("minjame_lang", l); setShowIdInfo(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${lang === l ? "text-white bg-white/[0.06]" : "text-[#6b7280] hover:text-white hover:bg-white/[0.04]"}`}>
                    {l === "en" ? "🇬🇧 English" : "🇮🇩 Indonesia"}
                  </button>
                ))}
              </div>
            )}
          </div>
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
      {/* Mode banner */}
      <div className={`w-full py-1.5 px-4 flex items-center justify-between text-xs ${mode === "simulation" ? "bg-yellow-500/10 border-b border-yellow-500/20" : "bg-purple-500/10 border-b border-purple-500/20"}`}>
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${mode === "simulation" ? "bg-yellow-400" : "bg-purple-400"}`} />
            <span className={mode === "simulation" ? "text-yellow-400" : "text-purple-400"}>
              {mode === "simulation" ? "🎮 Simulation Mode — no real transactions" : "⛓️ Devnet Mode — real on-chain transactions"}
            </span>
          </div>
          <button
            onClick={() => {
              const next = mode === "simulation" ? "devnet" : "simulation";
              setMode(next);
              localStorage.setItem("minjame_mode", next);
            }}
            className={`text-[0.7rem] px-2.5 py-1 rounded-md border transition-all ${mode === "simulation" ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"}`}
          >
            {mode === "simulation" ? "Switch to Devnet →" : "Switch to Simulation →"}
          </button>
        </div>
      </div>


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

      {connected && (
        <main className="max-w-[1100px] mx-auto px-5 py-8">
          {loadingData ? (
            <div className="flex items-center justify-center py-32 text-[#4b5563] text-sm gap-3">
              <div className="w-4 h-4 border-2 border-[#4b5563] border-t-[#7C3AED] rounded-full animate-spin" />
              Loading your onchain data…
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">

              {/* ══ LEFT — Credit Profile ══ */}
              <div className="flex flex-col gap-4">

                {/* Score card */}
                <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-6">
                  <div className="flex items-start gap-5">
                    <ScoreRing score={userScore?.score ?? 0} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.7rem] text-[#6b7280] uppercase tracking-widest mb-1.5">{t.level}</p>
                      <div className="flex items-center gap-2.5 mb-1">
                        <h2 className="text-2xl font-bold text-white leading-none">
                          {currentTier?.name ?? "Baru"}
                        </h2>
                        <span className="text-[0.65rem] bg-[#1c1e24] border border-white/[0.08] text-[#9ca3af] px-2 py-0.5 rounded-md uppercase tracking-wider font-medium">
                          On-Chain
                        </span>
                      </div>
                      <p className="text-[0.78rem] text-[#6b7280] leading-relaxed">
                        {t.increases}
                      </p>
                    </div>
                  </div>

                  {/* Stats grid — now 2x2 including repayment history */}
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="bg-[#0e0f14] rounded-xl p-4">
                      <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">{t.limit}</p>
                      <p className="text-xl font-bold text-white">
                        ${maxAmount}
                        <span className="text-[0.75rem] font-normal text-[#6b7280] ml-1">USDC</span>
                      </p>
                    </div>
                    <div className="bg-[#0e0f14] rounded-xl p-4">
                      <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">{t.interestYear}</p>
                      <p className="text-xl font-bold text-white">
                        {(interestRate).toFixed(0)}
                        <span className="text-[0.75rem] font-normal text-[#6b7280] ml-0.5">%</span>
                      </p>
                    </div>
                    {/* ── NEW: repayment history stats ── */}
                    <div className="bg-[#0e0f14] rounded-xl p-4">
                      <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">Loans repaid</p>
                      <p className="text-xl font-bold text-white">
                        {userScore?.repaymentCount ?? 0}
                        <span className="text-[0.75rem] font-normal text-[#6b7280] ml-1">total</span>
                      </p>
                    </div>
                    <div className="bg-[#0e0f14] rounded-xl p-4">
                      <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">On-time</p>
                      <p className="text-xl font-bold text-[#22c55e]">
                        {userScore?.onTimeCount ?? 0}
                        <span className="text-[0.75rem] font-normal text-[#6b7280] ml-1">/ {userScore?.repaymentCount ?? 0}</span>
                      </p>
                    </div>
                  </div>

                  {publicKey && (
                    <p className="mt-4 text-[0.72rem] text-[#374151] font-mono truncate">
                      {publicKey.toString()}
                    </p>
                  )}
                </div>

                {/* Progress nudge */}
                <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl px-6 py-5">
                  <p className="text-[0.875rem] text-[#9ca3af] leading-relaxed mb-1">
                    {t.yourLimit}
                  </p>
                  {userScore && userScore.tier >= 3 ? (
                    <p className="text-[0.8rem] text-[#22c55e]">
                      {t.highest}
                    </p>
                  ) : (
                    <p className="text-[0.8rem] text-[#7C3AED]">
                      {t.repayUnlock}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-[0.72rem] text-[#374151]">
                    <span>· {t.allData}</span>
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

              {/* ══ RIGHT — Borrow or Active Loan ══ */}
              <div className="flex flex-col gap-4">

                {/* Active loan view */}
                {loanAccount && !loanAccount.repaid && (
                  <>
                    <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                          <h3 className="text-[0.95rem] font-semibold text-white">{t.activeLoan}</h3>
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

                        {/* ── NEW: Due date with live countdown ── */}
                        <div className="bg-[#0e0f14] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#4b5563] uppercase tracking-widest mb-1.5">{t.dueDate}</p>
                          <p className="text-base font-semibold text-white">
                            {new Date(loanAccount.dueDate).toLocaleDateString("id-ID")}
                          </p>
                          {(() => {
                            const msLeft = new Date(loanAccount.dueDate).getTime() - now;
                            const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                            const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const urgent = daysLeft <= 2;
                            if (msLeft <= 0) return <p className="text-[0.7rem] text-red-400 mt-1 font-medium">Overdue</p>;
                            return (
                              <p className={`text-[0.7rem] mt-1 font-medium ${urgent ? "text-[#f59e0b]" : "text-[#6b7280]"}`}>
                                {daysLeft}d {hoursLeft}h remaining
                              </p>
                            );
                          })()}
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
                      <h3 className="text-[0.95rem] font-semibold text-white mb-5">{t.repayNow}</h3>

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
                        {loading ? t.processing : "Repay Now"}
                      </button>
                    </div>
                  </>
                )}

                {/* Borrow view */}
                {(!loanAccount || loanAccount.repaid) && (
                  <div className="bg-[#13141a] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-[0.95rem] font-semibold text-white mb-5">{t.borrowNow}</h3>

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

                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[0.7rem] text-[#4b5563] uppercase tracking-widest">{t.amount}</label>
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

                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {[10, 25, maxAmount].map((v, i) => (
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
                      {loading ? t.processing : `Take Loan · $${amount} USDC`}
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
