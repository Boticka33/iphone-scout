import { PriceMatrixItem } from '../types';

export const IPHONE_MODELS = [
  'iPhone 16 Pro Max',
  'iPhone 16 Pro',
  'iPhone 16 Plus',
  'iPhone 16',
  'iPhone 15 Pro Max',
  'iPhone 15 Pro',
  'iPhone 15 Plus',
  'iPhone 15',
  'iPhone 14 Pro Max',
  'iPhone 14 Pro',
  'iPhone 14 Plus',
  'iPhone 14',
  'iPhone 13 Pro Max',
  'iPhone 13 Pro',
  'iPhone 13 mini',
  'iPhone 13',
  'iPhone 12 Pro Max',
  'iPhone 12 Pro',
  'iPhone 12 mini',
  'iPhone 12',
  'iPhone 11 Pro Max',
  'iPhone 11 Pro',
  'iPhone 11',
  'iPhone SE (2022)',
  'iPhone SE (2020)',
  'iPhone XS Max',
  'iPhone XS',
  'iPhone XR',
  'iPhone X',
];

export const CAPACITIES = [64, 128, 256, 512, 1024];

/**
 * Default price matrix with benchmark reseller target purchase & market resell values (in CZK).
 */
export const DEFAULT_PRICE_MATRIX: Omit<PriceMatrixItem, 'id'>[] = [
  // iPhone 16 Pro Max
  { model: 'iPhone 16 Pro Max', capacity_gb: 256, target_buyout_price: 28000, target_resell_price: 33000 },
  { model: 'iPhone 16 Pro Max', capacity_gb: 512, target_buyout_price: 31000, target_resell_price: 37000 },
  // iPhone 16 Pro
  { model: 'iPhone 16 Pro', capacity_gb: 128, target_buyout_price: 24000, target_resell_price: 28000 },
  { model: 'iPhone 16 Pro', capacity_gb: 256, target_buyout_price: 26000, target_resell_price: 31000 },
  // iPhone 16
  { model: 'iPhone 16', capacity_gb: 128, target_buyout_price: 18000, target_resell_price: 22000 },
  // iPhone 15 Pro Max
  { model: 'iPhone 15 Pro Max', capacity_gb: 256, target_buyout_price: 21000, target_resell_price: 25500 },
  { model: 'iPhone 15 Pro Max', capacity_gb: 512, target_buyout_price: 23500, target_resell_price: 28500 },
  // iPhone 15 Pro
  { model: 'iPhone 15 Pro', capacity_gb: 128, target_buyout_price: 17500, target_resell_price: 21500 },
  { model: 'iPhone 15 Pro', capacity_gb: 256, target_buyout_price: 19500, target_resell_price: 23500 },
  // iPhone 15
  { model: 'iPhone 15', capacity_gb: 128, target_buyout_price: 13500, target_resell_price: 16500 },
  { model: 'iPhone 15', capacity_gb: 256, target_buyout_price: 15500, target_resell_price: 18500 },
  // iPhone 14 Pro Max
  { model: 'iPhone 14 Pro Max', capacity_gb: 128, target_buyout_price: 16000, target_resell_price: 19500 },
  { model: 'iPhone 14 Pro Max', capacity_gb: 256, target_buyout_price: 17500, target_resell_price: 21000 },
  // iPhone 14 Pro
  { model: 'iPhone 14 Pro', capacity_gb: 128, target_buyout_price: 14000, target_resell_price: 17000 },
  { model: 'iPhone 14 Pro', capacity_gb: 256, target_buyout_price: 15500, target_resell_price: 18500 },
  // iPhone 14
  { model: 'iPhone 14', capacity_gb: 128, target_buyout_price: 10500, target_resell_price: 13000 },
  { model: 'iPhone 14', capacity_gb: 256, target_buyout_price: 12000, target_resell_price: 14500 },
  // iPhone 13 Pro Max
  { model: 'iPhone 13 Pro Max', capacity_gb: 128, target_buyout_price: 12500, target_resell_price: 15500 },
  { model: 'iPhone 13 Pro Max', capacity_gb: 256, target_buyout_price: 14000, target_resell_price: 17000 },
  // iPhone 13 Pro
  { model: 'iPhone 13 Pro', capacity_gb: 128, target_buyout_price: 11000, target_resell_price: 13800 },
  { model: 'iPhone 13 Pro', capacity_gb: 256, target_buyout_price: 12500, target_resell_price: 15200 },
  // iPhone 13
  { model: 'iPhone 13', capacity_gb: 128, target_buyout_price: 8500, target_resell_price: 11000 },
  { model: 'iPhone 13', capacity_gb: 256, target_buyout_price: 9800, target_resell_price: 12300 },
  // iPhone 13 mini
  { model: 'iPhone 13 mini', capacity_gb: 128, target_buyout_price: 7500, target_resell_price: 9800 },
  // iPhone 12 Pro Max
  { model: 'iPhone 12 Pro Max', capacity_gb: 128, target_buyout_price: 9000, target_resell_price: 11500 },
  // iPhone 12 Pro
  { model: 'iPhone 12 Pro', capacity_gb: 128, target_buyout_price: 8000, target_resell_price: 10200 },
  // iPhone 12
  { model: 'iPhone 12', capacity_gb: 64, target_buyout_price: 5500, target_resell_price: 7200 },
  { model: 'iPhone 12', capacity_gb: 128, target_buyout_price: 6500, target_resell_price: 8200 },
  // iPhone 11 Pro Max
  { model: 'iPhone 11 Pro Max', capacity_gb: 64, target_buyout_price: 6000, target_resell_price: 7800 },
  // iPhone 11 Pro
  { model: 'iPhone 11 Pro', capacity_gb: 64, target_buyout_price: 5000, target_resell_price: 6800 },
  // iPhone 11
  { model: 'iPhone 11', capacity_gb: 64, target_buyout_price: 4000, target_resell_price: 5400 },
  { model: 'iPhone 11', capacity_gb: 128, target_buyout_price: 4600, target_resell_price: 6100 },
  // iPhone SE (2022)
  { model: 'iPhone SE (2022)', capacity_gb: 64, target_buyout_price: 4000, target_resell_price: 5300 },
  // iPhone XS / XR
  { model: 'iPhone XS Max', capacity_gb: 64, target_buyout_price: 3800, target_resell_price: 5000 },
  { model: 'iPhone XS', capacity_gb: 64, target_buyout_price: 3200, target_resell_price: 4300 },
  { model: 'iPhone XR', capacity_gb: 64, target_buyout_price: 3000, target_resell_price: 4100 },
];

