import { useMemo, useState } from 'react'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ellipsify } from '@/lib/utils'
import { useVestingProgram, useVestingProgramAccount } from './vesting-data-access'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from 'bn.js'
import { Plus, Users, Clock, Coins, ChevronUp, Wallet } from 'lucide-react'

export function VestingCreate() {
  const { initializeVestingAccount } = useVestingProgram()
  const [companyName, setCompanyName] = useState("")
  const [mintAddress, setMintAddress] = useState("")
  const { publicKey } = useWallet()

  const isFormValid = companyName.length > 0 && mintAddress.length > 0

  function handleSubmit() {
    if (isFormValid && publicKey) {
      initializeVestingAccount.mutateAsync({ company_name: companyName, mint: mintAddress })
      setCompanyName("")
      setMintAddress("")
    }
  }

  if (!publicKey) {
    return null
  }

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="w-5 h-5" />
          Create Vesting Account
        </CardTitle>
        <CardDescription>
          Set up a new token vesting schedule for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              placeholder="e.g. Acme Corp"
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mintAddress">Token Mint Address</Label>
            <Input
              id="mintAddress"
              value={mintAddress}
              placeholder="Token mint public key"
              onChange={e => setMintAddress(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={initializeVestingAccount.isPending || !isFormValid}
          className="mt-4 w-full sm:w-auto"
        >
          {initializeVestingAccount.isPending ? (
            <>Creating...</>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Vesting Account
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export function VestingList() {
  const { accounts, getProgramAccount } = useVestingProgram()

  if (getProgramAccount.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading program...</span>
        </div>
      </div>
    )
  }

  if (!getProgramAccount.data?.value) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <p className="text-destructive font-medium">Program account not found</p>
          <p className="text-muted-foreground text-sm mt-1">
            Make sure you have deployed the program and are on the correct cluster.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (accounts.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading accounts...</span>
        </div>
      </div>
    )
  }

  if (!accounts.data?.length) {
    return (
      <Card className="border-muted">
        <CardContent className="py-12 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-1">No vesting accounts</h3>
          <p className="text-muted-foreground text-sm">
            Create your first vesting account to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {accounts.data.map((account) => (
        <VestingCard key={account.publicKey.toString()} account={account.publicKey} />
      ))}
    </div>
  )
}

function VestingCard({ account }: { account: PublicKey }) {
  const { accountQuery, employeeAccounts, initializeEmployeeAccount, claimTokens } = useVestingProgramAccount({
    account,
  })
  const { publicKey } = useWallet()
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [cliffTime, setCliffTime] = useState("")
  const [beneficiary, setBeneficiary] = useState("")

  const companyName = useMemo(() => accountQuery.data?.companyName ?? "", [accountQuery.data?.companyName])

  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return 'Not set'
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const calculateProgress = (employee: {
    startTime: { toNumber: () => number };
    endTime: { toNumber: () => number };
  }) => {
    const now = Math.floor(Date.now() / 1000)
    const start = employee.startTime.toNumber()
    const end = employee.endTime.toNumber()
    if (now < start) return 0
    if (now >= end) return 100
    return Math.floor(((now - start) / (end - start)) * 100)
  }

  const calculateClaimable = (employee: {
    startTime: { toNumber: () => number };
    endTime: { toNumber: () => number };
    cliffTime: { toNumber: () => number };
    totalAllocated: { toNumber: () => number };
    totalClaimed: { toNumber: () => number };
  }) => {
    const now = Math.floor(Date.now() / 1000)
    const startTimeVal = employee.startTime.toNumber()
    const endTimeVal = employee.endTime.toNumber()
    const cliffTimeVal = employee.cliffTime.toNumber()
    const alloc = employee.totalAllocated.toNumber()
    const claimed = employee.totalClaimed.toNumber()

    if (now < cliffTimeVal) return 0
    const elapsed = now - startTimeVal
    const total = endTimeVal - startTimeVal
    const vested = now >= endTimeVal ? alloc : Math.floor((alloc * elapsed) / total)
    return Math.max(0, vested - claimed)
  }

  const handleCreateEmployee = () => {
    if (beneficiary) {
      initializeEmployeeAccount.mutateAsync({
        start_time: new BN(startTime || "0"),
        end_time: new BN(endTime || "0"),
        cliff_time: new BN(cliffTime || "0"),
        total_amount: new BN(totalAmount || "0"),
        beneficiary: beneficiary
      })
      setStartTime("")
      setEndTime("")
      setTotalAmount("")
      setCliffTime("")
      setBeneficiary("")
      setShowAddEmployee(false)
    }
  }

  if (accountQuery.isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{companyName}</CardTitle>
            <CardDescription className="mt-1 font-mono text-xs">
              <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            {employeeAccounts.data?.length ?? 0}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Add Employee Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddEmployee(!showAddEmployee)}
          className="w-full mb-4"
        >
          {showAddEmployee ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Hide Form
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </>
          )}
        </Button>

        {/* Add Employee Form */}
        {showAddEmployee && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Beneficiary Address</Label>
                <Input
                  placeholder="Wallet address"
                  value={beneficiary}
                  onChange={e => setBeneficiary(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Allocation</Label>
                <Input
                  placeholder="Token amount"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value.replace(/\D/g, ''))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time (Unix)</Label>
                <Input
                  placeholder="e.g. 1704067200"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value.replace(/\D/g, ''))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time (Unix)</Label>
                <Input
                  placeholder="e.g. 1735689600"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value.replace(/\D/g, ''))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Cliff Time (Unix)</Label>
                <Input
                  placeholder="e.g. 1711929600"
                  value={cliffTime}
                  onChange={e => setCliffTime(e.target.value.replace(/\D/g, ''))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleCreateEmployee}
              disabled={initializeEmployeeAccount.isPending || !beneficiary}
              className="w-full"
            >
              {initializeEmployeeAccount.isPending ? 'Creating...' : 'Create Employee'}
            </Button>
          </div>
        )}

        {/* Employee List */}
        {employeeAccounts.isLoading ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            Loading employees...
          </div>
        ) : employeeAccounts.data?.length ? (
          <div className="space-y-3">
            {employeeAccounts.data.map((emp) => {
              const isCurrentUser = publicKey?.toString() === emp.account.beneficiary.toString()
              const claimable = calculateClaimable(emp.account)
              const progress = calculateProgress(emp.account)
              const now = Math.floor(Date.now() / 1000)
              const cliffReached = now >= emp.account.cliffTime.toNumber()
              const allocated = emp.account.totalAllocated.toNumber()
              const claimed = emp.account.totalClaimed.toNumber()

              return (
                <div
                  key={emp.publicKey.toString()}
                  className={`rounded-lg border p-4 transition-all ${isCurrentUser ? 'border-primary/50 bg-primary/5' : 'bg-card'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cliffReached ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="font-mono text-sm">
                        <ExplorerLink
                          path={`account/${emp.account.beneficiary}`}
                          label={ellipsify(emp.account.beneficiary.toString())}
                        />
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-muted-foreground text-xs mb-0.5">Allocated</div>
                      <div className="font-semibold">{allocated.toLocaleString()}</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-muted-foreground text-xs mb-0.5">Claimed</div>
                      <div className="font-semibold">{claimed.toLocaleString()}</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-muted-foreground text-xs mb-0.5">Claimable</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">{claimable.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(emp.account.startTime.toNumber())}</span>
                    <span className="flex-1 border-t border-dashed" />
                    <span>{formatTimestamp(emp.account.endTime.toNumber())}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-3">
                    <div
                      className="absolute inset-y-0 left-0 solana-progress rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Claim Button */}
                  {isCurrentUser && (
                    <Button
                      size="sm"
                      onClick={() => claimTokens.mutateAsync({ companyName })}
                      disabled={claimTokens.isPending || claimable === 0 || !cliffReached}
                      className="w-full"
                      variant={claimable > 0 && cliffReached ? "default" : "secondary"}
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      {claimTokens.isPending ? 'Claiming...' :
                        !cliffReached ? `Cliff: ${formatTimestamp(emp.account.cliffTime.toNumber())}` :
                          claimable === 0 ? 'Nothing to claim' :
                            `Claim ${claimable.toLocaleString()} tokens`}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No employees added yet
          </div>
        )}
      </CardContent>
    </Card>
  )
}
