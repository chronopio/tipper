<h1 align="center">
  TipTop<br/>
</h1>

<br/>

<center>

[![forthebadge](https://forthebadge.com/images/badges/built-with-love.svg)](https://forthebadge.com) &nbsp;

</center>

## TL;DR

This is a project built with Anchor framework that offers creation of tipping campaings and contribution. Hope you enjoy it!

## Built With
This project was built using these technologies.

- Rust
- Anchor
- Typescript

## Features

**Initialize:**
This creates a Tipper PDA and assigns the caller as the owner. Params:
- target_name: Shows what are the people tipping for. Max 32 characters.
- max_balance: Target income for the campaign.

**Tip:** Add a tip to the selected Tipper, creates a Tip PDA.
- amount: SOL amount transferred to the PDA.
- message: A message for the campaign owner. Max 32 characters.

**Withdraw:** Closes the Tipper PDA so the rent lamports are send to the owner in addition of the balance.
- No parameters.

## Getting Started

Requires anchor-cli = 0.30.0, node.js >= 17, yarn package manager and rustup.

## 🛠 Installation and Setup Instructions

### Solana program

1. Run yarn to install dependencies.
2. Run anchor test to run test suite, in case this fails run anchor build before.

### Useful Links

- Program ID (Devnet): `AYYEJ3jpktohhxW4Y8CscANn75nBsW99R1d5Ne5BkdvW`
