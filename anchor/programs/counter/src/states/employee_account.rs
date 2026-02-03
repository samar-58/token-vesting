use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EmployeeAccount {
    pub beneficiary: Pubkey,
    pub vesting_account: Pubkey,
    pub total_allocated: i64,
    pub total_claimed: i64,
    pub start_time: i64,
    pub end_time: i64,
    pub cliff_time: i64,
    pub bump: u8,
}
