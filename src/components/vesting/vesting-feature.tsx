import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/solana/solana-provider'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { ellipsify } from '@/lib/utils'
import { useVestingProgram } from './vesting-data-access'
import { VestingCreate, VestingList } from './vesting-ui'
import { SolanaLogo } from '@/components/solana-logo'

export default function VestingFeature() {
  const { publicKey } = useWallet()
  const { programId } = useVestingProgram()

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-2xl font-bold mb-3 text-center solana-gradient-text">
          Built on Solana
        </h2>
        <p className="text-muted-foreground text-center mb-8 max-w-md">
          Create and manage token vesting schedules for your team.
          Secure, transparent, and on-chain.
        </p>

        <WalletButton />

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="text-2xl font-bold solana-gradient-text">400ms</div>
            <div className="text-sm text-muted-foreground">Block time</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold solana-gradient-text">$0.00025</div>
            <div className="text-sm text-muted-foreground">Avg tx fee</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold solana-gradient-text">65k+</div>
            <div className="text-sm text-muted-foreground">TPS capacity</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 space-y-8">
      {/* Program Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SolanaLogo className="w-4 h-4" />
          <span>Program:</span>
          <ExplorerLink
            path={`account/${programId}`}
            label={ellipsify(programId.toString())}
          />
        </div>
      </div>

      {/* Create Form */}
      <VestingCreate />

      {/* Accounts List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Vesting Accounts</h2>
        <VestingList />
      </div>
    </div>
  )
}
