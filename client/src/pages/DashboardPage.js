import { useState, useEffect } from 'react';
import { useApp, api } from '../context/AppContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

// ─── MiniSparkline (pure SVG) ─────────────────────────────────────────────────
function Sparkline({ data, color = '#3b82f6', height = 36, width = 100 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');
  const area = `M0,${height} L${pts.split(' ').map(p => p).join(' L')} L${width},${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height, display: 'block' }}>
      <defs>
        <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Donut Chart (pure SVG) ───────────────────────────────────────────────────
function DonutChart({ data, size = 100 }) {
  const r = 36, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const slices = data.map(d => {
    const pct = d.value / total;
    const dash = pct * circ;
    const slice = { ...d, dasharray: `${dash} ${circ - dash}`, offset: circ * (1 - offset) };
    offset += pct;
    return slice;
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      {slices.filter(s => s.value > 0).map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
          strokeWidth="14" strokeDasharray={s.dasharray}
          strokeDashoffset={-s.offset}
          style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px` }} />
      ))}
      <circle cx={cx} cy={cy} r={27} fill="var(--bg-surface)" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="700" fontFamily="DM Sans">
        {total}
      </text>
    </svg>
  );
}

// ─── SLA Gauge ────────────────────────────────────────────────────────────────
function SLAGauge({ value }) {
  const color = value >= 90 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';
  const r = 46, circ = Math.PI * r; // half circle
  const pct = Math.min(value / 100, 1);
  return (
    <svg viewBox="0 0 120 70" style={{ width: 120, height: 70 }}>
      <path d="M 12,60 A 46,46 0 0,1 108,60" fill="none" stroke="var(--bg-elevated)" strokeWidth="10" strokeLinecap="round" />
      <path d="M 12,60 A 46,46 0 0,1 108,60" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${circ}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x="60" y="54" textAnchor="middle" fill={color} fontSize="20" fontWeight="800" fontFamily="DM Sans">{value}%</text>
      <text x="60" y="68" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans">CUMPLIMIENTO SLA</text>
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon, sub, sparkData, onClick }) {
  return (
    <div className="card stat-card" style={{ '--accent-color': color, cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }} onClick={onClick}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color, marginTop: 6 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ opacity: 0.2, fontSize: 28 }}>{icon}</div>
      </div>
      {sparkData && (
        <div style={{ marginTop: 10 }}>
          <Sparkline data={sparkData} color={color} width={120} height={32} />
        </div>
      )}
    </div>
  );
}