export const DEFAULT_BLACKLIST_KEYWORDS = [
  { keyword: 'icloud', type: 'both' as const },
  { keyword: 'na díly', type: 'both' as const },
  { keyword: 'na nahradni dily', type: 'both' as const },
  { keyword: 'nefunkční', type: 'both' as const },
  { keyword: 'nefunkcni', type: 'both' as const },
  { keyword: 'blokovaný', type: 'both' as const },
  { keyword: 'blokovany', type: 'both' as const },
  { keyword: 'přihlášený', type: 'both' as const },
  { keyword: 'heslo neznám', type: 'both' as const },
  { keyword: 'zakázaný', type: 'both' as const },
  { keyword: 'koupím', type: 'title' as const },
  { keyword: 'koupim', type: 'title' as const },
  { keyword: 'sháním', type: 'title' as const },
  { keyword: 'shanim', type: 'title' as const },
  { keyword: 'hledám', type: 'title' as const },
  { keyword: 'hledam', type: 'title' as const },
  { keyword: 'výkup', type: 'title' as const },
  { keyword: 'vykup', type: 'title' as const },
  { keyword: 'obal', type: 'title' as const },
  { keyword: 'kryt', type: 'title' as const },
  { keyword: 'sklo', type: 'title' as const },
  { keyword: 'pouzdro', type: 'title' as const },
  { keyword: 'case', type: 'title' as const },
  { keyword: 'folio', type: 'title' as const },
  { keyword: 'cover', type: 'title' as const },
  { keyword: 'držák', type: 'title' as const },
  { keyword: 'drzak', type: 'title' as const },
  { keyword: 'stojánek', type: 'title' as const },
  { keyword: 'stojan', type: 'title' as const },
  { keyword: 'peněženka', type: 'title' as const },
  { keyword: 'penezenka', type: 'title' as const },
  { keyword: 'řemínek', type: 'title' as const },
  { keyword: 'reminek', type: 'title' as const },
  { keyword: 'fólie', type: 'title' as const },
  { keyword: 'folie', type: 'title' as const },
  { keyword: 'nabíječka', type: 'title' as const },
  { keyword: 'nabijecka', type: 'title' as const },
  { keyword: 'kabel', type: 'title' as const },
];
