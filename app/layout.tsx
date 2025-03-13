import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import ApiWarmer from '@/components/ApiWarmer';
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "跑团生涯个人喜好表",
  description: "创建你的跑团生涯个人喜好表",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <Analytics />
        <ApiWarmer />
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}

