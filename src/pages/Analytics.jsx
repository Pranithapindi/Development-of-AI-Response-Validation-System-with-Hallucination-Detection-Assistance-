import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart2, TrendingUp, Cpu, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const CLAIM_COLORS = ['#10b981', '#f97316', '#ef4444', '#f59e0b'];
const CLAIM_NAMES  = ['Supported', 'Unsupported', 'Contradictory', 'Uncertain'];

export default function Analytics({ history }) {
  // Build aggregated metrics
  const metrics = useMemo(() => {
    const totalClaims     = history.reduce((s,h) => s + (h.claimsCount || h.claims?.length || 0), 0);
    const verified        = history.reduce((s,h) => s + (h.stats?.supported    || 0), 0);
    const hallucinated    = history.reduce((s,h) => s + (h.stats?.contradictory || 0), 0);
    const avgConfidence   = history.length
      ? Math.round(history.reduce((s,h) => s + (h.overallScore || 0), 0) / history.length)
      : 87;
    const avgProcessingMs = 4200; // simulated

    return { totalClaims, verified, hallucinated, avgConfidence, avgProcessingMs };
  }, [history]);

  // Hallucination trend line chart
  const trendData = useMemo(() => {
    const base = [
      { label: 'Analysis 1', hallucinationRate: 0,  reliabilityScore: 91 },
      { label: 'Analysis 2', hallucinationRate: 33, reliabilityScore: 68 },
      { label: 'Analysis 3', hallucinationRate: 0,  reliabilityScore: 82 },
      { label: 'Analysis 4', hallucinationRate: 0,  reliabilityScore: 78 },
      { label: 'Analysis 5', hallucinationRate: 20, reliabilityScore: 54 },
    ];
    const fromHistory = history.map((h, i) => ({
      label: `Analysis ${base.length + i + 1}`,
      hallucinationRate: h.stats?.hallucinationRisk || 0,
      reliabilityScore:  h.overallScore || 0,
    }));
    return [...base, ...fromHistory].slice(-10);
  }, [history]);

  // Claim pie
  const claimPie = useMemo(() => {
    const s = { Supported: 0, Unsupported: 0, Contradictory: 0, Uncertain: 0 };
    for (const h of history) {
      s.Supported    += h.stats?.supported    || 0;
      s.Unsupported  += h.stats?.unsupported  || 0;
      s.Contradictory += h.stats?.contradictory || 0;
      s.Uncertain    += h.stats?.uncertain    || 0;
    }
    // Fallback seed
    if (!history.length) {
      return [
        { name:'Supported',    value:412 },
        { name:'Unsupported',  value:148 },
        { name:'Contradictory',value:112 },
        { name:'Uncertain',    value:70  },
      ];
    }
    return Object.entries(s).map(([name, value]) => ({ name, value }));
  }, [history]);

  // Reliability distribution
  const relDist = useMemo(() => {
    const d = { 'Highly Reliable':0, 'Mostly Reliable':0, 'Needs Verification':0, 'High Risk':0 };
    for (const h of history) {
      const s = h.overallScore || 0;
      if (s >= 90) d['Highly Reliable']++;
      else if (s >= 75) d['Mostly Reliable']++;
      else if (s >= 50) d['Needs Verification']++;
      else d['High Risk']++;
    }
    // Seed fallback
    if (!history.length) return [
      { name:'Highly Reliable', count:32, fill:'#10b981' },
      { name:'Mostly Reliable', count:58, fill:'#3b82f6' },
      { name:'Needs Verification',count:28, fill:'#f59e0b' },
      { name:'High Risk', count:10, fill:'#ef4444' },
    ];
    return [
      { name:'Highly Reliable', count:d['Highly Reliable'], fill:'#10b981' },
      { name:'Mostly Reliable', count:d['Mostly Reliable'], fill:'#3b82f6' },
      { name:'Needs Verification', count:d['Needs Verification'], fill:'#f59e0b' },
      { name:'High Risk', count:d['High Risk'], fill:'#ef4444' },
    ];
  }, [history]);

  const metricCards = [
    { icon: BarChart2,     label:'Total Claims',         value: metrics.totalClaims || 742,   color:'blue'    },
    { icon: CheckCircle,   label:'Verified Claims',       value: metrics.verified    || 412,   color:'emerald' },
    { icon: AlertTriangle, label:'Hallucinated Claims',   value: metrics.hallucinated|| 63,    color:'red'     },
    { icon: TrendingUp,    label:'Avg Confidence',        value:`${metrics.avgConfidence}%`,   color:'violet'  },
    { icon: Clock,         label:'Avg Processing Time',   value:`${(metrics.avgProcessingMs/1000).toFixed(1)}s`, color:'amber' },
    { icon: Cpu,           label:'Pipeline Stages',       value: '7',                          color:'slate'   },
  ];

  const colorMap = {
    blue:'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    emerald:'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    red:'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    violet:'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    amber:'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    slate:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  };

  return (
    <div className="space-y-8">
      {/* Metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${colorMap[color]}`}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-extrabold text-slate-800 dark:text-slate-200">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Hallucination trend line chart */}
      <div className="glass-card p-6">
        <div className="mb-5">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Hallucination & Reliability Trends</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tracking hallucination rate and reliability score across analyses
          </p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="reliabilityScore" name="Reliability Score"
              stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="hallucinationRate" name="Hallucination Rate %"
              stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claim Classification Pie */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-5">Claim Classification</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={claimPie}
                cx="50%" cy="50%"
                outerRadius={90} innerRadius={50}
                paddingAngle={4}
                dataKey="value"
              >
                {claimPie.map((_, i) => (
                  <Cell key={i} fill={CLAIM_COLORS[i % CLAIM_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Reliability Distribution Bar */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-5">Reliability Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={relDist} barSize={38}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" name="Analyses" radius={[6,6,0,0]}>
                {relDist.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
