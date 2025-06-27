import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { reloadPricingData, getPricingMetadata } from '@/lib/pricing';

async function isUserAdmin(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { isAdmin: true },
    });
    return user?.isAdmin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// GET - View current pricing data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const pricingPath = path.join(process.cwd(), 'src/data/pricing.json');
    const currentData = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));
    
    return NextResponse.json({
      success: true,
      data: currentData,
      filePath: 'src/data/pricing.json'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Update pricing data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { items, lastUpdated, version, notes } = body;

    // Validate the structure
    if (!items || typeof items !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Invalid pricing data: items object is required'
      }, { status: 400 });
    }

    // Create new pricing data
    const newPricingData = {
      lastUpdated: lastUpdated || new Date().toISOString().split('T')[0],
      version: version || "0.1.0",
      items,
      notes: notes || {
        "pricing": "Prices are in Hex Coins (HC) per piece.",
        "updates": "Update this file and call POST /api/pricing/reload to apply changes without downtime. Changes auto-reload within 30 seconds.",
        "structure": "Items are organized by name, with prices for each tier.",
        "hotReload": "Use POST /api/pricing/reload to immediately apply changes, or wait up to 30 seconds for automatic reload."
      }
    };

    // Write to file
    const pricingPath = path.join(process.cwd(), 'src/data/pricing.json');
    fs.writeFileSync(pricingPath, JSON.stringify(newPricingData, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Pricing data updated successfully',
      data: newPricingData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update specific item prices
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { itemName, prices } = body;

    if (!itemName || !prices) {
      return NextResponse.json({
        success: false,
        error: 'itemName and prices are required'
      }, { status: 400 });
    }

    // Read current data
    const pricingPath = path.join(process.cwd(), 'src/data/pricing.json');
    const currentData = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));

    // Update the specific item
    currentData.items[itemName] = prices;
    currentData.lastUpdated = new Date().toISOString().split('T')[0];

    // Write back to file
    fs.writeFileSync(pricingPath, JSON.stringify(currentData, null, 2));

    return NextResponse.json({
      success: true,
      message: `Updated prices for ${itemName}`,
      updatedItem: { [itemName]: prices },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 