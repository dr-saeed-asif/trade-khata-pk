import groceryCatalog from '@/data/grocery-catalog.json'

export type GroceryLocale = 'en' | 'ur'

export type GroceryItem = {
  id: string
  nameEn: string
  nameUr: string
  roman: string
}

export type GroceryCategory = {
  id: string
  nameEn: string
  nameUr: string
  items: GroceryItem[]
}

export type GroceryCatalogFile = {
  ui: Record<GroceryLocale, Record<string, string>>
  categories: GroceryCategory[]
}

export const groceryCatalogData = groceryCatalog as GroceryCatalogFile

export function groceryUiStrings(locale: GroceryLocale): Record<string, string> {
  return groceryCatalogData.ui[locale] ?? groceryCatalogData.ui.en
}

/** Primary line for lists (English or Urdu + roman subtitle in Urdu mode). */
export function groceryItemLabel(item: GroceryItem, locale: GroceryLocale): string {
  if (locale === 'ur') {
    return `${item.nameUr} (${item.roman})`
  }
  return item.nameEn
}

export function groceryCategoryLabel(cat: GroceryCategory, locale: GroceryLocale): string {
  if (locale === 'ur') {
    return `${cat.nameUr} — ${cat.nameEn}`
  }
  return `${cat.nameEn} (${cat.nameUr})`
}

/** Value sent to search filter (English product name for DB / import compatibility). */
export function groceryItemSearchValue(item: GroceryItem): string {
  return item.nameEn
}

/** Category filter string (English; backend matches category name contains). */
export function groceryCategoryFilterValue(cat: GroceryCategory): string {
  return cat.nameEn
}

let groceryItemUrduByEnglish: Map<string, string> | null = null

const normalizeCatalogName = (value: string) => value.trim().toLowerCase()

/** Urdu product name for a catalog English name (exact match on trimmed English). */
export function lookupGroceryItemUrduName(nameEn: string): string | undefined {
  if (!groceryItemUrduByEnglish) {
    groceryItemUrduByEnglish = new Map()
    for (const category of groceryCatalogData.categories) {
      for (const item of category.items) {
        groceryItemUrduByEnglish.set(normalizeCatalogName(item.nameEn), item.nameUr)
      }
    }
  }
  return groceryItemUrduByEnglish.get(normalizeCatalogName(nameEn))
}

export function lookupGroceryCategoryUrduName(nameEn: string): string | undefined {
  const key = normalizeCatalogName(nameEn)
  const category = groceryCatalogData.categories.find((row) => normalizeCatalogName(row.nameEn) === key)
  return category?.nameUr
}
