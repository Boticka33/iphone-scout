import React, { useState, useEffect } from 'react';
import { BlacklistItem } from '../types';
import { ShieldAlert, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';

export const BlacklistView: React.FC = () => {
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newType, setNewType] = useState<'title' | 'description' | 'both'>('both');
  const [loading, setLoading] = useState(true);

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/blacklist');
      if (res.data.success) {
        setBlacklist(res.data.blacklist);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    try {
      await axios.post('/api/blacklist', { keyword: newKeyword, type: newType });
      setNewKeyword('');
      fetchBlacklist();
    } catch (err) {
      alert('Chyba při přidávání slova.');
    }
  };

  const handleDeleteKeyword = async (id: number) => {
    try {
      await axios.delete(`/api/blacklist/${id}`);
      fetchBlacklist();
    } catch (err) {
      alert('Chyba při mazání slova.');
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await axios.post(`/api/blacklist/${id}/toggle`, { is_active: !currentActive });
      fetchBlacklist();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Správa Blacklistu a Zakázaných Slova</h2>
            <p className="text-sm text-slate-400">
              Inzeráty obsahující tato slova budou automaticky ignorovány nebo označeny záporným skóre (např. iCloud, nefunkční, díly).
            </p>
          </div>
        </div>
      </div>

      {/* Add Keyword Form */}
      <form onSubmit={handleAddKeyword} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Přidat zakázané fráze</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="např. iCloud lock, prasklé sklo, nefunkční..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
          />

          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
          >
            <option value="both">Hledat v Titulku i Popisu</option>
            <option value="title">Pouze v Titulku</option>
            <option value="description">Pouze v Popisu</option>
          </select>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Přidat do Blacklistu
          </button>
        </div>
      </form>

      {/* Blacklist Items Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Načítám blacklist...</div>
        ) : blacklist.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Blacklist je prázdný.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {blacklist.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  item.is_active
                    ? 'bg-slate-950 border-rose-500/30 text-rose-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <div>
                  <span className="font-bold text-sm block">{item.keyword}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    {item.type === 'both' ? 'Titul & Popis' : item.type === 'title' ? 'Pouze Titul' : 'Pouze Popis'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(item.id, item.is_active)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                    title={item.is_active ? 'Deaktivovat' : 'Aktivovat'}
                  >
                    {item.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDeleteKeyword(item.id)}
                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400 transition-colors"
                    title="Smazat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
