import type { WeatherResult, ErrorResult } from './types';
import { mcpManager } from './mcp-client';
import type { Env } from './core-utils';
import { getAppController } from './core-utils';
export type ToolResult = WeatherResult | { content: string } | ErrorResult;
interface SerpApiResponse {
  knowledge_graph?: { title?: string; description?: string; source?: { link?: string } };
  answer_box?: { answer?: string; snippet?: string; title?: string; link?: string };
  organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  local_results?: Array<{ title?: string; address?: string; phone?: string; rating?: number }>;
  error?: string;
}
const customTools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get current weather information for a location',
      parameters: {
        type: 'object',
        properties: { location: { type: 'string', description: 'The city or location name' } },
        required: ['location']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web using Google or fetch content from a specific URL',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for Google search' },
          url: { type: 'string', description: 'Specific URL to fetch content from (alternative to search)' },
          num_results: { type: 'number', description: 'Number of search results to return (default: 5, max: 10)', default: 5 }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'auto_categorize_ticket',
      description: 'Suggest a category and priority for a new ticket based on its title and description',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The ticket title' },
          description: { type: 'string', description: 'The ticket description' },
          availableCategories: { type: 'string', description: 'Comma-separated list of available categories' }
        },
        required: ['title', 'description']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'analyze_sentiment',
      description: 'Analyze the sentiment of a customer message. Returns a score (-1.0 to +1.0) and label (negative, neutral, positive)',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The customer message text' }
        },
        required: ['text']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'suggest_response',
      description: 'Suggest a professional response for an agent to send to a customer based on ticket context',
      parameters: {
        type: 'object',
        properties: {
          ticketTitle: { type: 'string', description: 'The ticket title' },
          ticketCategory: { type: 'string', description: 'The ticket category' },
          ticketStatus: { type: 'string', description: 'Current ticket status (open, in-progress, resolved)' },
          customerMessage: { type: 'string', description: 'The latest customer message to respond to' },
          conversationHistory: { type: 'string', description: 'Brief summary of prior conversation (optional)' }
        },
        required: ['ticketTitle', 'ticketCategory', 'customerMessage']
      }
    }
  }
];
export async function getToolDefinitions() {
  const mcpTools = await mcpManager.getToolDefinitions();
  return [...customTools, ...mcpTools];
}
const createSearchUrl = (query: string, apiKey: string, numResults: number) => {
  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('num', Math.min(numResults, 10).toString());
  return url.toString();
};
const formatSearchResults = (data: SerpApiResponse, query: string, numResults: number): string => {
  const results: string[] = [];
  if (data.knowledge_graph?.title && data.knowledge_graph.description) {
    results.push(`**${data.knowledge_graph.title}**\n${data.knowledge_graph.description}`);
  }
  if (data.answer_box) {
    const { answer, snippet, title } = data.answer_box;
    if (answer) results.push(`**Answer**: ${answer}`);
    else if (snippet) results.push(`**${title || 'Answer'}**: ${snippet}`);
  }
  if (data.organic_results?.length) {
    results.push('\n**Search Results:**');
    data.organic_results.slice(0, numResults).forEach((result, index) => {
      if (result.title && result.link) {
        results.push(`${index + 1}. **${result.title}**\n   ${result.snippet || ''}\n   Link: ${result.link}`);
      }
    });
  }
  return results.length ? `🔍 Search results for "${query}":\n\n${results.join('\n\n')}`
    : `No results found for "${query}".`;
};
async function performWebSearch(query: string, env: Env, numResults = 5): Promise<string> {
  const apiKey = env.SERPAPI_KEY;
  if (!apiKey) {
    return `🔍 Web search requires SerpAPI key. Fallback: https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
  try {
    const response = await fetch(createSearchUrl(query, apiKey, numResults), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebBot/1.0)', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`SerpAPI returned ${response.status}`);
    const data: SerpApiResponse = await response.json();
    if (data.error) throw new Error(`SerpAPI error: ${data.error}`);
    return formatSearchResults(data, query, numResults);
  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes('timeout');
    return `Search failed: ${isTimeout ? 'timeout' : 'API error'}.`;
  }
}
export async function executeTool(name: string, args: Record<string, unknown>, env: Env): Promise<ToolResult> {
  try {
    switch (name) {
      case 'get_weather':
        return {
          location: args.location as string,
          temperature: Math.floor(Math.random() * 40) - 10,
          condition: ['Sunny', 'Cloudy', 'Rainy', 'Snowy'][Math.floor(Math.random() * 4)],
          humidity: Math.floor(Math.random() * 100)
        };
      case 'web_search': {
        const { query, url, num_results = 5 } = args;
        if (typeof url === 'string') {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          const content = await response.text();
          return { content: content.slice(0, 4000) };
        }
        if (typeof query === 'string') {
          const content = await performWebSearch(query, env, num_results as number);
          return { content };
        }
        return { error: 'Either query or url parameter is required' };
      }
      case 'auto_categorize_ticket': {
        const { title, description, availableCategories } = args;
        const settings = (await getAppController(env).getSetting('aiConfig')) as any || {};
        const categoriesList = (availableCategories as string) || ((await getAppController(env).getSetting('system')) as any)?.ticketCategories?.join(', ') || 'Technical Support, Billing, General Inquiry, Complaint';

        const prompt = `Analyze this support ticket and suggest the best category and priority level.

Available categories: ${categoriesList}

Ticket Title: ${title}
Ticket Description: ${description}

Respond in this JSON format only:
{"category": "suggested category", "priority": "low|medium|high|urgent", "reasoning": "brief explanation"}`;

        const aiResult = await callAI(prompt, env);
        // Try to parse JSON from AI response
        try {
          const jsonMatch = aiResult.content?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { content: JSON.stringify({ suggestedCategory: parsed.category || 'General Inquiry', suggestedPriority: parsed.priority || 'medium', reasoning: parsed.reasoning || '' }) };
          }
        } catch { /* Fallback below */ }

        return { content: JSON.stringify({ suggestedCategory: 'General Inquiry', suggestedPriority: 'medium', reasoning: 'AI analysis incomplete' }) };
      }
      case 'analyze_sentiment': {
        const { text } = args;
        const prompt = `Analyze the sentiment of this customer message. Respond in JSON format only:

Message: "${text}"

Respond with: {"score": number between -1.0 and 1.0, "label": "negative|neutral|positive", "reasoning": "brief explanation"}`;

        const aiResult = await callAI(prompt, env);
        try {
          const jsonMatch = aiResult.content?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return { content: jsonMatch[0] };
          }
        } catch { /* Fallback */ }
        return { content: JSON.stringify({ score: 0, label: 'neutral', reasoning: 'AI analysis unavailable' }) };
      }
      case 'suggest_response': {
        const { ticketTitle, ticketCategory, ticketStatus, customerMessage, conversationHistory } = args;
        const context = conversationHistory ? `Prior conversation: ${conversationHistory}\n\n` : '';
        const prompt = `You are a professional customer support agent. Suggest a helpful, empathetic response to this customer.

Ticket: ${ticketTitle}
Category: ${ticketCategory}
Status: ${ticketStatus}

${context}Latest Customer Message:
${customerMessage}

Write a professional, empathetic response that:
1. Acknowledges their concern
2. Provides helpful guidance
3. Is concise and professional
4. Is in Bahasa Indonesia

Respond with just the response text, no JSON formatting.`;

        return await callAI(prompt, env);
      }
      default: {
        const content = await mcpManager.executeTool(name, args);
        return { content };
      }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Call the AI model with a prompt. Uses SystemSettings.aiConfig for model/temperature/maxTokens.
 */
async function callAI(prompt: string, env: Env): Promise<{ content: string }> {
  try {
    const { getAppController } = await import('./core-utils');
    const aiConfig = (await getAppController(env).getSetting('aiConfig')) as any || {};
    const model = aiConfig?.defaultModel || 'gemini-2.5-flash';
    const temperature = aiConfig?.temperature ?? 0.7;
    const maxTokens = aiConfig?.maxTokens ?? 1024;

    const aiBaseUrl = env.CF_AI_BASE_URL;
    const aiApiKey = env.CF_AI_API_KEY;

    if (!aiBaseUrl || !aiApiKey) {
      return { content: '' };
    }

    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      console.error(`[AI] API error: ${response.status}`);
      return { content: '' };
    }

    const data: any = await response.json();
    return { content: data.choices?.[0]?.message?.content || '' };
  } catch (error) {
    console.error('[AI] callAI error:', error);
    return { content: '' };
  }
}

// ─── Programmatic AI Helpers ───────────────────────────────────

/**
 * Run auto-categorize on a ticket (async, non-blocking).
 * Stores results in ticket's aiSuggestedCategory and aiSuggestedPriority fields.
 */
export async function runAutoCategorize(ticketId: string, title: string, description: string, env: Env): Promise<void> {
  try {
    const controller = getAppController(env);
    const settings = (await controller.getSetting('system')) as any || {};
    const categoriesList = settings?.ticketCategories?.join(', ') || 'Technical Support, Billing, General Inquiry, Complaint';

    const prompt = `Analyze this support ticket and suggest the best category and priority level.

Available categories: ${categoriesList}

Ticket Title: ${title}
Ticket Description: ${description}

Respond in this JSON format only:
{"category": "suggested category", "priority": "low|medium|high|urgent", "reasoning": "brief explanation"}`;

    const aiResult = await callAI(prompt, env);
    if (!aiResult.content) return;

    const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      await controller.updateTicket(ticketId, {
        aiSuggestedCategory: parsed.category || null,
        aiSuggestedPriority: parsed.priority || null,
      } as any);
    }
  } catch (error) {
    console.error('[AI] runAutoCategorize error:', error);
  }
}

/**
 * Run sentiment analysis on a customer message (async, non-blocking).
 * Stores results in ticket's sentimentScores array and sets sentimentAlert if negative.
 */
export async function runSentimentAnalysis(ticketId: string, messageId: string, text: string, env: Env): Promise<void> {
  try {
    const prompt = `Analyze the sentiment of this customer message. Respond in JSON format only:

Message: "${text}"

Respond with: {"score": number between -1.0 and 1.0, "label": "negative|neutral|positive"}`;

    const aiResult = await callAI(prompt, env);
    if (!aiResult.content) return;

    const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const score = typeof parsed.score === 'number' ? parsed.score : 0;
      const label = parsed.label || 'neutral';

      const controller = getAppController(env);
      const ticket = await controller.getTicket(ticketId);
      if (!ticket) return;

      const sentimentScores = ticket.sentimentScores || [];
      sentimentScores.push({ score, label, timestamp: new Date().toISOString(), messageId });

      // Set alert if negative
      const sentimentAlert = score < -0.5 ? { score, label, timestamp: new Date().toISOString() } : ticket.sentimentAlert || null;

      await controller.updateTicket(ticketId, { sentimentScores, sentimentAlert } as any);
    }
  } catch (error) {
    console.error('[AI] runSentimentAnalysis error:', error);
  }
}

/**
 * Run AI response suggestion for a ticket.
 * Returns the suggested response text.
 */
export async function runResponseSuggestion(ticketId: string, env: Env): Promise<string> {
  try {
    const controller = getAppController(env);
    const ticket = await controller.getTicket(ticketId);
    if (!ticket) return '';

    const replies = await controller.getTicketReplies(ticketId);
    const customerReplies = replies.filter(r => r.sender === 'customer');
    const latestCustomerMsg = customerReplies.length > 0 ? customerReplies[customerReplies.length - 1].text : ticket.description;

    const conversationSummary = replies.slice(-5).map(r => `[${r.sender}] ${r.text.substring(0, 100)}`).join('\n');

    const prompt = `You are a professional customer support agent. Suggest a helpful, empathetic response to this customer.

Ticket: ${ticket.title}
Category: ${ticket.category}
Status: ${ticket.status}

Conversation History:
${conversationSummary}

Latest Customer Message:
${latestCustomerMsg}

Write a professional, empathetic response that:
1. Acknowledges their concern
2. Provides helpful guidance
3. Is concise and professional
4. Is in Bahasa Indonesia

Respond with just the response text, no JSON formatting.`;

    const result = await callAI(prompt, env);
    return result.content;
  } catch (error) {
    console.error('[AI] runResponseSuggestion error:', error);
    return '';
  }
}