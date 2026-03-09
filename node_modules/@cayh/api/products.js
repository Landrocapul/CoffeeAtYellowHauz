"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            // Get all active products with inventory
            const products = await prisma.product.findMany({
                where: { isActive: true },
                include: {
                    inventory: true
                },
                orderBy: { name: 'asc' }
            });
            const formattedProducts = products.map((product) => ({
                id: product.id,
                name: product.name,
                price: product.price,
                sku: product.sku,
                category: product.category,
                isActive: product.isActive,
                inventory: product.inventory ? {
                    onHandQty: product.inventory.onHandQty,
                    lowStockLevel: product.inventory.lowStockLevel
                } : { onHandQty: 0, lowStockLevel: 0 }
            }));
            res.status(200).json(formattedProducts);
        }
        else if (req.method === 'POST') {
            // Create new product
            const { name, price, sku, category, stockLevel } = req.body;
            if (!name || !price) {
                return res.status(400).json({ error: 'Name and price are required' });
            }
            // Create product and inventory in transaction
            const result = await prisma.$transaction(async (tx) => {
                const product = await tx.product.create({
                    data: {
                        name,
                        price: parseFloat(price),
                        sku: sku || null,
                        category: category || null,
                        isActive: true
                    }
                });
                await tx.inventoryItem.create({
                    data: {
                        productId: product.id,
                        onHandQty: parseInt(stockLevel) || 0,
                        lowStockLevel: 5
                    }
                });
                return product;
            });
            res.status(201).json(result);
        }
        else if (req.method === 'PUT') {
            // Update existing product
            const { id, name, price, sku, category, stockLevel } = req.body;
            if (!id || !name || !price) {
                return res.status(400).json({ error: 'ID, name and price are required' });
            }
            // Update product and inventory in transaction
            const result = await prisma.$transaction(async (tx) => {
                const product = await tx.product.update({
                    where: { id },
                    data: {
                        name,
                        price: parseFloat(price),
                        sku: sku || null,
                        category: category || null
                    }
                });
                if (stockLevel !== undefined) {
                    await tx.inventoryItem.upsert({
                        where: { productId: id },
                        update: { onHandQty: parseInt(stockLevel) },
                        create: {
                            productId: id,
                            onHandQty: parseInt(stockLevel),
                            lowStockLevel: 5
                        }
                    });
                }
                return product;
            });
            res.status(200).json(result);
        }
        else if (req.method === 'DELETE') {
            // Deactivate product (soft delete)
            const { id } = req.body;
            if (!id) {
                return res.status(400).json({ error: 'Product ID is required' });
            }
            await prisma.product.update({
                where: { id },
                data: { isActive: false }
            });
            res.status(200).json({ message: 'Product deactivated' });
        }
        else {
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            res.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('Products API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        await prisma.$disconnect();
    }
}
