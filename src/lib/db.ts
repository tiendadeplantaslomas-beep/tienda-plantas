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
                const orderDir = args?.orderBy?.createdAt || 'desc';
                const [rows]: any = await connection.execute(
                    `SELECT * FROM \`Customer\` ORDER BY \`createdAt\` ${orderDir}`
                );
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

                const imgVal = data.image_url !== undefined ? data.image_url : data.imageUrl;
                const passVal = data.password_hash !== undefined ? data.password_hash : data.passwordHash;

                if (data.gender !== undefined) {
                    fields.push('gender = ?');
                    values.push(data.gender);
                }
                if (imgVal !== undefined) {
                    fields.push('image_url = ?');
                    values.push(imgVal);
                }
                if (data.name !== undefined) {
                    fields.push('name = ?');
                    values.push(data.name);
                }
                if (data.address !== undefined) {
                    fields.push('address = ?');
                    values.push(data.address);
                }
                if (data.phone !== undefined) {
                    fields.push('phone = ?');
                    values.push(data.phone);
                }
                if (passVal !== undefined) {
                    fields.push('password_hash = ?');
                    values.push(passVal);
                }

                if (fields.length > 0) {
                    values.push(customerId);
                    await connection.execute(
                        `UPDATE \`Customer\` SET ${fields.join(', ')} WHERE id = ?`,
                        values
                    );
                }

                const [rows]: any = await connection.execute(
                    'SELECT * FROM `Customer` WHERE id = ? LIMIT 1',
                    [customerId]
                );
                const c = rows[0];
                if (!c) throw new Error('Cliente no encontrado');

                const { password_hash, ...customerData } = c;
                return {
                    ...customerData,
                    gender: c.gender || 'neutral',
                    image_url: c.image_url || null
                };
            } catch (err) {
                throw err;
            } finally {
                connection.release();
            }
        }
    },
    product: {
        update: async ({ where, data }: { where: { id: string }; data: any }) => {
            const connection = await pool.getConnection();
            try {
                const productId = where.id;
                if (data?.stock?.decrement) {
                    const qty = Number(data.stock.decrement);
                    await connection.execute(
                        'UPDATE `Product` SET stock = stock - ? WHERE id = ?',
                        [qty, productId]
                    );
                } else if (data?.stock?.increment) {
                    const qty = Number(data.stock.increment);
                    await connection.execute(
                        'UPDATE `Product` SET stock = stock + ? WHERE id = ?',
                        [qty, productId]
                    );
                } else if (data?.stock !== undefined) {
                    const qty = Number(data.stock);
                    await connection.execute(
                        'UPDATE `Product` SET stock = ? WHERE id = ?',
                        [qty, productId]
                    );
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
                const [sales]: any = await connection.execute('SELECT * FROM `Sale` ORDER BY `createdAt` DESC');
                const result = [];
                for (const s of sales) {
                    const [items]: any = await connection.execute(
                        `SELECT si.*, p.code as p_code, p.name as p_name, p.cost as p_cost 
                         FROM \`SaleItem\` si 
                         LEFT JOIN \`Product\` p ON si.productId = p.id 
                         WHERE si.saleId = ?`,
                        [s.id]
                    );
                    result.push({
                        ...s,
                        isPaid: Boolean(s.isPaid),
                        isShipping: Boolean(s.isShipping),
                        invoiced: Boolean(s.invoiced),
                        saleItems: items.map((i: any) => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            price: i.price,
                            product: { code: i.p_code, name: i.p_name, cost: i.p_cost }
                        }))
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
                await connection.beginTransaction();
                const saleId = 'sale-' + Date.now();
                const {
                    total, paidAmount, pendingBalance, status, isPaid,
                    paymentStatus, paymentMethod, paymentReference,
                    isShipping, shippingAddress, channel, invoiced,
                    saleItems, items, customerId, customerName,
                    client
                } = data;
                let finalCustomerId = customerId || null;
                let finalCustomerName = customerName || (typeof client === 'string' ? client : client?.name) || 'CLIENTE MOSTRADOR';

                if (!finalCustomerId && finalCustomerName && finalCustomerName !== 'CLIENTE MOSTRADOR') {
                    const [custRows]: any = await connection.execute(
                        'SELECT id FROM `Customer` WHERE name = ? LIMIT 1',
                        [finalCustomerName]
                    );
                    if (custRows && custRows.length > 0) {
                        finalCustomerId = custRows[0].id;
                    }
                }

                await connection.execute(
                    `INSERT INTO \`Sale\` (
                        id, total, paidAmount, pendingBalance, status, isPaid, 
                        paymentStatus, paymentMethod, paymentReference, 
                        isShipping, shippingAddress, channel, invoiced, 
                        customerId, customerName
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        saleId,
                        total,
                        paidAmount || 0,
                        pendingBalance || total,
                        status || 'REGISTRADO',
                        isPaid ? 1 : 0,
                        paymentStatus || 'PENDIENTE',
                        paymentMethod || 'EFECTIVO',
                        paymentReference || '',
                        isShipping ? 1 : 0,
                        shippingAddress || '',
                        channel || 'POS',
                        invoiced ? 1 : 0,
                        finalCustomerId,
                        finalCustomerName
                    ]
                );
                const itemsList = saleItems?.create || saleItems || items;
                if (itemsList && Array.isArray(itemsList)) {
                    for (const item of itemsList) {
                        const itemId = 'sitem-' + Math.random().toString(36).substring(2, 9);
                        const prodId = item.productId || item.id;
                        const qty = Number(item.quantity || 1);
                        const prc = Number(item.price || 0);
                        if (prodId) {
                            await connection.execute(
                                `INSERT INTO \`SaleItem\` (id, saleId, productId, quantity, price) 
                                 VALUES (?, ?, ?, ?, ?)`,
                                [itemId, saleId, prodId, qty, prc]
                            );
                        }
                    }
                }

                await connection.commit();
                return { id: saleId, ...data };
            } catch (err) {
                await connection.rollback();
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
                if (!targetSaleId) {
                    throw new Error('Falta el ID de la venta (saleId)');
                }

                await connection.execute(
                    `INSERT INTO \`Payment\` (id, saleId, amount, paymentMethod, reference) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [paymentId, targetSaleId, paymentAmount, method, ref]
                );
                const [saleRows]: any = await connection.execute(
                    'SELECT total, paidAmount FROM `Sale` WHERE id = ?',
                    [targetSaleId]
                );
                if (saleRows.length > 0) {
                    const sale = saleRows[0];
                    const newPaidAmount = Number(sale.paidAmount || 0) + paymentAmount;
                    const newPendingBalance = Math.max(0, Number(sale.total) - newPaidAmount);
                    const newIsPaid = newPendingBalance <= 0 ? 1 : 0;
                    const newPaymentStatus = newPendingBalance <= 0 ? 'PAGADO' : 'PARCIAL';
                    await connection.execute(
                        `UPDATE \`Sale\` 
                         SET paidAmount = ?, pendingBalance = ?, isPaid = ?, paymentStatus = ? 
                         WHERE id = ?`,
                        [newPaidAmount, newPendingBalance, newIsPaid, newPaymentStatus, targetSaleId]
                    );
                }

                await connection.commit();
                return { id: paymentId, ...data };
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        }
    }
};