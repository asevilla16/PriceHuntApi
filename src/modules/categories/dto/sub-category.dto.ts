import { ProductTypeDto } from './product-type.dto';

export class SubCategoryDto {
  title: string;
  subCategoryTypes?: ProductTypeDto[];
}
