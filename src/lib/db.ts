import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const prisma = {
    user: {
        findUnique: async ({ where }: { where: { email: string } }) => {
            const client = await pool.connect();
            try {
                // 1. Buscamos el usuario de forma tolerante a mayúsculas/minúsculas en el nombre de la tabla
                let res;
                try {
                    res = await client.query('SELECT * FROM "User" WHERE email = $1 LIMIT 1', [where.email]);
                } catch {
                    res = await client.query('SELECT * FROM "user" WHERE email = $1 LIMIT 1', [where.email]);
                }

                // 🌟 SI NO EXISTE: Lo insertamos adaptándonos a la estructura existente
                if (res.rows.length === 0 && where.email === 'tiendadeplantas.lomas@gmail.com') {
                    console.log("➡️ Inyectando administrador del vivero...");
                    const hashAdmin = '$2b$10$7R6Mh9bWpX7hO6p8kX4uE.mUvGvY8zYJ5lQ6wGzWvO3e2fR1s2t3u'; // 'ViveroAdmin2026!'

                    try {
                        // Intento 1: Campos estándar (id, name, email, password, activo, role)
                        await client.query(
                            'INSERT INTO "User" (id, name, email, password, activo, role) VALUES ($1, $2, $3, $4, $5, $6)',
                            ['admin-123', 'Daniel', 'tiendadeplantas.lomas@gmail.com', hashAdmin, true, 'ADMIN']
                        );
                    } catch {
                        try {
                            // Intento 2: Campos en español/alternativos (id, nombre, email, "passwordHash", activo, role)
                            await client.query(
                                'INSERT INTO "User" (id, nombre, email, "passwordHash", activo, role) VALUES ($1, $2, $3, $4, $5, $6)',
                                ['admin-123', 'Daniel', 'tiendadeplantas.lomas@gmail.com', hashAdmin, true, 'ADMIN']
                            );
                        } catch {
                            // Intento 3: Tabla en minúscula "user"
                            await client.query(
                                'INSERT INTO "user" (id, nombre, email, password, activo, role) VALUES ($1, $2, $3, $4, $5, $6)',
                                ['admin-123', 'Daniel', 'tiendadeplantas.lomas@gmail.com', hashAdmin, true, 'ADMIN']
                            );
                        }
                    }

                    // Volvemos a consultar tras la inserción exitosa
                    try {
                        res = await client.query('SELECT * FROM "User" WHERE email = $1 LIMIT 1', [where.email]);
                    } catch {
                        res = await client.query('SELECT * FROM "user" WHERE email = $1 LIMIT 1', [where.email]);
                    }
                }

                const user = res.rows[0];
                if (!user) return null;

                // Mapeo ultra seguro: agarra cualquier variante de columna que use tu Postgres
                return {
                    id: user.id,
                    nombre: user.name || user.nombre || 'Daniel',
                    email: user.email,
                    passwordHash: user.password || user.passwordhash || user.passwordHash || user.password_hash,
                    activo: user.activo ?? true,
                    role: user.role || 'ADMIN'
                };
            } catch (err) {
                console.error("Error crítico en consulta db:", err);
                return null;
            } finally {
                client.release();
            }
        }
    }
};