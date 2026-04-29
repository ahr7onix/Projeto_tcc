import React, { useState } from 'react';
import { authStyles as styles } from './authStyles';

interface RegisterFormProps {
  onSwitch: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitch }) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    console.log('Register attempt:', { name, email, password });
    alert(`Conta criada para: ${name}`);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <h2 style={styles.title}>Criar Conta</h2>

      <div style={styles.inputGroup}>
        <label htmlFor="name" style={styles.label}>Nome Completo</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          required
          style={styles.input}
        />
      </div>

      <div style={styles.inputGroup}>
        <label htmlFor="reg-email" style={styles.label}>E-mail</label>
        <input
          type="email"
          id="reg-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          style={styles.input}
        />
      </div>

      <div style={styles.inputGroup}>
        <label htmlFor="reg-password" style={styles.label}>Senha</label>
        <input
          type="password"
          id="reg-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
          required
          style={styles.input}
        />
      </div>

      <div style={{ ...styles.inputGroup, marginBottom: '24px' }}>
        <label htmlFor="confirm-password" style={styles.label}>Confirmar Senha</label>
        <input
          type="password"
          id="confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="********"
          required
          style={styles.input}
        />
      </div>

      <button type="submit" style={styles.button}>
        Cadastrar
      </button>

      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
        Já tem uma conta?{' '}
        <button type="button" onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0, font: 'inherit' }}>
          Faça Login
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;