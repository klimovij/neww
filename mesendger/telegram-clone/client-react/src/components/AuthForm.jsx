import React, { useState } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
`;

const FormBox = styled.div`
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px #2193b044;
  padding: 38px 32px 32px 32px;
  min-width: 340px;
  max-width: 380px;
  width: 100%;
`;

const Title = styled.h2`
  text-align: center;
  font-size: 2.1em;
  font-weight: 800;
  color: #2193b0;
  margin-bottom: 18px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid #b2bec3;
  font-size: 1em;
  background: #f8f9fa;
  transition: border 0.2s;
  &:focus {
    border: 1.5px solid #2193b0;
    outline: none;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%);
  color: #fff;
  font-size: 1.1em;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background 0.2s;
  &:hover {
    background: linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%);
  }
`;

const Link = styled.span`
  display: block;
  text-align: center;
  color: #2193b0;
  cursor: pointer;
  margin-top: 10px;
  font-size: 0.98em;
  text-decoration: underline;
`;

const AvatarPreview = styled.img`
  display: block;
  margin: 0 auto 16px auto;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 2px 12px #2193b044;
`;

export default function AuthForm() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    password: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',
    avatar: null,
    department: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (name === 'avatar' && files && files[0]) {
      setForm(f => ({ ...f, avatar: files[0] }));
      setAvatarPreview(URL.createObjectURL(files[0]));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      if (!form.first_name || !form.last_name || !form.password) {
        setError('Заполните все поля!');
        return;
      }
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ first_name: form.first_name, last_name: form.last_name, password: form.password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка авторизации');
        localStorage.setItem('token', data.token);
        // Добавляем username для Sidebar
        const userObj = {
          ...data.user,
          username: data.user.username || `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim()
        };
        localStorage.setItem('user', JSON.stringify(userObj));
        window.location.reload();
      } catch (err) {
        // Выводим подробности ошибки в консоль браузера
        console.error('Ошибка регистрации:', err);
        setError(err.message);
      }
    } else {
      if (!form.first_name || !form.last_name || !form.password || !form.birth_day || !form.birth_month || !form.birth_year || !form.avatar) {
        setError('Заполните все поля и загрузите фото!');
        return;
      }
      try {
        // Сначала регистрируем пользователя
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: form.first_name,
            last_name: form.last_name,
            password: form.password,
            birth_day: form.birth_day,
            birth_month: form.birth_month,
            birth_year: form.birth_year,
            department: form.department
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка регистрации');
        localStorage.setItem('token', data.token);
        // Добавляем username для Sidebar
        const userObj = {
          ...data.user,
          username: data.user.username || `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim()
        };
        localStorage.setItem('user', JSON.stringify(userObj));
        // После успешной регистрации загружаем аватар
        let avatar_url = data.user.avatar_url || '';
        if (form.avatar) {
          const fd = new FormData();
          fd.append('avatar', form.avatar);
          const token = data.token;
          const resAvatar = await fetch('/api/upload-avatar', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd
          });
          const avatarData = await resAvatar.json();
          if (!resAvatar.ok) throw new Error(avatarData.error || 'Ошибка загрузки фото');
          avatar_url = avatarData.avatarUrl;
          // Обновляем пользователя в localStorage
          const user = { ...data.user, avatar_url };
          localStorage.setItem('user', JSON.stringify(user));
        }
        window.location.reload();
      } catch (err) {
        // Выводим подробности ошибки в консоль браузера
        console.error('Ошибка авторизации:', err);
        setError(err.message);
      }
    }
  };

  return (
    <Wrapper>
      <FormBox>
        <Title>Добро пожаловать в команду Issa Plus</Title>
        <form onSubmit={handleSubmit}>
          <Input name="first_name" placeholder="Имя" value={form.first_name} onChange={handleChange} autoFocus required />
          <Input name="last_name" placeholder="Фамилия" value={form.last_name} onChange={handleChange} required />
          <Input name="password" type="password" placeholder="Пароль" value={form.password} onChange={handleChange} required />
          {mode === 'register' && (
            <>
              <Input name="birth_day" type="number" min="1" max="31" placeholder="День рождения" value={form.birth_day} onChange={handleChange} required />
              <Input name="birth_month" type="number" min="1" max="12" placeholder="Месяц рождения" value={form.birth_month} onChange={handleChange} required />
              <Input name="birth_year" type="number" min="1900" max="2025" placeholder="Год рождения" value={form.birth_year} onChange={handleChange} required />
              <select name="department" value={form.department} onChange={handleChange} required style={{ width:'100%', padding:'12px 14px', marginBottom:16, borderRadius:8, border:'1px solid #b2bec3', background:'#f8f9fa' }}>
                <option value="">Выберите должность</option>
                <option>Организатор фотосессий</option>
                <option>Супервайзер колл-центра</option>
                <option>Менеджер отдела возвратов</option>
                <option>Менеджер склада</option>
                <option>Оператор колл-центра</option>
                <option>Менеджер отдела продаж</option>
                <option>Финансовый менеджер</option>
                <option>ОТК (отдел технического контроля)</option>
                <option>SMM-менеджер</option>
                <option>Водитель</option>
                <option>Менеджер по дропшиппингу</option>
                <option>Менеджер по качеству обслуживания клиентов</option>
                <option>Менеджер маркетплейса</option>
                <option>Бухгалтер по первичной документации</option>
                <option>Руководитель отдела закупок</option>
                <option>Супервайзер отдела возвратов</option>
                <option>CEO (генеральный директор)</option>
                <option>Контент-менеджер</option>
                <option>Завсклад (заведующий складом)</option>
                <option>Системный администратор</option>
                <option>Владелец компании</option>
                <option>Помощник SMM-менеджера</option>
                <option>Руководитель отдела логистики</option>
                <option>HR-менеджер (менеджер по персоналу)</option>
                <option>Менеджер отдела маркетинга</option>
                <option>Менеджер отдела закупок</option>
                <option>CFO (финансовый директор)</option>
                <option>Оператор-учётчик</option>
              </select>
              <Input name="avatar" type="file" accept=".png,.jpg,.jpeg" onChange={handleChange} required />
              {avatarPreview && <AvatarPreview src={avatarPreview} alt="avatar" />}
            </>
          )}
          {error && <div style={{color:'#e74c3c',marginBottom:8,textAlign:'center'}}>{error}</div>}
          <Button type="submit">{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</Button>
        </form>
        <Link onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </Link>
      </FormBox>
    </Wrapper>
  );
}