// ─── Team Workload ────────────────────────────────────────────────────────────
function TeamWorkload({ tickets, users }) {
  const techs = users.filter(u => u.role !== 'usuario');
  const workload = techs.map(u => {
    const assigned = tickets.filter(t => t.assignedTo === u.id && !['Resuelto','Cerrado'].includes(t.status));
    const critical = assigned.filter(t => t.priority === 'Crítica').length;
    const resolved = tickets.filter(t => t.assignedTo === u.id && t.status === 'Resuelto').length;
    return { user: u, assigned: assigned.length, critical, resolved, total: assigned.length };
  });
  const maxWork = Math.max(...workload.map(w => w.assigned), 1);

  return (
    <div>
      {workload.map(w => (
        <div key={w.user.id} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="avatar" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', fontSize: 10, width: 26, height: 26 }}>{w.user.avatar}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{w.user.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{w.user.role}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
              {w.critical > 0 && <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>⚠ {w.critical}</span>}
              <span style={{ color: 'var(--text-muted)' }}>{w.assigned} activos</span>
              <span style={{ color: 'var(--accent-green)' }}>✓ {w.resolved}</span>
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
              width: `${(w.assigned / maxWork) * 100}%`,
              background: w.critical > 0 ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #3b82f6, #06b6d4)'
            }} />
          </div>
        </div>
      ))}
      {workload.every(w => w.assigned === 0) && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>🎉 Sin tickets activos asignados</div>
      )}
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeed({ tickets }) {
  const events = [];
  tickets.slice(0, 10).forEach(t => {
    (t.historyEnriched || t.history || []).slice(-1).forEach(h => {
      events.push({ ticket: t, action: h.action, user: h.user?.name || h.userId, time: h.timestamp });
    });
  });
  events.sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.slice(0, 8).map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, color: 'var(--accent-blue)' }}>◈</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{e.action}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              <span className="mono">{e.ticket.id}</span> · {e.ticket.title.substring(0, 35)}...
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingTop: 2 }}>{timeAgo(e.time)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate }) {
  const { metrics, tickets, users } = useApp();
  const [slaReport, setSlaReport] = useState(null);

  useEffect(() => {
    api.get('/reports/sla').then(setSlaReport).catch(() => {});
  }, []);

  if (!metrics) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-muted)' }}>
      <div className="spinner" /> Cargando dashboard...
    </div>
  );

  const bs = metrics.byStatus || {};
  const bp = metrics.byPriority || {};
  const bc = metrics.byCategory || {};

  // Fake sparkline data derived from tickets (last 7 days trend simulation)
  const today = Date.now();
  const dayMs = 86400000;
  const trendOpen = Array.from({ length: 7 }, (_, i) =>
    tickets.filter(t => new Date(t.createdAt) >= new Date(today - (6 - i) * dayMs) && new Date(t.createdAt) < new Date(today - (5 - i) * dayMs)).length
  );
  const trendResolved = Array.from({ length: 7 }, (_, i) =>
    tickets.filter(t => t.status === 'Resuelto' && new Date(t.updatedAt) >= new Date(today - (6 - i) * dayMs) && new Date(t.updatedAt) < new Date(today - (5 - i) * dayMs)).length
  );

  const statusData = [
    { label: 'Abierto', value: bs['Abierto'] || 0, color: '#3b82f6' },
    { label: 'En Progreso', value: bs['En Progreso'] || 0, color: '#8b5cf6' },
    { label: 'Resuelto', value: bs['Resuelto'] || 0, color: '#10b981' },
    { label: 'Cerrado', value: bs['Cerrado'] || 0, color: '#6b7280' },
  ];

  const categoryData = Object.entries(bc);
  const maxCat = Math.max(...categoryData.map(([,v]) => v), 1);
  const CAT_COLORS = { Hardware: '#06b6d4', Software: '#8b5cf6', Red: '#3b82f6', Accesos: '#f59e0b', Otro: '#6b7280' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard Operativo</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Visión en tiempo real · {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>↺ Actualizar</button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('new-ticket')}>+ Nuevo Ticket</button>
        </div>
      </div>

      {/* Alertas críticas */}
      {(metrics.criticalOpen > 0 || metrics.slaVencidos > 0) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {metrics.criticalOpen > 0 && (
            <div onClick={() => onNavigate('tickets')} style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>
              <div className="dot dot-red" style={{ width: 10, height: 10 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-red)' }}>{metrics.criticalOpen} ticket{metrics.criticalOpen > 1 ? 's' : ''} crítico{metrics.criticalOpen > 1 ? 's' : ''} activo{metrics.criticalOpen > 1 ? 's' : ''} — requieren atención inmediata</span>
            </div>
          )}
          {metrics.slaVencidos > 0 && (
            <div onClick={() => onNavigate('tickets')} style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer' }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-amber)' }}>{metrics.slaVencidos} SLA vencido{metrics.slaVencidos > 1 ? 's' : ''} · {metrics.slaEnRiesgo} en riesgo</span>
            </div>
          )}
        </div>
      )}

      {/* KPIs row */}
      <div className="grid-4" style={{ marginBottom: 18 }}>
        <StatCard label="Total Tickets" value={metrics.total} color="var(--accent-blue)" icon="◈" sparkData={trendOpen} onClick={() => onNavigate('tickets')} />
        <StatCard label="Activos" value={metrics.openTickets} color="var(--accent-cyan)" icon="○" sub={`${metrics.unassigned} sin asignar`} sparkData={trendOpen.map(v => v)} onClick={() => onNavigate('tickets')} />
        <StatCard label="Resueltos" value={(bs['Resuelto'] || 0) + (bs['Cerrado'] || 0)} color="var(--accent-green)" icon="●" sub={`Prom. ${metrics.avgResolutionHours}h`} sparkData={trendResolved} />
        <StatCard label="Satisfacción" value={metrics.avgSatisfaction ? `${metrics.avgSatisfaction} ★` : '—'} color="var(--accent-amber)" icon="★" sub="CSAT promedio" />
      </div>

      {/* Middle row: SLA gauge + status donut + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 220px 1fr', gap: 16, marginBottom: 18 }}>
        {/* SLA Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '20px 24px' }}>
          <SLAGauge value={metrics.slaCompliance} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
            {[
              { label: 'Vencidos', value: metrics.slaVencidos, color: 'var(--accent-red)' },
              { label: 'En riesgo', value: metrics.slaEnRiesgo, color: 'var(--accent-amber)' },
              { label: 'Prom. resolución', value: `${metrics.avgResolutionHours}h`, color: 'var(--accent-cyan)' },
              { label: 'Total tickets', value: metrics.total, color: 'var(--text-secondary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Donut */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, alignSelf: 'flex-start' }}>Por Estado</div>
          <DonutChart data={statusData} size={110} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {statusData.map(d => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                </div>
                <span style={{ fontWeight: 600, color: d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Actividad Reciente</div>
          <ActivityFeed tickets={tickets} />
        </div>
      </div>

      {/* Bottom row: category breakdown + team workload + priority */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* By category */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Por Categoría</div>
          {categoryData.map(([cat, count]) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[cat] || '#6b7280', display: 'inline-block' }} />
                  {cat}
                </span>
                <span style={{ fontWeight: 600, color: CAT_COLORS[cat] || 'var(--text-secondary)' }}>{count}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${(count / maxCat) * 100}%`, background: CAT_COLORS[cat] || '#6b7280', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Team workload */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Carga del Equipo TI</div>
          <TeamWorkload tickets={tickets} users={users} />
        </div>

        {/* SLA per tech from report */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Rendimiento por Técnico</div>
          {slaReport?.techReport?.length > 0 ? (
            slaReport.techReport.map(r => (
              <div key={r.user?.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{r.user?.name || 'Desconocido'}</span>
                  <span style={{ fontWeight: 700, color: r.compliance >= 90 ? 'var(--accent-green)' : r.compliance >= 70 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                    {r.compliance}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', flex: 1, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${r.compliance}%`, background: r.compliance >= 90 ? 'var(--accent-green)' : r.compliance >= 70 ? 'var(--accent-amber)' : 'var(--accent-red)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>{r.resolved} resueltos</span>
                  <span>{r.total} total</span>
                  {r.breached > 0 && <span style={{ color: 'var(--accent-red)' }}>⚠ {r.breached} vencidos</span>}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin datos de rendimiento</div>
          )}

          {/* ITIL process health */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Salud del Proceso ITIL</div>
            {[
              ['Registro', true],
              ['Clasificación', true],
              ['SLA compliance', metrics.slaCompliance >= 80],
              ['Sin sin asignar', metrics.unassigned === 0],
              ['Cumplimiento general', metrics.slaCompliance >= 90],
            ].map(([name, ok]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                <span style={{ color: 'var(--text-muted)' }}>{name}</span>
                <span style={{ color: ok ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 600 }}>{ok ? '✓ OK' : '⚠ Revisar'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
