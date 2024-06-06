import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Tipper } from '../target/types/tipper';
import { assert } from 'chai';
import { Connection, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';
import { publicKey } from '@coral-xyz/anchor/dist/cjs/utils';

const State = {
    Unitialized: 'uninitialized',
    Open: 'open',
    Closed: 'closed'
} as const;

describe('tipper', () => {
    const provider = anchor.AnchorProvider.local('http://127.0.0.1:8899');
    anchor.setProvider(provider);

    const program = anchor.workspace.Tipper as Program<Tipper>;
    const authority = anchor.web3.Keypair.generate();
    const author = anchor.web3.Keypair.generate();

    const targetName = 'Ackee Final Project';
    const firstTipMessage = 'Thank you for your hard work!';
    const secondTipMessage = 'I appreciate your dedication!';
    const maxBalance = new anchor.BN('100000000000');

    describe('Initialize Tipper', async () => {
        it('is initialized!', async () => {
            await airdrop(provider.connection, authority.publicKey);

            const [tipperPublicKey, tipperBump] = getTipperAddress(
                targetName,
                authority.publicKey,
                program.programId
            );

            await program.methods
                .initialize(targetName, maxBalance)
                .accountsStrict({
                    authority: authority.publicKey,
                    tipper: tipperPublicKey,
                    systemProgram: anchor.web3.SystemProgram.programId
                })
                .signers([authority])
                .rpc({ commitment: 'confirmed' });

            await checkTipper({
                program,
                tipper: tipperPublicKey,
                authority: authority.publicKey,
                targetName,
                balance: new anchor.BN(0),
                maxBalance,
                state: State.Open,
                bump: tipperBump
            });
        });

        it('cannot initialize the same tipper twice!', async () => {
            const [tipperPublicKey] = getTipperAddress(
                targetName,
                authority.publicKey,
                program.programId
            );

            try {
                await program.methods
                    .initialize(targetName, maxBalance)
                    .accountsStrict({
                        authority: authority.publicKey,
                        tipper: tipperPublicKey,
                        systemProgram: anchor.web3.SystemProgram.programId
                    })
                    .signers([authority])
                    .rpc();
                assert.fail();
            } catch (_err) {
                assert.isTrue(
                    _err.logs.some(
                        (log: string) =>
                            log ===
                            `Program ${program.programId.toString()} failed: custom program error: 0x0`
                    )
                );
            }
        });

        it('cannot initialize a tipper with a target name that is too long!', async () => {
            const longTargetName = crypto.randomBytes(33).toString('hex');

            try {
                const [tipperPublicKey] = getTipperAddress(
                    longTargetName,
                    authority.publicKey,
                    program.programId
                );

                await program.methods
                    .initialize(longTargetName, maxBalance)
                    .accountsStrict({
                        authority: authority.publicKey,
                        tipper: tipperPublicKey,
                        systemProgram: anchor.web3.SystemProgram.programId
                    })
                    .signers([authority])
                    .rpc();
            } catch (_err) {
                assert.strictEqual(_err.message, 'Max seed length exceeded');
            }
        });
    });

    describe('Tip deposit', async () => {
        it('can deposit a tip!', async () => {
            const tipAmount = new anchor.BN('1000000000');

            await airdrop(provider.connection, author.publicKey, 10000000000);

            const [tipperPublicKey, tipperBump] = getTipperAddress(
                targetName,
                authority.publicKey,
                program.programId
            );

            const [tipPublicKey, tipBump] = getTipAddress(
                author.publicKey,
                tipperPublicKey,
                firstTipMessage,
                program.programId
            );

            let userBalance = await getAccountBalance(
                provider.connection,
                author.publicKey
            );

            await program.methods
                .tip(tipAmount, firstTipMessage)
                .accountsStrict({
                    author: author.publicKey,
                    tipper: tipperPublicKey,
                    tip: tipPublicKey,
                    systemProgram: anchor.web3.SystemProgram.programId
                })
                .signers([author])
                .rpc({ commitment: 'confirmed' });

            await checkTip({
                program,
                tip: tipPublicKey,
                parentTipper: tipperPublicKey,
                author: author.publicKey,
                amount: tipAmount,
                bump: tipBump
            });

            await checkTipper({
                program,
                tipper: tipperPublicKey,
                balance: tipAmount,
                bump: tipperBump
            });
        });

        it('cannot deposit a non positive tip!', async () => {
            const tipAmount = new anchor.BN('0');

            const [tipperPublicKey] = getTipperAddress(
                targetName,
                authority.publicKey,
                program.programId
            );

            const [tipPublicKey] = getTipAddress(
                author.publicKey,
                tipperPublicKey,
                'This will fail',
                program.programId
            );

            try {
                await program.methods
                    .tip(tipAmount, 'This will fail')
                    .accountsStrict({
                        author: author.publicKey,
                        tipper: tipperPublicKey,
                        tip: tipPublicKey,
                        systemProgram: anchor.web3.SystemProgram.programId
                    })
                    .signers([author])
                    .rpc({ commitment: 'confirmed' });
                assert.fail();
            } catch (_err) {
                const err = anchor.AnchorError.parse(_err.logs);
                assert.strictEqual(err.error.errorCode.code, 'InvalidAmount');
            }
        });

        it('closes the tipper when the balance is equal or greater to the max balance!', async () => {
            const tipAmount = new anchor.BN('100000000000');

            await airdrop(provider.connection, author.publicKey, 1000000000000);

            const [tipperPublicKey, tipperBump] = getTipperAddress(
                targetName,
                authority.publicKey,
                program.programId
            );

            const [tipPublicKey, tipBump] = getTipAddress(
                author.publicKey,
                tipperPublicKey,
                secondTipMessage,
                program.programId
            );

            await program.methods
                .tip(tipAmount, secondTipMessage)
                .accountsStrict({
                    author: author.publicKey,
                    tipper: tipperPublicKey,
                    tip: tipPublicKey,
                    systemProgram: anchor.web3.SystemProgram.programId
                })
                .signers([author])
                .rpc({ commitment: 'confirmed' });

            await checkTip({
                program,
                tip: tipPublicKey,
                parentTipper: tipperPublicKey,
                author: author.publicKey,
                amount: tipAmount,
                bump: tipBump
            });

            await checkTipper({
                program,
                tipper: tipperPublicKey,
                // We have to consider previous tip amount
                balance: tipAmount.add(new anchor.BN('1000000000')),
                maxBalance,
                state: State.Closed,
                bump: tipperBump
            });
        });

        it('cannot deposit a tip if the tipper is closed!', async () => {
            const tipAmount = new anchor.BN('100');

            const [tipperPublicKey] = getTipperAddress(
                targetName,
                authority.publicKey,
                program.programId
            );

            const [tipPublicKey] = getTipAddress(
                author.publicKey,
                tipperPublicKey,
                'This will fail',
                program.programId
            );

            try {
                await program.methods
                    .tip(tipAmount, 'This will fail')
                    .accountsStrict({
                        author: author.publicKey,
                        tipper: tipperPublicKey,
                        tip: tipPublicKey,
                        systemProgram: anchor.web3.SystemProgram.programId
                    })
                    .signers([author])
                    .rpc({ commitment: 'confirmed' });
                assert.fail();
            } catch (_err) {
                const err = anchor.AnchorError.parse(_err.logs);
                assert.strictEqual(err.error.errorCode.code, 'TipperClosed');
            }
        });
    });

    describe('Withdraw tip', async () => {
        it("can't withdraw if the caller is not the authority!", async () => {
            const [tipperPublicKey] = getTipperAddress(
                targetName,
                authority.publicKey,
                program.programId
            );

            const thief = anchor.web3.Keypair.generate();

            try {
                await program.methods
                    .withdrawAndClose()
                    .accountsStrict({
                        tipper: tipperPublicKey,
                        user: thief.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId
                    })
                    .signers([thief])
                    .rpc({ commitment: 'confirmed' });
            } catch (_err) {
                const err = anchor.AnchorError.parse(_err.logs);
                assert.strictEqual(err.error.errorCode.code, 'Unauthorized');
            }
        });

        it('can withdraw a tip!', async () => {
            const [tipperPublicKey] = getTipperAddress(
                targetName,
                authority.publicKey,
                program.programId
            );

            const userBalanceBeforeWithdraw = await getAccountBalance(
                provider.connection,
                authority.publicKey
            );

            await program.methods
                .withdrawAndClose()
                .accountsStrict({
                    tipper: tipperPublicKey,
                    user: authority.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId
                })
                .signers([authority])
                .rpc({ commitment: 'confirmed' });

            const userBalanceAfterWithdraw = await getAccountBalance(
                provider.connection,
                authority.publicKey
            );

            checkTipper({
                program,
                tipper: tipperPublicKey,
                balance: new anchor.BN(0)
            });

            assert.isAtLeast(
                userBalanceAfterWithdraw,
                userBalanceBeforeWithdraw + maxBalance.toNumber()
            );
        });
    });
});

function getTipperAddress(
    targetName: string,
    authority: PublicKey,
    programID: PublicKey
) {
    return PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode(targetName), authority.toBuffer()],
        programID
    );
}

