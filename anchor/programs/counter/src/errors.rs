use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Cliff period not reached yet.")]
    CliffNotReached,
    #[msg("No tokens available to claim.")]
    NothingToClaim,
}