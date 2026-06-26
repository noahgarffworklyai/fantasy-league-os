ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" varchar(255);
