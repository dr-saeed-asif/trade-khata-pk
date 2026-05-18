export type CategoriesLocale = 'en' | 'ur'

export const categoriesI18n: Record<
  CategoriesLocale,
  {
    title: string
    categoryNamePlaceholder: string
    add: string
    save: string
    edit: string
    delete: string
    items: string
    deleteConfirm: string
    localeEn: string
    localeUr: string
  }
> = {
  en: {
    title: 'Categories',
    categoryNamePlaceholder: 'Category name',
    add: 'Add',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    items: 'items',
    deleteConfirm: 'Delete category?',
    localeEn: 'English',
    localeUr: 'اردو',
  },
  ur: {
    title: 'کیٹگریز',
    categoryNamePlaceholder: 'کیٹگری کا نام',
    add: 'شامل کریں',
    save: 'محفوظ کریں',
    edit: 'ترمیم',
    delete: 'حذف',
    items: 'آئٹمز',
    deleteConfirm: 'کیا کیٹگری حذف کرنی ہے؟',
    localeEn: 'English',
    localeUr: 'اردو',
  },
}
