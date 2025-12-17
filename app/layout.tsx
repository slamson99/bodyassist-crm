import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header, BottomNav } from "@/components/layout/Navigation";
import { cn } from "@/lib/utils";
import { UserProvider } from "@/app/contexts/UserContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "bg-slate-50 min-h-screen pb-16 md:pb-0")}>
        <UserProvider>
          <Header />
          <main className="container mx-auto p-4 md:p-6">
            {children}
          </main>
          <BottomNav />
        </UserProvider>
      </body>
    </html>
  );
}
