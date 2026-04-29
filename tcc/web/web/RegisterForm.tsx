import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authStyles as styles } from './authStyles';

const RegisterForm: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [role, setRole] = useState<'patient' | 'nutritionist' | 'administrator'>('patient'); // Novo estado para o papel
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    login(email, role, name); // Passando o papel selecionado
    navigate('/dashboard');
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

      <div style={styles.inputGroup}>
        <label htmlFor="role" style={styles.label}>Tipo de Usuário</label>
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
        Cadastrar
      </button>

      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
        Já tem uma conta?{' '}
        <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
          Faça Login
        </Link>
      </div>
    </form>
  );
};

export default RegisterForm;