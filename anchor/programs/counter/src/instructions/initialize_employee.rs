use anchor_lang::prelude::*;
use anchor_spl::{token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}};
use crate::states::{EmployeeAccount, VestingAccount};
#[derive(Accounts)]
 pub struct InitializeEmployeeAccount<'info>{
    #[account(mut)]
    pub owner : Signer<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account : Box<InterfaceAccount<'info, TokenAccount>>,
    pub beneficiary : SystemAccount<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + EmployeeAccount::INIT_SPACE,
        seeds = [b"employee_vesting".as_ref(), beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump,
    )]
    pub employee_account : Account<'info, EmployeeAccount>,
    #[account(has_one = owner, has_one = mint)]
    pub vesting_account : Account<'info, VestingAccount>,
    #[account(
        mut,
        token::mint = vesting_account.mint,
        token::authority = vesting_account,
        seeds = [b"treasury".as_ref(), vesting_account.company_name.as_ref()],
        bump = vesting_account.treasury_bump
    )]
    pub treasury_account : Box<InterfaceAccount<'info, TokenAccount>>,
    pub mint : Box<InterfaceAccount<'info, Mint>>,
    pub token_program : Interface<'info, TokenInterface>,
    pub system_program : Program<'info, System>,
 }

 impl <'info> InitializeEmployeeAccount <'info>{
    pub fn initialize_employee_account(&mut self, bump: u8, total_allocated: u64, start_time: i64, end_time: i64, cliff_time: i64)->Result<()> {
        self.employee_account.set_inner(EmployeeAccount {
            beneficiary: self.beneficiary.key(),
            vesting_account: self.vesting_account.key(),
            total_allocated,
            total_claimed: 0,
            start_time,
            end_time,
            cliff_time,
            bump,
        });
        Ok(())
    }

    pub fn fund_treasury(&mut self, total_allocated: u64)->Result<()>{
        let fund_treasury_accounts = TransferChecked{
            from : self.owner_token_account.to_account_info(),
            mint : self.mint.to_account_info(),
            to : self.treasury_account.to_account_info(),
            authority : self.owner.to_account_info()
        };

        let cpi_program = self.token_program.to_account_info();

        let cpi_context = CpiContext::new(cpi_program, fund_treasury_accounts);

        transfer_checked(cpi_context, total_allocated, self.mint.decimals)?;

Ok(())
    }
 }


 pub fn handler(ctx : Context<InitializeEmployeeAccount>, total_allocated: u64, start_time: i64, end_time: i64, cliff_time: i64)->Result<()>{
    ctx.accounts.initialize_employee_account(ctx.bumps.employee_account, total_allocated, start_time, end_time, cliff_time)?;
    ctx.accounts.fund_treasury(total_allocated)?;
    Ok(())
 }