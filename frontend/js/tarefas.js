requireAuth();

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[c]));
}

async function loadDisciplineOptions() {
  const select = document.querySelector('#discipline_id');
  const items = await API.get('/api/disciplines');
  select.innerHTML = '<option value="">Sem disciplina</option>' +
    items.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
}

async function loadTasks() {
  const list = document.querySelector('#taskList');
  list.innerHTML = '<p class="muted">Carregando...</p>';
  try {
    const tasks = await API.get('/api/tasks');
    if (!tasks.length) {
      list.innerHTML = '<p class="muted">Nenhuma tarefa cadastrada.</p>';
      return;
    }
    list.innerHTML = tasks.map(t => `
      <div class="item">
        <div class="item-head">
          <div>
            <strong>${escapeHtml(t.title)}</strong><br>
            <span class="badge">${escapeHtml(t.status)}</span>
            <span class="badge">Prioridade: ${escapeHtml(t.priority)}</span>
          </div>
          <small class="muted">${t.due_date ? `Prazo: ${escapeHtml(t.due_date)}` : 'Sem prazo'}</small>
        </div>
        <p>${escapeHtml(t.description || 'Sem descrição')}</p>
        <p class="muted">Disciplina: ${escapeHtml(t.discipline_name || 'Não informada')}</p>
        <div class="actions">
          <button class="${t.status === 'Concluída' ? 'btn-secondary' : 'btn-success'}"
            onclick="toggleStatus(${t.id}, '${t.status}')">
            ${t.status === 'Concluída' ? 'Marcar como pendente' : 'Concluir'}
          </button>
          <button class="btn-danger" onclick="removeTask(${t.id})">Excluir</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="message">${escapeHtml(err.message)}</p>`;
  }
}

async function toggleStatus(id, currentStatus) {
  const next = currentStatus === 'Concluída' ? 'Pendente' : 'Concluída';
  await API.patch(`/api/tasks/${id}/status`, { status: next });
  loadTasks();
}

async function removeTask(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  await API.delete(`/api/tasks/${id}`);
  loadTasks();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadDisciplineOptions();
  await loadTasks();

  const form = document.querySelector('#taskForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.querySelector('#message');
    msg.textContent = '';
    try {
      await API.post('/api/tasks', {
        title: form.title.value,
        description: form.description.value,
        discipline_id: form.discipline_id.value || null,
        due_date: form.due_date.value || null,
        priority: form.priority.value
      });
      form.reset();
      await loadDisciplineOptions();
      await loadTasks();
    } catch (err) {
      msg.textContent = err.message;
    }
  });
});
