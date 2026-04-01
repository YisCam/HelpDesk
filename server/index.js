require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt  = require('bcryptjs');
const pool    = require('./db');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── SSE ─────────────────────────────────────────────────────────────────────
const sseClients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => { try { c.res.write(msg); } catch { sseClients.delete(c); } });
}

app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
  res.flushHeaders();
  res.write(': connected\n\n');
  const client = { id: uuidv4(), res };
  sseClients.add(client);
  req.on('close', () => sseClients.delete(client));
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function nextId(nombre, prefix) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE secuencias SET valor = valor + 1 WHERE nombre = ?', [nombre]);
    const [[row]] = await conn.query('SELECT valor FROM secuencias WHERE nombre = ?', [nombre]);
    await conn.commit();
    return `${prefix}-${String(row.valor).padStart(3, '0')}`;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function getSLAStatus(slaDeadline, status) {
  if (['Resuelto', 'Cerrado'].includes(status)) return 'cumplido';
  const diff = new Date(slaDeadline) - Date.now();
  if (diff < 0) return 'vencido';
  if (diff < 3600000) return 'en_riesgo';
  return 'ok';
}

async function addNotification(userId, message, type = 'info', link = null) {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO notificaciones (id, user_id, message, type, link) VALUES (?,?,?,?,?)',
    [id, userId, message, type, link]
  );
  const [[n]] = await pool.query('SELECT * FROM notificaciones WHERE id = ?', [id]);
  broadcast('notification', { ...n, read: false });
}

async function addTicketHistory(ticketId, accion, userId) {
  await pool.query(
    'INSERT INTO ticket_historial (ticket_id, accion, user_id) VALUES (?,?,?)',
    [ticketId, accion, userId || null]
  );
}

