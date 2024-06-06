use anchor_lang::prelude::*;

#[error_code]
pub enum TipperError {
    #[msg("Target name must be less than 32 characters long")]
    TargetNameTooLong,

    #[msg("Tips for this campaign are closed, see you next time!")]
    TipperClosed,

    #[msg("Amount must be greater than 0")]
    InvalidAmount,

    #[msg("Oops, the tip jar is full!")]
    CapacityOverflow,

    #[msg("You are not authorized to perform this action")]
    Unauthorized,
}
