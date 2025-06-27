import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (password !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, isAdmin: true },
    });

    if (!existingUser) {
      return NextResponse.json({ 
        error: 'User account not found. Please sign in through Discord first to create your account.' 
      }, { status: 404 });
    }

    if (existingUser.isAdmin) {
      return NextResponse.json({ 
        success: true, 
        message: 'You already have admin access',
        isAdmin: true 
      });
    }

    // Update user to admin status
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { isAdmin: true },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin access granted',
      isAdmin: updatedUser.isAdmin 
    });

  } catch (error) {
    console.error('Error in admin auth:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Check if current user is admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    return NextResponse.json({ isAdmin: user?.isAdmin || false });

  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false });
  }
} 