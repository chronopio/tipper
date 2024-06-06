use anchor_lang::prelude::*;

use crate::errors::TipperError;
use crate::states::*;

pub fn initialize_tipper(ctx: Context<InitializeTipper>, target_name: String, max_balance: u64) -> Result<()> {
    let tipper = &mut ctx.accounts.tipper;

    require!(
        target_name.as_bytes().len() <= TARGET_NAME_LENGTH,
        TipperError::TargetNameTooLong
    );

    let mut target_name_data = [0u8; TARGET_NAME_LENGTH];
    target_name_data[..target_name.len()].copy_from_slice(target_name.as_bytes());
    tipper.target_name = target_name_data;

    tipper.target_name_len = target_name.as_bytes().len() as u8;

    tipper.authority = *ctx.accounts.authority.key;
    tipper.balance = 0;
    tipper.bump = ctx.bumps.tipper;
    tipper.state = State::Open;
    tipper.max_balance = max_balance;

    Ok(())
}

#[derive(Accounts)]
#[instruction(target_name: String)]
pub struct InitializeTipper<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init, 
        payer = authority, 
        space = 8 + Tipper::LEN, 
        seeds = [
            target_name.as_bytes(),
            authority.key().as_ref()
        ], bump)]
    pub tipper: Account<'info, Tipper>,
    pub system_program: Program<'info, System>,
}
