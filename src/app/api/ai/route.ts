import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, screenContext } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';

    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      return NextResponse.json(
        { error: 'AI API key not configured. Please set OPENAI_API_KEY in .env.local.' },
        { status: 503 }
      );
    }

    // Build system prompt with current screen context
    const systemPrompt = buildSystemPrompt(screenContext);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('AI API error:', errorData);
      return NextResponse.json(
        { error: `AI service error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI assistant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildSystemPrompt(ctx: any): string {
  const lines: string[] = [
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
    ctx.proposals.forEach((p: any, i: number) => {
      lines.push(`\n  ${i + 1}. [${p.type}] "${p.title}"`)
      lines.push(`     Initiated by: ${p.initiatorName}`);
      if (p.description) lines.push(`     Description: ${p.description}`);
      if (p.content) lines.push(`     Full content: ${p.content}`);
      lines.push(`     Votes — Approve: ${p.approveCount || 0}, Reject: ${p.rejectCount || 0}, Suggest Modification: ${p.modifyCount || 0}`);
      if (p.votes?.length) {
        lines.push('     Individual votes:');
        p.votes.forEach((v: any) => {
          const label = v.voteType === 'approve' ? '✅ Approve' : v.voteType === 'reject' ? '❌ Reject' : '✏️ Suggest Modification';
          if (v.comment) {
            lines.push(`       - ${v.name}: ${label} — "${v.comment}"`);
          } else {
            lines.push(`       - ${v.name}: ${label}`);
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
    ctx.recentMessages.slice(-10).forEach((m: any) => {
      lines.push(`  ${m.name}: ${m.content}`);
    });
  }

  if (ctx?.notifications?.length) {
    lines.push('');
    lines.push('Recent notifications:');
    ctx.notifications.slice(0, 5).forEach((n: any) => {
      const readStatus = n.isRead ? '(read)' : '(unread)';
      lines.push(`  ${readStatus} ${n.title}: ${n.content}`);
    });
  }

  if (ctx?.selectedProposal) {
    const sp = ctx.selectedProposal;
    lines.push('');
    lines.push(`Currently selected proposal: "${sp.title}" [${sp.type}]`);
    lines.push(`  Description: ${sp.description}`);
    if (sp.content) lines.push(`  Full content: ${sp.content}`);
    lines.push(`  Initiated by: ${sp.initiatorName}`);
    lines.push(`  Votes — Approve: ${sp.approveCount || 0}, Reject: ${sp.rejectCount || 0}, Suggest Modification: ${sp.modifyCount || 0}`);
    if (sp.votes?.length) {
      lines.push('  Individual votes:');
      sp.votes.forEach((v: any) => {
        const label = v.voteType === 'approve' ? '✅ Approve' : v.voteType === 'reject' ? '❌ Reject' : '✏️ Suggest Modification';
        if (v.comment) {
          lines.push(`    - ${v.name}: ${label} — "${v.comment}"`);
        } else {
          lines.push(`    - ${v.name}: ${label}`);
        }
      });
    }
  }

  lines.push('');
  lines.push('=== END OF SCREEN CONTEXT ===');
  lines.push('Use the above context to give accurate, context-aware answers.');

  return lines.join('\n');
}
