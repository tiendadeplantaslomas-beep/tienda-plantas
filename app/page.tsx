import { redirect } from 'next/navigation';

export default function HomePage() {
    // Redirige automáticamente al usuario a la pantalla de Login
    redirect('/login');
}