function getTipAddress(
    author: PublicKey,
    tipper: PublicKey,
    message: string,
    programId: PublicKey
) {
    return PublicKey.findProgramAddressSync(
        [
            author.toBuffer(),
            tipper.toBuffer(),
            anchor.utils.bytes.utf8.encode(message)
        ],
        programId
    );
}

async function checkTipper({
    program,
    tipper,
    authority,
    targetName,
    balance,
    maxBalance,
    state,
    bump
}: {
    program: Program<Tipper>;
    tipper: PublicKey;
    authority?: PublicKey;
    targetName?: string;
    balance?: anchor.BN;
    maxBalance?: anchor.BN;
    state?: (typeof State)[keyof typeof State];
    bump?: number;
}) {
    const tipperData = await program.account.tipper.fetch(tipper);

    if (authority) {
        assert.strictEqual(
            tipperData.authority.toString(),
            authority.toString()
        );
    }

    if (targetName) {
        const utf8ByteArrayTargetName = stringToUtf8ByteArray(targetName);
        const paddedTargetName = padByteArrayWithZeroes(
            utf8ByteArrayTargetName,
            32
        );
        assert.strictEqual(
            tipperData.targetName.toString(),
            paddedTargetName.toString()
        );
        assert.strictEqual(
            tipperData.targetNameLen.toString(),
            utf8ByteArrayTargetName.length.toString()
        );
    }

    if (balance) {
        assert.strictEqual(tipperData.balance.toString(), balance.toString());
    }

    if (maxBalance) {
        assert.strictEqual(
            tipperData.maxBalance.toString(),
            maxBalance.toString()
        );
    }

    if (state) {
        assert.isTrue(!!tipperData.state[state]);
    }

    if (bump) {
        assert.strictEqual(tipperData.bump.toString(), bump.toString());
    }
}

