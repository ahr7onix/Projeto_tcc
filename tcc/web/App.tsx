import React from 'react';
import LoginForm from './src/components/LoginForm';
import { authStyles as styles } from './src/styles/authStyles';

const App: React.FC = () => {
  return (
    <div style={styles.wrapper}>
      <LoginForm />
    </div>
  );
};

export default App;
