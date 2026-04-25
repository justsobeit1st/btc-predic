import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const C = {
  bg: '#05050f',
  card: '#0d0d20',
  border: '#1c1c38',
  btc: '#f7931a',
  green: '#00e676',
  red: '#ff1744',
  text: '#d4d4f0',
  muted: '#5a5a7a',
  dim: '#1a1a30',
  purple: '#a78bfa',
  cyan: '#22d3ee',
};

const MODES = [
  { id: 'direct', label: 'Direct API', icon: '⚡', desc: 'Calls Polymarket public API directly', color: C.cyan },
  { id: 'demo', label: 'Demo Data', icon: '📊', desc: 'View sample Bitcoin markets', color: C.green },
];

const fmt = {
  vol: (v) => {
    const n = parseFloat(v || 0);
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  },
  price: (v) => (v ? `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'),
  date: (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'),
  change: (v) => (v != null ? `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '—'),
};

// ── Fetchers ──────────────────────────────────────────────────────

async function fetchDirect() {
  try {
    const res = await fetch('/data/data.json?ts=' + Date.now());
    const raw = await res.json();

    const markets = raw.markets || [];
    const priceData = raw.btc || {};

    const btcPrice = priceData?.bitcoin?.usd;
    const btcChange24h = priceData?.bitcoin?.usd_24h_change;

    const btcMarkets = markets.filter((m) => {
      const q = (m.question || m.title || '').toLowerCase();
      return q.includes('bitcoin') || q.includes('btc');
    });

    const activeMarkets = [];
    const resolvedMarkets = [];

    for (const m of btcMarkets) {
      const prob =
        parseFloat(m.outcomePrices?.[0]) ||
        parseFloat(m.bestBid) ||
        0.5;

      const obj = {
        question: m.question || m.title || 'Unknown',
        yesProb: isNaN(prob) ? 0.5 : Math.max(0, Math.min(1, prob)),
        volume: parseFloat(m.volumeNum || m.volume || 0),
        endDate: m.endDateIso || m.endDate || null,
        resolution:
          m.resolutionString || m.resolvedOutcome || null,
        resolved: !!m.resolved,
      };

      if (m.active && !m.resolved) activeMarkets.push(obj);
      else if (m.resolved) resolvedMarkets.push(obj);
    }

    return {
      btcPrice,
      btcChange24h,
      activeMarkets: activeMarkets.slice(0, 20),
      resolvedMarkets: resolvedMarkets.slice(0, 20),
    };
  } catch (e) {
    throw new Error(`GitHub Data Error: ${e.message}`);
  }
}

function getDemoData() {
  return {
    btcPrice: 95000,
    btcChange24h: 2.5,
    activeMarkets: [
      { question: 'Will Bitcoin hit $100k by end of 2025?', yesProb: 0.65, volume: 12500000, endDate: '2025-12-31', resolution: null, resolved: false },
      { question: 'Will Bitcoin reach $150k by 2026?', yesProb: 0.38, volume: 8500000, endDate: '2026-12-31', resolution: null, resolved: false },
      { question: 'Will Bitcoin stay above $80k in Q2 2025?', yesProb: 0.72, volume: 6200000, endDate: '2025-06-30', resolution: null, resolved: false },
      { question: 'Bitcoin volatility: >15% swing in 30 days?', yesProb: 0.58, volume: 4100000, endDate: '2025-05-25', resolution: null, resolved: false },
      { question: 'Will BTC dominance exceed 45% by mid-2025?', yesProb: 0.42, volume: 3800000, endDate: '2025-06-30', resolution: null, resolved: false },
    ],
    resolvedMarkets: [
      { question: 'Bitcoin above $90k on April 1, 2025?', yesProb: 0.89, volume: 15000000, endDate: '2025-04-01', resolution: 'Yes', resolved: true },
      { question: 'Will Bitcoin surpass previous ATH by Q1 2025?', yesProb: 0.85, volume: 22000000, endDate: '2025-03-31', resolution: 'Yes', resolved: true },
      { question: 'Bitcoin correction >20% in Q1 2025?', yesProb: 0.2, volume: 9500000, endDate: '2025-03-31', resolution: 'No', resolved: true },
      { question: 'BTC/USD breaks $85k resistance?', yesProb: 0.88, volume: 18000000, endDate: '2025-02-28', resolution: 'Yes', resolved: true },
    ],
  };
}

