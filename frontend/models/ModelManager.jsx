import React, { useEffect, useState } from 'react';
import { Play, Square, Plus, Trash2, Cpu, X, Copy, RefreshCw, Settings2, Globe } from 'lucide-react';
import api from '../src/api';

const ModelManager = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModel, setNewModel] = useState({
    name: '',
    engine: 'llama_cpp',
    path: '',
    port: '',
    config: JSON.stringify({
      n_ctx: 2048,
      n_threads: 4,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 512
    }, null, 2)
  });

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

  const handleStart = async (modelName, customPort) => {
    try {
      const portQuery = customPort ? `?port=${customPort}` : '';
      await api.post(`models/${modelName}/start${portQuery}`);
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

  const handleRestart = async (modelName) => {
    try {
      await api.post(`models/${modelName}/restart`);
      fetchModels();
    } catch (error) {
      console.error("Error restarting model:", error);
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
      await api.post('models', {
        ...newModel,
        config,
        port: newModel.port ? parseInt(newModel.port) : null
      });
      setShowAddModal(false);
      setNewModel({ name: '', engine: 'llama_cpp', path: '', port: '', config: newModel.config });
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} /> Register Model
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {models.map((model) => (
          <div key={model.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl ${model.status === 'running' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-xl">{model.name}</h3>
                  <div className="flex gap-4 text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                    <span className="flex items-center gap-1"><Settings2 size={12} /> {model.engine}</span>
                    <span className="flex items-center gap-1 text-blue-400"><Globe size={12} /> Port: {model.port || 'Auto'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                  model.status === 'running' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  model.status === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-700 text-slate-400'
                }`}>
                  {model.status}
                </span>

                {model.status === 'running' ? (
                  <>
                    <button
                      onClick={() => handleRestart(model.name)}
                      className="p-2.5 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all border border-transparent hover:border-blue-500/30"
                      title="Restart Model"
                    >
                      <RefreshCw size={20} />
                    </button>
                    <button
                      onClick={() => handleStop(model.name)}
                      className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                      title="Stop Model"
                    >
                      <Square fill="currentColor" size={20} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStart(model.name)}
                    className="p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/30"
                    title="Start Model"
                  >
                    <Play fill="currentColor" size={20} />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(model.name)}
                  className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                  title="Delete Model"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl flex items-center justify-between border border-slate-700/50">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Model-Specific API Key</span>
                <span className="font-mono text-sm text-blue-400/80">{model.api_key}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(model.api_key)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors" title="Copy Key">
                  <Copy size={16} />
                </button>
                <button onClick={() => handleRegenerateKey(model.name)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors" title="Regenerate Key">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Plus className="text-blue-500" /> Register New Model
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors"><X /></button>
            </div>
            <form onSubmit={handleAddModel} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Model Name</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={newModel.name}
                    onChange={e => setNewModel({...newModel, name: e.target.value})}
                    placeholder="Llama 3 8B" required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Port (Optional)</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={newModel.port}
                    onChange={e => setNewModel({...newModel, port: e.target.value})}
                    placeholder="9001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Inference Engine</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                  value={newModel.engine}
                  onChange={e => setNewModel({...newModel, engine: e.target.value})}
                >
                  <option value="llama_cpp">llama.cpp (GGUF)</option>
                  <option value="transformers">Transformers (safetensors)</option>
                  <option value="vllm">vLLM</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Model File Path</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  value={newModel.path}
                  onChange={e => setNewModel({...newModel, path: e.target.value})}
                  placeholder="/app/models/llama3-8b.gguf" required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Runtime Config (JSON)</label>
                <textarea
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none h-32 font-mono text-sm focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                  value={newModel.config}
                  onChange={e => setNewModel({...newModel, config: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition-all transform active:scale-[0.98] shadow-lg shadow-blue-500/20">
                Register & Initialize
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelManager;
