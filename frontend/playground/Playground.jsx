import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Key, Info } from 'lucide-react';
import api from '../src/api';

const Playground = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useModelKey, setUseModelKey] = useState(true);
  const scrollRef = useRef(null);

  const fetchModels = async () => {
    try {
      const response = await api.get('/models');
      const runningModels = response.data.filter(m => m.status === 'running');
      setModels(runningModels);
      if (runningModels.length > 0 && !selectedModel) setSelectedModel(runningModels[0]);
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  useEffect(() => {
    fetchModels();
    const interval = setInterval(fetchModels, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedModel) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const token = useModelKey ? selectedModel.api_key : localStorage.getItem('api_key');

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: selectedModel.name,
          messages: [...messages, userMessage],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0].delta.content || '';
              assistantResponse += content;

              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantResponse;
                return newMessages;
              });
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-4">
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bot className="text-blue-500" /> Model Playground
          </h1>
          <div className="flex gap-3">
             <button
              onClick={() => setMessages([])}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
              title="Clear Chat"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Target Model</label>
            <select
              value={selectedModel?.name || ''}
              onChange={(e) => setSelectedModel(models.find(m => m.name === e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            >
              {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              {models.length === 0 && <option disabled>No running models</option>}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Authentication Method</label>
            <div className="flex gap-2 p-1 bg-slate-900 rounded-lg border border-slate-700">
              <button
                onClick={() => setUseModelKey(true)}
                className={`flex-1 py-1 px-3 text-xs rounded-md transition-colors ${useModelKey ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
              >
                Model API Key
              </button>
              <button
                onClick={() => setUseModelKey(false)}
                className={`flex-1 py-1 px-3 text-xs rounded-md transition-colors ${!useModelKey ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
              >
                Admin API Key
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 border border-slate-700 rounded-tl-none'}`}>
                <p className="whitespace-pre-wrap">{msg.content || (loading && idx === messages.length - 1 ? '...' : '')}</p>
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Bot size={48} className="mb-4 opacity-10" />
            <p className="text-center px-8">
              {models.length > 0
                ? `Ready to chat with ${selectedModel?.name}. Using ${useModelKey ? 'model-specific' : 'master admin'} API key for access.`
                : 'No models are currently running. Visit the Models page to spin up an instance.'}
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={selectedModel ? "Type your message..." : "Select a running model first"}
          disabled={!selectedModel}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 pr-12 outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={loading || !selectedModel}
          className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default Playground;
