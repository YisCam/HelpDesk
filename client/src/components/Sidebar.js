import { useApp } from '../context/AppContext';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬡', roles: ['admin', 'tecnico', 'usuario'] },
  { id: 'tickets', label: 'Tickets', icon: '◈', roles: ['admin', 'tecnico', 'usuario'], badge: 'openTickets' },
  { id: 'new-ticket', label: 'Nuevo Ticket', icon: '+', roles: ['admin', 'tecnico', 'usuario'], highlight: true },
  { divider: true, label: 'ITIL AVANZADO', roles: ['admin', 'tecnico'] },
  { id: 'changes', label: 'Gestión de Cambios', icon: '⟳', roles: ['admin', 'tecnico'] },
  { id: 'problems', label: 'Gestión de Problemas', icon: '◐', roles: ['admin', 'tecnico'] },
  { id: 'assets', label: 'Inventario Assets', icon: '▣', roles: ['admin', 'tecnico'] },
  { divider: true, label: 'SOPORTE', roles: ['admin', 'tecnico', 'usuario'] },
  { id: 'knowledge', label: 'Base de Conocimiento', icon: '◉', roles: ['admin', 'tecnico', 'usuario'] },
  { id: 'reports', label: 'Reportes SLA', icon: '◎', roles: ['admin', 'tecnico'] },
  { id: 'users', label: 'Usuarios', icon: '⊛', roles: ['admin'] },
];

const ROLE_LABELS = { admin: 'Administrador', tecnico: 'Técnico TI', usuario: 'Usuario Final' };
const ROLE_COLORS = { admin: '#ef4444', tecnico: '#3b82f6', usuario: '#10b981' };

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout, metrics, unreadCount } = useApp();

  return (
    <aside style={{
      width: 'var(--sidebar-width)', position: 'fixed', top: 0, left: 0,
      height: '100vh', background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>H</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>HelpDesk ITIL</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mesa de Ayuda TI</div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {metrics && (metrics.criticalOpen > 0 || metrics.unassigned > 0) && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {metrics.criticalOpen > 0 && (
            <div onClick={() => onNavigate('tickets')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
              <div className="dot dot-red" /><span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{metrics.criticalOpen} crítico{metrics.criticalOpen > 1 ? 's' : ''} activo{metrics.criticalOpen > 1 ? 's' : ''}</span>
            </div>
          )}
          {metrics.unassigned > 0 && (
            <div onClick={() => onNavigate('tickets')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer' }}>
              <div className="dot" style={{ background: '#f59e0b' }} /><span style={{ fontSize: 11, color: '#f59e0b' }}>{metrics.unassigned} sin asignar</span>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV.filter(item => !item.roles || item.roles.includes(user?.role)).map((item, i) => {
          if (item.divider) return (
            <div key={i} style={{ padding: '12px 8px 4px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{item.label}</div>
          );
          const isActive = activePage === item.id;
          const badgeCount = item.badge === 'openTickets' ? metrics?.openTickets : null;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.12s',
              background: item.highlight ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.08))' : isActive ? 'var(--bg-elevated)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : item.highlight ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: isActive || item.highlight ? 600 : 400, fontSize: 13,
              borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
            }}>
              <span style={{ fontSize: 14, width: 16, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badgeCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent-blue)', color: '#fff', borderRadius: 10, padding: '1px 5px', minWidth: 18, textAlign: 'center' }}>{badgeCount}</span>}
            </button>
          );
        })}
      </nav>

      {/* User profile */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {unreadCount > 0 && (
          <div onClick={() => onNavigate('notifications')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, marginBottom: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer' }}>
            <span style={{ fontSize: 13 }}>🔔</span>
            <span style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>{unreadCount} notificación{unreadCount > 1 ? 'es' : ''}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
          <div className="avatar" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[user?.role]}, ${ROLE_COLORS[user?.role]}88)`, color: '#fff', fontSize: 11 }}>{user?.avatar}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: ROLE_COLORS[user?.role], fontWeight: 600 }}>{ROLE_LABELS[user?.role]}</div>
          </div>
          <button onClick={logout} className="btn btn-icon btn-secondary" style={{ padding: '4px', fontSize: 12 }} title="Salir">⏻</button>
        </div>
      </div>
    </aside>
  );
}