// Enriquecer ticket con joins
async function enrichTicket(ticket) {
  const [[assignee]] = ticket.assigned_to
    ? await pool.query('SELECT id, username, name, avatar, role, department FROM usuarios WHERE id = ?', [ticket.assigned_to])
    : [[null]];
  const [[requester]] = ticket.created_by
    ? await pool.query('SELECT id, username, name, avatar, role, department FROM usuarios WHERE id = ?', [ticket.created_by])
    : [[null]];
  const [comments] = await pool.query(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar, u.id as author_id_user
    FROM ticket_comentarios c
    LEFT JOIN usuarios u ON u.id = c.author_id
    WHERE c.ticket_id = ? ORDER BY c.created_at ASC`, [ticket.id]);
  const [history] = await pool.query(`
    SELECT h.*, u.name as user_name
    FROM ticket_historial h
    LEFT JOIN usuarios u ON u.id = h.user_id
    WHERE h.ticket_id = ? ORDER BY h.created_at ASC`, [ticket.id]);

  const tags = typeof ticket.tags === 'string' ? JSON.parse(ticket.tags || '[]') : (ticket.tags || []);

  return {
    ...ticket,
    tags,
    assignee,
    requester,
    assignedTo: ticket.assigned_to,
    createdBy: ticket.created_by,
    slaDeadline: ticket.sla_deadline,
    satisfactionScore: ticket.satisfaction_score,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    slaStatus: getSLAStatus(ticket.sla_deadline, ticket.status),
    commentsEnriched: comments.map(c => ({
      id: c.id, text: c.texto, createdAt: c.created_at, authorId: c.author_id,
      author: { id: c.author_id_user, name: c.author_name, avatar: c.author_avatar }
    })),
    historyEnriched: history.map(h => ({
      action: h.accion, userId: h.user_id, timestamp: h.created_at,
      user: h.user_name ? { name: h.user_name } : null
    }))
  };
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Traer también el hash de contraseña
    const [[user]] = await pool.query(
      `SELECT id, username, name, email, role, department, avatar, phone, active,
              password AS pwd
       FROM usuarios WHERE username = ? OR email = ?`,
      [username, username]
    );

    if (!user)
      return res.status(401).json({ error: 'Usuario no encontrado' });

    if (!user.active)
      return res.status(403).json({ error: 'Usuario inactivo' });

    // Verificar contraseña con bcrypt
    const passwordOk = await bcrypt.compare(password || '', user.pwd);
    if (!passwordOk)
      return res.status(401).json({ error: 'Contraseña incorrecta' });

    // No enviar el hash al frontend
    const { pwd, ...userSafe } = user;
    res.json({ user: userSafe, token: `hd-${userSafe.id}-${Date.now()}` });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CAMBIAR CONTRASEÑA ───────────────────────────────────────────────────────
app.patch('/api/auth/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    const [[user]] = await pool.query(
      'SELECT id, password AS pwd, active FROM usuarios WHERE id = ?', [userId]
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(currentPassword || '', user.pwd);
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, userId]);
    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, name, email, role, department, avatar, phone, active FROM usuarios ORDER BY role, name'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, username, email, role, department, phone, password } = req.body;
    const id      = uuidv4();
    const avatar  = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    // Usar contraseña enviada o "demo" por defecto
    const hash    = await bcrypt.hash(password || 'demo', 10);
    await pool.query(
      'INSERT INTO usuarios (id, username, name, email, password, role, department, phone, avatar) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, username, name, email || null, hash, role || 'usuario', department || null, phone || null, avatar]
    );
    const [[user]] = await pool.query('SELECT id, username, name, email, role, department, avatar, phone, active FROM usuarios WHERE id = ?', [id]);
    broadcast('user_created', user);
    res.status(201).json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Resetear contraseña (solo admin)
app.patch('/api/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, req.params.id]);
    res.json({ ok: true, message: 'Contraseña reseteada correctamente' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const allowed = ['name', 'email', 'role', 'department', 'phone', 'active'];
    const fields  = Object.keys(req.body).filter(k => allowed.includes(k));
    if (fields.length) {
      const sets  = fields.map(f => `${f} = ?`).join(', ');
      const vals  = fields.map(f => req.body[f]);
      await pool.query(`UPDATE usuarios SET ${sets} WHERE id = ?`, [...vals, req.params.id]);
    }
    const [[user]] = await pool.query('SELECT id, username, name, email, role, department, avatar, phone, active FROM usuarios WHERE id = ?', [req.params.id]);
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── TICKETS ─────────────────────────────────────────────────────────────────
app.get('/api/tickets', async (req, res) => {
  try {
    const { status, priority, category, search, assignedTo } = req.query;
    let sql    = 'SELECT * FROM tickets WHERE 1=1';
    const vals = [];
    if (status)     { sql += ' AND status = ?';      vals.push(status); }
    if (priority)   { sql += ' AND priority = ?';    vals.push(priority); }
    if (category)   { sql += ' AND category = ?';    vals.push(category); }
    if (assignedTo) { sql += ' AND assigned_to = ?'; vals.push(assignedTo); }
    if (search) {
      sql += ' AND (title LIKE ? OR id LIKE ? OR description LIKE ?)';
      vals.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    // Ordenar: activos primero por prioridad, luego resueltos/cerrados
    sql += ` ORDER BY
      CASE WHEN status IN ('Resuelto','Cerrado') THEN 1 ELSE 0 END ASC,
      CASE priority
        WHEN 'Crítica' THEN 0 WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3
      END ASC,
      created_at DESC`;
    const [rows] = await pool.query(sql, vals);
    const enriched = await Promise.all(rows.map(enrichTicket));
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tickets/:id', async (req, res) => {
  try {
    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (!ticket) return res.status(404).json({ error: 'No encontrado' });
    res.json(await enrichTicket(ticket));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { title, description, category, priority, createdBy, tags } = req.body;
    const [[sla]] = await pool.query('SELECT resolution_time FROM sla_config WHERE priority = ?', [priority || 'Media']);
    const resolutionHours = sla?.resolution_time || 24;
    const id       = await nextId('tickets', 'TKT');
    const deadline = new Date(Date.now() + resolutionHours * 3600000);
    const tagsJson = JSON.stringify(tags || []);

    await pool.query(
      'INSERT INTO tickets (id, title, description, category, priority, status, created_by, tags, sla_deadline) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, title, description, category, priority || 'Media', 'Abierto', createdBy, tagsJson, deadline]
    );
    await addTicketHistory(id, 'Ticket creado', createdBy);

    // Notificar a admins y técnicos
    const [staff] = await pool.query("SELECT id FROM usuarios WHERE role != 'usuario' AND active = 1");
    for (const u of staff) {
      await addNotification(u.id, `Nuevo ticket ${id}: ${title}`, priority === 'Crítica' ? 'critical' : 'info', id);
    }

    const [[created]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    const enriched = await enrichTicket(created);
    broadcast('ticket_created', enriched);
    res.status(201).json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/tickets/:id', async (req, res) => {
  try {
    const { updatedBy, status, assignedTo, priority, resolution, satisfactionScore } = req.body;
    const [[old]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (!old) return res.status(404).json({ error: 'No encontrado' });

    const sets = [], vals = [];
    if (status     !== undefined) { sets.push('status = ?');               vals.push(status); }
    if (assignedTo !== undefined) { sets.push('assigned_to = ?');          vals.push(assignedTo || null); }
    if (priority   !== undefined) { sets.push('priority = ?');             vals.push(priority); }
    if (resolution !== undefined) { sets.push('resolution = ?');           vals.push(resolution); }
    if (satisfactionScore !== undefined) { sets.push('satisfaction_score = ?'); vals.push(satisfactionScore); }
    if (sets.length) {
      await pool.query(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`, [...vals, req.params.id]);
    }

    // Historial
    if (status && status !== old.status)
      await addTicketHistory(req.params.id, `Estado: ${old.status} → ${status}`, updatedBy);
    if (assignedTo !== undefined && assignedTo !== old.assigned_to) {
      const [[u]] = assignedTo ? await pool.query('SELECT name FROM usuarios WHERE id = ?', [assignedTo]) : [[null]];
      await addTicketHistory(req.params.id, `Asignado a: ${u?.name || 'Sin asignar'}`, updatedBy);
      if (u) await addNotification(assignedTo, `Se te asignó el ticket ${req.params.id}: ${old.title}`, 'assignment', req.params.id);
    }
    if (priority && priority !== old.priority)
      await addTicketHistory(req.params.id, `Prioridad: ${old.priority} → ${priority}`, updatedBy);
    if (resolution)
      await addTicketHistory(req.params.id, 'Solución documentada', updatedBy);
    if (status === 'Resuelto' && old.status !== 'Resuelto')
      await addNotification(old.created_by, `Tu ticket ${req.params.id} fue resuelto.`, 'resolved', req.params.id);

    const [[updated]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    const enriched = await enrichTicket(updated);
    broadcast('ticket_updated', enriched);
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tickets/:id/comments', async (req, res) => {
  try {
    const { authorId, text } = req.body;
    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (!ticket) return res.status(404).json({ error: 'No encontrado' });
    const id = uuidv4();
    await pool.query('INSERT INTO ticket_comentarios (id, ticket_id, author_id, texto) VALUES (?,?,?,?)', [id, req.params.id, authorId, text]);
    await addTicketHistory(req.params.id, 'Comentario agregado', authorId);
    if (ticket.created_by !== authorId)
      await addNotification(ticket.created_by, `Nuevo comentario en tu ticket ${req.params.id}`, 'comment', req.params.id);
    const [[c]] = await pool.query('SELECT c.*, u.name as author_name, u.avatar as author_avatar FROM ticket_comentarios c LEFT JOIN usuarios u ON u.id = c.author_id WHERE c.id = ?', [id]);
    const comment = { id: c.id, text: c.texto, createdAt: c.created_at, authorId: c.author_id, author: { name: c.author_name, avatar: c.author_avatar } };
    broadcast('comment_added', { ticketId: req.params.id, comment });
    res.status(201).json(comment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tickets/:id/rate', async (req, res) => {
  try {
    const { score } = req.body;
    const [[t]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (!t) return res.status(404).json({ error: 'No encontrado' });
    await pool.query('UPDATE tickets SET satisfaction_score = ? WHERE id = ?', [score, req.params.id]);
    await addTicketHistory(req.params.id, `Calificado con ${score}/5 estrellas`, t.created_by);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── METRICS ─────────────────────────────────────────────────────────────────
app.get('/api/metrics', async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'Abierto') as open,
        SUM(status = 'En Progreso') as in_progress,
        SUM(status = 'Resuelto') as resolved,
        SUM(status = 'Cerrado') as closed,
        SUM(priority = 'Crítica' AND status NOT IN ('Resuelto','Cerrado')) as critical_open,
        SUM(assigned_to IS NULL AND status NOT IN ('Resuelto','Cerrado')) as unassigned,
        SUM(NOW() > sla_deadline AND status NOT IN ('Resuelto','Cerrado')) as sla_vencidos,
        SUM(TIMESTAMPDIFF(SECOND, NOW(), sla_deadline) BETWEEN 0 AND 3600 AND status NOT IN ('Resuelto','Cerrado')) as sla_en_riesgo,
        AVG(CASE WHEN status IN ('Resuelto','Cerrado') THEN TIMESTAMPDIFF(MINUTE, created_at, updated_at)/60 END) as avg_resolution_hours,
        AVG(satisfaction_score) as avg_satisfaction
      FROM tickets`);

    const [byStatus]   = await pool.query("SELECT status as name, COUNT(*) as value FROM tickets GROUP BY status");
    const [byPriority] = await pool.query("SELECT priority as name, COUNT(*) as value FROM tickets GROUP BY priority");
    const [byCategory] = await pool.query("SELECT category as name, COUNT(*) as value FROM tickets GROUP BY category");

    const slaCompliance = totals.total > 0
      ? Math.round(((totals.total - totals.sla_vencidos) / totals.total) * 100)
      : 100;

    const toObj = arr => Object.fromEntries(arr.map(r => [r.name, r.value]));

    res.json({
      total:              totals.total,
      openTickets:        (totals.open || 0) + (totals.in_progress || 0),
      criticalOpen:       totals.critical_open || 0,
      unassigned:         totals.unassigned || 0,
      slaVencidos:        totals.sla_vencidos || 0,
      slaEnRiesgo:        totals.sla_en_riesgo || 0,
      slaCompliance,
      avgResolutionHours: totals.avg_resolution_hours ? Math.round(totals.avg_resolution_hours * 10) / 10 : 0,
      avgSatisfaction:    totals.avg_satisfaction ? parseFloat(totals.avg_satisfaction).toFixed(1) : null,
      byStatus:    toObj(byStatus),
      byPriority:  toObj(byPriority),
      byCategory:  toObj(byCategory),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CHANGES ─────────────────────────────────────────────────────────────────
async function enrichChange(c) {
  const [[requester]] = c.requested_by ? await pool.query('SELECT id, name, avatar FROM usuarios WHERE id = ?', [c.requested_by]) : [[null]];
  const [[assignee]]  = c.assigned_to  ? await pool.query('SELECT id, name, avatar FROM usuarios WHERE id = ?', [c.assigned_to])  : [[null]];
  const [history]     = await pool.query('SELECT h.*, u.name as user_name FROM cambios_historial h LEFT JOIN usuarios u ON u.id = h.user_id WHERE h.cambio_id = ? ORDER BY h.created_at ASC', [c.id]);
  const approvals     = typeof c.approvals === 'string' ? JSON.parse(c.approvals || '[]') : (c.approvals || []);
  return { ...c, requester, assignee, approvals, history: history.map(h => ({ action: h.accion, userId: h.user_id, timestamp: h.created_at, user: h.user_name ? { name: h.user_name } : null })) };
}

app.get('/api/changes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cambios ORDER BY created_at DESC');
    res.json(await Promise.all(rows.map(enrichChange)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/changes', async (req, res) => {
  try {
    const { title, description, type, priority, requestedBy, assignedTo, scheduledStart, scheduledEnd, impact, risk, rollbackPlan } = req.body;
    const id = await nextId('cambios', 'CHG');
    await pool.query(
      'INSERT INTO cambios (id, title, description, type, priority, status, requested_by, assigned_to, scheduled_start, scheduled_end, impact, risk, rollback_plan, approvals) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, title, description, type || 'Normal', priority || 'Media', 'En Revisión', requestedBy, assignedTo || null, scheduledStart || null, scheduledEnd || null, impact || 'Bajo', risk || 'Bajo', rollbackPlan || null, '[]']
    );
    await pool.query('INSERT INTO cambios_historial (cambio_id, accion, user_id) VALUES (?,?,?)', [id, 'RFC enviado', requestedBy]);
    const [[c]] = await pool.query('SELECT * FROM cambios WHERE id = ?', [id]);
    const enriched = await enrichChange(c);
    broadcast('change_created', enriched);
    res.status(201).json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/changes/:id', async (req, res) => {
  try {
    const { updatedBy, status, assignedTo, approvals } = req.body;
    const [[old]] = await pool.query('SELECT * FROM cambios WHERE id = ?', [req.params.id]);
    if (!old) return res.status(404).json({ error: 'No encontrado' });
    const sets = [], vals = [];
    if (status     !== undefined) { sets.push('status = ?');      vals.push(status); }
    if (assignedTo !== undefined) { sets.push('assigned_to = ?'); vals.push(assignedTo || null); }
    if (approvals  !== undefined) { sets.push('approvals = ?');   vals.push(JSON.stringify(approvals)); }
    if (status === 'Aprobado') {
      const existing = typeof old.approvals === 'string' ? JSON.parse(old.approvals || '[]') : (old.approvals || []);
      const newApprovals = [...existing, { userId: updatedBy, status: 'Aprobado', timestamp: new Date().toISOString() }];
      sets.push('approvals = ?'); vals.push(JSON.stringify(newApprovals));
      sets.push('approved_by = ?'); vals.push(updatedBy);
    }
    if (sets.length) await pool.query(`UPDATE cambios SET ${sets.join(', ')} WHERE id = ?`, [...vals, req.params.id]);
    if (status && status !== old.status)
      await pool.query('INSERT INTO cambios_historial (cambio_id, accion, user_id) VALUES (?,?,?)', [req.params.id, `Estado: ${old.status} → ${status}`, updatedBy]);
    const [[updated]] = await pool.query('SELECT * FROM cambios WHERE id = ?', [req.params.id]);
    const enriched = await enrichChange(updated);
    broadcast('change_updated', enriched);
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PROBLEMS ────────────────────────────────────────────────────────────────
async function enrichProblem(p) {
  const [[assignee]] = p.assigned_to ? await pool.query('SELECT id, name, avatar FROM usuarios WHERE id = ?', [p.assigned_to]) : [[null]];
  const [history]    = await pool.query('SELECT h.*, u.name as user_name FROM problemas_historial h LEFT JOIN usuarios u ON u.id = h.user_id WHERE h.problema_id = ? ORDER BY h.created_at ASC', [p.id]);
  const relatedTickets = typeof p.related_tickets === 'string' ? JSON.parse(p.related_tickets || '[]') : (p.related_tickets || []);
  return { ...p, assignee, relatedTickets, history: history.map(h => ({ action: h.accion, userId: h.user_id, timestamp: h.created_at })) };
}

app.get('/api/problems', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM problemas ORDER BY created_at DESC');
    res.json(await Promise.all(rows.map(enrichProblem)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/problems', async (req, res) => {
  try {
    const { title, description, priority, assignedTo, createdBy, relatedTickets } = req.body;
    const id = await nextId('problemas', 'PRB');
    await pool.query(
      'INSERT INTO problemas (id, title, description, status, priority, assigned_to, created_by, related_tickets) VALUES (?,?,?,?,?,?,?,?)',
      [id, title, description, 'En Investigación', priority || 'Media', assignedTo || null, createdBy, JSON.stringify(relatedTickets || [])]
    );
    await pool.query('INSERT INTO problemas_historial (problema_id, accion, user_id) VALUES (?,?,?)', [id, 'Problema registrado', createdBy]);
    const [[p]] = await pool.query('SELECT * FROM problemas WHERE id = ?', [id]);
    res.status(201).json(await enrichProblem(p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/problems/:id', async (req, res) => {
  try {
    const { updatedBy, status, rootCause, workaround, solution, assignedTo } = req.body;
    const sets = [], vals = [];
    if (status     !== undefined) { sets.push('status = ?');      vals.push(status); }
    if (rootCause  !== undefined) { sets.push('root_cause = ?');  vals.push(rootCause); }
    if (workaround !== undefined) { sets.push('workaround = ?');  vals.push(workaround); }
    if (solution   !== undefined) { sets.push('solution = ?');    vals.push(solution); }
    if (assignedTo !== undefined) { sets.push('assigned_to = ?'); vals.push(assignedTo || null); }
    if (sets.length) await pool.query(`UPDATE problemas SET ${sets.join(', ')} WHERE id = ?`, [...vals, req.params.id]);
    if (status)
      await pool.query('INSERT INTO problemas_historial (problema_id, accion, user_id) VALUES (?,?,?)', [req.params.id, `Estado: ${status}`, updatedBy]);
    const [[p]] = await pool.query('SELECT * FROM problemas WHERE id = ?', [req.params.id]);
    res.json(await enrichProblem(p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ASSETS ──────────────────────────────────────────────────────────────────
app.get('/api/assets', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, u.name as assignee_name, u.avatar as assignee_avatar
      FROM assets a LEFT JOIN usuarios u ON u.id = a.assigned_to
      ORDER BY a.type, a.name`);
    res.json(rows.map(a => ({ ...a, assignee: a.assignee_name ? { name: a.assignee_name, avatar: a.assignee_avatar } : null })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/assets', async (req, res) => {
  try {
    const id = await nextId('assets', 'AST');
    const { name, type, status, ip_address, location, assigned_to, purchase_date, warranty_end, notes } = req.body;
    await pool.query(
      'INSERT INTO assets (id, name, type, status, ip_address, location, assigned_to, purchase_date, warranty_end, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, name, type || 'Workstation', status || 'Operativo', ip_address || null, location || null, assigned_to || null, purchase_date || null, warranty_end || null, notes || null]
    );
    const [[a]] = await pool.query('SELECT * FROM assets WHERE id = ?', [id]);
    res.status(201).json(a);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/assets/:id', async (req, res) => {
  try {
    const allowed = ['name', 'type', 'status', 'ip_address', 'location', 'assigned_to', 'purchase_date', 'warranty_end', 'notes'];
    const fields  = Object.keys(req.body).filter(k => allowed.includes(k));
    if (fields.length) {
      const sets = fields.map(f => `${f} = ?`).join(', ');
      await pool.query(`UPDATE assets SET ${sets} WHERE id = ?`, [...fields.map(f => req.body[f]), req.params.id]);
    }
    const [[a]] = await pool.query('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    res.json(a);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── KNOWLEDGE ────────────────────────────────────────────────────────────────
app.get('/api/knowledge', async (req, res) => {
  try {
    const { search, category } = req.query;
    let sql = 'SELECT k.*, u.name as author_name FROM conocimiento k LEFT JOIN usuarios u ON u.id = k.author_id WHERE 1=1';
    const vals = [];
    if (category) { sql += ' AND k.category = ?'; vals.push(category); }
    if (search)   { sql += ' AND (k.title LIKE ? OR k.content LIKE ?)'; vals.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY k.helpful DESC';
    const [rows] = await pool.query(sql, vals);
    res.json(rows.map(r => ({ ...r, authorUser: r.author_name ? { name: r.author_name } : null })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/knowledge', async (req, res) => {
  try {
    const id = await nextId('conocimiento', 'KB');
    const { title, category, content, authorId } = req.body;
    await pool.query('INSERT INTO conocimiento (id, title, category, content, author_id) VALUES (?,?,?,?,?)', [id, title, category, content, authorId || null]);
    const [[a]] = await pool.query('SELECT * FROM conocimiento WHERE id = ?', [id]);
    res.status(201).json(a);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/knowledge/:id/helpful', async (req, res) => {
  try {
    await pool.query('UPDATE conocimiento SET helpful = helpful + 1, views = views + 1 WHERE id = ?', [req.params.id]);
    const [[a]] = await pool.query('SELECT * FROM conocimiento WHERE id = ?', [req.params.id]);
    if (!a) return res.status(404).json({ error: 'No encontrado' });
    res.json({ helpful: a.helpful });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notificaciones WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.userId]);
    res.json(rows.map(n => ({ ...n, read: !!n.is_read })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notificaciones SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notificaciones SET is_read = 1 WHERE user_id = ?', [req.params.userId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SLA CONFIG ───────────────────────────────────────────────────────────────
app.get('/api/sla', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sla_config');
    const config = {};
    rows.forEach(r => { config[r.priority] = { responseTime: r.response_time, resolutionTime: r.resolution_time, color: r.color }; });
    res.json(config);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/sla', async (req, res) => {
  try {
    for (const [priority, cfg] of Object.entries(req.body)) {
      await pool.query('UPDATE sla_config SET response_time = ?, resolution_time = ? WHERE priority = ?', [cfg.responseTime, cfg.resolutionTime, priority]);
    }
    const [rows] = await pool.query('SELECT * FROM sla_config');
    const config = {};
    rows.forEach(r => { config[r.priority] = { responseTime: r.response_time, resolutionTime: r.resolution_time, color: r.color }; });
    res.json(config);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────
app.get('/api/reports/sla', async (req, res) => {
  try {
    const [techRows] = await pool.query(`
      SELECT
        u.id, u.name, u.avatar, u.department,
        COUNT(t.id) as total,
        SUM(t.status IN ('Resuelto','Cerrado')) as resolved,
        SUM(NOW() > t.sla_deadline AND t.status NOT IN ('Resuelto','Cerrado')) as breached
      FROM usuarios u
      LEFT JOIN tickets t ON t.assigned_to = u.id
      WHERE u.role != 'usuario'
      GROUP BY u.id, u.name, u.avatar, u.department`);
    const [slaRows] = await pool.query('SELECT * FROM sla_config');
    const slaConfig = {};
    slaRows.forEach(r => { slaConfig[r.priority] = { responseTime: r.response_time, resolutionTime: r.resolution_time, color: r.color }; });
    const techReport = techRows.map(r => ({
      user:       { id: r.id, name: r.name, avatar: r.avatar, department: r.department },
      total:      r.total || 0,
      resolved:   r.resolved || 0,
      breached:   r.breached || 0,
      compliance: r.total > 0 ? Math.round(((r.total - r.breached) / r.total) * 100) : 100
    }));
    res.json({ techReport, slaConfig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 HelpDesk ITIL API  →  http://localhost:${PORT}`);
  console.log(`📡 SSE Events         →  http://localhost:${PORT}/api/events`);
  console.log(`🗄️  Base de datos       →  MySQL · ${process.env.DB_NAME}\n`);
  console.log(`Módulos: Tickets | Cambios (CAB) | Problemas | Assets | KB | Notificaciones | Reportes SLA\n`);
});
