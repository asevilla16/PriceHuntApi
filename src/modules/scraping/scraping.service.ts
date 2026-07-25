import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateScrapingDto } from './dto/create-scraping.dto';
import { UpdateScrapingDto } from './dto/update-scraping.dto';
import { SupermarketStrategyFactory } from './interfaces/supermarket-strategy.factory';
import { PrismaClient } from '@prisma/client';
import { CategoryDto } from './dto/category.dto';

// Metadata for each supermarket key recognized by SupermarketStrategyFactory.
// Add an entry here whenever a new strategy is wired up for scrapeProducts.
const SUPERMARKET_INFO: Record<string, { name: string; website: string }> = {
  SuperColonial: {
    name: 'SuperColonial',
    website: 'https://supercolonial.com/',
  },
};

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

  // Generic entry point for every SupermarketStrategy: fetches the
  // category/subCategory/product tree from the given strategy and persists
  // it into the shared Category/SubCategory/Product tables, tagging each
  // product with which supermarket it was found at via
  // SupermarketProductMapping.
  async scrapeProducts(supermarket: string) {
    const supermarketInfo = SUPERMARKET_INFO[supermarket];

    if (!supermarketInfo) {
      throw new Error(
        `No supermarket metadata configured for "${supermarket}"`,
      );
    }

    const strategy = SupermarketStrategyFactory.getStrategy(supermarket);
    const categories: CategoryDto[] = await strategy.fetchProducts();

    const supermarketRecord = await this.supermarket.upsert({
      where: { name: supermarketInfo.name },
      update: {},
      create: supermarketInfo,
    });

    const insertedProducts = [];

    for (const category of categories) {
      const categoryRecord = await this.category.upsert({
        where: { name: category.name },
        update: {},
        create: { name: category.name },
      });

      for (const subCategory of category.subCategories) {
        const subCategoryRecord = await this.subCategory.upsert({
          where: {
            categoryId_name: {
              categoryId: categoryRecord.id,
              name: subCategory.name,
            },
          },
          update: {},
          create: { name: subCategory.name, categoryId: categoryRecord.id },
        });

        for (const product of subCategory.products) {
          const productRecord = product.barcode
            ? await this.product.upsert({
                where: { barcode: product.barcode },
                update: {
                  name: product.name,
                  sku: product.sku,
                  subCategoryId: subCategoryRecord.id,
                },
                create: {
                  name: product.name,
                  sku: product.sku,
                  barcode: product.barcode,
                  subCategoryId: subCategoryRecord.id,
                },
              })
            : await (async () => {
                const existing = await this.product.findFirst({
                  where: {
                    name: product.name,
                    subCategoryId: subCategoryRecord.id,
                  },
                });

                return (
                  existing ??
                  this.product.create({
                    data: {
                      name: product.name,
                      sku: product.sku,
                      subCategoryId: subCategoryRecord.id,
                    },
                  })
                );
              })();

          const mapping = await this.supermarketProductMapping.upsert({
            where: {
              supermarketId_externalId: {
                supermarketId: supermarketRecord.id,
                externalId: product.externalId,
              },
            },
            update: { name: product.name, productId: productRecord.id },
            create: {
              supermarketId: supermarketRecord.id,
              externalId: product.externalId,
              name: product.name,
              productId: productRecord.id,
            },
          });

          await this.priceHistory.create({
            data: { mappingId: mapping.id, price: product.price },
          });

          insertedProducts.push(productRecord);
        }
      }
    }

    this.logger.log(
      `${supermarketInfo.name} scrape finished: ${insertedProducts.length} products processed`,
    );

    return insertedProducts;
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
