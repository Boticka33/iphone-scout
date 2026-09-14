export interface Listing {
  id?: number;
  external_id: string;
  source: 'bazos' | 'sbazar' | 'facebook';
  title: string;
  price: number;
  description: string;
  url: string;
  image_url: string;
  location: string;
  published_at?: string;
  created_at?: string;

  // Extracted attributes
  model?: string;
  capacity_gb?: number;
  estimated_value?: number;
  estimated_profit?: number;
  score?: number;

  // MP Grade Buyout Prices
  buyout_zanovni?: number;
  buyout_a?: number;
  buyout_b?: number;
  buyout_c?: number;
  buyout_d?: number;

  // Gemini AI Verification
  gemini_verdict?: 'STEAL_BUY' | 'GOOD_DEAL' | 'FAIR' | 'RISKY' | 'SKIP' | 'PENDING';
  gemini_summary?: string;
  gemini_verified_at?: string;

  // Status flags
  is_blacklisted?: boolean;
  is_notified?: boolean;
  status?: 'active' | 'archived' | 'bought' | 'ignored';
}

export interface PriceMatrixItem {
  id?: number;
  model: string;
  capacity_gb: number;
  target_buyout_price: number;
  target_resell_price: number;
  buyout_zanovni?: number;
  buyout_a?: number;
  buyout_b?: number;
  buyout_c?: number;
  buyout_d?: number;
  updated_at?: string;
}

export interface BlacklistItem {
  id?: number;
  keyword: string;
  type: 'title' | 'description' | 'both';
  is_active: boolean;
  created_at?: string;
}

export interface SystemSettings {
  gemini_api_key?: string;
  discord_webhook_url?: string;
  discord_bot_token?: string;
  discord_channel_id?: string;
  scrape_interval_seconds?: number;
  min_profit_alert?: number;
  auto_gemini_check?: boolean;
}

export interface ScraperResult {
  source: 'bazos' | 'sbazar' | 'facebook';
  listings: Array<{
    external_id: string;
    title: string;
    price: number;
    description: string;
    url: string;
    image_url: string;
    location: string;
    published_at?: string;
  }>;
}

export interface User {
  id?: number;
  email: string;
  password_hash?: string;
  role: 'admin' | 'reseller';
  created_at?: string;
}
