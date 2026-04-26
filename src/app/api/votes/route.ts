import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapDocs } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const proposalId = url.searchParams.get('proposalId');
    const all = url.searchParams.get('all');
    const db = await getDb();

    if (all === 'true') {
      const votes = await db.collection('votes').find({}).sort({ createdAt: -1 }).toArray();
      const userIds = [...new Set(votes.map((v: any) => v.userId))];
      const userDocs = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
      const userMap = Object.fromEntries(userDocs.map(u => [String(u._id), { name: u.name, avatar: u.avatar }]));
      return NextResponse.json(mapDocs(votes).map((v: any) => ({ ...v, name: (userMap as any)[v.userId]?.name, avatar: (userMap as any)[v.userId]?.avatar })));
    }

    const votes = await db.collection('votes').find({ proposalId }).sort({ createdAt: -1 }).toArray();
    const userIds = [...new Set(votes.map((v: any) => v.userId))];
    const userDocs = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
    const userMap = Object.fromEntries(userDocs.map(u => [String(u._id), { name: u.name, avatar: u.avatar }]));
    return NextResponse.json(mapDocs(votes).map((v: any) => ({ ...v, name: (userMap as any)[v.userId]?.name, avatar: (userMap as any)[v.userId]?.avatar })));
  } catch (error) {
    console.error('Vote fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { proposalId, userId, voteType, comment } = await request.json();
    const db = await getDb();
    const existingVote = await db.collection('votes').findOne({ proposalId, userId });
    const voteId = existingVote ? String(existingVote._id) : randomUUID();
    let isUpdate = !!existingVote;

    if (existingVote) {
      await db.collection('votes').updateOne({ _id: existingVote._id }, { $set: { voteType, comment } });
    } else {
      await db.collection('votes').insertOne({
        _id: voteId,
        proposalId,
        userId,
        voteType,
        comment: comment || null,
        createdAt: new Date(),
      });
    }

    const proposal = await db.collection('proposals').findOne({ _id: proposalId }) as any;
    if (proposal?.status === 'active') {
      const totalResidents = await db.collection('users').countDocuments({ role: 'resident' });
      const approveVotes = await db.collection('votes').countDocuments({ proposalId, voteType: 'approve' });

      if (approveVotes === totalResidents && totalResidents > 0) {
        await db.collection('proposals').updateOne({ _id: proposalId }, { $set: { status: 'approved', updatedAt: new Date() } });
        const otherUsers = await db.collection('users').find({ _id: { $ne: proposal.initiatorId } }).toArray();
        await Promise.all(otherUsers.map((user: any) =>
          db.collection('notifications').insertOne({
            _id: randomUUID(),
            userId: String(user._id),
            type: 'proposal',
            title: `Proposal unanimously approved: ${proposal.title}`,
            content: 'The proposal has been unanimously approved!',
            isRead: false,
            relatedId: proposalId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ));
      }
    }

    if (proposal) {
      const voter = await db.collection('users').findOne({ _id: userId }) as any;
      await db.collection('notifications').insertOne({
        _id: randomUUID(),
        userId: proposal.initiatorId,
        type: 'vote',
        title: `New vote from ${voter?.name || 'Unknown'}: ${voteType}`,
        content: comment || '',
        isRead: false,
        relatedId: proposalId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, id: voteId });
  } catch (error) {
    console.error('Vote creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
