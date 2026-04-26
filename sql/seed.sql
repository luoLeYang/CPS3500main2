PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Demo password for all seeded users: password123
-- bcrypt hash generated from the current app dependency.

INSERT OR IGNORE INTO users (id, name, email, password, avatar, role, dormId) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Alice Chen', 'user1@example.com', '$2b$10$tZc4T4Zywbf9lTxGIRviueqnSE3GcIoOJ6NGr7WdpgsgufxwExVGe', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice%20Chen', 'resident', 'dorm1'),
  ('22222222-2222-2222-2222-222222222222', 'Bob Smith', 'user2@example.com', '$2b$10$tZc4T4Zywbf9lTxGIRviueqnSE3GcIoOJ6NGr7WdpgsgufxwExVGe', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob%20Smith', 'resident', 'dorm1'),
  ('33333333-3333-3333-3333-333333333333', 'Chris Wang', 'user3@example.com', '$2b$10$tZc4T4Zywbf9lTxGIRviueqnSE3GcIoOJ6NGr7WdpgsgufxwExVGe', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chris%20Wang', 'resident', 'dorm1'),
  ('44444444-4444-4444-4444-444444444444', 'Diana Lee', 'user4@example.com', '$2b$10$tZc4T4Zywbf9lTxGIRviueqnSE3GcIoOJ6NGr7WdpgsgufxwExVGe', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana%20Lee', 'resident', 'dorm1');

INSERT OR IGNORE INTO proposals (id, title, description, type, initiatorId, status, content, createdAt, updatedAt) VALUES
  (
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Weekly Cleaning Schedule Rotation',
    'Establish a fair weekly rotation for cleaning common areas.',
    'Cleaning Schedule',
    '11111111-1111-1111-1111-111111111111',
    'active',
    'Rotation plan: Week A Alice kitchen, Bob bathroom, Chris living room, Diana hallway. Rotate weekly.',
    '2026-04-20 08:00:00',
    '2026-04-20 08:00:00'
  ),
  (
    'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Quiet Hours During Finals Week',
    'Enforce quiet hours from 10 PM to 8 AM during finals.',
    'Quiet Hours',
    '44444444-4444-4444-4444-444444444444',
    'active',
    'Quiet hours from 10 PM to 8 AM. Violations should be reported to the dorm supervisor.',
    '2026-04-20 08:10:00',
    '2026-04-20 08:10:00'
  ),
  (
    'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'Overnight Guest Policy',
    'Guests may stay overnight up to 2 nights per month per resident.',
    'Visitor Policy',
    '22222222-2222-2222-2222-222222222222',
    'active',
    'Guest rules: max 2 overnight stays per month, 24-hour notice, no guests during exam periods.',
    '2026-04-20 08:20:00',
    '2026-04-20 08:20:00'
  );

INSERT OR IGNORE INTO votes (id, proposalId, userId, voteType, comment, createdAt) VALUES
  ('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '22222222-2222-2222-2222-222222222222', 'approve', 'Sounds fair and easy to follow.', '2026-04-20 09:00:00'),
  ('bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '33333333-3333-3333-3333-333333333333', 'modify', 'Can we add a monthly bathroom deep-clean?', '2026-04-20 09:05:00'),
  ('bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'approve', 'Absolutely needed during finals.', '2026-04-20 09:10:00'),
  ('bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 'approve', 'Agreed, we need quieter nights.', '2026-04-20 09:12:00'),
  ('bbbbbbb5-bbbb-bbbb-bbbb-bbbbbbbbbbb5', 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '44444444-4444-4444-4444-444444444444', 'reject', 'Two nights per month feels too many.', '2026-04-20 09:15:00'),
  ('bbbbbbb6-bbbb-bbbb-bbbb-bbbbbbbbbbb6', 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '33333333-3333-3333-3333-333333333333', 'modify', 'Weekday guests should leave by 11 PM.', '2026-04-20 09:18:00');

INSERT OR IGNORE INTO messages (id, content, authorId, isPrivate, recipientId, roomId, createdAt, updatedAt) VALUES
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1', 'Hey everyone, we have a dorm meeting this Friday at 7 PM.', '11111111-1111-1111-1111-111111111111', 0, NULL, 'group', '2026-04-20 08:30:00', '2026-04-20 08:30:00'),
  ('ccccccc2-cccc-cccc-cccc-ccccccccccc2', 'Thanks Alice. Should we bring any agenda items?', '22222222-2222-2222-2222-222222222222', 0, NULL, 'group', '2026-04-20 08:34:00', '2026-04-20 08:34:00'),
  ('ccccccc3-cccc-cccc-cccc-ccccccccccc3', 'I want to discuss the cleaning schedule. It has not been followed well lately.', '33333333-3333-3333-3333-333333333333', 0, NULL, 'group', '2026-04-20 08:38:00', '2026-04-20 08:38:00'),
  ('ccccccc4-cccc-cccc-cccc-ccccccccccc4', 'Hey Bob, can you cover my kitchen-cleaning shift this Saturday?', '11111111-1111-1111-1111-111111111111', 1, '22222222-2222-2222-2222-222222222222', NULL, '2026-04-20 10:00:00', '2026-04-20 10:00:00'),
  ('ccccccc5-cccc-cccc-cccc-ccccccccccc5', 'Sure. You can cover mine next Wednesday.', '22222222-2222-2222-2222-222222222222', 1, '11111111-1111-1111-1111-111111111111', NULL, '2026-04-20 10:05:00', '2026-04-20 10:05:00');

INSERT OR IGNORE INTO notifications (id, userId, type, title, content, isRead, relatedId, createdAt, updatedAt) VALUES
  ('ddddddd1-dddd-dddd-dddd-ddddddddddd1', '22222222-2222-2222-2222-222222222222', 'proposal', 'New Proposal: Weekly Cleaning Schedule Rotation', 'A new proposal has been submitted. Please review and vote.', 0, 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-04-20 09:20:00', '2026-04-20 09:20:00'),
  ('ddddddd2-dddd-dddd-dddd-ddddddddddd2', '33333333-3333-3333-3333-333333333333', 'proposal', 'New Proposal: Weekly Cleaning Schedule Rotation', 'A new proposal has been submitted. Please review and vote.', 0, 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-04-20 09:20:00', '2026-04-20 09:20:00'),
  ('ddddddd3-dddd-dddd-dddd-ddddddddddd3', '11111111-1111-1111-1111-111111111111', 'proposal', 'New Proposal: Quiet Hours During Finals Week', 'A new proposal has been submitted. Please review and vote.', 0, 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2026-04-20 09:22:00', '2026-04-20 09:22:00'),
  ('ddddddd4-dddd-dddd-dddd-ddddddddddd4', '44444444-4444-4444-4444-444444444444', 'message', 'New message from Alice Chen', 'Hey Bob, can you cover my kitchen-cleaning shift this Saturday?', 0, 'ccccccc4-cccc-cccc-cccc-ccccccccccc4', '2026-04-20 10:00:00', '2026-04-20 10:00:00');

COMMIT;