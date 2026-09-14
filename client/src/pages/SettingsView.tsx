import React, { useState, useEffect } from 'react';
import { Settings, Key, Bell, Clock, Send, CheckCircle2, AlertCircle, Globe, Users, UserPlus, Trash2, UserCheck } from 'lucide-react';
import axios from 'axios';

interface SettingsViewProps {
  user?: { id: number; email: string; role: 'admin' | 'reseller' } | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
  // Personal Settings State
  const [myDiscordWebhookUrl, setMyDiscordWebhookUrl] = useState('');
  const [myDiscordBotToken, setMyDiscordBotToken] = useState('');
  const [myDiscordChannelId, setMyDiscordChannelId] = useState('');
  const [myMinProfitAlert, setMyMinProfitAlert] = useState('1000');
  const [myGeminiApiKey, setMyGeminiApiKey] = useState('');

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalMsg, setPersonalMsg] = useState<{ success: boolean; text: string } | null>(null);

  const [testingMyDiscord, setTestingMyDiscord] = useState(false);
  const [myDiscordTestResult, setMyDiscordTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Admin System Settings State
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [systemGeminiApiKey, setSystemGeminiApiKey] = useState('');
  const [systemGeminiModel, setSystemGeminiModel] = useState('gemini-3.8-flash');
  const [systemApifyToken, setSystemApifyToken] = useState('');
  const [systemScrapeInterval, setSystemScrapeInterval] = useState('30');

  // Admin User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'reseller' | 'admin'>('reseller');
  const [userMsg, setUserMsg] = useState<{ success: boolean; text: string } | null>(null);

  const fetchUserSettings = async () => {
    try {
      const res = await axios.get('/api/user-settings');
      if (res.data.success) {
        setMyDiscordWebhookUrl(res.data.settings.discord_webhook_url || '');
        setMyDiscordBotToken(res.data.settings.discord_bot_token || '');
        setMyDiscordChannelId(res.data.settings.discord_channel_id || '');
        setMyMinProfitAlert(String(res.data.settings.min_profit_alert || 1000));
        setMyGeminiApiKey(res.data.settings.gemini_api_key || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSystemSettings = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await axios.get('/api/settings');
      if (res.data.success) {
        setSystemSettings(res.data.settings);
        setSystemScrapeInterval(res.data.settings.scrape_interval_seconds || '30');
        setSystemGeminiModel(res.data.settings.gemini_model || 'gemini-3.8-flash');
      }
    } catch (err) {
      console.error(err);
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
    fetchUserSettings();
    if (user?.role === 'admin') {
      fetchSystemSettings();
      fetchUsers();
    }
  }, [user]);

  const handleSavePersonalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersonal(true);
    setPersonalMsg(null);
    try {
      await axios.post('/api/user-settings', {
        discord_webhook_url: myDiscordWebhookUrl,
        discord_bot_token: myDiscordBotToken,
        discord_channel_id: myDiscordChannelId,
        min_profit_alert: parseInt(myMinProfitAlert, 10),
        gemini_api_key: myGeminiApiKey,
      });
      setPersonalMsg({ success: true, text: 'Vaše osobní nastavení notifikací bylo úspěšně uloženo!' });
    } catch (err: any) {
      setPersonalMsg({ success: false, text: err.response?.data?.error || 'Chyba při ukládání nastavení.' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleTestMyDiscord = async () => {
    setTestingMyDiscord(true);
    setMyDiscordTestResult(null);
    try {
      const res = await axios.post('/api/test-user-discord', {
        discord_webhook_url: myDiscordWebhookUrl,
        discord_bot_token: myDiscordBotToken,
        discord_channel_id: myDiscordChannelId,
      });
      setMyDiscordTestResult({ success: true, message: res.data.message });
    } catch (err: any) {
      setMyDiscordTestResult({
        success: false,
        message: err.response?.data?.error || 'Chyba při odesílání notifikace. Zkontrolujte váš Webhook URL.',
      });
    } finally {
      setTestingMyDiscord(false);
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        scrape_interval_seconds: systemScrapeInterval,
        gemini_model: systemGeminiModel,
      };
      if (systemGeminiApiKey) payload.gemini_api_key = systemGeminiApiKey;
      if (systemApifyToken) payload.apify_api_token = systemApifyToken;

      await axios.post('/api/settings', payload);
      alert('Systémové nastavení uloženo!');
      fetchSystemSettings();
    } catch (err) {
      alert('Chyba při ukládání systémového nastavení.');
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
            <h2 className="text-xl font-bold text-white">Nastavení Účtu & Notifikací</h2>
            <p className="text-sm text-slate-400">
              Nakonfigurujte si svůj osobní Discord kanál pro příjem ziskových upozornění.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Personal Reseller Settings */}
      <form onSubmit={handleSavePersonalSettings} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-white text-base">Moje Osobní Notifikace & Discord Bot</h3>
              <p className="text-xs text-slate-400">Notifikace o nových výhodných inzerátech budou chodit do vašeho osobního Discordu.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestMyDiscord}
            disabled={testingMyDiscord}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {testingMyDiscord ? 'Odesílám...' : 'Testovat Můj Discord'}
          </button>
        </div>

        {personalMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              personalMsg.success
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
            }`}
          >
            {personalMsg.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {personalMsg.text}
          </div>
        )}

        {myDiscordTestResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              myDiscordTestResult.success
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
            }`}
          >
            {myDiscordTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {myDiscordTestResult.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Možnost A: Můj Discord Webhook URL (Doporučeno)</label>
            <input
              type="text"
              placeholder="https://discord.com/api/webhooks/..."
              value={myDiscordWebhookUrl}
              onChange={(e) => setMyDiscordWebhookUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Vložte Webhook URL z vašeho serveru na Discordu (Nastavení Kanálu $\rightarrow$ Integrace $\rightarrow$ Webhooky).
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Možnost B: Můj Discord Bot Token</label>
              <input
                type="password"
                placeholder="Bot Token..."
                value={myDiscordBotToken}
                onChange={(e) => setMyDiscordBotToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Discord Channel ID</label>
              <input
                type="text"
                placeholder="ID kanálu..."
                value={myDiscordChannelId}
                onChange={(e) => setMyDiscordChannelId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/60">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Můj Požadovaný Min. Zisk pro Upozornění (Kč)</label>
              <input
                type="number"
                step="250"
                value={myMinProfitAlert}
                onChange={(e) => setMyMinProfitAlert(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Notifikace na váš Discord se pošle pouze pro inzeráty se ziskem rovným nebo vyšším než tato částka</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Můj Osobní Gemini API Klíč (Volitelné)</label>
              <input
                type="password"
                placeholder="Vlastní AI klíč AIzaSy... (ponechte prázdné pro systémový)"
                value={myGeminiApiKey}
                onChange={(e) => setMyGeminiApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPersonal}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
        >
          <UserCheck className="w-4 h-4" />
          {savingPersonal ? 'Ukládám...' : 'Uložit Moje Osobní Nastavení'}
        </button>
      </form>

      {/* SECTION 2 & 3: Admin Only User Management & System Settings */}
      {user?.role === 'admin' && (
        <>
          {/* Admin User Management */}
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

          {/* Admin System Controls */}
          <form onSubmit={handleSaveSystemSettings} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Globální Systémové Skrapování (Admin)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Frekvence kontroly (sekundy)</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={systemScrapeInterval}
                  onChange={(e) => setSystemScrapeInterval(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Globální Gemini AI Model</label>
                <input
                  type="text"
                  value={systemGeminiModel}
                  onChange={(e) => setSystemGeminiModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all"
            >
              Uložit Globální Nastavení Skrapování
            </button>
          </form>
        </>
      )}
    </div>
  );
};
