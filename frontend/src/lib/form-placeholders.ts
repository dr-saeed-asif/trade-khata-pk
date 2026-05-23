/** English + Urdu placeholder shown together in form inputs. */
export const bilingual = (en: string, ur: string) => `${en} / ${ur}`

export const formPlaceholders = {
  item: {
    name: bilingual('Type item name', 'آئٹم کا نام لکھیں'),
    category: bilingual('Choose category', 'زمرہ منتخب کریں'),
    price: bilingual('e.g. 199.99', 'مثال: 199.99'),
    quantity: bilingual('e.g. 100', 'مثال: 100'),
    supplier: bilingual('Supplier name', 'سپلائر کا نام'),
    location: bilingual('Shelf or warehouse', 'رکھنے کی جگہ'),
    weight: bilingual('e.g. 500g, 1 kg', 'مثال: 500 گرام، 1 کلو'),
    expiryMessage: bilingual('e.g. Best before 6 months', 'مثال: 6 ماہ تک بہترین'),
    expiryDate: bilingual('Select date', 'تاریخ منتخب کریں'),
    description: bilingual('Item details…', 'آئٹم کی تفصیل…'),
  },
  inventory: {
    search: bilingual('Search inventory…', 'انوینٹری تلاش کریں…'),
    category: bilingual('Filter category', 'زمرہ فلٹر'),
    location: bilingual('Filter location', 'مقام فلٹر'),
  },
  category: {
    name: bilingual('Category name', 'کیٹگری کا نام'),
  },
  party: {
    name: bilingual('Party name', 'پارٹی کا نام'),
    phone: bilingual('Phone number', 'فون نمبر'),
    email: bilingual('Email address', 'ای میل'),
    address: bilingual('Address', 'پتہ'),
    search: bilingual('Search name, phone, or email…', 'نام، فون یا ای میل تلاش…'),
  },
  commerce: {
    searchItem: bilingual('Search item (English / اردو)…', 'آئٹم تلاش (English / اردو)…'),
    discount: bilingual('0', '0'),
    notes: bilingual('Optional notes', 'اختیاری نوٹ'),
    quantity: bilingual('Quantity', 'مقدار'),
    unitPrice: bilingual('Unit price (Rs)', 'یونٹ قیمت (روپے)'),
    searchSale: bilingual('Search invoice or customer…', 'انوائس یا گاہک تلاش…'),
    searchPurchase: bilingual('Search invoice or supplier…', 'انوائس یا سپلائر تلاش…'),
    dateFrom: bilingual('From date', 'شروع تاریخ'),
    dateTo: bilingual('To date', 'اختتام تاریخ'),
  },
  user: {
    fullName: bilingual('Enter full name', 'پورا نام درج کریں'),
    username: bilingual('Login username (optional)', 'لاگ ان صارف نام (اختیاری)'),
    email: bilingual('Enter email', 'ای میل درج کریں'),
    password: bilingual('Enter password', 'پاس ورڈ درج کریں'),
    passwordKeep: bilingual('Leave empty to keep current password', 'موجودہ پاس ورڈ رکھنے کے لیے خالی چھوڑیں'),
    search: bilingual('Search users…', 'صارفین تلاش…'),
  },
  role: {
    name: bilingual('Enter role name', 'رول کا نام درج کریں'),
    search: bilingual('Search roles…', 'رولز تلاش…'),
  },
  auth: {
    loginId: bilingual('email@company.com or username', 'email@company.com یا صارف نام'),
    password: bilingual('Password', 'پاس ورڈ'),
    forgotEmail: bilingual('you@company.com', 'you@company.com'),
  },
  scanner: {
    scan: (target: string) =>
      bilingual(
        `Scan or type ${target} barcode / QR (USB scanner)`,
        `${target} بارکوڈ / QR سکین یا لکھیں (USB سکینر)`,
      ),
  },
  stock: {
    itemId: bilingual('Item ID', 'آئٹم ID'),
    quantity: bilingual('Quantity', 'مقدار'),
  },
  settings: {
    endpoint: bilingual('Endpoint URL', 'Endpoint URL'),
    apiKey: bilingual('API Key', 'API Key'),
  },
  ai: {
    idle: bilingual('Ask anything about inventory…', 'انوینٹری کے بارے میں پوچھیں…'),
    loading: bilingual('Generating response…', 'جواب تیار ہو رہا ہے…'),
  },
} as const
