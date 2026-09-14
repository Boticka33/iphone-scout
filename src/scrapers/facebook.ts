import axios from 'axios';
import { ScraperResult } from '../types';
import { getSetting } from '../db/database';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Scrapes iPhone listings from Facebook Marketplace (Ban-Safe, no personal login).
 * Uses direct SSR HTML JSON parsing with fallback to Apify API if token provided.
 */
export async function scrapeFacebook(): Promise<ScraperResult> {
  const listings: ScraperResult['listings'] = [];

  const rawToken = await getSetting('apify_api_token');
  const apifyToken = rawToken ? rawToken.trim() : '';

  // 1. Try Apify API Actor if token provided
  if (apifyToken) {
    try {
      console.log('[Facebook Scraper] Fetching FB Marketplace via Apify Scraper API...');
      const response = await axios.post(
        `https://api.apify.com/v2/acts/apify~facebook-marketplace-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          startUrls: [{ url: 'https://www.facebook.com/marketplace/prague/search?query=iphone' }],
          maxItems: 30,
        },
        { timeout: 120000 }
      );

      if (Array.isArray(response.data)) {
        for (const item of response.data) {
          const title = item.title || item.name || '';
          const rawPrice = item.price || item.listing_price?.formatted_amount || '';
          const price = typeof rawPrice === 'number' ? rawPrice : parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || 0;

          if (!title || price <= 0) continue;

          const externalId = String(item.id || item.itemId || hashCode(title + price));
          const url = item.url || item.link || `https://www.facebook.com/marketplace/item/${externalId}/`;
          const imageUrl = item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : '') || '';
          const location = item.location || item.cityName || 'ČR';
          const description = item.description || '';

          listings.push({
            external_id: externalId,
            title,
            price,
            description,
            url,
            image_url: imageUrl,
            location,
            published_at: item.date || item.publishedAt || new Date().toISOString(),
          });
        }
        console.log(`[Facebook Scraper] Successfully fetched ${listings.length} listings via Apify.`);
        return { source: 'facebook', listings };
      }
    } catch (apifyErr: any) {
      console.warn('[Facebook Scraper] Apify call failed:', apifyErr.message || apifyErr);
    }
  }

  // 2. Direct Anonymous SSR Scraping (No login needed, 100% ban safe)
  try {
    const targetUrls = [
      'https://www.facebook.com/marketplace/prague/search?query=iphone',
      'https://www.facebook.com/marketplace/search/?query=iphone',
    ];

    for (const searchUrl of targetUrls) {
      try {
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'cs-CZ,cs;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
          },
          timeout: 10000,
        });

        const htmlContent = response.data;
        if (!htmlContent) continue;

        const regex = /"marketplace_listing_title":"([^"]+)"/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(htmlContent)) !== null) {
          const rawTitle = match[1];
          const index = match.index;

          const windowText = htmlContent.substring(Math.max(0, index - 1500), Math.min(htmlContent.length, index + 500));

          const idMatch = windowText.match(/"id":"(\d{10,})"/);
          const id = idMatch ? idMatch[1] : null;

          const amountMatch = windowText.match(/"formatted_amount":"([^"]+)"/) || windowText.match(/"amount":"(\d+)"/);
          let price = 0;
          if (amountMatch) {
            const priceStr = amountMatch[1].replace(/\\u00a0/gi, '').replace(/\\u[0-9a-fA-F]{4}/g, '').replace(/[^\d]/g, '');
            price = parseInt(priceStr, 10) || 0;
          }

          const imageMatch = windowText.match(/"primary_listing_photo"[\s\S]*?"uri"\s*:\s*"([^"]+)"/);
          let imageUrl = imageMatch ? imageMatch[1].replace(/\\/g, '').replace(/\\u0026/g, '&') : '';

          const title = rawTitle.replace(/\\u([0-9a-fA-F]{4})/g, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));

          const locMatch = windowText.match(/"city"\s*:\s*"([^"]+)"/) || windowText.match(/"display_name"\s*:\s*"([^"]+)"/);
          const location = locMatch ? locMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16))) : 'ČR';

          if (id && title && price > 0) {
            if (!listings.some((l) => l.external_id === id)) {
              listings.push({
                external_id: id,
                title,
                price,
                description: '',
                url: `https://www.facebook.com/marketplace/item/${id}/`,
                image_url: imageUrl,
                location,
                published_at: new Date().toISOString(),
              });
            }
          }
        }

        if (listings.length > 0) {
          console.log(`[Facebook Scraper] Fetched ${listings.length} listings via anonymous SSR HTML scraper.`);
          break;
        }
      } catch (err: any) {
        console.warn(`[Facebook Scraper] URL '${searchUrl}' failed:`, err.message || err);
      }
    }
  } catch (err: any) {
    console.error('[Facebook Scraper] SSR scraper error:', err.message || err);
  }

  return {
    source: 'facebook',
    listings,
  };
}
