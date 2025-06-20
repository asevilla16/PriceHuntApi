export class ScrapeProductDto {
  name: string;
  brandId?: string;
  sku?: string;
  barcode?: string;
  supermarketId?: string;
  externalId?: string;
  price: number;
  productTypeId?: string;
  subCategoryId?: string;
}
