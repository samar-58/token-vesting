import { getTokenProgram, getTokenProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/use-anchor-provider'
import { useTransactionToast } from '@/components/use-transaction-toast'
import { toast } from 'sonner'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import BN from 'bn.js'

interface InitializeVestingArgs {
  company_name : string,
  mint: string
}

interface InitializeEmployeeArgs {
  start_time : BN;
  end_time : BN;
  total_amount : BN;
  cliff_time : BN;
  beneficiary : string;

}

export function useVestingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getTokenProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getTokenProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['vesting_account', 'all', { cluster }],
    queryFn: () => program.account.vestingAccount.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initializeVestingAccount = useMutation<string, Error, InitializeVestingArgs>({
    mutationKey: ['vesting_account', 'initialize_vesting', { cluster }],
    mutationFn: ({company_name, mint}) =>
    program.methods.initializeVestingAccount(company_name)
    .accounts({
      mint: new PublicKey(mint),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc(),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await accounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize vesting account')
    },
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initializeVestingAccount,
  }
}

export function useVestingProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useVestingProgram()

  const accountQuery = useQuery({
    queryKey: ['vesting', 'fetch', { cluster, account }],
    queryFn: () => program.account.vestingAccount.fetch(account),
  })

const initializeEmployeeAccount = useMutation<string, Error, InitializeEmployeeArgs>({
    mutationKey: ['employeeAccount', 'create', { cluster }],
    mutationFn: ({start_time, end_time, cliff_time, total_amount, beneficiary}) =>
    program.methods
    .initializeEmployeeAccount(start_time, end_time, cliff_time, total_amount)
    .accounts({
      beneficiary: new PublicKey(beneficiary),
      vestingAccount: account,
    })
    .rpc(),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await accounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize vesting account')
    },
  })

  return {
    accountQuery,
    initializeEmployeeAccount,
  }
}
