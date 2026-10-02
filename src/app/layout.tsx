import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const plexArabic = IBM_Plex_Sans_Arabic({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-app",
  display: "swap",
});

export const metadata: Metadata = {
  title: "متجر الواحة | أجهزة أصلية، أزياء، وعطور فاخرة",
  description:
    "متجر الواحة — وجهتك الأولى للتسوق الإلكتروني: إلكترونيات أصلية بضمان، أزياء مختارة، عطور فاخرة وكل ما يحتاجه منزلك. شحن سريع لكل المحافظات ودفع عند الاستلام.",
  keywords: ["متجر إلكتروني", "تسوق", "إلكترونيات", "عطور", "أزياء", "متجر الواحة"],
  authors: [{ name: "متجر الواحة" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A2B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={plexArabic.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}
