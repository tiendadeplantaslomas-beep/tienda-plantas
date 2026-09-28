import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Por favor, ingresa correo y contraseña.");
                }

                // Buscamos al usuario/personal en la tabla Customer
                const user = await prisma.customer.findUnique({
                    where: { email: credentials.email }
                });

                if (!user) {
                    throw new Error("Usuario no encontrado.");
                }

                // Validamos la contraseña con bcrypt
                const isValid = await bcrypt.compare(credentials.password, user.password_hash);
                if (!isValid) {
                    throw new Error("Contraseña incorrecta.");
                }

                // Devolvemos el usuario con su rol, nombre e imagen de la base de datos
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    image: user.image_url // 👈 Incluimos la foto para que viaje en la sesión inicial
                };
            }
        })
    ],
    secret: "UnaFraseUltraSecretaYOlgaParaElVivero2026!",
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    pages: {
        signIn: "/login"
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Cuando inicia sesión por primera vez
            if (user) {
                token.role = (user as any).role;
                token.image = (user as any).image;
            }

            // 👇 Captura la actualización en caliente enviada desde el perfil
            if (trigger === "update") {
                if (session?.name) token.name = session.name;
                if (session?.image) token.image = session.image;
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                session.user.image = token.image as string; // 👈 Asigna la imagen actualizada
                session.user.name = token.name as string;   // 👈 Asigna el nombre actualizado
            }
            return session;
        }
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };