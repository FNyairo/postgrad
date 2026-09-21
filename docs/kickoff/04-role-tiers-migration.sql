-- PGSTS — role tiers migration
--
-- Run this ONCE in phpMyAdmin (SQL tab) against derevapr_pgsts, before
-- deploying the build that adds the VIEWER role. It is additive only: no
-- column is dropped, no row is rewritten, and running it against a database
-- that already has these changes will fail harmlessly on the first statement
-- rather than damaging anything.
--
-- Target: MySQL 8.0 / MariaDB 10.6+.

-- ---------------------------------------------------------------------------
-- 1. VIEWER role
-- ---------------------------------------------------------------------------
-- Prisma maps `enum Role` to a MySQL ENUM column, so adding a value means
-- redeclaring the full list. The order below must match prisma/schema.prisma.
ALTER TABLE `staff_users`
  MODIFY COLUMN `role` ENUM('COORDINATOR','CHAIRPERSON','SUPER_ADMIN','VIEWER')
  NOT NULL DEFAULT 'COORDINATOR';

-- ---------------------------------------------------------------------------
-- 2. Per-account export grant
-- ---------------------------------------------------------------------------
-- Read-only roles may look at the register without being able to take a copy
-- away. Coordinators and super admins ignore this flag and can always export.
-- Default 0 means a newly created viewer starts without export.
ALTER TABLE `staff_users`
  ADD COLUMN `allowExport` TINYINT(1) NOT NULL DEFAULT 0 AFTER `totpEnabled`;

-- ---------------------------------------------------------------------------
-- 3. Share-token purpose
-- ---------------------------------------------------------------------------
-- Account-setup links reuse share_tokens rather than getting a table of their
-- own; `purpose` is what keeps the two kinds apart. Existing rows are all
-- share links, hence the default.
--
-- NOTE: the account-setup flow that consumes ACCOUNT_SETUP is not built yet
-- (TOTP enrolment and email delivery are deferred). This column is added now
-- so the migration is a single trip to phpMyAdmin rather than two.
ALTER TABLE `share_tokens`
  ADD COLUMN `purpose` ENUM('SHARE','ACCOUNT_SETUP') NOT NULL DEFAULT 'SHARE' AFTER `label`;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- Expect: role showing four values, allowExport present, purpose present.
-- SHOW COLUMNS FROM `staff_users` LIKE 'role';
-- SHOW COLUMNS FROM `staff_users` LIKE 'allowExport';
-- SHOW COLUMNS FROM `share_tokens` LIKE 'purpose';
