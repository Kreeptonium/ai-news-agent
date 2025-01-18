import { FC } from 'react';
import LoginForm from '@/components/auth/LoginForm';

const LoginPage: FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
};

export default LoginPage;