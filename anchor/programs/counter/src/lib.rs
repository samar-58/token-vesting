pub mod errors;
pub mod states;
pub mod instructions;
use crate::instructions::*;
use anchor_lang::prelude::*;

declare_id!("89K5fa9yF9wm7PgSRsBRBS1xa7eEZmqkuHocyNKM8cUK");

#[program]
pub mod token {
    use super::*;

    pub fn initialize_vesting_account(ctx : Context<InitializeVestingAccount>, company_name: String)->Result<()> {
        let bump = ctx.bumps.vesting_account;
        let treasury_bump = ctx.bumps.treasury_token_account;
        instructions::initialize_vesting::handler(ctx, company_name, bump, treasury_bump)?;
      Ok(())
    }

    pub fn initialize_employee_account(
        ctx : Context<InitializeEmployeeAccount>,
        start_time: i64,
        end_time: i64,
        total_amount: i64,
        cliff_time: i64
    )->Result<()>{
        instructions::initialize_employee::handler(ctx, total_amount, start_time, end_time, cliff_time)?;
        Ok(())
    }
}

pub fn claim_tokens(ctx : Context<ClaimTokens>)->Result<()>{
instructions::claim_tokens::handler(ctx)?;
Ok(())
}






