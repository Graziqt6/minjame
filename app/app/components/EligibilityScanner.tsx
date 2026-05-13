"use client";

import { useEffect, useState } from "react";
import { checkEligibility, EligibilityResult } from "../../lib/eligibility";

type LayerStatus = "pending" | "scanning" | "passed" | "failed";

interface Layer {
  id: number;
  status: LayerStatus;
  title: { en: string; id: string };
  subtitle: { en: string; id: string };
  checks: { label: { en: string; id: string }; passed: boolean | null }[];
}

interface Props {
  walletAddress: string;
  lang: "en" | "id";
  onComplete: (result: EligibilityResult, allPassed: boolean) => void;
  onTrySimulation?: () => void;
}

const t = (s: { en: string; id: string }, lang: "en" | "id") => s[lang];

const LAYERS_INIT: Layer[] = [
  {
    id: 1,
    status: "pending",
    title: { en: "Wallet Age & Activity", id: "Umur & Aktivitas Wallet" },
    subtitle: { en: "Checking wallet history and basic activity", id: "Memeriksa riwayat wallet dan aktivitas dasar" },
    checks: [
      { label: { en: "Wallet 21+ days old", id: "Wallet berusia 21+ hari" }, passed: null },
      { label: { en: "3+ active days", id: "3+ hari aktif" }, passed: null },
    ],
  },
  {
    id: 2,
    status: "pending",
    title: { en: "Transaction Behavior", id: "Perilaku Transaksi" },
    subtitle: { en: "Analyzing patterns and address diversity", id: "Menganalisis pola dan diversitas alamat" },
    checks: [
      { label: { en: "Natural time patterns", id: "Pola waktu transaksi alami" }, passed: null },
      { label: { en: "Address diversity", id: "Diversitas alamat tujuan" }, passed: null },
    ],
  },
  {
    id: 3,
    status: "pending",
    title: { en: "Financial Intent Signals", id: "Sinyal Niat Finansial" },
    subtitle: { en: "Verifying real-world financial usage", id: "Memverifikasi penggunaan finansial nyata" },
    checks: [
      { label: { en: "SOL balance / transfer >$3", id: "Saldo / transfer SOL >$3" }, passed: null },
      { label: { en: "DeFi / age >60 days", id: "DeFi / umur wallet >60 hari" }, passed: null },
    ],
  },
];

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function EligibilityScanner({ walletAddress, lang, onComplete, onTrySimulation }: Props) {
  const [layers, setLayers] = useState<Layer[]>(LAYERS_INIT.map(l => ({ ...l, checks: l.checks.map(c => ({ ...c })) })));
  const [done, setDone] = useState(false);
  const [eligResult, setEligResult] = useState<EligibilityResult | null>(null);
  const [allPassed, setAllPassed] = useState(false);

  useEffect(() => { runScan(); }, []);

  async function runScan() {
    let result: EligibilityResult;
    try {
      result = await checkEligibility(walletAddress);
    } catch {
      result = { eligible: false, limit: 5, reason: "Failed to read wallet.", signals: { layer1: false, layer2: false, layer3: false, layer3Count: 0 } };
    }
    setEligResult(result);

    const layerResults = [result.signals.layer1, result.signals.layer2, result.signals.layer3];
    let pass = true;

    for (let i = 0; i < 3; i++) {
      setLayers(prev => prev.map((l, idx) => idx === i ? { ...l, status: "scanning" } : l));
      await wait(1100);

      const layerPassed = layerResults[i];
      if (!layerPassed) pass = false;

      setLayers(prev => prev.map((l, idx) => {
        if (idx !== i) return l;
        return {
          ...l,
          status: layerPassed ? "passed" : "failed",
          checks: l.checks.map(c => ({ ...c, passed: layerPassed })),
        };
      }));

      await wait(500);
    }

    setAllPassed(pass);
    setDone(true);
    if (pass) { await wait(800); onComplete(result, true); }
  }

  const failedIdx = layers.findIndex(l => l.status === "failed");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,8,22,0.94)", backdropFilter:"blur(20px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ width:"100%", maxWidth:540, background:"#0E1225", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:32, fontFamily:"'DM Sans', sans-serif" }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#f0eef8", marginBottom:6 }}>
            {lang === "id" ? "Verifikasi Wallet" : "Wallet Verification"}
          </div>
          <div style={{ fontSize:13, color:"#8B8FA8" }}>
            {lang === "id" ? "Menganalisis riwayat onchain Anda..." : "Analyzing your onchain history..."}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {layers.map(layer => <LayerCard key={layer.id} layer={layer} lang={lang} />)}
        </div>

        {done && (
          <div style={{ marginTop:24, padding:16, borderRadius:12, background: allPassed ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)", border:`1px solid ${allPassed ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`, animation:"fadeInUp 0.4s ease" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color: allPassed ? "#22c55e" : "#f59e0b", marginBottom:4 }}>
              {allPassed
                ? (lang === "id" ? "Verifikasi Lolos" : "Verification Passed")
                : (lang === "id" ? "Belum Memenuhi Syarat" : "Not Yet Eligible")}
            </div>
            <div style={{ fontSize:13, color:"#8B8FA8", lineHeight:1.6 }}>
              {allPassed
                ? (lang === "id" ? "Wallet Anda lolos semua layer. Lanjut ke dashboard." : "Your wallet passed all checks. Proceeding to dashboard.")
                : (lang === "id"
                  ? `Wallet Anda tidak lolos di Layer ${failedIdx + 1}. Anda masih bisa mencoba mode simulasi.`
                  : `Your wallet failed at Layer ${failedIdx + 1}. You can still try simulation mode.`)}
            </div>
            {!allPassed && (
              <div style={{ display:"flex", gap:8, marginTop:14 }}>
                <button onClick={() => onComplete(eligResult!, false)} style={{ flex:1, padding:"10px 16px", borderRadius:12, background:"transparent", color:"#f0eef8", border:"1px solid rgba(255,255,255,0.1)", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {lang === "id" ? "Tutup" : "Close"}
                </button>
                {onTrySimulation && (
                  <button onClick={onTrySimulation} style={{ flex:1, padding:"10px 16px", borderRadius:12, background:"#6C35E8", color:"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    {lang === "id" ? "Coba Mode Simulasi" : "Try Simulation Anyway"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LayerCard({ layer, lang }: { layer: Layer; lang: "en" | "id" }) {
  const borderColor =
    layer.status === "scanning" ? "rgba(139,92,246,0.5)"
    : layer.status === "passed" ? "rgba(34,197,94,0.3)"
    : layer.status === "failed" ? "rgba(245,158,11,0.3)"
    : "rgba(255,255,255,0.05)";

  const accentColor =
    layer.status === "passed" ? "#22c55e"
    : layer.status === "failed" ? "#f59e0b"
    : layer.status === "scanning" ? "#8B5CF6"
    : "#555A72";

  const label =
    layer.status === "passed" ? (lang === "id" ? "LOLOS" : "PASSED")
    : layer.status === "failed" ? (lang === "id" ? "GAGAL" : "FAILED")
    : layer.status === "scanning" ? (lang === "id" ? "MEMINDAI" : "SCANNING")
    : (lang === "id" ? "MENUNGGU" : "PENDING");

  return (
    <div style={{ padding:14, borderRadius:14, background:"#181D35", border:`1px solid ${borderColor}`, transition:"all 0.4s ease", opacity: layer.status === "pending" ? 0.45 : 1, position:"relative", overflow:"hidden" }}>
      {layer.status === "scanning" && (
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(139,92,246,0.13),transparent)", animation:"shimmer 1.4s linear infinite", pointerEvents:"none" }} />
      )}
      <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
        <StatusIcon status={layer.status} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#f0eef8", marginBottom:2 }}>{t(layer.title, lang)}</div>
          <div style={{ fontSize:12, color:"#8B8FA8" }}>{t(layer.subtitle, lang)}</div>
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:accentColor, textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
      </div>

      {(layer.status === "passed" || layer.status === "failed") && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", flexDirection:"column", gap:5 }}>
          {layer.checks.map((c, idx) => (
            <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
              <span style={{ color: c.passed ? "#22c55e" : "#f59e0b" }}>{c.passed ? "✓" : "✗"}</span>
              <span style={{ color:"#8B8FA8" }}>{t(c.label, lang)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: LayerStatus }) {
  if (status === "scanning") return (
    <div style={{ width:28, height:28, borderRadius:"50%", border:"2.5px solid rgba(139,92,246,0.2)", borderTopColor:"#8B5CF6", animation:"spin 0.75s linear infinite", flexShrink:0 }} />
  );
  if (status === "passed") return (
    <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#22c55e", fontSize:14, fontWeight:700, flexShrink:0 }}>✓</div>
  );
  if (status === "failed") return (
    <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(245,158,11,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#f59e0b", fontSize:14, fontWeight:700, flexShrink:0 }}>✗</div>
  );
  return <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }} />;
}
