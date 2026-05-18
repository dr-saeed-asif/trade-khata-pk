-- AlterTable
ALTER TABLE `Item`
  ADD COLUMN `barcodeValue` VARCHAR(191) NULL;

-- Backfill
UPDATE `Item`
SET `barcodeValue` = UPPER(TRIM(`sku`))
WHERE `barcodeValue` IS NULL;

-- Finalize
ALTER TABLE `Item`
  MODIFY `barcodeValue` VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX `Item_barcodeValue_key`(`barcodeValue`);
