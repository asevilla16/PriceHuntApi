-- DropForeignKey
ALTER TABLE "SubCategory" DROP CONSTRAINT "SubCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "SupermarketProductMapping" DROP CONSTRAINT "SupermarketProductMapping_productId_fkey";

-- DropForeignKey
ALTER TABLE "SupermarketProductMapping" DROP CONSTRAINT "SupermarketProductMapping_supermarketId_fkey";

-- AddForeignKey
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupermarketProductMapping" ADD CONSTRAINT "SupermarketProductMapping_supermarketId_fkey" FOREIGN KEY ("supermarketId") REFERENCES "Supermarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupermarketProductMapping" ADD CONSTRAINT "SupermarketProductMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
