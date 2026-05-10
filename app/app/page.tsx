"use client";

const T = {
  en: {
    level: "Level", limit: "Limit", interestYear: "Interest / Year",
    score: "Score", amount: "Amount", borrowNow: "Borrow Now",
    repayNow: "Repay Now", activeLoan: "Active Loan",
    tierProgression: "Tier Progression", processing: "Processing...",
    increases: "Increases with on-time repayments",
    yourLimit: "Your limit and rate improve as your reputation grows.",
    repayUnlock: "Repay on time to unlock better terms.",
    allData: "All data stored onchain",
    loansRepaid: "Loans Repaid", onTime: "On-Time",
    dueDate: "Due Date", daysLeft: "Days Left",
    totalRepay: "Total to Repay", depositReturn: "Deposit Returned",
    youReceive: "You receive", intentDeposit: "Intent deposit",
    totalRepayment: "Total repayment", interest: "Interest",
    awaitingSig: "Awaiting wallet signature...",
    highest: "You have reached the highest level - Mitra.",
  },
  id: {
    level: "Level", limit: "Limit", interestYear: "Bunga / Tahun",
    score: "Skor", amount: "Jumlah", borrowNow: "Pinjam Sekarang",
    repayNow: "Bayar Sekarang", activeLoan: "Pinjaman Aktif",
    tierProgression: "Progres Tier", processing: "Memproses...",
    increases: "Naik saat bayar tepat waktu",
    yourLimit: "Limit dan bunga membaik seiring reputasimu.",
    repayUnlock: "Bayar tepat waktu untuk syarat lebih baik.",
    allData: "Semua data tersimpan onchain",
    loansRepaid: "Pinjaman Dibayar", onTime: "Tepat Waktu",
    dueDate: "Jatuh Tempo", daysLeft: "Sisa Hari",
    totalRepay: "Total Bayar", depositReturn: "Deposit Kembali",
    youReceive: "Kamu terima", intentDeposit: "Deposit niat",
    totalRepayment: "Total pembayaran", interest: "Bunga",
    awaitingSig: "Menunggu tanda tangan dompet...",
    highest: "Kamu sudah di level tertinggi - Mitra.",
  },
};

import { ModeSelect } from "./mode-select";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { fetchUserScore, fetchActiveLoan, createLoan, repayLoan } from "../lib/solana";
import { checkEligibility } from "../lib/eligibility";
import { TIERS, APR_BRACKETS, RPC_URL } from "../lib/constants";

interface UserScore {
  score: number; tier: number; repaymentCount: number; onTimeCount: number;
  cumulativeVolume?: number;
  loanCount?: number; repaidCount?: number; defaultCount?: number;
}
interface LoanAccount {
  borrower?: string; amount: number; intentDeposit: number;
  dueDate: Date | number; repaid: boolean; active?: boolean;
}
interface EligibilityResult {
  eligible: boolean; maxAmount?: number; limit?: number; reason?: string;
  signals?: { layer1?: boolean; layer2?: boolean; layer3?: boolean; layer3Count?: number };
  details?: { layer1: boolean; layer2: boolean; layer3: boolean; walletAge?: number; txDays?: number; hasStablecoin?: boolean; };
}

