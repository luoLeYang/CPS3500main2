const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'dormitory';

let client = null;
let dbInstance = null;

async function connectDb() {
  if (!dbInstance) {
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');
    client = new MongoClient(uri);
    await client.connect();
    dbInstance = client.db(dbName);
  }
  return dbInstance;
}

async function initializeDatabase() {
  const db = await connectDb();
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('messages').createIndex({ authorId: 1 });
  await db.collection('messages').createIndex({ roomId: 1 });
  await db.collection('messages').createIndex({ recipientId: 1 });
  await db.collection('votes').createIndex({ proposalId: 1, userId: 1 }, { unique: true });
  await db.collection('notifications').createIndex({ userId: 1 });
}

module.exports = { connectDb, initializeDatabase };
