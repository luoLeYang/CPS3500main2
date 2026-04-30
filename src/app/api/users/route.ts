import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const viewerId = url.searchParams.get('viewerId');
    const db = await getDb();

    if (userId) {
      const user = await db.collection('users').findOne({ _id: userId });
      if (!user) return NextResponse.json({});
      return NextResponse.json({ id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, role: user.role, dormId: user.dormId });
    }

    if (!viewerId) {
      return NextResponse.json([]);
    }

    const viewer = await db.collection('users').findOne({ _id: viewerId });
    if (!viewer || !(viewer as any).dormId) {
      return NextResponse.json([]);
    }

    const users = await db.collection('users').find({ dormId: (viewer as any).dormId }).toArray();
    return NextResponse.json(users.map(u => ({ id: String(u._id), name: u.name, email: u.email, avatar: u.avatar, role: u.role, dormId: u.dormId })));
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }


    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: userId });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await Promise.all([
      db.collection('users').deleteOne({ _id: userId }),
      db.collection('votes').deleteMany({ userId }),
      db.collection('messages').deleteMany({ $or: [{ authorId: userId }, { recipientId: userId }] }),
      db.collection('notifications').deleteMany({ userId }),
      db.collection('proposals').deleteMany({ initiatorId: userId }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
