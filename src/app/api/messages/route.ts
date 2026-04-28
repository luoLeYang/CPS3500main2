import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapDocs } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');
    const viewerRole = url.searchParams.get('viewerRole');
    const recipientId = url.searchParams.get('recipientId');
    const userId = url.searchParams.get('userId');
    const unreadSummary = url.searchParams.get('unreadSummary');
    const db = await getDb();

    if (!userId) {
      return NextResponse.json([]);
    }

    const viewer = await db.collection('users').findOne({ _id: userId });
    const viewerDormId = (viewer as any)?.dormId;
    if (!viewerDormId) {
      return NextResponse.json([]);
    }

    if (unreadSummary === 'private') {
      const unreadRows = await db.collection('messages').aggregate([
        {
          $match: {
            dormId: viewerDormId,
            isPrivate: true,
            recipientId: userId,
            isRead: false,
          },
        },
        {
          $group: {
            _id: '$authorId',
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      return NextResponse.json(unreadRows.map((r: any) => ({ authorId: String(r._id), count: r.count })));
    }

    let messages: any[] = [];

    if (roomId) {
      if (roomId === 'group' && viewerRole === 'employee_admin') {
        return NextResponse.json([]);
      }
      messages = mapDocs(await db.collection('messages').find({ roomId, dormId: viewerDormId }).sort({ createdAt: -1 }).limit(50).toArray());
    } else if (recipientId && userId) {
      await db.collection('messages').updateMany(
        {
          dormId: viewerDormId,
          isPrivate: true,
          authorId: recipientId,
          recipientId: userId,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            updatedAt: new Date(),
          },
        }
      );

      messages = mapDocs(await db.collection('messages').find({
        dormId: viewerDormId,
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
    const author = await db.collection('users').findOne({ _id: authorId });
    const authorDormId = (author as any)?.dormId;

    if (!authorDormId) {
      return NextResponse.json({ error: 'Author dorm not found' }, { status: 400 });
    }

    if (roomId === 'group') {
      if ((author as any)?.role === 'employee_admin') {
        return NextResponse.json({ error: 'Admin users cannot access group chat' }, { status: 403 });
      }
    }

    if (isPrivate && recipientId) {
      const recipient = await db.collection('users').findOne({ _id: recipientId });
      if (!recipient || (recipient as any).dormId !== authorDormId) {
        return NextResponse.json({ error: 'Recipient is not in your dorm' }, { status: 403 });
      }
    }

    await db.collection('messages').insertOne({
      _id: messageId,
      content,
      authorId,
      dormId: authorDormId,
      isPrivate: !!isPrivate,
      isRead: isPrivate ? false : true,
      recipientId: recipientId || null,
      roomId: roomId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (roomId === 'group') {
      const sender = await db.collection('users').findOne({ _id: authorId });
      const recipients = await db.collection('users').find({
        dormId: authorDormId,
        _id: { $ne: authorId },
        role: { $ne: 'employee_admin' },
      }).toArray();

      await Promise.all(recipients.map((user: any) =>
        db.collection('notifications').insertOne({
          _id: randomUUID(),
          userId: String(user._id),
          type: 'group_message',
          title: `New group message from ${(sender as any)?.name || 'Unknown'}`,
          content,
          isRead: false,
          relatedId: messageId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ));
    }

    return NextResponse.json({ success: true, id: messageId });
  } catch (error) {
    console.error('Message creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
