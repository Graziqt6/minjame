"use client";

import { useState } from "react";
import Image from "next/image";

interface EntryScreenProps {
  onEnter: () => void;
  lang: "en" | "id";
}

export function EntryScreen({ onEnter, lang }: EntryScreenProps) {
  const [checked, setChecked] = useState(false);

  const text = lang === "en" ? {
    hook: "Your first loan starts here.",
    sub: "Build credit from your wallet. No documents.",
    checkbox: "I understand this is a Solana Devnet demo",
    cta: "Enter App",
  } : {
    hook: "Pinjaman pertamamu dimulai di sini.",
    sub: "Bangun kredit dari dompetmu. Tanpa dokumen.",
    checkbox: "Saya mengerti ini adalah demo Solana Devnet",
    cta: "Masuk",
  };

  function handleEnter() {
    if (!checked) return;
    localStorage.setItem("minjame_entered", "true");
    onEnter();
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50 px-4">
      <div className="flex flex-col items-center text-center space-y-8 max-w-sm w-full">
        <Image src="/logo.png" alt="MINJAME" width={80} height={80} className="rounded-2xl" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{text.hook}</h1>
          <p className="text-gray-400 text-sm">{text.sub}</p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setChecked(!checked)}
            className={"w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer " + (checked ? "bg-purple-600 border-purple-600" : "border-gray-600")}>
            {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
          <span className="text-gray-400 text-sm text-left">{text.checkbox}</span>
        </label>
        <button onClick={handleEnter} disabled={!checked}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: checked ? "linear-gradient(135deg, #7c3aed, #9333ea)" : "#374151" }}>
          {text.cta}
        </button>
        <p className="text-xs text-gray-600">Solana Devnet · No real funds at risk</p>
      </div>
    </div>
  );
}
