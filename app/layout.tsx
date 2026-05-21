import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const thai = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-thai", display: "swap" });

export const metadata: Metadata = {
  title: "SportShop — ระบบจัดการร้านเสื้อกีฬา",
  description: "ระบบจัดการออเดอร์ ลูกค้า โรงงาน และไฟล์งานสำหรับร้านรับผลิตเสื้อกีฬาพิมพ์ลาย",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${thai.variable} dark`}>
      <body className="font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
