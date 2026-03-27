import React, { useEffect, useState } from 'react';
import { Users, Key, Plus, Trash2, Shield, User as UserIcon } from 'lucide-react';
import api from '../src/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    // This would require a backend endpoint /api/users which we haven't fully fleshed out
    // For now, we'll mock it or implement the essentials in the backend if needed.
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield className="text-rose-500" /> Security & Access Control
      </h1>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2"><Key className="text-amber-500" /> Master API Keys</h2>
            <button className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
              Generate New Master Key
            </button>
          </div>
          <div className="p-6 text-slate-500 text-center italic">
            This section allows managing global keys that have access to all models.
            (Default key <strong>sk_admin</strong> is currently active).
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2"><Users className="text-blue-500" /> Platform Users</h2>
            <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
              Add User
            </button>
          </div>
          <div className="p-6">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                  <th className="pb-4 px-2">Username</th>
                  <th className="pb-4 px-2">Role</th>
                  <th className="pb-4 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="group">
                  <td className="py-4 px-2 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                      <UserIcon size={16} />
                    </div>
                    <span className="font-medium text-slate-200">admin</span>
                  </td>
                  <td className="py-4 px-2">
                    <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">Admin</span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <button className="p-2 text-slate-500 hover:text-rose-500 transition-colors disabled:opacity-50" disabled title="Cannot delete system admin">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
