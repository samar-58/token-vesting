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
  company_name: string,
  mint: string
}

interface InitializeEmployeeArgs {
  start_time: BN;
  end_time: BN;
  total_amount: BN;
  cliff_time: BN;
  beneficiary: string;

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

  // Fetch all employee accounts to check beneficiary status
  const allEmployeeAccounts = useQuery({
    queryKey: ['employee_accounts', 'all', { cluster }],
    queryFn: () => program.account.employeeAccount.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initializeVestingAccount = useMutation<string, Error, InitializeVestingArgs>({
    mutationKey: ['vesting_account', 'initialize_vesting', { cluster }],
    mutationFn: ({ company_name, mint }) =>
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
    allEmployeeAccounts,
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

  // Fetch all employee accounts for this vesting account
  const employeeAccounts = useQuery({
    queryKey: ['employee_accounts', 'all', { cluster, vestingAccount: account.toString() }],
    queryFn: async () => {
      const allEmployees = await program.account.employeeAccount.all()
      // Filter employees that belong to this vesting account
      return allEmployees.filter(
        (emp) => emp.account.vestingAccount.toString() === account.toString()
      )
    },
  })

  const initializeEmployeeAccount = useMutation<string, Error, InitializeEmployeeArgs>({
    mutationKey: ['employeeAccount', 'create', { cluster }],
    mutationFn: ({ start_time, end_time, cliff_time, total_amount, beneficiary }) =>
      program.methods
        .initializeEmployeeAccount(start_time, end_time, total_amount, cliff_time)
        .accounts({
          beneficiary: new PublicKey(beneficiary),
          vestingAccount: account,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await accounts.refetch()
      await employeeAccounts.refetch()
    },
    onError: (error) => {
      console.error('Failed to initialize employee account:', error)
      toast.error(`Failed to initialize employee account: ${error.message}`)
    },
  })

  const claimTokens = useMutation<string, Error, { companyName: string }>({
    mutationKey: ['employeeAccount', 'claim', { cluster }],
    mutationFn: async ({ companyName }) => {
      const vestingData = await program.account.vestingAccount.fetch(account)
      return program.methods
        .claimTokens(companyName)
        .accountsPartial({
          vestingAccount: account,
          mint: vestingData.mint,
          treasuryTokenAccount: vestingData.treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await employeeAccounts.refetch()
      toast.success('Tokens claimed successfully!')
    },
    onError: (error) => {
      console.error('Failed to claim tokens:', error)
      toast.error(`Failed to claim tokens: ${error.message}`)
    },
  })

  return {
    accountQuery,
    employeeAccounts,
    initializeEmployeeAccount,
    claimTokens,
  }
}
