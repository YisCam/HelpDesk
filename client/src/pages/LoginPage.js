import { useState } from 'react';
import { useApp } from '../context/AppContext';

// Usuarios demo con su contraseña real
const DEMO_USERS = [
  { label: 'Admin TI',  username: 'admin',        password: 'password', role: 'admin',   color: '#ef4444' },
  { label: 'Técnico',   username: 'carlos.lopez',  password: 'password', role: 'tecnico', color: '#3b82f6' },
  { label: 'Usuario',   username: 'maria.flores',  password: 'password', role: 'usuario', color: '#10b981' },
];

export default function LoginPage() {
  const { login } = useApp();

  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [activeDemo,  setActiveDemo]  = useState(null);

  // Login con los datos del formulario
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('Ingresa tu nombre de usuario.'); return; }
    if (!password.trim()) { setError('Ingresa tu contraseña.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      // Mostrar el mensaje exacto que devuelve el servidor
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  // Login rápido demo: carga usuario y contraseña en el formulario y hace login
  const handleQuickLogin = async (demo) => {
    setActiveDemo(demo.username);
    setError('');
    setLoading(true);
    try {
      await login(demo.username, demo.password);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
      setActiveDemo(null);
    }
  };

  // Rellenar formulario con los datos del demo (sin hacer login)
  const fillDemo = (demo) => {
    setUsername(demo.username);
    setPassword(demo.password);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Fondo grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Glow azul */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 400,
        background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', animation: 'fadeIn 0.4s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 18,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 800, color: '#fff',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(59,130,246,0.35)',
          }}>H</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            HelpDesk ITIL
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Sistema de Mesa de Ayuda · Microempresas
          </p>
        </div>

        {/* Card principal */}
        <div className="card" style={{ padding: '28px 28px 24px' }}>

          <form onSubmit={handleLogin} noValidate>

            {/* Usuario */}
            <div className="form-group">
              <label>Usuario o correo</label>
              <input
                className="form-control"
                type="text"
                placeholder="Ej: admin"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Contraseña */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                {/* Botón mostrar/ocultar contraseña */}
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 16, padding: 4,
                    display: 'flex', alignItems: 'center',
                  }}
                  tabIndex={-1}
                  title={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div style={{
                padding: '9px 13px', borderRadius: 7, marginBottom: 16,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'var(--accent-red)', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* Botón ingresar */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }}
              disabled={loading || !username.trim() || !password.trim()}
            >
              {loading
                ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Verificando...</>
                : 'Ingresar al Sistema'
              }
            </button>

          </form>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Acceso rápido (Demo)
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Botones demo */}
          <div style={{ display: 'flex', gap: 8 }}>
            {DEMO_USERS.map(demo => (
              <button
                key={demo.username}
                onClick={() => handleQuickLogin(demo)}
                onContextMenu={e => { e.preventDefault(); fillDemo(demo); }}
                disabled={loading}
                title={`Clic: login directo\nClic derecho: rellenar formulario\nUsuario: ${demo.username}\nContraseña: ${demo.password}`}
                style={{
                  flex: 1, padding: '9px 6px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${demo.color}35`,
                  background: activeDemo === demo.username ? `${demo.color}25` : `${demo.color}10`,
                  color: demo.color, fontSize: 11, fontWeight: 600,
                  transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  opacity: loading && activeDemo !== demo.username ? 0.5 : 1,
                }}
              >
                {activeDemo === demo.username
                  ? <span className="spinner" style={{ width: 12, height: 12, borderColor: `${demo.color}50`, borderTopColor: demo.color }} />
                  : <span style={{ fontSize: 16 }}>
                      {demo.role === 'admin' ? '⚙' : demo.role === 'tecnico' ? '🔧' : '👤'}
                    </span>
                }
                <span>{demo.label}</span>
              </button>
            ))}
          </div>

          {/* Hint de credenciales */}
          <div style={{
            marginTop: 14, padding: '8px 12px', borderRadius: 6,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5,
          }}>
            Todos los usuarios demo tienen la contraseña:{' '}
            <code style={{ color: 'var(--accent-blue)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
              password
            </code>
          </div>

        </div>

        {/* Tags ITIL */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {['Gestión de Incidentes', 'SLA', 'Base de Conocimiento', 'ITIL v4'].map(tag => (
            <span key={tag} style={{
              fontSize: 10, padding: '3px 9px', borderRadius: 20,
              border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}
