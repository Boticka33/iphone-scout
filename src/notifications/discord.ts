import axios from 'axios';
import { Listing } from '../types';
import { getSetting, updateListingNotified } from '../db/database';

export async function sendDiscordNotification(
  listing: Listing,
  overrideConfig?: { webhookUrl?: string; botToken?: string; channelId?: string }
): Promise<boolean> {
  const rawWebhookUrl = overrideConfig?.webhookUrl || (await getSetting('discord_webhook_url'));
  const rawBotToken = overrideConfig?.botToken || (await getSetting('discord_bot_token'));
  const rawChannelId = overrideConfig?.channelId || (await getSetting('discord_channel_id'));

  const webhookUrl = rawWebhookUrl ? rawWebhookUrl.trim() : '';
  const botToken = rawBotToken ? rawBotToken.trim() : '';
  const channelId = rawChannelId ? rawChannelId.trim() : '';

  if (!webhookUrl && (!botToken || !channelId)) {
    console.warn('Discord notification skipped: Neither Webhook URL nor Bot Token + Channel ID configured.');
    return false;
  }

  const fmt = (num?: number) => (num ? `${num.toLocaleString('cs-CZ')} Kč` : 'N/A');

  let color = 0x3b82f6;
  if (listing.gemini_verdict === 'STEAL_BUY' || (listing.score && listing.score >= 50)) {
    color = 0x22c55e;
  } else if (listing.gemini_verdict === 'GOOD_DEAL' || (listing.score && listing.score >= 30)) {
    color = 0xeab308;
  } else if (listing.gemini_verdict === 'RISKY') {
    color = 0xef4444;
  }

  const badge =
    listing.gemini_verdict === 'STEAL_BUY'
      ? '🚨 STEAL BUY ALERT! 🚨'
      : listing.gemini_verdict === 'GOOD_DEAL'
      ? '🔥 Výhodná nabídka'
      : '📱 Nový inzerát';

  const embed = {
    title: `${badge}: ${listing.title}`,
    url: listing.url,
    color,
    fields: [
      { name: '💰 Cena inzerátu', value: fmt(listing.price), inline: true },
      { name: '📈 Odhadovaná tržní cena', value: fmt(listing.estimated_value), inline: true },
      { name: '💵 Odhadovaný zisk', value: listing.estimated_profit ? `**+ ${fmt(listing.estimated_profit)}**` : 'N/A', inline: true },
      { name: '📱 Detekovaný Model', value: listing.model ? `${listing.model} (${listing.capacity_gb || '?'} GB)` : 'Neznámý', inline: true },
      { name: '📍 Lokalita', value: listing.location || 'Česká republika', inline: true },
      { name: '🌐 Zdroj', value: listing.source.toUpperCase(), inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: `iPhone Scout Bot • Score: ${listing.score || 0}`,
    },
  };

  if (listing.gemini_summary) {
    embed.fields.push({
      name: `🤖 Gemini AI Posouzení (${listing.gemini_verdict || 'OK'})`,
      value: listing.gemini_summary,
      inline: false,
    });
  } else if (listing.description) {
    const shortDesc = listing.description.length > 250 ? `${listing.description.substring(0, 250)}...` : listing.description;
    embed.fields.push({
      name: '📝 Popis inzerátu',
      value: shortDesc,
      inline: false,
    });
  }

  if (listing.image_url && listing.image_url.startsWith('http')) {
    (embed as any).thumbnail = { url: listing.image_url };
  }

  try {
    if (webhookUrl) {
      await axios.post(webhookUrl, {
        username: 'iPhone Scout',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/0/191.png',
        embeds: [embed],
      });
    } else if (botToken && channelId) {
      await axios.post(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        { embeds: [embed] },
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (listing.id) {
      await updateListingNotified(listing.id);
    }
    console.log(`[Discord] Alert sent for ${listing.title} (${listing.url})`);
    return true;
  } catch (error: any) {
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message || String(error);
    console.error('[Discord] Failed to send notification:', errorDetails);
    throw new Error(`Discord API odmítl požadavek: ${errorDetails}`);
  }
}
