// deno-lint-ignore-file require-await
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-jira',
  pluginDir: '/tmp/plugins/cortex-plugin-jira',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length, 6);
  assertEquals(tools[0].definition.name, 'jira_create_issue');
  assertEquals(tools[1].definition.name, 'jira_get_issue');
  assertEquals(tools[2].definition.name, 'jira_search');
  assertEquals(tools[3].definition.name, 'jira_update_issue');
  assertEquals(tools[4].definition.name, 'jira_list_projects');
  assertEquals(tools[5].definition.name, 'jira_sprint_report');
});

Deno.test('jira_create_issue — rejects empty project_key', async () => {
  const tool = findTool('jira_create_issue');
  const result = await tool.execute({ 'project_key': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('jira_get_issue — rejects empty issue_key', async () => {
  const tool = findTool('jira_get_issue');
  const result = await tool.execute({ 'issue_key': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('jira_search — rejects empty jql', async () => {
  const tool = findTool('jira_search');
  const result = await tool.execute({ 'jql': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('jira_update_issue — rejects empty issue_key', async () => {
  const tool = findTool('jira_update_issue');
  const result = await tool.execute({ 'issue_key': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('jira_list_projects — tool is defined with name and description', () => {
  const tool = findTool('jira_list_projects');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('jira_sprint_report — tool is defined with name and description', () => {
  const tool = findTool('jira_sprint_report');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
