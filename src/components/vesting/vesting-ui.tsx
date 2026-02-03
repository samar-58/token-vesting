import { useMemo, useState } from 'react'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ellipsify } from '@/lib/utils'
import { useVestingProgram, useVestingProgramAccount } from './vesting-data-access'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from 'bn.js'

export function VestingCreate() {
  const { initializeVestingAccount } = useVestingProgram()
  const [companyName, setCompanyName] = useState("")
  const [mintAddress, setMintAddress] = useState("")
  const { publicKey } = useWallet()

  const isFormValid = companyName.length > 0 && mintAddress.length > 0

  function handleSubmit() {
    if (isFormValid && publicKey) {
      initializeVestingAccount.mutateAsync({ company_name: companyName, mint: mintAddress })
    }
    else {
      console.log("Form is invalid or wallet not connected")
    }
  }

  if (!publicKey) {
    return <p>Connect your wallet</p>
  }

  return (
    <>
      <input type="text"
        value={companyName}
        placeholder="Company Name"
        onChange={e => setCompanyName(e.target.value)}
        className='input input-bordered w-full max-w-xs'
      />
      <input type="text"
        value={mintAddress}
        placeholder="Mint Address"
        onChange={e => setMintAddress(e.target.value)}
        className='input input-bordered w-full max-w-xs'
      />

      <Button onClick={handleSubmit} disabled={initializeVestingAccount.isPending || !isFormValid}>
        Create New Vesting Account {initializeVestingAccount.isPending && '...'}
      </Button>
    </>
  )
}

export function VestingList() {
  const { accounts, getProgramAccount } = useVestingProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <VestingCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  )
}

function VestingCard({ account }: { account: PublicKey }) {
  const { accountQuery, employeeAccounts, initializeEmployeeAccount, claimTokens } = useVestingProgramAccount({
    account,
  })
  const { publicKey } = useWallet()
  const [startTme, setStartTime] = useState(new BN(0));
  const [endTime, setEndTime] = useState(new BN(0));
  const [total_amount, setTotalAmount] = useState(new BN(0));
  const [cliffTime, setCliffTime] = useState(new BN(0));
  const [beneficiary, setBeneficiary] = useState("")

  const companyName = useMemo(() => accountQuery.data?.companyName ?? "", [accountQuery.data?.companyName]);

  // Format timestamp to readable date
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate claimable amount based on vesting schedule
  const calculateClaimable = (employee: {
    startTime: { toNumber: () => number };
    endTime: { toNumber: () => number };
    cliffTime: { toNumber: () => number };
    totalAllocated: { toNumber: () => number };
    totalClaimed: { toNumber: () => number };
  }) => {
    const now = Math.floor(Date.now() / 1000)
    const startTime = employee.startTime.toNumber()
    const endTimeVal = employee.endTime.toNumber()
    const cliffTimeVal = employee.cliffTime.toNumber()
    const totalAllocated = employee.totalAllocated.toNumber()
    const totalClaimed = employee.totalClaimed.toNumber()

    if (now < cliffTimeVal) return 0

    const timeSinceStart = now - startTime
    const totalDuration = endTimeVal - startTime

    const vestedAmount = now >= endTimeVal
      ? totalAllocated
      : Math.floor((totalAllocated * timeSinceStart) / totalDuration)

    return Math.max(0, vestedAmount - totalClaimed)
  }

  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>Company Name: {companyName}</CardTitle>
        <CardDescription>
          Account: <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Create Employee Form */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Add Employee</h3>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder='start time (unix)'
              value={Number(startTme) || ''}
              onChange={e => setStartTime(e.target.value && /^\d+$/.test(e.target.value) ? new BN(e.target.value) : new BN(0))}
              className='input input-bordered w-full max-w-xs input-sm'
            />
            <input
              type="text"
              placeholder='end time (unix)'
              value={Number(endTime) || ''}
              onChange={e => setEndTime(e.target.value && /^\d+$/.test(e.target.value) ? new BN(e.target.value) : new BN(0))}
              className='input input-bordered w-full max-w-xs input-sm'
            />
            <input
              type="text"
              placeholder='total allocation'
              value={Number(total_amount) || ''}
              onChange={e => setTotalAmount(e.target.value && /^\d+$/.test(e.target.value) ? new BN(e.target.value) : new BN(0))}
              className='input input-bordered w-full max-w-xs input-sm'
            />
            <input
              type="text"
              placeholder='cliff time (unix)'
              value={Number(cliffTime) || ''}
              onChange={e => setCliffTime(e.target.value && /^\d+$/.test(e.target.value) ? new BN(e.target.value) : new BN(0))}
              className='input input-bordered w-full max-w-xs input-sm'
            />
            <input
              type="text"
              placeholder='beneficiary address'
              value={beneficiary}
              onChange={e => setBeneficiary(e.target.value)}
              className='input input-bordered w-full max-w-xs input-sm'
            />
          </div>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => initializeEmployeeAccount.mutateAsync({
                start_time: startTme,
                end_time: endTime,
                cliff_time: cliffTime,
                total_amount: total_amount,
                beneficiary: beneficiary
              })}
              disabled={initializeEmployeeAccount.isPending || !beneficiary}
            >
              Create Employee Account {initializeEmployeeAccount.isPending && '...'}
            </Button>
          </div>
        </div>

        {/* Employee List */}
        <div>
          <h3 className="font-semibold mb-2">Employees ({employeeAccounts.data?.length ?? 0})</h3>
          {employeeAccounts.isLoading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : employeeAccounts.data?.length ? (
            <div className="space-y-3">
              {employeeAccounts.data.map((emp) => {
                const isCurrentUser = publicKey?.toString() === emp.account.beneficiary.toString()
                const claimable = calculateClaimable(emp.account)
                const now = Math.floor(Date.now() / 1000)
                const cliffReached = now >= emp.account.cliffTime.toNumber()
                const progress = Math.min(100, Math.floor(
                  ((now - emp.account.startTime.toNumber()) /
                    (emp.account.endTime.toNumber() - emp.account.startTime.toNumber())) * 100
                ))

                return (
                  <div key={emp.publicKey.toString()} className="border rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">Beneficiary: </span>
                        <ExplorerLink
                          path={`account/${emp.account.beneficiary}`}
                          label={ellipsify(emp.account.beneficiary.toString())}
                        />
                        {isCurrentUser && <span className="ml-2 badge badge-primary badge-sm">You</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div><span className="opacity-70">Allocated:</span> {emp.account.totalAllocated.toNumber()}</div>
                      <div><span className="opacity-70">Claimed:</span> {emp.account.totalClaimed.toNumber()}</div>
                      <div><span className="opacity-70">Start:</span> {formatTimestamp(emp.account.startTime.toNumber())}</div>
                      <div><span className="opacity-70">End:</span> {formatTimestamp(emp.account.endTime.toNumber())}</div>
                      <div><span className="opacity-70">Cliff:</span> {formatTimestamp(emp.account.cliffTime.toNumber())}</div>
                      <div><span className="opacity-70">Claimable:</span> {claimable}</div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                      ></div>
                    </div>
                    {isCurrentUser && (
                      <Button
                        size="sm"
                        onClick={() => claimTokens.mutateAsync({ companyName })}
                        disabled={claimTokens.isPending || claimable === 0 || !cliffReached}
                      >
                        {claimTokens.isPending ? 'Claiming...' :
                          !cliffReached ? 'Cliff not reached' :
                            claimable === 0 ? 'Nothing to claim' :
                              `Claim ${claimable} tokens`}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm opacity-70">No employees found for this vesting account.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

