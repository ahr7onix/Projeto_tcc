import { Redirect } from 'expo-router';

export default function LoginIndexRedirect() {
  return <Redirect href="/(auth)" />;
}
