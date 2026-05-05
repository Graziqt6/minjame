"use client";

import { useState, useEffect } from "react";
import { EntryScreen } from "./entry";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { checkEligibility, EligibilityResult } from "../lib/eligibility";
import { TIERS, INTENT_DEPOSIT, LOAN_DURATION_DAYS } from "../lib/constants";
import { createLoan, repayLoan, fetchUserScore, fetchActiveLoan } from "../lib/solana";

const DEMO_CAP = 50;

const TEXTS = {
  en: {
    subtitle: "On-chain credit for everyday crypto users",
    tagline: "No collateral. No KYC. Build your on-chain credit score.",
    bullets: ["No collateral required", "No KYC or documents", "Build permanent on-chain credit"],
    connect: "Connect Wallet",
    checking: "Reading your wallet history...",
    level: "Level",
    score: "Score",
    limit: "Limit",
    rate: "Interest / year",
    scoreHint: "increases with on-time repayments",
    tierHint0: "Start small. Repay on time to level up.",
    tierHint1: "Your limit and rate improve as your reputation grows.",
    nextTier: "repayments to unlock",
    borrow: "Borrow Now",
    borrowBtn: "Take Loan",
    amount: "Amount",
    youGet: "You receive",
    deposit: "Intent deposit",
    depositNote: "refunded on repayment",
    totalRepay: "Total repayment",
    dueDate: "Due date",
    interest: "Interest",
    depositExplain: "The $2 deposit is not a fee — it is returned when you repay.",
    activeLoan: "Active Loan",
    loanAmount: "Loan amount",
    depositHeld: "Deposit held",
    wallet: "Wallet",
    repayNow: "Repay Now",
    principalInterest: "Principal + interest",
    depositReturn: "Deposit returned",
    repayHint: "Repay on time to unlock a higher limit",
    success: "Repaid!",
    scoreUp: "Your credit score increased.",
    depositBack: "$2 deposit has been returned to your wallet.",
    viewExplorer: "View on Solana Explorer",
    ineligible: "Not eligible yet",
    tierMax: "You have reached the highest level — Mitra.",
    dataOnchain: "All data stored on-chain",
    ineligibleHint: "Your wallet history is not sufficient.",
    whatToDo: "What you need to do:",
    tip1: "Use your wallet for regular transactions",
    tip2: "Hold USDC for at least 7 days",
    tip3: "Swap or send to an exchange once",
    processing: "Processing...",
    days: "days",
    onchain: "On-chain",
    noKyc: "No KYC · No Bank",
    network: "Solana Devnet",
  },
  id: {
    tierMax: "Kamu sudah di level tertinggi — Mitra.",
    subtitle: "Kredit onchain untuk pengguna crypto sehari-hari",
    tagline: "Tanpa jaminan. Tanpa KYC. Bangun skor kredit onchain kamu.",
    bullets: ["Tidak butuh jaminan", "Tidak perlu KYC atau dokumen", "Bangun kredit permanen di blockchain"],
    connect: "Hubungkan Dompet",
    checking: "Membaca riwayat dompetmu...",
    level: "Level",
    score: "Skor",
    limit: "Limit",
    rate: "Bunga / tahun",
    scoreHint: "naik saat bayar tepat waktu",
    tierHint0: "Mulai dari limit kecil. Bayar tepat waktu untuk naik.",
    tierHint1: "Limit naik & bunga turun seiring reputasi kamu.",
    nextTier: "pembayaran lagi untuk unlock",
    borrow: "Pinjam Sekarang",
    borrowBtn: "Ambil Pinjaman",
    amount: "Jumlah",
    youGet: "Kamu terima",
    deposit: "Deposit niat",
    depositNote: "dikembalikan saat bayar",
    totalRepay: "Total bayar",
    dueDate: "Jatuh tempo",
    interest: "Bunga",
    depositExplain: "Deposit $2 bukan biaya — dikembalikan saat kamu bayar.",
    activeLoan: "Pinjaman Aktif",
    loanAmount: "Jumlah pinjaman",
    depositHeld: "Deposit ditahan",
    wallet: "Dompet",
    repayNow: "Bayar Sekarang",
    principalInterest: "Pokok + bunga",
    depositReturn: "Deposit kembali",
    repayHint: "Bayar tepat waktu untuk buka limit lebih besar",
    success: "Berhasil dibayar!",
    scoreUp: "Skor kreditmu naik.",
    depositBack: "Deposit $2 sudah kembali ke dompetmu.",
    viewExplorer: "Lihat di Solana Explorer",
    ineligible: "Belum layak saat ini",
    ineligibleHint: "Riwayat dompet belum cukup.",
    whatToDo: "Yang perlu kamu lakukan:",
    tip1: "Gunakan dompetmu untuk transaksi rutin",
    tip2: "Tahan USDC minimal 7 hari",
    tip3: "Swap atau kirim ke exchange sekali",
    processing: "Memproses...",
    days: "hari",
    onchain: "Onchain",
    noKyc: "Tanpa KYC · Tanpa Bank",
    network: "Solana Devnet",
  }
};

