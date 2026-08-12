# Initializer

Shared HTTP / MCP registration helpers aligned with other `vercel-*` services:

| Path            | Role                                                                            |
| --------------- | ------------------------------------------------------------------------------- |
| `controller.ts` | `api()` / `plainText()` / `buffer()` + request context                          |
| `response.ts`   | Standard `{ code, message, data }` JSON helpers                                 |
| `wrapper.ts`    | `withApiKeyHandler` / `extractApiKey` (Torznab Key from Admin encrypted config) |
| `mcp/`          | `tool()`, `createMCPHttpServer()` (JSON-RPC + legacy `{ tool, params }`)        |

MCP tools live in `services/mcp/`; HTTP entry is `app/api/mcp/route.ts`.
