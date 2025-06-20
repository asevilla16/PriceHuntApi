import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateScrapingDto } from './dto/create-scraping.dto';
import { UpdateScrapingDto } from './dto/update-scraping.dto';
import { SupermarketStrategyFactory } from './interfaces/supermarket-strategy.factory';
import { PrismaClient } from '@prisma/client';
import { CategoryDto } from './dto/category.dto';

@Injectable()
export class ScrapingService extends PrismaClient implements OnModuleInit {
  private logger = new Logger('ScrapingService');
  async onModuleInit() {
    this.$connect();
    this.logger.log('Database connected');
  }

  create(createScrapingDto: CreateScrapingDto) {
    return 'This action adds a new scraping';
  }

  async scrapeAllProducts(supermarket: string) {
    return await this.$transaction(async (tx) => {
      const strategy = SupermarketStrategyFactory.getStrategy(supermarket);
      const categoriesWithProducts: CategoryDto[] =
        await strategy.fetchProducts();

      const categoriesData = categoriesWithProducts.map((cat) => ({
        name: cat.name,
      }));

      // Step 1: Insert categories
      const insertedCategories = await tx.category.createManyAndReturn({
        data: categoriesData,
        skipDuplicates: true,
      });

      // Step 2: Arrange subCategories data
      const subCategoriesData = [];
      categoriesWithProducts.forEach((cat, idx) => {
        const categoryId = insertedCategories[idx]?.id;
        cat.subCategories.forEach((subCat) => {
          subCategoriesData.push({
            name: subCat.name,
            categoryId: categoryId,
          });
        });
      });

      // Step 3: Insert subCategories
      const insertedSubCategories = await tx.subCategory.createManyAndReturn({
        data: subCategoriesData,
        skipDuplicates: true,
      });

      // Step 4: Arrange productTypes data
      const productTypesData = [];
      categoriesWithProducts.forEach((cat, index) => {
        const categoryId = insertedCategories[index]?.id;
        cat.subCategories.forEach((subCat, idx) => {
          const subCategoryId = insertedSubCategories[idx]?.id;
          subCat.productTypes.forEach((prodType) => {
            productTypesData.push({
              name: prodType.name,
              subCategoryId: subCategoryId,
            });
          });
        });
      });

      // Step 5: Insert productTypes
      const insertedProductTypes = await tx.productType.createManyAndReturn({
        data: productTypesData,
        skipDuplicates: true,
      });

      // Step 6: Arrange products data
      const productsData = [];
      categoriesWithProducts.forEach((cat, index) => {
        const categoryId = insertedCategories[index]?.id;
        cat.subCategories.forEach((subCat, idx) => {
          const subCategoryId = insertedSubCategories[idx]?.id;
          subCat.productTypes.forEach((prodType, i) => {
            const productTypeId = insertedProductTypes[i]?.id;
            prodType.products.forEach((product) => {
              productsData.push({
                name: product.name,
                subCategoryId: subCategoryId ?? '',
                productTypeId: productTypeId ?? '',
                brandId: product.brandId ?? '',
                sku: product.sku ?? '',
                externalId: product.externalId ?? '',
              });
            });
          });
        });
      });

      // Step 7: Insert products
      const insertedProducts = await tx.product.createManyAndReturn({
        data: productsData,
        skipDuplicates: true,
      });
    });
  }

  async scrapeProducts(supermarket: string) {
    const strategy = SupermarketStrategyFactory.getStrategy(supermarket);
    const categoryWithProducts = await strategy.fetchProducts();

    if (categoryWithProducts.length > 0) {
      categoryWithProducts.forEach(async (cat) => {
        const category = await this.category.findFirst({
          where: { name: cat.category.name },
          include: {
            subCategories: true,
          },
        });

        if (!category) {
          const newCategory = await this.category.create({
            data: {
              name: cat.name,
            },
          });

          for (const subCategory of cat?.subCategories) {
            const subCategoryExists = category.subCategories.find(
              (sc) => sc.name === subCategory.name,
            );

            if (!subCategoryExists) {
              const newSubCategory = await this.subCategory.create({
                data: {
                  name: subCategory.name,
                  categoryId: category.id,
                },
              });
              for (const product of subCategory.products) {
                const prod = this.product.create({
                  data: {
                    name: product.name,
                    subCategoryId: newSubCategory.id,
                  },
                });

                const productMapping = this.supermarketProductMapping.create({
                  data: {
                    productId: product.id,
                    supermarketId: supermarket,
                    externalId: product.externalId ?? '',
                    name: product.name,
                  },
                });

                const priceHistoryRegistry = this.priceHistory.create({
                  data: {
                    mappingId: product.id,
                    price: product.price,
                  },
                });
              }
            }
          }
        }
      });
    }

    return categoryWithProducts;
  }

  async scrapeCategories(createScrapingDto: CreateScrapingDto) {
    const strategy = SupermarketStrategyFactory.getStrategy(
      createScrapingDto.supermarket,
    );
    const categories = await strategy.scrapeCategories();

    return categories;
  }

  findOne(id: number) {
    return `This action returns a #${id} scraping`;
  }

  update(id: number, updateScrapingDto: UpdateScrapingDto) {
    return `This action updates a #${id} scraping`;
  }

  remove(id: number) {
    return `This action removes a #${id} scraping`;
  }
}
