import { useState } from 'react';
import { useApp } from '../context/AppContext';

const PAGE_INFO = {
  dashboard: { title: 'Dashboard', sub: 'Resumen operativo del servicio TI' },
  tickets: { title: 'Gestión de Tickets', sub: 'Cola de incidentes y solicitudes ITIL' },
  'new-ticket': { title: 'Nuevo Ticket', sub: 'Registrar incidente o solicitud' },
  knowledge: { title: 'Base de Conocimiento', sub: 'Artículos y soluciones documentadas' },
  users: { title: 'Usuarios & Roles', sub: 'Administración de agentes' },
  reports: { title: 'Reportes SLA', sub: 'Métricas de cumplimiento ITIL' },
  changes: { title: 'Gestión de Cambios', sub: 'CAB · RFC · Ciclo de vida del cambio ITIL' },
  problems: { title: 'Gestión de Problemas', sub: 'Análisis de causa raíz · ITIL Problem Management' },
  assets: { title: 'Inventario de Assets', sub: 'CMDB · Configuration Management Database' },
  notifications: { title: 'Notificaciones', sub: 'Centro de alertas y actividad' },
};

const NOTIF_ICONS = { info: '◈', critical: '⚠', assignment: '→', resolved: '✓', comment: '💬' };
const NOTIF_COLORS = { info: 'var(--accent-blue)', critical: 'var(--accent-red)', assignment: 'var(--accent-purple)', resolved: 'var(--accent-green)', comment: 'var(--accent-cyan)' };

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function NotifPanel({ notifications, onClose, onMarkAll, onMarkOne, onNavigate }) {
  return (
    <div style={{ position: 'absolute', top: '100%', right: 0, width: 340, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden', animation: 'fadeIn 0.15s ease' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Notificaciones</span>
        <button onClick={onMarkAll} style={{ fontSize: 11, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>Marcar todas leídas</button>
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>🔔 Sin notificaciones</div>
        ) : notifications.slice(0, 15).map(n => (
          <div key={n.id} onClick={() => { onMarkOne(n.id); if (n.link) onNavigate('tickets'); onClose(); }}
            style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(59,130,246,0.04)', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'background 0.1s' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${NOTIF_COLORS[n.type] || 'var(--accent-blue)'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, color: NOTIF_COLORS[n.type] }}>
              {NOTIF_ICONS[n.type] || '●'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: n.read ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1.4 }}>{n.message}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
            </div>
            {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0, marginTop: 4 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Header({ activePage, onNavigate }) {
  const { metrics, notifications, unreadCount, markAllNotifRead, markNotifRead } = useApp();
  const [showNotif, setShowNotif] = useState(false);
  const info = PAGE_INFO[activePage] || { title: activePage, sub: '' };

  return (
    <header style={{ height: 'var(--header-height)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{info.title}</h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{info.sub}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* SLA indicator */}
        {metrics && (
          <div style={{ display: 'flex', gap: 10, padding: '5px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {[
              { label: 'SLA', value: `${metrics.slaCompliance}%`, color: metrics.slaCompliance >= 90 ? 'var(--accent-green)' : metrics.slaCompliance >= 70 ? 'var(--accent-amber)' : 'var(--accent-red)' },
              { label: 'Abiertos', value: metrics.openTickets, color: 'var(--accent-blue)' },
              { label: 'Críticos', value: metrics.criticalOpen, color: metrics.criticalOpen > 0 ? 'var(--accent-red)' : 'var(--text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Notif bell */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotif(v => !v)}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, position: 'relative', color: 'var(--text-secondary)' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, background: 'var(--accent-red)', borderRadius: '50%', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-surface)' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          {showNotif && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowNotif(false)} />
              <NotifPanel notifications={notifications} onClose={() => setShowNotif(false)} onMarkAll={markAllNotifRead} onMarkOne={markNotifRead} onNavigate={onNavigate} />
            </>
          )}
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => onNavigate('new-ticket')}>+ Ticket</button>
      </div>
    </header>
  );
}
