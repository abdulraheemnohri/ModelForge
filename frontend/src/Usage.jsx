import React, { useEffect, useState } from 'react';
import { History, Hash, Clock, Bot, Key } from 'lucide-react';
import api from '../src/api';

const Usage = () => {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await api.get('usage');
        setUsage(response.data);
      } catch (error) {
        console.error("Error fetching usage:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  if (loading) return <div className="p-8">Loading usage stats...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <History className="text-blue-500" /> Usage History
      </h1>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-700">
            <tr>
              <th className="px-6 py-4">Model</th>
              <th className="px-6 py-4">API Key</th>
              <th className="px-6 py-4 text-right">Tokens</th>
              <th className="px-6 py-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {usage.map((item) => (
              <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <Bot size={16} className="text-blue-400" />
                  <span className="font-medium">{item.model_name}</span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400">
                   {item.api_key}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-slate-200">{item.total_tokens}</span>
                    <span className="text-[10px] text-slate-500">P: {item.prompt_tokens} / C: {item.completion_tokens}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-slate-400 text-sm">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usage.length === 0 && (
          <div className="py-12 text-center text-slate-500 italic">
            No chat history recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Usage;
