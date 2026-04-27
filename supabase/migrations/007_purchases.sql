-- =============================================
-- MIGRATION 007: PURCHASES TABLE FOR STRIPE
-- =============================================

-- Purchases table tracks user purchases of visa DIY guides
CREATE TABLE purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  visa_type text NOT NULL,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for efficient lookups
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_visa_type ON purchases(visa_type);
CREATE INDEX idx_purchases_user_visa ON purchases(user_id, visa_type);
CREATE INDEX idx_purchases_stripe_session ON purchases(stripe_checkout_session_id);
CREATE INDEX idx_purchases_status ON purchases(status);

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Service role policy (worker uses service key)
CREATE POLICY "Service role can manage purchases"
ON purchases FOR ALL
USING (true);

COMMENT ON TABLE purchases IS 'Tracks user purchases of visa DIY guides via Stripe';
COMMENT ON COLUMN purchases.stripe_checkout_session_id IS 'Stripe Checkout Session ID for tracking';
COMMENT ON COLUMN purchases.status IS 'Payment status: pending (checkout started), completed (paid), failed, refunded';
