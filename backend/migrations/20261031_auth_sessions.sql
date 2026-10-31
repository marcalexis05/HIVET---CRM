-- Additive PostgreSQL migration. Existing account rows, passwords and transactions are untouched.
-- The application also creates these tables with SQLAlchemy create_all on startup.
BEGIN;
CREATE TABLE IF NOT EXISTS auth_sessions (
    id VARCHAR(64) PRIMARY KEY,
    account_id INTEGER NOT NULL,
    role VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS account_access_locks (
    role VARCHAR(32) NOT NULL,
    account_id INTEGER NOT NULL,
    disabled_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    PRIMARY KEY (role, account_id)
);
COMMIT;
