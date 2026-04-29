import React, { useState } from 'react';
import { authStyles as styles } from '../styles/authStyles';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const []

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
    </form>
  );
};

export default LoginForm;