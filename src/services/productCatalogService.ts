import products from "../data/products.json";
import type { InsuranceProduct } from "../domain/product";

const catalog = products as InsuranceProduct[];

export const productCatalogService = {
  list(): InsuranceProduct[] {
    return structuredClone(catalog);
  },

  find(productCode: string): InsuranceProduct | undefined {
    const product = catalog.find((item) => item.productCode === productCode);
    return product ? structuredClone(product) : undefined;
  },
};
