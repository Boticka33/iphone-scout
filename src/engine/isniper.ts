import axios from 'axios';
import { updatePriceMatrixItem } from '../db/database';

export interface IsniperSyncResult {
  updatedCount: number;
  modelsCount: number;
  errors: string[];
}

/**
 * Fetches latest buyout prices from Mobil Pohotovost (all grades) and exact 30-day weighted
 * average Bazoš resell prices from https://vykup.isniper.cz/ and updates the local SQLite Price Matrix.
 */
export async function syncPriceMatrixFromIsniper(): Promise<IsniperSyncResult> {
  console.log('[iSniper Sync] Starting price matrix synchronization from vykup.isniper.cz...');
  const errors: string[] = [];
  let updatedCount = 0;
  let modelsCount = 0;

  try {
    const [cenyRes, avgRes] = await Promise.all([
      axios.get('https://vykup.isniper.cz/api/ceny', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000,
      }),
      axios.get('https://vykup.isniper.cz/api/average', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000,
      }).catch(() => null),
    ]);

    if (!cenyRes.data || !cenyRes.data.data) {
      throw new Error('Invalid response structure from https://vykup.isniper.cz/api/ceny');
    }

    const pricesData = cenyRes.data.data;
    const avgData = avgRes?.data?.data || {};
    const dailyData = avgRes?.data?.daily || {};

    const modelNames = Object.keys(pricesData);
    modelsCount = modelNames.length;

    for (const modelName of modelNames) {
      const capacitiesObj = pricesData[modelName];

      for (const [capStr, datesObj] of Object.entries(capacitiesObj)) {
        const capNumMatch = capStr.match(/(\d+)/);
        let capacityGb = capNumMatch ? parseInt(capNumMatch[1], 10) : 128;
        if (capStr.toUpperCase().includes('TB')) {
          capacityGb = 1024;
        }

        const dateKeys = Object.keys(datesObj as object).sort();
        if (dateKeys.length === 0) continue;

        const latestDate = dateKeys[dateKeys.length - 1];
        const latestGrades = (datesObj as any)[latestDate];

        if (!latestGrades) continue;

        // MP Grade Buyout Prices
        const buyoutZanovni = latestGrades['Zánovní'] || 0;
        const buyoutA = latestGrades['A'] || 0;
        const buyoutB = latestGrades['B'] || 0;
        const buyoutC = latestGrades['C'] || 0;
        const buyoutD = latestGrades['D'] || 0;

        // Target Buyout Price defaults to Grade A (or Zánovní or B)
        const targetBuyout = buyoutA || buyoutZanovni || buyoutB || 0;
        if (targetBuyout <= 0) continue;

        // Calculate EXACT 30-Day Weighted Average from Bazoš daily entries
        let targetResell = 0;
        const modelDailyObj = dailyData[modelName] && dailyData[modelName][capStr];

        if (modelDailyObj) {
          const dates = Object.keys(modelDailyObj).sort();
          const last30 = dates.slice(-30);
          let sumTotal = 0;
          let sumCount = 0;
          for (const d of last30) {
            sumTotal += modelDailyObj[d].total || 0;
            sumCount += modelDailyObj[d].count || 0;
          }
          if (sumCount > 0) {
            targetResell = Math.round(sumTotal / sumCount);
          }
        }

        // Fallback to monthly avg if daily is unavailable
        if (!targetResell && avgData[modelName] && avgData[modelName][capStr]) {
          const monthsKeys = Object.keys(avgData[modelName][capStr]).sort();
          if (monthsKeys.length > 0) {
            const latestMonth = monthsKeys[monthsKeys.length - 1];
            targetResell = Math.round(avgData[modelName][capStr][latestMonth].avg || 0);
          }
        }

        // Default fallback if no average available at all
        if (!targetResell) {
          targetResell = Math.round(targetBuyout * 1.22);
        }

        // Save to Price Matrix DB
        await updatePriceMatrixItem(modelName, capacityGb, targetBuyout, targetResell, {
          buyout_zanovni: buyoutZanovni,
          buyout_a: buyoutA,
          buyout_b: buyoutB,
          buyout_c: buyoutC,
          buyout_d: buyoutD,
        });
        updatedCount++;
      }
    }

    console.log(`[iSniper Sync] Successfully synced ${updatedCount} model rules with MP grades A/B/C/D & exact Bazoš 30-day averages.`);
    return { updatedCount, modelsCount, errors };
  } catch (error: any) {
    console.error('[iSniper Sync] Failed to sync price matrix:', error.message || error);
    errors.push(error.message || String(error));
    return { updatedCount: 0, modelsCount: 0, errors };
  }
}
