import React, { useState, useEffect } from 'react';
import { Settings, Key, Bell, Clock, Send, CheckCircle2, AlertCircle, Globe, Users, UserPlus, Trash2 } from 'lucide-react';
import axios from 'axios';

interface SettingsViewProps {
  user?: { id: number; email: string; role: 'admin' | 'reseller' } | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form Inputs
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [apifyApiToken, setApifyApiToken] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [discordBotToken, setDiscordBotToken] = useState('');
  const [discordChannelId, setDiscordChannelId] = useState('');
  const [scrapeInterval, setScrapeInterval] = useState('30');
  const [minProfitAlert, setMinProfitAlert] = useState('1000');

  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Admin User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'reseller' | 'admin'>('reseller');
  const [userMsg, setUserMsg] = useState<{ success: boolean; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
        setScrapeInterval(res.data.settings.scrape_interval_seconds || '30');
        setMinProfitAlert(res.data.settings.min_profit_alert || '1000');
        setGeminiModel(res.data.settings.gemini_model || 'gemini-3.8-flash');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await axios.get('/api/auth/users');
      setUsersList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        scrape_interval_seconds: scrapeInterval,
        min_profit_alert: minProfitAlert,
        gemini_model: geminiModel,
      };
      if (geminiApiKey) payload.gemini_api_key = geminiApiKey;
      if (apifyApiToken) payload.apify_api_token = apifyApiToken;
      if (discordWebhookUrl) payload.discord_webhook_url = discordWebhookUrl;
      if (discordBotToken) payload.discord_bot_token = discordBotToken;
      if (discordChannelId) payload.discord_channel_id = discordChannelId;

