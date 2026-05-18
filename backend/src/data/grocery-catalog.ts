export type GroceryCatalogCategory = {
  name: string
  items: string[]
}

export const groceryCatalog: GroceryCatalogCategory[] = [
  {
    name: 'Dry Foods & Pantry Staples',
    items: ['Rice', 'Wheat Flour', 'Sugar', 'Cooking Oil', 'Ghee / Butter', 'Tea', 'Semolina', 'Vermicelli', 'Jaggery', 'Vinegar'],
  },
  {
    name: 'Pulses, Beans & Lentils',
    items: [
      'Split Bengal Gram (Chana Daal)',
      'Red Lentils (Masoor Daal)',
      'Yellow Lentils (Moong Daal)',
      'White Lentils (Mash Daal)',
      'Black Gram (Sabut Mash / Kaali Daal)',
      'Chickpeas (White)',
      'Chickpeas (Black)',
      'Red Kidney Beans',
      'Black Eyed Peas',
      'Pigeon Pea (Arhar Daal)',
      'Green Gram (Sabut Moong)',
    ],
  },
  {
    name: 'Spices',
    items: [
      'Chili / Turmeric',
      'Cumin / Coriander',
      'Peppercorn / Cloves',
      'Cardamom (Green / Black)',
      'Cinnamon / Fennel',
      'Fenugreek / Nigella',
      'Other Spices (Ajwain, Imli, Anaar Dana, Heeng)',
    ],
  },
  {
    name: 'Dry Fruits & Nuts',
    items: ['Almond', 'Cashew', 'Raisins', 'Dates', 'Dried Fig', 'Dried Apricot', 'Coconut (dried)', 'Poppy seeds', 'Sesame seeds'],
  },
  {
    name: 'Other Essential Grocery Items',
    items: ['Salt', 'Pickle (Achar)', 'Garlic', 'Ginger', 'Onion', 'Green Chili'],
  },
]

