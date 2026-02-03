import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { lazy } from 'react'

const VestingFeature = lazy(() => import('@/components/vesting/vesting-feature'))

export function App() {
  return (
    <AppProviders>
      <AppLayout>
        <VestingFeature />
      </AppLayout>
    </AppProviders>
  )
}
