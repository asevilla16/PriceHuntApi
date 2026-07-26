import {
  ProductType,
  SubCategory,
  SupermarketProductMapping,
} from '@prisma/client';
import { Brand } from './brand.entity';

export class Product {
  id: string;
  name: string;
  brandId: string;
  brand: Brand;
  sku: string;
  barcode: string;
  mappings: SupermarketProductMapping[];
  productType: ProductType;
  productTypeId: string;
  subCategory: SubCategory;
  subCategoryId: string;
}
