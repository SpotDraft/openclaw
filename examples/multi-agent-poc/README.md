# Multi-Agent POC

Demonstrates OpenClaw's multi-agent capability with a router/classifier agent that automatically delegates to specialized agents.

## Architecture

```
User message
    |
    v
[Router Agent]  (Haiku - fast, cheap classifier)
    |
    +---> [Research Agent]  (Sonnet - deep research)
    +---> [Writing Agent]   (Sonnet - writing/editing)
    +---> [Code Agent]      (Sonnet - coding/debugging)
```

The **Router Agent** receives all messages, classifies intent, and uses `sessions_spawn` to delegate to the right specialist. Users don't need to manually select an agent.

For manual agent selection, the `/agent` slash command (Slack) or the agent picker dropdown (Control UI) lets you target a specific agent directly.

## Agents

| Agent       | ID           | Emoji | Purpose                               | Tool Profile |
| ----------- | ------------ | ----- | ------------------------------------- | ------------ |
| Switchboard | `router`     | 🔀    | Classify intent, route to specialist  | `minimal`    |
| Scout       | `researcher` | 🔍    | Research, fact-finding, summarization | `full`       |
| Quill       | `writer`     | ✍️    | Writing, editing, communications      | `messaging`  |
| Forge       | `coder`      | ⚡    | Code, debugging, reviews              | `coding`     |
| Architect   | `designer`   | 🏗️    | Create new agents conversationally    | `minimal`    |

## Setup

1. Copy the agent config into your `~/.openclaw/config.yaml`:

```bash
# Or merge the agents section manually
cp config.yaml ~/.openclaw/config.yaml
```

2. Copy workspace files:

```bash
cp -r workspaces/* ~/.openclaw/workspaces/
```

3. Start the gateway:

```bash
pnpm openclaw gateway run
```

## Verify

```bash
# List agents
pnpm openclaw gateway call agents.list

# Chat with the router (auto-classifies and delegates)
pnpm openclaw agent --message "What is quantum computing?"
# -> Router spawns Research Agent

pnpm openclaw agent --message "Write a haiku about code"
# -> Router spawns Writing Agent

pnpm openclaw agent --message "Review this function for bugs"
# -> Router spawns Code Agent

# Chat with a specific agent directly (bypasses router)
pnpm openclaw agent --message "Hello" --agent researcher
pnpm openclaw agent --message "Hello" --agent writer
pnpm openclaw agent --message "Hello" --agent coder
```

## Slack Usage

```
/agent researcher What is quantum computing?
/agent writer Draft an email about the new feature
/agent coder Review this pull request
```

The `/agent` slash command lets you target a specific agent in Slack. Without it, messages go to the default router agent which auto-classifies.

## Control UI

Open the Control UI to see the agent picker dropdown, switch between agents mid-conversation, and see which agent is responding.

## Squad Builder (Agent Designer)

The `designer` agent creates new agents conversationally. Instead of editing YAML by hand, chat with the Architect to design and deploy agents on the fly:

```bash
pnpm openclaw agent --message "Create a new agent called translator that translates text between languages" --agent designer
```

The designer uses `config.patch` to safely append new agents to your config and `agents_files_set` to create workspace files (SOUL.md, IDENTITY.md). After creation, verify with:

```bash
pnpm openclaw gateway call agents.list
```

## Agent Handoff

Agents can delegate to each other using `sessions_spawn`:

- Research Agent discovers an API -> spawns Code Agent to write the integration
- Code Agent finishes a feature -> spawns Writing Agent to document it
- Writing Agent needs technical details -> spawns Research Agent to look them up

The `maxSpawnDepth: 2` setting enables orchestrator patterns where an agent can spawn sub-agents that spawn their own sub-agents.
