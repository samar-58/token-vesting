import { LiteSVM, FailedTransactionMetadata, Clock } from "litesvm";
import { Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as path from "path";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("GdMXVH2h4ajyy3nce6NPraBofmx673oWoZCwF76kw4DP");

// Instruction discriminators from IDL
const INITIALIZE_VESTING_DISCRIMINATOR = Buffer.from([157, 31, 230, 112, 207, 32, 192, 202]);
const INITIALIZE_EMPLOYEE_DISCRIMINATOR = Buffer.from([73, 161, 200, 51, 1, 244, 173, 97]);
const CLAIM_TOKENS_DISCRIMINATOR = Buffer.from([108, 216, 210, 231, 0, 212, 42, 64]);

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

function encodeString(str: string): Buffer {
  const strBytes = Buffer.from(str, "utf-8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBytes.length);
  return Buffer.concat([lenBuf, strBytes]);
}

function encodeI64(num: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(num.toString()));
  return buf;
}

function encodeU64(num: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(num.toString()));
  return buf;
}

function getTokenBalance(svm: LiteSVM, tokenAccount: PublicKey): bigint {
  const account = svm.getAccount(tokenAccount);
  if (!account) {
    return BigInt(0);
  }
  const data = Buffer.from(account.data);
  return data.readBigUInt64LE(64);
}

function getVestingAccountPda(companyName: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from(companyName)], PROGRAM_ID);
}

function getTreasuryPda(companyName: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), Buffer.from(companyName)],
    PROGRAM_ID
  );
}

function getEmployeeAccountPda(beneficiary: PublicKey, vestingAccount: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("employee_vesting"), beneficiary.toBuffer(), vestingAccount.toBuffer()],
    PROGRAM_ID
  );
}

