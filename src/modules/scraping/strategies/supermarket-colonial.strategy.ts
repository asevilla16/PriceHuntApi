import { Product } from '@prisma/client';
import { SupermarketStrategy } from '../interfaces/supermarket-strategy.interface';
import puppeteer from 'puppeteer';
import { ScrapeProductDto } from '../dto/scrape-product.dto';
import { CategoryDto } from '../dto/category.dto';

export class SupermarketColonialStrategy implements SupermarketStrategy {
  async autoScroll(page): Promise<any> {
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        let totalHeight = 0;
        let distance = 100; // px
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          // Wait a bit to let new content load
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve(0);
          }
        }, 100);
      });
    });
  }

  async fetchProducts(): Promise<any> {
    // Launch Puppeteer browser
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.lacolonia.com/', {
      waitUntil: 'networkidle2',
    });

    // Wait for the mega menu button to be visible
    const selector = '.vtex-flex-layout-0-x-flexColChild--search-mega-menu';

    await page.waitForSelector(selector, {
      visible: true,
      timeout: 10000,
    });

    console.log('Selector found:', selector);

    await page.click(selector);

    //Wait for sidebar menu to be visible
    const linkSelector = '.vtex-mega-menu-2-x-menuItemVertical';

    await page.waitForSelector(linkSelector, {
      visible: true,
      timeout: 10000,
    });

    // Get all main categories
    const categories = await page.$$(linkSelector);

    let categoryNames: CategoryDto[] = [];

    // Loop through each main category
    for (let i = 5; i <= 5; i++) {
      console.time(`Visiting main category ${i + 1}/${categories.length}`);
      const currentElements = await page.$$(linkSelector);

      const element = currentElements[i];
      const text = await element.evaluate((el) => el.textContent?.trim());

      // Click on the main category
      await Promise.all([
        element.click(),
        page
          .waitForNavigation({ waitUntil: 'domcontentloaded' })
          .catch(() => {}),
      ]);
      console.log('clicked main category');

      await page.waitForSelector('.vtex-mega-menu-2-x-submenuListVertical', {
        visible: true,
        timeout: 10000, // Wait 60 seconds instead of 30
      });

      // Get all subcategories
      const subCategories = await page.$$(
        '.vtex-mega-menu-2-x-submenuListVertical .vtex-mega-menu-2-x-submenuItemVertical',
      );

      let categoryFieldWithSubCategories: CategoryDto = {
        name: text,
        supermarket: 'La Colonia',
        subCategories: [],
      };

      for (let j = 0; j < subCategories.length; j++) {
        console.log('starting sub category');
        await page.waitForSelector(
          '.vtex-mega-menu-2-x-submenuListVertical .vtex-mega-menu-2-x-submenuItemVertical',
          { visible: true, timeout: 30000 },
        );
        const subCategoriesList = await page.$$(
          '.vtex-mega-menu-2-x-submenuListVertical .vtex-mega-menu-2-x-submenuItemVertical',
        );
        const subCategory = subCategoriesList[j];
        const productGallerySelector = '#gallery-layout-container';
        const subText = await subCategory.evaluate((el) =>
          el.textContent?.trim(),
        );

        await Promise.all([
          subCategory.click(),
          page
            .waitForNavigation({ waitUntil: 'domcontentloaded' })
            .catch(() => {}),
        ]);
        console.log('clicked sub category');

        let products: ScrapeProductDto[] = [];

        try {
          await page.waitForSelector(productGallerySelector, {
            visible: true,
            timeout: 0, // Wait 60 seconds instead of 30
          });

          // Scroll to the bottom to load all products
          await this.autoScroll(page);

          // Wait for products to load
          await page.waitForSelector(
            '#gallery-layout-container > .vtex-search-result-3-x-galleryItem',
            {
              visible: true,
              timeout: 0, // Wait 60 seconds instead of 30
            },
          );

          // Get all products in the subcategory
          products = await page.evaluate(() => {
            const items = Array.from(
              document.querySelectorAll(
                '#gallery-layout-container > .vtex-search-result-3-x-galleryItem',
              ),
            );
            return items.map((item: HTMLElement) => {
              // Extract product details
              const priceContainer = '.vtex-product-price-1-x-sellingPrice';
              const priceBeforeDiscount = '.vtex-product-price-1-x-listPrice';
              const name =
                item.querySelector('.product-name-h2')?.textContent?.trim() ||
                '';

              const price =
                item
                  .querySelector('.vtex-product-price-1-x-currencyInteger')
                  ?.textContent?.trim() || '';
              const priceCents =
                item
                  .querySelector('.vtex-product-price-1-x-currencyFraction')
                  ?.textContent?.trim() || '';
              // const image = (
              //   item.querySelector(
              //     '.vtex-product-summary-2-x-imageContainer > img',
              //   ) as HTMLImageElement | null
              // )?.src;
              return { name, price: parseFloat(`${price}.${priceCents}`) };
            });
          });
        } catch (error) {
          console.warn(`Subcategory "${subText}" not found or empty.`);
        }

        if (subText) {
          categoryFieldWithSubCategories.subCategories.push({
            name: subText.split('Ver')[0],
            products: products || [],
            categoryName: text,
          });
        }

        console.log(JSON.stringify(categoryFieldWithSubCategories, null, 2));

        await page.waitForSelector(selector);
        await page.click(selector);
        console.time('waiting for main category to be visible');
        await page.waitForSelector(linkSelector, {
          visible: true,
          timeout: 10000, // Wait 60 seconds instead of 30
        });
        console.timeEnd('waiting for main category to be visible');

        // Re-click the main category to return to the main menu
        const currentCategoryElements = await page.$$(linkSelector);

        const categoryElement = currentCategoryElements[i];
        await Promise.all([
          categoryElement.click(),
          page
            .waitForNavigation({ waitUntil: 'domcontentloaded' })
            .catch(() => {}),
        ]);
        console.log('clicked main category again');
      }

      categoryNames.push(categoryFieldWithSubCategories);

      console.log(`Visited "${text}"`);

      // await page.goto('https://www.lacolonia.com/', {
      //   waitUntil: 'networkidle2',
      // });

      await page.goBack();

      await page.waitForSelector(selector);
      await page.click(selector);
      await page.waitForSelector(linkSelector, {
        visible: true,
        timeout: 10000, // Wait 60 seconds instead of 30
      });

      console.log('All Subcategories for this main category visited');
      console.timeEnd(`Visiting main category ${i + 1}/${categories.length}`);
    }

    return categoryNames;
  }

  async scrapeCategories(): Promise<any[]> {
    return [
      {
        name: 'Category 1',
        supermarket: 'Colonial',
      },
    ];
  }
}
