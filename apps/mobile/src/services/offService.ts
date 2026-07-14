/**
 * Open Food Facts API Service for Chobo.
 */

export interface OFFProduct {
  name: string;
  brand: string;
  image: string | null;
  barcode: string;
  category: string;
}

export const fetchProductFromOFF = async (barcode: string): Promise<OFFProduct | null> => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const data = await response.json();

    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    return {
      name: p.product_name || p.product_name_en || p.abbreviated_product_name || '',
      brand: p.brands || '',
      image: p.image_front_url || p.image_url || null,
      barcode: barcode,
      category: p.categories_tags?.[0]?.replace('en:', '') || '',
    };
  } catch (e) {
    console.warn('[OFF API Error]', e);
    return null;
  }
};
