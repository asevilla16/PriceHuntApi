import { SupermarketStrategy } from '../interfaces/supermarket-strategy.interface';
import { ScrapeProductDto } from '../dto/scrape-product.dto';
import { CategoryDto } from '../dto/category.dto';
import { SubCategoryDto } from '../dto/sub-category.dto';
import { fetchJson } from '../utils/fetch-json.util';

interface VtexCategoryNode {
  id: number;
  name: string;
  url: string;
  children: VtexCategoryNode[];
}

interface VtexSeller {
  commertialOffer: {
    Price: number;
    ListPrice: number;
    IsAvailable: boolean;
  };
}

interface VtexItem {
  itemId: string;
  name: string;
  ean: string;
  sellers: VtexSeller[];
}

interface VtexProduct {
  productId: string;
  productName: string;
  categories: string[]; // e.g. ["/Supermercado/Abarrotes/Galletas/", "/Supermercado/Abarrotes/", "/Supermercado/"]
  items: VtexItem[];
}

const PAGE_SIZE = 50;
const SUPERMARKET_NAME = 'LaColonia';
const BASE_URL = 'https://www.lacolonia.com';

// "Canastas de Productos" is a merchandising bucket, not a real leaf
// category: every product found there is also listed under its own actual
// subcategory (e.g. a mustard jar also shows up here, but its authoritative
// category is "Salsas, Aderezos y Toppings"). Products are re-classified by
// their own `categories` field regardless, so skipping this one is purely to
// avoid crawling ~3k redundant listings.
const EXCLUDED_SUBCATEGORY_NAMES = new Set(['Canastas de Productos']);

export class SupermarketLaColoniaStrategy implements SupermarketStrategy {
  private async fetchCategoryTree(): Promise<VtexCategoryNode[]> {
    const tree = await fetchJson<VtexCategoryNode[]>(
      `${BASE_URL}/api/catalog_system/pub/category/tree/5`,
    );

    // The store has a single root department ("Supermercado"); its direct
    // children are the real top-level categories.
    return tree[0]?.children ?? [];
  }

  private slugFromUrl(url: string): string {
    return url.replace(`${BASE_URL}/`, '');
  }

  private async fetchAllProductsForSubCategory(
    path: string,
  ): Promise<VtexProduct[]> {
    const products: VtexProduct[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      const to = from + PAGE_SIZE - 1;
      const url = `${BASE_URL}/api/catalog_system/pub/products/search/${path}?_from=${from}&_to=${to}&map=c,c,c`;
      const data = await fetchJson<VtexProduct[]>(url);

      if (!data || data.length === 0) {
        break;
      }

      products.push(...data);

      if (data.length < PAGE_SIZE) {
        break;
      }
    }

    return products;
  }

  // A product's own `categories[0]` is its authoritative classification
  // (e.g. "/Supermercado/Abarrotes/Galletas/"), which is what we file it
  // under -- not the subcategory URL that was crawled to discover it.
  private authoritativeCategoryNames(product: VtexProduct): {
    categoryName: string;
    subCategoryName: string;
  } | null {
    const primary = product.categories[0];
    if (!primary) return null;

    const parts = primary.split('/').filter(Boolean);
    // parts === ["Supermercado", "<category>", "<subcategory>"]
    if (parts.length < 3) return null;

    return { categoryName: parts[1], subCategoryName: parts[2] };
  }

  // Each VTEX item (SKU) becomes its own ScrapeProductDto, mirroring how
  // SupermarketColonialStrategy expands Shopify variants.
  private toScrapeProducts(product: VtexProduct): ScrapeProductDto[] {
    return product.items.map((item) => {
      const offer = item.sellers[0]?.commertialOffer;

      return {
        name:
          item.name && item.name !== product.productName
            ? `${product.productName} - ${item.name}`
            : product.productName,
        price: offer?.Price ?? 0,
        listPrice: offer?.ListPrice ?? undefined,
        sku: item.itemId,
        barcode: item.ean || undefined,
        externalId: item.itemId,
      };
    });
  }

  async fetchProducts(): Promise<CategoryDto[]> {
    const tree = await this.fetchCategoryTree();
    const categoriesByName = new Map<string, Map<string, SubCategoryDto>>();
    const seenItemIds = new Set<string>();

    for (const category of tree) {
      for (const subCategory of category.children) {
        if (EXCLUDED_SUBCATEGORY_NAMES.has(subCategory.name)) {
          continue;
        }

        const path = this.slugFromUrl(subCategory.url);
        const products = await this.fetchAllProductsForSubCategory(path);

        for (const product of products) {
          const authoritative = this.authoritativeCategoryNames(product);
          if (!authoritative) continue;

          const { categoryName, subCategoryName } = authoritative;

          if (!categoriesByName.has(categoryName)) {
            categoriesByName.set(categoryName, new Map());
          }
          const subCategories = categoriesByName.get(categoryName);

          if (!subCategories.has(subCategoryName)) {
            subCategories.set(subCategoryName, {
              name: subCategoryName,
              categoryName,
              products: [],
            });
          }

          for (const scrapeProduct of this.toScrapeProducts(product)) {
            if (seenItemIds.has(scrapeProduct.externalId)) continue;
            seenItemIds.add(scrapeProduct.externalId);
            subCategories.get(subCategoryName).products.push(scrapeProduct);
          }
        }
      }
    }

    return Array.from(categoriesByName.entries()).map(
      ([categoryName, subCategories]) => ({
        name: categoryName,
        supermarket: SUPERMARKET_NAME,
        subCategories: Array.from(subCategories.values()),
      }),
    );
  }

  async scrapeCategories(): Promise<CategoryDto[]> {
    const tree = await this.fetchCategoryTree();

    return tree.map((category) => ({
      name: category.name,
      supermarket: SUPERMARKET_NAME,
      subCategories: [],
    }));
  }
}
