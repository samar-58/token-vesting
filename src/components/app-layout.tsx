import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import { AppHeader } from '@/components/app-header'
import React, { Suspense } from 'react'
import { AppFooter } from '@/components/app-footer'
import { ClusterChecker } from '@/components/cluster/cluster-ui'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4">
          <ClusterChecker>
            <Suspense fallback={<div className="flex justify-center py-8">Loading...</div>}>
              {children}
            </Suspense>
          </ClusterChecker>
        </main>
        <AppFooter />
      </div>
      <Toaster />
    </ThemeProvider>
  )
}
