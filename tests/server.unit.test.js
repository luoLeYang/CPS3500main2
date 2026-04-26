const test = require('node:test');
const assert = require('node:assert/strict');

const { buildSystemPrompt } = require('../server/ai');
const { createErrorHandler } = require('../server/app');

test('buildSystemPrompt includes relevant screen context', () => {
  const prompt = buildSystemPrompt({
    currentUser: { name: 'Alice Chen', email: 'user1@example.com' },
    activeTab: 'proposals',
    proposals: [
      {
        type: 'Quiet Hours',
        title: 'Quiet Hours During Finals Week',
        initiatorName: 'Diana Lee',
        description: 'Quiet after 10 PM.',
        content: '10 PM to 8 AM',
        approveCount: 2,
        rejectCount: 0,
        modifyCount: 1,
        votes: [{ name: 'Bob Smith', voteType: 'approve', comment: 'Looks good.' }],
      },
    ],
    recentMessages: [{ name: 'Chris Wang', content: 'Please vote on the proposal.' }],
    notifications: [{ title: 'New Proposal', content: 'Please review.', isRead: false }],
  });

  assert.match(prompt, /Logged-in user: Alice Chen \(user1@example.com\)/);
  assert.match(prompt, /Current tab: proposals/);
  assert.match(prompt, /Quiet Hours During Finals Week/);
  assert.match(prompt, /Chris Wang: Please vote on the proposal\./);
  assert.match(prompt, /\(unread\) New Proposal: Please review\./);
});

test('createErrorHandler returns a 500 payload', () => {
  const logged = [];
  const sendError = createErrorHandler((...args) => logged.push(args));
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  sendError(response, new Error('boom'), 'Test error:');

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: 'Internal server error' });
  assert.equal(logged.length, 1);
  assert.equal(logged[0][0], 'Test error:');
});