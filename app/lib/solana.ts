import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { RPC_URL, PROGRAM_ID, USDC_MINT, VAULT_ACCOUNT, VAULT_AUTHORITY } from "./constants";

const PROGRAM_ID_PK = new PublicKey(PROGRAM_ID);
const USDC_MINT_PK = new PublicKey(USDC_MINT);
const VAULT_PK = new PublicKey(VAULT_ACCOUNT);
const VAULT_AUTH_PK = new PublicKey(VAULT_AUTHORITY);

const CREATE_LOAN_DISCRIMINATOR = Buffer.from([166, 131, 118, 219, 138, 218, 206, 140]);
const REPAY_LOAN_DISCRIMINATOR = Buffer.from([224, 93, 144, 77, 61, 17, 137, 54]);

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

function encodeU64(value: number): Buffer {
  const buf = Buffer.alloc(8);
  const big = BigInt(value);
  for (let i = 0; i < 8; i++) {
    buf[i] = Number((big >> BigInt(i * 8)) & BigInt(0xff));
  }
  return buf;
}

export async function fetchUserScore(borrower: PublicKey, wallet: WalletContextState) {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const scorePDA = await getScorePDA(borrower);
    const accountInfo = await connection.getAccountInfo(scorePDA);
    if (!accountInfo) return null;
    const data = accountInfo.data;
    let offset = 8;
    offset += 32;
    const score = data.readUInt32LE(offset); offset += 4;
    const tier = data.readUInt8(offset); offset += 1;
    const repaymentCount = data.readUInt32LE(offset); offset += 4;
    const onTimeCount = data.readUInt32LE(offset); offset += 4;
    return { score, tier, repaymentCount, onTimeCount };
  } catch {
    return null;
  }
}

export async function fetchActiveLoan(borrower: PublicKey, wallet: WalletContextState) {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const loanPDA = await getLoanPDA(borrower);
    const accountInfo = await connection.getAccountInfo(loanPDA);
    if (!accountInfo) return null;
    const data = accountInfo.data;
    let offset = 8;
    offset += 32;
    const amount = Number(data.readBigUInt64LE(offset)) / 1_000_000; offset += 8;
    const intentDeposit = Number(data.readBigUInt64LE(offset)) / 1_000_000; offset += 8;
    offset += 8;
    const dueDateTs = Number(data.readBigInt64LE(offset)); offset += 8;
    const repaid = data.readUInt8(offset) === 1; offset += 1;
    const active = data.readUInt8(offset) === 1;
    if (!active) return null;
    return { amount, intentDeposit, dueDate: new Date(dueDateTs * 1000), repaid, active };
  } catch {
    return null;
  }
}

export async function createLoan(wallet: WalletContextState, amountUsdc: number): Promise<string> {
  const connection = new Connection(RPC_URL, "confirmed");
  const borrower = wallet.publicKey!;
  const amountLamports = amountUsdc * 1_000_000;
  const loanPDA = await getLoanPDA(borrower);
  const scorePDA = await getScorePDA(borrower);
  const userUsdc = await getUserUsdcAccount(borrower);
  const instructions: TransactionInstruction[] = [];
  const userUsdcInfo = await connection.getAccountInfo(userUsdc);
  if (!userUsdcInfo) {
    instructions.push(createAssociatedTokenAccountInstruction(borrower, userUsdc, borrower, USDC_MINT_PK));
  }
  const data = Buffer.concat([CREATE_LOAN_DISCRIMINATOR, encodeU64(amountLamports)]);
  const createLoanIx = new TransactionInstruction({
    programId: PROGRAM_ID_PK,
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: loanPDA, isSigner: false, isWritable: true },
      { pubkey: scorePDA, isSigner: false, isWritable: true },
      { pubkey: userUsdc, isSigner: false, isWritable: true },
      { pubkey: VAULT_PK, isSigner: false, isWritable: true },
      { pubkey: VAULT_AUTH_PK, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  instructions.push(createLoanIx);
  const tx = new Transaction().add(...instructions);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = borrower;
  const signed = await wallet.signTransaction!(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function repayLoan(wallet: WalletContextState): Promise<string> {
  const connection = new Connection(RPC_URL, "confirmed");
  const borrower = wallet.publicKey!;
  const loanPDA = await getLoanPDA(borrower);
  const scorePDA = await getScorePDA(borrower);
  const userUsdc = await getUserUsdcAccount(borrower);
  const repayIx = new TransactionInstruction({
    programId: PROGRAM_ID_PK,
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: loanPDA, isSigner: false, isWritable: true },
      { pubkey: scorePDA, isSigner: false, isWritable: true },
      { pubkey: userUsdc, isSigner: false, isWritable: true },
      { pubkey: VAULT_PK, isSigner: false, isWritable: true },
      { pubkey: VAULT_AUTH_PK, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: REPAY_LOAN_DISCRIMINATOR,
  });
  const tx = new Transaction().add(repayIx);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = borrower;
  const signed = await wallet.signTransaction!(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}
