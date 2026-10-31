-- Receipt confirmation is separate from delivery status; existing orders and balances are unchanged.
BEGIN;
CREATE TABLE IF NOT EXISTS customer_order_receipts (
    order_id INTEGER PRIMARY KEY REFERENCES orders(id),
    customer_id INTEGER NOT NULL,
    received_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    points_awarded INTEGER NOT NULL DEFAULT 0,
    previous_points_awarded INTEGER NOT NULL DEFAULT 0
);
COMMIT;
