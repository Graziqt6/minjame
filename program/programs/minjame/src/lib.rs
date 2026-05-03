use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("86p3JFFhFnaP866XbRivhZuagf4SaoMkHG1dFvWnvpJ4");

const INTENT_DEPOSIT: u64 = 2_000_000;
const LOAN_DURATION: i64 = 14 * 24 * 60 * 60;

// Tier max loan amounts in USDC lamports (6 decimals)
const TIER_MAX: [u64; 4] = [
    10_000_000,   // Tier 0: $10
    50_000_000,   // Tier 1: $50
    150_000_000,  // Tier 2: $150
    500_000_000,  // Tier 3: $500
];

#[program]
pub mod minjame {
    use super::*;

    pub fn create_loan(ctx: Context<CreateLoan>, amount: u64) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        let score = &mut ctx.accounts.user_score;
        let clock = Clock::get()?;
        require!(!loan.active, MinjameError::LoanAlreadyActive);

        // Validate amount is within tier limit
        let tier_index = score.tier as usize;
        let max_amount = TIER_MAX[tier_index.min(3)];
        require!(amount > 0 && amount <= max_amount, MinjameError::ExceedsLimit);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.borrower.to_account_info(),
                },
            ),
            INTENT_DEPOSIT,
        )?;

        let bump = ctx.bumps.vault_authority;
        let seeds: &[&[u8]] = &[b"vault_authority", &[bump]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        loan.borrower = ctx.accounts.borrower.key();
        loan.amount = amount;
        loan.intent_deposit = INTENT_DEPOSIT;
        loan.created_at = clock.unix_timestamp;
        loan.due_date = clock.unix_timestamp + LOAN_DURATION;
        loan.repaid = false;
        loan.active = true;

        if score.created_at == 0 {
            score.owner = ctx.accounts.borrower.key();
            score.score = 0;
            score.tier = 0;
            score.repayment_count = 0;
            score.on_time_count = 0;
            score.created_at = clock.unix_timestamp;
        }

        Ok(())
    }

    pub fn repay_loan(ctx: Context<RepayLoan>) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        let score = &mut ctx.accounts.user_score;
        let clock = Clock::get()?;
        require!(loan.active, MinjameError::NoActiveLoan);
        require!(!loan.repaid, MinjameError::AlreadyRepaid);

        let tier_rate: u64 = match score.tier {
            0 => 18,
            1 => 13,
            2 => 9,
            _ => 6,
        };
        let interest = loan.amount * tier_rate / 100 * 14 / 365;
        let total_repayment = loan.amount + interest;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.borrower.to_account_info(),
                },
            ),
            total_repayment,
        )?;

        let bump = ctx.bumps.vault_authority;
        let seeds: &[&[u8]] = &[b"vault_authority", &[bump]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_usdc.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer_seeds,
            ),
            INTENT_DEPOSIT,
        )?;

        loan.repaid = true;
        loan.active = false;
        score.repayment_count += 1;

        let is_on_time = clock.unix_timestamp <= loan.due_date;
        if is_on_time {
            score.on_time_count += 1;
            score.score = score.score.saturating_add(10);
        } else {
            score.score = score.score.saturating_sub(5);
        }

        score.tier = match score.on_time_count {
            0..=2 => 0,
            3..=7 => 1,
            8..=14 => 2,
            _ => 3,
        };

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        init_if_needed,
        payer = borrower,
        space = 8 + LoanAccount::SIZE,
        seeds = [b"loan", borrower.key().as_ref()],
        bump
    )]
    pub loan: Account<'info, LoanAccount>,
    #[account(
        init_if_needed,
        payer = borrower,
        space = 8 + UserScore::SIZE,
        seeds = [b"score", borrower.key().as_ref()],
        bump
    )]
    pub user_score: Account<'info, UserScore>,
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: SystemAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(mut, seeds = [b"loan", borrower.key().as_ref()], bump)]
    pub loan: Account<'info, LoanAccount>,
    #[account(mut, seeds = [b"score", borrower.key().as_ref()], bump)]
    pub user_score: Account<'info, UserScore>,
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: SystemAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct LoanAccount {
    pub borrower: Pubkey,
    pub amount: u64,
    pub intent_deposit: u64,
    pub created_at: i64,
    pub due_date: i64,
    pub repaid: bool,
    pub active: bool,
}
impl LoanAccount {
    const SIZE: usize = 32 + 8 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct UserScore {
    pub owner: Pubkey,
    pub score: u32,
    pub tier: u8,
    pub repayment_count: u32,
    pub on_time_count: u32,
    pub created_at: i64,
}
impl UserScore {
    const SIZE: usize = 32 + 4 + 1 + 4 + 4 + 8;
}

#[error_code]
pub enum MinjameError {
    #[msg("Loan amount must be $5 or $10 USDC")]
    InvalidLoanAmount,
    #[msg("You already have an active loan")]
    LoanAlreadyActive,
    #[msg("No active loan found")]
    NoActiveLoan,
    #[msg("Loan already repaid")]
    AlreadyRepaid,
    #[msg("Amount exceeds your current tier limit")]
    ExceedsLimit,
}
