import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapDocs } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');
    const recipientId = url.searchParams.get('recipientId');
    const userId = url.searchParams.get('userId');
    const db = await getDb();

    let messages: any[] = [];

    if (roomId) {
      messages = mapDocs(await db.collection('messages').find({ roomId }).sort({ createdAt: -1 }).limit(50).toArray());
    } else if (recipientId && userId) {
      messages = mapDocs(await db.collection('messages').find({
        $or: [
          { authorId: userId, recipientId, isPrivate: true },
          { authorId: recipientId, recipientId: userId, isPrivate: true },
        ],
      }).sort({ createdAt: -1 }).limit(50).toArray());
    }

    // Enrich with author info
    const authorIds = [...new Set(messages.map((m: any) => m.authorId))];
    const authorDocs = await db.collection('users').find({ _id: { $in: authorIds } }).toArray();
    const userMap = Object.fromEntries(authorDocs.map(u => [String(u._id), { name: u.name, avatar: u.avatar }]));
    const enriched = messages.map((m: any) => ({ ...m, name: (userMap as any)[m.authorId]?.name, avatar: (userMap as any)[m.authorId]?.avatar }));

    return NextResponse.json(enriched.reverse());
  } catch (error) {
    console.error('Message fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, authorId, isPrivate, recipientId, roomId } = await request.json();
    const messageId = randomUUID();
    const db = await getDb();

    await db.collection('messages').insertOne({
      _id: messageId,
      content,
      authorId,
      isPrivate: !!isPrivate,
      recipientId: recipientId || null,
      roomId: roomId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (isPrivate && recipientId) {
      const sender = await db.collection('users').findOne({ _id: authorId });
      await db.collection('notifications').insertOne({
        _id: randomUUID(),
        userId: recipientId,
        type: 'message',
        title: `New message from ${(sender as any)?.name || 'Unknown'}`,
        content,
        isRead: false,
        relatedId: messageId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, id: messageId });
  } catch (error) {
    console.error('Message creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
