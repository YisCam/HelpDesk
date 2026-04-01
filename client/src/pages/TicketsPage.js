import { useState, useEffect, useRef } from 'react';
import { useApp, api } from '../context/AppContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return 'ahora mismo';
  if (d < 3600) return `hace ${Math.floor(d / 60)}m`;
  if (d < 86400) return `hace ${Math.floor(d / 3600)}h`;
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function timeLeft(iso) {
  const d = new Date(iso) - Date.now();
  if (d < 0) return { label: 'Vencido', color: 'var(--accent-red)' };
  const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000);
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const color = d < 3600000 ? 'var(--accent-red)' : d < 7200000 ? 'var(--accent-amber)' : 'var(--accent-green)';
  return { label, color };
}

const PRIORITY_ORDER = { Crítica: 0, Alta: 1, Media: 2, Baja: 3 };

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}
          onClick={() => !readonly && onChange && onChange(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{ fontSize: 22, cursor: readonly ? 'default' : 'pointer', color: n <= (hover || value || 0) ? '#f59e0b' : 'var(--border-light)', transition: 'color 0.1s' }}>
          ★
        </span>
      ))}
    </div>
  );
}

// ─── Ticket Detail Modal (full ITIL lifecycle) ─────────────────────────────────
function TicketModal({ ticketId, onClose, onUpdate }) {
  const { user, users, addComment, rateTicket } = useApp();
  const [ticket, setTicket] = useState(null);
  const [tab, setTab] = useState('detalles');
  const [comment, setComment] = useState('');
  const [resolution, setResolution] = useState('');
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(null);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    api.get(`/tickets/${ticketId}`).then(t => {
      setTicket(t);
      setResolution(t.resolution || '');
      setRating(t.satisfactionScore);
    });
  }, [ticketId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.commentsEnriched]);

  const reload = async () => {
    const fresh = await api.get(`/tickets/${ticketId}`);
    setTicket(fresh);
  };

  const handleUpdate = async (updates) => {
    const updated = await onUpdate(ticketId, updates);
    setTicket(updated);
    return updated;
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await addComment(ticketId, comment);
      setComment('');
      await reload();
    } finally { setSending(false); }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) return;
    setSending(true);
    try {
      await handleUpdate({ status: 'Resuelto', resolution });
    } finally { setSending(false); }
  };

  const handleRate = async (score) => {
    setRating(score);
    await rateTicket(ticketId, score);
  };

  const technicians = users.filter(u => u.role !== 'usuario');

  if (!ticket) return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div className="spinner" />
      </div>
    </div>
  );

  const sla = timeLeft(ticket.slaDeadline);
  const isResolved = ['Resuelto', 'Cerrado'].includes(ticket.status);
  const canEdit = user?.role === 'admin' || user?.role === 'tecnico';
  const isOwner = ticket.createdBy === user?.id;

  const TABS = [
    { id: 'detalles', label: 'Detalles' },
    { id: 'comentarios', label: `Comentarios (${ticket.commentsEnriched?.length || 0})` },
    { id: 'resolucion', label: 'Resolución', badge: isResolved },
    { id: 'historial', label: 'Historial' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg fade-in" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Modal Header */}
        <div style={{ flexShrink: 0, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 700 }}>{ticket.id}</span>
                <span className={`badge priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                <span className={`badge status-${ticket.status.toLowerCase().replace(/\s/g, '-')}`}>{ticket.status}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, color: sla.color, background: `${sla.color}15`, border: `1px solid ${sla.color}30` }}>
                  {isResolved ? '✓ SLA OK' : `⏱ ${sla.label}`}
                </span>
                {ticket.satisfactionScore && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    ★ {ticket.satisfactionScore}/5
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{ticket.title}</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>👤 {ticket.requester?.name || ticket.createdBy}</span>
                <span>📂 {ticket.category}</span>
                <span>🕐 {timeAgo(ticket.createdAt)}</span>
                {ticket.assignee && <span>🔧 {ticket.assignee.name}</span>}
              </div>
            </div>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginTop: 14, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '7px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                borderBottom: tab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.12s', position: 'relative',
              }}>
                {t.label}
                {t.badge && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>

          {/* ── DETALLES ── */}
          {tab === 'detalles' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 20 }}>
              <div>
                <div className="form-group">
                  <label>Descripción del Incidente</label>
                  <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {ticket.description}
                  </div>
                </div>

                {ticket.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {ticket.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>#{tag}</span>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Acciones ITIL</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'].map(s => (
                        <button key={s} onClick={() => handleUpdate({ status: s })}
                          className={`btn btn-sm ${ticket.status === s ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ minWidth: 100, justifyContent: 'center' }}>
                          {s === 'Abierto' ? '○' : s === 'En Progreso' ? '◑' : s === 'Resuelto' ? '●' : '✕'} {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Asignación */}
                <div className="card-elevated">
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Asignación</div>
                  {canEdit ? (
                    <select className="form-control" value={ticket.assignedTo || ''}
                      onChange={e => handleUpdate({ assignedTo: e.target.value || null, status: e.target.value && ticket.status === 'Abierto' ? 'En Progreso' : ticket.status })}>
                      <option value="">— Sin asignar —</option>
                      {technicians.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'Admin' : 'Técnico'})</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: ticket.assignee ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: ticket.assignee ? 500 : 400 }}>
                      {ticket.assignee ? `🔧 ${ticket.assignee.name}` : 'Sin asignar'}
                    </div>
                  )}
                </div>

                {/* Prioridad editable */}
                {canEdit && (
                  <div className="card-elevated">
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Prioridad</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {['Crítica', 'Alta', 'Media', 'Baja'].map(p => (
                        <button key={p} onClick={() => handleUpdate({ priority: p })}
                          className={`btn btn-sm priority-${p.toLowerCase()}`}
                          style={{ justifyContent: 'center', border: ticket.priority === p ? `2px solid currentColor` : '1px solid currentColor', opacity: ticket.priority === p ? 1 : 0.5 }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SLA Info */}
                <div className="card-elevated">
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>SLA & Plazos</div>
                  {[
                    ['Categoría', ticket.category],
                    ['Deadline', new Date(ticket.slaDeadline).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })],
                    ['Tiempo restante', sla.label],
                    ['Actualizado', timeAgo(ticket.updatedAt)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span style={{ color: k === 'Tiempo restante' ? sla.color : 'var(--text-secondary)', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* CSAT for owner */}
                {isOwner && isResolved && (
                  <div className="card-elevated">
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Califica el Servicio</div>
                    <StarRating value={rating} onChange={handleRate} readonly={!!rating} />
                    {rating && <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 8 }}>✓ ¡Gracias por tu calificación!</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── COMENTARIOS ── */}
          {tab === 'comentarios' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, minHeight: 200 }}>
                {!ticket.commentsEnriched?.length && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <div>Sin comentarios aún. Sé el primero en responder.</div>
                  </div>
                )}
                {ticket.commentsEnriched?.map(c => {
                  const isMine = c.authorId === user?.id;
                  return (
                    <div key={c.id} style={{ display: 'flex', gap: 10, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      {!isMine && (
                        <div className="avatar" style={{ background: `linear-gradient(135deg, #3b82f6, #8b5cf6)`, color: '#fff', fontSize: 10, flexShrink: 0 }}>
                          {c.author?.avatar || '?'}
                        </div>
                      )}
                      <div style={{ maxWidth: '72%' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: isMine ? 'var(--accent-blue)' : 'var(--accent-cyan)' }}>
                            {isMine ? 'Tú' : (c.author?.name || c.authorId)}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
                        </div>
                        <div style={{
                          padding: '10px 14px', borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          background: isMine ? 'rgba(59,130,246,0.15)' : 'var(--bg-elevated)',
                          border: `1px solid ${isMine ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5
                        }}>
                          {c.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea className="form-control" placeholder="Escribe un comentario o nota de resolución..."
                  value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleComment(); }}
                  style={{ flex: 1, minHeight: 72, resize: 'none' }} />
                <button className="btn btn-primary" onClick={handleComment} disabled={!comment.trim() || sending}
                  style={{ alignSelf: 'flex-end', padding: '10px 16px' }}>
                  {sending ? '⏳' : '↑ Enviar'}
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Ctrl+Enter para enviar</div>
            </div>
          )}

          {/* ── RESOLUCIÓN ── */}
          {tab === 'resolucion' && (
            <div>
              {isResolved && ticket.resolution && (
                <div style={{ padding: '14px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>✓ Solución Documentada</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.resolution}</div>
                </div>
              )}

              {canEdit && (
                <div>
                  <div className="form-group">
                    <label>Documentar Resolución</label>
                    <textarea className="form-control" placeholder="Describe la solución aplicada, pasos realizados, root cause identificado..."
                      value={resolution} onChange={e => setResolution(e.target.value)}
                      style={{ minHeight: 140 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary" onClick={handleResolve} disabled={!resolution.trim() || sending || isResolved}
                      style={{ justifyContent: 'center' }}>
                      {sending ? 'Guardando...' : isResolved ? '✓ Ya resuelto' : '● Resolver y documentar'}
                    </button>
                    {canEdit && resolution && !isResolved && (
                      <button className="btn btn-secondary" onClick={() => handleUpdate({ resolution })} disabled={sending}>
                        Guardar borrador
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    💡 <strong style={{ color: 'var(--text-secondary)' }}>Buena práctica ITIL:</strong> Una resolución bien documentada enriquece la Base de Conocimiento y reduce el tiempo de resolución de incidentes futuros similares.
                  </div>
                </div>
              )}

              {isOwner && isResolved && (
                <div style={{ marginTop: 20, padding: '16px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>¿Quedaste satisfecho con la resolución?</div>
                  <StarRating value={rating} onChange={handleRate} readonly={!!rating} />
                  {rating && <div style={{ fontSize: 12, color: 'var(--accent-green)', marginTop: 8 }}>✓ Calificación registrada ({rating}/5)</div>}
                </div>
              )}
            </div>
          )}

          {/* ── HISTORIAL ── */}
          {tab === 'historial' && (
            <div>
              <div className="timeline" style={{ paddingRight: 8 }}>
                {[...(ticket.historyEnriched || ticket.history || [])].reverse().map((h, i) => {
                  const u = h.user || users.find(x => x.id === h.userId);
                  return (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot" style={{
                        background: i === 0 ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                        border: `2px solid ${i === 0 ? 'var(--accent-blue)' : 'var(--border-light)'}`,
                        color: i === 0 ? '#fff' : 'var(--text-muted)', fontSize: 9
                      }}>
                        {i === 0 ? '●' : String(([...(ticket.historyEnriched || ticket.history || [])].length) - i)}
                      </div>
                      <div className="timeline-content">
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: i === 0 ? 600 : 400 }}>{h.action}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {u?.name || h.userId || 'sistema'} · {timeAgo(h.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { id: 'Abierto', label: 'Abierto', color: 'var(--accent-blue)', icon: '○' },
  { id: 'En Progreso', label: 'En Progreso', color: 'var(--accent-purple)', icon: '◑' },
  { id: 'Resuelto', label: 'Resuelto', color: 'var(--accent-green)', icon: '●' },
  { id: 'Cerrado', label: 'Cerrado', color: 'var(--text-muted)', icon: '✕' },
];

function KanbanView({ tickets, onSelect, onUpdate }) {
  const byStatus = {};
  KANBAN_COLS.forEach(c => { byStatus[c.id] = []; });
  tickets.forEach(t => { if (byStatus[t.status]) byStatus[t.status].push(t); });

  const handleDrop = (e, targetStatus) => {
    const id = e.dataTransfer.getData('ticketId');
    if (id) onUpdate(id, { status: targetStatus });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, height: 'calc(100vh - 230px)', overflowX: 'auto' }}>
      {KANBAN_COLS.map(col => (
        <div key={col.id}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, col.id)}
          style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 220 }}>
          {/* Column header */}
          <div style={{ padding: '10px 14px', borderRadius: '8px 8px 0 0', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `2px solid ${col.color}`, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: col.color, fontSize: 14 }}>{col.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{col.label}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: `${col.color}20`, color: col.color, borderRadius: 10, padding: '1px 7px', border: `1px solid ${col.color}40` }}>
              {byStatus[col.id].length}
            </span>
          </div>

          {/* Cards */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 4px', background: 'rgba(0,0,0,0.1)', borderRadius: '0 0 8px 8px', border: '1px solid var(--border)', borderTop: 'none' }}>
            {byStatus[col.id].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)).map(t => {
              const sla = timeLeft(t.slaDeadline);
              return (
                <div key={t.id}
                  draggable onDragStart={e => e.dataTransfer.setData('ticketId', t.id)}
                  onClick={() => onSelect(t.id)}
                  style={{ background: 'var(--bg-surface)', border: `1px solid var(--border)`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.12s', borderLeft: `3px solid ${col.color}` }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 600 }}>{t.id}</span>
                    <span className={`badge priority-${t.priority.toLowerCase()}`} style={{ fontSize: 9 }}>{t.priority}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, marginBottom: 8, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.category}</span>
                    {!['Resuelto', 'Cerrado'].includes(t.status) && (
                      <span style={{ fontSize: 10, color: sla.color, fontWeight: 600 }}>⏱ {sla.label}</span>
                    )}
                  </div>
                  {t.assignee && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>
                        {t.assignee.avatar}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.assignee.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {byStatus[col.id].length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: 12, opacity: 0.5 }}>
                Sin tickets
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Tickets Page ────────────────────────────────────────────────────────
export default function TicketsPage() {
  const { tickets, loading, fetchTickets, updateTicket, metrics } = useApp();
  const [selectedId, setSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState('tabla'); // 'tabla' | 'kanban'
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', search: '' });

  useEffect(() => {
    if (viewMode === 'tabla') fetchTickets(filters);
    else fetchTickets();
  }, [filters, viewMode]);

  const STATUSES   = ['', 'Abierto', 'En Progreso', 'Resuelto', 'Cerrado'];
  const PRIORITIES = ['', 'Crítica', 'Alta', 'Media', 'Baja'];
  const CATEGORIES = ['', 'Hardware', 'Software', 'Red', 'Accesos', 'Otro'];

  const quickStats = [
    { label: 'Sin asignar', value: tickets.filter(t => !t.assignedTo && !['Resuelto','Cerrado'].includes(t.status)).length, color: 'var(--accent-amber)' },
    { label: 'SLA vencido', value: tickets.filter(t => t.slaStatus === 'vencido').length, color: 'var(--accent-red)' },
    { label: 'En riesgo', value: tickets.filter(t => t.slaStatus === 'en_riesgo').length, color: 'var(--accent-orange)' },
    { label: 'Resueltos hoy', value: tickets.filter(t => t.status === 'Resuelto' && (Date.now() - new Date(t.updatedAt)) < 86400000).length, color: 'var(--accent-green)' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Gestión de Tickets</h1>
          <p>{tickets.length} tickets · Ordenados por prioridad ITIL</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {[['tabla', '☰ Lista'], ['kanban', '⊞ Kanban']].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: viewMode === mode ? 'var(--accent-blue)' : 'var(--bg-elevated)', color: viewMode === mode ? '#fff' : 'var(--text-secondary)', transition: 'all 0.12s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {quickStats.map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: `1px solid ${color}30` }}>
            <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {viewMode === 'kanban' ? (
        <KanbanView tickets={tickets} onSelect={id => setSelectedId(id)} onUpdate={updateTicket} />
      ) : (
        <>
          {/* Filters */}
          <div className="card" style={{ marginBottom: 14, padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(3, 1fr) auto', gap: 10, alignItems: 'end' }}>
              <div className="search-input-wrapper">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" /></svg>
                <input className="form-control" placeholder="Buscar por ID, título, descripción..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
              </div>
              <select className="form-control" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s || 'Todos los estados'}</option>)}
              </select>
              <select className="form-control" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p || 'Todas las prioridades'}</option>)}
              </select>
              <select className="form-control" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c || 'Todas las categorías'}</option>)}
              </select>
              {(filters.status || filters.priority || filters.category || filters.search) && (
                <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ status: '', priority: '', category: '', search: '' })}>✕ Limpiar</button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div className="loading"><div className="spinner" /> Cargando tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="empty-state"><div style={{ fontSize: 36 }}>◈</div><h3>Sin tickets</h3><p>Ningún ticket coincide con los filtros aplicados</p></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Título</th><th>Categoría</th><th>Prioridad</th><th>Estado</th><th>SLA</th><th>Asignado</th><th>Creado</th></tr>
                </thead>
                <tbody>
                  {tickets.map(t => {
                    const sla = timeLeft(t.slaDeadline);
                    const isResolved = ['Resuelto', 'Cerrado'].includes(t.status);
                    return (
                      <tr key={t.id} onClick={() => setSelectedId(t.id)}>
                        <td><span className="mono" style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 700 }}>{t.id}</span></td>
                        <td style={{ maxWidth: 210 }}>
                          <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.requester?.name || t.createdBy}</div>
                        </td>
                        <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{t.category}</span></td>
                        <td><span className={`badge priority-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                        <td><span className={`badge status-${t.status.toLowerCase().replace(/\s/g, '-')}`}>{t.status}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: isResolved ? 'var(--accent-green)' : sla.color }}>
                            {isResolved ? '✓ OK' : `⏱ ${sla.label}`}
                          </span>
                        </td>
                        <td>
                          {t.assignee ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700, flexShrink: 0 }}>{t.assignee.avatar}</div>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.assignee.name.split(' ')[0]}</span>
                            </div>
                          ) : <span style={{ fontSize: 11, color: 'var(--accent-amber)' }}>⚡ Sin asignar</span>}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(t.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {selectedId && (
        <TicketModal
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={updateTicket}
        />
      )}
    </div>
  );
}
