import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 16px #fcb69f33, 0 0 0 2px #e74c3c44;
  margin: 12px;
  padding: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;
const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 6px 6px 12px 6px;
`;
const SearchInput = styled.input`
  flex: 1;
  min-width: 140px;
  border-radius: 10px;
  border: 1.5px solid #2193b0;
  padding: 8px 12px;
`;
const Select = styled.select`
  border-radius: 10px;
  border: 1.5px solid #2193b0;
  padding: 8px 10px;
  background: #fff;
`;
const UserRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px;
  border-bottom: 1px solid #eee;
`;
const UserName = styled.span`
  font-weight: 500;
  color: #222;
`;
const RoleBadge = styled.span`
  margin-left: 8px;
  border-radius: 10px;
  padding: 2px 8px;
  font-weight: 700;
  font-size: 0.82em;
  color: #fff;
  background: ${props => props.role === 'admin' ? '#8e44ad' : props.role === 'hr' ? '#e67e22' : '#7f8c8d'};
`;
const RoleBtn = styled.button`
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 6px 18px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 12px;
  &:hover { background: #fcb69f; color: #222; }
`;
const Rows = styled.div`
  flex: 1;
  overflow-y: auto;
  border-radius: 12px;
  background: #fafbfc;
`;

export default function AllUsers({ token, isAdmin }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const departments = [
    'Оператор колл-центра',
    'Менеджер отдела возвратов',
    'Менеджер склада',
    'Финансовый менеджер',
    'Бухгалтер по первичной документации'
  ];

  useEffect(() => {
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(Array.isArray ? setUsers : (data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, [token]);

  const currentUserObj = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const currentUserId = currentUserObj?.id || null;
  const currentUserRoleRaw = String(currentUserObj?.role || '').trim().toLowerCase();
  const isAdminRole = currentUserRoleRaw === 'admin';
  const isHrRole = currentUserRoleRaw === 'hr';

  const refetch = () => {
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const setDepartment = async (id, department) => {
    try {
      const res = await fetch(`/api/users/${id}/department`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ department })
      });
      const ok = res.ok;
      if (!ok) throw new Error('bad status');
      // optimistic refresh
      refetch();
    } catch (_) {
      // Fallback: optimistic local update
      setUsers(prev => (Array.isArray(prev) ? prev.map(u => (u.id === id ? { ...u, department } : u)) : prev));
    }
  };

  const setRole = (id, role) => {
    fetch(`/api/users/${id}/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          if (res.token) {
            localStorage.setItem('token', res.token);
            // Обновляем информацию о пользователе в localStorage
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...currentUser, token: res.token };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
          alert('Роль успешно изменена!');
        } else {
          alert('Ошибка: ' + (res.error || 'Не удалось изменить роль'));
        }
        refetch();
      })
      .catch(() => alert('Ошибка сети'));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (Array.isArray(users) ? users : [])
      .filter(u => !q || (u.username || '').toLowerCase().includes(q))
      .filter(u => roleFilter === 'all' ? true : (String(u.role || '') === roleFilter));
  }, [users, search, roleFilter]);

  return (
    <Container>
      <Toolbar>
        <SearchInput
          placeholder="Поиск пользователя..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} title="Фильтр по роли">
          <option value="all">Все роли</option>
          <option value="admin">Админы</option>
          <option value="hr">HR</option>
          <option value="user">Пользователи</option>
        </Select>
      </Toolbar>
      <Rows>
        {filtered.map(u => (
          <UserRow key={u.id}>
            <div style={{display:'flex',alignItems:'center'}}>
              <UserName>{u.username}</UserName>
              <RoleBadge role={String(u.role || 'user')}>{String(u.role || 'user').toUpperCase()}</RoleBadge>
              {u.department && (
                <span style={{
                  marginLeft: 8,
                  borderRadius: 10,
                  padding: '2px 8px',
                  fontWeight: 700,
                  fontSize: '0.76em',
                  color: '#111',
                  background: '#ffe082'
                }}>{u.department}</span>
              )}
            </div>
            <div>
              {u.id !== currentUserId && (
                <>
                  {isAdminRole && (
                    <>
                      {String(u.role) !== 'admin' && (
                        <RoleBtn onClick={() => setRole(u.id, 'admin')}>Сделать админом</RoleBtn>
                      )}
                      {String(u.role) !== 'hr' && (
                        <RoleBtn onClick={() => setRole(u.id, 'hr')}>Назначить HR</RoleBtn>
                      )}
                      {String(u.role) !== 'user' && (
                        <RoleBtn onClick={() => setRole(u.id, 'user')}>Сделать пользователем</RoleBtn>
                      )}
                      <select
                        value={u.department || ''}
                        onChange={e => setDepartment(u.id, e.target.value)}
                        title="Департамент (права уровня user)"
                        style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 10, border: '1px solid #ccc' }}
                      >
                        <option value="">Без отдела</option>
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </>
                  )}
                  {!isAdminRole && isHrRole && (
                    <>
                      {String(u.role) === 'user' && (
                        <RoleBtn onClick={() => setRole(u.id, 'hr')}>Назначить HR</RoleBtn>
                      )}
                      {String(u.role) === 'hr' && (
                        <RoleBtn onClick={() => setRole(u.id, 'user')}>Сделать пользователем</RoleBtn>
                      )}
                      <select
                        value={u.department || ''}
                        onChange={e => setDepartment(u.id, e.target.value)}
                        title="Департамент (права уровня user)"
                        style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 10, border: '1px solid #ccc' }}
                      >
                        <option value="">Без отдела</option>
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </>
                  )}
                </>
              )}
            </div>
          </UserRow>
        ))}
      </Rows>
    </Container>
  );
}
