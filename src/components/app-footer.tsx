import { Github } from 'lucide-react'
import { SolanaLogo } from '@/components/solana-logo'

export function AppFooter() {
  return (
    <footer className="border-t border-border/50 py-6">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <SolanaLogo className="w-4 h-4" />
          <span>Token Vesting on Solana</span>
        </div>
        <a
          className="flex items-center gap-2 hover:text-foreground transition-colors"
          href="https://github.com/samar-58/token-vesting"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github className="w-4 h-4" />
          <span>View on GitHub</span>
        </a>
      </div>
    </footer>
  )
}
