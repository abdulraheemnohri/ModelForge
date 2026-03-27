import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Database, HardDrive, LayoutDashboard, BarChart3, Clock } from 'lucide-react';
import api from '../src/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState({
    labels: [],
    cpu: [],
    memory: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('stats');
        setStats(response.data);

        const now = new Date().toLocaleTimeString();
        setHistory(prev => ({
          labels: [...prev.labels.slice(-9), now],
          cpu: [...prev.cpu.slice(-9), response.data.cpu.percent],
          memory: [...prev.memory.slice(-9), response.data.memory.percent]
        }));

        setLoading(false);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8">Loading stats...</div>;

  const chartData = {
    labels: history.labels,
    datasets: [
      {
        label: 'CPU Usage (%)',
        data: history.cpu,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Memory Usage (%)',
        data: history.memory,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <LayoutDashboard className="w-8 h-8 text-blue-500" />
        System Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-400 font-medium">System CPU</h2>
            <Cpu className="text-rose-500" />
          </div>
          <p className="text-3xl font-bold">{stats.cpu.percent}%</p>
          <p className="text-slate-500 text-sm mt-2">{stats.cpu.cores} Cores</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-400 font-medium">System Memory</h2>
            <Activity className="text-blue-500" />
          </div>
          <p className="text-3xl font-bold">{stats.memory.percent}%</p>
          <p className="text-slate-500 text-sm mt-2">
            {(stats.memory.available / (1024 ** 3)).toFixed(2)} GB Available
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-400 font-medium">Disk Usage</h2>
            <HardDrive className="text-emerald-500" />
          </div>
          <p className="text-3xl font-bold">{stats.disk.percent}%</p>
          <p className="text-slate-500 text-sm mt-2">
            {(stats.disk.free / (1024 ** 3)).toFixed(2)} GB Free
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BarChart3 className="text-emerald-500" /> Active Model Instances
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.entries(stats.models).map(([name, data]) => (
          <div key={name} className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold">{name}</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full uppercase">Running</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Process CPU</span>
                <span className="font-mono text-emerald-400">{data.cpu_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(data.cpu_percent, 100)}%` }}></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Process RAM</span>
                <span className="font-mono text-blue-400">{(data.memory_info / (1024 ** 2)).toFixed(1)} MB</span>
              </div>
            </div>
          </div>
        ))}
        {Object.keys(stats.models).length === 0 && (
          <div className="col-span-full py-8 text-center bg-slate-800/50 rounded-xl border border-dashed border-slate-700 text-slate-500">
            No active model processes monitored.
          </div>
        )}
      </div>

      {stats.gpu && Array.isArray(stats.gpu) && stats.gpu.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {stats.gpu.map((g, idx) => (
            <div key={idx} className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-400 font-medium">GPU: {g.name}</h2>
                <Database className="text-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">VRAM Usage</p>
                  <p className="text-2xl font-bold">{g.percent_vram.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">{(g.used_vram / (1024 ** 3)).toFixed(1)} / {(g.total_vram / (1024 ** 3)).toFixed(1)} GB</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Utilization</p>
                  <p className="text-2xl font-bold">{g.percent_util}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
        <h2 className="text-xl font-bold mb-4">Resource History</h2>
        <div className="h-64">
          <Line data={chartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
