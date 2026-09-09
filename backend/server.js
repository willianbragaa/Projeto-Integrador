const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const sessions = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.substring(7) : null;
  const userId = token ? sessions.get(token) : null;

  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  req.userId = userId;
  next();
}

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' });
  }

  const passwordHash = hashPassword(password);
  db.run(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), passwordHash],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
        }
        return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
      }
      res.status(201).json({ message: 'Cadastro realizado com sucesso.' });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  db.get(
    'SELECT id, name, email, password_hash FROM users WHERE email = ?',
    [email.trim().toLowerCase()],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Erro interno.' });
      if (!user || user.password_hash !== hashPassword(password)) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      const token = crypto.randomUUID();
      sessions.set(token, user.id);
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email }
      });
    }
  );
});

app.post('/api/logout', auth, (req, res) => {
  const token = (req.headers.authorization || '').substring(7);
  sessions.delete(token);
  res.json({ message: 'Sessão encerrada.' });
});

app.get('/api/dashboard', auth, (req, res) => {
  db.get(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Concluída' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'Pendente' THEN 1 ELSE 0 END) AS pending
     FROM tasks WHERE user_id = ?`,
    [req.userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao carregar dashboard.' });
      const total = row.total || 0;
      const completed = row.completed || 0;
      const pending = row.pending || 0;
      const productivity = total ? Math.round((completed / total) * 100) : 0;
      res.json({ total, completed, pending, productivity });
    }
  );
});

app.get('/api/disciplines', auth, (req, res) => {
  db.all(
    'SELECT id, name, created_at FROM disciplines WHERE user_id = ? ORDER BY name',
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao listar disciplinas.' });
      res.json(rows);
    }
  );
});

app.post('/api/disciplines', auth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Informe o nome da disciplina.' });
  }

  db.run(
    'INSERT INTO disciplines (user_id, name) VALUES (?, ?)',
    [req.userId, name.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao cadastrar disciplina.' });
      res.status(201).json({ id: this.lastID, name: name.trim() });
    }
  );
});

app.delete('/api/disciplines/:id', auth, (req, res) => {
  db.run(
    'DELETE FROM disciplines WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao excluir disciplina.' });
      res.json({ message: 'Disciplina excluída.' });
    }
  );
});

app.get('/api/tasks', auth, (req, res) => {
  db.all(
    `SELECT t.*, d.name AS discipline_name
     FROM tasks t
     LEFT JOIN disciplines d ON d.id = t.discipline_id
     WHERE t.user_id = ?
     ORDER BY
       CASE t.status WHEN 'Pendente' THEN 0 ELSE 1 END,
       CASE t.priority WHEN 'Alta' THEN 0 WHEN 'Média' THEN 1 ELSE 2 END,
       t.due_date`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao listar tarefas.' });
      res.json(rows);
    }
  );
});

app.post('/api/tasks', auth, (req, res) => {
  const { title, description, discipline_id, due_date, priority } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Informe o título da tarefa.' });
  }

  db.run(
    `INSERT INTO tasks
      (user_id, discipline_id, title, description, due_date, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Pendente')`,
    [
      req.userId,
      discipline_id || null,
      title.trim(),
      (description || '').trim(),
      due_date || null,
      priority || 'Média'
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao cadastrar tarefa.' });
      res.status(201).json({ id: this.lastID, message: 'Tarefa cadastrada.' });
    }
  );
});

app.patch('/api/tasks/:id/status', auth, (req, res) => {
  const { status } = req.body;
  if (!['Pendente', 'Concluída'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  db.run(
    'UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?',
    [status, req.params.id, req.userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar tarefa.' });
      res.json({ message: 'Status atualizado.' });
    }
  );
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  db.run(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao excluir tarefa.' });
      res.json({ message: 'Tarefa excluída.' });
    }
  );
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
