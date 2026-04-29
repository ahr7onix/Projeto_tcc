import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { authStyles as styles } from './authStyles';

const App: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);

  return (
    <div style={styles.wrapper}>
      {isLogin ? (
        <LoginForm onSwitch={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onSwitch={() => setIsLogin(true)} />
      )}
    </div>
  );
};

export default App;
