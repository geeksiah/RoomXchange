import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-plus-jakarta"
});

export const metadata = {
  title: "RoomXchange",
  description: "A premium peer-to-peer property marketplace with web-only subscription checkout."
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body style={{ fontFamily: "var(--font-plus-jakarta)" }}>{children}</body>
    </html>
  );
}
