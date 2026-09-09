const API = {
  token: () => localStorage.getItem('token'),

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = API.token();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.pathname.endsWith('index.html')) location.href = 'index.html';
    }

    if (!response.ok) throw new Error(data.error || 'Ocorreu um erro.');
    return data;
  },

  get(url) { return API.request(url); },
  post(url, body) { return API.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  patch(url, body) { return API.request(url, { method: 'PATCH', body: JSON.stringify(body) }); },
  delete(url) { return API.request(url, { method: 'DELETE' }); }
};

function requireAuth() {
  if (!localStorage.getItem('token')) location.href = 'index.html';
}

function logout() {
  API.post('/api/logout', {}).catch(() => {});
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = 'index.html';
}

function currentUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
}
