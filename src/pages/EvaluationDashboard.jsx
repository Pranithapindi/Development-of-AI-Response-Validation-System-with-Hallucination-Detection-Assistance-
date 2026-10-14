/**
 * EvaluationDashboard.jsx
 * ───────────────────────
 * Unified Evaluation & Analytics Dashboard
 * 
 * Combines Single Evaluation Analytics (from real history) and Batch Evaluation
 * Analytics (from batch history) into one comprehensive, filterable command center.
 * Features:
 *   - Tab switcher: Single-Validation Analytics vs Batch-Evaluation Analytics
 *   - Dual-Model Filtering: NLP Backend vs JS Engine vs All Models
 *   - Real-time KPI Metric cards
 *   - Trend Analysis, Dimension Breakdown, Radar Profile, & Distribution Charts
 *   - Drill-down record inspection
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart2, ShieldCheck, AlertTriangle, TrendingUp, CheckCircle,
  XCircle, MinusCircle, Filter, ChevronDown, ChevronUp,
  Activity, Award, Search, Cpu, Clock, Layers, Sparkles, Database
} from 'lucide-react';

// ── Colors & Constants ─────────────────────────────────────────────────────────
const VERDICT_COLORS = { Pass: '#10b981', 'Needs Improvement': '#f59e0b', Fail: '#ef4444' };
const CLAIM_COLORS   = ['#10b981', '#f97316', '#ef4444', '#f59e0b'];
const DIM_COLORS     = { Relevance: '#8b5cf6', Accuracy: '#06b6d4', Hallucination: '#f43f5e', Completeness: '#10b981' };
const RADAR_COLOR    = '#6366f1';

const avg = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

// ── Shared Stat Pill ───────────────────────────────────────────────────────────
function StatPill({ label, value, color = 'blue', icon: Icon, subtitle }) {
  const bgMap = {
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    amber:   'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    red:     'from-red-500/10 to-red-600/5 border-red-500/20 text-red-600 dark:text-red-400',
    blue:    'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600 dark:text-blue-400',
    violet:  'from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-600 dark:text-violet-400',
    rose:    'from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-600 dark:text-rose-400',
  };
  const bg = bgMap[color] || bgMap.blue;
  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${bg} border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-extrabold">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && <Icon size={22} className="opacity-75 mt-1" />}
      </div>
    </div>
  );
}

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

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1: SINGLE-EVALUATION ANALYTICS
// ════════════════════════════════════════════════════════════════════════════════
function SingleEvalAnalytics({ history = [], modelFilter, setModelFilter }) {
  // Filter history by model
  const filteredHistory = useMemo(() => {
    if (modelFilter === 'ALL') return history;
    return history.filter(h => {
      const m = h.model || (h.processing_time_ms ? 'NLP Backend' : 'JS Engine');
      return m === modelFilter;
    });
  }, [history, modelFilter]);

  // Aggregate metrics from real history (no artificial seed)
  const metrics = useMemo(() => {
    const totalEvals      = filteredHistory.length;
    const totalClaims     = filteredHistory.reduce((s, h) => s + (h.claimsCount || h.claims?.length || 0), 0);
    const verified        = filteredHistory.reduce((s, h) => s + (h.stats?.supported || 0), 0);
    const hallucinated    = filteredHistory.reduce((s, h) => s + (h.stats?.contradictory || 0), 0);
    const uncertain       = filteredHistory.reduce((s, h) => s + (h.stats?.uncertain || 0), 0);
    const unsupported     = filteredHistory.reduce((s, h) => s + (h.stats?.unsupported || 0), 0);
    const avgScore        = totalEvals
      ? Math.round(filteredHistory.reduce((s, h) => s + (h.overallScore || 0), 0) / totalEvals)
      : 0;
    const passes = filteredHistory.filter(h => {
      const v = h.label || (h.overallScore >= 70 ? 'Pass' : 'Fail');
      return v === 'Pass' || v === 'PASS';
    }).length;
    const passRate = totalEvals ? Math.round((passes / totalEvals) * 100) : 0;

    return { totalEvals, totalClaims, verified, hallucinated, uncertain, unsupported, avgScore, passRate };
  }, [filteredHistory]);

  // Real trend data (most recent 12 evaluations)
  const trendData = useMemo(() => {
    if (!filteredHistory.length) return [];
    return filteredHistory.slice(-12).map((h, i) => ({
      label: `#${i + 1} (${new Date(h.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      hallucinationRate: h.stats?.hallucinationRisk ?? (h.stats?.contradictory ? Math.round((h.stats.contradictory / Math.max(1, h.claimsCount || 1)) * 100) : 0),
      reliabilityScore:  h.overallScore || 0,
    }));
  }, [filteredHistory]);

  // Real claim distribution pie
  const claimPie = useMemo(() => {
    return [
      { name: 'Supported',     value: metrics.verified },
      { name: 'Unsupported',   value: metrics.unsupported },
      { name: 'Contradictory', value: metrics.hallucinated },
      { name: 'Uncertain',     value: metrics.uncertain },
    ].filter(item => item.value > 0);
  }, [metrics]);

  // Real reliability score buckets
  const relDist = useMemo(() => {
    const d = { 'Highly Reliable (90+)': 0, 'Mostly Reliable (75-89)': 0, 'Needs Verification (50-74)': 0, 'High Risk (<50)': 0 };
    filteredHistory.forEach(h => {
      const s = h.overallScore || 0;
      if (s >= 90) d['Highly Reliable (90+)']++;
      else if (s >= 75) d['Mostly Reliable (75-89)']++;
      else if (s >= 50) d['Needs Verification (50-74)']++;
      else d['High Risk (<50)']++;
    });
    return [
      { name: 'Highly Reliable (90+)',     count: d['Highly Reliable (90+)'],     fill: '#10b981' },
      { name: 'Mostly Reliable (75-89)',   count: d['Mostly Reliable (75-89)'],   fill: '#3b82f6' },
      { name: 'Needs Verification (50-74)',count: d['Needs Verification (50-74)'],fill: '#f59e0b' },
      { name: 'High Risk (<50)',           count: d['High Risk (<50)'],           fill: '#ef4444' },
    ];
  }, [filteredHistory]);

  return (
    <div className="space-y-6">
      {/* Model Filter Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Evaluation Engine Filter:</span>
          <div className="flex items-center gap-2">
            {[
              { id: 'ALL', label: 'All Engines' },
              { id: 'NLP Backend', label: 'NLP Backend (FastAPI)' },
              { id: 'JS Engine', label: 'JS Engine (Fallback)' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setModelFilter(m.id)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                  modelFilter === m.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <strong>{filteredHistory.length}</strong> single evaluation{filteredHistory.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatPill label="Total Evals" value={metrics.totalEvals} color="blue" icon={BarChart2} />
        <StatPill label="Avg Reliability" value={`${metrics.avgScore}/100`} color="violet" icon={Award} />
        <StatPill label="Pass Rate" value={`${metrics.passRate}%`} color="emerald" icon={ShieldCheck} />
        <StatPill label="Total Claims" value={metrics.totalClaims} color="blue" icon={Cpu} />
        <StatPill label="Supported" value={metrics.verified} color="emerald" icon={CheckCircle} />
        <StatPill label="Contradictory" value={metrics.hallucinated} color="red" icon={AlertTriangle} />
      </div>

      {filteredHistory.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500 dark:text-slate-400">
          <Layers size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No single evaluations found for the selected model.</p>
          <p className="text-xs mt-1">Run an evaluation in the Validate tab to populate this dashboard.</p>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reliability & Hallucination Trend */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500" />
                Reliability & Hallucination Risk Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Sequential tracking across your recent single evaluations
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="reliabilityScore"
                      name="Reliability Score"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hallucinationRate"
                      name="Hallucination Risk %"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Claims Classification Distribution */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                <Activity size={18} className="text-emerald-500" />
                Claim Verification Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Factual verification breakdown across extracted statements
              </p>
              <div className="h-64">
                {claimPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={claimPie}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {claimPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CLAIM_COLORS[index % CLAIM_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No claims analyzed yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reliability Distribution Bar Chart */}
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-500" />
              Evaluation Score Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Number of single evaluations falling into each reliability tier
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={relDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="count" name="Evaluations" radius={[6, 6, 0, 0]}>
                    {relDist.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2: BATCH-EVALUATION ANALYTICS
// ════════════════════════════════════════════════════════════════════════════════
function BatchEvalAnalytics({ batchHistory = [], modelFilter, setModelFilter }) {
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  // Filter batches by model
  const filteredBatches = useMemo(() => {
    if (modelFilter === 'ALL') return batchHistory;
    return batchHistory.filter(b => (b.model || (b.batch_id?.startsWith('js_') ? 'JS Engine' : 'NLP Backend')) === modelFilter);
  }, [batchHistory, modelFilter]);

  // Flatten items from matching batches
  const allItems = useMemo(() => {
    const pool = [];
    filteredBatches.forEach((batch, bIdx) => {
      (batch.results || []).forEach(item => {
        pool.push({
          ...item,
          batchId: batch.batch_id,
          batchLabel: `Batch ${bIdx + 1}`,
          batchModel: batch.model || (batch.batch_id?.startsWith('js_') ? 'JS Engine' : 'NLP Backend')
        });
      });
    });
    return pool;
  }, [filteredBatches]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (selectedBatch !== 'ALL' && item.batchId !== selectedBatch) return false;
      if (verdictFilter !== 'ALL' && item.verdict !== verdictFilter) return false;
      const score = item.overall_score ?? 0;
      if (score < scoreRange[0] || score > scoreRange[1]) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchQ = (item.query || '').toLowerCase().includes(q);
        const matchR = (item.ai_response || '').toLowerCase().includes(q);
        if (!matchQ && !matchR) return false;
      }
      return true;
    });
  }, [allItems, selectedBatch, verdictFilter, scoreRange, searchQuery]);

  // Aggregate batch statistics
  const stats = useMemo(() => {
    const items = filteredItems;
    const total = items.length;
    if (!total) {
      return { total: 0, passCount: 0, needsCount: 0, failCount: 0, passRate: 0, avgOverall: 0, avgRel: 0, avgAcc: 0, avgHall: 0, avgComp: 0, hallRate: 0 };
    }
    const passCount  = items.filter(i => i.verdict === 'Pass').length;
    const needsCount = items.filter(i => i.verdict === 'Needs Improvement').length;
    const failCount  = items.filter(i => i.verdict === 'Fail').length;
    const passRate   = pct(passCount, total);

    const avgOverall = avg(items.map(i => i.overall_score ?? 0));
    const avgRel     = avg(items.map(i => i.relevance_score ?? 0));
    const avgAcc     = avg(items.map(i => i.accuracy_score ?? 0));
    const avgHall    = avg(items.map(i => i.hallucination_score ?? 0));
    const avgComp    = avg(items.map(i => i.completeness_score ?? 0));
    const hallCount  = items.filter(i => (i.hallucination_score ?? 0) > 0).length;
    const hallRate   = pct(hallCount, total);

    return { total, passCount, needsCount, failCount, passRate, avgOverall, avgRel, avgAcc, avgHall, avgComp, hallRate };
  }, [filteredItems]);

  // Verdict Pie Data
  const verdictPie = useMemo(() => [
    { name: 'Pass', value: stats.passCount, color: VERDICT_COLORS.Pass },
    { name: 'Needs Improvement', value: stats.needsCount, color: VERDICT_COLORS['Needs Improvement'] },
    { name: 'Fail', value: stats.failCount, color: VERDICT_COLORS.Fail },
  ].filter(d => d.value > 0), [stats]);

  // Radar Data for Dimension Balance
  const radarData = useMemo(() => [
    { dimension: 'Relevance',    score: stats.avgRel,     fullMark: 100 },
    { dimension: 'Accuracy',     score: stats.avgAcc,     fullMark: 100 },
    { dimension: 'Hallucination Safety', score: Math.max(0, 100 - stats.avgHall), fullMark: 100 },
    { dimension: 'Completeness', score: stats.avgComp,    fullMark: 100 },
  ], [stats]);

  // Score distribution histogram
  const histogramData = useMemo(() => {
    const buckets = [
      { range: '0–19',   count: 0 },
      { range: '20–39',  count: 0 },
      { range: '40–59',  count: 0 },
      { range: '60–79',  count: 0 },
      { range: '80–100', count: 0 },
    ];
    filteredItems.forEach(i => {
      const s = i.overall_score ?? 0;
      if (s < 20) buckets[0].count++;
      else if (s < 40) buckets[1].count++;
      else if (s < 60) buckets[2].count++;
      else if (s < 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [filteredItems]);

  // Batch trends over runs
  const batchTrendData = useMemo(() => {
    return filteredBatches.map((b, idx) => ({
      name: `Batch ${idx + 1}`,
      passRate: pct(b.pass_count ?? 0, b.total_records ?? 1),
      avgScore: b.avg_overall_score ?? 0,
      hallRate: b.hallucination_rate_pct ?? 0,
    }));
  }, [filteredBatches]);

  return (
    <div className="space-y-6">
      {/* Model & Filter Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Model Filter:</span>
          <div className="flex items-center gap-2">
            {[
              { id: 'ALL', label: 'All Engines' },
              { id: 'NLP Backend', label: 'NLP Backend (FastAPI)' },
              { id: 'JS Engine', label: 'JS Engine (Fallback)' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setModelFilter(m.id)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                  modelFilter === m.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBatch}
            onChange={e => setSelectedBatch(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Batch Runs ({filteredBatches.length})</option>
            {filteredBatches.map((b, i) => (
              <option key={b.batch_id} value={b.batch_id}>
                Batch {i + 1} — {b.model || 'Engine'} ({b.total_records} items)
              </option>
            ))}
          </select>

          <select
            value={verdictFilter}
            onChange={e => setVerdictFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Verdicts</option>
            <option value="Pass">Pass Only</option>
            <option value="Needs Improvement">Needs Improvement</option>
            <option value="Fail">Fail Only</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPill label="Batch Records" value={stats.total} color="blue" icon={BarChart2} />
        <StatPill label="Pass Rate" value={`${stats.passRate}%`} color="emerald" icon={ShieldCheck} subtitle={`${stats.passCount} of ${stats.total} passed`} />
        <StatPill label="Avg Reliability" value={`${stats.avgOverall}/100`} color="violet" icon={Award} subtitle="Cross-dimension average" />
        <StatPill label="Hallucination Frequency" value={`${stats.hallRate}%`} color="red" icon={AlertTriangle} subtitle="Records with ungrounded claims" />
      </div>

      {allItems.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500 dark:text-slate-400">
          <Database size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No batch evaluation runs recorded yet.</p>
          <p className="text-xs mt-1">Upload a CSV in the Batch Evaluation tab to view batch statistics.</p>
        </div>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Verdict Distribution */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" />
                Verdict Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Overall Pass, Needs Improvement, and Fail proportions
              </p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={verdictPie}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {verdictPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dimension Breakdown */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-500" />
                  Dimension Performance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                  Average score across all four AI evaluation agents
                </p>
                <div className="space-y-4">
                  <ScoreBar label="Relevance" value={stats.avgRel} color={DIM_COLORS.Relevance} />
                  <ScoreBar label="Accuracy" value={stats.avgAcc} color={DIM_COLORS.Accuracy} />
                  <ScoreBar label="Hallucination Safety" value={Math.max(0, 100 - stats.avgHall)} color={DIM_COLORS.Hallucination} />
                  <ScoreBar label="Completeness" value={stats.avgComp} color={DIM_COLORS.Completeness} />
                  <ScoreBar label="Weighted Overall" value={stats.avgOverall} color="#6366f1" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dimension Balance Radar */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Dimension Balance Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Radar representation of agent dimension balance</p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#cbd5e1" opacity={0.6} />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Radar name="Agent Score" dataKey="score" stroke={RADAR_COLOR} fill={RADAR_COLOR} fillOpacity={0.35} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Score Distribution Histogram */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Score Distribution Histogram</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Volume of responses grouped by overall reliability score</p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="count" name="Records" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Batch Item Records Table */}
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Batch Evaluation Records</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect individual question-answer evaluations from batch runs
                </p>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions or answers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Engine</th>
                    <th className="py-2.5 px-3">Question</th>
                    <th className="py-2.5 px-3 text-center">Relevance</th>
                    <th className="py-2.5 px-3 text-center">Accuracy</th>
                    <th className="py-2.5 px-3 text-center">Hallucination</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-center">Verdict</th>
                    <th className="py-2.5 px-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredItems.slice(0, 20).map((item, idx) => {
                    const isExpanded = expandedRow === idx;
                    return (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 font-medium text-slate-500">{item.batchLabel}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.batchModel === 'NLP Backend'
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {item.batchModel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate font-medium">{item.query}</td>
                          <td className="py-2.5 px-3 text-center">{item.relevance_score ?? '—'}</td>
                          <td className="py-2.5 px-3 text-center">{item.accuracy_score ?? '—'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={(item.hallucination_score ?? 0) > 0 ? 'text-red-500 font-bold' : 'text-slate-500'}>
                              {item.hallucination_score ?? 0}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{item.overall_score ?? 0}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.verdict === 'Pass' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                              item.verdict === 'Needs Improvement' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}>
                              {item.verdict}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : idx)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                            <td colSpan={9} className="p-4 text-xs space-y-2">
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Question: </span>
                                <span>{item.query}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">AI Response: </span>
                                <span className="text-slate-600 dark:text-slate-400">{item.ai_response}</span>
                              </div>
                              {item.reference && (
                                <div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">Reference Ground Truth: </span>
                                  <span className="text-slate-600 dark:text-slate-400">{item.reference}</span>
                                </div>
                              )}
                              {item.validation_report?.summary && (
                                <div className="mt-2 p-2.5 rounded bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                                  <strong>Consolidated Reasoning: </strong> {item.validation_report.summary}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredItems.length > 20 && (
              <p className="text-xs text-center text-slate-400 mt-3">
                Showing top 20 of {filteredItems.length} records. Use search to refine.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MASTER UNIFIED EVALUATION DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════
export default function EvaluationDashboard({ history = [], batchHistory = [] }) {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'batch'
  const [modelFilter, setModelFilter] = useState('ALL');

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="text-indigo-600" />
            Evaluation & Analytics Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unified analytics command center covering both individual response validations and batch evaluations
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'single'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            Single-Validation Analytics
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              {history.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'batch'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database size={14} />
            Batch-Evaluation Analytics
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              {batchHistory.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'single' ? (
        <SingleEvalAnalytics
          history={history}
          modelFilter={modelFilter}
          setModelFilter={setModelFilter}
        />
      ) : (
        <BatchEvalAnalytics
          batchHistory={batchHistory}
          modelFilter={modelFilter}
          setModelFilter={setModelFilter}
        />
      )}
    </div>
  );
}
