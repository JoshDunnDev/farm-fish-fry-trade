import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Server-side pricing data loader
function loadPricingData() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/pricing.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading pricing data:', error);
    // Fallback to default pricing if file can't be read
    return {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: "0.1.0",
      items: {
        "salt": { "tier1": 4, "tier2": 4, "tier3": 4, "tier4": 4 },
        "fish": { "tier1": 1.333, "tier2": 1.666, "tier3": 2, "tier4": 2.333 },
        "bulb": { "tier1": 0.5, "tier2": 0.625, "tier3": 0.75, "tier4": 0.875 }
      },
      notes: {
        "pricing": "Prices are in Hex Coins (HC) per piece.",
        "updates": "Update this file and call POST /api/pricing/reload to apply changes without downtime. Changes auto-reload within 30 seconds.",
        "structure": "Items are organized by name, with prices for each tier.",
        "hotReload": "Use POST /api/pricing/reload to immediately apply changes, or wait up to 30 seconds for automatic reload."
      }
    };
  }
}

export async function GET() {
  try {
    const pricingData = loadPricingData();
    
    return NextResponse.json(pricingData, {
      headers: {
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      },
    });
  } catch (error) {
    console.error('Error in pricing data API:', error);
    
    return NextResponse.json({
      error: 'Failed to load pricing data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 