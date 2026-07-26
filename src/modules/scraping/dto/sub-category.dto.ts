import { ProductTypeDto } from './product-type.dto';
import { ScrapeProductDto } from './scrape-product.dto';

export class SubCategoryDto {
  name: string;
  categoryName: string;
  productTypes?: ProductTypeDto[];
  products?: ScrapeProductDto[];
}
