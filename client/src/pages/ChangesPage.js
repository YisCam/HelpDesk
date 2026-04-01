import { useState } from 'react';
import { useApp } from '../context/AppContext';

const TYPE_COLORS = { Normal: '#3b82f6', Estándar: '#10b981', Emergencia: '#ef4444' };
const STATUS_COLORS = { 'En Revisión': '#f59e0b', Aprobado: '#10b981', Implementado: '#6b7280', Rechazado: '#ef4444', 'En Implementación': '#8b5cf6' };
const IMPACT_COLORS = { Alto: '#ef4444', Medio: '#f59e0b', Bajo: '#10b981' };

function timeFormat(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ChangeModal({ change, onClose, onUpdate }) {
  const { user, users } = useApp();
  const [status, setStatus] = useState(change.status);
  const [saving, setSaving] = useState(false);
  const canApprove = user?.role === 'admin' && change.status === 'En Revisión';

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    try { await onUpdate(change.id, { status: newStatus }); setStatus(newStatus); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>{change.id}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${TYPE_COLORS[change.type]}20`, color: TYPE_COLORS[change.type], border: `1px solid ${TYPE_COLORS[change.type]}40` }}>{change.type}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}40` }}>{status}</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{change.title}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Solicitado por <strong style={{ color: 'var(--text-secondary)' }}>{change.requester?.name || change.requestedBy}</strong> · {timeFormat(change.createdAt)}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
          <div>
            <div className="form-group">
              <label>Descripción del Cambio (RFC)</label>
              <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{change.description}</div>
            </div>
            <div className="form-group">
              <label>Plan de Rollback</label>
              <div style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.15)', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: 11 }}>⏮ ROLLBACK: </span>{change.rollbackPlan}
              </div>
            </div>

            {/* Historial */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Historial CAB</div>
              <div className="timeline">
                {[...(change.history || [])].reverse().map((h, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot" style={{ fontSize: 10, color: 'var(--accent-blue)' }}>◈</div>
                    <div className="timeline-content">
                      <div className="timeline-text">{h.action}</div>
                      <div className="timeline-time">{timeFormat(h.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metadata panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card-elevated">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Clasificación ITIL</div>
              {[
                ['Tipo', change.type, TYPE_COLORS[change.type]],
                ['Impacto', change.impact, IMPACT_COLORS[change.impact]],
                ['Riesgo', change.risk, IMPACT_COLORS[change.risk]],
                ['Prioridad', change.priority],
                ['Asignado', change.assignee?.name || '—'],
              ].map(([k, v, color]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: color || 'var(--text-secondary)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="card-elevated">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Ventana de Cambio</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Inicio</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>{timeFormat(change.scheduledStart)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Fin estimado</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{timeFormat(change.scheduledEnd)}</div>
            </div>

            {/* Approvals */}
            {(change.approvals || []).length > 0 && (
              <div className="card-elevated">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Aprobaciones CAB</div>
                {change.approvals.map((a, i) => {
                  const approver = users.find(u => u.id === a.userId);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: 'var(--accent-green)', fontSize: 13 }}>✓</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{approver?.name || a.userId}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeFormat(a.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            {canApprove && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-primary" onClick={() => handleStatusChange('Aprobado')} disabled={saving} style={{ justifyContent: 'center' }}>
                  {saving ? '...' : '✓ Aprobar RFC (CAB)'}
                </button>
                <button className="btn btn-danger" onClick={() => handleStatusChange('Rechazado')} disabled={saving} style={{ justifyContent: 'center' }}>
                  ✕ Rechazar
                </button>
              </div>
            )}
            {status === 'Aprobado' && user?.role !== 'usuario' && (
              <button className="btn btn-secondary" onClick={() => handleStatusChange('En Implementación')} disabled={saving} style={{ justifyContent: 'center' }}>
                ▶ Iniciar Implementación
              </button>
            )}
            {status === 'En Implementación' && (
              <button className="btn" style={{ background: 'var(--accent-green)', color: '#fff', justifyContent: 'center' }} onClick={() => handleStatusChange('Implementado')} disabled={saving}>
                ● Marcar Implementado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangesPage() {
  const { changes, users, createChange, updateChange, user } = useApp();
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'Normal', priority: 'Media', impact: 'Bajo', risk: 'Bajo', assignedTo: '', scheduledStart: '', scheduledEnd: '', rollbackPlan: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createChange({ ...form, assignedTo: form.assignedTo || null });
      setShowForm(false);
      setForm({ title: '', description: '', type: 'Normal', priority: 'Media', impact: 'Bajo', risk: 'Bajo', assignedTo: '', scheduledStart: '', scheduledEnd: '', rollbackPlan: '' });
    } finally { setSaving(false); }
  };

  const technicians = users.filter(u => u.role !== 'usuario');

  const stats = {
    total: changes.length,
    pendientes: changes.filter(c => c.status === 'En Revisión').length,
    aprobados: changes.filter(c => c.status === 'Aprobado').length,
    implementados: changes.filter(c => c.status === 'Implementado').length,
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1>Gestión de Cambios</h1><p>ITIL Change Management · CAB (Change Advisory Board)</p></div>
        {user?.role !== 'usuario' && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo RFC</button>}
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total RFCs', value: stats.total, color: 'var(--accent-blue)' },
          { label: 'En Revisión CAB', value: stats.pendientes, color: 'var(--accent-amber)' },
          { label: 'Aprobados', value: stats.aprobados, color: 'var(--accent-green)' },
          { label: 'Implementados', value: stats.implementados, color: 'var(--text-muted)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card stat-card" style={{ '--accent-color': color }}>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Título</th><th>Tipo</th><th>Prioridad</th><th>Impacto/Riesgo</th><th>Estado</th><th>Ventana de cambio</th><th>Asignado</th></tr></thead>
          <tbody>
            {changes.map(c => (
              <tr key={c.id} onClick={() => setSelected(c)}>
                <td><span className="mono" style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>{c.id}</span></td>
                <td style={{ maxWidth: 200 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.requester?.name || c.requestedBy}</div>
                </td>
                <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${TYPE_COLORS[c.type]}20`, color: TYPE_COLORS[c.type], border: `1px solid ${TYPE_COLORS[c.type]}40` }}>{c.type}</span></td>
                <td><span className={`badge priority-${(c.priority || 'media').toLowerCase()}`}>{c.priority}</span></td>
                <td style={{ fontSize: 12 }}>
                  <span style={{ color: IMPACT_COLORS[c.impact] }}>▲ {c.impact}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
                  <span style={{ color: IMPACT_COLORS[c.risk] }}>⚡ {c.risk}</span>
                </td>
                <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${STATUS_COLORS[c.status] || '#6b7280'}20`, color: STATUS_COLORS[c.status] || '#6b7280', border: `1px solid ${STATUS_COLORS[c.status] || '#6b7280'}40` }}>{c.status}</span></td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeFormat(c.scheduledStart)}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.assignee?.name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {changes.length === 0 && <div className="empty-state"><div style={{ fontSize: 32 }}>⟳</div><h3>Sin cambios registrados</h3><p>Crea el primer RFC</p></div>}
      </div>

      {selected && <ChangeModal change={selected} onClose={() => setSelected(null)} onUpdate={async (id, u) => { const c = await updateChange(id, u); setSelected(c); return c; }} />}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal modal-lg fade-in" style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 600 }}>Nuevo RFC — Request for Change</h3>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Título del Cambio *</label><input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Descripción y Justificación *</label><textarea className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 100 }} required /></div>
                <div className="form-group"><label>Tipo de Cambio</label><select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option>Normal</option><option>Estándar</option><option>Emergencia</option></select></div>
                <div className="form-group"><label>Prioridad</label><select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}><option>Crítica</option><option>Alta</option><option>Media</option><option>Baja</option></select></div>
                <div className="form-group"><label>Impacto</label><select className="form-control" value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))}><option>Alto</option><option>Medio</option><option>Bajo</option></select></div>
                <div className="form-group"><label>Riesgo</label><select className="form-control" value={form.risk} onChange={e => setForm(f => ({ ...f, risk: e.target.value }))}><option>Alto</option><option>Medio</option><option>Bajo</option></select></div>
                <div className="form-group"><label>Inicio Planificado</label><input type="datetime-local" className="form-control" value={form.scheduledStart} onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))} /></div>
                <div className="form-group"><label>Fin Planificado</label><input type="datetime-local" className="form-control" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))} /></div>
                <div className="form-group"><label>Técnico Asignado</label><select className="form-control" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}><option value="">Sin asignar</option>{technicians.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Plan de Rollback *</label><textarea className="form-control" placeholder="¿Cómo se revierte el cambio si falla?" value={form.rollbackPlan} onChange={e => setForm(f => ({ ...f, rollbackPlan: e.target.value }))} required /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enviando...' : 'Enviar al CAB'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
