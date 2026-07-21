import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { getOptionalAppSession } from "@/lib/auth/session";

const tajawal = Tajawal({
  weight: ["400", "500", "700"],
  subsets: ["arabic"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "زمبلك للأبحاث الميدانية",
  description: "Zamblak Field Research Platform",
  icons: { icon: "/brand/zamblak-mark.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getOptionalAppSession();

  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <a className="skipLink" href="#main-content">تخطي إلى المحتوى الرئيسي</a>
        <Header
          role={session?.profile.role ?? null}
          displayName={session?.profile.name ?? null}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
