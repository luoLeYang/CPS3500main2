// Script to seed demo users
// Run with: node scripts/seed.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'dormitory';
const securityQuestion = '统一密保问题：请输入密保答案';
const securityAnswer = '123';
if (!uri) { console.error('MONGODB_URI not set in .env.local'); process.exit(1); }

const client = new MongoClient(uri);

async function createUser(db, name, email, password, role = 'resident', dormId = 'dorm1') {
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    console.log(`User ${email} already exists`);
    return { id: String(existingUser._id), ...existingUser };
  }

  const userId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);
  const hashedSecurityAnswer = await bcrypt.hash(securityAnswer, 10);
  await db.collection('users').insertOne({
    _id: userId, name, email, password: hashedPassword,
    securityQuestion, securityAnswer: hashedSecurityAnswer,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    role, dormId, createdAt: new Date(), updatedAt: new Date(),
  });
  console.log(`Created user: ${email}`);
  return { id: userId, name, email };
}

async function seed() {
  await client.connect();
  const db = client.db(dbName);

  // Ensure indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('votes').createIndex({ proposalId: 1, userId: 1 }, { unique: true });

  console.log('Seeding database...');

  const updates = [
    { email: 'user1.com', legacyEmail: 'user1@example.com', name: 'Alice Chen', role: 'resident', dormId: 'dorm1' },
    { email: 'user2.com', legacyEmail: 'user2@example.com', name: 'Bob Smith', role: 'resident', dormId: 'dorm1' },
    { email: 'user3.com', legacyEmail: 'user3@example.com', name: 'Chris Wang', role: 'resident', dormId: 'dorm1' },
    { email: 'user4.com', legacyEmail: 'user4@example.com', name: 'Diana Lee', role: 'resident', dormId: 'dorm1' },
    { email: 'staffadmin.com', legacyEmail: 'staffadmin@example.com', name: 'Staff Admin', role: 'employee_admin', dormId: 'dorm1' },
  ];

  for (const u of updates) {
    const existing = await db.collection('users').findOne({
      $or: [{ email: u.email }, { email: u.legacyEmail }],
    });
    if (existing) {
      const hashedDemoPassword = await bcrypt.hash('password123', 10);
      const hashedSecurityAnswer = await bcrypt.hash(securityAnswer, 10);
      await db.collection('users').updateOne(
        { _id: existing._id },
        {
          $set: {
            name: u.name,
            email: u.email,
            password: hashedDemoPassword,
            role: u.role,
            dormId: u.dormId,
            securityQuestion,
            securityAnswer: hashedSecurityAnswer,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`,
            updatedAt: new Date(),
          }
        }
      );
      console.log(`Updated: ${u.email} -> ${u.name} (password reset to demo default)`);
    } else {
      await createUser(db, u.name, u.email, 'password123', u.role, u.dormId);
    }
  }

  const aliceDoc = await db.collection('users').findOne({ email: 'user1.com' });
  const bobDoc   = await db.collection('users').findOne({ email: 'user2.com' });
  const chrisDoc = await db.collection('users').findOne({ email: 'user3.com' });
  const dianaDoc = await db.collection('users').findOne({ email: 'user4.com' });

  if (!aliceDoc || !bobDoc || !chrisDoc || !dianaDoc) {
    console.log('Users not found, skipping proposals/messages seed.');
    return;
  }

  const alice = { id: String(aliceDoc._id), ...aliceDoc };
  const bob   = { id: String(bobDoc._id),   ...bobDoc };
  const chris = { id: String(chrisDoc._id), ...chrisDoc };
  const diana = { id: String(dianaDoc._id), ...dianaDoc };


  const existingMsgCount = await db.collection('messages').countDocuments({ isPrivate: false });
  if (existingMsgCount === 0) {
    const groupMessages = [
      { authorId: alice.id, content: 'Hey everyone! Just a reminder that we have a dorm meeting this Friday at 7 PM 🏠' },
      { authorId: bob.id,   content: 'Thanks Alice! Should we bring any agenda items?' },
      { authorId: chris.id, content: "I'd like to discuss the cleaning schedule – it hasn't been followed well lately." },
      { authorId: diana.id, content: 'Also we should talk about quiet hours during finals week. It gets really noisy after midnight.' },
      { authorId: alice.id, content: 'Great points! I\'ll create formal proposals for both topics so we can vote on them.' },
      { authorId: bob.id,   content: 'Sounds good. Also the common room TV remote has been missing for a week 😅' },
      { authorId: chris.id, content: 'lol I think it fell behind the couch, will check' },
      { authorId: diana.id, content: 'Found it!! It was under the cushion 🎉' },
      { authorId: alice.id, content: 'Haha mystery solved. See you all Friday!' },
      { authorId: bob.id,   content: 'By the way, does anyone know the WiFi password for the 5GHz network? Mine keeps dropping.' },
      { authorId: chris.id, content: 'It\'s DormRoom2024! The RA gave it to me last month.' },
      { authorId: diana.id, content: 'Thanks Chris! I had the same problem 😊' },
      { authorId: alice.id, content: 'Quick question – is anyone using the washing machine right now? I need to do laundry.' },
      { authorId: bob.id,   content: 'Nope, it\'s free! I just finished.' },
      { authorId: alice.id, content: 'Perfect, thanks Bob!' },
      { authorId: chris.id, content: 'Reminder: the cleaning proposal is still waiting for Diana\'s vote. Please check it out 👀' },
      { authorId: diana.id, content: 'Oh right, I\'ll vote now!' },
      { authorId: diana.id, content: 'Done! Left a comment too.' },
      { authorId: bob.id,   content: 'Hey, I cooked too much pasta tonight, anyone want some? 🍝' },
      { authorId: alice.id, content: 'Yes please!! Coming over in 5 min 😂' },
      { authorId: chris.id, content: 'Same, be there in a sec lol' },
      { authorId: diana.id, content: 'Save some for me!! On my way back from the library' },
      { authorId: bob.id,   content: 'Haha ok ok, made enough for everyone 😄' },
      { authorId: alice.id, content: 'Has anyone seen my blue umbrella? I left it in the hallway yesterday.' },
      { authorId: chris.id, content: 'I think I saw it near the front door, let me check' },
      { authorId: chris.id, content: 'Yes, it\'s here! I\'ll hang it on the hook so it doesn\'t get knocked around.' },
      { authorId: alice.id, content: 'Thank you so much Chris! 🙏' },
      { authorId: diana.id, content: 'Good morning everyone! Anyone up for a coffee run before class? ☕' },
      { authorId: bob.id,   content: 'I\'m in! Leaving in 10 minutes.' },
      { authorId: alice.id, content: 'Can you grab me an oat latte? I\'ll Venmo you 😊' },
      { authorId: diana.id, content: 'Sure! Chris, you want anything?' },
      { authorId: chris.id, content: 'Just a black coffee please, thanks Diana!' },
    ];
    const base = Date.now() - groupMessages.length * 4 * 60000;
    await db.collection('messages').insertMany(groupMessages.map((m, i) => ({
      _id: crypto.randomUUID(), content: m.content, authorId: m.authorId,
      isPrivate: false, roomId: 'group', recipientId: null,
      createdAt: new Date(base + i * 4 * 60000), updatedAt: new Date(base + i * 4 * 60000),
    })));
    console.log('Inserted group chat messages.');
  } else {
    console.log('Group messages already exist, skipping.');
  }

  const existingDMCount = await db.collection('messages').countDocuments({ isPrivate: true, authorId: alice.id, recipientId: bob.id });
  if (existingDMCount === 0) {
    const dmMessages = [
      { authorId: alice.id, recipientId: bob.id,   content: 'Hey Bob, can you cover my kitchen-cleaning shift this Saturday? I have an exam.' },
      { authorId: bob.id,   recipientId: alice.id, content: 'Sure no problem! You can cover mine next Wednesday then 😊' },
      { authorId: alice.id, recipientId: bob.id,   content: 'Deal! Thanks so much, you\'re a lifesaver.' },
      { authorId: bob.id,   recipientId: alice.id, content: 'No worries! Good luck on your exam 💪' },
      { authorId: alice.id, recipientId: bob.id,   content: 'Thank you! By the way, did you submit your part of the group project yet?' },
      { authorId: bob.id,   recipientId: alice.id, content: 'Just finished it literally 10 minutes ago 😅 Cutting it close as usual' },
      { authorId: alice.id, recipientId: bob.id,   content: 'Haha classic Bob. Mine\'s been done since yesterday 😄' },
    ];
    const base = Date.now() - dmMessages.length * 8 * 60000;
    await db.collection('messages').insertMany(dmMessages.map((m, i) => ({
      _id: crypto.randomUUID(), content: m.content, authorId: m.authorId,
      isPrivate: true, recipientId: m.recipientId, roomId: null,
      createdAt: new Date(base + i * 8 * 60000), updatedAt: new Date(base + i * 8 * 60000),
    })));
    console.log('Inserted Alice-Bob DM messages.');
  } else {
    console.log('Alice-Bob DM messages already exist, skipping.');
  }

  const existingDM2Count = await db.collection('messages').countDocuments({ isPrivate: true, authorId: chris.id, recipientId: diana.id });
  if (existingDM2Count === 0) {
    const dmMessages2 = [
      { authorId: chris.id, recipientId: diana.id, content: 'Hey Diana, what did you think about the guest policy proposal Bob made?' },
      { authorId: diana.id, recipientId: chris.id, content: 'Honestly I think 2 nights per month is too many. That\'s why I voted against it.' },
      { authorId: chris.id, recipientId: diana.id, content: 'I get that. I suggested a modification – guests should leave by 11 PM on weekdays.' },
      { authorId: diana.id, recipientId: chris.id, content: 'That\'s actually a good compromise. Maybe we can convince Bob to update the proposal.' },
      { authorId: chris.id, recipientId: diana.id, content: 'I\'ll message him later. Also – are you going to the library tonight? I need a study buddy 📚' },
      { authorId: diana.id, recipientId: chris.id, content: 'Yes! Planning to go around 7. Want to go together?' },
      { authorId: chris.id, recipientId: diana.id, content: 'Perfect, see you at 7 then 👍' },
    ];
    const base2 = Date.now() - dmMessages2.length * 10 * 60000;
    await db.collection('messages').insertMany(dmMessages2.map((m, i) => ({
      _id: crypto.randomUUID(), content: m.content, authorId: m.authorId,
      isPrivate: true, recipientId: m.recipientId, roomId: null,
      createdAt: new Date(base2 + i * 10 * 60000), updatedAt: new Date(base2 + i * 10 * 60000),
    })));
    console.log('Inserted Chris-Diana DM messages.');
  } else {
    console.log('Chris-Diana DM messages already exist, skipping.');
  }

  const existingProposalsCount = await db.collection('proposals').countDocuments();
  if (existingProposalsCount === 0) {
    const proposals = [
      {
        id: crypto.randomUUID(),
        title: 'Weekly Cleaning Schedule Rotation',
        description: 'Establish a fair weekly rotation for cleaning common areas (kitchen, bathroom, living room). Each resident takes one area per week.',
        type: 'Cleaning Schedule',
        initiatorId: alice.id,
        content: 'Rotation plan:\n- Week A: Alice (kitchen), Bob (bathroom), Chris (living room), Diana (hallway)\n- Week B: rotate one position clockwise\nCleaning must be done by Sunday 10 PM.',
        status: 'active',
      },
      {
        id: crypto.randomUUID(),
        title: 'Quiet Hours During Finals Week',
        description: 'Enforce strict quiet hours from 10 PM to 8 AM during the two weeks of final exams. No parties, loud music, or gatherings in common areas.',
        type: 'Quiet Hours',
        initiatorId: diana.id,
        content: 'Finals quiet hours: 10 PM – 8 AM. Violations should be reported to the dorm supervisor. Exceptions must be agreed by all residents.',
        status: 'active',
      },
      {
        id: crypto.randomUUID(),
        title: 'Overnight Guest Policy',
        description: 'Guests may stay overnight up to 2 nights per month per resident. Advance notice of 24 hours required. Guests must follow dorm rules.',
        type: 'Visitor Policy',
        initiatorId: bob.id,
        content: 'Guest rules:\n- Max 2 overnight stays per month\n- 24-hour advance notice to all roommates\n- Guests are the resident\'s responsibility\n- No guests during exam periods',
        status: 'active',
      },
    ];

    const now = new Date().toISOString();

    for (const p of proposals) {
      await db.collection('proposals').insertOne({
        _id: p.id, title: p.title, description: p.description, type: p.type,
        initiatorId: p.initiatorId, status: p.status, content: p.content,
        createdAt: now, updatedAt: now,
      });
    }
    // Votes
    await db.collection('votes').insertMany([
      { _id: crypto.randomUUID(), proposalId: proposals[0].id, userId: bob.id,   voteType: 'approve', comment: 'Sounds fair and easy to follow!', createdAt: now },
      { _id: crypto.randomUUID(), proposalId: proposals[0].id, userId: chris.id, voteType: 'modify',  comment: 'Can we also add a bathroom deep-clean once a month?', createdAt: now },
      { _id: crypto.randomUUID(), proposalId: proposals[1].id, userId: alice.id, voteType: 'approve', comment: 'Absolutely need this during finals!', createdAt: now },
      { _id: crypto.randomUUID(), proposalId: proposals[1].id, userId: bob.id,   voteType: 'approve', comment: 'Agreed, the noise last finals was terrible.', createdAt: now },
      { _id: crypto.randomUUID(), proposalId: proposals[2].id, userId: diana.id, voteType: 'reject',  comment: "I think 2 nights per month is too many. I'd prefer 1 night per month.", createdAt: now },
      { _id: crypto.randomUUID(), proposalId: proposals[2].id, userId: chris.id, voteType: 'modify',  comment: 'Can we add a rule that guests must leave by 11 PM on weekdays?', createdAt: now },
    ]);
    // Notifications
    const notifs = [];
    for (const user of [alice, bob, chris, diana]) {
      for (const p of proposals) {
        if (user.id !== p.initiatorId) {
          notifs.push({
            _id: crypto.randomUUID(), userId: user.id, type: 'proposal',
            title: `New Proposal: ${p.title}`,
            content: 'A new proposal has been submitted by your roommate. Check it out and cast your vote!',
            isRead: false, relatedId: p.id, createdAt: now, updatedAt: now,
          });
        }
      }
    }
    await db.collection('notifications').insertMany(notifs);
    console.log('Inserted proposals, votes, and notifications.');
  } else {
    console.log('Proposals already exist, skipping.');
  }

  const approvedCount = await db.collection('proposals').countDocuments({ status: 'approved' });
  if (approvedCount === 0) {
    const firstActive = await db.collection('proposals').findOne({ status: 'active' });
    if (firstActive) {
      await db.collection('proposals').updateOne(
        { _id: firstActive._id },
        { $set: { status: 'approved', updatedAt: new Date() } }
      );
      console.log(`Marked proposal as approved for admin view: ${firstActive.title}`);
    }
  }

  console.log('Seeding complete!');
  console.log('You can log in with:');
  console.log('  user1.com / password123  (Alice Chen)');
  console.log('  user2.com / password123  (Bob Smith)');
  console.log('  user3.com / password123  (Chris Wang)');
  console.log('  user4.com / password123  (Diana Lee)');
  console.log('  staffadmin.com / password123  (Staff Admin)');
}

seed().catch(console.error).finally(() => client.close());
