use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EmployeeAccount {
    pub beneficiary: Pubkey,
    pub vesting_account: Pubkey,
    pub total_allocated: u64,
    pub total_claimed: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub cliff_time: i64,
    pub bump: u8,
}

//pub struct EmployeeAccount {
//     pub beneficiary: Pubkey,
//     pub start_time: i64,
//     pub end_time: i64,
//     pub total_amount: i64,
//     pub total_withdrawn: i64,
//     pub cliff_time: i64,
//     pub vesting_account: Pubkey,
//     pub bump: u8,
// }
