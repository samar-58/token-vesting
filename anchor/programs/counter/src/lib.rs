#![allow(clippy::result_large_err)]

use std::ops::Not;

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked},};

declare_id!("Count3AcZucFDPSFBAeHkQ6AvttieKUkyJ8HiQGhQwe");

#[program]
pub mod token_vesting {
    use super::*;

    pub fn create_vesting_account(ctx : Context<CreateVestingAccount>, company_name: String
    )->Result<()> {
        let vesting_account = &mut ctx.accounts.vesting_account;
        vesting_account.set_inner(
            VestingAccount {
                owner: ctx.accounts.user.key(),
                mint: ctx.accounts.mint.key(),
                treasury_token_account: ctx.accounts.treasury_token_account.key(),
                company_name,
                treasury_bump: ctx.bumps.treasury_token_account,
                bump: ctx.bumps.vesting_account,
            }
        );
        Ok(())
    }

    pub fn initialize_employee_account(
        ctx: Context<InitializeEmployeeAccount>,
        total_amount: u64,
        start_time: i64,
        cliff_time: i64,
        end_time: i64,
    ) -> Result<()> {
        let employee_account = &mut ctx.accounts.employee_account;
        employee_account.set_inner(
            EmployeeAccount {
                employee: ctx.accounts.employee_account.key(),
                vesting_account: ctx.accounts.vesting_account.key(),
                total_amount,
                released_amount: 0,
                start_time,
                cliff_time,
                end_time,
                bump: ctx.bumps.employee_account,
            }
        );
        Ok(())
    }

pub fn claim_tokens(ctx: Context<ClaimTokens>, company_name: String)->Result<()>{
let employee_account = &mut ctx.accounts.employee_account;

let now = Clock::get()?.unix_timestamp;
if now < employee_account.cliff_time {
    return Err(ErrorCode::CliffNotReached.into());
}

let time_since_start = now.saturating_sub(employee_account.start_time);
let vesting_duration = employee_account.end_time.saturating_sub(employee_account.start_time);


if vesting_duration == 0 {
    return Err(ErrorCode::CalculationOverflow.into());
}

let vested_amount = if now >= employee_account.end_time {
    employee_account.total_amount
} else {
   match employee_account.total_amount.checked_mul(time_since_start as u64){
    Some(amount) => amount / vesting_duration as u64,
    None => {
        return Err(ErrorCode::CalculationOverflow.into());
    },
   }
};

let claimable_amount = vested_amount.saturating_sub(employee_account.total_amount);

if claimable_amount == 0 {
return Err(ErrorCode::NothingToClaim.into())
}



let transfer_cpi_accounts = TransferChecked{
from: ctx.accounts.treasury_token_account.to_account_info(),
to: ctx.accounts.employee_token_account.to_account_info(),
authority: ctx.accounts.vesting_account.to_account_info(),
mint: ctx.accounts.mint.to_account_info(),
};

let treasury_account_seeds: &[&[u8]] = &[
    b"treasury".as_ref(),
    ctx.accounts.vesting_account.company_name.as_ref(),
    &[ctx.accounts.vesting_account.treasury_bump],
];
let signer_seeds:&[&[&[u8]]] = &[&treasury_account_seeds[..]];
let transfer_cpi_context = CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    transfer_cpi_accounts,
    signer_seeds,
);

transfer_checked(transfer_cpi_context, claimable_amount, ctx.accounts.mint.decimals)?;

employee_account.released_amount += claimable_amount;
    Ok(())
}

}


#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct CreateVestingAccount<'info> {
    #[account(
     init,
     payer = user,
     space = 8 + VestingAccount::INIT_SPACE,
     seeds = [company_name.as_ref()],
     bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    mint: InterfaceAccount<'info, Mint>,

    #[account(
     init,
     payer = user,
     token::mint = mint,
     token::authority = vesting_account,
     seeds = [b"treasury".as_ref(), company_name.as_ref()],
     bump
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct InitializeEmployeeAccount<'info> {
    #[account(
     init,
     payer = user,
     space = 8 + EmployeeAccount::INIT_SPACE,
     seeds = [b"employee_vesting", employee.key().as_ref(), vesting_account.key().as_ref()],
     bump
    )]
    pub employee_account: Account<'info, EmployeeAccount>,
    #[account(
        has_one = owner
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,
    #[account(
        mut,
        seeds = [b"employee_vesting", beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump = employee_account.bump,
        has_one = beneficiary,
        has_one = vesting_account,
    )]
    pub employee_account: Account<'info, EmployeeAccount>,
    #[account(
        mut,
        seeds = [company_name.as_ref()],
        bump = vesting_account.bump,
        has_one = treasury_token_account,
        has_one = mint,
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    #[account(
        mut,
        seeds = [b"treasury".as_ref(), vesting_account.company_name.as_ref()],
        bump = vesting_account.treasury_bump,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
        associated_token::token_program = token_program,
    )]
    pub employee_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct VestingAccount{
pub owner: Pubkey,
pub mint :Pubkey,
pub treasury_token_account: Pubkey,
#[max_len(50)]
pub company_name : String,
pub treasury_bump: u8,
pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EmployeeAccount{
pub employee: Pubkey,
pub vesting_account: Pubkey,
pub total_amount: u64,
pub released_amount: u64,
pub start_time: i64,
pub cliff_time: i64,
pub end_time: i64,
pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Cliff period has not been reached yet.")]
    CliffNotReached,
    #[msg("Nothing to claim at this time.")]
    InvalidVestingPeriod,
    #[msg("Calculation overflow occurred.")]
    CalculationOverflow,
    #[msg("Nothing to claim at this time.")]
    NothingToClaim,
}