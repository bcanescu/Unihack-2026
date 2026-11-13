import { Redirect } from 'expo-router';

// Ruta „/” pentru utilizatorii nelogați duce direct la login.
export default function AuthIndex() {
  return <Redirect href="/login" />;
}
