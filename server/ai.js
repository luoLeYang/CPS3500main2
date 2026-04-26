function buildSystemPrompt(ctx) {
  const lines = [
    'You are a helpful AI assistant embedded in a dormitory communication system.',
    'You help residents with questions about proposals, votes, messages, and dorm life.',
    'Be concise, friendly, and practical.',
    '',
    '=== CURRENT APP STATE (what the user sees on screen) ===',
  ];

  if (ctx?.currentUser) {
    lines.push(`Logged-in user: ${ctx.currentUser.name} (${ctx.currentUser.email})`);
  }

  if (ctx?.activeTab) {
    lines.push(`Current tab: ${ctx.activeTab}`);
  }

  if (ctx?.proposals?.length) {
    lines.push('');
    lines.push('Active Proposals (full detail):');
    ctx.proposals.forEach((proposal, index) => {
      lines.push(`\n  ${index + 1}. [${proposal.type}] "${proposal.title}"`);
      lines.push(`     Initiated by: ${proposal.initiatorName}`);
      if (proposal.description) lines.push(`     Description: ${proposal.description}`);
      if (proposal.content) lines.push(`     Full content: ${proposal.content}`);
      lines.push(`     Votes - Approve: ${proposal.approveCount || 0}, Reject: ${proposal.rejectCount || 0}, Suggest Modification: ${proposal.modifyCount || 0}`);
      if (proposal.votes?.length) {
        lines.push('     Individual votes:');
        proposal.votes.forEach((vote) => {
          const label = vote.voteType === 'approve' ? 'Approve' : vote.voteType === 'reject' ? 'Reject' : 'Suggest Modification';
          if (vote.comment) {
            lines.push(`       - ${vote.name}: ${label} - "${vote.comment}"`);
          } else {
            lines.push(`       - ${vote.name}: ${label}`);
          }
        });
      }
    });
  } else if (ctx?.activeTab === 'proposals') {
    lines.push('No active proposals at the moment.');
  }

  if (ctx?.recentMessages?.length) {
    lines.push('');
    lines.push(`Recent messages in ${ctx.chatMode === 'group' ? 'Group Chat' : `DM with ${ctx.chatPartner}`}:`);
    ctx.recentMessages.slice(-10).forEach((message) => {
      lines.push(`  ${message.name}: ${message.content}`);
    });
  }

  if (ctx?.notifications?.length) {
    lines.push('');
    lines.push('Recent notifications:');
    ctx.notifications.slice(0, 5).forEach((notification) => {
      const readStatus = notification.isRead ? '(read)' : '(unread)';
      lines.push(`  ${readStatus} ${notification.title}: ${notification.content}`);
    });
  }

  lines.push('');
  lines.push('=== END OF SCREEN CONTEXT ===');
  lines.push('Use the above context to give accurate, context-aware answers.');

  return lines.join('\n');
}

module.exports = {
  buildSystemPrompt,
};