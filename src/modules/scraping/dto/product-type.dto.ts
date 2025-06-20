import { ScrapeProductDto } from './scrape-product.dto';

export class ProductTypeDto {
  id?: string;
  name?: string;
  products: ScrapeProductDto[];
}