type Lang = "en" | "id";
type AppState = "connect" | "checking" | "eligible" | "ineligible" | "active_loan" | "success";

interface LoanState {
  amount: number;
  dueDate: Date;
  intentDeposit: number;
}

interface ScoreState {
  score: number;
  tier: number;
  repaymentCount: number;
  onTimeCount: number;
}

export default function Home() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const [entered, setEntered] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("minjame_entered") === "true";
    }
    return false;
  });
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("minjame_lang") as Lang) || "en";
    }
    return "id";
  });

  function toggleLang() {
    const next = lang === "id" ? "en" : "id";
    setLang(next);
    if (typeof window !== "undefined") localStorage.setItem("minjame_lang", next);
  }
  const [appState, setAppState] = useState<AppState>("connect");
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [borrowAmount, setBorrowAmount] = useState(10);
  const [inputValue, setInputValue] = useState("10");
  const [loan, setLoan] = useState<LoanState | null>(null);
  const [score, setScore] = useState<ScoreState>({ score: 0, tier: 0, repaymentCount: 0, onTimeCount: 0 });
  const [prevScore, setPrevScore] = useState(0);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const t = TEXTS[lang];
  const tier = TIERS[score.tier] || TIERS[0];
  const uiMax = Math.min(tier.limit, DEMO_CAP);
  const nextTierData = TIERS[Math.min(score.tier + 1, 3)];
  const onTimeNeeded = [3, 8, 15][score.tier] ?? null;
  const onTimeLeft = onTimeNeeded ? Math.max(0, onTimeNeeded - score.onTimeCount) : 0;
  const interest = borrowAmount * tier.rate / 100 * 14 / 365;
  const totalRepayment = borrowAmount + interest;
  const dueDate = new Date(Date.now() + LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const scoreGain = score.score - prevScore;

  useEffect(() => {
    if (connected && publicKey) runEligibilityCheck();
    else setAppState("connect");
  }, [connected, publicKey]);

  async function runEligibilityCheck() {
    setAppState("checking");
    setError("");
    try {
      let activeLoan = null;
      let scoreData = null;
      try { activeLoan = await fetchActiveLoan(publicKey!, wallet); } catch {}
      try { scoreData = await fetchUserScore(publicKey!, wallet); } catch {}
      if (activeLoan) {
        setLoan(activeLoan);
        setAppState("active_loan");
        if (scoreData) setScore(scoreData as ScoreState);
        return;
      }
      if (scoreData) setScore(scoreData as ScoreState);
      const result = await checkEligibility(publicKey!.toString());
      setEligibility(result);
      if (result.eligible) {
        const tierLimit = TIERS[(scoreData as any)?.tier ?? 0].limit;
        const max = Math.min(result.limit, tierLimit, DEMO_CAP);
        setBorrowAmount(Math.min(10, max));
        setInputValue(String(Math.min(10, max)));
        setAppState("eligible");
      } else {
        setAppState("ineligible");
      }
    } catch { setAppState("ineligible"); }
  }

  function handleSliderChange(val: number) {
    const c = Math.min(Math.max(1, val), uiMax);
    setBorrowAmount(c); setInputValue(String(c));
  }

  function handleInputChange(val: string) {
    setInputValue(val);
    const n = parseInt(val);
    if (!isNaN(n) && n >= 1 && n <= uiMax) setBorrowAmount(n);
  }

  function handleInputBlur() {
    const n = parseInt(inputValue);
    const clamped = isNaN(n) ? 1 : Math.min(Math.max(1, n), uiMax);
    setBorrowAmount(clamped); setInputValue(String(clamped));
  }

  async function handleBorrow() {
    if (!publicKey) return;
    setLoading(true); setError("");
    try {
      const tx = await createLoan(wallet, borrowAmount);
      setTxHash(tx);
      await new Promise(r => setTimeout(r, 3000));
      const activeLoan = await fetchActiveLoan(publicKey, wallet);
      if (activeLoan) { setLoan(activeLoan); setAppState("active_loan"); }
      else { await runEligibilityCheck(); }
    } catch (e: any) {
      console.error("BORROW ERROR:", e);
      setError(e.message || "Transaction failed. Try again.");
    }
    setLoading(false);
  }

  async function handleRepay() {
    if (!publicKey) return;
    setLoading(true); setError("");
    try {
      setPrevScore(score.score);
      const tx = await repayLoan(wallet);
      setTxHash(tx);
      setAppState("success");
      setTimeout(async () => {
        const scoreData = await fetchUserScore(publicKey, wallet);
        if (scoreData) setScore(scoreData as ScoreState);
        setLoan(null);
        await runEligibilityCheck();
      }, 2500);
    } catch (e: any) { setError(e.message || "Repayment failed. Try again."); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {!entered && <EntryScreen onEnter={() => setEntered(true)} lang={lang} />}

      {/* HEADER */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MINJAME" width={32} height={32} className="rounded-lg" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">MINJAME</h1>
              <p className="text-xs text-gray-500">{t.network} · {t.noKyc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300 transition-all">
              {lang === "id" ? "EN" : "ID"}
            </button>
            <div suppressHydrationWarning>
              <WalletMultiButton style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", height: "36px" }} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* CONNECT STATE */}
        {appState === "connect" && (
          <div className="flex flex-col items-center justify-center min-h-96 text-center space-y-8">
            <div className="space-y-3">
              <h2 className="text-4xl font-bold">MINJAME</h2>
              <p className="text-xl text-gray-400">{t.subtitle}</p>
              <p className="text-gray-500">{t.tagline}</p>
            </div>
            <div className="flex flex-col gap-3 text-left max-w-xs">
              {t.bullets.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-900 text-green-400 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <span className="text-gray-300 text-sm">{b}</span>
                </div>
              ))}
            </div>
            <div suppressHydrationWarning>
              <WalletMultiButton style={{ fontSize: "15px", padding: "12px 32px", borderRadius: "10px" }} />
            </div>
          </div>
        )}

        {/* CHECKING */}
        {appState === "checking" && (
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">{t.checking}</p>
          </div>
        )}

        {/* INELIGIBLE */}
        {appState === "ineligible" && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center">
              <p className="text-3xl mb-3">⏳</p>
              <p className="font-semibold text-lg">{t.ineligible}</p>
              <p className="text-gray-400 text-sm mt-2">{eligibility?.reason || t.ineligibleHint}</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-2">
              <p className="text-sm font-medium text-gray-300">{t.whatToDo}</p>
              {[t.tip1, t.tip2, t.tip3].map((tip, i) => (
                <p key={i} className="text-sm text-gray-400">• {tip}</p>
              ))}
            </div>
          </div>
        )}

        {/* ELIGIBLE — 2 COLUMN LAYOUT */}
        {appState === "eligible" && eligibility && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT: Credit Overview (3/5) */}
            <div className="lg:col-span-3 space-y-4">

              {/* Credit Card */}
              <div className="rounded-2xl p-6 space-y-4"
                style={{ background: `linear-gradient(135deg, ${tier.color}22, #111827)`, border: `1px solid ${tier.color}44` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{t.level}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold" style={{ color: tier.color }}>{tier.name}</p>
                      <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{t.onchain}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{t.score}</p>
                    <p className="text-2xl font-bold mt-1">{score.score}</p>
                    <p className="text-xs text-gray-500">{t.scoreHint}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 bg-opacity-60 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{t.limit}</p>
                    <p className="text-xl font-bold mt-1">${uiMax} USDC</p>
                  </div>
                  <div className="bg-gray-900 bg-opacity-60 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{t.rate}</p>
                    <p className="text-xl font-bold mt-1">{tier.rate}%</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 truncate">{publicKey?.toString().slice(0, 28)}...</p>
              </div>

              {/* Tier Explanation */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
                <p className="text-sm text-gray-300">
                  {score.tier === 0 ? t.tierHint0 : t.tierHint1}
                </p>
                {score.tier < 3 && onTimeLeft > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{tier.name}</span>
                      <span style={{ color: nextTierData.color }}>{nextTierData.name} (${Math.min(nextTierData.limit, DEMO_CAP)} limit · {nextTierData.rate}% APR)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (score.onTimeCount / (onTimeNeeded ?? 1)) * 100)}%`,
                          background: tier.color
                        }} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {onTimeLeft} {t.nextTier} {nextTierData.name}
                    </p>
                  </div>
                )}
                {score.tier === 3 && (
                  <p className="text-xs text-green-400">{t.tierMax}</p>
                )}
                <div className="flex gap-4 text-xs text-gray-500 pt-1">
                  <span>• {t.dataOnchain}</span>
                  <span>• {t.noKyc}</span>
                </div>
              </div>

              {/* Tier Road Map */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Tier Progression</p>
                <div className="space-y-2">
                  {TIERS.map((t_item, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl transition-all ${i === score.tier ? 'border' : 'opacity-50'}`}
                      style={i === score.tier ? { borderColor: t_item.color, background: `${t_item.color}11` } : {}}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: t_item.color }} />
                        <span className="text-sm font-medium" style={i === score.tier ? { color: t_item.color } : {}}>{t_item.name}</span>
                        {i === score.tier && <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">current</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-300">${Math.min(t_item.limit, DEMO_CAP)} · {t_item.rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Action Panel (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-5">
                <p className="font-semibold text-lg">{t.borrow}</p>

                {/* Amount Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{t.amount}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-400">$</span>
                      <input type="number" min={1} max={uiMax} value={inputValue}
                        onChange={e => handleInputChange(e.target.value)}
                        onBlur={handleInputBlur}
                        className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-right text-white focus:outline-none focus:border-blue-500" />
                      <span className="text-sm text-gray-400">USDC</span>
                    </div>
                  </div>
                  <input type="range" min={1} max={uiMax} value={borrowAmount}
                    onChange={e => handleSliderChange(Number(e.target.value))}
                    className="w-full accent-blue-500" />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>$1</span><span>${uiMax}</span>
                  </div>
                  <div className="flex gap-2">
                    {[10, 25, uiMax].map((v, i) => (
                      <button key={i} onClick={() => { setBorrowAmount(Math.min(v, uiMax)); setInputValue(String(Math.min(v, uiMax))); }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${borrowAmount === Math.min(v, uiMax) ? "border-blue-500 text-blue-400 bg-blue-900 bg-opacity-30" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                        {i === 2 ? "MAX" : `$${v}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loan Breakdown */}
                <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.youGet}</span>
                    <span className="font-medium">${borrowAmount.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.deposit} <span className="text-green-500 text-xs">({t.depositNote})</span></span>
                    <span className="font-medium text-yellow-400">${INTENT_DEPOSIT}.00 USDC</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between">
                    <span className="text-gray-400">{t.totalRepay}</span>
                    <span className="font-medium">${totalRepayment.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.dueDate}</span>
                    <span className="font-medium">{dueDate.toLocaleDateString("id-ID")} ({LOAN_DURATION_DAYS} {t.days})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.interest}</span>
                    <span className="font-medium">${interest.toFixed(2)} ({tier.rate}% APR)</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500">* {t.depositExplain}</p>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button onClick={handleBorrow} disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 text-sm"
                  style={{ background: tier.color }}>
                  {loading ? t.processing : `${t.borrowBtn} · $${borrowAmount} USDC`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE LOAN — FULL WIDTH */}
        {appState === "active_loan" && loan && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-gray-900 border border-green-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-lg">{t.activeLoan}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{t.onchain}</span>
                  <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full">Active</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">{t.loanAmount}</p>
                  <p className="font-bold text-lg mt-1">${loan.amount} USDC</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">{t.depositHeld}</p>
                  <p className="font-bold text-lg mt-1 text-yellow-400">${loan.intentDeposit} USDC</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">{t.dueDate}</p>
                  <p className="font-bold mt-1">{loan.dueDate.toLocaleDateString("id-ID")}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">{t.wallet}</p>
                  <p className="font-mono text-xs mt-1 text-gray-300">{publicKey?.toString().slice(0, 14)}...</p>
                </div>
              </div>
              {txHash && (
                <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300">
                  🔗 {t.viewExplorer}
                </a>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
              <p className="font-semibold">{t.repayNow}</p>
              <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.principalInterest}</span>
                  <span className="font-medium">${(loan.amount + loan.amount * tier.rate / 100 * 14 / 365).toFixed(2)} USDC</span>
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between">
                  <span className="text-gray-400">{t.depositReturn}</span>
                  <span className="font-medium text-green-400">+${loan.intentDeposit} USDC</span>
                </div>
              </div>
              <p className="text-xs text-green-500 font-medium">→ {t.repayHint}</p>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleRepay} disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-500 transition-all disabled:opacity-50">
                {loading ? t.processing : t.repayNow}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS OVERLAY */}
        {appState === "success" && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
            <div className="bg-gray-900 border border-green-500 rounded-2xl p-8 text-center space-y-4 mx-4 max-w-sm w-full">
              <div className="text-5xl">✓</div>
              <p className="text-2xl font-bold text-green-400">{t.success}</p>
              {scoreGain > 0 && (
                <div className="bg-green-900 bg-opacity-30 border border-green-800 rounded-xl p-4 space-y-1">
                  <p className="text-green-400 font-bold text-2xl">+{scoreGain} score</p>
                  <p className="text-gray-300 text-sm">Your credit score increased</p>
                  <p className="text-gray-400 text-xs">New score: {score.score + scoreGain}</p>
                </div>
              )}
              <p className="text-green-300 text-sm font-medium">You unlocked higher borrowing power</p>
              <p className="text-gray-400 text-sm">{t.depositBack}</p>
              <p className="text-sm text-gray-400">{t.depositBack}</p>
              {score.tier < 3 && onTimeLeft > 0 && (
                <p className="text-xs text-blue-400">{onTimeLeft} {t.nextTier} {nextTierData.name} (${Math.min(nextTierData.limit, DEMO_CAP)} limit)</p>
              )}
              {txHash && (
                <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs text-blue-400 hover:text-blue-300">
                  🔗 {t.viewExplorer}
                </a>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
