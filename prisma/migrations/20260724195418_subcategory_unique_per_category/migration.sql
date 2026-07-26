-- DropIndex
DROP INDEX "SubCategory_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_categoryId_name_key" ON "SubCategory"("categoryId", "name");

