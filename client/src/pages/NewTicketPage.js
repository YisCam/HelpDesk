import { useState } from 'react';
import { useApp } from '../context/AppContext';

const SLA_MAP = { 'Crítica': '1 hora', 'Alta': '4 horas', 'Media': '8 horas', 'Baja': '24 horas' };
const PRIORITY_COLORS = { Crítica: '#ef4444', Alta: '#f97316', Media: '#f59e0b', Baja: '#10b981' };

const CATEGORY_ICONS = { Hardware: '🖥', Software: '💾', Red: '🌐', Accesos: '🔑', Otro: '⚙' };

export default function NewTicketPage({ onNavigate }) {
  const { createTicket } = useApp();
  const [form, setForm] = useState({ title: '', description: '', category: 'Software', priority: 'Media' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const ticket = await createTicket(form);
      setSuccess(ticket);
    } finally { setSubmitting(false); }
  };

  if (success) return (
    <div className="fade-in" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Ticket Registrado</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Tu solicitud ha sido registrada exitosamente en el sistema ITIL.</p>

      <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)' }}>{success.id}</span>
          <span className={`badge priority-${success.priority.toLowerCase()}`}>{success.priority}</span>
        </div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{success.title}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>📂 {success.category}</span>
          <span>⏱ SLA: {SLA_MAP[success.priority]}</span>
          <span>📅 {new Date(success.slaDeadline).toLocaleString('es-PE')}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => onNavigate('tickets')}>Ver todos los tickets</button>
        <button className="btn btn-secondary" onClick={() => { setSuccess(null); setForm({ title: '', description: '', category: 'Software', priority: 'Media' }); }}>Crear otro</button>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Nuevo Ticket</h1>
          <p>Registra un incidente o solicitud de servicio</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-group">
              <label>Título del Incidente *</label>
              <input className="form-control" placeholder="Ej: Impresora no responde en área de ventas" value={form.title} onChange={e => set('title', e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Descripción Detallada *</label>
              <textarea className="form-control" placeholder="Describe el problema con el mayor detalle posible: ¿Qué ocurre? ¿Cuándo comenzó? ¿A cuántos usuarios afecta?" value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: 120 }} required />
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Categoría</label>
                <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                  {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Prioridad ITIL</label>
                <select className="form-control" value={form.priority} onChange={e => set('priority', e.target.value)} style={{ color: PRIORITY_COLORS[form.priority] }}>
                  {['Crítica', 'Alta', 'Media', 'Baja'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="divider" />

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting || !form.title.trim() || !form.description.trim()} style={{ flex: 1, justifyContent: 'center' }}>
                {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Registrando...</> : '◈ Registrar Ticket'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate('tickets')}>Cancelar</button>
            </div>
          </div>
        </form>

        {/* Panel ITIL info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>SLA Seleccionado</div>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: PRIORITY_COLORS[form.priority] }}>{SLA_MAP[form.priority]}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tiempo de resolución</div>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: 6, background: `${PRIORITY_COLORS[form.priority]}15`, border: `1px solid ${PRIORITY_COLORS[form.priority]}30` }}>
              <div style={{ fontSize: 12, color: PRIORITY_COLORS[form.priority], fontWeight: 600 }}>Prioridad: {form.priority}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {form.priority === 'Crítica' && 'Servicio caído, impacto en toda la empresa'}
                {form.priority === 'Alta' && 'Impacto significativo en operaciones'}
                {form.priority === 'Media' && 'Funcionalidad degradada, workaround disponible'}
                {form.priority === 'Baja' && 'Solicitud de servicio sin urgencia'}
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Ciclo ITIL</div>
            <div className="timeline" style={{ gap: 0 }}>
              {['Registro', 'Clasificación', 'Asignación', 'Diagnóstico', 'Resolución', 'Cierre'].map((step, i) => (
                <div key={step} style={{ display: 'flex', gap: 10, paddingBottom: 10, position: 'relative' }}>
                  {i < 5 && <div style={{ position: 'absolute', left: 10, top: 22, bottom: 0, width: 1, background: i === 0 ? 'var(--accent-blue)' : 'var(--border)' }} />}
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: i === 0 ? 'var(--accent-blue)' : 'var(--bg-elevated)', border: `2px solid ${i === 0 ? 'var(--accent-blue)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0, color: i === 0 ? '#fff' : 'var(--text-muted)' }}>
                    {i === 0 ? '●' : i + 1}
                  </div>
                  <div style={{ fontSize: 12, color: i === 0 ? 'var(--text-primary)' : 'var(--text-muted)', paddingTop: 2, fontWeight: i === 0 ? 600 : 400 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Tabla SLA Completa</div>
            {Object.entries(SLA_MAP).map(([p, t]) => (
              <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span className={`badge priority-${p.toLowerCase()}`}>{p}</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
