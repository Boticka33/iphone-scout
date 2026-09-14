import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScraperResult } from '../types';

/**
 * Scrapes latest iPhone listings from Bazoš.cz (Mobil section).
 */
export async function scrapeBazos(): Promise<ScraperResult> {
  const url = 'https://mobil.bazos.cz/apple/?hledat=iphone&rubriky=mobil';
  const listings: ScraperResult['listings'] = [];

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    $('div.inzeraty').each((_, element) => {
      try {
        // Title & URL extraction (targeting h2.nadpis a explicitly to avoid image links)
        const titleEl = $(element).find('h2.nadpis a').first();
        const title = titleEl.text().trim();
        const relativeUrl = titleEl.attr('href') || '';
        const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://mobil.bazos.cz${relativeUrl}`;

        // External ID extraction (e.g. /inzerat/223641106/... -> 223641106)
        const idMatch = relativeUrl.match(/\/inzerat\/(\d+)\//);
        const externalId = idMatch ? idMatch[1] : fullUrl;

        // Price extraction
        const priceText = $(element).find('.inzeratycena').text().replace(/\s+/g, '');
        const priceMatch = priceText.match(/(\d+)/);
        const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

        // Description extraction
        const description = $(element).find('.popis').text().trim();

        // Image URL extraction
        const imageEl = $(element).find('.inzeratynadpis img').first();
        let imageUrl = imageEl.attr('src') || '';
        if (imageUrl.startsWith('//')) {
          imageUrl = `https:${imageUrl}`;
        }

        // Location & Date extraction (.inzeratylok)
        const locationText = $(element).find('.inzeratylok').text().replace(/\s+/g, ' ').trim();

        if (title && externalId && price > 0) {
          listings.push({
            external_id: externalId,
            title,
            price,
            description,
            url: fullUrl,
            image_url: imageUrl,
            location: locationText,
            published_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Ignore single row parsing error
      }
    });
  } catch (error: any) {
    console.error('Error scraping Bazoš.cz:', error.message || error);
  }

  return {
    source: 'bazos',
    listings,
  };
}