function MinjameLogo({ size = 52 }: { size?: number }) {
  const r = Math.round(size * 0.22);
  return (
    <div style={{
      width: size, height: size,
      background: "linear-gradient(140deg, #6025c0 0%, #9d4ee8 100%)",
      borderRadius: r,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 32px rgba(124,58,237,0.35), 0 8px 24px rgba(0,0,0,0.4)",
      flexShrink: 0,
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 56 56" fill="none">
        <path d="M10 34 L16 20 L28 30 L40 20 L46 34" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <ellipse cx="28" cy="13" rx="3.5" ry="5" fill="white" opacity="0.95"/>
        <path d="M8 40 Q8 36 16 36 Q22 36 28 36 Q34 36 40 36 Q48 36 48 40 Q48 46 40 49 Q34 51 28 51 Q22 51 16 49 Q8 46 8 40Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M14 49 Q14 54 28 55 Q42 54 42 49" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    </div>
  );
}

function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ background: "#050816", color: "#f0eef8", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
        @keyframes scrollfade { 0%,100%{opacity:0;transform:translateY(-8px)} 50%{opacity:1;transform:translateY(0)} }
      `}</style>

      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 48px", height:80, background: scrolled ? "rgba(5,8,22,0.95)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none", transition:"all 0.3s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/logo.png" alt="MINJAME" style={{ width:56, height:56, objectFit:"contain", mixBlendMode:"screen", display:"block" }} />
          <img src="/wordmark.png" alt="MINJAME" style={{ height:36, objectFit:"contain", mixBlendMode:"screen", display:"block" }} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:32 }}>
          {(["how","tiers"] as const).map(id => (
            <span key={id} onClick={() => scrollTo(id)} style={{ color:"#8B8FA8", fontSize:14, cursor:"pointer" }}>
              {id === "how" ? "How it works" : "Tiers"}
            </span>
          ))}
          <a href="https://github.com/Graziqt6/minjame" target="_blank" rel="noreferrer" style={{ color:"#8B8FA8", fontSize:14, textDecoration:"none" }}>GitHub</a>
          <button onClick={onEnter} style={{ background:"#6C35E8", color:"#fff", border:"none", padding:"10px 22px", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>Open App</button>
        </div>
      </nav>

      <section style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"100px 24px 0px", paddingBottom:"15vh", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-10%", left:"50%", transform:"translateX(-50%)", width:700, height:700, background:"radial-gradient(circle, rgba(108,53,232,0.13) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(108,53,232,0.12)", border:"1px solid rgba(108,53,232,0.3)", borderRadius:100, padding:"6px 16px", fontSize:13, color:"#8B5CF6", marginBottom:40, fontWeight:500 }}>
          <span style={{ width:6, height:6, background:"#8B5CF6", borderRadius:"50%", display:"inline-block", animation:"blink 2s infinite" }} />
          Solana Devnet
        </div>

        <h1 style={{ fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:"clamp(32px,3.8vw,56px)", lineHeight:1.1, letterSpacing:"-0.03em", marginBottom:28, maxWidth:720 }}>
          Your First Loan <span style={{ color:"#8B5CF6" }}>Starts Here.</span>
        </h1>
        <p style={{ fontSize:18, color:"#8B8FA8", maxWidth:500, lineHeight:1.7, marginBottom:52, fontWeight:300 }}>
          Banks won't give it to you. Your wallet already earned it.
        </p>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
          <button onClick={onEnter} style={{ background:"#6C35E8", color:"#fff", border:"none", padding:"16px 36px", borderRadius:10, fontSize:15, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>Start Borrowing</button>
          <button onClick={() => scrollTo("how")} style={{ background:"transparent", color:"#8B8FA8", border:"1px solid rgba(255,255,255,0.1)", padding:"16px 36px", borderRadius:10, fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>See how it works</button>
        </div>
        <p style={{ fontSize:13, color:"#555A72" }}>Solana Devnet · No real funds at risk</p>
        <div style={{ marginTop:60, display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer", opacity:0.8 }} onClick={() => scrollTo("stats")}>
          <span style={{ fontSize:11, color:"#8B5CF6", letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>Scroll</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation:"scrollfade 1.5s ease-in-out infinite" }}>
            <path d="M12 5v14M5 12l7 7 7-7" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      <div id="stats" style={{ borderTop:"1px solid rgba(255,255,255,0.07)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"32px 48px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:"#0E1225" }}>
        {[{num:"$10",label:"Starting loan, no collateral"},{num:"6–15%",label:"APR from loan size"},{num:"14 days",label:"Loan term, pay and repeat"},{num:"$2",label:"Intent deposit — fully refunded"}].map((s,i,arr) => (
          <div key={s.num} style={{ textAlign:"center", padding:"0 24px", borderRight: i < arr.length-1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:700, color:"#8B5CF6", display:"block" }}>{s.num}</span>
            <div style={{ fontSize:13, color:"#8B8FA8", marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <section style={{ padding:"100px 48px", background:"#0E1225", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6C35E8", marginBottom:16 }}>The Reality</div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(24px,3vw,38px)", fontWeight:700, lineHeight:1.2, letterSpacing:"-0.02em" }}>
              60 million Indonesians have no formal credit. <span style={{ color:"#8B5CF6" }}>Not because they are broke</span> — because they are invisible to the system.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
            {[
              { icon:"📱", title:"You already have a wallet", body:"Crypto-active Indonesians hold stablecoins, transact onchain — but still cannot borrow against their own history." },
              { icon:"⚠️", title:"Pinjol is the only option", body:"Predatory lenders charge 0.4% per day. You borrow once, you are trapped. There is no path to better terms, ever." },
              { icon:"🏦", title:"Banks do not see you", body:"No credit history, no collateral, no account — you do not exist to them. MINJAME reads your wallet instead." },
            ].map(p => (
              <div key={p.title} style={{ display:"flex", gap:16 }}>
                <div style={{ width:40, height:40, flexShrink:0, background:"#181D35", border:"1px solid rgba(108,53,232,0.3)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{p.icon}</div>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:600, marginBottom:4 }}>{p.title}</div>
                  <p style={{ fontSize:14, color:"#8B8FA8", lineHeight:1.6, fontWeight:300 }}>{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{ padding:"100px 48px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ fontSize:12, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6C35E8", marginBottom:16 }}>The Process</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,4vw,48px)", fontWeight:700, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:20 }}>Five steps to your first loan</h2>
          <p style={{ fontSize:17, color:"#8B8FA8", lineHeight:1.75, maxWidth:560, fontWeight:300, marginBottom:60 }}>No KYC. No paperwork. Your wallet history is your application.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", position:"relative" }}>
            <div style={{ position:"absolute", top:36, left:"10%", right:"10%", height:1, background:"linear-gradient(to right, transparent, rgba(108,53,232,0.4), transparent)" }} />
            {[
              {n:"1",title:"Connect Phantom",body:"Link your Solana wallet. That is your identity here."},
              {n:"2",title:"Eligibility check",body:"3-layer wallet analysis runs automatically. No forms."},
              {n:"3",title:"Pay $2 deposit",body:"Refundable intent deposit. Honest borrowers get it back."},
              {n:"4",title:"Borrow $10",body:"USDC lands in your wallet. 14-day term, repay in full."},
              {n:"5",title:"Repay on time",body:"Your score rises. Next loan has better terms."},
            ].map(s => (
              <div key={s.n} style={{ textAlign:"center", padding:"0 12px" }}>
                <div style={{ width:72, height:72, margin:"0 auto 20px", background:"#111528", border:"1px solid rgba(108,53,232,0.4)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#8B5CF6", position:"relative", zIndex:1 }}>{s.n}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:600, marginBottom:8 }}>{s.title}</div>
                <p style={{ fontSize:12, color:"#8B8FA8", lineHeight:1.6, fontWeight:300 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding:"100px 48px", background:"#0E1225", borderTop:"1px solid rgba(255,255,255,0.07)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ fontSize:12, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6C35E8", marginBottom:16 }}>Why MINJAME</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,4vw,48px)", fontWeight:700, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:60 }}>Built different, by design</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 }}>
            {[
              {icon:"🧠",title:"No-KYC eligibility",body:"Three layers of wallet behavior analysis replace all paperwork. Wallet age, tx spread, stablecoin activity — that is your application."},
              {icon:"📈",title:"Score that is yours",body:"Your credit score lives in a public Solana account. It belongs to your wallet — not MINJAME. Any protocol can read it, forever."},
              {icon:"⚡",title:"Solana makes it viable",body:"Fees below $0.01 make micro-loans real. A $5 loan on Ethereum costs more in gas than the loan itself."},
              {icon:"🔒",title:"The $2 commitment",body:"The intent deposit is not a fee — it is a signal. It makes zero-collateral lending defensible without punishing honest borrowers."},
              {icon:"🚀",title:"Better terms every time",body:"Repay on time, your tier rises, your limit grows. APR is always determined by how much you borrow — not who you are."},
              {icon:"🌐",title:"Infrastructure, not an app",body:"MINJAME could shut down tomorrow and your credit score still exists on Solana. You own your reputation."},
            ].map(a => (
              <div key={a.title} style={{ background:"#111528", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:32 }}>
                <span style={{ fontSize:28, marginBottom:20, display:"block" }}>{a.icon}</span>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, marginBottom:10 }}>{a.title}</div>
                <p style={{ fontSize:14, color:"#8B8FA8", lineHeight:1.7, fontWeight:300 }}>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tiers" style={{ padding:"100px 48px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ fontSize:12, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6C35E8", marginBottom:16 }}>Tier System</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,4vw,48px)", fontWeight:700, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:16 }}>The better you behave,<br />the more you can borrow</h2>
          <p style={{ fontSize:17, color:"#8B8FA8", lineHeight:1.75, maxWidth:560, fontWeight:300, marginBottom:60 }}>Every loan repaid on time moves you up. Five tiers, each unlocks higher borrowing capacity.</p>
          <table style={{ width:"100%", borderCollapse:"collapse", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" }}>
            <thead>
              <tr style={{ background:"#111528" }}>
                {["Tier","Name","Limit"].map(h => (
                  <th key={h} style={{ padding:"16px 24px", textAlign:"left", fontSize:12, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"#555A72", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {tier:"0",name:"Baru",limit:"$10",badge:"Start here"},
                {tier:"1",name:"Terpercaya",limit:"$25",badge:null},
                {tier:"2",name:"Andalan",limit:"$50",badge:null},
                {tier:"3",name:"Mitra",limit:"$100",badge:null},
                {tier:"4",name:"Utama",limit:"$250",badge:null},
              ].map((row,i,arr) => (
                <tr key={row.tier}>
                  <td style={{ padding:"20px 24px", fontSize:15, borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700 }}>{row.tier}</span>
                    {row.badge && <span style={{ marginLeft:8, padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:600, background:"rgba(139,92,246,0.2)", color:"#A78BFA", border:"1px solid rgba(139,92,246,0.4)", display:"inline-block" }}>{row.badge}</span>}
                  </td>
                  <td style={{ padding:"20px 24px", fontSize:15, borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>{row.name}</td>
                         <td style={{ padding:"20px 24px", fontSize:15, borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>{row.limit}</td>
                       </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ padding:"100px 48px", background:"#0E1225", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6C35E8", marginBottom:16 }}>The Intent Deposit</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,3vw,44px)", fontWeight:700, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:20 }}>Why $2 makes all the difference</h2>
            <p style={{ fontSize:16, color:"#8B8FA8", lineHeight:1.75, marginBottom:16, fontWeight:300 }}>The deposit is not a fee. It is a commitment device. It makes lending without collateral economically viable.</p>
            <p style={{ fontSize:16, color:"#8B8FA8", lineHeight:1.75, fontWeight:300 }}>Default and you lose $2. Your wallet is flagged. Repay and it comes back in full.</p>
          </div>
          <div style={{ background:"#111528", border:"1px solid rgba(108,53,232,0.3)", borderRadius:20, padding:40 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:64, fontWeight:800, color:"#8B5CF6", lineHeight:1, marginBottom:4 }}>$2</div>
            <div style={{ fontSize:14, color:"#8B8FA8", marginBottom:28, fontWeight:300 }}>USDC intent deposit</div>
            {[
              {label:"Purpose",value:"Commitment signal",good:false,bad:false},
              {label:"If you repay",value:"Returned in full ✓",good:true,bad:false},
              {label:"If you default",value:"Forfeited + flagged",good:false,bad:true},
              {label:"Requires KYC",value:"No ✓",good:true,bad:false},
            ].map((row,i,arr) => (
              <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.07)" : "none", fontSize:14 }}>
                <span style={{ color:"#8B8FA8" }}>{row.label}</span>
                <span style={{ fontWeight:500, color: row.good ? "#34D399" : row.bad ? "#F87171" : "#f0eef8" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding:"120px 48px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:600, background:"radial-gradient(circle, rgba(108,53,232,0.09) 0%, transparent 70%)", pointerEvents:"none" }} />
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(32px,5vw,60px)", fontWeight:800, lineHeight:1.05, letterSpacing:"-0.03em", marginBottom:20 }}>
          Ready to build<br /><span style={{ color:"#8B5CF6" }}>your credit?</span>
        </h2>
        <p style={{ fontSize:17, color:"#8B8FA8", marginBottom:48, fontWeight:300 }}>Connect your Phantom wallet and get your first loan in under two minutes.</p>
        <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:24, userSelect:"none", justifyContent:"center" }}>
          <div onClick={() => setAgreed(!agreed)} style={{ width:18, height:18, borderRadius:4, border: agreed ? "none" : "1px solid #3a3d48", background: agreed ? "#7B2FE0" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor:"pointer", transition:"all 0.15s" }}>
            {agreed && <svg width="10" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{ fontSize:"0.85rem", color:"#9ca3af" }}>I understand this is a Solana Devnet demo</span>
        </label>
        <button onClick={onEnter} disabled={!agreed} style={{ background: agreed ? "#6C35E8" : "#1c1e24", color: agreed ? "#fff" : "#4b5563", border:"none", padding:"16px 48px", borderRadius:10, fontSize:16, fontWeight:500, cursor: agreed ? "pointer" : "not-allowed", fontFamily:"inherit", display:"block", margin:"0 auto" }}>
          Open the App →
        </button>
        <p style={{ marginTop:16, fontSize:13, color:"#555A72" }}>Solana Devnet · No real funds</p>
      </section>

      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.07)", padding:"32px 48px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0E1225" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/logo.png" alt="MINJAME" style={{ width:28, height:28, objectFit:"contain" }} />
          <span style={{ fontSize:14, fontWeight:600, color:"#8B8FA8" }}>MINJAME</span>
        </div>
        <p style={{ fontSize:13, color:"#555A72" }}>Built on Solana</p>
        <div style={{ display:"flex", gap:24 }}>
          <a href="https://github.com/Graziqt6/minjame" target="_blank" rel="noreferrer" style={{ fontSize:13, color:"#8B8FA8", textDecoration:"none" }}>GitHub</a>
          <a href="https://explorer.solana.com/address/86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4?cluster=devnet" target="_blank" rel="noreferrer" style={{ fontSize:13, color:"#8B8FA8", textDecoration:"none" }}>Explorer</a>
        </div>
      </footer>
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
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B2FE0" />
            <stop offset="100%" stopColor="#9d4ee8" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e2027" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="url(#scoreGrad)" strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white leading-none">{score}</span>
        <span className="text-[0.65rem] text-[#6b7280] mt-0.5 tracking-wider uppercase">Score</span>
      </div>
    </div>
  );
}

const TIER_COLORS: Record<number, { dot: string; text: string }> = {
  0: { dot: "bg-[#6b7280]", text: "text-[#9ca3af]" },
  1: { dot: "bg-[#3b82f6]", text: "text-[#93c5fd]" },
  2: { dot: "bg-[#9B3FE0]", text: "text-[#d8b4fe]" },
  3: { dot: "bg-[#22c55e]", text: "text-[#86efac]" },
};

export default function Home() {
  const { publicKey, connected, ...walletRest } = useWallet();
  const wallet = { publicKey, connected, ...walletRest };

  const [showSplash, setShowSplash]       = useState(true);
  const [bypassElig, setBypassElig]       = useState(false);
  const [userScore, setUserScore]         = useState<UserScore | null>(null);
  const [loanAccount, setLoanAccount]     = useState<LoanAccount | null>(null);
  const [eligibility, setEligibility]     = useState<EligibilityResult | null>(null);
  const [amount, setAmount]               = useState(10);
  const [loading, setLoading]             = useState(false);
  const [status, setStatus]               = useState<string | null>(null);
  const [repaidSuccess, setRepaidSuccess] = useState<{ txSig: string } | null>(null);
  const [borrowSuccess, setBorrowSuccess] = useState<{ txSig: string; amount: number } | null>(null);
  const [txError, setTxError]             = useState<string | null>(null);
  const [loadingData, setLoadingData]     = useState(false);
  const [showIdInfo, setShowIdInfo]       = useState(false);
  const [now, setNow]                     = useState(Date.now());
  const [prevScore, setPrevScore]         = useState<number | null>(null);
  const [lang, setLang] = useState<"en" | "id">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("minjame_lang") as "en" | "id") || "en";
    return "en";
  });
  const t = T[lang];
  const [mode, setMode] = useState<"simulation" | "devnet">("simulation");

  const currentTier   = userScore ? TIERS[userScore.tier] : null;
  const maxAmount     = mode === 'simulation' ? (TIERS[userScore?.tier ?? 0]?.limit ?? 10) : (eligibility?.maxAmount ?? currentTier?.limit ?? 10);
  const getAPR = (amt: number) => APR_BRACKETS.find(b => amt <= b.max)?.rate ?? APR_BRACKETS[APR_BRACKETS.length - 1].rate;
  const interestRate = getAPR(amount);
  const interest      = parseFloat(((amount * interestRate / 100 * 14) / 365).toFixed(2));
  const totalRepay    = (amount + interest).toFixed(2);
  const intentDeposit = 2;
  const dueDate       = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) { setUserScore(null); setLoanAccount(null); setEligibility(null); setBypassElig(false); return; }
    if (mode === "simulation") {
      setLoanAccount(null);
      const runElig = async () => {
        try {
          const elig = await checkEligibility(publicKey.toString());
          setEligibility(elig);
          if (elig.eligible || bypassElig) {
            setUserScore({ score: bypassElig && !elig.eligible ? 50 : 100, tier: 0, repaymentCount: 0, onTimeCount: 0, cumulativeVolume: 0 });
          } else {
            setUserScore(null);
          }
        } catch {
          setEligibility({ eligible: false, reason: "Could not read wallet history." });
          setUserScore(null);
        }
      };
      runElig();
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
        setUserScore(score); setLoanAccount(loan); setEligibility(elig);
      } catch (e) { console.error(e); }
      finally { setLoadingData(false); }
    };
    load();
  }, [connected, publicKey]);

  const handleBorrow = async () => {
    setLoading(true); setTxError(null);
    if (mode === "simulation") {
      await new Promise(r => setTimeout(r, 800));
      const mockDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      setLoanAccount({ amount, intentDeposit: 2, dueDate: mockDue, repaid: false });
      setBorrowSuccess({ txSig: "simulation", amount });
      setLoading(false); return;
    }
    if (!publicKey) { setLoading(false); return; }
    setStatus(t.awaitingSig);
    try {
      const txSig = await createLoan(wallet, amount);
      setBorrowSuccess({ txSig, amount }); setStatus(null);
      const [score, loan] = await Promise.all([fetchUserScore(publicKey, wallet), fetchActiveLoan(publicKey, wallet)]);
      setUserScore(score); setLoanAccount(loan);
    } catch (e: unknown) { setTxError(e instanceof Error ? e.message : "Transaction failed"); setStatus(null); }
    finally { setLoading(false); }
  };

  const handleRepay = async () => {
    if (!loanAccount) return;
    setLoading(true); setTxError(null);
    if (mode === "simulation") {
      await new Promise(r => setTimeout(r, 800));
      const oldScore = userScore?.score ?? 120;
      setPrevScore(oldScore);
      const repaidAmount = loanAccount?.amount ?? 0;
      const currentTierForCalc = userScore?.tier ?? 0;
      const minLoan = [5, 10, 25, 50][currentTierForCalc] ?? 5;
      const countsTowardTier = repaidAmount >= minLoan;
      const newOnTime = (userScore?.onTimeCount ?? 0) + (countsTowardTier ? 1 : 0);
      const newVolume = (userScore?.cumulativeVolume ?? 0) + (countsTowardTier ? repaidAmount : 0);
      const newRepayCount = (userScore?.repaymentCount ?? 0) + 1;
      const scoreGain = countsTowardTier ? 30 : 10;
      const thresholds: [number, number][] = [[2,15],[3,50],[5,150],[7,400]];
      let newTier = currentTierForCalc;
      if (currentTierForCalc < 4) {
        const [needRepay, needVol] = thresholds[currentTierForCalc];
        if (newOnTime >= needRepay && newVolume >= needVol) newTier = currentTierForCalc + 1;
      }
      setUserScore({ score: oldScore + scoreGain, tier: newTier, repaymentCount: newRepayCount, onTimeCount: newOnTime, cumulativeVolume: newVolume });
      setLoanAccount(null); setRepaidSuccess({ txSig: "simulation" });
      setLoading(false); return;
    }
    if (!publicKey) { setLoading(false); return; }
    setStatus(t.awaitingSig);
    try {
      const scoreBeforeRepay = userScore?.score ?? null;
      const txSig = await repayLoan(wallet);
      setPrevScore(scoreBeforeRepay); setRepaidSuccess({ txSig }); setStatus(null);
      const [score, loan] = await Promise.all([fetchUserScore(publicKey, wallet), fetchActiveLoan(publicKey, wallet)]);
      setUserScore(score); setLoanAccount(loan);
    } catch (e: unknown) { setTxError(e instanceof Error ? e.message : "Transaction failed"); setStatus(null); }
    finally { setLoading(false); }
  };

  if (showSplash) return <SplashScreen onEnter={() => setShowSplash(false)} />;





  return (
    <div style={{ minHeight:"100vh", background:"#050816", color:"#f0eef8", fontFamily:"'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>

      {/* MODALS */}
      {repaidSuccess && (
        <div style={{ position:"fixed", inset:0, background:"rgba(5,8,22,0.9)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"#0E1225", border:"1px solid rgba(34,197,94,0.2)", borderRadius:24, padding:48, maxWidth:400, width:"100%", textAlign:"center" }}>
            <div style={{ width:56, height:56, background:"rgba(34,197,94,0.1)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:"#22c55e", marginBottom:8 }}>Repaid!</h2>
            <p style={{ fontSize:14, color:"#8B8FA8", marginBottom:16 }}>You unlocked higher borrowing power</p>
            {prevScore !== null && userScore && userScore.score > prevScore && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:10, padding:"8px 16px", marginBottom:16 }}>
                <span style={{ fontSize:13, color:"#6b7280" }}>{prevScore}</span>
                <span style={{ fontSize:12, color:"#4b5563" }}>→</span>
                <span style={{ fontSize:16, fontWeight:700, color:"#22c55e" }}>{userScore.score}</span>
                <span style={{ fontSize:12, color:"#22c55e", fontWeight:600 }}>+{userScore.score - prevScore}</span>
              </div>
            )}
            <p style={{ fontSize:13, color:"#6b7280", marginBottom:24 }}>$2 deposit returned to your wallet.</p>
            <a href={`https://explorer.solana.com/tx/${repaidSuccess.txSig}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ fontSize:13, color:"#8B5CF6", display:"block", marginBottom:16 }}>View on Solana Explorer</a>
            <button onClick={() => setRepaidSuccess(null)} style={{ width:"100%", height:44, borderRadius:12, background:"#1c1e24", color:"#9ca3af", border:"none", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Back to Dashboard</button>
          </div>
        </div>
      )}
      {borrowSuccess && (
        <div style={{ position:"fixed", inset:0, background:"rgba(5,8,22,0.9)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"#0E1225", border:"1px solid rgba(108,53,232,0.3)", borderRadius:24, padding:48, maxWidth:400, width:"100%", textAlign:"center" }}>
            <div style={{ width:56, height:56, background:"rgba(108,53,232,0.1)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:"#f0eef8", marginBottom:8 }}>${borrowSuccess.amount} USDC Sent</h2>
            <p style={{ fontSize:14, color:"#8B8FA8", marginBottom:24 }}>Funds are on their way to your wallet.</p>
            <a href={`https://explorer.solana.com/tx/${borrowSuccess.txSig}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ fontSize:13, color:"#8B5CF6", display:"block", marginBottom:16 }}>View on Solana Explorer</a>
            <button onClick={() => setBorrowSuccess(null)} style={{ width:"100%", height:44, borderRadius:12, background:"#1c1e24", color:"#9ca3af", border:"none", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Back to Dashboard</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={{ height:72, borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 48px", background:"rgba(5,8,22,0.95)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
          onClick={() => { setShowSplash(true); setMode("simulation"); setUserScore(null); setLoanAccount(null); setEligibility(null); }}>
          <img src="/logo.png" alt="MINJAME" style={{ width:44, height:44, objectFit:"contain", mixBlendMode:"screen" }} />
          <img src="/wordmark.png" alt="MINJAME" style={{ height:28, objectFit:"contain", mixBlendMode:"screen" }} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", background:"#0E1225", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:4, gap:4 }}>
            {(["simulation","devnet"] as const).map(m => (
              <button key={m} onClick={() => { if (m === "devnet") return; setMode(m); }}
                style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:500, border:"none", fontFamily:"inherit", transition:"all 0.2s",
                  cursor: m === "devnet" ? "not-allowed" : "pointer",
                  opacity: m === "devnet" ? 0.35 : 1,
                  background: mode === m ? (m === "simulation" ? "rgba(245,158,11,0.15)" : "#6C35E8") : "transparent",
                  color: mode === m ? (m === "simulation" ? "#f59e0b" : "#fff") : "#555A72" }}>
                {m === "simulation" ? "Simulation" : "Devnet (soon)"}
              </button>
            ))}
          </div>
          <div style={{ position:"relative" }}>
            <button onClick={() => setShowIdInfo(!showIdInfo)}
              style={{ height:36, padding:"0 14px", borderRadius:8, background:"#0E1225", border:"1px solid rgba(255,255,255,0.07)", color:"#8B8FA8", fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
              {lang === "en" ? "EN" : "ID"}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5"/></svg>
            </button>
            {showIdInfo && (
              <div style={{ position:"absolute", top:44, right:0, zIndex:50, background:"#0E1225", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden", width:120, boxShadow:"0 20px 40px rgba(0,0,0,0.4)" }}>
                {["en","id"].map(l => (
                  <button key={l} onClick={() => { setLang(l as "en"|"id"); localStorage.setItem("minjame_lang", l); setShowIdInfo(false); }}
                    style={{ width:"100%", textAlign:"left", padding:"10px 16px", fontSize:13, cursor:"pointer", border:"none", fontFamily:"inherit", background: lang === l ? "rgba(255,255,255,0.06)" : "transparent", color: lang === l ? "#f0eef8" : "#8B8FA8" }}>
                    {l === "en" ? "English" : "Indonesia"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <WalletMultiButton style={{ height:"36px", padding:"0 18px", fontSize:"0.8rem", fontWeight:600, borderRadius:"10px", background:"#6C35E8", border:"none" }} />
        </div>
      </header>

      <div style={{ padding:"8px 48px", background: mode === "simulation" ? "rgba(245,158,11,0.06)" : "rgba(108,53,232,0.06)", borderBottom:"1px solid " + (mode === "simulation" ? "rgba(245,158,11,0.15)" : "rgba(108,53,232,0.15)"), display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background: mode === "simulation" ? "#f59e0b" : "#8B5CF6", display:"inline-block" }} />
        <span style={{ fontSize:12, color: mode === "simulation" ? "#f59e0b" : "#8B5CF6" }}>
          {mode === "simulation" ? "Simulation Mode — no real transactions" : "Devnet Mode — real on-chain transactions"}
        </span>
      </div>

      <main style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>

          {/* NOT CONNECTED */}
          {!connected && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center", gap:24 }}>
              <div style={{ fontSize:40 }}>👋</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:700, color:"#f0eef8" }}>Connect your wallet to start</h2>
              <p style={{ fontSize:15, color:"#8B8FA8", maxWidth:380, lineHeight:1.7 }}>Simulation mode will check your real wallet history — then let you borrow without any real funds.</p>
              <WalletMultiButton style={{ height:"44px", padding:"0 28px", fontSize:"0.9rem", fontWeight:600, borderRadius:"12px", background:"#6C35E8", border:"none" }} />
              <p style={{ fontSize:12, color:"#555A72" }}>No real funds at risk · Solana Devnet</p>
            </div>
          )}

          {/* CONNECTED BUT NOT ELIGIBLE */}
          {connected && eligibility && !eligibility.eligible && !bypassElig && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center", gap:20 }}>
              <div style={{ fontSize:40 }}>🔍</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:700, color:"#f0eef8" }}>Wallet not eligible yet</h2>
              <p style={{ fontSize:15, color:"#8B8FA8", maxWidth:420, lineHeight:1.7 }}>{eligibility.reason ?? "Your wallet history doesn't meet the minimum criteria yet."}</p>
              <div style={{ background:"#0E1225", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"20px 28px", maxWidth:400, width:"100%", textAlign:"left" }}>
                <p style={{ fontSize:12, color:"#555A72", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Eligibility Check</p>
                {eligibility.signals && (() => {
                  const labels: Record<string, string> = {
                    layer1: "Wallet age & basic activity",
                    layer2: "Transaction behavior & spread",
                    layer3: "Financial intent signals",
                    layer3Count: "Intent signal count",
                  };
                  const desc: Record<string, string> = {
                    layer1: "Wallet must be 21+ days old with activity across 3+ separate days",
                    layer2: "Transactions spread across different hours and multiple addresses",
                    layer3: "At least one: transfer >$3, DeFi interaction, or CEX activity",
                    layer3Count: "Minimum number of intent signals met",
                  };
                  return Object.entries(eligibility.signals).map(([k,v]) => (
                    <div key={k} style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                        <span style={{ color:"#8B8FA8" }}>{labels[k] ?? k}</span>
                        <span style={{ color: v ? "#22c55e" : "#ef4444", fontWeight:600 }}>{v ? "✓ Pass" : "✗ Fail"}</span>
                      </div>
                      <p style={{ fontSize:11, color:"#555A72", marginTop:4 }}>{desc[k]}</p>
                    </div>
                  ));
                })()}
              </div>
              <button onClick={() => setBypassElig(true)}
                style={{ marginTop:8, padding:"12px 28px", borderRadius:12, background:"rgba(108,53,232,0.15)", border:"1px solid rgba(108,53,232,0.3)", color:"#8B5CF6", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                Try Simulation Anyway
              </button>
              <p style={{ fontSize:12, color:"#555A72" }}>Score starts at 50 · Simulation only</p>
            </div>
          )}

          {/* MAIN DASHBOARD - always visible, blurred when not connected */}
          <div style={{ opacity: (!connected || (connected && eligibility && !eligibility.eligible && !bypassElig)) ? 0.25 : 1, pointerEvents: (!connected || (connected && eligibility && !eligibility.eligible && !bypassElig)) ? "none" : "auto", filter: (!connected || (connected && eligibility && !eligibility.eligible && !bypassElig)) ? "blur(2px)" : "none", transition:"all 0.3s" }}>
          {true && loadingData ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"128px 0", color:"#4b5563", fontSize:14, gap:12 }}>
              <div className="w-4 h-4 border-2 border-[#4b5563] border-t-[#7B2FE0] rounded-full animate-spin" />
              Loading your onchain data...
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 420px", gap:20 }}>
              <div className="flex flex-col gap-4">
                <div style={{ background:"#0E1225", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:28 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:20, marginBottom:24 }}>
                    <ScoreRing score={userScore?.score ?? 0} />
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:11, color:"#555A72", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{t.level}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:700, color:"#f0eef8", lineHeight:1 }}>{currentTier?.name ?? "Baru"}</h2>
                        <span style={{ fontSize:10, background:"#181D35", border:"1px solid rgba(255,255,255,0.08)", color:"#8B8FA8", padding:"3px 8px", borderRadius:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>On-Chain</span>
                      </div>
                      <p style={{ fontSize:13, color:"#555A72", lineHeight:1.5 }}>{t.increases}</p>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    {[
                      { lbl: t.limit, val: `$${maxAmount}`, unit: "USDC", color: "#f0eef8" },
                      { lbl: "APR (current)", val: `${interestRate}`, unit: "%", color: "#f0eef8" },
                      { lbl: "Loans repaid", val: `${userScore?.repaymentCount ?? 0}`, unit: "total", color: "#f0eef8" },
                      { lbl: "On-time", val: `${userScore?.onTimeCount ?? 0}`, unit: `/ ${userScore?.repaymentCount ?? 0}`, color: "#22c55e" },
                    ].map((s) => (
                      <div key={s.lbl} style={{ background:"#181D35", borderRadius:14, padding:16 }}>
                        <p style={{ fontSize:10, color:"#8B8FA8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.lbl}</p>
                        <p style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.val}<span style={{ fontSize:12, fontWeight:400, color:"#555A72", marginLeft:4 }}>{s.unit}</span></p>
                      </div>
                    ))}
                  </div>
                  {publicKey && <p style={{ marginTop:16, fontSize:11, color:"#555A72", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{publicKey.toString()}</p>}
                </div>

                <div style={{ background:"#0E1225", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:"20px 24px" }}>
                  <p style={{ fontSize:14, color:"#c4cde0", lineHeight:1.6, marginBottom:6 }}>{t.yourLimit}</p>
                  {userScore && userScore.tier >= 3
                    ? <p style={{ fontSize:13, color:"#22c55e" }}>{t.highest}</p>
                    : <p style={{ fontSize:13, color:"#8B5CF6" }}>{t.repayUnlock}</p>}
                  <div style={{ marginTop:12, fontSize:12, color:"#555A72" }}>· {t.allData}</div>
                </div>

                <div style={{ background:"#0E1225", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:24 }}>
                  <p style={{ fontSize:11, color:"#8B8FA8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>Tier Progression</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {TIERS.map((tier, i) => {
                      const isCurrent = userScore?.tier === i;
                      const isPast = (userScore?.tier ?? 0) > i;
                      return (
                        <div key={tier.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:12, padding:"12px 16px", background: isCurrent ? "#181D35" : "transparent", border: isCurrent ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background: isCurrent ? "#8B5CF6" : isPast ? "#555A72" : "#1e2027", display:"inline-block" }} />
                            <span style={{ fontSize:13, fontWeight:500, color: isCurrent ? "#f0eef8" : isPast ? "#555A72" : "#8B8FA8" }}>{tier.name}</span>
                            {isCurrent && <span style={{ fontSize:10, background:"rgba(34,197,94,0.1)", color:"#22c55e", border:"1px solid rgba(34,197,94,0.2)", padding:"2px 6px", borderRadius:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>current</span>}
                          </div>
                          <span style={{ fontSize:12, color:"#555A72" }}>up to ${tier.limit} USDC</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {loanAccount && !loanAccount.repaid && (
                  <>
                    <div className="bg-[#0d1525] border border-white/[0.06] rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                          <h3 className="text-[0.95rem] font-semibold text-white">{t.activeLoan}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.65rem] bg-[#080d1a] border border-white/[0.06] text-[#6b7280] px-2 py-1 rounded-md uppercase tracking-wider">On-Chain</span>
                          <span className="text-[0.65rem] bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] px-2 py-1 rounded-md uppercase tracking-wider">Active</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-[#1a2235] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#94a3b8] uppercase tracking-widest mb-1.5">Loan Amount</p>
                          <p className="text-2xl font-bold text-white">${loanAccount.amount}<span className="text-[0.7rem] font-normal text-[#6b7280] ml-1">USDC</span></p>
                        </div>
                        <div className="bg-[#1a2235] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#94a3b8] uppercase tracking-widest mb-1.5">Deposit Held</p>
                          <p className="text-2xl font-bold text-[#f59e0b]">${loanAccount.intentDeposit}<span className="text-[0.7rem] font-normal text-[#6b7280] ml-1">USDC</span></p>
                        </div>
                        <div className="bg-[#1a2235] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#94a3b8] uppercase tracking-widest mb-1.5">{t.dueDate}</p>
                          <p className="text-base font-semibold text-white">{new Date(loanAccount.dueDate).toLocaleDateString("en-GB")}</p>
                          {(() => {
                            const msLeft = new Date(loanAccount.dueDate).getTime() - now;
                            const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                            const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const urgent = daysLeft <= 2;
                            if (msLeft <= 0) return <p className="text-[0.7rem] text-red-400 mt-1 font-medium">Overdue</p>;
                            return <p className={`text-[0.7rem] mt-1 font-medium ${urgent ? "text-[#f59e0b]" : "text-[#6b7280]"}`}>{daysLeft}d {hoursLeft}h remaining</p>;
                          })()}
                        </div>
                        <div className="bg-[#1a2235] rounded-xl p-4">
                          <p className="text-[0.65rem] text-[#94a3b8] uppercase tracking-widest mb-1.5">Wallet</p>
                          <p className="text-[0.75rem] font-mono text-[#94a3b8] truncate">{publicKey?.toString().slice(0, 8)}...</p>
                        </div>
                      </div>
                      <a href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[0.75rem] text-[#7B2FE0] hover:text-purple-300 transition-colors mt-1">
                        View on Solana Explorer
                      </a>
                    </div>
                    <div className="bg-[#0d1525] border border-white/[0.06] rounded-2xl p-6">
                      <h3 className="text-[0.95rem] font-semibold text-white mb-5">{t.repayNow}</h3>
                      <div className="space-y-2 mb-5">
                        <div className="flex justify-between items-center py-2.5 border-b border-white/[0.04]">
                          <span className="text-[0.825rem] text-[#94a3b8]">Principal + interest</span>
                          <span className="text-[0.875rem] font-semibold text-white">${(loanAccount.amount + parseFloat(((loanAccount.amount * interestRate / 100 * 14) / 365).toFixed(2))).toFixed(2)} USDC</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-[0.825rem] text-[#94a3b8]">Deposit returned</span>
                          <span className="text-[0.875rem] font-semibold text-[#22c55e]">+${loanAccount.intentDeposit} USDC</span>
                        </div>
                      </div>
                      <p className="text-[0.75rem] text-[#22c55e] mb-5">Repay on time to unlock a higher limit</p>
                      {txError && <div className="bg-red-950/40 border border-red-900/40 rounded-xl px-4 py-3 mb-4"><p className="text-[0.78rem] text-red-400">{txError}</p></div>}
                      {status && <p className="text-[0.78rem] text-[#9ca3af] mb-4 flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-[#9ca3af] border-t-transparent rounded-full animate-spin" />{status}</p>}
                      <button onClick={handleRepay} disabled={loading}
                        className={`w-full h-12 rounded-xl font-semibold text-[0.9rem] transition-all duration-200 ${loading ? "bg-[#1c1e24] text-[#4b5563] cursor-not-allowed" : "bg-[#16a34a] hover:bg-[#15803d] text-white shadow-lg shadow-green-900/25 cursor-pointer"}`}>
                        {loading ? t.processing : "Repay Now"}
                      </button>
                    </div>
                  </>
                )}

                {(!loanAccount || loanAccount.repaid) && (
                  <div className="bg-[#0d1525] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-[1rem] font-bold text-white mb-5">{t.borrowNow}</h3>
                    {eligibility && !eligibility.eligible && (
                      <div className="bg-[#1c1510] border border-[#f59e0b]/20 rounded-xl px-4 py-3.5 mb-5">
                        <p className="text-[0.8rem] text-[#f59e0b] font-medium mb-1">Not eligible yet</p>
                        <p className="text-[0.75rem] text-[#92400e] leading-relaxed">{eligibility.reason}</p>
                        {eligibility.details && (
                          <div className="mt-2.5 space-y-1">
                            {[{ label: "Basic filter", pass: eligibility.details.layer1 }, { label: "Human signal", pass: eligibility.details.layer2 }, { label: "Financial intent", pass: eligibility.details.layer3 }].map((l) => (
                              <div key={l.label} className="flex items-center gap-2 text-[0.72rem]">
                                <span className={l.pass ? "text-[#22c55e]" : "text-[#6b7280]"}>{l.pass ? "✓" : "·"}</span>
                                <span className={l.pass ? "text-[#9ca3af]" : "text-[#4b5563]"}>{l.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[0.7rem] text-[#94a3b8] uppercase tracking-widest">{t.amount}</label>
                      <div className="flex items-center gap-1.5 bg-[#1a2235] border border-white/[0.15] rounded-lg px-3 py-1.5">
                        <span className="text-[0.75rem] text-[#94a3b8]">$</span>
                        <input type="number" min={1} max={maxAmount} value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                          className="w-10 bg-transparent text-[0.875rem] font-semibold text-white text-right outline-none" />
                        <span className="text-[0.72rem] text-[#94a3b8]">USDC</span>
                      </div>
                    </div>
                    <input type="range" min={1} max={maxAmount} value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-[#1c1e24] mb-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7B2FE0] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                      style={{ background: `linear-gradient(to right, #7B2FE0 ${(amount / maxAmount) * 100}%, #1c1e24 ${(amount / maxAmount) * 100}%)` }} />
                    <div className="flex justify-between text-[0.65rem] text-[#6b7280] mb-5"><span>$1</span><span>${maxAmount}</span></div>
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {[Math.min(10, maxAmount), Math.min(25, maxAmount), maxAmount].filter((v, i, arr) => i === 0 || v !== arr[i-1]).map((v, i) => (
                        <button key={i} onClick={() => setAmount(v)}
                          className={`h-9 rounded-lg text-[0.8rem] font-medium transition-all duration-150 ${amount === v ? "bg-[#7B2FE0]/20 border border-[#7B2FE0]/40 text-white" : "bg-[#1a2235] border border-white/[0.15] text-[#94a3b8] hover:text-white hover:border-purple-500/50"}`}>
                          {i === 2 ? "MAX" : `$${v}`}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-0 mb-5 bg-[#1a2235] rounded-xl overflow-hidden">
                      {[
                        { label: "You receive", value: `$${amount.toFixed(2)} USDC`, color: "text-white" },
                        { label: "Intent deposit", value: `$${intentDeposit.toFixed(2)} USDC`, color: "text-[#f59e0b]" },
                        { label: "Total repayment", value: `$${totalRepay} USDC`, color: "text-white" },
                        { label: "Due date", value: `${dueDate.toLocaleDateString("en-GB")} (14 days)`, color: "text-white" },
                        { label: "Interest", value: `$${interest} (${(interestRate).toFixed(0)}% APR)`, color: "text-white" },
                      ].map((row, idx, arr) => (
                        <div key={row.label} className={`flex justify-between items-center px-4 py-3 ${idx < arr.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                          <span className="text-[0.8rem] text-[#94a3b8]">{row.label}</span>
                          <span className={`text-[0.85rem] font-semibold ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[0.7rem] text-[#6b7280] mb-5">* The $2 deposit is not a fee - it is returned when you repay.</p>
                    {txError && <div className="bg-red-950/40 border border-red-900/40 rounded-xl px-4 py-3 mb-4"><p className="text-[0.78rem] text-red-400">{txError}</p></div>}
                    {status && <p className="text-[0.78rem] text-[#9ca3af] mb-4 flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-[#9ca3af] border-t-transparent rounded-full animate-spin" />{status}</p>}
                    <button onClick={handleBorrow} disabled={loading || (eligibility !== null && !eligibility.eligible && !bypassElig)}
                      className={`w-full h-12 rounded-xl font-semibold text-[0.9rem] transition-all duration-200 ${loading || (eligibility !== null && !eligibility.eligible && !bypassElig) ? "bg-[#1c1e24] text-[#4b5563] cursor-not-allowed" : "bg-[#7B2FE0] hover:bg-[#6025c0] text-white shadow-lg shadow-purple-900/25 cursor-pointer"}`}>
                      {loading ? t.processing : `Take Loan - $${amount} USDC`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
      </main>
    </div>
  );
}
