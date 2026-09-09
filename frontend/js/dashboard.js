requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
  const user = currentUser();
  document.querySelector('#welcome').textContent = `Olá, ${user.name || 'estudante'}!`;

  try {
    const data = await API.get('/api/dashboard');
    document.querySelector('#total').textContent = data.total;
    document.querySelector('#pending').textContent = data.pending;
    document.querySelector('#completed').textContent = data.completed;
    document.querySelector('#productivity').textContent = `${data.productivity}%`;
    document.querySelector('#progressBar').style.width = `${data.productivity}%`;
  } catch (err) {
    document.querySelector('#dashboardMessage').textContent = err.message;
  }
});
