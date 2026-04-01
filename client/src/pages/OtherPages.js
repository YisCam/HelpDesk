import { useState, useEffect } from 'react';
import { useApp, api } from '../context/AppContext';

const ROLE_LABELS  = { admin: 'Administrador', tecnico: 'Técnico TI', usuario: 'Usuario Final' };
const ROLE_COLORS  = { admin: '#ef4444', tecnico: '#3b82f6', usuario: '#10b981' };
const ROLE_ICONS   = { admin: '⚙', tecnico: '🔧', usuario: '👤' };
const DEPT_COLORS  = { TI: '#3b82f6', Ventas: '#10b981', Contabilidad: '#f59e0b', Logística: '#8b5cf6', Marketing: '#f97316', RRHH: '#06b6d4' };

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
export function UsersPage() {
  const { users, fetchUsers, notify } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', email: '', role: 'usuario', department: 'Ventas', phone: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const byRole = {};
  users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditUser(null); setForm({ name: '', username: '', email: '', role: 'usuario', department: 'Ventas', phone: '' }); setShowForm(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ name: u.name, username: u.username, email: u.email, role: u.role, department: u.department || '', phone: u.phone || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editUser) { await api.patch(`/users/${editUser.id}`, form); notify('Usuario actualizado'); }
      else { await api.post('/users', form); notify('Usuario creado'); }
      await fetchUsers();
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    await api.patch(`/users/${u.id}`, { active: !u.active });
    await fetchUsers();
    notify(u.active ? 'Usuario desactivado' : 'Usuario activado');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1>Gestión de Usuarios</h1><p>{users.length} usuarios registrados · {users.filter(u => u.active).length} activos</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Usuario</button>
      </div>

      {/* Role stats */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: `${ROLE_COLORS[role]}18`, border: `1px solid ${ROLE_COLORS[role]}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {ROLE_ICONS[role]}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: ROLE_COLORS[role], lineHeight: 1 }}>{byRole[role] || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <div className="search-input-wrapper">
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" /></svg>
          <input className="form-control" placeholder="Buscar por nombre, usuario o email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Dpto.</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[u.role]}, ${ROLE_COLORS[u.role]}88)`, color: '#fff', fontSize: 10 }}>{u.avatar}</div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--accent-blue)' }}>{u.username}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                <td>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${ROLE_COLORS[u.role]}15`, color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}30` }}>
                    {ROLE_ICONS[u.role]} {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: `${DEPT_COLORS[u.department] || '#6b7280'}15`, color: DEPT_COLORS[u.department] || 'var(--text-muted)', border: `1px solid ${DEPT_COLORS[u.department] || '#6b7280'}30` }}>
                    {u.department || '—'}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 600, color: u.active ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {u.active ? '● Activo' : '○ Inactivo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); openEdit(u); }}>✏</button>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); toggleActive(u); }}
                      style={{ background: u.active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.active ? 'var(--accent-red)' : 'var(--accent-green)', border: 'none', cursor: 'pointer' }}>
                      {u.active ? '⊘' : '✓'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal modal-sm fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 600 }}>{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Nombre completo *</label><input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="form-group"><label>Usuario *</label><input className="form-control" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required disabled={!!editUser} /></div>
              <div className="form-group"><label>Email</label><input className="form-control" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="grid-2">
                <div className="form-group"><label>Rol</label>
                  <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Departamento</label>
                  <select className="form-control" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    {['TI', 'Ventas', 'Contabilidad', 'Logística', 'Marketing', 'RRHH', 'Gerencia'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Teléfono</label><input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Ej: 999-001" /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : editUser ? 'Guardar cambios' : 'Crear usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
export function ReportsPage() {
  const { tickets, metrics, users } = useApp();
  const [slaReport, setSlaReport] = useState(null);
  const [slaConfig, setSlaConfig] = useState(null);
  const [editSLA, setEditSLA] = useState(false);
  const [slaForm, setSlaForm] = useState(null);
  const [savingSLA, setSavingSLA] = useState(false);
  const [tab, setTab] = useState('resumen');

  useEffect(() => {
    api.get('/reports/sla').then(r => { setSlaReport(r); setSlaConfig(r.slaConfig); setSlaForm(JSON.parse(JSON.stringify(r.slaConfig))); });
  }, []);

  const handleSaveSLA = async () => {
    setSavingSLA(true);
    try { await api.put('/sla', slaForm); setSlaConfig(slaForm); setEditSLA(false); }
    finally { setSavingSLA(false); }
  };

  const exportCSV = () => {
    const rows = [
      ['ID', 'Título', 'Categoría', 'Prioridad', 'Estado', 'Asignado', 'Creado', 'Resuelto', 'SLA'].join(','),
      ...tickets.map(t => [
        t.id, `"${t.title}"`, t.category, t.priority, t.status,
        t.assignee?.name || 'Sin asignar',
        new Date(t.createdAt).toLocaleDateString('es-PE'),
        t.status === 'Resuelto' ? new Date(t.updatedAt).toLocaleDateString('es-PE') : '—',
        t.slaStatus || '—'
      ].join(','))
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  if (!metrics) return <div className="loading"><div className="spinner" /></div>;

  const resolved = tickets.filter(t => t.status === 'Resuelto' || t.status === 'Cerrado');
  const TABS_REP = ['resumen', 'tecnicos', 'sla_config'];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1>Reportes SLA</h1><p>Métricas de cumplimiento ITIL · {tickets.length} tickets analizados</p></div>
        <button className="btn btn-secondary" onClick={exportCSV}>⬇ Exportar CSV</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[['resumen', 'Resumen Ejecutivo'], ['tecnicos', 'Rendimiento Técnicos'], ['sla_config', 'Configuración SLA']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: tab === id ? 600 : 400, color: tab === id ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: tab === id ? '2px solid var(--accent-blue)' : '2px solid transparent', marginBottom: -1, transition: 'all 0.12s'
          }}>{label}</button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {tab === 'resumen' && (
        <div>
          <div className="grid-4" style={{ marginBottom: 20 }}>
            {[
              { label: 'Cumplimiento SLA', value: `${metrics.slaCompliance}%`, color: metrics.slaCompliance >= 90 ? 'var(--accent-green)' : metrics.slaCompliance >= 70 ? 'var(--accent-amber)' : 'var(--accent-red)', sub: 'Meta: 95%' },
              { label: 'Tiempo prom. resolución', value: `${metrics.avgResolutionHours}h`, color: 'var(--accent-cyan)', sub: 'Meta: <6h' },
              { label: 'Tasa de resolución', value: `${metrics.total > 0 ? Math.round((resolved.length / metrics.total) * 100) : 0}%`, color: 'var(--accent-purple)', sub: `${resolved.length} de ${metrics.total}` },
              { label: 'CSAT promedio', value: metrics.avgSatisfaction ? `${metrics.avgSatisfaction}/5` : 'N/D', color: 'var(--accent-amber)', sub: 'Satisfacción usuario' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="card stat-card" style={{ '--accent-color': color }}>
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Status breakdown */}
          <div className="grid-2">
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 14 }}>Distribución por Estado</div>
              {Object.entries(metrics.byStatus || {}).map(([s, c]) => {
                const cols = { Abierto: '#3b82f6', 'En Progreso': '#8b5cf6', Resuelto: '#10b981', Cerrado: '#6b7280' };
                return (
                  <div key={s} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                      <span style={{ fontWeight: 700, color: cols[s] }}>{c} ({metrics.total > 0 ? Math.round((c / metrics.total) * 100) : 0}%)</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.total > 0 ? (c / metrics.total) * 100 : 0}%`, background: cols[s], borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 14 }}>Distribución por Prioridad</div>
              {Object.entries(metrics.byPriority || {}).map(([p, c]) => {
                const cols = { Crítica: '#ef4444', Alta: '#f97316', Media: '#f59e0b', Baja: '#10b981' };
                return (
                  <div key={p} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span className={`badge priority-${p.toLowerCase()}`}>{p}</span>
                      <span style={{ fontWeight: 700, color: cols[p] }}>{c} ({metrics.total > 0 ? Math.round((c / metrics.total) * 100) : 0}%)</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${metrics.total > 0 ? (c / metrics.total) * 100 : 0}%`, background: cols[p], borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TÉCNICOS ── */}
      {tab === 'tecnicos' && (
        <div>
          {slaReport?.techReport?.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr><th>Técnico</th><th>Dept.</th><th>Asignados</th><th>Resueltos</th><th>Vencidos SLA</th><th>Cumplimiento</th><th>Indicador</th></tr></thead>
                <tbody>
                  {slaReport.techReport.map(r => (
                    <tr key={r.user?.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', fontSize: 10 }}>{r.user?.avatar || '?'}</div>
                          <span style={{ fontWeight: 500 }}>{r.user?.name || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.user?.department || '—'}</td>
                      <td style={{ fontSize: 14, fontWeight: 600 }}>{r.total}</td>
                      <td style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-green)' }}>{r.resolved}</td>
                      <td style={{ fontSize: 14, fontWeight: 600, color: r.breached > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>{r.breached}</td>
                      <td style={{ fontWeight: 700, color: r.compliance >= 90 ? 'var(--accent-green)' : r.compliance >= 70 ? 'var(--accent-amber)' : 'var(--accent-red)', fontSize: 15 }}>
                        {r.compliance}%
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${r.compliance}%`, background: r.compliance >= 90 ? 'var(--accent-green)' : r.compliance >= 70 ? 'var(--accent-amber)' : 'var(--accent-red)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><h3>Sin datos de técnicos</h3><p>Asigna tickets a los técnicos para ver estadísticas</p></div>
          )}
        </div>
      )}

      {/* ── SLA CONFIG ── */}
      {tab === 'sla_config' && slaConfig && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Define los tiempos de respuesta y resolución por nivel de prioridad ITIL</div>
            {!editSLA
              ? <button className="btn btn-secondary" onClick={() => setEditSLA(true)}>✏ Editar SLA</button>
              : <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setEditSLA(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleSaveSLA} disabled={savingSLA}>{savingSLA ? 'Guardando...' : '✓ Guardar SLA'}</button>
                </div>
            }
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {slaForm && Object.entries(slaForm).map(([priority, cfg]) => {
              const colors = { Crítica: '#ef4444', Alta: '#f97316', Media: '#f59e0b', Baja: '#10b981' };
              const color = colors[priority];
              return (
                <div key={priority} className="card" style={{ borderTop: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span className={`badge priority-${priority.toLowerCase()}`}>{priority}</span>
                  </div>

                  <div className="form-group">
                    <label>Tiempo de respuesta (h)</label>
                    {editSLA ? (
                      <input type="number" className="form-control" min="1" value={cfg.responseTime}
                        onChange={e => setSlaForm(f => ({ ...f, [priority]: { ...f[priority], responseTime: Number(e.target.value) } }))} />
                    ) : (
                      <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>{cfg.responseTime}h</div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tiempo de resolución (h)</label>
                    {editSLA ? (
                      <input type="number" className="form-control" min="1" value={cfg.resolutionTime}
                        onChange={e => setSlaForm(f => ({ ...f, [priority]: { ...f[priority], resolutionTime: Number(e.target.value) } }))} />
                    ) : (
                      <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>{cfg.resolutionTime}h</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent-blue)' }}>💡 ITIL v4 SLA:</strong> Los tiempos de SLA se calculan desde la creación del ticket. Al modificar estos valores, los nuevos tickets heredarán los plazos actualizados. Los tickets existentes mantienen sus plazos originales.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
