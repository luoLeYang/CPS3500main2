import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapDocs } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const db = await getDb();

    const filter: Record<string, unknown> = { userId };
    if (unreadOnly) filter.isRead = false;

    const notifications = await db.collection('notifications').find(filter).sort({ createdAt: -1 }).limit(50).toArray();
    const unreadCount = await db.collection('notifications').countDocuments({ userId, isRead: false });

    return NextResponse.json({
      notifications: mapDocs(notifications),
      unreadCount,
    });
  } catch (error) {
    console.error('Notification fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { notificationId, isRead } = await request.json();
    const db = await getDb();
    await db.collection('notifications').updateOne({ _id: notificationId }, { $set: { isRead: !!isRead, updatedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { notificationId } = await request.json();
    const db = await getDb();
    await db.collection('notifications').deleteOne({ _id: notificationId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
