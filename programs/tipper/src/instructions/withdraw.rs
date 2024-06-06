use anchor_lang::prelude::*;

use crate::errors::TipperError;
use crate::states::*;

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let tipper = &mut ctx.accounts.tipper;
    let user = &mut ctx.accounts.user;

    let balance = tipper.balance;

    require_keys_eq!(tipper.authority, user.key(), TipperError::Unauthorized);

    tipper.sub_lamports(balance)?;
    user.add_lamports(balance)?;

    tipper.balance = 0;

    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, 
        close = user,
        seeds = [
            tipper.target_name[..tipper.target_name_len as usize].as_ref(),
            tipper.authority.as_ref()
        ], 
        bump = tipper.bump)]
    pub tipper: Account<'info, Tipper>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}