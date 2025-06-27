import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface PricingData {
  lastUpdated: string;
  version: string;
  items: {
    [itemName: string]: {
      [tierKey: string]: number;
    };
  };
  notes: {
    [key: string]: string;
  };
}

async function seedPricingData() {
  try {
    console.log('Starting pricing data seeding...');

    // Read the existing pricing JSON file
    const pricingPath = path.join(process.cwd(), 'src/data/pricing.json');
    const fileContent = fs.readFileSync(pricingPath, 'utf8');
    const pricingData: PricingData = JSON.parse(fileContent);

    // Create or find an admin user
    let adminUser = await prisma.user.findFirst({
      where: { isAdmin: true }
    });

    if (!adminUser) {
      console.log('No admin user found, creating one...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@farmyfishfry.com',
          name: 'System Admin',
          isAdmin: true,
        }
      });
      console.log(`Created admin user: ${adminUser.email}`);
    } else {
      console.log(`Using existing admin user: ${adminUser.email}`);
    }

    // Clear existing pricing data
    await prisma.pricing.deleteMany();
    await prisma.pricingMetadata.deleteMany();
    console.log('Cleared existing pricing data');

    // Seed pricing items
    const pricingEntries = [];
    for (const [itemName, prices] of Object.entries(pricingData.items)) {
      for (const [tierKey, price] of Object.entries(prices)) {
        const tier = parseInt(tierKey.replace('tier', ''));
        pricingEntries.push({
          itemName,
          tier,
          price,
          createdBy: adminUser.id,
        });
      }
    }

    // Insert pricing data
    if (pricingEntries.length > 0) {
      await prisma.pricing.createMany({
        data: pricingEntries,
      });
      console.log(`Seeded ${pricingEntries.length} pricing entries`);
    }

    // Seed metadata
    const metadataEntries = [
      { key: 'lastUpdated', value: pricingData.lastUpdated },
      { key: 'version', value: pricingData.version },
      ...Object.entries(pricingData.notes).map(([key, value]) => ({
        key: `note_${key}`,
        value,
      })),
    ];

    await prisma.pricingMetadata.createMany({
      data: metadataEntries,
    });
    console.log(`Seeded ${metadataEntries.length} metadata entries`);

    console.log('Pricing data seeding completed successfully!');
    
    // Verify the data
    const totalPricing = await prisma.pricing.count();
    const totalMetadata = await prisma.pricingMetadata.count();
    console.log(`Database now contains: ${totalPricing} pricing entries, ${totalMetadata} metadata entries`);

  } catch (error) {
    console.error('Error seeding pricing data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPricingData(); 