import React, { useEffect, useState } from 'react';
import { Play, Square, Plus, Trash2, Cpu, X, Copy, RefreshCw } from 'lucide-react';
import api from '../src/api';

const ModelManager = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', engine: 'llama_cpp', path: '', config: '{}' });

  const fetchModels = async () => {
    try {
      const response = await api.get('models');
      setModels(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleStart = async (modelName) => {
    const port = 9000 + models.findIndex(m => m.name === modelName);
    try {
      await api.post(`models/${modelName}/start?port=${port}`);
      fetchModels();
    } catch (error) {
      console.error("Error starting model:", error);
    }
  };

  const handleStop = async (modelName) => {
    try {
      await api.post(`models/${modelName}/stop`);
      fetchModels();
    } catch (error) {
      console.error("Error stopping model:", error);
    }
  };

  const handleDelete = async (modelName) => {
    if (!confirm(`Are you sure you want to delete ${modelName}?`)) return;
    try {
      await api.delete(`models/${modelName}`);
      fetchModels();
    } catch (error) {
      console.error("Error deleting model:", error);
    }
  };

  const handleRegenerateKey = async (modelName) => {
    try {
      await api.post(`models/${modelName}/regenerate-key`);
      fetchModels();
    } catch (error) {
      console.error("Error regenerating key:", error);
    }
  };

  const handleAddModel = async (e) => {
    e.preventDefault();
    try {
      const config = JSON.parse(newModel.config);
      await api.post('models', { ...newModel, config });
      setShowAddModal(false);
      setNewModel({ name: '', engine: 'llama_cpp', path: '', config: '{}' });
      fetchModels();
    } catch (error) {
      alert("Invalid JSON config or server error");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (loading) return <div className="p-8">Loading models...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Model Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Add Model
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {models.map((model) => (
          <div key={model.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${model.status === 'running' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                  <Cpu />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{model.name}</h3>
                  <div className="flex gap-3 text-sm text-slate-400 mt-1">
                    <span>Engine: {model.engine}</span>
                    <span>Port: {model.port || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  model.status === 'running' ? 'bg-emerald-500/20 text-emerald-500' :
                  model.status === 'error' ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-700 text-slate-400'
                }`}>
                  {model.status.toUpperCase()}
                </span>

                {model.status === 'running' ? (
                  <button
                    onClick={() => handleStop(model.name)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Square fill="currentColor" size={20} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStart(model.name)}
                    className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                  >
                    <Play fill="currentColor" size={20} />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(model.name)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {model.api_key && (
              <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between mt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model API Key</span>
                  <span className="font-mono text-sm text-slate-300">{model.api_key}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(model.api_key)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400" title="Copy Key">
                    <Copy size={16} />
                  </button>
                  <button onClick={() => handleRegenerateKey(model.name)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400" title="Regenerate Key">
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add New Model</h2>
              <button onClick={() => setShowAddModal(false)}><X /></button>
            </div>
            <form onSubmit={handleAddModel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">Model Name</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  value={newModel.name}
                  onChange={e => setNewModel({...newModel, name: e.target.value})}
                  placeholder="Llama 3" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">Engine</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  value={newModel.engine}
                  onChange={e => setNewModel({...newModel, engine: e.target.value})}
                >
                  <option value="llama_cpp">llama.cpp</option>
                  <option value="transformers">Transformers</option>
                  <option value="vllm">vLLM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">Local Path</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  value={newModel.path}
                  onChange={e => setNewModel({...newModel, path: e.target.value})}
                  placeholder="/app/models/model.gguf" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">Config (JSON)</label>
                <textarea
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none h-24 font-mono text-sm focus:ring-1 focus:ring-blue-500"
                  value={newModel.config}
                  onChange={e => setNewModel({...newModel, config: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-colors">
                Register Model
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelManager;
