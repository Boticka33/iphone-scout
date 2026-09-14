import React, { useState, useEffect } from 'react';
import { PriceMatrixItem } from '../types';
import { Plus, Trash2, Save, DollarSign, RefreshCw, Check } from 'lucide-react';
import axios from 'axios';

export const PriceMatrixView: React.FC = () => {
  const [matrix, setMatrix] = useState<PriceMatrixItem[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<PriceMatrixItem> | null>(null);

  // New item form state
  const [newModel, setNewModel] = useState('');
  const [newCapacity, setNewCapacity] = useState(128);
  const [newBuyout, setNewBuyout] = useState('');
  const [newResell, setNewResell] = useState('');

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/price-matrix');
      if (res.data.success) {
        setMatrix(res.data.matrix);
        setModels(res.data.available_models);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const handleSyncIsniper = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await axios.post('/api/price-matrix/sync-isniper');
      if (res.data.success) {
        setSyncMessage(res.data.message);
        fetchMatrix();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Chyba při synchronizaci z vykup.isniper.cz');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveItem = async (model: string, capacity_gb: number, buyout: number, resell: number) => {
    try {
      await axios.post('/api/price-matrix', {
        model,
        capacity_gb,
        target_buyout_price: buyout,
        target_resell_price: resell,
      });
      fetchMatrix();
      setEditingItem(null);
    } catch (err) {
      alert('Chyba při ukládání položky.');
    }
  };

  const handleDeleteItem = async (model: string, capacity_gb: number) => {
    if (!confirm(`Opravdu chcete smazat pravidlo pro ${model} ${capacity_gb}GB?`)) return;
    try {
      await axios.delete(`/api/price-matrix/${encodeURIComponent(model)}/${capacity_gb}`);
      fetchMatrix();
    } catch (err) {
      alert('Chyba při mazání.');
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel || !newBuyout || !newResell) {
      alert('Vyplňte model, výkupní i tržní cenu.');
      return;
    }
    handleSaveItem(newModel, Number(newCapacity), Number(newBuyout), Number(newResell));
    setNewBuyout('');
    setNewResell('');
  };

  return (
    <div className="space-y-6">
      {/* Title & Info Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Editor Cenové Matice</h2>
              <p className="text-sm text-slate-400">
                Možnost nastavit ručně nebo automaticky načíst nejnovější výkupní ceny z Mobil Pohotovosti a průměry Bazoše z vykup.isniper.cz.
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncIsniper}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronizuji z iSniper...' : 'Auto-Sync z vykup.isniper.cz'}
          </button>
        </div>

        {syncMessage && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" /> {syncMessage}
          </div>
        )}
      </div>

      {/* Add New Record Form */}
      <form onSubmit={handleAddSubmit} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Přidat / Upravit model v matici</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Model iPhonu</label>
            <select
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Vyberte model...</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Kapacita</label>
            <select
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value={64}>64 GB</option>
              <option value={128}>128 GB</option>
              <option value={256}>256 GB</option>
              <option value={512}>512 GB</option>
              <option value={1024}>1 TB</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Max. Výkupní Cena (Kč)</label>
            <input
              type="number"
              placeholder="např. 15000"
              value={newBuyout}
              onChange={(e) => setNewBuyout(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Tržní Prodejní Cena (Kč)</label>
            <input
              type="number"
              placeholder="např. 18500"
              value={newResell}
              onChange={(e) => setNewResell(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" /> Uložit Pravidlo Matice
        </button>
      </form>

      {/* Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Načítám cenovou matici...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Model & GB</th>
                  <th className="px-3 py-3 text-emerald-400">MP Zánovní</th>
                  <th className="px-3 py-3 text-blue-400">MP Stav A</th>
                  <th className="px-3 py-3 text-purple-400">MP Stav B</th>
                  <th className="px-3 py-3 text-amber-400">MP Stav C</th>
                  <th className="px-4 py-3 text-sky-300">Bazoš 30d Průměr</th>
                  <th className="px-4 py-3 font-bold text-white bg-slate-950/40">Cílový Výkup</th>
                  <th className="px-4 py-3 font-bold text-emerald-400">Možný Zisk</th>
                  <th className="px-4 py-3 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {matrix.map((item) => {
                  const targetProfit = item.target_resell_price - item.target_buyout_price;
                  const fmt = (n?: number) => (n && n > 0 ? `${n.toLocaleString('cs-CZ')} Kč` : '-');

                  return (
                    <tr key={`${item.model}-${item.capacity_gb}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                        {item.model} <span className="text-blue-400 font-semibold">{item.capacity_gb}GB</span>
                      </td>

                      {/* MP Grades */}
                      <td className="px-3 py-3 font-semibold text-emerald-400/90">{fmt(item.buyout_zanovni)}</td>
                      <td className="px-3 py-3 font-semibold text-blue-400/90">{fmt(item.buyout_a)}</td>
                      <td className="px-3 py-3 font-semibold text-purple-400/90">{fmt(item.buyout_b)}</td>
                      <td className="px-3 py-3 font-semibold text-amber-400/90">{fmt(item.buyout_c)}</td>

                      {/* Bazoš 30d Avg */}
                      <td className="px-4 py-3 font-extrabold text-sky-300 bg-sky-950/20">{fmt(item.target_resell_price)}</td>

                      {/* Active Target Buyout Price */}
                      <td className="px-4 py-3 bg-slate-950/40">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-white text-sm">{fmt(item.target_buyout_price)}</span>
                        </div>
                      </td>

                      {/* Expected Profit */}
                      <td className="px-4 py-3">
                        <span
                          className={`font-black px-2 py-0.5 rounded-md ${
                            targetProfit > 0
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : 'text-slate-500 bg-slate-800'
                          }`}
                        >
                          {targetProfit > 0 ? `+ ${fmt(targetProfit)}` : fmt(targetProfit)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteItem(item.model, item.capacity_gb)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Smazat z matice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