function buildInitializeVestingIx(
  signer: PublicKey,
  mint: PublicKey,
  companyName: string
): TransactionInstruction {
  const [vestingAccount] = getVestingAccountPda(companyName);
  const [treasury] = getTreasuryPda(companyName);

  const data = Buffer.concat([INITIALIZE_VESTING_DISCRIMINATOR, encodeString(companyName)]);

  return new TransactionInstruction({
    keys: [
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: vestingAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

function buildInitializeEmployeeIx(
  owner: PublicKey,
  ownerTokenAccount: PublicKey,
  beneficiary: PublicKey,
  vestingAccount: PublicKey,
  treasury: PublicKey,
  mint: PublicKey,
  startTime: bigint,
  endTime: bigint,
  totalAmount: bigint,
  cliffTime: bigint
): TransactionInstruction {
  const [employeeAccount] = getEmployeeAccountPda(beneficiary, vestingAccount);

  const data = Buffer.concat([
    INITIALIZE_EMPLOYEE_DISCRIMINATOR,
    encodeI64(startTime),
    encodeI64(endTime),
    encodeU64(totalAmount),
    encodeI64(cliffTime),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
      { pubkey: employeeAccount, isSigner: false, isWritable: true },
      { pubkey: vestingAccount, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

function buildClaimTokensIx(
  beneficiary: PublicKey,
  vestingAccount: PublicKey,
  mint: PublicKey,
  treasury: PublicKey,
  companyName: string
): TransactionInstruction {
  const [employeeAccount] = getEmployeeAccountPda(beneficiary, vestingAccount);
  const employeeTokenAccount = getAssociatedTokenAddressSync(mint, beneficiary);

  const data = Buffer.concat([CLAIM_TOKENS_DISCRIMINATOR, encodeString(companyName)]);

  return new TransactionInstruction({
    keys: [
      { pubkey: beneficiary, isSigner: true, isWritable: true },
      { pubkey: employeeAccount, isSigner: false, isWritable: true },
      { pubkey: vestingAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: employeeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

interface VestingAccountData {
  owner: PublicKey;
  mint: PublicKey;
  treasuryTokenAccount: PublicKey;
  companyName: string;
  treasuryBump: number;
  bump: number;
}

function parseVestingAccount(svm: LiteSVM, vestingPda: PublicKey): VestingAccountData | null {
  const account = svm.getAccount(vestingPda);
  if (!account) return null;

  const data = Buffer.from(account.data);
  let offset = 8;

  const owner = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const mint = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const treasuryTokenAccount = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const strLen = data.readUInt32LE(offset);
  offset += 4;

  const companyName = data.subarray(offset, offset + strLen).toString("utf-8");
  offset += strLen;

  const treasuryBump = data.readUInt8(offset);
  offset += 1;

  const bump = data.readUInt8(offset);

  return { owner, mint, treasuryTokenAccount, companyName, treasuryBump, bump };
}

interface EmployeeAccountData {
  beneficiary: PublicKey;
  vestingAccount: PublicKey;
  totalAllocated: bigint;
  totalClaimed: bigint;
  startTime: bigint;
  endTime: bigint;
  cliffTime: bigint;
  bump: number;
}

function parseEmployeeAccount(svm: LiteSVM, employeePda: PublicKey): EmployeeAccountData | null {
  const account = svm.getAccount(employeePda);
  if (!account) return null;

  const data = Buffer.from(account.data);
  let offset = 8;

  const beneficiary = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const vestingAccount = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const totalAllocated = data.readBigUInt64LE(offset);
  offset += 8;

  const totalClaimed = data.readBigUInt64LE(offset);
  offset += 8;

  const startTime = data.readBigInt64LE(offset);
  offset += 8;

  const endTime = data.readBigInt64LE(offset);
  offset += 8;

  const cliffTime = data.readBigInt64LE(offset);
  offset += 8;

  const bump = data.readUInt8(offset);

  return { beneficiary, vestingAccount, totalAllocated, totalClaimed, startTime, endTime, cliffTime, bump };
}

describe("token-vesting", () => {
  let svm: LiteSVM;
  let payer: Keypair;
  let mint: Keypair;
  let employee: Keypair;

  const COMPANY_NAME = "TestCompany";
  const TOTAL_ALLOCATION = BigInt(1_000_000_000);
  const DECIMALS = 6;

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
    employee = Keypair.generate();

    svm.airdrop(payer.publicKey, BigInt(10_000_000_000));
    svm.airdrop(employee.publicKey, BigInt(10_000_000_000));
  });

  test("should create mint and fund owner ATA", () => {
    mint = createMint(svm, payer, DECIMALS);
    createAndFundAta(svm, payer, mint.publicKey, payer.publicKey, TOTAL_ALLOCATION * BigInt(10));

    const ownerAta = getAssociatedTokenAddressSync(mint.publicKey, payer.publicKey);
    const balance = getTokenBalance(svm, ownerAta);
    expect(balance).toBe(TOTAL_ALLOCATION * BigInt(10));
  });

  test("should initialize vesting account", () => {
    const ix = buildInitializeVestingIx(payer.publicKey, mint.publicKey, COMPANY_NAME);
    const tx = new Transaction().add(ix);
    const result = sendTx(svm, tx, [payer]);

    expect(result instanceof FailedTransactionMetadata).toBe(false);

    const [vestingPda] = getVestingAccountPda(COMPANY_NAME);
    const vestingData = parseVestingAccount(svm, vestingPda);

    expect(vestingData).not.toBeNull();
    expect(vestingData!.owner.equals(payer.publicKey)).toBe(true);
    expect(vestingData!.mint.equals(mint.publicKey)).toBe(true);
    expect(vestingData!.companyName).toBe(COMPANY_NAME);

    const [treasury] = getTreasuryPda(COMPANY_NAME);
    expect(vestingData!.treasuryTokenAccount.equals(treasury)).toBe(true);
    expect(svm.getAccount(treasury)).not.toBeNull();
  });

  test("should initialize employee account and fund treasury", () => {
    const [vestingPda] = getVestingAccountPda(COMPANY_NAME);
    const [treasury] = getTreasuryPda(COMPANY_NAME);
    const ownerAta = getAssociatedTokenAddressSync(mint.publicKey, payer.publicKey);

    const ownerBalanceBefore = getTokenBalance(svm, ownerAta);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const startTime = now;
    const cliffTime = now + BigInt(30 * 24 * 60 * 60);
    const endTime = now + BigInt(365 * 24 * 60 * 60);

    const ix = buildInitializeEmployeeIx(
      payer.publicKey,
      ownerAta,
      employee.publicKey,
      vestingPda,
      treasury,
      mint.publicKey,
      startTime,
      endTime,
      TOTAL_ALLOCATION,
      cliffTime
    );

    const tx = new Transaction().add(ix);
    const result = sendTx(svm, tx, [payer]);

    expect(result instanceof FailedTransactionMetadata).toBe(false);

    const [employeePda] = getEmployeeAccountPda(employee.publicKey, vestingPda);
    const employeeData = parseEmployeeAccount(svm, employeePda);

    expect(employeeData).not.toBeNull();
    expect(employeeData!.beneficiary.equals(employee.publicKey)).toBe(true);
    expect(employeeData!.vestingAccount.equals(vestingPda)).toBe(true);
    expect(employeeData!.totalAllocated).toBe(TOTAL_ALLOCATION);
    expect(employeeData!.totalClaimed).toBe(BigInt(0));

    const ownerBalanceAfter = getTokenBalance(svm, ownerAta);
    expect(ownerBalanceAfter).toBe(ownerBalanceBefore - TOTAL_ALLOCATION);

    const treasuryBalance = getTokenBalance(svm, treasury);
    expect(treasuryBalance).toBe(TOTAL_ALLOCATION);
  });

  test("should fail to claim before cliff", () => {
    const [vestingPda] = getVestingAccountPda(COMPANY_NAME);
    const [treasury] = getTreasuryPda(COMPANY_NAME);

    const ix = buildClaimTokensIx(employee.publicKey, vestingPda, mint.publicKey, treasury, COMPANY_NAME);
    const tx = new Transaction().add(ix);
    const result = sendTx(svm, tx, [employee]);

    expect(result instanceof FailedTransactionMetadata).toBe(true);
  });

  describe("claiming after vesting period", () => {
    let svm2: LiteSVM;
    let payer2: Keypair;
    let employee2: Keypair;
    let mint2: Keypair;
    const COMPANY_NAME_2 = "TestCompany2";

    beforeAll(() => {
      const programPath = path.join(__dirname, "../target/deploy/token.so");
      const programBytes = fs.readFileSync(programPath);

      svm2 = new LiteSVM()
        .withSysvars()
        .withBuiltins()
        .withSigverify(false)
        .withDefaultPrograms();

      svm2.addProgram(PROGRAM_ID, programBytes);

      payer2 = Keypair.generate();
      employee2 = Keypair.generate();

      svm2.airdrop(payer2.publicKey, BigInt(10_000_000_000));
      svm2.airdrop(employee2.publicKey, BigInt(10_000_000_000));

      mint2 = createMint(svm2, payer2, DECIMALS);
      createAndFundAta(svm2, payer2, mint2.publicKey, payer2.publicKey, TOTAL_ALLOCATION * BigInt(10));
    });

    test("should claim tokens after full vesting", () => {
      const initVestingIx = buildInitializeVestingIx(payer2.publicKey, mint2.publicKey, COMPANY_NAME_2);
      let tx = new Transaction().add(initVestingIx);
      let result = sendTx(svm2, tx, [payer2]);
      expect(result instanceof FailedTransactionMetadata).toBe(false);

      const [vestingPda] = getVestingAccountPda(COMPANY_NAME_2);
      const [treasury] = getTreasuryPda(COMPANY_NAME_2);
      const ownerAta = getAssociatedTokenAddressSync(mint2.publicKey, payer2.publicKey);

      const startTime = BigInt(1000);
      const cliffTime = BigInt(2000);
      const endTime = BigInt(3000);

      const initEmployeeIx = buildInitializeEmployeeIx(
        payer2.publicKey,
        ownerAta,
        employee2.publicKey,
        vestingPda,
        treasury,
        mint2.publicKey,
        startTime,
        endTime,
        TOTAL_ALLOCATION,
        cliffTime
      );

      tx = new Transaction().add(initEmployeeIx);
      result = sendTx(svm2, tx, [payer2]);
      expect(result instanceof FailedTransactionMetadata).toBe(false);

      // Warp clock past vesting period
      const clock = svm2.getClock();
      clock.unixTimestamp = BigInt(4000);
      svm2.setClock(clock);

      const claimIx = buildClaimTokensIx(
        employee2.publicKey,
        vestingPda,
        mint2.publicKey,
        treasury,
        COMPANY_NAME_2
      );

      tx = new Transaction().add(claimIx);
      result = sendTx(svm2, tx, [employee2]);

      expect(result instanceof FailedTransactionMetadata).toBe(false);

      const employeeAta = getAssociatedTokenAddressSync(mint2.publicKey, employee2.publicKey);
      const employeeBalance = getTokenBalance(svm2, employeeAta);
      expect(employeeBalance).toBe(TOTAL_ALLOCATION);

      const treasuryBalance = getTokenBalance(svm2, treasury);
      expect(treasuryBalance).toBe(BigInt(0));

      const [employeePda] = getEmployeeAccountPda(employee2.publicKey, vestingPda);
      const employeeData = parseEmployeeAccount(svm2, employeePda);
      expect(employeeData!.totalClaimed).toBe(TOTAL_ALLOCATION);
    });
  });

  describe("edge cases", () => {
    let svm3: LiteSVM;
    let payer3: Keypair;

    beforeEach(() => {
      const programPath = path.join(__dirname, "../target/deploy/token.so");
      const programBytes = fs.readFileSync(programPath);

      svm3 = new LiteSVM()
        .withSysvars()
        .withBuiltins()
        .withSigverify(false)
        .withDefaultPrograms();

      svm3.addProgram(PROGRAM_ID, programBytes);

      payer3 = Keypair.generate();
      svm3.airdrop(payer3.publicKey, BigInt(10_000_000_000));
    });

    test("should fail to initialize employee with insufficient owner balance", () => {
      const mint3 = createMint(svm3, payer3, DECIMALS);
      createAndFundAta(svm3, payer3, mint3.publicKey, payer3.publicKey, BigInt(500_000_000));

      const COMPANY_NAME_3 = "TestCompany3";

      const initVestingIx = buildInitializeVestingIx(payer3.publicKey, mint3.publicKey, COMPANY_NAME_3);
      let tx = new Transaction().add(initVestingIx);
      sendTx(svm3, tx, [payer3]);

      const [vestingPda] = getVestingAccountPda(COMPANY_NAME_3);
      const [treasury] = getTreasuryPda(COMPANY_NAME_3);
      const ownerAta = getAssociatedTokenAddressSync(mint3.publicKey, payer3.publicKey);

      const employee3 = Keypair.generate();
      svm3.airdrop(employee3.publicKey, BigInt(1_000_000_000));

      const now = BigInt(Math.floor(Date.now() / 1000));

      const initEmployeeIx = buildInitializeEmployeeIx(
        payer3.publicKey,
        ownerAta,
        employee3.publicKey,
        vestingPda,
        treasury,
        mint3.publicKey,
        now,
        now + BigInt(365 * 24 * 60 * 60),
        TOTAL_ALLOCATION,
        now + BigInt(30 * 24 * 60 * 60)
      );

      tx = new Transaction().add(initEmployeeIx);
      const result = sendTx(svm3, tx, [payer3]);

      expect(result instanceof FailedTransactionMetadata).toBe(true);
    });

    test("should fail claim when nothing to claim", () => {
      const mint3 = createMint(svm3, payer3, DECIMALS);
      createAndFundAta(svm3, payer3, mint3.publicKey, payer3.publicKey, TOTAL_ALLOCATION * BigInt(10));

      const COMPANY_NAME_4 = "TestCompany4";
      const employee3 = Keypair.generate();
      svm3.airdrop(employee3.publicKey, BigInt(10_000_000_000));

      const initVestingIx = buildInitializeVestingIx(payer3.publicKey, mint3.publicKey, COMPANY_NAME_4);
      let tx = new Transaction().add(initVestingIx);
      sendTx(svm3, tx, [payer3]);

      const [vestingPda] = getVestingAccountPda(COMPANY_NAME_4);
      const [treasury] = getTreasuryPda(COMPANY_NAME_4);
      const ownerAta = getAssociatedTokenAddressSync(mint3.publicKey, payer3.publicKey);

      const startTime = BigInt(1000);
      const cliffTime = BigInt(2000);
      const endTime = BigInt(3000);

      const initEmployeeIx = buildInitializeEmployeeIx(
        payer3.publicKey,
        ownerAta,
        employee3.publicKey,
        vestingPda,
        treasury,
        mint3.publicKey,
        startTime,
        endTime,
        TOTAL_ALLOCATION,
        cliffTime
      );

      tx = new Transaction().add(initEmployeeIx);
      sendTx(svm3, tx, [payer3]);

      // Warp clock past vesting period
      const clock = svm3.getClock();
      clock.unixTimestamp = BigInt(4000);
      svm3.setClock(clock);

      // First claim - should succeed
      const claimIx1 = buildClaimTokensIx(
        employee3.publicKey,
        vestingPda,
        mint3.publicKey,
        treasury,
        COMPANY_NAME_4
      );

      tx = new Transaction().add(claimIx1);
      let result = sendTx(svm3, tx, [employee3]);
      expect(result instanceof FailedTransactionMetadata).toBe(false);

      // Second claim - should fail (nothing to claim)
      const claimIx2 = buildClaimTokensIx(
        employee3.publicKey,
        vestingPda,
        mint3.publicKey,
        treasury,
        COMPANY_NAME_4
      );

      tx = new Transaction().add(claimIx2);
      result = sendTx(svm3, tx, [employee3]);
      expect(result instanceof FailedTransactionMetadata).toBe(true);
    });

    test("should fail when non-owner tries to initialize employee", () => {
      const mint3 = createMint(svm3, payer3, DECIMALS);
      createAndFundAta(svm3, payer3, mint3.publicKey, payer3.publicKey, TOTAL_ALLOCATION * BigInt(10));

      const COMPANY_NAME_5 = "TestCompany5";

      const initVestingIx = buildInitializeVestingIx(payer3.publicKey, mint3.publicKey, COMPANY_NAME_5);
      let tx = new Transaction().add(initVestingIx);
      sendTx(svm3, tx, [payer3]);

      const [vestingPda] = getVestingAccountPda(COMPANY_NAME_5);
      const [treasury] = getTreasuryPda(COMPANY_NAME_5);

      const notOwner = Keypair.generate();
      svm3.airdrop(notOwner.publicKey, BigInt(10_000_000_000));
      createAndFundAta(svm3, payer3, mint3.publicKey, notOwner.publicKey, TOTAL_ALLOCATION);
      const notOwnerAta = getAssociatedTokenAddressSync(mint3.publicKey, notOwner.publicKey);

      const employee3 = Keypair.generate();
      const now = BigInt(Math.floor(Date.now() / 1000));

      const initEmployeeIx = buildInitializeEmployeeIx(
        notOwner.publicKey,
        notOwnerAta,
        employee3.publicKey,
        vestingPda,
        treasury,
        mint3.publicKey,
        now,
        now + BigInt(365 * 24 * 60 * 60),
        TOTAL_ALLOCATION,
        now + BigInt(30 * 24 * 60 * 60)
      );

      tx = new Transaction().add(initEmployeeIx);
      const result = sendTx(svm3, tx, [notOwner]);

      expect(result instanceof FailedTransactionMetadata).toBe(true);
    });
  });
});