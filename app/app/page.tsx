"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { checkEligibility, EligibilityResult } from "../lib/eligibility";
import { TIERS, INTENT_DEPOSIT, LOAN_DURATION_DAYS } from "../lib/constants";

type AppState = "connect" | "checking" | "eligible" | "ineligible" | "borrow" | "active_loan" | "repay";

interface LoanState {
  amount: number;
  dueDate: Date;
  intentDeposit: number;
}

interface ScoreState {
  score: number;
  tier: number;
  repaymentCount: number;
}

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [appState, setAppState] = useState<AppState>("connect");
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [borrowAmount, setBorrowAmount] = useState(10);
  const [loan, setLoan] = useState<LoanState | null>(null);
  const [score, setScore] = useState<ScoreState>({ score: 0, tier: 0, repaymentCount: 0 });
  const [checking, setChecking] = useState(false);
  const [scoreAnimation, setScoreAnimation] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      runEligibilityCheck();
    } else {
      setAppState("connect");
    }
  }, [connected, publicKey]);

  async function runEligibilityCheck() {
    setAppState("checking");
    setChecking(true);
    try {
      const result = await checkEligibility(publicKey!.toString());
      setEligibility(result);
      if (result.eligible) {
        setBorrowAmount(result.limit);
        setAppState("eligible");
      } else {
        setAppState("ineligible");
      }
    } catch {
      setAppState("ineligible");
    }
    setChecking(false);
  }

  function handleBorrow() {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LOAN_DURATION_DAYS);
    setLoan({ amount: borrowAmount, dueDate, intentDeposit: INTENT_DEPOSIT });
    setAppState("active_loan");
  }

  function handleRepay() {
    setScoreAnimation(true);
    const newScore = score.score + 10;
    const newCount = score.repaymentCount + 1;
    const newTier = newCount >= 15 ? 3 : newCount >= 8 ? 2 : newCount >= 3 ? 1 : 0;
    setTimeout(() => {
      setScore({ score: newScore, tier: newTier, repaymentCount: newCount });
      setLoan(null);
      setAppState("eligible");
      setScoreAnimation(false);
    }, 1500);
  }

  const tier = TIERS[score.tier];

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-8">

      {/* Header */}
      <div className="w-full max-w-md mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">MINJAME</h1>
        <WalletMultiButton style={{ fontSize: "14px", padding: "8px 16px", borderRadius: "8px" }} />
      </div>

      {/* CONNECT STATE */}
      {appState === "connect" && (
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-64 h-40 mx-auto rounded-2xl flex flex-col items-center justify-center border border-gray-700"
            style={{ background: "linear-gradient(135deg, #1f2937, #111827)" }}>
            <p className="text-gray-400 text-sm">Kartu Kreditmu</p>
            <p className="text-3xl font-bold mt-2">MINJAME</p>
            <p className="text-gray-500 text-xs mt-1">Hubungkan dompet untuk mulai</p>
          </div>
          <p className="text-xl font-semibold">Pinjaman pertamamu.</p>
          <p className="text-gray-400">Tanpa jaminan. Tanpa bank. Hanya dompetmu.</p>
          <p className="text-gray-500 text-sm">Hubungkan dompet Phantom untuk cek kelayakanmu.</p>
        </div>
      )}

      {/* CHECKING STATE */}
      {appState === "checking" && (
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium">Kami lagi baca riwayat dompetmu...</p>
          <p className="text-gray-400 text-sm">Biasanya selesai dalam 5–10 detik.</p>
          <div className="space-y-2 mt-4">
            {["Cek umur dompet...", "Analisa pola aktivitas...", "Deteksi sinyal finansial..."].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INELIGIBLE STATE */}
      {appState === "ineligible" && eligibility && (
        <div className="w-full max-w-md space-y-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">⏳</p>
            <p className="font-semibold text-lg">Belum layak saat ini</p>
            <p className="text-gray-400 text-sm mt-2">{eligibility.reason}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-medium text-gray-300">Yang perlu kamu lakukan:</p>
            <p className="text-sm text-gray-400">• Gunakan dompetmu untuk transaksi rutin</p>
            <p className="text-sm text-gray-400">• Tahan USDC minimal 7 hari</p>
            <p className="text-sm text-gray-400">• Swap atau kirim ke exchange sekali</p>
          </div>
        </div>
      )}

      {/* ELIGIBLE STATE — Credit Card + Borrow */}
      {(appState === "eligible" || appState === "borrow") && eligibility && (
        <div className="w-full max-w-md space-y-4">

          {/* Credit Card */}
          <div className="rounded-2xl p-6 space-y-3"
            style={{ background: `linear-gradient(135deg, ${tier.color}33, #111827)`, border: `1px solid ${tier.color}66` }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400">Level</p>
                <p className="text-xl font-bold" style={{ color: tier.color }}>{tier.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Skor</p>
                <p className={`text-xl font-bold ${scoreAnimation ? "text-green-400 scale-110" : "text-white"} transition-all`}>
                  {score.score}
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-400">Limit</p>
                <p className="text-lg font-semibold">${eligibility.limit} USDC</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Bunga/tahun</p>
                <p className="text-lg font-semibold">{tier.rate}%</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 truncate">
              {publicKey?.toString().slice(0, 20)}...
            </div>
          </div>

          {/* Borrow Form */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <p className="font-semibold">Pinjam Sekarang</p>

            <div className="space-y-1">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Jumlah</span>
                <span>${borrowAmount} USDC</span>
              </div>
              <input type="range" min={1} max={eligibility.limit} value={borrowAmount}
                onChange={e => setBorrowAmount(Number(e.target.value))}
                className="w-full accent-blue-500" />
            </div>

            <div className="bg-gray-800 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Kamu terima</span>
                <span className="font-medium">${borrowAmount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deposit niat</span>
                <span className="font-medium text-yellow-400">${INTENT_DEPOSIT} USDC *</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total bayar</span>
                <span className="font-medium">${(borrowAmount + borrowAmount * tier.rate / 100 * 14 / 365).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Jatuh tempo</span>
                <span className="font-medium">{LOAN_DURATION_DAYS} hari</span>
              </div>
            </div>

            <p className="text-xs text-gray-500">* Deposit niat $2 dikembalikan saat kamu bayar. Ini bukan biaya — ini bukti niatmu.</p>

            <button onClick={handleBorrow}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all"
              style={{ background: tier.color }}>
              Pinjam ${borrowAmount} USDC
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE LOAN STATE */}
      {appState === "active_loan" && loan && (
        <div className="w-full max-w-md space-y-4">
          <div className="bg-gray-900 border border-green-700 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-lg">Pinjaman Aktif</p>
              <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full">Aktif</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Jumlah pinjaman</span>
                <span>${loan.amount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deposit niat (ditahan)</span>
                <span className="text-yellow-400">${loan.intentDeposit} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Jatuh tempo</span>
                <span>{loan.dueDate.toLocaleDateString("id-ID")}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <p className="font-semibold">Bayar Sekarang</p>
            <div className="bg-gray-800 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Pokok + bunga</span>
                <span>${(loan.amount + loan.amount * tier.rate / 100 * 14 / 365).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deposit niat kembali</span>
                <span className="text-green-400">+${loan.intentDeposit} USDC</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">Bayar tepat waktu → skor naik → limit lebih besar next time.</p>
            <button onClick={handleRepay}
              className="w-full py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-500 transition-all">
              Bayar Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Score animation overlay */}
      {scoreAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 border border-green-500 rounded-2xl p-8 text-center space-y-2">
            <p className="text-4xl">✓</p>
            <p className="text-xl font-bold text-green-400">Berhasil dibayar!</p>
            <p className="text-gray-400">Skor kreditmu naik.</p>
            <p className="text-sm text-gray-500">Deposit niat $2 sudah kembali ke dompetmu.</p>
          </div>
        </div>
      )}

    </main>
  );
}
