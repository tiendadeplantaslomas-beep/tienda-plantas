import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UserProfileClient from './UserProfileClient';

export default async function ProfilePage() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('customer_session');

    if (!sessionCookie) {
        redirect('/tienda/login');
    }

    let sessionData;
    try {
        sessionData = JSON.parse(sessionCookie.value);
    } catch {
        redirect('/tienda/login');
    }

    const customer = await prisma.customer.findUnique({
        where: { id: sessionData.id },
    });

    if (!customer) {
        redirect('/tienda/login');
    }

    return <UserProfileClient initialCustomer={customer} />;
}