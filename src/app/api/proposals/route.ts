import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapDocs } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'active';
    const userId = url.searchParams.get('userId');
    const db = await getDb();

    if (!userId) {
      return NextResponse.json([]);
    }

    const user = await db.collection('users').findOne({ _id: userId });
    const dormId = (user as any)?.dormId;
    if (!dormId) {
      return NextResponse.json([]);
    }

    const proposals = mapDocs(await db.collection('proposals').find({ status, dormId }).sort({ createdAt: -1 }).toArray());
    const proposalIds = proposals.map((p: any) => p.id);
    const initiatorIds = [...new Set(proposals.map((p: any) => p.initiatorId))];

    const [initiatorDocs, votes] = await Promise.all([
      db.collection('users').find({ _id: { $in: initiatorIds } }).toArray(),
      db.collection('votes').find({ proposalId: { $in: proposalIds } }).toArray(),
    ]);

    const userMap = Object.fromEntries(initiatorDocs.map(u => [String(u._id), { name: u.name, avatar: u.avatar }]));
    const voteCounts: Record<string, { totalVotes: number; approveCount: number; rejectCount: number; modifyCount: number }> = {};
    for (const v of votes) {
      if (!voteCounts[v.proposalId]) voteCounts[v.proposalId] = { totalVotes: 0, approveCount: 0, rejectCount: 0, modifyCount: 0 };
      voteCounts[v.proposalId].totalVotes++;
      if (v.voteType === 'approve') voteCounts[v.proposalId].approveCount++;
      else if (v.voteType === 'reject') voteCounts[v.proposalId].rejectCount++;
      else if (v.voteType === 'modify') voteCounts[v.proposalId].modifyCount++;
    }

    return NextResponse.json(proposals.map((p: any) => ({
      ...p,
      initiatorName: (userMap as any)[p.initiatorId]?.name,
      initiatorAvatar: (userMap as any)[p.initiatorId]?.avatar,
      ...(voteCounts[p.id] || { totalVotes: 0, approveCount: 0, rejectCount: 0, modifyCount: 0 }),
    })));
  } catch (error) {
    console.error('Proposal fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, type, initiatorId, content } = await request.json();
    const proposalId = randomUUID();
    const db = await getDb();
    const initiator = await db.collection('users').findOne({ _id: initiatorId });
    const dormId = (initiator as any)?.dormId;

    if (!dormId) {
      return NextResponse.json({ error: 'Initiator dorm not found' }, { status: 400 });
    }

    await db.collection('proposals').insertOne({
      _id: proposalId,
      title,
      description,
      type,
      initiatorId,
      dormId,
      status: 'active',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const otherUsers = await db.collection('users').find({ _id: { $ne: initiatorId }, dormId }).toArray();
    await Promise.all(otherUsers.map((user: any) =>
      db.collection('notifications').insertOne({
        _id: randomUUID(),
        userId: String(user._id),
        type: 'proposal',
        title: `New ${type} proposal: ${title}`,
        content: description,
        isRead: false,
        relatedId: proposalId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ));

    return NextResponse.json({ success: true, id: proposalId });
  } catch (error) {
    console.error('Proposal creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { proposalId, title, description, content } = await request.json();
    const db = await getDb();

    const proposal = await db.collection('proposals').findOne({ _id: proposalId });
    if (!proposal || proposal.status !== 'active') {
      return NextResponse.json({ error: 'Proposal cannot be modified' }, { status: 400 });
    }

    await db.collection('proposals').updateOne(
      { _id: proposalId },
      { $set: { title, description, content: typeof content === 'string' ? content : JSON.stringify(content), updatedAt: new Date() } }
    );

    const otherUsers = await db.collection('users').find({ _id: { $ne: (proposal as any).initiatorId }, dormId: (proposal as any).dormId }).toArray();
    await Promise.all(otherUsers.map((user: any) =>
      db.collection('notifications').insertOne({
        _id: randomUUID(),
        userId: String(user._id),
        type: 'proposal',
        title: `Proposal updated: ${title}`,
        content: description,
        isRead: false,
        relatedId: proposalId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Proposal update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
