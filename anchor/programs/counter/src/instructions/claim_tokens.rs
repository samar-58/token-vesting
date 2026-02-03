use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}};

use crate::states::*;
use crate::errors::ErrorCode;
#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct ClaimTokens<'info>{
    #[account(mut)]
    pub beneficiary : Signer<'info>,
    #[account(
        mut,
        seeds = [b"employee_vesting".as_ref(), beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump,
        has_one = beneficiary,
        has_one = vesting_account,
    )]
    pub employee_account : Box<Account<'info, EmployeeAccount>>,

    #[account(
        mut,
        seeds = [company_name.as_ref()],
        bump = vesting_account.bump,
        has_one = mint,
        has_one = treasury_token_account,
    )]
    pub vesting_account : Box<Account<'info, VestingAccount>>,
    pub mint : Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub treasury_token_account : Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
        associated_token::token_program = token_program,
    )]
    pub employee_token_account : Box<InterfaceAccount<'info, TokenAccount>>,
    pub token_program : Interface<'info, TokenInterface>,
    pub system_program : Program<'info, System>,
    pub associated_token_program : Program<'info,AssociatedToken>,
}

impl <'info> ClaimTokens <'info>{
    pub fn claim_tokens(&mut self)->Result<()>{
let employee_account = &mut self.employee_account;

let now = Clock::get()?.unix_timestamp;
if now < employee_account.cliff_time {
    return Err(ErrorCode::CliffNotReached.into());
}

let time_since_start = now.saturating_sub(employee_account.start_time);
let total_vesting_duration = employee_account.end_time.saturating_sub(employee_account.start_time);


let vesting_amount = if now >= employee_account.end_time {
    employee_account.total_allocated
} else {
   (employee_account.total_allocated * time_since_start as u64) / total_vesting_duration as u64
};

let claimable_amount = vesting_amount.saturating_sub(employee_account.total_claimed);

    if claimable_amount == 0 {
            return Err(ErrorCode::NothingToClaim.into());
        }

let transfer_cpi_accounts = TransferChecked{
    from : self.treasury_token_account.to_account_info(),
    mint : self.mint.to_account_info(),
    to : self.employee_token_account.to_account_info(),
    authority : self.vesting_account.to_account_info(),
};

let vesting_signer_seeds:&[&[&[u8]]]= &[
    &[
        self.vesting_account.company_name.as_ref(),
        &[self.vesting_account.bump],
    ]
];

let cpi_context = CpiContext::new_with_signer(
    self.token_program.to_account_info(),
    transfer_cpi_accounts,
    vesting_signer_seeds,
);

transfer_checked(cpi_context, claimable_amount, self.mint.decimals)?;

employee_account.total_claimed += claimable_amount;

Ok(())

}
}

pub fn handler(ctx : Context<ClaimTokens>)->Result<()>{
ctx.accounts.claim_tokens()?;
Ok(())
}
