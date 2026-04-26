const test = require('node:test');
const assert = require('node:assert/strict');

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const request = require('supertest');

const { createApp } = require('../server/app');

async function createTestDatabase() {
  const mongod = await MongoMemoryServer.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  const db = client.db('dormitory-test');

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('votes').createIndex({ proposalId: 1, userId: 1 }, { unique: true });

  await db.collection('users').insertMany([
    { _id: 'user-1', name: 'Alice Chen', email: 'user1@example.com', password: '$2b$10$tZc4T4Zywbf9lTxGIRviueqnSE3GcIoOJ6NGr7WdpgsgufxwExVGe', avatar: 'alice.png', role: 'resident', dormId: 'dorm1', createdAt: new Date(), updatedAt: new Date() },
    { _id: 'user-2', name: 'Bob Smith',  email: 'user2@example.com', password: '$2b$10$tZc4T4Zywbf9lTxGIRviueqnSE3GcIoOJ6NGr7WdpgsgufxwExVGe', avatar: 'bob.png',   role: 'resident', dormId: 'dorm1', createdAt: new Date(), updatedAt: new Date() },
  ]);
  await db.collection('proposals').insertOne({
    _id: 'proposal-1', title: 'Quiet Hours', description: 'Quiet after 10 PM',
    type: 'Quiet Hours', initiatorId: 'user-1', status: 'active', content: '{"hours":"10 PM"}',
    createdAt: new Date(), updatedAt: new Date(),
  });

  return {
    db,
    getDb: () => Promise.resolve(db),
    async cleanup() {
      await client.close();
      await mongod.stop();
    },
  };
}

test('GET /api/users returns seeded users', async (t) => {
  const testDb = await createTestDatabase();
  t.after(() => testDb.cleanup());
  const app = createApp({ getDb: testDb.getDb });

  const response = await request(app).get('/api/users').expect(200);

  assert.equal(response.body.length, 2);
  assert.equal(response.body[0].email, 'user1@example.com');
});

test('POST /api/messages creates a private-message notification', async (t) => {
  const testDb = await createTestDatabase();
  t.after(() => testDb.cleanup());
  const app = createApp({ getDb: testDb.getDb });

  const response = await request(app)
    .post('/api/messages')
    .send({
      content: 'Hello Bob',
      authorId: 'user-1',
      isPrivate: true,
      recipientId: 'user-2',
    })
    .expect(200);

  assert.equal(response.body.success, true);
  const notification = await testDb.db.collection('notifications').findOne({ userId: 'user-2' });
  assert.equal(notification.title, 'New message from Alice Chen');
  assert.equal(notification.content, 'Hello Bob');
});

test('POST /api/votes auto-approves proposal after all residents approve', async (t) => {
  const testDb = await createTestDatabase();
  t.after(() => testDb.cleanup());
  const app = createApp({ getDb: testDb.getDb });

  await request(app)
    .post('/api/votes')
    .send({ proposalId: 'proposal-1', userId: 'user-1', voteType: 'approve', comment: 'Yes' })
    .expect(200);
  await request(app)
    .post('/api/votes')
    .send({ proposalId: 'proposal-1', userId: 'user-2', voteType: 'approve', comment: 'Also yes' })
    .expect(200);

  const proposal = await testDb.db.collection('proposals').findOne({ _id: 'proposal-1' });
  assert.equal(proposal.status, 'approved');
});

test('POST /api/ai returns 503 when API key is not configured', async (t) => {
  const testDb = await createTestDatabase();
  t.after(() => testDb.cleanup());
  const app = createApp({ getDb: testDb.getDb });
  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  t.after(() => {
    if (previousApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousApiKey;
    }
  });

  const response = await request(app)
    .post('/api/ai')
    .send({ messages: [{ role: 'user', content: 'Hi' }], screenContext: {} })
    .expect(503);

  assert.match(response.body.error, /OPENAI_API_KEY/);
});

test('POST /api/auth signup creates a new user', async (t) => {
  const testDb = await createTestDatabase();
  t.after(() => testDb.cleanup());
  const app = createApp({ getDb: testDb.getDb });

  const response = await request(app)
    .post('/api/auth')
    .send({
      action: 'signup',
      name: 'Robin',
      email: 'robin@example.com',
      password: 'password123',
    })
    .expect(200);

  assert.equal(response.body.success, true);
  const createdUser = await testDb.db.collection('users').findOne({ email: 'robin@example.com' });
  assert.equal(createdUser.name, 'Robin');
  assert.notEqual(createdUser.password, 'password123');
});

test('POST /api/auth signin returns user for valid credentials', async (t) => {
  const testDb = await createTestDatabase();
  t.after(() => testDb.cleanup());
  const app = createApp({ getDb: testDb.getDb });

  const response = await request(app)
    .post('/api/auth')
    .send({
      action: 'signin',
      email: 'user1@example.com',
      password: 'password123',
    })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.user.email, 'user1@example.com');
});

test('POST /api/auth signin rejects invalid password', async (t) => {
  const testDb = await createTestDatabase();
  t.after(() => testDb.cleanup());
  const app = createApp({ getDb: testDb.getDb });

  const response = await request(app)
    .post('/api/auth')
    .send({
      action: 'signin',
      email: 'user1@example.com',
      password: 'wrong-password',
    })
    .expect(401);

  assert.equal(response.body.error, 'Invalid password');
});

test('proposal and notification lifecycle works (create, update, mark-read, delete)', async (t) => {
  const testDb = await createTestDatabase();
  t.after(() => testDb.cleanup());
  const app = createApp({ getDb: testDb.getDb });

  const createResponse = await request(app)
    .post('/api/proposals')
    .send({
      title: 'Kitchen Cleaning Rotation',
      description: 'Rotate kitchen cleanup weekly.',
      type: 'Cleaning',
      initiatorId: 'user-1',
      content: { weeks: 4 },
    })
    .expect(200);

  assert.equal(createResponse.body.success, true);
  const proposalId = createResponse.body.id;

  const createdProposal = await testDb.db.collection('proposals').findOne({ _id: proposalId });
  assert.equal(createdProposal.title, 'Kitchen Cleaning Rotation');

  const createdNotification = await testDb.db.collection('notifications').findOne({ userId: 'user-2', relatedId: proposalId });
  assert.equal(createdNotification.type, 'proposal');

  await request(app)
    .put('/api/proposals')
    .send({
      proposalId,
      title: 'Kitchen Cleaning Rotation v2',
      description: 'Rotate kitchen cleanup every Sunday.',
      content: { weeks: 8 },
    })
    .expect(200);

  const updatedProposal = await testDb.db.collection('proposals').findOne({ _id: proposalId });
  assert.equal(updatedProposal.title, 'Kitchen Cleaning Rotation v2');

  const notificationId = String(createdNotification._id);
  await request(app)
    .put('/api/notifications')
    .send({
      notificationId,
      isRead: true,
    })
    .expect(200);

  const readNotification = await testDb.db.collection('notifications').findOne({ _id: createdNotification._id });
  assert.equal(readNotification.isRead, true);

  await request(app)
    .delete('/api/notifications')
    .send({ notificationId })
    .expect(200);

  const deletedNotification = await testDb.db.collection('notifications').findOne({ _id: createdNotification._id });
  assert.equal(deletedNotification, null);
});