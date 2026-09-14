import React, { useState } from 'react';
import { Listing } from '../types';
import { ExternalLink, Sparkles, MapPin, Tag, CheckCircle2, Archive, AlertTriangle, Flame } from 'lucide-react';
import axios from 'axios';

interface ListingCardProps {
  listing: Listing;
  onUpdateStatus: (id: number, status: 'active' | 'archived' | 'bought' | 'ignored') => void;
  onRefreshListing?: () => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onUpdateStatus, onRefreshListing }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{ verdict: string; summary: string } | null>(
    listing.gemini_verdict ? { verdict: listing.gemini_verdict, summary: listing.gemini_summary || '' } : null
  );

  const formatCzk = (num?: number) => (num ? `${num.toLocaleString('cs-CZ')} Kč` : 'N/A');

  const handleGeminiCheck = async () => {
    setIsAiLoading(true);
    try {
      const res = await axios.post(`/api/listings/${listing.id}/gemini-check`);
      if (res.data.success && res.data.analysis) {
        setGeminiResult(res.data.analysis);
        if (onRefreshListing) onRefreshListing();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gemini AI check selhal. Zkontrolujte API klíč v Nastavení.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const isSteal = (geminiResult?.verdict || listing.gemini_verdict) === 'STEAL_BUY';
  const isGood = (geminiResult?.verdict || listing.gemini_verdict) === 'GOOD_DEAL';
  const isRisky = (geminiResult?.verdict || listing.gemini_verdict) === 'RISKY';

  return (
    <div
      className={`group relative bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
        isSteal
          ? 'border-emerald-500/50 shadow-emerald-500/10 ring-1 ring-emerald-500/30'
          : isGood
          ? 'border-amber-500/40 shadow-amber-500/5'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Banner Badges */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 font-bold uppercase rounded-md tracking-wider ${
              listing.source === 'bazos'
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                : listing.source === 'facebook'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {listing.source}
          </span>

          {listing.model && (
            <span className="flex items-center gap-1 font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
              <Tag className="w-3 h-3 text-blue-400" />
              {listing.model} {listing.capacity_gb ? `${listing.capacity_gb}GB` : ''}
            </span>
          )}
        </div>

        {/* Verdict Badge */}
        {isSteal && (
          <span className="flex items-center gap-1 font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md animate-pulse">
            <Flame className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" /> STEAL BUY
          </span>
        )}
        {isGood && (
          <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
            🔥 GOOD DEAL
          </span>
        )}
        {isRisky && (
          <span className="flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5" /> RIZIKO
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 relative">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/0/191.png';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold">No Photo</div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-100 hover:text-blue-400 text-base leading-snug line-clamp-2 transition-colors flex items-start gap-1"
            >
              <span>{listing.title}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-1" />
            </a>

            {/* Price & Profit Grid */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cena</span>
                <span className="text-base font-black text-white">{formatCzk(listing.price)}</span>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tržní Odhad</span>
                <span className="text-base font-bold text-slate-300">{formatCzk(listing.estimated_value)}</span>
              </div>

              <div
                className={`col-span-2 sm:col-span-1 p-2 rounded-xl border ${
                  listing.estimated_profit && listing.estimated_profit > 0
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[10px] uppercase font-semibold block">Odhadovaný Zisk</span>
                <span className="text-base font-black">
                  {listing.estimated_profit && listing.estimated_profit > 0
                    ? `+ ${formatCzk(listing.estimated_profit)}`
                    : formatCzk(listing.estimated_profit)}
                </span>
              </div>
            </div>

            {/* MP Buyout Prices Window */}
            {(listing.buyout_zanovni || listing.buyout_a || listing.buyout_b) ? (
              <div className="mt-2.5 p-2 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs flex flex-wrap items-center justify-between gap-1">
                <span className="font-semibold text-slate-400 text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse"></span>
                  Výkup MP:
                </span>
                <div className="flex items-center gap-2.5 font-mono text-[11px]">
                  <span title="Zánovní (jako nový)">
                    <span className="text-slate-500 mr-1">Zánovní:</span>
                    <span className="font-bold text-slate-200">{listing.buyout_zanovni ? `${listing.buyout_zanovni.toLocaleString('cs-CZ')} Kč` : '-'}</span>
                  </span>
                  <span title="Stav A (téměř nový)">
                    <span className="text-slate-500 mr-1">Stav A:</span>
                    <span className="font-bold text-emerald-400">{listing.buyout_a ? `${listing.buyout_a.toLocaleString('cs-CZ')} Kč` : '-'}</span>
                  </span>
                  <span title="Stav B (běžné opotřebení)">
                    <span className="text-slate-500 mr-1">Stav B:</span>
                    <span className="font-bold text-amber-400">{listing.buyout_b ? `${listing.buyout_b.toLocaleString('cs-CZ')} Kč` : '-'}</span>
                  </span>
                </div>
              </div>
            ) : null}

            {/* Location & Time */}
            <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {listing.location || 'ČR'}
              </span>
              <span>•</span>
              <span>{new Date(listing.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Gemini AI Summary Box */}
        {geminiResult ? (
          <div className="mt-4 p-3 rounded-xl bg-blue-950/20 border border-blue-800/40 text-xs text-slate-300">
            <div className="flex items-center justify-between font-bold text-blue-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Gemini AI Posouzení
              </span>
              <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">
                {geminiResult.verdict}
              </span>
            </div>
            <p className="leading-relaxed">{geminiResult.summary}</p>
          </div>
        ) : listing.description ? (
          <p className="mt-3 text-xs text-slate-400 line-clamp-2 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
            "{listing.description}"
          </p>
        ) : null}

        {/* Bottom Actions Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={handleGeminiCheck}
            disabled={isAiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
            {isAiLoading ? 'AI Analýza...' : geminiResult ? 'Znovu AI Check' : 'Gemini AI Check'}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateStatus(listing.id, 'bought')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all"
              title="Označit jako koupený iPhone"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Koupeno
            </button>

            <button
              onClick={() => onUpdateStatus(listing.id, 'archived')}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
              title="Archivovat / Skrýt"
            >
              <Archive className="w-4 h-4" />
            </button>

            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all"
            >
              Otevřít <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
