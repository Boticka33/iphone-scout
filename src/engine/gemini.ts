import { GoogleGenerativeAI } from '@google/generative-ai';
import { Listing } from '../types';
import { getSetting, updateListingGemini } from '../db/database';

export interface GeminiAnalysisResult {
  verdict: 'STEAL_BUY' | 'GOOD_DEAL' | 'FAIR' | 'RISKY' | 'SKIP';
  summary: string;
  detected_flaws: string[];
  battery_health?: string;
  warranty?: string;
}

// Valid cheap Flash models order (most recent & affordable first)
const DEFAULT_FLASH_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export async function analyzeListingWithGemini(listing: Listing): Promise<GeminiAnalysisResult | null> {
  const rawApiKey = await getSetting('gemini_api_key');
  const apiKey = rawApiKey ? rawApiKey.trim() : '';

  if (!apiKey) {
    console.warn('[Gemini AI] Skipped: API Key is not set in Settings.');
    return null;
  }

  const customModel = await getSetting('gemini_model');
  const modelsToTry = Array.from(
    new Set([...(customModel ? [customModel.trim()] : []), ...DEFAULT_FLASH_MODELS].filter(Boolean))
  );

  const prompt = `
Jsi expertní výkupčí a reseller iPhonů v České republice.
Tvým úkolem je analyzovat inzerát na použitý iPhone z bazaru a vyhodnotit, zda se jedná o výhodný výkup (steal buy) nebo riziko.

MÁŠ K DISPOZICI TYTO ÚDAJE O INZERÁTU:
- Název: "${listing.title}"
- Cena: ${listing.price} Kč
- Popis: "${listing.description}"
- Zjištěný model: ${listing.model || 'Neznámý'} (${listing.capacity_gb || '?'} GB)
- Odhadovaná prodejní tržní cena: ${listing.estimated_value || 0} Kč
- Vypočítaný potenciální zisk: ${listing.estimated_profit || 0} Kč

PROVEDEŠ STRUKTUROVANOU ANALÝZU A VRÁTÍŠ POUZE VALIDNÍ JSON BEZ SVASEK KÓDU (NO MARKDOWN CODE BLOCKS):
{
  "verdict": "STEAL_BUY" | "GOOD_DEAL" | "FAIR" | "RISKY" | "SKIP",
  "summary": "Stručný přehled v češtině (2-3 věty) s hodnocením stavu a výkupního potenciálu",
  "detected_flaws": ["seznam odhalených vad nebo rizik z textu"],
  "battery_health": "údaj o baterii pokud je v textu (např. 88% nebo neznámo)",
  "warranty": "údaj o záruce pokud je v textu"
}

KRITÉRIA PRO VERDIKT:
- STEAL_BUY: Mimořádně výhodná cena (zisk > 1500 Kč), skvělý stav, bez zásadních vad nebo s fakturou/zárukou.
- GOOD_DEAL: Dobrá cena se solidním ziskem, běžné opotřebení.
- FAIR: Běžná tržní cena, malý prostor pro zisk.
- RISKY: Podezřele nízká cena (možný podvod), prasklé tělo/displej, vyměněný neoriginální díl, nefunkční FaceID, nejasný iCloud.
- SKIP: Příslušenství (pouze obal/sklo), výkupní poptávka (kupuji), nekompletní díly nebo zjevný podvod.
`;

  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError = '';
  for (const modelName of modelsToTry) {
    try {
      console.log(`[Gemini AI] Requesting analysis using model '${modelName}'...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(prompt);
      const responseText = response.response.text().trim();

      const jsonMatch = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const result: GeminiAnalysisResult = JSON.parse(jsonMatch);

      if (listing.id) {
        await updateListingGemini(listing.id, result.verdict, result.summary);
      }

      console.log(`[Gemini AI] Successfully analyzed using model '${modelName}': Verdict=${result.verdict}`);
      return result;
    } catch (error: any) {
      lastError = error.status ? `HTTP ${error.status}: ${error.message}` : error.message;
      console.warn(`[Gemini AI] Model '${modelName}' failed (${lastError}). Trying next model...`);
    }
  }

  console.error(`[Gemini AI] All Flash models failed. Last error: ${lastError}. Check your Gemini API Key in Settings.`);
  return null;
}
