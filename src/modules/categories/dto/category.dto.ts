import { SubCategoryDto } from './sub-category.dto';

export class CategoryDto {
  title: string;
  id: string;
  subCategories: SubCategoryDto[];
}
