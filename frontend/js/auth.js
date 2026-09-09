document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('#loginForm');
  const registerForm = document.querySelector('#registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.querySelector('#message');
      msg.textContent = '';
      try {
        const data = await API.post('/api/login', {
          email: loginForm.email.value,
          password: loginForm.password.value
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        location.href = 'dashboard.html';
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.querySelector('#message');
      msg.textContent = '';
      try {
        await API.post('/api/register', {
          name: registerForm.name.value,
          email: registerForm.email.value,
          password: registerForm.password.value
        });
        msg.style.color = 'green';
        msg.textContent = 'Cadastro realizado. Você já pode entrar.';
        registerForm.reset();
      } catch (err) {
        msg.style.color = '';
        msg.textContent = err.message;
      }
    });
  }
});
