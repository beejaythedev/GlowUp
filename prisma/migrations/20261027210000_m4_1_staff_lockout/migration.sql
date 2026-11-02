-- M4-1: lock a staff account after repeated failed sign-in attempts.
ALTER TABLE "Staff" ADD COLUMN "failedSignInAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Staff" ADD COLUMN "lockedUntil" TIMESTAMP(3);
