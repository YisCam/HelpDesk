import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const API = 'http://localhost:4000/api';

export const api = {
  get: (path, params = {}) => {
    const url = new URL(`${API}${path}`);
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.set(k, v));
    return fetch(url).then(r => r.json());
  },
  post: (path, body) => fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  patch: (path, body) => fetch(`${API}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  put: (path, body) => fetch(`${API}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('hd_user')); } catch { return null; } });
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [changes, setChanges] = useState([]);
  const [problems, setProblems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const sseRef = useRef(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.error) throw new Error(res.error);
    setUser(res.user);
    localStorage.setItem('hd_user', JSON.stringify(res.user));
    return res.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('hd_user');
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setTickets([]); setChanges([]); setProblems([]); setAssets([]); setNotifications([]);
  }, []);

  const fetchMetrics = useCallback(async () => {
    try { setMetrics(await api.get('/metrics')); } catch {}
  }, []);

  // ── SSE ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const es = new EventSource(`${API}/events`);
    sseRef.current = es;

    es.addEventListener('ticket_created', e => {
      const t = JSON.parse(e.data);
      setTickets(prev => [t, ...prev.filter(x => x.id !== t.id)]);
      fetchMetrics();
    });
    es.addEventListener('ticket_updated', e => {
      const t = JSON.parse(e.data);
      setTickets(prev => prev.map(x => x.id === t.id ? t : x));
      fetchMetrics();
    });
    es.addEventListener('comment_added', e => {
      const { ticketId, comment } = JSON.parse(e.data);
      setTickets(prev => prev.map(t => t.id === ticketId
        ? { ...t, commentsEnriched: [...(t.commentsEnriched || []), comment] }
        : t));
    });
    es.addEventListener('change_created', e => {
      const c = JSON.parse(e.data);
      setChanges(prev => [c, ...prev.filter(x => x.id !== c.id)]);
    });
    es.addEventListener('change_updated', e => {
      const c = JSON.parse(e.data);
      setChanges(prev => prev.map(x => x.id === c.id ? c : x));
    });
    es.addEventListener('notification', e => {
      const n = JSON.parse(e.data);
      if (n.userId === user.id) {
        setNotifications(prev => [n, ...prev]);
        notify(n.message, n.type === 'critical' ? 'error' : 'info');
      }
    });

    return () => { es.close(); sseRef.current = null; };
  }, [user]);

  const fetchTickets = useCallback(async (filters = {}) => {
    setLoading(true);
    try { setTickets(await api.get('/tickets', filters)); }
    finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => { try { setUsers(await api.get('/users')); } catch {} }, []);
  const fetchChanges = useCallback(async () => { try { setChanges(await api.get('/changes')); } catch {} }, []);
  const fetchProblems = useCallback(async () => { try { setProblems(await api.get('/problems')); } catch {} }, []);
  const fetchAssets = useCallback(async () => { try { setAssets(await api.get('/assets')); } catch {} }, []);
  const fetchNotifications = useCallback(async () => {
    if (user) { try { setNotifications(await api.get(`/notifications/${user.id}`)); } catch {} }
  }, [user]);

  useEffect(() => {
    if (user) { fetchTickets(); fetchMetrics(); fetchUsers(); fetchChanges(); fetchProblems(); fetchAssets(); fetchNotifications(); }
  }, [user]);

  const createTicket = useCallback(async (data) => {
    const ticket = await api.post('/tickets', { ...data, createdBy: user?.id });
    fetchMetrics();
    notify(`Ticket ${ticket.id} creado exitosamente`);
    return ticket;
  }, [user, fetchMetrics, notify]);

  const updateTicket = useCallback(async (id, updates) => {
    const ticket = await api.patch(`/tickets/${id}`, { ...updates, updatedBy: user?.id });
    setTickets(prev => prev.map(t => t.id === id ? ticket : t));
    fetchMetrics();
    notify('Ticket actualizado');
    return ticket;
  }, [user, fetchMetrics, notify]);

  const addComment = useCallback(async (ticketId, text) => {
    return await api.post(`/tickets/${ticketId}/comments`, { authorId: user?.id, text });
  }, [user]);

  const rateTicket = useCallback(async (ticketId, score) => {
    await api.post(`/tickets/${ticketId}/rate`, { score });
    notify(`¡Gracias! Calificaste con ${score}/5 ⭐`);
  }, [notify]);

  const createChange = useCallback(async (data) => {
    const change = await api.post('/changes', { ...data, requestedBy: user?.id });
    setChanges(prev => [change, ...prev]);
    notify(`RFC ${change.id} enviado al CAB`);
    return change;
  }, [user, notify]);

  const updateChange = useCallback(async (id, updates) => {
    const change = await api.patch(`/changes/${id}`, { ...updates, updatedBy: user?.id });
    setChanges(prev => prev.map(c => c.id === id ? change : c));
    notify('Cambio actualizado');
    return change;
  }, [user, notify]);

  const createProblem = useCallback(async (data) => {
    const problem = await api.post('/problems', { ...data, createdBy: user?.id });
    setProblems(prev => [problem, ...prev]);
    notify(`Problema ${problem.id} registrado`);
    return problem;
  }, [user, notify]);

  const updateProblem = useCallback(async (id, updates) => {
    const problem = await api.patch(`/problems/${id}`, { ...updates, updatedBy: user?.id });
    setProblems(prev => prev.map(p => p.id === id ? problem : p));
    notify('Problema actualizado');
    return problem;
  }, [user, notify]);

  const createAsset = useCallback(async (data) => {
    const asset = await api.post('/assets', data);
    setAssets(prev => [asset, ...prev]);
    notify(`Asset ${asset.id} registrado`);
    return asset;
  }, [notify]);

  const updateAsset = useCallback(async (id, updates) => {
    const asset = await api.patch(`/assets/${id}`, updates);
    setAssets(prev => prev.map(a => a.id === id ? asset : a));
    notify('Asset actualizado');
    return asset;
  }, [notify]);

  const markNotifRead = useCallback(async (id) => {
    await api.patch(`/notifications/${id}/read`, {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotifRead = useCallback(async () => {
    if (!user) return;
    await api.patch(`/notifications/user/${user.id}/read-all`, {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      user, login, logout,
      tickets, users, metrics, changes, problems, assets, notifications, unreadCount, loading,
      fetchTickets, fetchMetrics, fetchUsers, fetchChanges, fetchProblems, fetchAssets,
      createTicket, updateTicket, addComment, rateTicket,
      createChange, updateChange,
      createProblem, updateProblem,
      createAsset, updateAsset,
      markNotifRead, markAllNotifRead,
      notify, toast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
