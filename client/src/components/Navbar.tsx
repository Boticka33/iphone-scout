import React from 'react';
import { Smartphone, DollarSign, ShieldAlert, Settings, RefreshCw, Flame } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'matrix' | 'blacklist' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'matrix' | 'blacklist' | 'settings') => void;
  onTriggerScrape: () => void;
  isScraping: boolean;
  stealBuyCount: number;
  user?: { email: string; role: 'admin' | 'reseller' } | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onTriggerScrape,
  isScraping,
  stealBuyCount,
  user,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">iPhone Scout</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  PRO
                </span>
              </div>
              <p className="text-xs text-slate-400">Bazoš & Sbazar Realtime Monitor</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Inzeráty</span>
              {stealBuyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-emerald-500 text-slate-950 rounded-full animate-pulse flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-slate-950" /> {stealBuyCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'matrix'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Cenová Matice</span>
            </button>

            <button
              onClick={() => setActiveTab('blacklist')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'blacklist'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Blacklist</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Nastavení</span>
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onTriggerScrape}
              disabled={isScraping}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
              title="Spustit ruční kontrolu bazarů"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isScraping ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isScraping ? 'Skrapuji...' : 'Scoutovat Hned'}</span>
            </button>

            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <span className="hidden lg:inline-block text-xs font-medium text-slate-300">
                  {user.email}
                </span>
                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
                  title="Odhlásit se z účtu"
                >
                  Odhlásit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
