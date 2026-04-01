import { useState, useEffect } from 'react';
import { api } from '../context/AppContext';
import { useApp } from '../context/AppContext';

function ArticleModal({ article, onClose, onHelpful }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{article.id} · {article.category}</span>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{article.title}</h3>
          </div>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          {article.content}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>👁 {article.views} vistas · 👍 {article.helpful} útil</div>
          <button className="btn btn-secondary btn-sm" onClick={() => { onHelpful(article.id); onClose(); }}>
            👍 Fue útil
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  const { user, notify } = useApp();
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Software', content: '' });
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    try { setArticles(await api.get('/knowledge', { search, category })); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, [search, category]);

  const handleHelpful = async (id) => {
    await api.post(`/knowledge/${id}/helpful`);
    fetch_();
    notify('¡Gracias por tu feedback!');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/knowledge', form);
    setForm({ title: '', category: 'Software', content: '' });
    setShowForm(false);
    fetch_();
    notify('Artículo creado en la Base de Conocimiento');
  };

  const CATEGORIES = ['', 'Hardware', 'Software', 'Red', 'Accesos', 'Otro'];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Base de Conocimiento</h1>
          <p>ITIL Knowledge Management · {articles.length} artículos disponibles</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'tecnico') && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Artículo</button>
        )}
      </div>

      {/* Search & filter */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
          <div className="search-input-wrapper">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" /></svg>
            <input className="form-control" placeholder="Buscar soluciones, procedimientos..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" value={category} onChange={e => setCategory(e.target.value)} style={{ width: 160 }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c || 'Todas las categorías'}</option>)}
          </select>
        </div>
      </div>

      {/* Articles grid */}
      {loading ? (
        <div className="loading"><div className="spinner" /> Cargando artículos...</div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>◉</div>
          <h3>No hay artículos</h3>
          <p>No se encontraron artículos con ese criterio</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {articles.map(a => (
            <div key={a.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => setSelected(a)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--accent-blue)' }}>{a.id}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{a.category}</span>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{a.title}</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {a.content}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>👁 {a.views}</span>
                <span>👍 {a.helpful}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--accent-blue)', fontWeight: 500 }}>Leer →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article modal */}
      {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} onHelpful={handleHelpful} />}

      {/* New article modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal modal-md fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 600 }}>Nuevo Artículo de Conocimiento</h3>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Título *</label>
                <input className="form-control" placeholder="Ej: Cómo resolver el error XYZ en Windows" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['Hardware', 'Software', 'Red', 'Accesos', 'Otro'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Contenido / Solución *</label>
                <textarea className="form-control" placeholder="Describe la solución paso a paso..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} style={{ minHeight: 140 }} required />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Publicar Artículo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
