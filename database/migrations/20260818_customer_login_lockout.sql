USE yellow_hauz_pos;

-- Brute-force protection for the guest login/register form. After 5 failed
-- sign-in attempts, the account is locked for 15 minutes.
ALTER TABLE customer_accounts
    ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0 AFTER password,
    ADD COLUMN locked_until DATETIME NULL AFTER failed_attempts;
