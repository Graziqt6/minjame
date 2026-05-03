import { Program, AnchorProvider, web3, BN } from "@project-serum/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { RPC_URL, PROGRAM_ID, USDC_MINT, VAULT_ACCOUNT, VAULT_AUTHORITY } from "./constants";
import idl from "./minjame.json";

const PROGRAM_ID_PK = new PublicKey(PROGRAM_ID);
const USDC_MINT_PK = new PublicKey(USDC_MINT);
const VAULT_PK = new PublicKey(VAULT_ACCOUNT);
const VAULT_AUTH_PK = new PublicKey(VAULT_AUTHORITY);

export function getProgram(wallet: WalletContextState) {
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: "confirmed" }
  );
  return new Program(idl as any, provider);
}

export async function getLoanPDA(borrower: PublicKey): Promise<PublicKey> {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("loan"), borrower.toBuffer()],
    PROGRAM_ID_PK
  );
  return pda;
}

export async function getScorePDA(borrower: PublicKey): Promise<PublicKey> {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("score"), borrower.toBuffer()],
    PROGRAM_ID_PK
  );
  return pda;
}

export async function getUserUsdcAccount(borrower: PublicKey): Promise<PublicKey> {
  return getAssociatedTokenAddress(USDC_MINT_PK, borrower);
}

export async function fetchUserScore(borrower: PublicKey, wallet: WalletContextState) {
  try {
    const program = getProgram(wallet);
    const scorePDA = await getScorePDA(borrower);
    const scoreAccount = await (program.account as any).userScore.fetch(scorePDA);
    return {
      score: scoreAccount.score,
      tier: scoreAccount.tier,
      repaymentCount: scoreAccount.repaymentCount,
      onTimeCount: scoreAccount.onTimeCount,
    };
  } catch {
    return null;
  }
}

export async function fetchActiveLoan(borrower: PublicKey, wallet: WalletContextState) {
  try {
    const program = getProgram(wallet);
    const loanPDA = await getLoanPDA(borrower);
    const loanAccount = await (program.account as any).loanAccount.fetch(loanPDA);
    if (!loanAccount.active) return null;
    return {
      amount: loanAccount.amount.toNumber() / 1_000_000,
      intentDeposit: loanAccount.intentDeposit.toNumber() / 1_000_000,
      dueDate: new Date(loanAccount.dueDate.toNumber() * 1000),
      repaid: loanAccount.repaid,
      active: loanAccount.active,
    };
  } catch {
    return null;
  }
}

export async function createLoan(
  wallet: WalletContextState,
  amountUsdc: number
): Promise<string> {
  const program = getProgram(wallet);
  const borrower = wallet.publicKey!;
  const amount = new BN(amountUsdc * 1_000_000);

  const loanPDA = await getLoanPDA(borrower);
  const scorePDA = await getScorePDA(borrower);
  const userUsdc = await getUserUsdcAccount(borrower);

  const connection = new Connection(RPC_URL, "confirmed");
  const userUsdcInfo = await connection.getAccountInfo(userUsdc);

  const instructions = [];
  if (!userUsdcInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        borrower,
        userUsdc,
        borrower,
        USDC_MINT_PK
      )
    );
  }

  const tx = await (program.methods as any)
    .createLoan(amount)
    .accounts({
      borrower,
      loan: loanPDA,
      userScore: scorePDA,
      userUsdc: userUsdc,
      vault: VAULT_PK,
      vaultAuthority: VAULT_AUTH_PK,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions(instructions)
    .rpc();

  return tx;
}

export async function repayLoan(wallet: WalletContextState): Promise<string> {
  const program = getProgram(wallet);
  const borrower = wallet.publicKey!;

  const loanPDA = await getLoanPDA(borrower);
  const scorePDA = await getScorePDA(borrower);
  const userUsdc = await getUserUsdcAccount(borrower);

  const tx = await (program.methods as any)
    .repayLoan()
    .accounts({
      borrower,
      loan: loanPDA,
      userScore: scorePDA,
      userUsdc: userUsdc,
      vault: VAULT_PK,
      vaultAuthority: VAULT_AUTH_PK,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}
