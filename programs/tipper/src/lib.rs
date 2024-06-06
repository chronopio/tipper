use crate::instructions::*;
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

declare_id!("AYYEJ3jpktohhxW4Y8CscANn75nBsW99R1d5Ne5BkdvW");

#[program]
pub mod tipper {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeTipper>,
        target_name: String,
        max_balance: u64,
    ) -> Result<()> {
        initialize_tipper(ctx, target_name, max_balance)
    }

    pub fn tip(ctx: Context<AddTip>, amount: u64, message: String) -> Result<()> {
        add_tip(ctx, amount, message)
    }

    pub fn withdraw_and_close(ctx: Context<Withdraw>) -> Result<()> {
        withdraw(ctx)
    }
}
