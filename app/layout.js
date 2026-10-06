import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import ThemeProvider from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import ActivityTracker from "@/components/ActivityTracker";

export const metadata = {
  title: "MÜLKERA — Sizin eranız, sizin mülkünüz.",
  description:
    "MÜLKERA — Azərbaycanda əmlak almaq, satmaq və kirayə vermək üçün etibarlı platforma.",
  icons: { icon: "/images/favicon.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="az" suppressHydrationWarning>
      <body className="bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 antialiased overflow-x-hidden min-h-screen flex flex-col">
        <ThemeProvider>
          <AppProvider>
            <ActivityTracker />
            <div className="flex min-h-screen flex-col pb-16 sm:pb-0">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <MobileBottomNav />
            </div>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}