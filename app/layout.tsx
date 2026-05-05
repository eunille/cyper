import { Geist_Mono, Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  title: 'CyberTutor AI',
  description: 'Learn cybersecurity with AI tutors',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fontMono.variable} font-sans antialiased`}>
      <body className="bg-white text-neutral-900">{children}</body>
    </html>
  )
}
