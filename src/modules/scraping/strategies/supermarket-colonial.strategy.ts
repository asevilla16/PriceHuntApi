import { SupermarketStrategy } from '../interfaces/supermarket-strategy.interface';
import { ScrapeProductDto } from '../dto/scrape-product.dto';
import { CategoryDto } from '../dto/category.dto';
import { SubCategoryDto } from '../dto/sub-category.dto';

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string;
  barcode: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  tags: string[];
  variants: ShopifyVariant[];
}

// supercolonial.com is a Shopify store; only these handles correspond to the
// real department categories shown on the storefront (the rest of
// /collections.json is promo/discount collections, e.g. "descuentos-*").
const DEPARTMENTS: { handle: string; name: string }[] = [
  { handle: 'abarrotes', name: 'Abarrotes' },
  { handle: 'bebidas-alcoholicas', name: 'Bebidas Alcohólicas' },
  { handle: 'bebidas-no-alcoholicas', name: 'Bebidas No Alcohólicas' },
  { handle: 'carnes-y-refrigerados', name: 'Carnes y Refrigerados' },
  { handle: 'colonial', name: 'Colonial To Go' },
  { handle: 'cuidado-personal', name: 'Cuidado Personal' },
  { handle: 'frutas-y-verduras', name: 'Frutas y Verduras' },
  { handle: 'hogar-y-limpieza', name: 'Hogar y Limpieza' },
  { handle: 'mascotas', name: 'Mascotas' },
  { handle: 'snack', name: 'Snacks' },
];

const PAGE_SIZE = 250;
const MAX_FETCH_ATTEMPTS = 3;
const SUPERMARKET_NAME = 'SuperColonial';

export class SupermarketColonialStrategy implements SupermarketStrategy {
  private baseUrl = 'https://supercolonial.com';

  private async fetchJson<T>(url: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error;

        if (attempt < MAX_FETCH_ATTEMPTS) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * attempt),
          );
        }
      }
    }

    throw new Error(
      `Failed to fetch "${url}" after ${MAX_FETCH_ATTEMPTS} attempts: ${lastError}`,
    );
  }

  private async fetchAllProductsForDepartment(
    handle: string,
  ): Promise<ShopifyProduct[]> {
    const products: ShopifyProduct[] = [];

    for (let page = 1; ; page++) {
      const url = `${this.baseUrl}/collections/${handle}/products.json?limit=${PAGE_SIZE}&page=${page}`;
      const data = await this.fetchJson<{ products: ShopifyProduct[] }>(url);

      if (!data.products || data.products.length === 0) {
        break;
      }

      products.push(...data.products);

      if (data.products.length < PAGE_SIZE) {
        break;
      }
    }

    return products;
  }

  // Some products have multiple variants (e.g. different pack sizes), each
  // with its own sku/price, so each variant becomes its own ScrapeProductDto.
  private toScrapeProducts(product: ShopifyProduct): ScrapeProductDto[] {
    return product.variants.map((variant) => ({
      name:
        variant.title && variant.title !== 'Default Title'
          ? `${product.title} - ${variant.title}`
          : product.title,
      price: parseFloat(variant.price),
      sku: variant.sku || undefined,
      barcode: variant.barcode || undefined,
      externalId: String(variant.id),
    }));
  }

  async fetchProducts(): Promise<CategoryDto[]> {
    const categories: CategoryDto[] = [];

    for (const department of DEPARTMENTS) {
      const products = await this.fetchAllProductsForDepartment(
        department.handle,
      );

      const subCategoriesByTag = new Map<string, SubCategoryDto>();

      for (const product of products) {
        const tagName = product.tags[0] || 'Otros';

        if (!subCategoriesByTag.has(tagName)) {
          subCategoriesByTag.set(tagName, {
            name: tagName,
            categoryName: department.name,
            products: [],
          });
        }

        subCategoriesByTag
          .get(tagName)
          .products.push(...this.toScrapeProducts(product));
      }

      categories.push({
        name: department.name,
        supermarket: SUPERMARKET_NAME,
        subCategories: Array.from(subCategoriesByTag.values()),
      });
    }

    return categories;
  }

  async scrapeCategories(): Promise<CategoryDto[]> {
    return DEPARTMENTS.map((department) => ({
      name: department.name,
      supermarket: SUPERMARKET_NAME,
      subCategories: [],
    }));
  }
}
