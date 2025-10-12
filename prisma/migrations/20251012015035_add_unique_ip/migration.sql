/*
  Warnings:

  - A unique constraint covering the columns `[ip_address]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."users_ip_address_idx";

-- CreateIndex
CREATE UNIQUE INDEX "users_ip_address_key" ON "users"("ip_address");
