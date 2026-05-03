import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletProviderWrapper } from "./wallet-provider";

export const metadata: Metadata = {
  title: "MINJAME",
  description: "Pinjaman pertama tanpa jaminan. Bangun kredit onchain di Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-950 text-white">
        <WalletProviderWrapper>
          {children}
        </WalletProviderWrapper>
      </body>
    </html>
  );
}
