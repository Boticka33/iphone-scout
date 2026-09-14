import { Listing, PriceMatrixItem, BlacklistItem } from '../types';
import { IPHONE_MODELS } from './models';
import { getPriceMatrix, getBlacklist } from '../db/database';

export function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function detectIphoneModel(title: string, description: string): string | undefined {
  const fullText = removeDiacritics(`${title} ${description}`);
  const sortedModels = [...IPHONE_MODELS].sort((a, b) => b.length - a.length);

  for (const model of sortedModels) {
    const normModel = removeDiacritics(model);

    let patternStr = normModel.replace(/iphone\s+/i, '(iphone\\s+)?');
    if (model.includes(' (2022)')) {
      patternStr = 'iphone\\s*se\\s*(2022|3|3rd)';
    } else if (model.includes(' (2020)')) {
      patternStr = 'iphone\\s*se\\s*(2020|2|2nd)';
    }

    const regex = new RegExp(`\\b${patternStr}\\b`, 'i');
    if (regex.test(fullText)) {
      return model;
    }
  }

  const simpleMatch = fullText.match(/\b(iphone|ip)\s*(\d{2})\s*(pro\s*max|pro|plus|mini)?\b/i);
  if (simpleMatch) {
    const num = simpleMatch[2];
    const suffix = simpleMatch[3] ? simpleMatch[3].trim() : '';
    const constructed = `iPhone ${num}${suffix ? ' ' + suffix.charAt(0).toUpperCase() + suffix.slice(1) : ''}`;
    const found = IPHONE_MODELS.find((m) => removeDiacritics(m) === removeDiacritics(constructed));
    if (found) return found;
  }

  return undefined;
}

export function detectCapacity(title: string, description: string): number | undefined {
  const fullText = `${title} ${description}`;

  if (/\b1\s*tb\b/i.test(fullText) || /\b1024\s*gb\b/i.test(fullText)) {
    return 1024;
  }

  const gbMatches = [...fullText.matchAll(/\b(64|128|256|512)\s*(gb|g|giga)?\b/gi)];
  for (const match of gbMatches) {
    const num = parseInt(match[1], 10);
    if ([64, 128, 256, 512].includes(num)) {
      return num;
    }
  }

  return undefined;
}

export function checkListingBlacklisted(title: string, _description: string, blacklistItems: BlacklistItem[]): boolean {
  const activeBlacklist = blacklistItems.filter((b) => b.is_active);
  const normTitle = removeDiacritics(title);

  for (const item of activeBlacklist) {
    const normKeyword = removeDiacritics(item.keyword);
    if (!normKeyword) continue;

    // Blacklist checks apply ONLY to the title (prevents false positives when descriptions mention included accessories)
    if (normTitle.includes(normKeyword)) return true;
  }

  return false;
}

export async function evaluateListing(listing: Listing, preloadedBlacklist?: BlacklistItem[], preloadedMatrix?: PriceMatrixItem[]): Promise<Listing> {
  const blacklist = preloadedBlacklist || (await getBlacklist());
  const matrix = preloadedMatrix || (await getPriceMatrix());

  const model = listing.model || detectIphoneModel(listing.title, listing.description);
  let capacity = listing.capacity_gb || detectCapacity(listing.title, listing.description);
  const blacklisted = checkListingBlacklisted(listing.title, listing.description, blacklist);

  if (!capacity && model) {
    const num = parseInt(model.replace(/\D/g, ''), 10);
    capacity = num && num >= 13 ? 128 : 64;
  }

  let estimatedValue = 0;
  let targetBuyout = 0;
  let estimatedProfit = 0;
  let score = 0;

  if (model && capacity) {
    const match = matrix.find((m) => m.model === model && m.capacity_gb === capacity) || matrix.find((m) => m.model === model);

    if (match) {
      estimatedValue = match.target_resell_price;
      targetBuyout = match.target_buyout_price;
      estimatedProfit = estimatedValue - listing.price;

      if (listing.price > 0 && estimatedProfit > 0) {
        const marginPct = (estimatedProfit / estimatedValue) * 100;
        score = Math.round(marginPct * 2);
      } else {
        score = -10;
      }
    }
  }

  const text = removeDiacritics(`${listing.title} ${listing.description}`);

  if (text.includes('zaruka') || text.includes('faktura') || text.includes('doklad')) score += 10;
  if (text.includes('100%') || text.includes('100 %') || text.includes('kondice 100')) score += 15;
  if (text.includes('novy') || text.includes('nerozbaleny') || text.includes('top stav')) score += 10;
  if (text.includes('kompletni baleni') || text.includes('krabicka')) score += 5;

  if (text.includes('praskly') || text.includes('pavuk') || text.includes('praskle')) score -= 25;
  if (text.includes('skrabance') || text.includes('oderky') || text.includes('vytlucena')) score -= 10;
  if (text.includes('vymena displeje') || text.includes('vymena baterie') || text.includes('neoriginal')) score -= 15;
  if (text.includes('face id nefunkcni') || text.includes('truetone')) score -= 20;

  if (blacklisted) {
    score = -100;
  }

  return {
    ...listing,
    model,
    capacity_gb: capacity,
    estimated_value: estimatedValue,
    estimated_profit: estimatedProfit,
    score,
    is_blacklisted: blacklisted,
  };
}
