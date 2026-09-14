import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './pages/DashboardView';
import { PriceMatrixView } from './pages/PriceMatrixView';
import { BlacklistView } from './pages/BlacklistView';
import { SettingsView } from './pages/SettingsView';
import axios from 'axios';

// Configure Axios authorization interceptors
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function App() {
  const [user, setUser] = useState<{ id: number; email: string; role: 'admin' | 'reseller' } | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'blacklist' | 'settings'>('dashboard');
  const [isScraping, setIsScraping] = useState(false);
  const [stealBuyCount, setStealBuyCount] = useState(0);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const fetchStats = async () => {
    if (!token) return;
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
    if (token) {
      fetchStats();
      const interval = setInterval(fetchStats, 20000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUser: { id: number; email: string; role: 'admin' | 'reseller' }) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

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

  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerScrape={handleTriggerScrape}
        isScraping={isScraping}
        stealBuyCount={stealBuyCount}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardView onRefreshStats={fetchStats} />}
        {activeTab === 'matrix' && <PriceMatrixView />}
        {activeTab === 'blacklist' && <BlacklistView />}
        {activeTab === 'settings' && <SettingsView user={user} />}
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
