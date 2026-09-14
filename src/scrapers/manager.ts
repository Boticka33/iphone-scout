import { scrapeBazos } from './bazos';
import { scrapeSbazar } from './sbazar';
import { scrapeFacebook } from './facebook';
import { evaluateListing } from '../engine/parser';
import { analyzeListingWithGemini } from '../engine/gemini';
import { sendDiscordNotification } from '../notifications/discord';
import { saveListing, getSetting, updateListingStatus } from '../db/database';
import { Listing } from '../types';

let isScrapingRunning = false;
let scraperIntervalTimer: NodeJS.Timeout | null = null;

export async function runScrapeCycle() {
  if (isScrapingRunning) {
    console.log('[Scraper Manager] Cycle already running, skipping.');
    return;
  }

  isScrapingRunning = true;
  console.log(`[Scraper Manager] Starting scrape cycle at ${new Date().toLocaleTimeString('cs-CZ')}...`);

  try {
    const [bazosRes, sbazarRes, facebookRes] = await Promise.all([
      scrapeBazos(),
      scrapeSbazar(),
      scrapeFacebook(),
    ]);
    const allListings = [...bazosRes.listings, ...sbazarRes.listings, ...facebookRes.listings];
    console.log(
      `[Scraper Manager] Discovered ${allListings.length} total listings (Bazoš: ${bazosRes.listings.length}, Sbazar: ${sbazarRes.listings.length}, Facebook: ${facebookRes.listings.length}).`
    );

    let newCount = 0;
    let alertCount = 0;

    const minProfitSetting = await getSetting('min_profit_alert', '1000');
    const minProfitAlert = parseInt(minProfitSetting, 10);
    const geminiApiKey = await getSetting('gemini_api_key');

    for (const rawListing of allListings) {
      const sourceName: Listing['source'] = rawListing.url.includes('bazos.cz')
        ? 'bazos'
        : rawListing.url.includes('sbazar.cz')
        ? 'sbazar'
        : 'facebook';

      const evaluated: Listing = await evaluateListing({
        ...rawListing,
        source: sourceName,
      });

      const { id, isNew } = await saveListing(evaluated);
      evaluated.id = id;

      if (isNew && !evaluated.is_blacklisted) {
        newCount++;

        const shouldRunGemini =
          geminiApiKey &&
          ((evaluated.estimated_profit && evaluated.estimated_profit >= minProfitAlert) || (evaluated.score && evaluated.score >= 40));

        if (shouldRunGemini) {
          console.log(`[Scraper Manager] Triggering Gemini AI check for listing: ${evaluated.title} (Est. Profit: ${evaluated.estimated_profit} Kč)...`);
          const aiResult = await analyzeListingWithGemini(evaluated);
          if (aiResult) {
            evaluated.gemini_verdict = aiResult.verdict;
            evaluated.gemini_summary = aiResult.summary;

            // If Gemini AI determines this is an accessory / non-phone (SKIP), auto ignore in DB
            if (aiResult.verdict === 'SKIP') {
              console.log(`[Scraper Manager] Listing '${evaluated.title}' identified as accessory/non-iPhone by Gemini AI. Auto-ignoring.`);
              evaluated.status = 'ignored';
              if (evaluated.id) {
                await updateListingStatus(evaluated.id, 'ignored');
              }
            }
          }
        }

        const shouldAlert =
          evaluated.status !== 'ignored' &&
          evaluated.gemini_verdict !== 'SKIP' &&
          ((evaluated.estimated_profit && evaluated.estimated_profit >= minProfitAlert) ||
            evaluated.gemini_verdict === 'STEAL_BUY' ||
            evaluated.gemini_verdict === 'GOOD_DEAL');

        if (shouldAlert) {
          const sent = await sendDiscordNotification(evaluated);
          if (sent) alertCount++;
        }
      }
    }

    console.log(`[Scraper Manager] Cycle finished. New saved: ${newCount}, Alerts sent: ${alertCount}.`);
  } catch (error: any) {
    console.error('[Scraper Manager] Scrape cycle error:', error.message || error);
  } finally {
    isScrapingRunning = false;
  }
}

export async function startScraperManager() {
  const intervalSetting = await getSetting('scrape_interval_seconds', '30');
  const intervalSec = parseInt(intervalSetting, 10);
  console.log(`[Scraper Manager] Service started. Interval: ${intervalSec}s.`);

  runScrapeCycle();

  if (scraperIntervalTimer) clearInterval(scraperIntervalTimer);
  scraperIntervalTimer = setInterval(runScrapeCycle, intervalSec * 1000);
}

export function stopScraperManager() {
  if (scraperIntervalTimer) {
    clearInterval(scraperIntervalTimer);
    scraperIntervalTimer = null;
  }
  console.log('[Scraper Manager] Service stopped.');
}
