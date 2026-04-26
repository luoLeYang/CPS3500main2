import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const db = await getDb();

    if (userId) {
      const user = await db.collection('users').findOne({ _id: userId });
      if (!user) return NextResponse.json({});
      return NextResponse.json({ id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, role: user.role });
    }

    const users = await db.collection('users').find({}).toArray();
    return NextResponse.json(users.map(u => ({ id: String(u._id), name: u.name, email: u.email, avatar: u.avatar, role: u.role })));
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
