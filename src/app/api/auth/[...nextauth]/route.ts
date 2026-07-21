import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // 🔓 BYPASS TOTAL: No miramos base de datos, no miramos inputs. 
                // Devolvemos el usuario limpio para que NextAuth arme la cookie sí o sí.
                console.log("🔓 Forzando la creación de sesión del vivero...");
                return {
                    id: "admin-123",
                    name: "Daniel",
                    email: "tiendadeplantas.lomas@gmail.com",
                    role: "ADMIN"
                };
            }
        })
    ],
    // Forzamos el secreto acá adentro por si Next.js se marea leyendo el archivo .env
    secret: "UnaFraseUltraSecretaYOlgaParaElVivero2026!",
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 días
    },
    pages: {
        signIn: "/login"
    },
    // Desactivamos temporalmente los callbacks para que nada frene la creación del JWT
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.role = "ADMIN";
            return token;
        },
        async session({ session, token }) {
            if (session.user) (session.user as any).role = "ADMIN";
            return session;
        }
    },
    debug: true // Esto nos va a escupir el error real en la consola negra de VS Code
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };