import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import ThemeProvider from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "MÜLKERA — Sizin eranız, sizin mülkünüz.",
  description:
    "MÜLKERA — Azərbaycanda əmlak almaq, satmaq və kirayə vermək üçün etibarlı platforma.",
  icons: { icon: "/images/favicon.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="az" suppressHydrationWarning>
      <body className="bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 antialiased">
        <ThemeProvider>
          <AppProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}