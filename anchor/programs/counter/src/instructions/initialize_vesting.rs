use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::states::*;
#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct InitializeVestingAccount<'info> {
    #[account(mut)]
    pub signer : Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + VestingAccount::INIT_SPACE,
        seeds = [company_name.as_ref()],
        bump,
    )
    ]
    pub vesting_account: Account<'info, VestingAccount>,
    pub mint : InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = signer,
        token::mint = mint,
        token::authority = vesting_account,
        seeds = [b"treasury".as_ref(), company_name.as_ref()],
        bump,
    )]
    pub treasury_token_account : InterfaceAccount<'info, TokenAccount>,
    pub system_program : Program<'info, System>,
    pub token_program : Interface<'info, TokenInterface>,
}

impl <'info> InitializeVestingAccount <'info>{
 pub fn initialize_vesting_account(&mut self, bump: u8, treasury_bump : u8, company_name: String)->Result<()> {
self.vesting_account.set_inner(VestingAccount {
            owner: self.signer.key(),
            mint: self.mint.key(),
            treasury_token_account: self.treasury_token_account.key(),
            company_name,
            treasury_bump: treasury_bump,
            bump: bump,
        });
        Ok(())
    }
}

pub fn handler(ctx : Context<InitializeVestingAccount>, company_name: String, bump : u8, treasury_bump: u8)->Result<()>{
ctx.accounts.initialize_vesting_account(bump, treasury_bump, company_name)?;
    Ok(())
}