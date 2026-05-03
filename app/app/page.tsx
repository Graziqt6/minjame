"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { checkEligibility, EligibilityResult } from "../lib/eligibility";
import { TIERS, INTENT_DEPOSIT, LOAN_DURATION_DAYS } from "../lib/constants";
import { createLoan, repayLoan, fetchUserScore, fetchActiveLoan } from "../lib/solana";

type AppState = "connect" | "checking" | "eligible" | "ineligible" | "active_loan" | "repaying" | "success";

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
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const [appState, setAppState] = useState<AppState>("connect");
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [borrowAmount, setBorrowAmount] = useState(10);
  const [loan, setLoan] = useState<LoanState | null>(null);
  const [score, setScore] = useState<ScoreState>({ score: 0, tier: 0, repaymentCount: 0 });
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      runEligibilityCheck();
    } else {
      setAppState("connect");
    }
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
        if (scoreData) setScore(scoreData);
        return;
      }
      if (scoreData) setScore(scoreData);
      const result = await checkEligibility(publicKey!.toString());
      setEligibility(result);
      if (result.eligible) {
        setBorrowAmount(result.limit);
        setAppState("eligible");
      } else {
        setAppState("ineligible");
      }
    } catch (e) {
      console.error("Eligibility check failed:", e);
      setAppState("ineligible");
    }
  }

  async function handleBorrow() {
    if (!publicKey) return;
    setLoading(true);
    setError("");
    try {
      const tx = await createLoan(wallet, borrowAmount);
      setTxHash(tx);
      const activeLoan = await fetchActiveLoan(publicKey, wallet);
      if (activeLoan) {
        setLoan(activeLoan);
        setAppState("active_loan");
      }
    } catch (e: any) {
      console.error("BORROW ERROR:", e);
      setError(e.message || "Transaksi gagal. Coba lagi.");
    }
    setLoading(false);
  }

  async function handleRepay() {
    if (!publicKey) return;
    setLoading(true);
    setError("");
    try {
      const tx = await repayLoan(wallet);
      setTxHash(tx);
      setAppState("success");
      setTimeout(async () => {
        const scoreData = await fetchUserScore(publicKey, wallet);
        if (scoreData) setScore(scoreData);
        setLoan(null);
        await runEligibilityCheck();
      }, 2000);
    } catch (e: any) {
      setError(e.message || "Pembayaran gagal. Coba lagi.");
    }
    setLoading(false);
  }

  const tier = TIERS[score.tier] || TIERS[0];

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">MINJAME</h1>
        <div suppressHydrationWarning><WalletMultiButton style={{ fontSize: "14px", padding: "8px 16px", borderRadius: "8px" }} /></div>
      </div>

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

      {appState === "checking" && (
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium">Kami lagi baca riwayat dompetmu...</p>
          <p className="text-gray-400 text-sm">Biasanya selesai dalam 5-10 detik.</p>
        </div>
      )}

      {appState === "ineligible" && (
        <div className="w-full max-w-md space-y-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">⏳</p>
            <p className="font-semibold text-lg">Belum layak saat ini</p>
            <p className="text-gray-400 text-sm mt-2">{eligibility?.reason || "Riwayat dompet belum cukup."}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-medium text-gray-300">Yang perlu kamu lakukan:</p>
            <p className="text-sm text-gray-400">• Gunakan dompetmu untuk transaksi rutin</p>
            <p className="text-sm text-gray-400">• Tahan USDC minimal 7 hari</p>
            <p className="text-sm text-gray-400">• Swap atau kirim ke exchange sekali</p>
          </div>
        </div>
      )}

      {appState === "eligible" && eligibility && (
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-2xl p-6 space-y-3"
            style={{ background: `linear-gradient(135deg, ${tier.color}33, #111827)`, border: `1px solid ${tier.color}66` }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400">Level</p>
                <p className="text-xl font-bold" style={{ color: tier.color }}>{tier.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Skor</p>
                <p className="text-xl font-bold">{score.score}</p>
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
            <div className="text-xs text-gray-500 truncate">{publicKey?.toString().slice(0, 20)}...</div>
          </div>

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
                <span>${borrowAmount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deposit niat</span>
                <span className="text-yellow-400">${INTENT_DEPOSIT} USDC *</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total bayar</span>
                <span>${(borrowAmount + borrowAmount * tier.rate / 100 * 14 / 365).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Jatuh tempo</span>
                <span>{LOAN_DURATION_DAYS} hari</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">* Deposit niat $2 dikembalikan saat kamu bayar. Ini bukan biaya - ini bukti niatmu.</p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleBorrow} disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: tier.color }}>
              {loading ? "Memproses..." : `Pinjam $${borrowAmount} USDC`}
            </button>
          </div>
        </div>
      )}

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
            {txHash && (
              <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 truncate block">
                Lihat transaksi di Explorer
              </a>
            )}
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
            <p className="text-xs text-gray-500">Bayar tepat waktu - skor naik - limit lebih besar next time.</p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleRepay} disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-500 transition-all disabled:opacity-50">
              {loading ? "Memproses..." : "Bayar Sekarang"}
            </button>
          </div>
        </div>
      )}

      {appState === "success" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 border border-green-500 rounded-2xl p-8 text-center space-y-3 mx-4">
            <p className="text-4xl">✓</p>
            <p className="text-xl font-bold text-green-400">Berhasil dibayar!</p>
            <p className="text-gray-400">Skor kreditmu naik.</p>
            <p className="text-sm text-gray-500">Deposit niat $2 sudah kembali ke dompetmu.</p>
            {txHash && (
              <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 block mt-2">
                Lihat transaksi di Explorer
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
