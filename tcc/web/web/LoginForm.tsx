import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authStyles as styles } from './authStyles';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<'patient' | 'nutritionist' | 'administrator'>('patient');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Na vida real, o servidor diria qual o papel deste e-mail. Aqui nós escolhemos para testar.
    login(email, role);
    navigate('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <h2 style={styles.title}>Login</h2>

      <div style={styles.inputGroup}>
        <label htmlFor="email" style={styles.label}>E-mail</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          style={styles.input}
        />
      </div>

      <div style={{ ...styles.inputGroup, marginBottom: '24px' }}>
        <label htmlFor="password" style={styles.label}>Senha</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
          required
          style={styles.input}
        />
      </div>

      <div style={styles.inputGroup}>
        <label htmlFor="role" style={styles.label}>Entrar como</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'patient' | 'nutritionist' | 'administrator')}
          required
          style={styles.input}
        >
          <option value="patient">Paciente</option>
          <option value="nutritionist">Nutricionista</option>
          <option value="administrator">Administrador</option>
        </select>
      </div>

      <button type="submit" style={styles.button}>
        Entrar
      </button>
      
      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
        <a href="#" style={{ color: '#007bff', textDecoration: 'none' }}>
          Esqueceu a senha?
        </a>
      </div>

      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
        Não tem uma conta?{' '}
        <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>
          Cadastre-se
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;