import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch pricing data from database ordered by creation time (newest first), then by tier
    const pricingEntries = await prisma.pricing.findMany({
      orderBy: [
        { createdAt: 'desc' },
        { itemName: 'asc' },
        { tier: 'asc' }
      ]
    });

    // Fetch metadata
    const metadata = await prisma.pricingMetadata.findMany();

    // Transform pricing data to the expected format
    const items: { [itemName: string]: { [tierKey: string]: number } } = {};
    
    pricingEntries.forEach(entry => {
      if (!items[entry.itemName]) {
        items[entry.itemName] = {};
      }
      items[entry.itemName][`tier${entry.tier}`] = entry.price;
    });

    // Transform metadata to the expected format
    const notes: { [key: string]: string } = {};
    let lastUpdated = new Date().toISOString().split('T')[0];
    let version = '1.0.0';

    metadata.forEach(meta => {
      if (meta.key === 'lastUpdated') {
        lastUpdated = meta.value;
      } else if (meta.key === 'version') {
        version = meta.value;
      } else if (meta.key.startsWith('note_')) {
        const noteKey = meta.key.replace('note_', '');
        notes[noteKey] = meta.value;
      }
    });

    const pricingData = {
      lastUpdated,
      version,
      items,
      notes
    };

    return NextResponse.json(pricingData);
    
  } catch (error) {
    console.error('Error fetching pricing data from database:', error);
    
    return NextResponse.json({
      error: 'Failed to load pricing data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 