// ── Small Components ──────────────────────────────────────────────

function Tag({ children, color }) {
  return (
    <span
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 10,
        fontFamily: "'JetBrains Mono',monospace",
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function ProbBar({ prob }) {
  const bull = prob >= 0.5;
  return (
    <div>
      <div style={{ height: 5, background: C.dim, borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${prob * 100}%`,
            background: `linear-gradient(90deg,${bull ? C.green : C.red}80,${bull ? C.green : C.red})`,
            borderRadius: 3,
            transition: 'width .6s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono'", color: bull ? C.green : C.muted }}>YES {(prob * 100).toFixed(1)}%</span>
        <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono'", color: !bull ? C.red : C.muted }}>NO {((1 - prob) * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontFamily: "'JetBrains Mono'", fontSize: 12 }}>
      <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>◎</div>
      {msg}
    </div>
  );
}

// ── Mode Switcher ─────────────────────────────────────────────────

function ModeSwitcher({ mode, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => !disabled && onChange(m.id)}
            disabled={disabled}
            title={m.desc}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: active ? `${m.color}18` : 'rgba(255,255,255,.03)',
              border: `1.5px solid ${active ? m.color : C.border}`,
              borderRadius: 8,
              padding: '7px 14px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all .2s',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 14 }}>{m.icon}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: active ? m.color : C.muted, letterSpacing: '.08em' }}>{m.label}</div>
            </div>
            {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, marginLeft: 4, boxShadow: `0 0 8px ${m.color}` }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────

function ActiveTab({ markets }) {
  if (!markets.length) return <Empty msg="NO ACTIVE MARKETS FOUND" />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
      {markets.map((m, i) => {
        const prob = Math.max(0, Math.min(1, parseFloat(m.yesProb) || 0.5));
        const bull = prob >= 0.5;
        return (
          <div
            key={i}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 18,
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color .2s',
              cursor: 'default',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = bull ? `${C.green}50` : `${C.red}50`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${bull ? C.green : C.red},transparent)` }} />
            <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55, marginBottom: 14, minHeight: 48 }}>{m.question}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.1em' }}>YES PROBABILITY</div>
                <div style={{ fontSize: 38, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: bull ? C.green : C.red, lineHeight: 1 }}>{(prob * 100).toFixed(0)}%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.1em' }}>VOLUME</div>
                <div style={{ fontSize: 17, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: C.btc }}>{fmt.vol(m.volume)}</div>
              </div>
            </div>
            <ProbBar prob={prob} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Tag color={C.btc}>LIVE</Tag>
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono'" }}>ENDS {fmt.date(m.endDate)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ markets }) {
  if (!markets.length) return <Empty msg="NO RESOLVED MARKETS FOUND" />;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 100px 120px', gap: 10, padding: '8px 14px', fontSize: 9, fontFamily: "'JetBrains Mono'", color: C.muted, letterSpacing: '.12em', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
        <div>QUESTION</div>
        <div style={{ textAlign: 'center' }}>RESULT</div>
        <div style={{ textAlign: 'center' }}>FINAL ODDS</div>
        <div style={{ textAlign: 'right' }}>VOLUME</div>
        <div style={{ textAlign: 'right' }}>RESOLVED</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {markets.map((m, i) => {
          const prob = Math.max(0, Math.min(1, parseFloat(m.yesProb) || 0.5));
          const isYes = m.resolution === 'Yes';
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px 110px 100px 120px',
                gap: 10,
                padding: '11px 14px',
                background: 'rgba(255,255,255,.015)',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                alignItems: 'center',
                transition: 'background .15s',
                cursor: 'default',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.015)')}
            >
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{m.question}</div>
              <div style={{ textAlign: 'center' }}>
                {m.resolution ? <Tag color={isYes ? C.green : C.red}>{isYes ? '✓ YES' : '✗ NO'}</Tag> : <Tag color={C.muted}>—</Tag>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: prob >= 0.5 ? C.green : C.red }}>{(prob * 100).toFixed(0)}%</div>
                <div style={{ height: 3, background: C.dim, borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${prob * 100}%`, background: prob >= 0.5 ? C.green : C.red, borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, fontFamily: "'JetBrains Mono'", fontWeight: 600, color: C.btc }}>{fmt.vol(m.volume)}</div>
              <div style={{ textAlign: 'right', fontSize: 10, fontFamily: "'JetBrains Mono'", color: C.muted }}>{fmt.date(m.endDate)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsTab({ resolved, active, stats }) {
  const yes = resolved.filter((m) => m.resolution === 'Yes').length;
  const no = resolved.filter((m) => m.resolution === 'No').length;
  const total = resolved.length;
  const avgSentiment = active.length ? active.reduce((s, m) => s + (parseFloat(m.yesProb) || 0.5), 0) / active.length : 0.5;
  const top10 = [...resolved]
    .sort((a, b) => parseFloat(b.volume || 0) - parseFloat(a.volume || 0))
    .slice(0, 10)
    .map((m, i) => ({
      name: `M${i + 1}`,
      label: (m.question || '').slice(0, 50) + '…',
      volume: parseFloat(m.volume || 0) / 1e6,
      result: m.resolution,
    }))
    .reverse();

  const Tip = ({ active: a, payload }) => {
    if (!a || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', maxWidth: 230 }}>
        <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono'", marginBottom: 6, lineHeight: 1.4 }}>{d?.label}</div>
        <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: C.btc }}>${payload[0]?.value?.toFixed(2)}M</div>
        <div style={{ marginTop: 4 }}>
          <Tag color={d?.result === 'Yes' ? C.green : d?.result === 'No' ? C.red : C.btc}>{d?.result || '—'}</Tag>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.12em', marginBottom: 14 }}>RESOLUTION SPLIT</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 14 }}>
            {[
              [yes, 'YES', C.green],
              [no, 'NO', C.red],
            ].map(([v, l, c]) => (
              <div key={l}>
                <div style={{ fontSize: 36, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 9, color: c, fontFamily: "'JetBrains Mono'", marginTop: 2 }}>RESOLVED {l}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 6, background: C.dim, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${total ? (yes / total) * 100 : 50}%`, background: C.green, borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'" }}>YES {total ? ((yes / total) * 100).toFixed(0) : 0}%</span>
            <span style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'" }}>NO {total ? ((no / total) * 100).toFixed(0) : 0}%</span>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.12em', marginBottom: 14 }}>TOTAL VOLUME TRADED</div>
          <div style={{ fontSize: 38, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: C.btc, lineHeight: 1 }}>{fmt.vol(stats.totalVol)}</div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono'", marginTop: 6 }}>across {stats.total} markets</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.12em', marginBottom: 14 }}>LIVE SENTIMENT</div>
          <div style={{ fontSize: 44, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: avgSentiment >= 0.5 ? C.green : C.red, lineHeight: 1 }}>{(avgSentiment * 100).toFixed(0)}%</div>
          <div style={{ fontSize: 11, color: avgSentiment >= 0.5 ? C.green : C.red, fontFamily: "'JetBrains Mono'", marginTop: 4, letterSpacing: '.1em' }}>{avgSentiment >= 0.5 ? '▲ BULLISH' : '▼ BEARISH'} LEAN</div>
          <div style={{ height: 6, background: C.dim, borderRadius: 3, overflow: 'hidden', marginTop: 14 }}>
            <div style={{ height: '100%', width: `${avgSentiment * 100}%`, background: avgSentiment >= 0.5 ? C.green : C.red, borderRadius: 3 }} />
          </div>
        </div>
      </div>
      {top10.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.12em', marginBottom: 16 }}>TOP 10 RESOLVED BY VOLUME (USD MILLIONS)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={top10} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.dim} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(247,147,26,.04)' }} />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {top10.map((e, i) => <Cell key={i} fill={e.result === 'Yes' ? C.green : e.result === 'No' ? C.red : C.btc} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, marginTop: 10, justifyContent: 'center' }}>
            {[
              ['Resolved YES', C.green],
              ['Resolved NO', C.red],
              ['Unknown', C.btc],
            ].map(([l, c]) => (
              <span key={l} style={{ fontSize: 10, color: c, fontFamily: "'JetBrains Mono'" }}>
                ■ {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('active');
  const [mode, setMode] = useState('demo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [tick, setTick] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@300;400;500;700&display=swap');@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}::-webkit-scrollbar{width:5px;background:#05050f}::-webkit-scrollbar-thumb{background:#1c1c38;border-radius:3px}`;
    document.head.appendChild(el);
    const t = setInterval(() => setTick((b) => !b), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      let result;
      if (mode === 'direct') {
        result = await fetchDirect();
      } else {
        result = getDemoData();
      }
      setData(result);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(e.message);
      // Fallback to demo data on error
      if (mode === 'direct') {
        setData(getDemoData());
        setErr('API unavailable. Showing demo data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const active = data?.activeMarkets || [];
  const resolved = data?.resolvedMarkets || [];
  const stats = useMemo(
    () => ({
      totalVol: [...active, ...resolved].reduce((s, m) => s + parseFloat(m.volume || 0), 0),
      total: active.length + resolved.length,
    }),
    [active, resolved]
  );

  const TABS = [
    ['active', `ACTIVE (${active.length})`],
    ['history', `HISTORY (${resolved.length})`],
    ['analytics', 'ANALYTICS'],
  ];

  const loadingMessages = {
    direct: ['⚡ Fetching Polymarket data…', 'Getting BTC price from CoinGecko…'],
    demo: ['📊 Loading demo data…'],
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        fontFamily: "'Syne',sans-serif",
        color: C.text,
        backgroundImage: `radial-gradient(ellipse at 15% 0%,rgba(247,147,26,.07) 0%,transparent 55%),radial-gradient(ellipse at 85% 100%,rgba(0,230,118,.04) 0%,transparent 55%)`,
      }}
    >
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,rgba(247,147,26,.08) 0%,transparent 100%)', borderBottom: `1px solid ${C.border}`, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 34, letterSpacing: '.04em', lineHeight: 1 }}>
              <span style={{ color: C.btc }}>₿ POLYMARKET</span> <span style={{ color: C.text }}>ORACLE</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono'", marginTop: 4, letterSpacing: '.15em' }}>BITCOIN PREDICTION MARKETS</div>
          </div>
          {data && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.15em' }}>
                BTC/USD {tick ? <span style={{ color: C.green }}>●</span> : '●'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 26, fontWeight: 700, color: C.btc }}>{fmt.price(data.btcPrice)}</div>
              {data.btcChange24h != null && <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono'", color: data.btcChange24h >= 0 ? C.green : C.red }}>{fmt.change(data.btcChange24h)} 24h</div>}
            </div>
          )}
        </div>

        {/* Mode Switcher Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,.02)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.15em', flexShrink: 0 }}>DATA SOURCE</span>
          <ModeSwitcher mode={mode} onChange={(m) => { setMode(m); setData(null); setErr(null); }} disabled={loading} />
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={load}
              disabled={loading}
              style={{
                background: loading ? C.dim : MODES.find((m) => m.id === mode)?.color || C.btc,
                color: loading ? C.muted : '#000',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'JetBrains Mono'",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.12em',
                transition: 'all .2s',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'LOADING…' : data ? '↻ REFRESH' : '▶ LOAD DATA'}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 10 }}>
              {[
                ['ACTIVE', active.length, C.btc],
                ['RESOLVED', resolved.length, C.text],
                ['VOLUME', fmt.vol(stats.totalVol), C.green],
                ['YES', resolved.filter((m) => m.resolution === 'Yes').length, C.green],
                ['NO', resolved.filter((m) => m.resolution === 'No').length, C.red],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,.018)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.12em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontFamily: "'JetBrains Mono'", fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono'", letterSpacing: '.1em' }}>
              LAST UPDATED: {lastUpdated?.toLocaleTimeString()}
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      {data && (
        <div style={{ padding: '0 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 2 }}>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: tab === id ? `${C.btc}12` : 'transparent',
                border: 'none',
                borderBottom: tab === id ? `2px solid ${C.btc}` : '2px solid transparent',
                color: tab === id ? C.btc : C.muted,
                padding: '12px 20px',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono'",
                fontSize: 10,
                letterSpacing: '.12em',
                transition: 'all .2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 24 }}>
        {/* Welcome */}
        {!data && !loading && !err && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>₿</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: C.text, letterSpacing: '.1em', marginBottom: 12 }}>BITCOIN PREDICTION MARKETS</div>
            <div style={{ fontSize: 13, color: C.muted, fontFamily: "'JetBrains Mono'", marginBottom: 32 }}>Choose a data source to explore live Polymarket Bitcoin markets</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, maxWidth: 720, margin: '0 auto 32px' }}>
              {MODES.map((m) => (
                <div
                  key={m.id}
                  onClick={() => { setMode(m.id); setData(null); setErr(null); }}
                  style={{
                    background: mode === m.id ? `${m.color}12` : 'rgba(255,255,255,.025)',
                    border: `1.5px solid ${mode === m.id ? m.color : C.border}`,
                    borderRadius: 12,
                    padding: '18px 20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .2s',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono'", fontWeight: 700, color: m.color, marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono'", lineHeight: 1.5 }}>{m.desc}</div>
                  {mode === m.id && <div style={{ marginTop: 10 }}><Tag color={m.color}>SELECTED</Tag></div>}
                </div>
              ))}
            </div>
            <button
              onClick={load}
              style={{
                background: MODES.find((m) => m.id === mode)?.color || C.btc,
                color: '#000',
                border: 'none',
                borderRadius: 10,
                padding: '14px 40px',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono'",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '.15em',
              }}
            >
              ▶ LOAD WITH {MODES.find((m) => m.id === mode)?.label.toUpperCase()}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: C.muted, fontFamily: "'JetBrains Mono'", fontSize: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 16, display: 'inline-block', animation: 'spin 1.4s linear infinite' }}>◎</div>
            {(loadingMessages[mode] || []).map((msg, i) => (
              <div key={i} style={{ marginTop: i === 0 ? 0 : 6, color: i === 0 ? C.text : C.muted, fontSize: i === 0 ? 13 : 10 }}>
                {msg}
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {err && !loading && (
          <div style={{ background: `${C.red}0c`, border: `1px solid ${C.red}35`, borderRadius: 12, padding: 30, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>⚠</div>
            <div style={{ color: C.red, fontFamily: "'JetBrains Mono'", fontSize: 12, marginBottom: 16 }}>{err}</div>
            <button
              onClick={load}
              style={{
                background: C.btc,
                color: '#000',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono'",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.1em',
              }}
            >
              RETRY
            </button>
          </div>
        )}

        {!loading && !err && data && tab === 'active' && <ActiveTab markets={active} />}
        {!loading && !err && data && tab === 'history' && <HistoryTab markets={resolved} />}
        {!loading && !err && data && tab === 'analytics' && <AnalyticsTab resolved={resolved} active={active} stats={stats} />}
      </div>
    </div>
  );
}
