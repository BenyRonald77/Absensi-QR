CREATE TABLE "qr_token" (
    "id" UUID NOT NULL,
    "sesi_id" UUID NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "expired_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "qr_token_token_key" ON "qr_token"("token");
CREATE INDEX "qr_token_sesi_id_expired_at_idx" ON "qr_token"("sesi_id", "expired_at");

ALTER TABLE "qr_token" ADD CONSTRAINT "qr_token_sesi_id_fkey"
  FOREIGN KEY ("sesi_id") REFERENCES "sesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
