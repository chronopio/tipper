use anchor_lang::prelude::*;

use crate::errors::TipperError;
use crate::states::*;

pub fn add_tip(ctx: Context<AddTip>, amount: u64, message: String) -> Result<()> {
    let tip = &mut ctx.accounts.tip;
    let tipper = &mut ctx.accounts.tipper;

    require!(
        matches!(tipper.state, State::Open),
        TipperError::TipperClosed
    );

    require!(
        amount > 0,
        TipperError::InvalidAmount
    );

    require!(
        tipper.balance.checked_add(amount).is_some(),
        TipperError::CapacityOverflow
    );

    let txn = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.author.key(),
        &tipper.key(),
        amount,
    );

    anchor_lang::solana_program::program::invoke(
        &txn,
        &[
            ctx.accounts.author.to_account_info(),
            tipper.to_account_info(),
        ],
    )?;

    // We already checked that the balance won't overflow, so this is safe.
    if (tipper.balance + amount) > tipper.max_balance {
        tipper.state = State::Closed;
    }

    tipper.balance += amount;
    tip.author = *ctx.accounts.author.key;
    tip.parent_tipper = tipper.key();
    tip.amount = amount;
    tip.bump = ctx.bumps.tip;

    let mut message_data = [0u8; MESSAGE_LENGTH];
    message_data[..message.as_bytes().len()].copy_from_slice(message.as_bytes());

    tip.message = message_data;
    tip.message_len = message.as_bytes().len() as u8;

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, message: String)]
pub struct AddTip<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        init,
        payer = author, 
        space = 8 + Tip::LEN, 
        seeds = [
            author.key().as_ref(),
            tipper.key().as_ref(),
            message.as_bytes()
            ], 
        bump)]
    pub tip: Account<'info, Tip>,

    #[account(mut, 
        seeds = [
            tipper.target_name[..tipper.target_name_len as usize].as_ref(),
            tipper.authority.as_ref()
        ], 
        bump = tipper.bump)]
    pub tipper: Account<'info, Tipper>,
    pub system_program: Program<'info, System>,
}
