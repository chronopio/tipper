use anchor_lang::prelude::*;

pub const TARGET_NAME_LENGTH: usize = 32;
pub const MESSAGE_LENGTH: usize = 32;

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum State {
    Unititialized,
    Open,
    Closed,
}

#[account]
pub struct Tipper {
    pub authority: Pubkey,
    pub target_name: [u8; TARGET_NAME_LENGTH],
    pub target_name_len: u8,
    pub balance: u64,
    pub max_balance: u64,
    pub state: State,
    pub bump: u8,
}
impl Tipper {
    // Pubkey + [u8; TARGET_NAME_LENGTH] + u8 + u64 + u64 + State(u8) + u8
    pub const LEN: usize = 32 + TARGET_NAME_LENGTH + 1 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Tip {
    pub author: Pubkey,
    pub parent_tipper: Pubkey,
    pub amount: u64,
    pub message: [u8; MESSAGE_LENGTH],
    pub message_len: u8,
    pub bump: u8,
}
impl Tip {
    // Pubkey + Pubkey + u64 + [u8; MESSAGE_LENGTH] + u8 + u8
    pub const LEN: usize = 32 + 32 + 8 + MESSAGE_LENGTH + 1 + 1;
}
