-- CreateTable
CREATE TABLE `Warehouse` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL,

    UNIQUE INDEX `Warehouse_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorageLocation` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shelf` VARCHAR(191) NOT NULL,
    `rack` VARCHAR(191) NOT NULL,
    `bin` VARCHAR(191) NOT NULL,
    `qrValue` VARCHAR(191) NOT NULL,
    `barcodeValue` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL,

    UNIQUE INDEX `StorageLocation_qrValue_key`(`qrValue`),
    UNIQUE INDEX `StorageLocation_barcodeValue_key`(`barcodeValue`),
    UNIQUE INDEX `StorageLocation_warehouseId_shelf_rack_bin_key`(`warehouseId`, `shelf`, `rack`, `bin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Item` ADD COLUMN `locationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Item_locationId_idx` ON `Item`(`locationId`);

-- AddForeignKey
ALTER TABLE `StorageLocation` ADD CONSTRAINT `StorageLocation_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `StorageLocation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
