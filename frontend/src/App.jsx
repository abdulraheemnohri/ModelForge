import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Cpu, MessageSquare, Terminal, History, Shield, User } from 'lucide-react';
import Dashboard from '../dashboard/Dashboard';
import ModelManager from '../models/ModelManager';
import Playground from '../playground/Playground';
import Logs from '../logs/Logs';
import Usage from './Usage';
import UserManagement from './UserManagement';

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('api_key') || 'sk_admin');

  const saveApiKey = () => {
    localStorage.setItem('api_key', apiKey);
    alert('API Key saved!');
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800 border-right border-slate-700 flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-black tracking-tighter text-blue-500">MODELFORGE</h1>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
            <Link to="/models" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors">
              <Cpu size={20} /> Models
            </Link>
            <Link to="/playground" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors">
              <MessageSquare size={20} /> Playground
            </Link>
            <Link to="/logs" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors">
              <Terminal size={20} /> Logs
            </Link>
            <Link to="/usage" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors">
              <History size={20} /> Usage
            </Link>
            <Link to="/security" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors">
              <Shield size={20} /> Security
            </Link>
          </nav>

          <div className="p-4 border-t border-slate-700">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Admin API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={saveApiKey}
                className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                Save Key
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900/50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/models" element={<ModelManager />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/usage" element={<Usage />} />
            <Route path="/security" element={<UserManagement />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
