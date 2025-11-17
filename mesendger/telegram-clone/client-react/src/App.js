import React, { useEffect } from 'react';
import { playNotificationSound } from './utils/notificationSound';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { SystemTimeProvider } from './context/SystemTimeContext';
import SocketProvider from './components/SocketProvider';
import { GlobalStyles, Container } from './styles/GlobalStyles';
import AuthForm from './components/AuthForm';
import Messenger from './components/Messenger';
import { StyleSheetManager } from 'styled-components';

// Error Boundary для обработки ошибок React
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          background: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px',
          margin: '20px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '10px' }}>Что-то пошло не так</h2>
          <p style={{ color: '#6c757d', marginBottom: '15px' }}>
            Произошла ошибка в приложении. Попробуйте обновить страницу.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Обновить страницу
          </button>
          <details style={{ marginTop: '15px' }}>
            <summary style={{ cursor: 'pointer', color: '#6c757d' }}>Детали ошибки</summary>
            <pre style={{ 
              background: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              marginTop: '10px'
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { state } = useApp();

  useEffect(() => {
    // Тестовый вызов звука при монтировании компонента
    playNotificationSound();
  }, []);

  // Пинги использования приложения: старт при входе, стоп при закрытии
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/app-usage/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ event: 'start' })
      }).catch(() => {});
    }

    const onClose = () => {
      const tk = localStorage.getItem('token');
      if (!tk) return;
      try {
        fetch('/api/app-usage/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tk}` },
          body: JSON.stringify({ event: 'stop' }),
          keepalive: true
        }).catch(() => {});
      } catch {}
    };

    window.addEventListener('beforeunload', onClose);
    window.addEventListener('pagehide', onClose);
    const onVis = () => {
      if (document.visibilityState === 'hidden') onClose();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('beforeunload', onClose);
      window.removeEventListener('pagehide', onClose);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [state.isAuthenticated]);

  if (!state.isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <SocketProvider>
      <Container>
        <Messenger />
      </Container>
    </SocketProvider>
  );
}

// Глобальная фильтрация пропсов для styled-components
const shouldForwardProp = (prop, defaultValidatorFn) => {
  // Фильтруем кастомные пропсы, которые не должны попадать в DOM
  const customProps = ['active', 'selected', 'online', 'clickable', 'show', 'isGroup'];
  if (customProps.includes(prop)) {
    return false;
  }
  // Для остальных пропсов используем стандартную валидацию или возвращаем true
  return typeof defaultValidatorFn === 'function' ? defaultValidatorFn(prop) : true;
};

function App() {
  return (
    <ErrorBoundary>
      <StyleSheetManager shouldForwardProp={shouldForwardProp}>
        <Router>
          <SystemTimeProvider>
            <AppProvider>
              <GlobalStyles />
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </AppProvider>
          </SystemTimeProvider>
        </Router>
      </StyleSheetManager>
    </ErrorBoundary>
  );
}

export default App;