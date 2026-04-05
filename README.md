# Cloudflare Workers AI Chat Application

[cloudflarebutton]

A production-ready, full-stack AI chat application built on Cloudflare Workers. Features durable multi-session conversations powered by Cloudflare Agents, streaming responses, tool calling (weather, web search), model switching (Gemini models), and a modern React UI with Shadcn/UI components.

## ✨ Key Features

- **Multi-Session Chat**: Create, manage, and switch between conversations with automatic session persistence.
- **Streaming Responses**: Real-time message streaming for natural chat experience.
- **AI Tool Calling**: Built-in tools for weather lookup, web search, and extensible MCP integration.
- **Model Selection**: Switch between Gemini 2.5 Flash, Pro, and more via Cloudflare AI Gateway.
- **Session Management**: List, rename, delete sessions; clear all with stats.
- **Responsive UI**: Modern, accessible design with dark/light themes, Tailwind CSS, and animations.
- **Production-Ready**: TypeScript, error handling, CORS, logging, and Cloudflare Durable Objects.
- **Extensible**: Easy to add custom routes, tools, and AI extensions.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/UI, React Query, Lucide Icons
- **Backend**: Cloudflare Workers, Hono, Cloudflare Agents SDK, Durable Objects, OpenAI SDK
- **AI Integration**: Cloudflare AI Gateway, Gemini models, MCP (Model Context Protocol) support
- **Tools**: SerpAPI (web search), custom tools, MCP servers
- **Build Tools**: Bun, Wrangler, esbuild
- **UI Libraries**: Framer Motion, Sonner (toasts), React Router

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed
- [Cloudflare Account](https://dash.cloudflare.com/) with Workers enabled
- Cloudflare AI Gateway configured (for `@cf/meta/*` models or OpenAI-compatible)
- Optional: SerpAPI key for web search

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd <project-name>
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables in `wrangler.jsonc`:
   ```json
   {
     "vars": {
       "CF_AI_BASE_URL": "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai",
       "CF_AI_API_KEY": "{your_ai_gateway_token}",
       "SERPAPI_KEY": "{optional_serpapi_key}"
     }
   }
   ```

4. Generate Worker types:
   ```bash
   bun run cf-typegen
   ```

## 💻 Development

1. Start the development server:
   ```bash
   bun dev
   ```
   Opens at `http://localhost:3000` (or `$PORT`).

2. In another terminal, deploy for testing:
   ```bash
   bun run deploy
   ```

### Useful Commands

| Script | Description |
|--------|-------------|
| `bun dev` | Start local dev server |
| `bun build` | Build for production |
| `bun lint` | Run ESLint |
| `bun preview` | Preview production build |
| `bun run deploy` | Build + deploy to Cloudflare |
| `bun run cf-typegen` | Generate Worker types |

### Project Structure

```
├── src/              # React frontend
├── worker/           # Cloudflare Worker backend
│   ├── agent.ts      # Durable ChatAgent (DO NOT EDIT)
│   ├── userRoutes.ts # Add custom API routes here
│   └── tools.ts      # Extend tools here
├── wrangler.jsonc    # Worker config
└── package.json      # Dependencies & scripts
```

## 🌐 Usage

- **New Chat**: Auto-creates session on first message.
- **Switch Sessions**: Via `/api/sessions` endpoints (sidebar planned).
- **Streaming**: Messages stream in real-time.
- **Tools**: Ask "What's the weather in NYC?" or "Search for React hooks".
- **API Endpoints**:
  - `POST /api/chat/{sessionId}/chat` - Send message
  - `GET /api/sessions` - List sessions
  - `POST /api/sessions` - Create session

Frontend integrates via `src/lib/chat.ts` service.

## 🚀 Deployment

1. Ensure `wrangler.jsonc` vars are set (use Cloudflare Dashboard secrets for prod).

2. Deploy:
   ```bash
   bun run deploy
   ```

3. Bind custom domain or use `*.workers.dev`.

[cloudflarebutton]

### Production Tips

- Set `CF_AI_BASE_URL` and `CF_AI_API_KEY` as Worker secrets: `wrangler secret put CF_AI_API_KEY`.
- Enable Observability in `wrangler.jsonc`.
- Assets auto-serve as SPA; APIs route through Worker.

## 🔧 Customization

- **Add Tools**: Edit `worker/tools.ts` or MCP servers in `worker/mcp-client.ts`.
- **Custom Routes**: `worker/userRoutes.ts` (userRoutes function).
- **UI Changes**: Replace `src/pages/HomePage.tsx`; use Shadcn components.
- **Models**: Update `src/lib/chat.ts` MODELS array.

## 🤝 Contributing

1. Fork & clone.
2. `bun install`.
3. Create feature branch.
4. `bun dev` & test.
5. PR with clear description.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

## 🙌 Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [Agents SDK](https://developers.cloudflare.com/agents/)

Built with ❤️ for Cloudflare developers. Issues? Open a GitHub issue!