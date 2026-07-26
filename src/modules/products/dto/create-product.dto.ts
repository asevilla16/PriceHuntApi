export class CreateProductDto {
  name: string;
  brandId?: string;
  sku?: string;
  barcode?: string;
  productTypeId?: string;
  subCategoryId?: string;
}
