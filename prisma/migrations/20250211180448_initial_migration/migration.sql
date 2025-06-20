-- CreateTable
CREATE TABLE "Supermarket" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,

    CONSTRAINT "Supermarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "barcode" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupermarketProductMapping" (
    "id" TEXT NOT NULL,
    "supermarketId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SupermarketProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supermarket_name_key" ON "Supermarket"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "SupermarketProductMapping_supermarketId_externalId_key" ON "SupermarketProductMapping"("supermarketId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_mappingId_key" ON "Availability"("mappingId");

-- AddForeignKey
ALTER TABLE "SupermarketProductMapping" ADD CONSTRAINT "SupermarketProductMapping_supermarketId_fkey" FOREIGN KEY ("supermarketId") REFERENCES "Supermarket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupermarketProductMapping" ADD CONSTRAINT "SupermarketProductMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "SupermarketProductMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "SupermarketProductMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