async function checkTip({
    program,
    tip,
    parentTipper,
    author,
    amount,
    message,
    bump
}: {
    program: Program<Tipper>;
    tip: PublicKey;
    parentTipper?: PublicKey;
    author?: PublicKey;
    amount?: anchor.BN;
    message?: string;
    bump?: number;
}) {
    const tipData = await program.account.tip.fetch(tip);

    if (parentTipper) {
        assert.strictEqual(
            tipData.parentTipper.toString(),
            parentTipper.toString()
        );
    }

    if (author) {
        assert.strictEqual(tipData.author.toString(), author.toString());
    }

    if (amount) {
        assert.strictEqual(tipData.amount.toString(), amount.toString());
    }

    if (message) {
        const utf8ByteArrayMessage = stringToUtf8ByteArray(message);
        const paddedMessage = padByteArrayWithZeroes(utf8ByteArrayMessage, 32);
        assert.strictEqual(
            tipData.message.toString(),
            paddedMessage.toString()
        );
        assert.strictEqual(
            tipData.messageLen.toString(),
            utf8ByteArrayMessage.length.toString()
        );
    }

    if (bump) {
        assert.strictEqual(tipData.bump.toString(), bump.toString());
    }
}

function stringToUtf8ByteArray(inputString: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(inputString);
}

function padByteArrayWithZeroes(
    byteArray: Uint8Array,
    length: number
): Uint8Array {
    if (byteArray.length >= length) {
        return byteArray;
    }

    const paddedArray = new Uint8Array(length);
    paddedArray.set(byteArray, 0);
    return paddedArray;
}

async function getAccountBalance(
    connection: anchor.web3.Connection,
    address: PublicKey
) {
    return connection.getBalance(address);
}

async function airdrop(
    connection: any,
    address: PublicKey,
    amount = 1000000000
) {
    await connection.confirmTransaction(
        await connection.requestAirdrop(address, amount),
        'confirmed'
    );
}
