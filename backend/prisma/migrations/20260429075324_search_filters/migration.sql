-- AlterTable
ALTER TABLE `item` ADD COLUMN `expiryDate` DATETIME NULL;

-- CreateTable
CREATE TABLE `ItemBatch` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NOT NULL,
    `lotNumber` VARCHAR(191) NULL,
    `expiryDate` DATETIME NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ItemBatch` ADD CONSTRAINT `ItemBatch_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
