import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test database connection and run basic setup
    await prisma.$connect();
    
    // Try to run a simple query to ensure tables exist
    await prisma.user.findFirst().catch(async () => {
      // If tables don't exist, this will fail, but that's expected on first run
      console.log('Database tables may not exist yet - this is normal on first deployment');
    });

    await prisma.$disconnect();
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 