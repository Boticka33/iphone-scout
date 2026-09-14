import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScraperResult } from '../types';

/**
 * Helper to format Seznam CDN (sdn.cz) image URLs with valid query parameters
 */
function formatSbazarImageUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (url.startsWith('//')) {
    url = `https:${url}`;
  } else if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  // Seznam sdn.cz CDN requires fl parameter to prevent 401 Unauthorized
  if (url.includes('sdn.cz') && !url.includes('?')) {
    url += '?fl=exf|res,1024,768,1|wrm,/watermark/sbazar.png,10,10|webp,75';
  }
  return url;
}

/**
 * Scrapes latest iPhone listings from Sbazar.cz.
 */
export async function scrapeSbazar(): Promise<ScraperResult> {
  const listings: ScraperResult['listings'] = [];

  // Try Sbazar API Endpoint
  try {
    const apiUrl = 'https://www.sbazar.cz/api/v1/items/search?phrase=iphone&limit=30&order=created_at:desc';
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data && Array.isArray(response.data.results)) {
      const items = response.data.results;

      // Fetch detail for items in parallel to extract full description & images
      const detailPromises = items.map((item: any) =>
        axios
          .get(`https://www.sbazar.cz/api/v1/items/${item.id}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json',
            },
            timeout: 5000,
          })
          .then((res) => res.data?.result)
          .catch(() => null)
      );

      const details = await Promise.all(detailPromises);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.name || !item.price) continue;
        const externalId = String(item.id);
        const detail = details[i];

        // Valid working Sbazar detail URL
        const fullUrl = `https://www.sbazar.cz/inzerat/${externalId}`;

        // Image URL protocol & formatting
        const rawImageUrl = (detail?.images && detail.images[0]?.url) || (item.images && item.images[0]?.url) || '';
        const imageUrl = formatSbazarImageUrl(rawImageUrl);

        // Location & description
        const locationName = item.locality?.municipality || item.locality?.district || item.locality?.region || '';
        const description = (detail?.description || item.description || '').trim();

        listings.push({
          external_id: externalId,
          title: item.name,
          price: Number(item.price),
          description,
          url: fullUrl,
          image_url: imageUrl,
          location: locationName,
          published_at: item.create_date || item.created_at || new Date().toISOString(),
        });
      }
      return { source: 'sbazar', listings };
    }
  } catch (apiErr) {
    // API failed, falling back to HTML parsing
  }

  // Fallback HTML Scraping
  try {
    const htmlUrl = 'https://www.sbazar.cz/484-telefony-mobilni-telefony/apple/iphone';
    const response = await axios.get(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    $('.c-item, .c-item-list__item, article').each((_, element) => {
      try {
        const titleEl = $(element).find('.c-item__name, h2, .c-item__title');
        const title = titleEl.text().trim();
        const linkEl = $(element).find('a').first();
        const href = linkEl.attr('href') || '';
        const fullUrl = href.startsWith('http') ? href : `https://www.sbazar.cz${href}`;

        const priceText = $(element).find('.c-item__price, .price').text().replace(/\s+/g, '');
        const priceMatch = priceText.match(/(\d+)/);
        const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

        const rawImageUrl = $(element).find('img').attr('src') || '';
        const imageUrl = formatSbazarImageUrl(rawImageUrl);

        const idMatch = fullUrl.match(/\/(\d+)-/) || fullUrl.match(/\/inzerat\/(\d+)/);
        const externalId = idMatch ? idMatch[1] : fullUrl;

        if (title && price > 0) {
          listings.push({
            external_id: externalId,
            title,
            price,
            description: '',
            url: fullUrl,
            image_url: imageUrl,
            location: '',
            published_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Ignore single item error
      }
    });
  } catch (htmlErr: any) {
    console.error('Error scraping Sbazar.cz:', htmlErr.message || htmlErr);
  }

  return {
    source: 'sbazar',
    listings,
  };
}
