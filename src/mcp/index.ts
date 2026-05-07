#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { storeMemory, searchMemory, storeSession, getLatestSession, getRecentMemories } from '../lib/db.js';

const server = new Server(
  { name: 'cil', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'memory_store',
      description: 'Store a memory entry (decision, constraint, learning, task, architecture, summary)',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['decision', 'constraint', 'learning', 'task', 'architecture', 'summary'],
            description: 'Memory category',
          },
          content: {
            type: 'string',
            description: 'The memory content to store',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for retrieval (optional)',
            default: [],
          },
        },
        required: ['category', 'content'],
      },
    },
    {
      name: 'memory_search',
      description: 'Search memory using full-text search (FTS5/BM25)',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          limit: {
            type: 'number',
            description: 'Max results (default: 8)',
            default: 8,
          },
          category: {
            type: 'string',
            description: 'Filter by category (optional)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'session_snapshot',
      description: 'Save a compact session snapshot (≤2KB) for context continuity across compactions',
      inputSchema: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Session summary (1-3 sentences)',
          },
          decisions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key decisions made this session',
            default: [],
          },
        },
        required: ['summary'],
      },
    },
    {
      name: 'session_restore',
      description: 'Retrieve the last session snapshot and recent memories to restore context',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'memory_store': {
        const category = args?.['category'] as string;
        const content = args?.['content'] as string;
        const tags = (args?.['tags'] as string[]) ?? [];

        storeMemory(category, content, tags);

        return {
          content: [{ type: 'text', text: `Stored [${category}]: ${content.slice(0, 100)}${content.length > 100 ? '…' : ''}` }],
        };
      }

      case 'memory_search': {
        const query = args?.['query'] as string;
        const limit = (args?.['limit'] as number) ?? 8;
        const category = args?.['category'] as string | undefined;

        let results;
        try {
          results = searchMemory(query, limit, category);
        } catch {
          results = searchMemory(`"${query}"`, limit, category);
        }

        if (results.length === 0) {
          return {
            content: [{ type: 'text', text: `No memories found for: "${query}"` }],
          };
        }

        const formatted = results.map((r, i) => {
          const date = new Date(r.created_at).toLocaleDateString();
          return `${i + 1}. [${r.category}] ${r.content}\n   Tags: ${r.tags || 'none'} | ${date}`;
        }).join('\n\n');

        return {
          content: [{ type: 'text', text: `Found ${results.length} memories:\n\n${formatted}` }],
        };
      }

      case 'session_snapshot': {
        const summary = args?.['summary'] as string;
        const decisions = (args?.['decisions'] as string[]) ?? [];

        const id = `session-${Date.now()}`;
        const snapshot = JSON.stringify({ summary, decisions, timestamp: new Date().toISOString() });

        if (Buffer.byteLength(snapshot) > 2048) {
          const trimmed = JSON.stringify({
            summary: summary.slice(0, 500),
            decisions: decisions.slice(0, 5),
            timestamp: new Date().toISOString(),
          });
          storeSession(id, trimmed);
        } else {
          storeSession(id, snapshot);
        }

        return {
          content: [{ type: 'text', text: `Session snapshot saved (id: ${id})` }],
        };
      }

      case 'session_restore': {
        const session = getLatestSession();
        const recent = getRecentMemories(15, 72);

        const lines: string[] = [];

        if (session) {
          const data = JSON.parse(session.snapshot) as { summary: string; decisions: string[] };
          lines.push(`Last session: ${data.summary}`);
          if (data.decisions?.length > 0) {
            lines.push('Decisions: ' + data.decisions.join('; '));
          }
        }

        if (recent.length > 0) {
          lines.push('\nRecent context:');
          for (const m of recent) {
            lines.push(`- [${m.category}] ${m.content}`);
          }
        }

        const text = lines.length > 0
          ? lines.join('\n')
          : 'No prior session or memories found.';

        return {
          content: [{ type: 'text', text }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${String(err)}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
