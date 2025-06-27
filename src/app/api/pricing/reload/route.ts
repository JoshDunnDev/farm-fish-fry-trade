import { NextResponse } from 'next/server';
import { reloadPricingData, getPricingMetadata } from '@/lib/pricing';

export async function POST() {
  try {
    // Reload pricing data from file
    const newPricing = await reloadPricingData();
    const metadata = await getPricingMetadata();
    
    return NextResponse.json({
      success: true,
      message: 'Pricing data reloaded successfully',
      metadata: {
        lastUpdated: metadata.lastUpdated,
        version: metadata.version,
        itemCount: Object.keys(newPricing.items).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error reloading pricing data:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to reload pricing data',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const metadata = await getPricingMetadata();
    
    return NextResponse.json({
      success: true,
      metadata: {
        lastUpdated: metadata.lastUpdated,
        version: metadata.version,
        notes: metadata.notes
      },
      cacheInfo: {
        cacheDuration: '30 seconds',
        reloadEndpoint: '/api/pricing/reload (POST)'
      }
    });
  } catch (error) {
    console.error('Error getting pricing metadata:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get pricing metadata',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 