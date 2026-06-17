-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `type` ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `beforeQty` INTEGER NOT NULL,
    `afterQty` INTEGER NOT NULL,
    `note` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `sourceWarehouse` VARCHAR(191) NULL,
    `destinationWarehouse` VARCHAR(191) NULL,
    `adjustmentReason` ENUM('DAMAGE', 'LOSS', 'RECOUNT', 'MANUAL') NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `userId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
