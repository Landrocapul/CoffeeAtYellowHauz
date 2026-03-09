import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  try {
    // Insert products
    const americano = await prisma.product.upsert({
      where: { id: 'americano' },
      update: {},
      create: {
        id: 'americano',
        name: 'Americano',
        price: 90.00,
        isActive: true,
      },
    })

    const latte = await prisma.product.upsert({
      where: { id: 'latte' },
      update: {},
      create: {
        id: 'latte',
        name: 'Latte',
        price: 120.00,
        isActive: true,
      },
    })

    const macchiato = await prisma.product.upsert({
      where: { id: 'macchiato' },
      update: {},
      create: {
        id: 'macchiato',
        name: 'Caramel Macchiato',
        price: 140.00,
        isActive: true,
      },
    })

    // Insert inventory items
    await prisma.inventoryItem.upsert({
      where: { productId: 'americano' },
      update: {},
      create: {
        id: 'inv-americano',
        productId: 'americano',
        onHandQty: 50,
        lowStockLevel: 10,
      },
    })

    await prisma.inventoryItem.upsert({
      where: { productId: 'latte' },
      update: {},
      create: {
        id: 'inv-latte',
        productId: 'latte',
        onHandQty: 30,
        lowStockLevel: 5,
      },
    })

    await prisma.inventoryItem.upsert({
      where: { productId: 'macchiato' },
      update: {},
      create: {
        id: 'inv-macchiato',
        productId: 'macchiato',
        onHandQty: 20,
        lowStockLevel: 5,
      },
    })

    console.log('✅ Sample data seeded successfully!')
    console.log('Products added:', americano.name, latte.name, macchiato.name)
  } catch (error) {
    console.error('❌ Error seeding data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
