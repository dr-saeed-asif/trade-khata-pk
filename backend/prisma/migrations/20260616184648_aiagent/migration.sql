-- DropForeignKey
ALTER TABLE "ScanHistory" DROP CONSTRAINT "ScanHistory_itemId_fkey";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "expiryMessage" TEXT,
ADD COLUMN     "weight" TEXT;

-- AddForeignKey
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
