"use client";

interface Props {
  onSelect: (mode: "simulation" | "devnet") => void;
  lang: "en" | "id";
}

export function ModeSelect({ onSelect, lang }: Props) {
  const isEn = lang === "en";

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-50" style={{ background: "#0c0e1c" }}>
      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* Title */}
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-white">
            {isEn ? "Choose a mode" : "Pilih mode"}
          </h2>
          <p className="text-sm text-[#6b7280] mt-1">
            {isEn ? "You can switch anytime" : "Bisa ganti kapan saja"}
          </p>
        </div>

        {/* Simulation */}
        <button
          onClick={() => onSelect("simulation")}
          className="w-full text-left rounded-2xl p-5 border border-white/[0.08] hover:border-[#7c3aed]/50 transition-all"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-start gap-4">
            <div className="text-2xl mt-0.5">🎮</div>
            <div>
              <div className="text-white font-semibold text-base">
                {isEn ? "Simulation" : "Simulasi"}
              </div>
              <div className="text-[#9ca3af] text-sm mt-1">
                {isEn
                  ? "Try borrowing and repayment instantly"
                  : "Coba pinjam dan bayar secara instan"}
              </div>
              <div className="text-[#6b7280] text-xs mt-1">
                {isEn ? "No wallet needed" : "Tidak perlu dompet"}
              </div>
            </div>
          </div>
        </button>

        {/* Devnet */}
        <button
          onClick={() => onSelect("devnet")}
          className="w-full text-left rounded-2xl p-5 border border-white/[0.08] hover:border-[#7c3aed]/50 transition-all"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-start gap-4">
            <div className="text-2xl mt-0.5">⛓️</div>
            <div>
              <div className="text-white font-semibold text-base">Devnet</div>
              <div className="text-[#9ca3af] text-sm mt-1">
                {isEn
                  ? "Use real credit on Solana"
                  : "Gunakan kredit nyata di Solana"}
              </div>
              <div className="text-[#6b7280] text-xs mt-1">
                {isEn
                  ? "Requires a wallet & eligibility"
                  : "Butuh dompet & kelayakan"}
              </div>
            </div>
          </div>
        </button>

      </div>
    </div>
  );
}
