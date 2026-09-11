import React, { useMemo } from 'react';
import {
  BarChart2, ShieldCheck, AlertTriangle, TrendingUp,
  Activity, Clock,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatCard from '../components/StatCard.jsx';

const CLAIM_COLORS = {
  Supported: '#10b981',
  Unsupported: '#f97316',
  Contradictory: '#ef4444',
  Uncertain: '#f59e0b',
};

const RELIABILITY_COLORS = {
  'Highly Reliable': '#10b981',
  'Mostly Reliable': '#3b82f6',
  'Needs Verification': '#f59e0b',
  'High Risk': '#ef4444',
};

export default function Dashboard({ onNavigate, history }) {
  // Aggregate stats from history + seed
  const totalAnalyses = history.length;
  const totalClaims   = history.reduce((s, h) => s + (h.claimsCount || 0), 0);
  const totalHalluc   = history.reduce((s, h) => s + (h.stats?.contradictory || 0), 0);
  const avgReliability = history.length
    ? Math.round(history.reduce((s, h) => s + (h.overallScore || 0), 0) / history.length)
    : 87;

  // Reliability over time line chart data
  const reliabilityTrend = useMemo(() => {
    const last8 = [...history].slice(-8);
    return last8.map((h, i) => ({
      name: `#${i + 1}`,
      score: h.overallScore || 0,
      hallucination: h.stats?.hallucinationRisk || 0,
    }));
  }, [history]);

  // Claim classification pie
  const claimPie = useMemo(() => {
    const totals = { Supported: 0, Unsupported: 0, Contradictory: 0, Uncertain: 0 };
    for (const h of history) {
      totals.Supported    += h.stats?.supported    || 0;
      totals.Unsupported  += h.stats?.unsupported  || 0;
      totals.Contradictory += h.stats?.contradictory || 0;
      totals.Uncertain    += h.stats?.uncertain    || 0;
    }
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [history]);

  // Reliability distribution bar chart
  const relDist = useMemo(() => {
    const dist = { 'Highly Reliable': 0, 'Mostly Reliable': 0, 'Needs Verification': 0, 'High Risk': 0 };
    for (const h of history) {
      const s = h.overallScore || 0;
      if (s >= 90)      dist['Highly Reliable']++;
      else if (s >= 75) dist['Mostly Reliable']++;
      else if (s >= 50) dist['Needs Verification']++;
      else              dist['High Risk']++;
    }
    return Object.entries(dist).map(([name, count]) => ({ name, count }));
  }, [history]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-violet-700 p-8 text-white shadow-xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-extrabold mb-2">AI Response Validation System</h2>
            <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
              Detect hallucinations, validate claims, and improve trust in AI-generated content
              using semantic similarity, contradiction detection, and confidence scoring.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                id="btn-go-validate"
                onClick={() => onNavigate('validate')}
                className="px-5 py-2.5 rounded-xl bg-white text-brand-700 font-bold text-sm hover:bg-blue-50 transition-all shadow"
              >
                Validate a Response
              </button>
              <button
                id="btn-go-arch"
                onClick={() => onNavigate('architecture')}
                className="px-5 py-2.5 rounded-xl border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-all"
              >
                System Architecture
              </button>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-center gap-1 text-center">
            <ShieldCheck size={64} className="text-blue-200 opacity-70" />
            <span className="text-blue-200 text-xs font-medium">Explainable AI</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard icon={Activity} label="Responses Analyzed" value={totalAnalyses || 128}
          trend="+12" iconBg="bg-blue-100 dark:bg-blue-900/40" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard icon={ShieldCheck} label="Claims Verified" value={totalClaims || 742}
          trend="+58" iconBg="bg-emerald-100 dark:bg-emerald-900/40" iconColor="text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Hallucinations Detected" value={totalHalluc || 63}
          trend="-5" iconBg="bg-red-100 dark:bg-red-900/40" iconColor="text-red-600 dark:text-red-400" />
        <StatCard icon={TrendingUp} label="Average Reliability" value={`${avgReliability}%`}
          trend="+3%" iconBg="bg-violet-100 dark:bg-violet-900/40" iconColor="text-violet-600 dark:text-violet-400" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reliability Over Time */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Response Reliability Over Time</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Reliability score across recent analyses</p>
            </div>
            <BarChart2 size={18} className="text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={reliabilityTrend.length >= 2 ? reliabilityTrend : [
              { name:'#1',score:91,hallucination:0 },
              { name:'#2',score:68,hallucination:33 },
              { name:'#3',score:82,hallucination:0 },
              { name:'#4',score:78,hallucination:0 },
              { name:'#5',score:54,hallucination:20 },
              { name:'#6',score:72,hallucination:10 },
              { name:'#7',score:87,hallucination:5 },
              { name:'#8',score:63,hallucination:25 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="score" name="Reliability Score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="hallucination" name="Hallucination Rate %" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Claim Classification Pie */}
        <div className="glass-card p-6">
          <div className="mb-5">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Claim Classification</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Distribution across all analyses</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={claimPie.some(d => d.value > 0) ? claimPie : [
                  { name: 'Supported', value: 412 },
                  { name: 'Unsupported', value: 148 },
                  { name: 'Contradictory', value: 112 },
                  { name: 'Uncertain', value: 70 },
                ]}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {Object.values(CLAIM_COLORS).map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, '']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reliability Distribution Bar */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Reliability Distribution</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Frequency of reliability tiers across all sessions</p>
          </div>
          <Clock size={16} className="text-slate-400" />
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={relDist.some(d => d.count > 0) ? relDist : [
            { name: 'Highly Reliable', count: 32 },
            { name: 'Mostly Reliable', count: 58 },
            { name: 'Needs Verification', count: 28 },
            { name: 'High Risk', count: 10 },
          ]} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="count" name="Analyses" radius={[6,6,0,0]}>
              {Object.values(RELIABILITY_COLORS).map((color, i) => (
                <Cell key={i} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
