requireAuth();

async function loadDisciplines() {
  const list = document.querySelector('#disciplineList');
  list.innerHTML = '<p class="muted">Carregando...</p>';
  try {
    const items = await API.get('/api/disciplines');
    if (!items.length) {
      list.innerHTML = '<p class="muted">Nenhuma disciplina cadastrada.</p>';
      return;
    }
    list.innerHTML = items.map(d => `
      <div class="item">
        <div class="item-head">
          <strong>${escapeHtml(d.name)}</strong>
          <button class="btn-danger" onclick="removeDiscipline(${d.id})">Excluir</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="message">${escapeHtml(err.message)}</p>`;
  }
}

async function removeDiscipline(id) {
  if (!confirm('Excluir esta disciplina?')) return;
  await API.delete(`/api/disciplines/${id}`);
  loadDisciplines();
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#disciplineForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.querySelector('#message');
    msg.textContent = '';
    try {
      await API.post('/api/disciplines', { name: form.name.value });
      form.reset();
      loadDisciplines();
    } catch (err) {
      msg.textContent = err.message;
    }
  });
  loadDisciplines();
});
