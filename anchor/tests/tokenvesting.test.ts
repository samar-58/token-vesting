import { LiteSVM, FailedTransactionMetadata } from "litesvm";
import { Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as BN from "bn.js";
import * as path from "path";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("BK8PFTkAGSWj41nndYVfpQY4rnWU5j6FFXX6tHkZUMEH");

function sendTx(svm: LiteSVM, tx: Transaction, signers: Keypair[]) {
  tx.recentBlockhash = svm.latestBlockhash();
  tx.feePayer = signers[0].publicKey;
  tx.sign(...signers);
  return svm.sendTransaction(tx);
}

function createMint(svm: LiteSVM, payer: Keypair, decimals: number = 6): Keypair {
  const mint = Keypair.generate();
  const rentExempt = 82;
  const lamports = svm.minimumBalanceForRentExemption(BigInt(rentExempt));

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: Number(lamports),
      space: rentExempt,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint.publicKey, decimals, payer.publicKey, null)
  );

  sendTx(svm, tx, [payer, mint]);
  return mint;
}

function createAndFundAta(
  svm: LiteSVM,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey,
  amount: bigint
): PublicKey {
  const ata = getAssociatedTokenAddressSync(mint, owner);

  const createAtaIx = createAssociatedTokenAccountInstruction(payer.publicKey, ata, owner, mint);
  const mintToIx = createMintToInstruction(mint, ata, payer.publicKey, amount);

  const tx = new Transaction().add(createAtaIx, mintToIx);
  sendTx(svm, tx, [payer]);

  return ata;
}

function encodeU64(num: BN): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(num.toString()));
  return buf;
}

/**
 * Parse SPL Token account data to extract balance
 * Token account layout: 32 bytes mint + 32 bytes owner + 8 bytes amount
 */
function getTokenBalance(svm: LiteSVM, tokenAccount: PublicKey): bigint {
  const account = svm.getAccount(tokenAccount);
  if (!account) {
    return BigInt(0);
  }
  const data = Buffer.from(account.data);
  return data.readBigUInt64LE(64);
}
describe("sol-swap", () => {
  let svm: LiteSVM;
  let payer: Keypair;

  beforeAll(() => {
    const programPath = path.join(__dirname, "../target/deploy/token.so");
    const programBytes = fs.readFileSync(programPath);

    svm = new LiteSVM()
      .withSysvars()
      .withBuiltins()
      .withSigverify(false)
      .withDefaultPrograms();

    svm.addProgram(PROGRAM_ID, programBytes);

    payer = Keypair.generate();

    svm.airdrop(payer.publicKey, BigInt(10_000_000_000));
  });

  test("initialize vesting account", async () => {
    const mint = createMint(svm, payer);
    const treasuryAta = createAndFundAta(svm, payer, mint.publicKey, payer.publicKey, BigInt(1_000_000));

    const companyName = "Test Company";
    const vestingAccount = Keypair.generate();

    const initializeVestingIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: vestingAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: mint.publicKey, isSigner: false, isWritable: false },
        { pubkey: treasuryAta, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([0]), // Instruction discriminator for initialize_vesting_account
        encodeU64(new BN(companyName.length)),
        Buffer.from(companyName, "utf-8"),
      ]),
    });

    const tx = new Transaction().add(initializeVestingIx);
    await sendTx(svm, tx, [payer, vestingAccount]);

    const vestingAccData = svm.getAccount(vestingAccount.publicKey);
    console.log("Vesting Account Data:", vestingAccData);
    expect(vestingAccData).toBeDefined();
  });
});