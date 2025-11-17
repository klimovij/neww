import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import { Button, Input } from '../../styles/GlobalStyles';
import api from '../../services/api';

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoginForm = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
  animation: slideUp 0.5s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
  font-weight: 300;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const SwitchText = styled.p`
  text-align: center;
  margin-top: 1rem;
  color: #666;
`;

const SwitchLink = styled.span`
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: #5a6fd8;
  }
`;

const ErrorMessage = styled.div`
  background: #e74c3c;
  color: white;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 1rem;
  text-align: center;
`;

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const response = await api.post(endpoint, formData);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      dispatch({ 
        type: 'SET_USER', 
        payload: { ...response.data.user, token: response.data.token } 
      });
      // После успешного входа/регистрации — переход на главную
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.error || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <LoginContainer>
      <LoginForm>
        <Title>{isLogin ? 'Добро пожаловать' : 'Регистрация'}</Title>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Input
              type="text"
              name="username"
              placeholder="Имя пользователя"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Input
              type="password"
              name="password"
              placeholder="Пароль"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </FormGroup>
          
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </Button>
        </form>
        
        <SwitchText>
          {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <SwitchLink onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </SwitchLink>
        </SwitchText>
      </LoginForm>
    </LoginContainer>
  );
}