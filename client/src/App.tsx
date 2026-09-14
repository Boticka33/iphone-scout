import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './pages/DashboardView';
import { PriceMatrixView } from './pages/PriceMatrixView';
import { BlacklistView } from './pages/BlacklistView';
import { SettingsView } from './pages/SettingsView';
import axios from 'axios';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'blacklist' | 'settings'>('dashboard');
  const [isScraping, setIsScraping] = useState(false);
  const [stealBuyCount, setStealBuyCount] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/listings', { params: { gemini_verdict: 'STEAL_BUY' } });
      if (res.data.success) {
        setStealBuyCount(res.data.count || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerScrape = async () => {
    setIsScraping(true);
    try {
      await axios.post('/api/trigger-scrape');
      setTimeout(() => {
        setIsScraping(false);
        fetchStats();
      }, 3000);
    } catch (err) {
      setIsScraping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerScrape={handleTriggerScrape}
        isScraping={isScraping}
        stealBuyCount={stealBuyCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardView onRefreshStats={fetchStats} />}
        {activeTab === 'matrix' && <PriceMatrixView />}
        {activeTab === 'blacklist' && <BlacklistView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>iPhone Scout &copy; 2026 • Realtime iPhone Reselling Assistant</span>
          <span className="text-slate-600">Bazoš.cz • Sbazar.cz • Tier 1 RegEx & Tier 2 Gemini AI Engine</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
