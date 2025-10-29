-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verification_sent_at" TIMESTAMP(3),
ADD COLUMN     "verification_token" TEXT,
ADD COLUMN     "verification_token_expiry" TIMESTAMP(3);
