/**
 * EvaluationDashboard.jsx  —  M4.1
 * ──────────────────────────────────
 * Evaluation Scoring Dashboard: visualises pass/fail rates, average dimension
 * scores, hallucination frequency, quality trends, and per-batch statistics
 * drawn from stored structured evaluation results.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart2, ShieldCheck, AlertTriangle, TrendingUp, CheckCircle,
  XCircle, MinusCircle, Filter, Eye, ChevronDown, ChevronUp,
  Activity, Award, Search, RefreshCw,
} from 'lucide-react';

// ── Colour palettes ────────────────────────────────────────────────────────────
const VERDICT_COLORS = { Pass: '#10b981', 'Needs Improvement': '#f59e0b', Fail: '#ef4444' };
const DIM_COLORS = { Relevance: '#8b5cf6', Accuracy: '#06b6d4', Hallucination: '#f43f5e', Completeness: '#10b981' };
const RADAR_COLOR = '#6366f1';

// ── Helpers ────────────────────────────────────────────────────────────────────
const avg = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

function ScoreBar({ value, color = '#6366f1', label }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {label && <span className="w-28 text-slate-500 dark:text-slate-400 shrink-0">{label}</span>}
      <div className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right font-bold text-slate-700 dark:text-slate-300">{value}</span>
    </div>
  );
}

function StatPill({ label, value, color, icon: Icon }) {
  const bgMap = {
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    amber:   'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    red:     'from-red-500/10 to-red-600/5 border-red-500/20 text-red-600 dark:text-red-400',
    blue:    'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600 dark:text-blue-400',
    violet:  'from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-600 dark:text-violet-400',
    rose:    'from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-600 dark:text-rose-400',
  };
  const bg = bgMap[color] || '';
  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${bg} border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-extrabold">{value}</p>
        </div>
        {Icon && <Icon size={22} className="opacity-70 mt-1" />}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs shadow-xl border border-slate-200 dark:border-slate-700">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function EvaluationDashboard({ batchHistory = [] }) {
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Flatten all items from all batches
  const allItems = useMemo(() => {
    const pool = [];
    batchHistory.forEach((batch, bIdx) => {
      (batch.results || []).forEach(item => {
        pool.push({ ...item, batchId: batch.batch_id, batchLabel: `Batch ${bIdx + 1}` });
      });
    });
    return pool;
  }, [batchHistory]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (selectedBatch !== 'ALL' && item.batchId !== selectedBatch) return false;
      if (verdictFilter !== 'ALL' && item.verdict !== verdictFilter) return false;
      if (item.overall_score < scoreRange[0] || item.overall_score > scoreRange[1]) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.query?.toLowerCase().includes(q) && !item.ai_response?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allItems, selectedBatch, verdictFilter, scoreRange, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const pass = filteredItems.filter(i => i.verdict === 'Pass').length;
    const ni = filteredItems.filter(i => i.verdict === 'Needs Improvement').length;
    const fail = filteredItems.filter(i => i.verdict === 'Fail').length;
    const hallCount = filteredItems.filter(i => (i.hallucination_score || 0) > 0).length;
    return {
      total, pass, ni, fail, hallCount,
      avgRel:  avg(filteredItems.map(i => i.relevance_score || 0)),
      avgAcc:  avg(filteredItems.map(i => i.accuracy_score || 0)),
      avgHall: avg(filteredItems.map(i => i.hallucination_score || 0)),
      avgComp: avg(filteredItems.map(i => i.completeness_score || 0)),
      avgOver: avg(filteredItems.map(i => i.overall_score || 0)),
    };
  }, [filteredItems]);

  const verdictPie = useMemo(() => [
    { name: 'Pass', value: stats.pass, color: VERDICT_COLORS.Pass },
    { name: 'Needs Improvement', value: stats.ni, color: VERDICT_COLORS['Needs Improvement'] },
    { name: 'Fail', value: stats.fail, color: VERDICT_COLORS.Fail },
  ].filter(v => v.value > 0), [stats]);

  const dimScores = useMemo(() => [
    { dim: 'Relevance',    score: stats.avgRel,  color: DIM_COLORS.Relevance },
    { dim: 'Accuracy',     score: stats.avgAcc,  color: DIM_COLORS.Accuracy },
    { dim: 'Hall. Risk',   score: stats.avgHall, color: DIM_COLORS.Hallucination },
    { dim: 'Completeness', score: stats.avgComp, color: DIM_COLORS.Completeness },
  ], [stats]);

  const trendData = useMemo(() => batchHistory.map((batch, i) => {
    const items = batch.results || [];
    const total = items.length || 1;
    return {
      name: `B${i + 1}`,
      avgScore:   Math.round(batch.avg_overall_score || avg(items.map(r => r.overall_score || 0))),
      passRate:   pct(items.filter(r => r.verdict === 'Pass').length, total),
      hallRate:   Math.round(batch.hallucination_rate_pct || 0),
    };
  }), [batchHistory]);

  const radarData = [
    { subject: 'Relevance',    score: stats.avgRel },
    { subject: 'Accuracy',     score: stats.avgAcc },
    { subject: 'Safety',       score: 100 - stats.avgHall },
    { subject: 'Completeness', score: stats.avgComp },
    { subject: 'Overall',      score: stats.avgOver },
  ];

  const scoreHistogram = useMemo(() => {
    const bins = [
      { range: '0–20',   min: 0,  max: 20,  count: 0 },
      { range: '21–40',  min: 21, max: 40,  count: 0 },
      { range: '41–60',  min: 41, max: 60,  count: 0 },
      { range: '61–80',  min: 61, max: 80,  count: 0 },
      { range: '81–100', min: 81, max: 100, count: 0 },
    ];
    filteredItems.forEach(i => {
      const s = i.overall_score || 0;
      const bin = bins.find(b => s >= b.min && s <= b.max);
      if (bin) bin.count++;
    });
    return bins;
  }, [filteredItems]);

  const topIssues = useMemo(() => {
    const issues = {};
    filteredItems.forEach(item => {
      if ((item.relevance_score    || 0) < 60)  issues['Low Relevance']            = (issues['Low Relevance']            || 0) + 1;
      if ((item.accuracy_score     || 0) < 60)  issues['Low Accuracy']             = (issues['Low Accuracy']             || 0) + 1;
      if ((item.hallucination_score|| 0) > 30)  issues['High Hallucination Risk']  = (issues['High Hallucination Risk']  || 0) + 1;
      if ((item.completeness_score || 0) < 60)  issues['Incomplete Response']      = (issues['Incomplete Response']      || 0) + 1;
      if (item.verdict === 'Fail')               issues['Verdict: Fail']            = (issues['Verdict: Fail']            || 0) + 1;
    });
    return Object.entries(issues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([issue, count]) => ({ issue, count, pct: pct(count, filteredItems.length) }));
  }, [filteredItems]);

  const handleToggleRow = useCallback((id) => setExpandedRow(prev => prev === id ? null : id), []);

  if (batchHistory.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-5">
          <BarChart2 size={36} className="text-blue-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Batch Evaluations Yet</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          Run at least one batch evaluation in the Batch Evaluation tab to populate this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Top Stat Pills ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatPill label="Total Evaluated"    value={stats.total}                              color="blue"    icon={Activity}       />
        <StatPill label="Pass"               value={`${stats.pass} (${pct(stats.pass,stats.total)}%)`} color="emerald" icon={CheckCircle}  />
        <StatPill label="Needs Improvement"  value={`${stats.ni} (${pct(stats.ni,stats.total)}%)`}     color="amber"   icon={MinusCircle}  />
        <StatPill label="Fail"               value={`${stats.fail} (${pct(stats.fail,stats.total)}%)`} color="red"     icon={XCircle}      />
        <StatPill label="Avg Overall Score"  value={`${stats.avgOver}/100`}                  color="violet"  icon={Award}          />
        <StatPill label="Hallucination Rate" value={`${pct(stats.hallCount,stats.total)}%`} color="rose"    icon={AlertTriangle}  />
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            <Filter size={16} /> Dashboard Filters
          </div>
          <button onClick={() => setShowFilters(f => !f)} className="btn-ghost text-xs flex items-center gap-1">
            {showFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Batch</label>
              <select
                value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Batches</option>
                {batchHistory.map((b, i) => (
                  <option key={b.batch_id} value={b.batch_id}>Batch {i + 1} — {(b.results||[]).length} items</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Verdict</label>
              <div className="flex gap-1 flex-wrap">
                {['ALL','Pass','Needs Improvement','Fail'].map(v => (
                  <button key={v} onClick={() => setVerdictFilter(v)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      verdictFilter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Min Score: {scoreRange[0]}</label>
              <input type="range" min={0} max={100} value={scoreRange[0]}
                onChange={e => setScoreRange([+e.target.value, scoreRange[1]])}
                className="w-full accent-blue-600" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search queries..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        )}
        {(selectedBatch !== 'ALL' || verdictFilter !== 'ALL' || searchQuery) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-slate-500">Showing {filteredItems.length} of {allItems.length} records</span>
            <button
              onClick={() => { setSelectedBatch('ALL'); setVerdictFilter('ALL'); setScoreRange([0,100]); setSearchQuery(''); }}
              className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
            >
              <RefreshCw size={11} /> Reset
            </button>
          </div>
        )}
      </div>

      {/* ── Verdict Pie + Dimension Scores ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Verdict Distribution</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Pass / Needs Improvement / Fail</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={verdictPie} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={4} dataKey="value">
                {verdictPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {[
              { label:'Pass',             value:stats.pass, color:VERDICT_COLORS.Pass },
              { label:'Needs Improvement',value:stats.ni,   color:VERDICT_COLORS['Needs Improvement'] },
              { label:'Fail',             value:stats.fail, color:VERDICT_COLORS.Fail },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-slate-600 dark:text-slate-400">{label}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">{value} ({pct(value,stats.total)}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Average Dimension Scores</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Relevance · Accuracy · Hallucination · Completeness</p>
          <div className="space-y-4 mb-6">
            <ScoreBar label="Relevance"     value={stats.avgRel}  color={DIM_COLORS.Relevance} />
            <ScoreBar label="Accuracy"      value={stats.avgAcc}  color={DIM_COLORS.Accuracy} />
            <ScoreBar label="Hallucination" value={stats.avgHall} color={DIM_COLORS.Hallucination} />
            <ScoreBar label="Completeness"  value={stats.avgComp} color={DIM_COLORS.Completeness} />
            <ScoreBar label="Overall"       value={stats.avgOver} color="#6366f1" />
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={dimScores} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="dim" tick={{ fontSize: 10 }} />
              <YAxis domain={[0,100]} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[6,6,0,0]}>
                {dimScores.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Trends + Radar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Quality Trends Across Batches</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Avg score · Pass rate · Hallucination rate per batch</p>
          {trendData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0,100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="avgScore" name="Avg Score"        stroke="#6366f1" strokeWidth={2.5} dot={{ r:4 }} activeDot={{ r:6 }} />
                <Line type="monotone" dataKey="passRate" name="Pass Rate %"      stroke="#10b981" strokeWidth={2}   dot={{ r:3 }} />
                <Line type="monotone" dataKey="hallRate" name="Hallucination %"  stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" dot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Run 2+ batches to see trend data
            </div>
          )}
        </div>
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Quality Radar</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Multi-dimensional performance profile</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(148,163,184,0.25)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0,100]} tick={{ fontSize: 9 }} />
              <Radar name="Score" dataKey="score" stroke={RADAR_COLOR} fill={RADAR_COLOR} fillOpacity={0.35} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Score Histogram + Top Issues ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Overall Score Distribution</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Frequency of responses per score bracket</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreHistogram} barSize={44}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Responses" radius={[6,6,0,0]}>
                {scoreHistogram.map((_, i) => {
                  const cols = ['#ef4444','#f97316','#f59e0b','#10b981','#06b6d4'];
                  return <Cell key={i} fill={cols[i]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Most Frequent Issues</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Recurring evaluation weaknesses</p>
          {topIssues.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              No issues detected — great quality batch!
            </div>
          ) : (
            <div className="space-y-3">
              {topIssues.map(({ issue, count, pct: p }, i) => (
                <div key={issue} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{issue}</span>
                      <span className="text-xs text-slate-500">{count} ({p}%)</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width:`${p}%`, backgroundColor: i<2?'#ef4444':i<4?'#f59e0b':'#6366f1' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Per-Batch Summary Table ──────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Per-Batch Summary Statistics</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Aggregated metrics for each batch submission</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                {['Batch','Records','Pass','Needs Impr.','Fail','Avg Score','Avg Rel.','Avg Acc.','Hall. Rate','Avg Comp.'].map(h => (
                  <th key={h} className="p-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {batchHistory.map((batch, i) => (
                <tr key={batch.batch_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200">Batch {i+1}</div>
                    <div className="text-slate-400 font-mono text-[10px]">{batch.batch_id?.slice(0,8)}</div>
                  </td>
                  <td className="p-3.5 font-bold">{batch.total_records}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold">{batch.pass_count}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold">{batch.needs_improvement_count}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-bold">{batch.fail_count}</span>
                  </td>
                  <td className="p-3.5 font-extrabold text-indigo-600 dark:text-indigo-400">{Math.round(batch.avg_overall_score)}/100</td>
                  <td className="p-3.5 text-violet-600 font-semibold">{Math.round(batch.avg_relevance)}</td>
                  <td className="p-3.5 text-cyan-600 font-semibold">{Math.round(batch.avg_accuracy)}</td>
                  <td className="p-3.5 text-rose-600 font-semibold">{Math.round(batch.hallucination_rate_pct)}%</td>
                  <td className="p-3.5 text-emerald-600 font-semibold">{Math.round(batch.avg_completeness)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Drill-Down Records Table ─────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Individual Evaluation Records — Drill-Down</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filteredItems.length} record(s) shown — click <Eye size={11} className="inline"/> to expand reasoning
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                {['Batch','Question','Rel.','Acc.','Hall.%','Comp.','Score','Verdict','Details'].map(h => (
                  <th key={h} className="p-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredItems.slice(0, 50).map((item) => (
                <React.Fragment key={`${item.batchId}-${item.id || item.row_index}`}>
                  <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 text-slate-400 font-mono">{item.batchLabel}</td>
                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate" title={item.query}>{item.query}</td>
                    <td className="p-3.5 font-semibold text-violet-600">{item.relevance_score}</td>
                    <td className="p-3.5 font-semibold text-cyan-600">{item.accuracy_score}</td>
                    <td className="p-3.5 font-semibold text-rose-500">{item.hallucination_score}%</td>
                    <td className="p-3.5 font-semibold text-emerald-600">{item.completeness_score}</td>
                    <td className="p-3.5 font-extrabold text-slate-900 dark:text-slate-100">{item.overall_score}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.verdict==='Pass'?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400':
                        item.verdict==='Needs Improvement'?'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400':
                        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      }`}>{item.verdict}</span>
                    </td>
                    <td className="p-3.5">
                      <button onClick={() => handleToggleRow(`${item.batchId}-${item.id||item.row_index}`)}
                        className="btn-ghost p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                  {expandedRow === `${item.batchId}-${item.id||item.row_index}` && (
                    <tr>
                      <td colSpan={9} className="bg-slate-50/80 dark:bg-slate-900/60 p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-2">
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                              <p className="font-bold text-slate-500 mb-1">Question</p>
                              <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{item.query}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                              <p className="font-bold text-slate-500 mb-1">AI Response</p>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{item.ai_response}</p>
                            </div>
                            {item.reference && (
                              <div className="bg-blue-50/60 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                                <p className="font-bold text-blue-600 mb-1">Reference</p>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{item.reference}</p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {item.validation_report?.summary && (
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="font-bold text-slate-500 mb-1">Consolidated Reasoning</p>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.validation_report.summary}</p>
                              </div>
                            )}
                            {item.validation_report?.completeness_eval?.missing_aspects?.length > 0 && (
                              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">
                                <p className="font-bold text-red-600 mb-1">Missing Aspects (Completeness)</p>
                                <ul className="list-disc pl-4 text-red-700 dark:text-red-300 space-y-0.5">
                                  {item.validation_report.completeness_eval.missing_aspects.map((m,i)=><li key={i}>{m}</li>)}
                                </ul>
                              </div>
                            )}
                            {item.validation_report?.hallucination_eval?.flagged_claims?.length > 0 && (
                              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-200 dark:border-orange-800">
                                <p className="font-bold text-orange-600 mb-1">Hallucinated Claims</p>
                                <ul className="list-disc pl-4 text-orange-700 dark:text-orange-300 space-y-0.5">
                                  {item.validation_report.hallucination_eval.flagged_claims.map((c,i)=>(
                                    <li key={i}>{c.claim_text || c.text}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">No records match current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredItems.length > 50 && (
          <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
            Showing first 50 of {filteredItems.length} records. Use filters to narrow results.
          </div>
        )}
      </div>
    </div>
  );
}
