// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import TokenIDL from '../target/idl/token.json'
import type { Token } from '../target/types/token'

// Re-export the generated IDL and type
export { Token, TokenIDL }

// The programId is imported from the program IDL.
export const TOKEN_PROGRAM_ID = new PublicKey(TokenIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getTokenProgram(provider: AnchorProvider, address?: PublicKey): Program<Token> {
  return new Program({ ...TokenIDL, address: address ? address.toBase58() : TokenIDL.address } as Token, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getTokenProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('GdMXVH2h4ajyy3nce6NPraBofmx673oWoZCwF76kw4DP')
    case 'mainnet-beta':
    default:
      return TOKEN_PROGRAM_ID
  }
}
