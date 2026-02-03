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
  const { accountQuery, initializeEmployeeAccount } = useVestingProgramAccount({
    account,
  })
  const [startTme, setStartTime] = useState(new BN(0));
  const [endTime, setEndTime] = useState(new BN(0));
  const [total_amount, setTotalAmount] = useState(new BN(0));
  const [cliffTime, setCliffTime] = useState(new BN(0));
  const [beneficiary, setBeneficiary] = useState("")

  const companyName = useMemo(() => accountQuery.data?.companyName ?? "", [accountQuery.data?.companyName]);

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
        <div className="flex gap-4">
          <input
            type="text"
            placeholder='start time'
            value={Number(startTme) || ''}
            onChange={e => setStartTime(new BN(e.target.value))}
            className='input input-bordered w-full max-w-xs'
          />
          <input
            type="text"
            placeholder='end time'
            value={Number(endTime) || ''}
            onChange={e => setEndTime(new BN(e.target.value))}
            className='input input-bordered w-full max-w-xs'
          />
          <input
            type="text"
            placeholder='total allocation'
            value={Number(total_amount) || ''}
            onChange={e => setTotalAmount(new BN(e.target.value))}
            className='input input-bordered w-full max-w-xs'
          />
          <input
            type="text"
            placeholder='cliff time'
            value={Number(cliffTime) || ''}
            onChange={e => setCliffTime(new BN(e.target.value))}
            className='input input-bordered w-full max-w-xs'
          />
          <input
            type="text"
            placeholder='beneficiary address'
            value={beneficiary}
            onChange={e => setBeneficiary(e.target.value)}
            className='input input-bordered w-full max-w-xs'
          />
        </div>
        <div className="mt-4 flex gap-2">

          <Button
            variant="outline"
            onClick={() => initializeEmployeeAccount.mutateAsync({
              start_time: startTme,
              end_time: endTime,
              cliff_time: cliffTime,
              total_amount: total_amount,
              beneficiary: beneficiary
            })}
            disabled={initializeEmployeeAccount.isPending}
          >
            Create Employee Account
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
