import { SupermarketStrategy } from '../interfaces/supermarket-strategy.interface';
import { ScrapeProductDto } from '../dto/scrape-product.dto';
import { CategoryDto } from '../dto/category.dto';
import { SubCategoryDto } from '../dto/sub-category.dto';
import { fetchJson } from '../utils/fetch-json.util';

interface LosAndesProduct {
  code: string; // e.g. "0001-000841097103378" -> "<businessPartner>-<zero-padded barcode>"
  name: string;
  price: number;
  oldPrice: number | null;
  materialGroupCode: string;
  materialGroupName: string;
}

interface LosAndesPaginateResponse {
  totalItems: number;
  data: LosAndesProduct[];
}

// comisariatolosandes.com is an Angular SPA backed by the "AVE Applications"
// vendor platform at andes.aveapplications.com. These are the 4 top-level
// department codes shown in the site's "Categorias" menu; each product
// carries its own more specific materialGroupCode/materialGroupName, which
// is what we classify it under (mirrors how SuperColonial/LaColonia use the
// product's own category/tag field rather than the query used to find it).
const DEPARTMENTS: { groupCode: string; name: string }[] = [
  { groupCode: '1100', name: 'PERECEDEROS' },
  { groupCode: '1200', name: 'NO PERECEDEROS' },
  { groupCode: '1300', name: 'NO ALIMENTOS' },
  { groupCode: '1400', name: 'MASCOTAS' },
];

const PAGE_SIZE = 250;
const SUPERMARKET_NAME = 'LosAndes';
const BASE_URL = 'https://andes.aveapplications.com';

export class SupermarketLosAndesStrategy implements SupermarketStrategy {
  private async fetchAllProductsForDepartment(
    groupCode: string,
  ): Promise<LosAndesProduct[]> {
    const products: LosAndesProduct[] = [];

    for (let skip = 0; ; skip += PAGE_SIZE) {
      const url = `${BASE_URL}/api/em/material/paginate?skip=${skip}&take=${PAGE_SIZE}`;
      const data = await fetchJson<LosAndesPaginateResponse>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessPartner: 1,
          storeId: null,
          groupCode,
          officeCode: '0',
          type: 'PD',
          sortBy: 'name',
          sortOption: 'ASC',
          search: '',
          filter: {
            priceMin: null,
            priceMax: null,
            brand: null,
            supplier: null,
            bulletPoint: null,
            agency: null,
          },
          source: 'WEB',
          hidden: '0',
        }),
      });

      if (!data.data || data.data.length === 0) {
        break;
      }

      products.push(...data.data);

      if (data.data.length < PAGE_SIZE) {
        break;
      }
    }

    return products;
  }

  // `code` is "<businessPartner>-<zero-padded barcode>" (confirmed against
  // the product images' filenames, which embed the same barcode unpadded).
  private deriveBarcode(code: string): string | undefined {
    const barcode = code.split('-')[1]?.replace(/^0+/, '');
    return barcode || undefined;
  }

  private toScrapeProduct(product: LosAndesProduct): ScrapeProductDto {
    return {
      name: product.name,
      price: product.price,
      listPrice: product.oldPrice ?? undefined,
      sku: product.code,
      barcode: this.deriveBarcode(product.code),
      externalId: product.code,
    };
  }

  async fetchProducts(): Promise<CategoryDto[]> {
    const categories: CategoryDto[] = [];

    for (const department of DEPARTMENTS) {
      const products = await this.fetchAllProductsForDepartment(
        department.groupCode,
      );

      const subCategoriesByGroup = new Map<string, SubCategoryDto>();

      for (const product of products) {
        const groupName = product.materialGroupName || 'Otros';

        if (!subCategoriesByGroup.has(groupName)) {
          subCategoriesByGroup.set(groupName, {
            name: groupName,
            categoryName: department.name,
            products: [],
          });
        }

        subCategoriesByGroup.get(groupName).products.push(
          this.toScrapeProduct(product),
        );
      }

      categories.push({
        name: department.name,
        supermarket: SUPERMARKET_NAME,
        subCategories: Array.from(subCategoriesByGroup.values()),
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
