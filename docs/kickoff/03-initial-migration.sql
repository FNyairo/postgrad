-- CreateTable
CREATE TABLE `students` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `regNumber` VARCHAR(50) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `programme` VARCHAR(150) NOT NULL,
    `programmeSlug` VARCHAR(150) NOT NULL,
    `degreeLevel` VARCHAR(80) NOT NULL,
    `degreeLevelSlug` VARCHAR(80) NOT NULL,
    `yearAdmission` INTEGER NOT NULL,
    `programmeDurationYears` SMALLINT NULL,
    `researchTitle` TEXT NOT NULL,
    `supervisors` VARCHAR(255) NOT NULL,
    `researchStage` VARCHAR(120) NOT NULL,
    `researchStageSlug` VARCHAR(120) NOT NULL,
    `noticeAcknowledgedAt` DATETIME(3) NOT NULL,
    `noticeVersion` VARCHAR(20) NOT NULL,
    `lawfulBasis` VARCHAR(40) NOT NULL,
    `graduatedAt` DATETIME(3) NULL,
    `retentionUntil` DATETIME(3) NOT NULL,
    `retentionBasis` VARCHAR(60) NOT NULL,
    `submissionIpHash` VARCHAR(64) NOT NULL,
    `userAgentHash` VARCHAR(64) NULL,
    `lastEditedAt` DATETIME(3) NULL,
    `lastEditedById` VARCHAR(30) NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedById` VARCHAR(30) NULL,
    `deletionReason` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `students_regNumber_key`(`regNumber`),
    UNIQUE INDEX `students_email_key`(`email`),
    INDEX `students_programmeSlug_idx`(`programmeSlug`),
    INDEX `students_degreeLevelSlug_idx`(`degreeLevelSlug`),
    INDEX `students_researchStageSlug_idx`(`researchStageSlug`),
    INDEX `students_yearAdmission_idx`(`yearAdmission`),
    INDEX `students_createdAt_idx`(`createdAt`),
    INDEX `students_retentionUntil_idx`(`retentionUntil`),
    INDEX `students_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taxonomy` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('PROGRAMME', 'DEGREE_LEVEL', 'RESEARCH_STAGE') NOT NULL,
    `slug` VARCHAR(150) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `aliases` TEXT NULL,
    `durationYears` SMALLINT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `taxonomy_kind_active_sortOrder_idx`(`kind`, `active`, `sortOrder`),
    UNIQUE INDEX `taxonomy_kind_slug_key`(`kind`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `role` ENUM('COORDINATOR', 'CHAIRPERSON', 'SUPER_ADMIN') NOT NULL DEFAULT 'COORDINATOR',
    `passwordHash` VARCHAR(255) NOT NULL,
    `totpSecretEnc` VARCHAR(255) NULL,
    `totpEnabled` BOOLEAN NOT NULL DEFAULT false,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `failedLogins` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `disabledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `staff_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recovery_codes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(255) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `recovery_codes_userId_usedAt_idx`(`userId`, `usedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipHash` VARCHAR(64) NOT NULL,
    `userAgent` VARCHAR(255) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sessions_userId_idx`(`userId`),
    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `share_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `role` ENUM('COORDINATOR', 'CHAIRPERSON', 'SUPER_ADMIN') NOT NULL DEFAULT 'CHAIRPERSON',
    `allowExport` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `maxUses` INTEGER NULL,
    `useCount` INTEGER NOT NULL DEFAULT 0,
    `lastUsedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `share_tokens_tokenHash_key`(`tokenHash`),
    INDEX `share_tokens_expiresAt_idx`(`expiresAt`),
    INDEX `share_tokens_revokedAt_idx`(`revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_subject_requests` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'OBJECTION') NOT NULL,
    `requesterEmail` VARCHAR(150) NOT NULL,
    `requesterName` VARCHAR(150) NULL,
    `regNumber` VARCHAR(50) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verificationMethod` VARCHAR(60) NULL,
    `status` ENUM('RECEIVED', 'AWAITING_VERIFICATION', 'IN_PROGRESS', 'FULFILLED', 'REFUSED', 'WITHDRAWN') NOT NULL DEFAULT 'RECEIVED',
    `dueAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolutionNote` TEXT NULL,
    `handledById` VARCHAR(30) NULL,
    `requestIpHash` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `data_subject_requests_status_dueAt_idx`(`status`, `dueAt`),
    INDEX `data_subject_requests_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `newsletter_subscribers` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `fullName` VARCHAR(150) NULL,
    `status` VARCHAR(40) NULL,
    `consentGivenAt` DATETIME(3) NOT NULL,
    `consentVersion` VARCHAR(20) NOT NULL,
    `consentIpHash` VARCHAR(64) NOT NULL,
    `doubleOptInTokenHash` VARCHAR(64) NULL,
    `doubleOptInSentAt` DATETIME(3) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `unsubscribedAt` DATETIME(3) NULL,
    `unsubscribeTokenHash` VARCHAR(64) NOT NULL,
    `suppressedUntil` DATETIME(3) NULL,
    `source` VARCHAR(60) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `newsletter_subscribers_email_key`(`email`),
    UNIQUE INDEX `newsletter_subscribers_unsubscribeTokenHash_key`(`unsubscribeTokenHash`),
    INDEX `newsletter_subscribers_confirmedAt_idx`(`confirmedAt`),
    INDEX `newsletter_subscribers_unsubscribedAt_idx`(`unsubscribedAt`),
    INDEX `newsletter_subscribers_doubleOptInSentAt_idx`(`doubleOptInSentAt`),
    INDEX `newsletter_subscribers_suppressedUntil_idx`(`suppressedUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorType` VARCHAR(20) NOT NULL,
    `actorId` VARCHAR(30) NULL,
    `action` VARCHAR(60) NOT NULL,
    `targetType` VARCHAR(40) NULL,
    `targetId` VARCHAR(30) NULL,
    `metadata` JSON NULL,
    `changeReason` VARCHAR(255) NULL,
    `ipHash` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actorId_idx`(`actorId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    INDEX `audit_logs_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limits` (
    `id` VARCHAR(191) NOT NULL,
    `bucketKey` VARCHAR(64) NOT NULL,
    `windowStart` DATETIME(3) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `rate_limits_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `rate_limits_bucketKey_windowStart_key`(`bucketKey`, `windowStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_runs` (
    `id` VARCHAR(191) NOT NULL,
    `jobName` VARCHAR(60) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `status` VARCHAR(20) NOT NULL,
    `affected` INTEGER NOT NULL DEFAULT 0,
    `error` TEXT NULL,

    INDEX `job_runs_jobName_startedAt_idx`(`jobName`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recovery_codes` ADD CONSTRAINT `recovery_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `staff_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `staff_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `share_tokens` ADD CONSTRAINT `share_tokens_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `staff_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

