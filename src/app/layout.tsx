import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from "@/components/auth/provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema Pré-Escola",
  description: "Sistema de gerenciamento de pré-escola",
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <NextAuthProvider>
          {children}
          <Toaster />
        </NextAuthProvider>
      </body>
    </html>
  );
}
