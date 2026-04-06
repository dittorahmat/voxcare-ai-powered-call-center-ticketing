/**
 * Chat AI Bot for customer greeting and info collection.
 * Uses OpenAI SDK via Cloudflare AI Gateway for conversational info gathering.
 */

const SYSTEM_PROMPT = `You are VoxCare, a friendly customer service assistant. Your job is to:
1. Greet the customer warmly
2. Ask for their name (if not already provided)
3. Ask about the problem they're experiencing
4. Ask 1-2 follow-up questions to understand the issue better
5. Suggest basic troubleshooting if applicable
6. Once you have enough information, respond with ONLY a JSON object in this format:
{"ready_for_agent":true,"summary":"Brief summary of the issue","category":"Technical Support|Billing|General Inquiry|Complaint","priority":"low|medium|high|urgent","troubleshooting_steps":["step 1","step 2"]}

Rules:
- Be friendly and professional
- Keep responses short (2-3 sentences max)
- Don't give definitive answers — you're gathering info for a human agent
- If the customer seems frustrated, acknowledge it and assure them an agent will help soon
- Only output JSON when ready_for_agent is true, otherwise respond normally`;

export async function processChatMessage(
  message: string,
  conversationHistory: { role: string; content: string }[],
  apiKey?: string,
  baseUrl?: string
): Promise<{ reply: string; readyForAgent: boolean; data?: any }> {
  if (!apiKey) {
    // Fallback: simple rule-based bot
    return fallbackBot(message, conversationHistory);
  }

  try {
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10), // last 10 messages
      { role: 'user' as const, content: message },
    ];

    const res = await fetch(`${baseUrl || 'https://gateway.ai.cloudflare.com/v1'}/openai/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      console.error('[ChatBot] AI request failed:', res.status);
      return fallbackBot(message, conversationHistory);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "I'm connecting you with an agent.";

    // Check if reply is JSON (ready for agent)
    if (reply.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(reply.trim());
        if (parsed.ready_for_agent) {
          return {
            reply: "Thank you! I'm connecting you with an agent now. Please hold on.",
            readyForAgent: true,
            data: {
              summary: parsed.summary,
              category: parsed.category,
              priority: parsed.priority,
              troubleshooting_steps: parsed.troubleshooting_steps || [],
            },
          };
        }
      } catch { /* not JSON, continue normally */ }
    }

    return { reply, readyForAgent: false };
  } catch (err) {
    console.error('[ChatBot] AI error:', err);
    return fallbackBot(message, conversationHistory);
  }
}

function fallbackBot(message: string, history: { role: string; content: string }[]): { reply: string; readyForAgent: boolean; data?: any } {
  const msg = message.toLowerCase();
  const turnCount = history.filter(h => h.role === 'user').length;

  if (turnCount <= 1) {
    return { reply: "Hello! Welcome to VoxCare support. My name is VoxCare AI. Could you tell me your name and briefly describe the issue you're experiencing?", readyForAgent: false };
  }

  if (turnCount <= 2) {
    let category = 'General Inquiry';
    let priority = 'medium';
    if (msg.includes('internet') || msg.includes('network') || msg.includes('connection') || msg.includes('wifi')) {
      category = 'Technical Support';
      priority = 'high';
      return { reply: "Thanks! For internet issues, could you try restarting your modem/router? Unplug it for 30 seconds and plug it back in. Did that help?", readyForAgent: false };
    }
    if (msg.includes('bill') || msg.includes('charge') || msg.includes('payment') || msg.includes('invoice')) {
      category = 'Billing';
      priority = 'medium';
    }
    if (msg.includes('urgent') || msg.includes('emergency') || msg.includes('down') || msg.includes('not working at all')) {
      priority = 'urgent';
    }
    return { reply: "I understand. Let me get a bit more detail — when did this issue start, and is it affecting just you or others too?", readyForAgent: false };
  }

  // Ready for agent
  let category = 'General Inquiry';
  let priority = 'medium';
  if (msg.includes('internet') || msg.includes('network') || msg.includes('connection') || msg.includes('wifi')) { category = 'Technical Support'; priority = 'high'; }
  if (msg.includes('bill') || msg.includes('charge') || msg.includes('payment')) { category = 'Billing'; }
  if (msg.includes('urgent') || msg.includes('emergency') || msg.includes('down')) { priority = 'urgent'; }

  const summary = message.substring(0, 200);

  return {
    reply: "Thank you for the details! I'm connecting you with a human agent now who can help you further. Please hold on.",
    readyForAgent: true,
    data: {
      summary,
      category,
      priority,
      troubleshooting_steps: ['Asked about the issue', 'Requested follow-up details'],
    },
  };
}
