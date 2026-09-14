import React, { useState, useEffect } from 'react';
import { Listing } from '../types';
import { ListingCard } from '../components/ListingCard';
import { Search, Filter, Flame, DollarSign, Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface DashboardViewProps {
  onRefreshStats?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onRefreshStats }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<string[]>([]);

  // Filter States
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [minProfit, setMinProfit] = useState<number>(0);
  const [selectedVerdict, setSelectedVerdict] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedModel) params.model = selectedModel;
      if (selectedSource) params.source = selectedSource;
      if (minProfit > 0) params.min_profit = minProfit;
      if (selectedVerdict) params.gemini_verdict = selectedVerdict;
      if (searchQuery) params.search = searchQuery;

      const res = await axios.get('/api/listings', { params });
      if (res.data.success) {
        setListings(res.data.listings);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const res = await axios.get('/api/price-matrix');
      if (res.data.available_models) {
        setModels(res.data.available_models);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedModel, selectedSource, minProfit, selectedVerdict, searchQuery]);

  const handleUpdateStatus = async (id: number, status: 'active' | 'archived' | 'bought' | 'ignored') => {
    try {
      await axios.post(`/api/listings/${id}/status`, { status });
      fetchListings();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Quick stats
  const totalCount = listings.length;
  const stealBuys = listings.filter((l) => l.gemini_verdict === 'STEAL_BUY').length;
  const avgProfit =
    totalCount > 0
      ? Math.round(
          listings.reduce((acc, l) => acc + (l.estimated_profit && l.estimated_profit > 0 ? l.estimated_profit : 0), 0) /
            (totalCount || 1)
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Celkem inzerátů</span>
            <span className="text-2xl font-black text-white mt-1 block">{totalCount}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/5">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Steal Buys</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{stealBuys}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Průměrný Zisk</span>
            <span className="text-2xl font-black text-slate-200 mt-1 block">{avgProfit.toLocaleString('cs-CZ')} Kč</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Control Panel */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Hledat v titulku, popisu nebo lokalitě..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={fetchListings}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold border border-slate-700 transition-all"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" /> Obnovit
          </button>
        </div>

        {/* Dropdowns & Sliders */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60 text-xs">
          {/* Model Filter */}
          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Model iPhonu</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Všechny modely</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Zdroj Bazaru</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Všechny zdroje</option>
              <option value="bazos">Bazoš.cz</option>
              <option value="sbazar">Sbazar.cz</option>
              <option value="facebook">Facebook Marketplace</option>
            </select>
          </div>

          {/* Verdict Filter */}
          <div>
            <label className="text-slate-400 font-semibold mb-1 block">AI Posouzení</label>
            <select
              value={selectedVerdict}
              onChange={(e) => setSelectedVerdict(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Všechny verdikty</option>
              <option value="STEAL_BUY">🚨 Steal Buy</option>
              <option value="GOOD_DEAL">🔥 Good Deal</option>
              <option value="FAIR">FAIR</option>
              <option value="RISKY">⚠️ Riziko</option>
            </select>
          </div>

          {/* Min Profit Filter */}
          <div>
            <label className="text-slate-400 font-semibold mb-1 flex justify-between">
              <span>Min. Odhadovaný Zisk</span>
              <span className="text-blue-400 font-bold">{minProfit > 0 ? `${minProfit} Kč` : 'Vše'}</span>
            </label>
            <input
              type="range"
              min="0"
              max="10000"
              step="500"
              value={minProfit}
              onChange={(e) => setMinProfit(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer mt-2"
            />
          </div>
        </div>
      </div>

      {/* Main Grid Feed */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-medium">Načítám aktuální inzeráty...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="py-16 bg-slate-900/50 border border-slate-800 rounded-2xl text-center p-8">
          <Smartphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200">Žádné inzeráty neodpovídají filtrům</h3>
          <p className="text-slate-400 text-sm mt-1">Zkuste resetovat filtry nebo počkat na další skrapovací cyklus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onUpdateStatus={handleUpdateStatus}
              onRefreshListing={fetchListings}
            />
          ))}
        </div>
      )}
    </div>
  );
};
