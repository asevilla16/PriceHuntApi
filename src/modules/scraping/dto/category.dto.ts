import { SubCategoryDto } from './sub-category.dto';

export class CategoryDto {
  name: string;
  id?: string;
  supermarket: string;
  subCategories: SubCategoryDto[];
}
