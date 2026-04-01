import { useState } from 'react';
import { useApp } from '../context/AppContext';

// ─── GESTIÓN DE PROBLEMAS ─────────────────────────────────────────────────────

const PRB_STATUS_COLORS = { 'En Investigación': '#f59e0b', 'Causa Raíz Identificada': '#8b5cf6', 'Solución Conocida': '#06b6d4', Resuelto: '#10b981', Cerrado: '#6b7280' };

function ProblemModal({ problem, onClose, onUpdate }) {
  const { user, tickets } = useApp();
  const [form, setForm] = useState({ rootCause: problem.rootCause || '', workaround: problem.workaround || '', solution: problem.solution || '', status: problem.status });
  const [saving, setSaving] = useState(false);

  const relatedTickets = tickets.filter(t => (problem.relatedTickets || []).includes(t.id));

  const handleSave = async () => {
    setSaving(true);
    try { await onUpdate(problem.id, form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600 }}>{problem.id}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${PRB_STATUS_COLORS[problem.status]}20`, color: PRB_STATUS_COLORS[problem.status], border: `1px solid ${PRB_STATUS_COLORS[problem.status]}40` }}>{problem.status}</span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>{problem.title}</h3>
          </div>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20 }}>
          <div>
            <div className="form-group"><label>Descripción</label><div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{problem.description}</div></div>
            <div className="form-group"><label>Causa Raíz (Root Cause Analysis)</label><textarea className="form-control" placeholder="Documenta la causa raíz identificada..." value={form.rootCause} onChange={e => setForm(f => ({ ...f, rootCause: e.target.value }))} style={{ minHeight: 80 }} /></div>
            <div className="form-group"><label>Workaround (Solución Temporal)</label><textarea className="form-control" placeholder="Pasos para mitigar el problema temporalmente..." value={form.workaround} onChange={e => setForm(f => ({ ...f, workaround: e.target.value }))} style={{ minHeight: 70 }} /></div>
            <div className="form-group"><label>Solución Definitiva</label><textarea className="form-control" placeholder="Solución permanente para cerrar el problema..." value={form.solution} onChange={e => setForm(f => ({ ...f, solution: e.target.value }))} style={{ minHeight: 70 }} /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Análisis'}</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card-elevated">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Estado RCA</div>
              <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.keys(PRB_STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {relatedTickets.length > 0 && (
              <div className="card-elevated">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Tickets Relacionados</div>
                {relatedTickets.map(t => (
                  <div key={t.id} style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--accent-blue)' }}>{t.id}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.title}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="card-elevated">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Historial</div>
              {[...(problem.history || [])].reverse().slice(0, 4).map((h, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid var(--border)' }}>
                  {h.action}<br /><span style={{ fontSize: 10 }}>{new Date(h.timestamp).toLocaleDateString('es-PE')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProblemsPage() {
  const { problems, users, createProblem, updateProblem, user, tickets } = useApp();
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'Media', assignedTo: '', relatedTickets: [] });

  const technicians = users.filter(u => u.role !== 'usuario');

  const handleCreate = async (e) => {
    e.preventDefault();
    await createProblem({ ...form, assignedTo: form.assignedTo || null });
    setShowForm(false);
    setForm({ title: '', description: '', priority: 'Media', assignedTo: '', relatedTickets: [] });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1>Gestión de Problemas</h1><p>ITIL Problem Management · Análisis de Causa Raíz (RCA)</p></div>
        {user?.role !== 'usuario' && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Problema</button>}
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {Object.entries(PRB_STATUS_COLORS).map(([s, c]) => {
          const count = problems.filter(p => p.status === s).length;
          return count > 0 ? (
            <div key={s} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <div style={{ width: 8, borderRadius: 4, height: 36, background: c }} />
              <div><div style={{ fontSize: 20, fontWeight: 700, color: c }}>{count}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s}</div></div>
            </div>
          ) : null;
        }).filter(Boolean)}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Título</th><th>Estado RCA</th><th>Prioridad</th><th>Asignado</th><th>Tickets Rel.</th><th>Workaround</th></tr></thead>
          <tbody>
            {problems.map(p => (
              <tr key={p.id} onClick={() => setSelected(p)}>
                <td><span className="mono" style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600 }}>{p.id}</span></td>
                <td style={{ maxWidth: 220 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                </td>
                <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${PRB_STATUS_COLORS[p.status]}15`, color: PRB_STATUS_COLORS[p.status], border: `1px solid ${PRB_STATUS_COLORS[p.status]}30` }}>{p.status}</span></td>
                <td><span className={`badge priority-${(p.priority || 'media').toLowerCase()}`}>{p.priority}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.assignee?.name || users.find(u => u.id === p.assignedTo)?.name || '—'}</td>
                <td style={{ fontSize: 12 }}>
                  {(p.relatedTickets || []).map(id => <span key={id} className="mono" style={{ fontSize: 10, color: 'var(--accent-blue)', marginRight: 4 }}>{id}</span>)}
                </td>
                <td style={{ fontSize: 11, color: p.workaround ? 'var(--accent-green)' : 'var(--text-muted)' }}>{p.workaround ? '✓ Disponible' : '— Sin workaround'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {problems.length === 0 && <div className="empty-state"><div style={{ fontSize: 32 }}>◐</div><h3>Sin problemas registrados</h3></div>}
      </div>

      {selected && <ProblemModal problem={selected} onClose={() => setSelected(null)} onUpdate={updateProblem} />}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal modal-md fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3 style={{ fontWeight: 600 }}>Registrar Problema</h3><button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowForm(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Título *</label><input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div className="form-group"><label>Descripción / Síntomas observados</label><textarea className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 90 }} /></div>
              <div className="grid-2">
                <div className="form-group"><label>Prioridad</label><select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}><option>Crítica</option><option>Alta</option><option>Media</option><option>Baja</option></select></div>
                <div className="form-group"><label>Asignar a</label><select className="form-control" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}><option value="">Sin asignar</option>{technicians.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Registrar Problema</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INVENTARIO DE ASSETS ─────────────────────────────────────────────────────

const ASSET_STATUS_COLORS = { Operativo: '#10b981', Degradado: '#f59e0b', 'En Falla': '#ef4444', Crítico: '#ef4444', 'En Mantenimiento': '#8b5cf6', 'Dado de Baja': '#6b7280' };
const ASSET_TYPE_ICONS = { Servidor: '🖥', Red: '🌐', Workstation: '💻', Impresora: '🖨', Almacenamiento: '💾', Otro: '⚙' };

export function AssetsPage() {
  const { assets, users, createAsset, updateAsset } = useApp();
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editStatus, setEditStatus] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'Workstation', status: 'Operativo', ip: '', location: '', assignedTo: '', purchaseDate: '', warrantyEnd: '', notes: '' });

  const handleCreate = async (e) => {
    e.preventDefault();
    await createAsset({ ...form, assignedTo: form.assignedTo || null });
    setShowForm(false);
    setForm({ name: '', type: 'Workstation', status: 'Operativo', ip: '', location: '', assignedTo: '', purchaseDate: '', warrantyEnd: '', notes: '' });
  };

  const byStatus = {};
  assets.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  const criticalAssets = assets.filter(a => a.status === 'En Falla' || a.status === 'Crítico');

  const isWarrantyExpired = (date) => date && new Date(date) < new Date();
  const isWarrantySoon = (date) => date && !isWarrantyExpired(date) && (new Date(date) - new Date()) < 90 * 86400000;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1>Inventario de Assets</h1><p>CMDB · Configuration Management Database · {assets.length} activos registrados</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Asset</button>
      </div>

      {criticalAssets.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <div style={{ fontSize: 13 }}>
            <strong style={{ color: 'var(--accent-red)' }}>{criticalAssets.length} asset{criticalAssets.length > 1 ? 's' : ''} con falla: </strong>
            <span style={{ color: 'var(--text-secondary)' }}>{criticalAssets.map(a => a.name).join(', ')}</span>
          </div>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card stat-card" style={{ '--accent-color': 'var(--accent-blue)' }}><div className="stat-label">Total Assets</div><div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{assets.length}</div></div>
        <div className="card stat-card" style={{ '--accent-color': 'var(--accent-green)' }}><div className="stat-label">Operativos</div><div className="stat-value" style={{ color: 'var(--accent-green)' }}>{byStatus['Operativo'] || 0}</div></div>
        <div className="card stat-card" style={{ '--accent-color': 'var(--accent-red)' }}><div className="stat-label">En Falla</div><div className="stat-value" style={{ color: 'var(--accent-red)' }}>{(byStatus['En Falla'] || 0) + (byStatus['Crítico'] || 0)}</div></div>
        <div className="card stat-card" style={{ '--accent-color': 'var(--accent-amber)' }}><div className="stat-label">Garantía por vencer</div><div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{assets.filter(a => isWarrantySoon(a.warrantyEnd)).length}</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Asset</th><th>Tipo</th><th>Estado</th><th>IP</th><th>Ubicación</th><th>Asignado</th><th>Garantía</th></tr></thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} onClick={() => setSelected(a)}>
                <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.id}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{ASSET_TYPE_ICONS[a.type] || '⚙'}</span>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</div>
                      {a.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.notes}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.type}</td>
                <td>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${ASSET_STATUS_COLORS[a.status] || '#6b7280'}15`, color: ASSET_STATUS_COLORS[a.status] || '#6b7280', border: `1px solid ${ASSET_STATUS_COLORS[a.status] || '#6b7280'}30` }}>
                    {a.status === 'Operativo' ? '● ' : a.status === 'En Falla' || a.status === 'Crítico' ? '⚠ ' : '◐ '}{a.status}
                  </span>
                </td>
                <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ip || '—'}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.location || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.assignee?.name || (a.assignedTo ? users.find(u => u.id === a.assignedTo)?.name : null) || '—'}</td>
                <td>
                  {a.warrantyEnd ? (
                    <span style={{ fontSize: 11, fontWeight: 500, color: isWarrantyExpired(a.warrantyEnd) ? 'var(--accent-red)' : isWarrantySoon(a.warrantyEnd) ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                      {isWarrantyExpired(a.warrantyEnd) ? '⚠ Vencida' : isWarrantySoon(a.warrantyEnd) ? '⏱ Pronto vence' : '✓ ' + new Date(a.warrantyEnd).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Asset detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal modal-md fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{ASSET_TYPE_ICONS[selected.type] || '⚙'}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selected.id}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${ASSET_STATUS_COLORS[selected.status]}15`, color: ASSET_STATUS_COLORS[selected.status] }}>{selected.status}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{selected.name}</h3>
              </div>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="grid-2">
              {[['IP', selected.ip], ['Tipo', selected.type], ['Ubicación', selected.location], ['Asignado', selected.assignee?.name || '—'], ['Compra', selected.purchaseDate ? new Date(selected.purchaseDate).toLocaleDateString('es-PE') : '—'], ['Garantía hasta', selected.warrantyEnd ? new Date(selected.warrantyEnd).toLocaleDateString('es-PE') : '—']].map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{v || '—'}</div>
                </div>
              ))}
            </div>

            {selected.notes && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Notas</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selected.notes}</div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>CAMBIAR ESTADO</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(ASSET_STATUS_COLORS).map(s => (
                  <button key={s} onClick={async () => { await updateAsset(selected.id, { status: s }); setSelected({ ...selected, status: s }); }}
                    style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${ASSET_STATUS_COLORS[s]}40`, background: selected.status === s ? ASSET_STATUS_COLORS[s] : 'transparent', color: selected.status === s ? '#fff' : ASSET_STATUS_COLORS[s], cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal modal-md fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3 style={{ fontWeight: 600 }}>Registrar Asset en CMDB</h3><button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowForm(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Nombre del Asset *</label><input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <div className="form-group"><label>Tipo</label><select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{Object.keys(ASSET_TYPE_ICONS).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="form-group"><label>Estado Inicial</label><select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{Object.keys(ASSET_STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="form-group"><label>Dirección IP</label><input className="form-control" placeholder="192.168.1.x" value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))} /></div>
                <div className="form-group"><label>Ubicación</label><input className="form-control" placeholder="Ej: Sala Servidores" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                <div className="form-group"><label>Fecha de Compra</label><input type="date" className="form-control" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
                <div className="form-group"><label>Fin de Garantía</label><input type="date" className="form-control" value={form.warrantyEnd} onChange={e => setForm(f => ({ ...f, warrantyEnd: e.target.value }))} /></div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Notas / Especificaciones</label><textarea className="form-control" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Registrar en CMDB</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
