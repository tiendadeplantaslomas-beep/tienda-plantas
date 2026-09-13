import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

export const prisma: any = {
    user: {
        findUnique: async ({ where }: { where: { email: string } }) => {
            const connection = await pool.getConnection();
            try {
                const [rows]: any = await connection.execute(
                    'SELECT * FROM `User` WHERE email = ? LIMIT 1',
                    [where.email]
                );
                const user = rows[0];
                if (!user) return null;

                return {
                    id: user.id,
                    nombre: user.name || user.nombre || 'Daniel',
                    email: user.email,
                    passwordHash: user.password || user.passwordhash || user.passwordHash || user.password_hash,
                    activo: user.activo ?? true,
                    role: user.role || 'ADMIN'
                };
            } catch (err) {
                console.error("Error en db user:", err);
                return null;
            } finally {
                connection.release();
            }
        }
    },
    customer: {
        findMany: async (args?: any) => {
            const connection = await pool.getConnection();
            try {
                let sql = 'SELECT * FROM `Customer`';
                const params: any[] = [];

                if (args?.where?.OR) {
                    const conditions = args.where.OR.map((cond: any) => {
                        const key = Object.keys(cond)[0];
                        params.push(`%${cond[key].contains}%`);
                        return `\`${key}\` LIKE ?`;
                    });
                    sql += ` WHERE ${conditions.join(' OR ')}`;
                }

                const orderDir = args?.orderBy?.name || 'asc';
                sql += ` ORDER BY \`name\` ${orderDir}`;

                if (args?.take) {
                    sql += ` LIMIT ${Number(args.take)}`;
                }

                const [rows]: any = await connection.execute(sql, params);
                return rows.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    email: c.email || null,
                    address: c.address || null,
                    phone: c.phone || null,
                    dni_cuit: c.dni_cuit || null,
                    gender: c.gender || 'neutral',
                    image_url: c.image_url || null,
                    origin: c.origin || 'backend',
                    createdAt: c.createdAt || new Date()
                }));
            } catch (err) {
                console.error("Error al listar clientes:", err);
                return [];
            } finally {
                connection.release();
            }
        },
        findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
            const connection = await pool.getConnection();
            try {
                let query = 'SELECT * FROM `Customer` WHERE ';
                let param = '';
                if (where.email) {
                    query += 'email = ? LIMIT 1';
                    param = where.email;
                } else if (where.id) {
                    query += 'id = ? LIMIT 1';
                    param = where.id;
                } else {
                    return null;
                }
                const [rows]: any = await connection.execute(query, [param]);
                return rows[0] || null;
            } catch (err) {
                console.error("Error en customer findUnique:", err);
                return null;
            } finally {
                connection.release();
            }
        },
        create: async ({ data }: { data: any }) => {
            const connection = await pool.getConnection();
            try {
                const newId = 'cust-' + Date.now();
                const name = data.name;
                const email = data.email || null;
                const phone = data.phone || null;
                const address = data.address || null;
                const password_hash = data.password_hash || data.passwordHash || null;
                const dni_cuit = data.dni_cuit || null;
                const gender = data.gender || 'neutral';
                const image_url = data.image_url || data.imageUrl || null;
                const origin = data.origin || 'backend';

                await connection.execute(
                    'INSERT INTO `Customer` (id, name, email, phone, address, password_hash, dni_cuit, origin, gender, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [newId, name, email, phone, address, password_hash, dni_cuit, origin, gender, image_url]
                );
                return { id: newId, name, email, phone, address, dni_cuit, origin, gender, image_url };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        },
        update: async ({ where, data }: { where: { id: string }; data: any }) => {
            const connection = await pool.getConnection();
            try {
                const customerId = where.id;
                const fields: string[] = [];
                const values: any[] = [];

                if (data.gender !== undefined) { fields.push('gender = ?'); values.push(data.gender); }
                if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
                if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
                if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }

                if (fields.length > 0) {
                    values.push(customerId);
                    await connection.execute(`UPDATE \`Customer\` SET ${fields.join(', ')} WHERE id = ?`, values);
                }

                const [rows]: any = await connection.execute('SELECT * FROM `Customer` WHERE id = ? LIMIT 1', [customerId]);
                return rows[0] || null;
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    product: {
        findUnique: async ({ where }: { where: { id: string } }) => {
            const connection = await pool.getConnection();
            try {
                const [rows]: any = await connection.execute('SELECT * FROM `Product` WHERE id = ? LIMIT 1', [where.id]);
                const p = rows[0];
                if (!p) return null;
                return {
                    ...p,
                    trackStock: p.trackStock !== undefined ? Boolean(p.trackStock) : true,
                    stock: Number(p.stock || 0)
                };
            } catch (err) {
                console.error("Error en product findUnique:", err);
                return null;
            } finally {
                connection.release();
            }
        },
        update: async ({ where, data }: { where: { id: string }; data: any }) => {
            const connection = await pool.getConnection();
            try {
                const productId = where.id;
                if (data?.stock !== undefined && typeof data.stock === 'number') {
                    await connection.execute('UPDATE `Product` SET stock = ? WHERE id = ?', [data.stock, productId]);
                }
                return { id: productId, ...data };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    sale: {
        findMany: async (args?: any) => {
            const connection = await pool.getConnection();
            try {
                let sql = 'SELECT * FROM `Sale`';
                const params: any[] = [];
                if (args?.where?.createdAt) {
                    sql += ' WHERE `createdAt` >= ? AND `createdAt` <= ?';
                    params.push(args.where.createdAt, args.where.lte);
                }
                sql += ' ORDER BY `createdAt` DESC';
                const [sales]: any = await connection.execute(sql, params);
                const result = [];
                for (const s of sales) {
                    const [items]: any = await connection.execute('SELECT * FROM `SaleItem` WHERE saleId = ?', [s.id]);
                    result.push({
                        ...s,
                        isPaid: Boolean(s.isPaid),
                        total: Number(s.total),
                        items
                    });
                }
                return result;
            } catch (err) {
                console.error("Error al listar ventas:", err);
                return [];
            } finally {
                connection.release();
            }
        },
        create: async ({ data }: { data: any }) => {
            const connection = await pool.getConnection();
            try {
                const saleId = 'sale-' + Date.now();
                await connection.execute(
                    `INSERT INTO \`Sale\` (
                        id, total, paidAmount, pendingBalance, status, isPaid, 
                        paymentStatus, paymentMethod, paymentReference, 
                        isShipping, shippingAddress, channel, invoiced, 
                        customerId, customerName, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        saleId,
                        data.total,
                        data.paidAmount || 0,
                        data.pendingBalance || 0,
                        data.status || 'REGISTRADO',
                        data.isPaid ? 1 : 0,
                        data.paymentStatus || 'PENDIENTE',
                        data.paymentMethod || 'EFECTIVO',
                        data.paymentReference || null,
                        data.isShipping ? 1 : 0,
                        data.shippingAddress || '',
                        data.channel || 'POS',
                        data.invoiced ? 1 : 0,
                        data.customerId || null,
                        data.customerName || 'CLIENTE MOSTRADOR',
                        data.notes || null
                    ]
                );

                if (data.items?.create) {
                    for (const item of data.items.create) {
                        const itemId = 'sitem-' + Math.random().toString(36).substring(2, 9);
                        await connection.execute(
                            'INSERT INTO `SaleItem` (id, saleId, productId, quantity, price) VALUES (?, ?, ?, ?, ?)',
                            [itemId, saleId, item.productId, item.quantity, item.price]
                        );
                    }
                }

                const [newSaleRows]: any = await connection.execute('SELECT * FROM `Sale` WHERE id = ?', [saleId]);
                return { ...newSaleRows[0], id: saleId };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    payment: {
        create: async ({ data }: { data: any }) => {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                const paymentId = 'pay-' + Date.now();
                const targetSaleId = data.saleId || data.orderId;
                const paymentAmount = Number(data.amount || data.monto || 0);
                const method = data.paymentMethod || data.metodo || 'EFECTIVO';
                const ref = data.reference || data.referencia || '';
                const notes = data.notes || '';

                console.log("🔍 [DEBUG PAYMENT] Buscando venta ID:", targetSaleId);

                if (!targetSaleId) {
                    throw new Error('Falta el ID de la venta (saleId)');
                }

                // 1. Intentar buscar por coincidencia exacta o parcial
                let [saleRows]: any = await connection.execute(
                    'SELECT id, total, paidAmount FROM `Sale` WHERE id = ? OR id LIKE ?',
                    [targetSaleId, `%${targetSaleId}%`]
                );

                // 2. Si no se encuentra por ID, usamos la última venta creada como respaldo automático
                if (saleRows.length === 0) {
                    console.warn(`⚠️ [DEBUG PAYMENT] ID "${targetSaleId}" no encontrado exactamente. Usando la última venta registrada como respaldo.`);
                    [saleRows] = await connection.execute(
                        'SELECT id, total, paidAmount FROM `Sale` ORDER BY createdAt DESC LIMIT 1'
                    );
                }

                if (saleRows.length === 0) {
                    throw new Error('No se encontró ninguna venta en la base de datos para aplicar el pago.');
                }

                // Usamos el ID real de la venta encontrada
                const sale = saleRows[0];
                const matchedSaleId = sale.id;

                await connection.execute(
                    `INSERT INTO \`Payment\` (id, saleId, customerId, amount, paymentMethod, reference, notes) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [paymentId, matchedSaleId, data.customerId || null, paymentAmount, method, ref, notes]
                );

                const newPaidAmount = Number(sale.paidAmount || 0) + paymentAmount;
                const newPendingBalance = Math.max(0, Number(sale.total) - newPaidAmount);
                const newIsPaid = newPendingBalance <= 0 ? 1 : 0;
                const newPaymentStatus = newPendingBalance <= 0 ? 'PAGADO' : 'PARCIAL';

                await connection.execute(
                    `UPDATE \`Sale\` 
                     SET paidAmount = ?, pendingBalance = ?, isPaid = ?, paymentStatus = ? 
                     WHERE id = ?`,
                    [newPaidAmount, newPendingBalance, newIsPaid, newPaymentStatus, matchedSaleId]
                );

                await connection.commit();
                return { id: paymentId, ...data };
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    stockMovement: {
        create: async ({ data }: { data: any }) => {
            const connection = await pool.getConnection();
            try {
                const id = 'smov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
                await connection.execute(
                    'INSERT INTO `StockMovement` (id, productId, quantity, type, notes, previousStock, newStock) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [id, data.productId, data.quantity, data.type, data.notes || '', data.previousStock, data.newStock]
                );
                return { id, ...data };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },

    // ==========================================
    // MÓDULOS DE PROMOCIONES, BANNERS, CAMPAÑAS Y USUARIOS
    // ==========================================
    promotion: {
        findMany: async (args?: any) => {
            const connection = await pool.getConnection();
            try {
                let sql = 'SELECT * FROM `Promotion`';
                const params: any[] = [];
                if (args?.where?.activa !== undefined) {
                    sql += ' WHERE activa = ?';
                    params.push(args.where.activa ? 1 : 0);
                }
                if (args?.orderBy?.id === 'desc' || args?.orderBy?.id === 'DESC') {
                    sql += ' ORDER BY id DESC';
                }
                const [rows]: any = await connection.execute(sql, params);
                return rows.map((r: any) => ({
                    ...r,
                    activa: Boolean(r.activa)
                }));
            } catch (err) {
                console.error("Error al listar promotions:", err);
                return [];
            } finally {
                connection.release();
            }
        },
        create: async ({ data }: { data: any }) => {
            const connection = await pool.getConnection();
            try {
                const [result]: any = await connection.execute(
                    'INSERT INTO `Promotion` (titulo, descripcion, badge, linkWhatsapp, activa, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                    [data.titulo, data.descripcion || '', data.badge || '', data.linkWhatsapp || '', data.activa ?? true ? 1 : 0]
                );
                return { id: result.insertId, ...data };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        },
        update: async ({ where, data }: { where: { id: number }; data: any }) => {
            const connection = await pool.getConnection();
            try {
                const fields: string[] = [];
                const values: any[] = [];

                if (data.activa !== undefined) { fields.push('activa = ?'); values.push(data.activa ? 1 : 0); }
                if (data.titulo !== undefined) { fields.push('titulo = ?'); values.push(data.titulo); }
                if (data.descripcion !== undefined) { fields.push('descripcion = ?'); values.push(data.descripcion); }
                if (data.badge !== undefined) { fields.push('badge = ?'); values.push(data.badge); }
                if (data.linkWhatsapp !== undefined) { fields.push('linkWhatsapp = ?'); values.push(data.linkWhatsapp); }

                fields.push('updatedAt = NOW()');

                if (fields.length > 0) {
                    values.push(where.id);
                    await connection.execute(`UPDATE \`Promotion\` SET ${fields.join(', ')} WHERE id = ?`, values);
                }

                const [rows]: any = await connection.execute('SELECT * FROM `Promotion` WHERE id = ? LIMIT 1', [where.id]);
                return rows[0] ? { ...rows[0], activa: Boolean(rows[0].activa) } : null;
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    banner: {
        findMany: async (args?: any) => {
            const connection = await pool.getConnection();
            try {
                let sql = 'SELECT * FROM `Banner`';
                const params: any[] = [];
                if (args?.where?.activo !== undefined) {
                    sql += ' WHERE activo = ?';
                    params.push(args.where.activo ? 1 : 0);
                }
                if (args?.orderBy?.orden === 'asc' || args?.orderBy?.orden === 'ASC') {
                    sql += ' ORDER BY orden ASC';
                }
                const [rows]: any = await connection.execute(sql, params);
                return rows.map((r: any) => ({
                    ...r,
                    activo: Boolean(r.activo)
                }));
            } catch (err) {
                console.error("Error al listar banners:", err);
                return [];
            } finally {
                connection.release();
            }
        },
        create: async ({ data }: { data: any }) => {
            const connection = await pool.getConnection();
            try {
                const [result]: any = await connection.execute(
                    'INSERT INTO `Banner` (titulo, subtitulo, imagenUrl, link, badge, orden, activo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [data.titulo, data.subtitulo || '', data.imagenUrl, data.link || '', data.badge || '', data.orden ?? 0, data.activo ?? true ? 1 : 0]
                );
                return { id: result.insertId, ...data };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        },
        update: async ({ where, data }: { where: { id: number }; data: any }) => {
            const connection = await pool.getConnection();
            try {
                if (data.activo !== undefined) {
                    await connection.execute('UPDATE `Banner` SET activo = ?, updatedAt = NOW() WHERE id = ?', [data.activo ? 1 : 0, where.id]);
                }
                const [rows]: any = await connection.execute('SELECT * FROM `Banner` WHERE id = ? LIMIT 1', [where.id]);
                return rows[0] || null;
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    campaign: {
        findMany: async (args?: any) => {
            const connection = await pool.getConnection();
            try {
                let sql = 'SELECT * FROM `Campaign`';
                const params: any[] = [];
                if (args?.where?.activo !== undefined) {
                    sql += ' WHERE activo = ?';
                    params.push(args.where.activo ? 1 : 0);
                }
                if (args?.orderBy?.id === 'desc' || args?.orderBy?.id === 'DESC') {
                    sql += ' ORDER BY id DESC';
                }
                const [rows]: any = await connection.execute(sql, params);
                return rows.map((r: any) => ({
                    ...r,
                    activo: Boolean(r.activo)
                }));
            } catch (err) {
                console.error("Error al listar campaigns:", err);
                return [];
            } finally {
                connection.release();
            }
        },
        create: async ({ data }: { data: any }) => {
            const connection = await pool.getConnection();
            try {
                const [result]: any = await connection.execute(
                    'INSERT INTO `Campaign` (titulo, descripcion, imagenUrl, etiqueta, tipo, activo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [data.titulo, data.descripcion || '', data.imagenUrl || '', data.etiqueta || '', data.tipo || 'verde', data.activo ?? true ? 1 : 0]
                );
                return { id: result.insertId, ...data };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        },
        update: async ({ where, data }: { where: { id: number }; data: any }) => {
            const connection = await pool.getConnection();
            try {
                if (data.activo !== undefined) {
                    await connection.execute('UPDATE `Campaign` SET activo = ?, updatedAt = NOW() WHERE id = ?', [data.activo ? 1 : 0, where.id]);
                }
                const [rows]: any = await connection.execute('SELECT * FROM `Campaign` WHERE id = ? LIMIT 1', [where.id]);
                return rows[0] || null;
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    usuario: {
        findMany: async (args?: any) => {
            const connection = await pool.getConnection();
            try {
                let sql = 'SELECT * FROM `Usuario`';
                const params: any[] = [];
                if (args?.where?.activo !== undefined) {
                    sql += ' WHERE activo = ?';
                    params.push(args.where.activo ? 1 : 0);
                }
                const [rows]: any = await connection.execute(sql, params);
                return rows.map((r: any) => ({
                    ...r,
                    activo: Boolean(r.activo)
                }));
            } catch (err) {
                console.error("Error al listar usuarios:", err);
                return [];
            } finally {
                connection.release();
            }
        },
        create: async ({ data }: { data: any }) => {
            const connection = await pool.getConnection();
            try {
                const [result]: any = await connection.execute(
                    'INSERT INTO `Usuario` (nombre, email, password, rol, activo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                    [data.nombre, data.email, data.password, data.rol || 'CAJERO', data.activo ?? true ? 1 : 0]
                );
                return { id: result.insertId, ...data };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        },
        update: async ({ where, data }: { where: { id: number }; data: any }) => {
            const connection = await pool.getConnection();
            try {
                if (data.activo !== undefined) {
                    await connection.execute('UPDATE `Usuario` SET activo = ?, updatedAt = NOW() WHERE id = ?', [data.activo ? 1 : 0, where.id]);
                }
                const [rows]: any = await connection.execute('SELECT * FROM `Usuario` WHERE id = ? LIMIT 1', [where.id]);
                return rows[0] || null;
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    // ==========================================

    $transaction: async (callback: (tx: any) => Promise<any>) => {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            const tx = {
                product: {
                    findUnique: async ({ where }: { where: { id: string } }) => {
                        const [rows]: any = await connection.execute('SELECT * FROM `Product` WHERE id = ? LIMIT 1', [where.id]);
                        const p = rows[0];
                        if (!p) return null;
                        return {
                            ...p,
                            trackStock: p.trackStock !== undefined ? Boolean(p.trackStock) : true,
                            stock: Number(p.stock || 0)
                        };
                    },
                    update: async ({ where, data }: { where: { id: string }; data: any }) => {
                        const productId = where.id;
                        if (data?.stock !== undefined && typeof data.stock === 'number') {
                            await connection.execute('UPDATE `Product` SET stock = ? WHERE id = ?', [data.stock, productId]);
                        }
                        return { id: productId, ...data };
                    }
                },
                sale: {
                    create: async ({ data }: { data: any }) => {
                        const saleId = 'sale-' + Date.now();
                        await connection.execute(
                            `INSERT INTO \`Sale\` (
                                id, total, paidAmount, pendingBalance, status, isPaid, 
                                paymentStatus, paymentMethod, paymentReference, 
                                isShipping, shippingAddress, channel, invoiced, 
                                customerId, customerName, notes
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                saleId,
                                data.total,
                                data.paidAmount || 0,
                                data.pendingBalance || 0,
                                data.status || 'REGISTRADO',
                                data.isPaid ? 1 : 0,
                                data.paymentStatus || 'PENDIENTE',
                                data.paymentMethod || 'EFECTIVO',
                                data.paymentReference || null,
                                data.isShipping ? 1 : 0,
                                data.shippingAddress || '',
                                data.channel || 'POS',
                                data.invoiced ? 1 : 0,
                                data.customerId || null,
                                data.customerName || 'CLIENTE MOSTRADOR',
                                data.notes || null
                            ]
                        );

                        if (data.items?.create) {
                            for (const item of data.items.create) {
                                const itemId = 'sitem-' + Math.random().toString(36).substring(2, 9);
                                await connection.execute(
                                    'INSERT INTO `SaleItem` (id, saleId, productId, quantity, price) VALUES (?, ?, ?, ?, ?)',
                                    [itemId, saleId, item.productId, item.quantity, item.price]
                                );
                            }
                        }

                        const [newSaleRows]: any = await connection.execute('SELECT * FROM `Sale` WHERE id = ?', [saleId]);
                        return { ...newSaleRows[0], id: saleId };
                    }
                },
                payment: {
                    create: async ({ data }: { data: any }) => {
                        const paymentId = 'pay-' + Date.now();
                        await connection.execute(
                            'INSERT INTO `Payment` (id, saleId, customerId, amount, paymentMethod, reference, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [paymentId, data.saleId, data.customerId || null, data.amount, data.paymentMethod, data.reference || null, data.notes || null]
                        );
                        return { id: paymentId, ...data };
                    }
                },
                stockMovement: {
                    create: async ({ data }: { data: any }) => {
                        const id = 'smov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
                        await connection.execute(
                            'INSERT INTO `StockMovement` (id, productId, quantity, type, notes, previousStock, newStock) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [id, data.productId, data.quantity, data.type, data.notes || '', data.previousStock, data.newStock]
                        );
                        return { id, ...data };
                    }
                }
            };

            const result = await callback(tx);
            await connection.commit();
            return result;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }
};