      await axios.post('/api/settings', payload);
      alert('Nastavení úspěšně uloženo!');
      fetchSettings();
      setGeminiApiKey('');
      setApifyApiToken('');
      setDiscordWebhookUrl('');
    } catch (err) {
      alert('Chyba při ukládání nastavení.');
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await axios.post('/api/test-gemini', {
        gemini_api_key: geminiApiKey,
        gemini_model: geminiModel,
      });
      setGeminiTestResult({ success: true, message: res.data.message });
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: err.response?.data?.error || 'Chyba při komunikaci s Gemini API.',
      });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestDiscord = async () => {
    setTestingDiscord(true);
    setTestResult(null);
    try {
      const res = await axios.post('/api/test-discord', {
        discord_webhook_url: discordWebhookUrl,
        discord_bot_token: discordBotToken,
        discord_channel_id: discordChannelId,
      });
      setTestResult({ success: true, message: res.data.message });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.error || 'Chyba při odesílání notifikace. Zkontrolujte vkládanou URL adresu.',
      });
    } finally {
      setTestingDiscord(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return;
    setUserMsg(null);
    try {
      await axios.post('/api/auth/users', {
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });
      setUserMsg({ success: true, text: `Účet ${newUserEmail} byl úspěšně vytvořen!` });
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
    } catch (err: any) {
      setUserMsg({ success: false, text: err.response?.data?.error || 'Chyba při vytváření uživatele.' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Opravdu chcete smazat tento uživatelský účet?')) return;
    try {
      await axios.delete(`/api/auth/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Chyba při mazání uživatele.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Nastavení Systému & Integrace</h2>
            <p className="text-sm text-slate-400">
              Konfigurace Gemini AI klíče, Discord Bot notifikací, správy uživatelů a rychlosti skrapování.
            </p>
          </div>
        </div>
      </div>

      {/* Admin User Management Section */}
      {user?.role === 'admin' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-white text-base">Správa Resellerských Účtů (Admin)</h3>
              <p className="text-xs text-slate-400">Vytvářejte a spravujte přístupové účty pro vaše klienty a resellery.</p>
            </div>
          </div>

          {userMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                userMsg.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
              }`}
            >
              {userMsg.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {userMsg.text}
            </div>
          )}

          {/* Form to add user */}
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">E-mail nového uživatele</label>
              <input
                type="email"
                required
                placeholder="reseller@pro.cz"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Heslo</label>
              <input
                type="password"
                required
                placeholder="Heslo123..."
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'reseller' | 'admin')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="reseller">Reseller (Standard)</option>
                <option value="admin">Administrátor (Plný)</option>
              </select>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all h-[38px]"
            >
              <UserPlus className="w-4 h-4" />
              Vytvořit Účet
            </button>
          </form>

          {/* List of existing users */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Seznam Aktivních Účtů ({usersList.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {usersList.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${u.role === 'admin' ? 'bg-indigo-400' : 'bg-blue-400'}`} />
                    <span className="font-semibold text-slate-200">{u.email}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </div>

                  {u.id !== user.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Smazat uživatele"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Gemini AI Settings Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-base">Google Gemini AI Nastavení</h3>
            </div>

            <button
              type="button"
              onClick={handleTestGemini}
              disabled={testingGemini}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {testingGemini ? 'Testuji...' : 'Testovat Gemini AI'}
            </button>
          </div>

          {geminiTestResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                geminiTestResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
              }`}
            >
              {geminiTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {geminiTestResult.message}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400 mb-1 block">
                Gemini API Key (Získejte zdarma na{' '}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline"
                >
                  aistudio.google.com
                </a>
                )
              </label>
              <input
                type="password"
                placeholder={settings.gemini_api_key_set ? '•••••••••••••••• (Nakonfigurováno)' : 'Vložte AI klíč AIzaSy...'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">
                Název Modelu AI
              </label>
              <input
                type="text"
                placeholder="gemini-2.0-flash"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Facebook Marketplace & Apify Settings Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-bold text-white text-base">Facebook Marketplace (Ban-Safe)</h3>
              <p className="text-xs text-slate-400">0% risk zablokování účtu — nepoužívají se žádné osobní přihlašovací údaje.</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">
              Apify API Token (Volitelné - pro skrapování bez blokací přes rotující proxy ze servery Apify)
            </label>
            <input
              type="password"
              placeholder={settings.apify_api_token_set ? '•••••••••••••••• (Nakonfigurováno)' : 'Vložte Apify token apify_api_...'}
              value={apifyApiToken}
              onChange={(e) => setApifyApiToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Získejte zdarma na <a href="https://apify.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline">apify.com</a> (5$ volný kredit měsíčně).
            </span>
          </div>
        </div>

        {/* Discord Bot & Webhook Settings Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white text-base">Discord Notifikace</h3>
            </div>

            <button
              type="button"
              onClick={handleTestDiscord}
              disabled={testingDiscord}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {testingDiscord ? 'Odesílám...' : 'Testovat Discord Alert'}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {testResult.message}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Možnost A: Discord Webhook URL (Doporučeno - Nejjednodušší)</label>
              <input
                type="text"
                placeholder={settings.discord_webhook_url_set ? '•••••••• (Webhook nastaven)' : 'https://discord.com/api/webhooks/...'}
                value={discordWebhookUrl}
                onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-800/60">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Možnost B: Discord Bot Token</label>
                <input
                  type="password"
                  placeholder={settings.discord_bot_token_set ? '••••••••' : 'Bot Token...'}
                  value={discordBotToken}
                  onChange={(e) => setDiscordBotToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Discord Channel ID</label>
                <input
                  type="text"
                  placeholder="ID kanálu..."
                  value={discordChannelId}
                  onChange={(e) => setDiscordChannelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scraper Timing & Profit Threshold Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Frekvence a Prahové Hodnoty</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Frekvence kontroly (sekundy)</label>
              <input
                type="number"
                min="10"
                max="300"
                value={scrapeInterval}
                onChange={(e) => setScrapeInterval(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Doporučeno 15 až 30 sekund</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Min. Zisk pro Odeslání Notifikace (Kč)</label>
              <input
                type="number"
                step="250"
                value={minProfitAlert}
                onChange={(e) => setMinProfitAlert(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Inzeráty s nižším odhadovaným ziskem nepošlou push notifikaci do Discordu</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all"
        >
          Uložit Všechna Nastavení
        </button>
      </form>
    </div>
  );
};
