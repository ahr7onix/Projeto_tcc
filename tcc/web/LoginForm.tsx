import React, { useState } from 'react';
import { authStyles as styles } from './authStyles';

interface LoginFormProps {
  onSwitch: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitch }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Login attempt:', { email, password });
    alert(`Tentando conectar com: ${email}`);
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
        <button type="button" onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0, font: 'inherit' }}>
          Cadastre-se
        </button>
      </div>
    </form>
  );
};

export default LoginForm;