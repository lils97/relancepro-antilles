import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'RelancePro Antilles',
  description: 'CRM intelligent pour commerciaux aux Antilles',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 antialiased">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
