import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authStyles as styles } from './authStyles';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Bem-vindo!</h2>
      <p style={{ textAlign: 'center', marginBottom: '20px' }}>
        Olá, <strong>{user?.name || user?.email}</strong>.
      </p>
      <p style={{ textAlign: 'center', marginBottom: '20px', textTransform: 'capitalize' }}>
        Seu perfil: <strong>{user?.role}</strong>.
      </p>
      <p style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
        Você está logado no sistema.
      </p>
      <button onClick={handleLogout} style={{ ...styles.button, backgroundColor: '#dc3545', marginTop: '20px' }}>
        Sair da conta
      </button>
    </div>
  );
};

export default Dashboard;