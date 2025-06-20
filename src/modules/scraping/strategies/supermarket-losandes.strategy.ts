import puppeteer from 'puppeteer';
import { SupermarketStrategy } from '../interfaces/supermarket-strategy.interface';
import { SubCategoryDto } from '../dto/sub-category.dto';
import { CategoryDto } from '../dto/category.dto';
import { ProductTypeDto } from '../dto/product-type.dto';

export class SupermarketLosAndesStrategy implements SupermarketStrategy {
  async scrapeCategories(): Promise<any> {
    const browser = await puppeteer.launch({ headless: true, slowMo: 100 });
    const page = await browser.newPage();
    await page.goto('https://comisariatolosandes.com/', {
      waitUntil: 'domcontentloaded',
    });

    await page.click('.mat-dialog-container button');

    await page.waitForSelector('.mat-toolbar .mat-focus-indicator', {
      visible: true,
      timeout: 60000, // Wait 60 seconds instead of 30
    });
    await page.click('.mat-toolbar .mat-focus-indicator');

    console.log('Clicked dropdown');

    await page.waitForSelector('.mat-sidenav .menu-item');

    const categoryDropdown = await page.$$eval(
      '.mat-sidenav .menu-item:not(.sub-menu .menu-item)',
      (dropdowns) => {
        return dropdowns.map((dropdown) => {
          const dropdownTitle: HTMLElement = dropdown.querySelector(
            '.menu-item span.mat-button-wrapper span.menu-title',
          );

          // if (!dropdownTitle) {
          //   await this.category.create({
          //     data: { name: dropdownTitle.textContent.trim() },
          //   });
          // }

          const content: NodeListOf<HTMLElement> = dropdown.querySelectorAll(
            '.sub-menu .menu-item',
          );

          let subCategoriesForDropdown: SubCategoryDto[] = [];

          for (const item of content) {
            let subCategory: SubCategoryDto = {
              name: '',
              productTypes: [],
              categoryName: dropdownTitle
                ? dropdownTitle.textContent.trim()
                : 'No title',
            };

            const subCategoriesBody = item.querySelector(
              // subcategorias de los menus
              '.sub-menu .menu-item .mat-button-wrapper',
            );

            const hasDropdown =
              subCategoriesBody.querySelector('.menu-expand-icon');
            const titleElement =
              subCategoriesBody.querySelector('span.menu-title');

            if (hasDropdown && titleElement) {
              subCategory.name = titleElement.textContent.trim();

              const subCategoriesTypesMenu = item.querySelector(
                //tipos de productos por subcategoria
                '.sub-menu .menu-item app-sidenav-menu',
              );

              if (subCategoriesTypesMenu) {
                subCategory.productTypes = Array.from(
                  subCategoriesTypesMenu.querySelectorAll('.menu-item'),
                )
                  .map((typeItem) => {
                    const typeTitle = typeItem.querySelector('span.menu-title');
                    return {
                      name: typeTitle ? typeTitle.textContent.trim() : '',
                      products: [],
                    };
                  })
                  .filter((type) => type.name !== '');
              }

              subCategoriesForDropdown.push(subCategory);
            }
          }

          return {
            title: dropdownTitle
              ? dropdownTitle.textContent.trim()
              : 'No title',
            id: dropdown.getAttribute('id') || 'No id',
            subCategories: subCategoriesForDropdown,
          };
        });
      },
    );

    await browser.close();

    return categoryDropdown;
  }

  async fetchProducts(): Promise<any> {
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    await page.goto('https://comisariatolosandes.com/tienda', {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('.mat-dialog-actions', {
      visible: true,
      timeout: 60000, // Wait 60 seconds instead of 30
    });

    await page.click('.mat-dialog-actions button');

    await page.click('.mat-dialog-container button');

    // await page.waitForSelector('.mat-toolbar .mat-focus-indicator', {
    //   visible: true,
    //   timeout: 60000, // Wait 60 seconds instead of 30
    // });
    // await page.click('.mat-toolbar .mat-focus-indicator');

    // console.log('Clicked dropdown');

    // await page.waitForSelector('.mat-sidenav .menu-item');

    // await page.click(
    //   'mat-sidenav-content .filter-row button.mat-focus-indicator',
    // );

    // const categories = await page.$$eval(
    //   'app-category-list .sub-category app-category-list',
    //   (categories) => {
    //     return categories.map((category) => {
    //       return category.outerHTML;
    //     });
    //   },
    // );

    // return categories[0];

    const categories = await this.scrapeCategories();

    const links = [];
    categories.map((link: CategoryDto) => {
      link.subCategories.map((item) => {
        item.productTypes.map((type: ProductTypeDto) => {
          console.log(type);
          links.push(type.name);
        });
      });
    });

    await page.waitForSelector('.mat-toolbar .mat-focus-indicator', {
      visible: true,
      timeout: 60000, // Wait 60 seconds instead of 30
    });
    await page.click('.mat-toolbar .mat-focus-indicator');

    console.log('Clicked dropdown');

    await page.waitForSelector('.mat-sidenav .menu-item');

    // for (const menu of links) {
    //   const item = await page.$('.mat-sidenav .menu-item:has-text("${menu}")');
    //   if (item) {
    //     await item.click();
    //     await page.waitForSelector('.products-wrapper'); // Wait for products to load

    //     // Extract product data
    //     const products = await page.$$eval('.products-wrapper', (items) =>
    //       items.map((p) => ({
    //         name: p.querySelector('.product-item .custom-text').textContent,
    //         price:
    //           p.querySelector('.product-item .prices')?.textContent || 'N/A',
    //       })),
    //     );

    //     console.log(`Products for ${menu}:`, products);
    //   }
    //   console.log(item);
    // }
  }
}
