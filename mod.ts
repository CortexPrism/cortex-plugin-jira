import type { Tool, ToolContext, PluginContext, ToolCallResult } from "cortex/plugins";

let config: Record<string, string> = {};

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = await ctx.config.get() as Record<string, string>;
}

export async function onUnload(_ctx: PluginContext): Promise<void> {}

function jiraApi(path: string, init?: RequestInit): Promise<Response> {
  const base = (config.jiraUrl || "https://your-domain.atlassian.net").replace(/\/$/, "");
  const token = btoa(`${config.jiraEmail || ""}:${config.jiraApiToken || ""}`);
  return fetch(`${base}/rest/api/3${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

const jira_create_issue: Tool = {
  definition: {
    name: "jira_create_issue",
    description: "Create a new Jira issue",
    params: [
      { name: "project_key", type: "string", description: "Project key (e.g. PROJ)", required: true },
      { name: "summary", type: "string", description: "Issue summary/title", required: true },
      { name: "description", type: "string", description: "Issue description", required: false },
      { name: "issue_type", type: "string", description: "Type of issue", required: false, enum: ["bug", "task", "story", "epic"] },
      { name: "priority", type: "string", description: "Issue priority", required: false, enum: ["low", "medium", "high", "critical"] },
      { name: "assignee", type: "string", description: "Assignee username or account ID", required: false },
      { name: "labels", type: "string", description: "Comma-separated list of labels", required: false },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const project_key = args.project_key;
      const summary = args.summary;
      if (!project_key || typeof project_key !== "string") {
        return { toolName: "jira_create_issue", success: false, output: "", error: "project_key must be a non-empty string", durationMs: Date.now() - start };
      }
      if (!summary || typeof summary !== "string") {
        return { toolName: "jira_create_issue", success: false, output: "", error: "summary must be a non-empty string", durationMs: Date.now() - start };
      }
      const body: Record<string, unknown> = {
        fields: {
          project: { key: project_key },
          summary,
          issuetype: { name: typeof args.issue_type === "string" ? args.issue_type : "task" },
        },
      };
      const fields = body.fields as Record<string, unknown>;
      if (args.description && typeof args.description === "string") fields.description = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: args.description }] }] };
      if (args.priority && typeof args.priority === "string") {
        const priorityMap: Record<string, string> = { low: "Low", medium: "Medium", high: "High", critical: "Highest" };
        fields.priority = { name: priorityMap[args.priority] || args.priority };
      }
      if (args.assignee && typeof args.assignee === "string") fields.assignee = { id: args.assignee };
      if (args.labels && typeof args.labels === "string") fields.labels = args.labels.split(",").map((l: string) => l.trim()).filter(Boolean);

      const res = await jiraApi("/issue", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        return { toolName: "jira_create_issue", success: false, output: "", error: `Jira API error ${res.status}: ${JSON.stringify(data)}`, durationMs: Date.now() - start };
      }
      return { toolName: "jira_create_issue", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "jira_create_issue", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const jira_get_issue: Tool = {
  definition: {
    name: "jira_get_issue",
    description: "Get details of a Jira issue",
    params: [
      { name: "issue_key", type: "string", description: "Issue key (e.g. PROJ-123)", required: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const issue_key = args.issue_key;
      if (!issue_key || typeof issue_key !== "string") {
        return { toolName: "jira_get_issue", success: false, output: "", error: "issue_key must be a non-empty string", durationMs: Date.now() - start };
      }
      const res = await jiraApi(`/issue/${issue_key}`);
      const data = await res.json();
      if (!res.ok) {
        return { toolName: "jira_get_issue", success: false, output: "", error: `Jira API error ${res.status}: ${JSON.stringify(data)}`, durationMs: Date.now() - start };
      }
      return { toolName: "jira_get_issue", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "jira_get_issue", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const jira_search: Tool = {
  definition: {
    name: "jira_search",
    description: "Search issues using JQL",
    params: [
      { name: "jql", type: "string", description: "Jira Query Language string", required: true },
      { name: "max_results", type: "number", description: "Maximum results to return", required: false, default: 20 },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const jql = args.jql;
      if (!jql || typeof jql !== "string") {
        return { toolName: "jira_search", success: false, output: "", error: "jql must be a non-empty string", durationMs: Date.now() - start };
      }
      const max_results = typeof args.max_results === "number" ? args.max_results : 20;
      const res = await jiraApi("/search", {
        method: "POST",
        body: JSON.stringify({ jql, maxResults: max_results }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { toolName: "jira_search", success: false, output: "", error: `Jira API error ${res.status}: ${JSON.stringify(data)}`, durationMs: Date.now() - start };
      }
      return { toolName: "jira_search", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "jira_search", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const jira_update_issue: Tool = {
  definition: {
    name: "jira_update_issue",
    description: "Update an existing Jira issue",
    params: [
      { name: "issue_key", type: "string", description: "Issue key (e.g. PROJ-123)", required: true },
      { name: "updates", type: "string", description: "JSON object of fields to update", required: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const issue_key = args.issue_key;
      const updates = args.updates;
      if (!issue_key || typeof issue_key !== "string") {
        return { toolName: "jira_update_issue", success: false, output: "", error: "issue_key must be a non-empty string", durationMs: Date.now() - start };
      }
      if (!updates || typeof updates !== "string") {
        return { toolName: "jira_update_issue", success: false, output: "", error: "updates must be a non-empty JSON string", durationMs: Date.now() - start };
      }
      let body: Record<string, unknown>;
      try { body = JSON.parse(updates); } catch {
        return { toolName: "jira_update_issue", success: false, output: "", error: "updates must be valid JSON", durationMs: Date.now() - start };
      }
      const res = await jiraApi(`/issue/${issue_key}`, { method: "PUT", body: JSON.stringify(body) });
      if (res.status === 204) {
        return { toolName: "jira_update_issue", success: true, output: `Issue ${issue_key} updated successfully`, durationMs: Date.now() - start };
      }
      const data = await res.json().catch(() => ({}));
      return { toolName: "jira_update_issue", success: false, output: "", error: `Jira API error ${res.status}: ${JSON.stringify(data)}`, durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "jira_update_issue", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const jira_list_projects: Tool = {
  definition: {
    name: "jira_list_projects",
    description: "List accessible Jira projects",
    params: [],
    capabilities: ["network:fetch"],
  },
  execute: async (_args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const res = await jiraApi("/project");
      const data = await res.json();
      if (!res.ok) {
        return { toolName: "jira_list_projects", success: false, output: "", error: `Jira API error ${res.status}: ${JSON.stringify(data)}`, durationMs: Date.now() - start };
      }
      return { toolName: "jira_list_projects", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "jira_list_projects", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const jira_sprint_report: Tool = {
  definition: {
    name: "jira_sprint_report",
    description: "Get sprint report for a board",
    params: [
      { name: "board_id", type: "number", description: "Board ID", required: true },
      { name: "sprint_id", type: "number", description: "Sprint ID", required: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const board_id = args.board_id;
      const sprint_id = args.sprint_id;
      if (typeof board_id !== "number") {
        return { toolName: "jira_sprint_report", success: false, output: "", error: "board_id must be a number", durationMs: Date.now() - start };
      }
      if (typeof sprint_id !== "number") {
        return { toolName: "jira_sprint_report", success: false, output: "", error: "sprint_id must be a number", durationMs: Date.now() - start };
      }
      const base = (config.jiraUrl || "https://your-domain.atlassian.net").replace(/\/$/, "");
      const token = btoa(`${config.jiraEmail || ""}:${config.jiraApiToken || ""}`);
      const res = await fetch(`${base}/rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=${board_id}&sprintId=${sprint_id}`, {
        headers: { Authorization: `Basic ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        return { toolName: "jira_sprint_report", success: false, output: "", error: `Jira Agile API error ${res.status}: ${JSON.stringify(data)}`, durationMs: Date.now() - start };
      }
      return { toolName: "jira_sprint_report", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
    } catch (error) {
      return { toolName: "jira_sprint_report", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

export const tools: Tool[] = [
  jira_create_issue,
  jira_get_issue,
  jira_search,
  jira_update_issue,
  jira_list_projects,
  jira_sprint_report,
];
