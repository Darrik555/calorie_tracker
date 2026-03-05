
export interface FetchedFood {
  id: string;
  name: string;
  brand: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  image_url?: string;
  serving_size?: string;
  serving_quantity_g?: number; 
  is_liquid?: boolean;

  sugars_per_100g?: number;
  fiber_per_100g?: number;
  saturated_fat_per_100g?: number;
  salt_per_100g?: number;


}

/**
 * Fetches a product from Open Food Facts using its barcode
 */
export async function fetchProductByBarcode(barcode: string): Promise<FetchedFood | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
      headers: {
        // It is good practice to identify your app
        'User-Agent': 'CalorieTrackerApp/1.0 (rotmann01@gmx.de)' 
      }
    });

    const data = await response.json();

    // Check if the product was actually found
    if (data.status === 1 && data.product) {
      const p = data.product;
      const nutriments = p.nutriments || {};

      // Extract only the fields we need, fallback to 0 if not available
      return {
        id: barcode,
        name: p.product_name || 'Unknown Product',
        brand: p.brands || 'Unknown Brand',
        calories_per_100g: nutriments['energy-kcal_100g'] || 0,
        protein_per_100g: nutriments.proteins_100g || 0,
        carbs_per_100g: nutriments.carbohydrates_100g || 0,
        fat_per_100g: nutriments.fat_100g || 0,
        image_url: p.image_front_small_url,
        serving_quantity_g: p.serving_quantity ? parseFloat(p.serving_quantity) : undefined,
        is_liquid: p.quantity ? p.quantity.toLowerCase().includes('ml') || p.quantity.toLowerCase().includes(' l') : false,
        sugars_per_100g: nutriments.sugars_100g || 0,
        fiber_per_100g: nutriments.fiber_100g || 0,
        saturated_fat_per_100g: nutriments['saturated-fat_100g'] || 0,
        salt_per_100g: nutriments.salt_100g || 0
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching from Open Food Facts:', error);
    return null;
  }
}

/**
 * Searches for products using a text query
 */
export async function searchProductsByText(query: string): Promise<FetchedFood[]> {
  try {
    // Open Food Facts search endpoint (limiting to 15 results for performance)
    let url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15`;

    const response = await fetch(url);

    const data = await response.json();

    if (data.products && Array.isArray(data.products)) {
      return data.products.map((p: any) => {
        const nutriments = p.nutriments || {};
        return {
          id: p.code || p.id || Math.random().toString(),
          name: p.product_name || 'Unknown Product',
          brand: p.brands || 'Unknown Brand',
          calories_per_100g: nutriments['energy-kcal_100g'] || 0,
          protein_per_100g: nutriments.proteins_100g || 0,
          carbs_per_100g: nutriments.carbohydrates_100g || 0,
          fat_per_100g: nutriments.fat_100g || 0,
          image_url: p.image_front_small_url,
          serving_size: p.serving_size || '100g',
          serving_quantity_g: p.serving_quantity ? parseFloat(p.serving_quantity) : undefined,
          is_liquid: p.quantity ? p.quantity.toLowerCase().includes('ml') || p.quantity.toLowerCase().includes(' l') : false,
          sugars_per_100g: nutriments.sugars_100g || 0,
          fiber_per_100g: nutriments.fiber_100g || 0,
          saturated_fat_per_100g: nutriments['saturated-fat_100g'] || 0,
          salt_per_100g: nutriments.salt_100g || 0
        };
      });
    }

    return [];
  } catch (error) {
    console.error('Error searching Open Food Facts:', error);
    return [];
  }
}