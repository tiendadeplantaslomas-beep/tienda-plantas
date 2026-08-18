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
                    createdAt: c.createdAt || new Date()
                }));
            } catch (err) {
                console.error("Error al listar clientes:", err);
                return [];
            } finally {
                connection.release();
            }
        },
        create: async ({ data }: { data: { name: string; phone?: string | null; address?: string | null; email?: string | null } }) => {
            const connection = await pool.getConnection();
            try {
                const newId = 'cust-' + Date.now();
                await connection.execute(
                    'INSERT INTO `Customer` (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
                    [newId, data.name, data.email || null, data.phone || null, data.address || null]
                );
                return { id: newId, name: data.name, email: data.email || null, address: data.email || null, phone: data.phone || null };
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