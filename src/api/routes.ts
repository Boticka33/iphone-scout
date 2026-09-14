import { Router, Request, Response } from 'express';
import {
  getListings,
  getListingById,
  updateListingStatus,
  getPriceMatrix,
  updatePriceMatrixItem,
  deletePriceMatrixItem,
  getBlacklist,
  addBlacklistKeyword,
  removeBlacklistKeyword,
  toggleBlacklistKeyword,
  getAllSettings,
  getSetting,
  setSetting,
} from '../db/database';
import { analyzeListingWithGemini } from '../engine/gemini';
import { sendDiscordNotification } from '../notifications/discord';
import { runScrapeCycle } from '../scrapers/manager';
import { IPHONE_MODELS } from '../engine/models';

const router = Router();

// --- Listings API ---

router.get('/listings', async (req: Request, res: Response) => {
  try {
    const filters = {
      source: req.query.source as string,
      model: req.query.model as string,
      capacity_gb: req.query.capacity_gb ? parseInt(req.query.capacity_gb as string, 10) : undefined,
      min_price: req.query.min_price ? parseInt(req.query.min_price as string, 10) : undefined,
      max_price: req.query.max_price ? parseInt(req.query.max_price as string, 10) : undefined,
      min_profit: req.query.min_profit ? parseInt(req.query.min_profit as string, 10) : undefined,
      gemini_verdict: req.query.gemini_verdict as string,
      search: req.query.search as string,
      status: req.query.status as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    const listings = await getListings(filters);
    res.json({ success: true, count: listings.length, listings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const listing = await getListingById(parseInt(String(req.params.id), 10));
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    res.json({ success: true, listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/listings/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['active', 'archived', 'bought', 'ignored'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    await updateListingStatus(parseInt(String(req.params.id), 10), status);
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/listings/:id/gemini-check', async (req: Request, res: Response) => {
  try {
    const listing = await getListingById(parseInt(String(req.params.id), 10));
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });

    const result = await analyzeListingWithGemini(listing);
    if (!result) {
      return res.status(500).json({ success: false, error: 'Gemini AI check failed or API Key missing.' });
    }

    const updated = await getListingById(listing.id!);
    res.json({ success: true, analysis: result, listing: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Price Matrix API ---

router.get('/price-matrix', async (_req: Request, res: Response) => {
  try {
    const matrix = await getPriceMatrix();
    res.json({ success: true, matrix, available_models: IPHONE_MODELS });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/price-matrix', async (req: Request, res: Response) => {
  try {
    const { model, capacity_gb, target_buyout_price, target_resell_price } = req.body;
    if (!model || !capacity_gb || !target_buyout_price || !target_resell_price) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    await updatePriceMatrixItem(model, Number(capacity_gb), Number(target_buyout_price), Number(target_resell_price));
    res.json({ success: true, message: 'Price matrix item updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/price-matrix/:model/:capacity_gb', async (req: Request, res: Response) => {
  try {
    await deletePriceMatrixItem(String(req.params.model), parseInt(String(req.params.capacity_gb), 10));
    res.json({ success: true, message: 'Item deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/price-matrix/sync-isniper', async (_req: Request, res: Response) => {
  try {
    const { syncPriceMatrixFromIsniper } = await import('../engine/isniper');
    const result = await syncPriceMatrixFromIsniper();
    if (result.errors.length > 0 && result.updatedCount === 0) {
      return res.status(500).json({ success: false, error: result.errors[0] });
    }
    res.json({
      success: true,
      message: `Synchronizace dokončena. Aktualizováno ${result.updatedCount} pravidel pro ${result.modelsCount} modelů.`,
      updatedCount: result.updatedCount,
      modelsCount: result.modelsCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Blacklist API ---

router.get('/blacklist', async (_req: Request, res: Response) => {
  try {
    const blacklist = await getBlacklist();
    res.json({ success: true, blacklist });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/blacklist', async (req: Request, res: Response) => {
  try {
    const { keyword, type } = req.body;
    if (!keyword) return res.status(400).json({ success: false, error: 'Keyword required' });
    await addBlacklistKeyword(keyword, type || 'both');
    res.json({ success: true, message: 'Keyword added to blacklist' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/blacklist/:id', async (req: Request, res: Response) => {
  try {
    await removeBlacklistKeyword(parseInt(String(req.params.id), 10));
    res.json({ success: true, message: 'Keyword removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/blacklist/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { is_active } = req.body;
    await toggleBlacklistKeyword(parseInt(String(req.params.id), 10), Boolean(is_active));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Settings API ---

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getAllSettings();
    res.json({
      success: true,
      settings: {
        ...settings,
        gemini_api_key_set: Boolean(settings.gemini_api_key),
        apify_api_token_set: Boolean(settings.apify_api_token),
        discord_webhook_url_set: Boolean(settings.discord_webhook_url),
        discord_bot_token_set: Boolean(settings.discord_bot_token),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/settings', async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    for (const [key, val] of Object.entries(newSettings)) {
      if (typeof val === 'string') {
        await setSetting(key, val);
      }
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Utility Endpoints ---

router.post('/test-discord', async (req: Request, res: Response) => {
  const { discord_webhook_url, discord_bot_token, discord_channel_id } = req.body || {};

  const testListing = {
    external_id: 'test-123',
    source: 'bazos' as const,
    title: 'TEST: iPhone 15 Pro 128GB Zánovní záruka',
    price: 16500,
    description: 'Testovací notifikace z iPhone Scout Dashboardu. Telefon je ve 100% stavu.',
    url: 'https://mobil.bazos.cz/',
    image_url: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg',
    location: 'Praha 1',
    model: 'iPhone 15 Pro',
    capacity_gb: 128,
    estimated_value: 21500,
    estimated_profit: 5000,
    score: 85,
    gemini_verdict: 'STEAL_BUY' as const,
    gemini_summary: 'Testovací zpráva: Vynikající nabídka se ziskem 5 000 Kč a zárukou.',
  };

  try {
    const success = await sendDiscordNotification(testListing, {
      webhookUrl: discord_webhook_url,
      botToken: discord_bot_token,
      channelId: discord_channel_id,
    });

    if (success) {
      res.json({ success: true, message: 'Notifikace byla úspěšně odeslána na váš Discord!' });
    } else {
      res.status(400).json({
        success: false,
        error: 'Nebyl zadán platný Discord Webhook URL ani Bot Token s Channel ID. Vložte Webhook URL a klikněte na Uložit Všechna Nastavení.',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Chyba při komunikaci s Discord API.',
    });
  }
});

router.post('/trigger-scrape', async (_req: Request, res: Response) => {
  runScrapeCycle();
  res.json({ success: true, message: 'Scrape cycle triggered' });
});

router.post('/test-gemini', async (req: Request, res: Response) => {
  try {
    const { gemini_api_key, gemini_model } = req.body || {};
    const apiKey = (gemini_api_key || (await getSetting('gemini_api_key')) || '').trim();

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Vložte Gemini API Key v nastavení.' });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = (gemini_model || (await getSetting('gemini_model')) || 'gemini-3.8-flash').trim();

    const model = genAI.getGenerativeModel({ model: modelName });
    const response = await model.generateContent('Ahoj, odpovez jednim slovem: OK.');
    const text = response.response.text();

    res.json({
      success: true,
      message: `Gemini AI spojení je plně funkční! (Model: ${modelName}). Odpověď API: "${text.trim()}"`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: `Gemini API chyba (${error.status || 'Chyba'}): ${error.message}`,
    });
  }
});

export default router;
