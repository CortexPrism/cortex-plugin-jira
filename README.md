# cortex-plugin-jira

Create and update issues, sprint planning, and backlog grooming for Jira.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-jira
cortex plugin install github:CortexPrism/cortex-plugin-jira
cortex plugin install ./manifest.json
```

## Tools

### jira_create_issue

Create a new Jira issue.

- `project_key` (string, required) — Project key (e.g. PROJ)
- `summary` (string, required) — Issue summary/title
- `description` (string, optional) — Issue description
- `issue_type` (string, optional) — bug, task, story, epic
- `priority` (string, optional) — low, medium, high, critical
- `assignee` (string, optional) — Assignee username or account ID
- `labels` (string, optional) — Comma-separated labels

### jira_get_issue

Get details of a Jira issue.

- `issue_key` (string, required) — Issue key (e.g. PROJ-123)

### jira_search

Search issues using JQL.

- `jql` (string, required) — Jira Query Language string
- `max_results` (number, default: 20) — Maximum results

### jira_update_issue

Update an existing Jira issue.

- `issue_key` (string, required) — Issue key
- `updates` (string, required) — JSON object of fields to update

### jira_list_projects

List accessible Jira projects. No parameters.

### jira_sprint_report

Get sprint report for a board.

- `board_id` (number, required) — Board ID
- `sprint_id` (number, required) — Sprint ID

## Configuration

Configure Jira URL, email, and API token under the "Connection" section in plugin settings.

## Development

```bash
deno cache mod.ts
deno task test
deno fmt
deno lint
```

## License

MIT
