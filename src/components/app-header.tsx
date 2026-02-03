import { ThemeSelect } from '@/components/theme-select'
import { WalletButton } from '@/components/solana/solana-provider'
import { SolanaLogo } from '@/components/solana-logo'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <SolanaLogo className="w-5 h-5" />
          <span className="text-lg font-semibold">TokenVesting</span>
        </div>
        <div className="flex items-center gap-2">
          <WalletButton />
          <ThemeSelect />
        </div>
      </div>
    </header>
  )
}
