use anchor_lang::prelude::*;
use crate::states::{EmployeeAccount, VestingAccount};
#[derive(Accounts)]
 pub struct InitializeEmployeeAccount<'info>{
    #[account(mut)]
    pub owner : Signer<'info>,
    pub beneficiary : SystemAccount<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + EmployeeAccount::INIT_SPACE,
        seeds = [b"employee_vesting".as_ref(), beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump,
    )]
    pub employee_account : Account<'info, EmployeeAccount>,
    #[account(has_one = owner)]
    pub vesting_account : Account<'info, VestingAccount>,
    pub system_program : Program<'info, System>,
 }

 impl <'info> InitializeEmployeeAccount <'info>{
    pub fn initialize_employee_account(&mut self, total_allocated: i64, start_time: i64, end_time: i64, cliff_time: i64)->Result<()> {
        self.employee_account.set_inner(EmployeeAccount {
            beneficiary: self.beneficiary.key(),
            vesting_account: self.vesting_account.key(),
            total_allocated,
            total_claimed: 0,
            start_time,
            end_time,
            cliff_time,
            bump: self.employee_account.bump,
        });
        Ok(())
    }
 }

 pub fn handler(ctx : Context<InitializeEmployeeAccount>, total_allocated : i64, start_time: i64, end_time: i64, cliff_time: i64)->Result<()>{
 ctx.accounts.initialize_employee_account( total_allocated, start_time, end_time, cliff_time)?;
    Ok(())
 }