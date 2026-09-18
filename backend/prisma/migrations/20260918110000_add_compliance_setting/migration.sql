CREATE TABLE "compliance_setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "target_hours" DECIMAL(7,2) NOT NULL DEFAULT 6.00,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_setting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "compliance_setting" ("id", "target_hours")
VALUES (1, 6.00);
