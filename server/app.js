const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { buildSystemPrompt } = require('./ai');

const SECURITY_QUESTION = '统一密保问题：请输入密保答案';
const SECURITY_ANSWER = '123';

function createErrorHandler(logError = console.error) {
  return function sendError(res, error, message) {
    logError(message, error);
    res.status(500).json({ error: 'Internal server error' });
  };
}

// Map MongoDB _id to id
function mapDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
}
function mapDocs(docs) {
  return docs.map(mapDoc);
}

function createApp({ getDb, handle, fetchImpl = fetch, logError = console.error }) {
  const app = express();
  const sendError = createErrorHandler(logError);

  app.use(express.json());

  app.post('/api/auth', async (req, res) => {
    try {
      const db = await getDb();
      const { email, password, name, action, username, securityAnswer, newPassword, confirmNewPassword } = req.body;

      if (action === 'signup') {
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
          res.status(400).json({ error: 'User already exists' });
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedSecurityAnswer = await bcrypt.hash(SECURITY_ANSWER, 10);
        const userId = randomUUID();

        await db.collection('users').insertOne({
          _id: userId,
          name,
          email,
          password: hashedPassword,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
          role: 'resident',
          dormId: 'dorm1',
          securityQuestion: SECURITY_QUESTION,
          securityAnswer: hashedSecurityAnswer,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        res.json({ success: true, user: { id: userId, name, email } });
        return;
      }

      if (action === 'signin') {
        const user = await db.collection('users').findOne({ email });
        if (!user) {
          res.status(401).json({ error: 'User not found' });
          return;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          res.status(401).json({ error: 'Invalid password' });
          return;
        }

        res.json({
          success: true,
          user: { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, role: user.role, dormId: user.dormId },
        });
        return;
      }

      if (action === 'resetPassword') {
        if (!username || !securityAnswer || !newPassword || !confirmNewPassword) {
          res.status(400).json({ error: 'Missing required fields' });
          return;
        }

        if (newPassword !== confirmNewPassword) {
          res.status(400).json({ error: 'New passwords do not match' });
          return;
        }

        const user = await db.collection('users').findOne({
          $or: [{ name: username }, { email: username }],
        });

        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const savedAnswer = user.securityAnswer;
        const isSecurityAnswerValid = savedAnswer
          ? await bcrypt.compare(securityAnswer, savedAnswer)
          : securityAnswer === SECURITY_ANSWER;

        if (!isSecurityAnswerValid) {
          res.status(401).json({ error: 'Invalid security answer' });
          return;
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const hashedSecurityAnswer = savedAnswer
          ? savedAnswer
          : await bcrypt.hash(SECURITY_ANSWER, 10);

        await db.collection('users').updateOne(
          { _id: user._id },
          {
            $set: {
              password: hashedNewPassword,
              securityQuestion: SECURITY_QUESTION,
              securityAnswer: hashedSecurityAnswer,
              updatedAt: new Date(),
            },
          }
        );

        res.json({ success: true, message: 'Password reset successful' });
        return;
      }

      res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      sendError(res, error, 'Auth error:');
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const db = await getDb();
      const { userId } = req.query;

      if (userId) {
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) { res.json({}); return; }
        res.json({ id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, role: user.role, dormId: user.dormId });
        return;
      }

      const users = await db.collection('users').find({}).toArray();
      res.json(users.map(u => ({ id: String(u._id), name: u.name, email: u.email, avatar: u.avatar, role: u.role, dormId: u.dormId })));
    } catch (error) {
      sendError(res, error, 'User fetch error:');
    }
  });

  app.get('/api/messages', async (req, res) => {
    try {
      const db = await getDb();
      const { roomId, recipientId, userId } = req.query;
      let messages = [];

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
      const authorIds = [...new Set(messages.map(m => m.authorId))];
      const authorDocs = await db.collection('users').find({ _id: { $in: authorIds } }).toArray();
      const userMap = Object.fromEntries(authorDocs.map(u => [String(u._id), { name: u.name, avatar: u.avatar }]));
      const enriched = messages.map(m => ({ ...m, name: userMap[m.authorId]?.name, avatar: userMap[m.authorId]?.avatar }));

      res.json(enriched.reverse());
    } catch (error) {
      sendError(res, error, 'Message fetch error:');
    }
  });

  app.post('/api/messages', async (req, res) => {
    try {
      const db = await getDb();
      const { content, authorId, isPrivate, recipientId, roomId } = req.body;
      const messageId = randomUUID();

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
          title: `New message from ${sender?.name || 'Unknown'}`,
          content,
          isRead: false,
          relatedId: messageId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.json({ success: true, id: messageId });
    } catch (error) {
      sendError(res, error, 'Message creation error:');
    }
  });

  app.get('/api/proposals', async (req, res) => {
    try {
      const db = await getDb();
      const status = req.query.status || 'active';

      const proposals = mapDocs(await db.collection('proposals').find({ status }).sort({ createdAt: -1 }).toArray());
      const proposalIds = proposals.map(p => p.id);
      const initiatorIds = [...new Set(proposals.map(p => p.initiatorId))];

      const [initiatorDocs, votes] = await Promise.all([
        db.collection('users').find({ _id: { $in: initiatorIds } }).toArray(),
        db.collection('votes').find({ proposalId: { $in: proposalIds } }).toArray(),
      ]);

      const userMap = Object.fromEntries(initiatorDocs.map(u => [String(u._id), { name: u.name, avatar: u.avatar }]));
      const voteCounts = {};
      for (const v of votes) {
        if (!voteCounts[v.proposalId]) voteCounts[v.proposalId] = { totalVotes: 0, approveCount: 0, rejectCount: 0, modifyCount: 0 };
        voteCounts[v.proposalId].totalVotes++;
        if (v.voteType === 'approve') voteCounts[v.proposalId].approveCount++;
        else if (v.voteType === 'reject') voteCounts[v.proposalId].rejectCount++;
        else if (v.voteType === 'modify') voteCounts[v.proposalId].modifyCount++;
      }

      res.json(proposals.map(p => ({
        ...p,
        initiatorName: userMap[p.initiatorId]?.name,
        initiatorAvatar: userMap[p.initiatorId]?.avatar,
        ...(voteCounts[p.id] || { totalVotes: 0, approveCount: 0, rejectCount: 0, modifyCount: 0 }),
      })));
    } catch (error) {
      sendError(res, error, 'Proposal fetch error:');
    }
  });

  app.post('/api/proposals', async (req, res) => {
    try {
      const db = await getDb();
      const { title, description, type, initiatorId, content } = req.body;
      const proposalId = randomUUID();

      await db.collection('proposals').insertOne({
        _id: proposalId,
        title,
        description,
        type,
        initiatorId,
        status: 'active',
        content: typeof content === 'string' ? content : JSON.stringify(content),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const otherUsers = await db.collection('users').find({ _id: { $ne: initiatorId } }).toArray();
      await Promise.all(otherUsers.map(user =>
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

      res.json({ success: true, id: proposalId });
    } catch (error) {
      sendError(res, error, 'Proposal creation error:');
    }
  });

  app.put('/api/proposals', async (req, res) => {
    try {
      const db = await getDb();
      const { proposalId, title, description, content } = req.body;
      const proposal = await db.collection('proposals').findOne({ _id: proposalId });

      if (!proposal || proposal.status !== 'active') {
        res.status(400).json({ error: 'Proposal cannot be modified' });
        return;
      }

      await db.collection('proposals').updateOne(
        { _id: proposalId },
        { $set: { title, description, content: typeof content === 'string' ? content : JSON.stringify(content), updatedAt: new Date() } }
      );

      const otherUsers = await db.collection('users').find({ _id: { $ne: proposal.initiatorId } }).toArray();
      await Promise.all(otherUsers.map(user =>
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

      res.json({ success: true });
    } catch (error) {
      sendError(res, error, 'Proposal update error:');
    }
  });

  app.get('/api/votes', async (req, res) => {
    try {
      const db = await getDb();
      const { proposalId, all } = req.query;

      let votes;
      if (all === 'true') {
        votes = await db.collection('votes').find({}).sort({ createdAt: -1 }).toArray();
      } else {
        votes = await db.collection('votes').find({ proposalId }).sort({ createdAt: -1 }).toArray();
      }

      const userIds = [...new Set(votes.map(v => v.userId))];
      const userDocs = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
      const userMap = Object.fromEntries(userDocs.map(u => [String(u._id), { name: u.name, avatar: u.avatar }]));

      res.json(mapDocs(votes).map(v => ({ ...v, name: userMap[v.userId]?.name, avatar: userMap[v.userId]?.avatar })));
    } catch (error) {
      sendError(res, error, 'Vote fetch error:');
    }
  });

  app.post('/api/votes', async (req, res) => {
    try {
      const db = await getDb();
      const { proposalId, userId, voteType, comment } = req.body;
      const existingVote = await db.collection('votes').findOne({ proposalId, userId });
      const voteId = existingVote ? existingVote.id : randomUUID();

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

      const proposal = await db.collection('proposals').findOne({ _id: proposalId });
      if (proposal && proposal.status === 'active') {
        const totalResidents = await db.collection('users').countDocuments({ role: 'resident' });
        const approveVotes = await db.collection('votes').countDocuments({ proposalId, voteType: 'approve' });

        if (approveVotes === totalResidents && totalResidents > 0) {
          await db.collection('proposals').updateOne({ _id: proposalId }, { $set: { status: 'approved', updatedAt: new Date() } });
          const otherUsers = await db.collection('users').find({ _id: { $ne: proposal.initiatorId } }).toArray();
          await Promise.all(otherUsers.map(user =>
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
        const voter = await db.collection('users').findOne({ _id: userId });
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

      res.json({ success: true, id: voteId });
    } catch (error) {
      sendError(res, error, 'Vote creation error:');
    }
  });

  app.get('/api/notifications', async (req, res) => {
    try {
      const db = await getDb();
      const { userId } = req.query;
      const unreadOnly = req.query.unreadOnly === 'true';

      const filter = { userId };
      if (unreadOnly) filter.isRead = false;

      const notifications = await db.collection('notifications').find(filter).sort({ createdAt: -1 }).limit(50).toArray();
      const unreadCount = await db.collection('notifications').countDocuments({ userId, isRead: false });

      res.json({
        notifications: mapDocs(notifications),
        unreadCount,
      });
    } catch (error) {
      sendError(res, error, 'Notification fetch error:');
    }
  });

  app.put('/api/notifications', async (req, res) => {
    try {
      const db = await getDb();
      const { notificationId, isRead } = req.body;
      await db.collection('notifications').updateOne({ _id: notificationId }, { $set: { isRead: !!isRead, updatedAt: new Date() } });
      res.json({ success: true });
    } catch (error) {
      sendError(res, error, 'Notification update error:');
    }
  });

  app.delete('/api/notifications', async (req, res) => {
    try {
      const db = await getDb();
      const { notificationId } = req.body;
      await db.collection('notifications').deleteOne({ _id: notificationId });
      res.json({ success: true });
    } catch (error) {
      sendError(res, error, 'Notification delete error:');
    }
  });

  app.post('/api/ai', async (req, res) => {
    try {
      const { messages, screenContext } = req.body;
      const apiKey = process.env.OPENAI_API_KEY;
      const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const model = process.env.AI_MODEL || 'gpt-4o-mini';

      if (!apiKey || apiKey === 'your-openai-api-key-here') {
        res.status(503).json({ error: 'AI API key not configured. Please set OPENAI_API_KEY in .env.local.' });
        return;
      }

      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: buildSystemPrompt(screenContext) },
            ...messages,
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logError('AI API error:', errorData);
        res.status(response.status).json({ error: `AI service error: ${response.status} ${response.statusText}` });
        return;
      }

      const data = await response.json();
      res.json({ reply: data.choices?.[0]?.message?.content ?? '' });
    } catch (error) {
      sendError(res, error, 'AI assistant error:');
    }
  });

  if (handle) {
    app.all(/.*/, (req, res) => handle(req, res));
  }

  return app;
}

module.exports = {
  createApp,
  createErrorHandler,
};