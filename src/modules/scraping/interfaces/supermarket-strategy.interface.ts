export interface SupermarketStrategy {
  scrapeCategories(): Promise<any[]>;
  fetchProducts(): Promise<any[]>;
}
