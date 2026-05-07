import { Connection, PublicKey } from "@solana/web3.js";
import { RPC_URL } from "./constants";

export interface EligibilityResult {
  eligible: boolean;
  limit: 5 | 10;
  reason?: string;
  signals: {
    layer1: boolean;
    layer2: boolean;
    layer3: boolean;
    layer3Count: number;
  };
}

export async function checkEligibility(walletAddress: string): Promise<EligibilityResult> {
  const connection = new Connection(RPC_URL, "confirmed");
  const pubkey = new PublicKey(walletAddress);

  try {
    // LAYER 1 — Basic Filter
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 100 });
    
    if (signatures.length === 0) {
      return { eligible: false, limit: 5, reason: "This wallet has never been used.", signals: { layer1: false, layer2: false, layer3: false, layer3Count: 0 } };
    }

    // Wallet age check (21 days)
    const firstTx = signatures[signatures.length - 1];
    const walletAgeMs = Date.now() - (firstTx.blockTime! * 1000);
    const walletAgeDays = walletAgeMs / (1000 * 60 * 60 * 24);
    
    if (walletAgeDays < 21) {
      const daysLeft = Math.ceil(21 - walletAgeDays);
      return { eligible: false, limit: 5, reason: `Wallet is only ${Math.floor(walletAgeDays)} days old. Try again in ${daysLeft} days.`, signals: { layer1: false, layer2: false, layer3: false, layer3Count: 0 } };
    }

    // Transactions on 3+ separate days
    const txDays = new Set(
      signatures
        .filter(s => s.blockTime)
        .map(s => new Date(s.blockTime! * 1000).toDateString())
    );
    
    if (txDays.size < 3) {
      return { eligible: false, limit: 5, reason: "Wallet activity is too limited. Use your wallet more first.", signals: { layer1: false, layer2: false, layer3: false, layer3Count: 0 } };
    }

    const layer1 = true;

    // LAYER 2 — Human Signal Check
    // Time spread: transactions at varied hours
    const txHours = signatures
      .filter(s => s.blockTime)
      .map(s => new Date(s.blockTime! * 1000).getHours());
    const uniqueHours = new Set(txHours);
    const timeSpread = uniqueHours.size >= 4;

    // Outbound diversity: sent to 2+ different addresses
    const recentSigs = signatures.slice(0, 20).map(s => s.signature);
    let uniqueRecipients = new Set<string>();
    
    for (const sig of recentSigs.slice(0, 5)) {
      try {
        const tx = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (tx?.transaction?.message) {
          const accounts = tx.transaction.message.staticAccountKeys || [];
          accounts.forEach(a => uniqueRecipients.add(a.toString()));
        }
      } catch {}
    }
    const outboundDiversity = uniqueRecipients.size >= 3;
    const layer2 = timeSpread || outboundDiversity;

    // LAYER 3 — Financial Intent Signal
    let layer3Count = 0;

    // Signal A: any tx above $3 equivalent — check SOL balance history
    const balance = await connection.getBalance(pubkey);
    if (balance > 3_000_000) layer3Count++;

    // Signal B: held balance > $5 for 3+ days (approximate via current balance)
    if (balance > 5_000_000) layer3Count++;

    // Signal C: has interacted with known programs (Jupiter, Raydium = real DeFi usage)
    const knownPrograms = [
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium
    ];
    const hasKnownProgram = signatures.slice(0, 20).some(s => 
      knownPrograms.some(p => s.memo?.includes(p))
    );
    if (hasKnownProgram) layer3Count++;

    // Signal D: wallet age > 60 days (strong signal)
    if (walletAgeDays > 60) layer3Count++;

    const layer3 = layer3Count >= 1;

    // Determine result
    if (!layer2 && !layer3) {
      return { eligible: true, limit: 5, signals: { layer1, layer2, layer3, layer3Count } };
    }

    return { eligible: true, limit: 10, signals: { layer1, layer2, layer3, layer3Count } };

  } catch (error) {
    console.error("Eligibility check error:", error);
    return { eligible: false, limit: 5, reason: "Failed to read wallet. Try again.", signals: { layer1: false, layer2: false, layer3: false, layer3Count: 0 } };
  }
}
