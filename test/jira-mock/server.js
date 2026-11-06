import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// ============================================================================
// Mock Data Generators
// ============================================================================

const issueTypes = [
  { id: '10000', name: 'Task', description: 'A task that needs to be done.' },
  { id: '10001', name: 'Bug', description: 'A problem which impairs functionality.' },
  { id: '10002', name: 'Story', description: 'A user story.' },
  { id: '10003', name: 'Epic', description: 'A big user story.' },
  { id: '10004', name: 'Sub-task', description: 'A subtask of another issue.' }
];

const statuses = [
  { id: '10000', name: 'To Do', description: 'Work has not started yet.' },
  { id: '10001', name: 'In Progress', description: 'Work is actively being done.' },
  { id: '10002', name: 'Done', description: 'Work has been completed.' },
  { id: '10003', name: 'In Review', description: 'Work is being reviewed.' },
  { id: '10004', name: 'Blocked', description: 'Work is blocked.' },
  { id: '10005', name: 'Open', description: 'Issue is open.' },
  { id: '10006', name: 'Closed', description: 'Issue is closed.' },
  { id: '10007', name: 'Resolved', description: 'Issue has been resolved.' }
];

const priorities = [
  { id: '10000', name: 'Highest', description: 'This problem will block progress.' },
  { id: '10001', name: 'High', description: 'Serious problem that could block progress.' },
  { id: '10002', name: 'Medium', description: 'Has an impact upon project or personal productivity.' },
  { id: '10003', name: 'Low', description: 'Low impact, which has a work-around.' },
  { id: '10004', name: 'Lowest', description: 'Trivial problem with little or no impact on progress.' }
];

const resolutions = [
  { id: '10000', name: 'Fixed', description: 'A fix for this issue is checked into the repository.' },
  { id: '10001', name: 'Won\'t Fix', description: 'Will not be fixed.' },
  { id: '10002', name: 'Duplicate', description: 'The issue is a duplicate of an existing issue.' },
  { id: '10003', name: 'Incomplete', description: 'The issue description is incomplete.' },
  { id: '10004', name: 'Cannot Reproduce', description: 'The issue cannot be reproduced.' }
];

const users = [
  { accountId: '5b10a2844c20165700ede21a', accountType: 'atlassian', name: 'john.doe', displayName: 'John Doe', emailAddress: 'john.doe@example.com', avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123' },
  { accountId: '5b10a2844c20165700ede21b', accountType: 'atlassian', name: 'jane.smith', displayName: 'Jane Smith', emailAddress: 'jane.smith@example.com', avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/456' },
  { accountId: '5b10a2844c20165700ede21c', accountType: 'atlassian', name: 'bob.johnson', displayName: 'Bob Johnson', emailAddress: 'bob.johnson@example.com', avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/789' },
  { accountId: '5b10a2844c20165700ede21d', accountType: 'atlassian', name: 'alice.brown', displayName: 'Alice Brown', emailAddress: 'alice.brown@example.com', avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/101' },
  { accountId: '5b10a2844c20165700ede21e', accountType: 'atlassian', name: 'charlie.wilson', displayName: 'Charlie Wilson', emailAddress: 'charlie.wilson@example.com', avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/112' },
  { accountId: '5b10a2844c20165700ede21f', accountType: 'atlassian', name: 'diana.prince', displayName: 'Diana Prince', emailAddress: 'diana.prince@example.com', avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/131' },
  { accountId: '5b10a2844c20165700ede21g', accountType: 'atlassian', name: 'clark.kent', displayName: 'Clark Kent', emailAddress: 'clark.kent@example.com', avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/141' }
];

const projects = [
  { id: '10000', key: 'JIRA', name: 'Mock Jira Project', description: 'A mock project for testing eco-jira', lead: users[0], url: 'http://localhost:3000/jira', avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/999' }
];

const fields = [
  { id: 'summary', name: 'Summary', schema: { type: 'string' } },
  { id: 'description', name: 'Description', schema: { type: 'string' } },
  { id: 'status', name: 'Status', schema: { type: 'status' } },
  { id: 'assignee', name: 'Assignee', schema: { type: 'user' } },
  { id: 'reporter', name: 'Reporter', schema: { type: 'user' } },
  { id: 'priority', name: 'Priority', schema: { type: 'priority' } },
  { id: 'issuetype', name: 'Issue Type', schema: { type: 'issuetype' } },
  { id: 'created', name: 'Created', schema: { type: 'datetime' } },
  { id: 'updated', name: 'Updated', schema: { type: 'datetime' } },
  { id: 'resolution', name: 'Resolution', schema: { type: 'resolution' } },
  { id: 'resolutiondate', name: 'Resolution Date', schema: { type: 'datetime' } },
  { id: 'project', name: 'Project', schema: { type: 'project' } },
  { id: 'labels', name: 'Labels', schema: { type: 'array', items: 'string' } },
  { id: 'components', name: 'Components', schema: { type: 'array', items: 'component' } },
  { id: 'versions', name: 'Versions', schema: { type: 'array', items: 'version' } },
  { id: 'fixVersions', name: 'Fix Versions', schema: { type: 'array', items: 'version' } },
  { id: 'timeestimate', name: 'Time Estimate', schema: { type: 'number' } },
  { id: 'timespent', name: 'Time Spent', schema: { type: 'number' } },
  { id: 'duedate', name: 'Due Date', schema: { type: 'date' } },
  { id: 'environment', name: 'Environment', schema: { type: 'string' } },
  { id: 'comment', name: 'Comment', schema: { type: 'string' } }
];

// Generate random date within last 90 days
function randomDate(daysBack = 90) {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// Format date for Jira
function formatJiraDate(date) {
  return date.toISOString();
}

// Generate random issue summary
const issueSummaries = [
  'Fix login page bug',
  'Implement new feature',
  'Update documentation',
  'Fix performance issue',
  'Add user authentication',
  'Create API endpoint',
  'Fix CSS styling bug',
  'Optimize database queries',
  'Add error handling',
  'Write unit tests',
  'Update dependencies',
  'Fix mobile responsiveness',
  'Add dark mode support',
  'Improve loading time',
  'Fix cross-browser compatibility',
  'Refactor legacy code',
  'Add internationalization',
  'Implement caching mechanism',
  'Fix security vulnerability',
  'Add accessibility support',
  'Update third-party libraries',
  'Create deployment pipeline',
  'Set up monitoring',
  'Add logging',
  'Implement search functionality',
  'Fix memory leak',
  'Add pagination',
  'Implement export feature',
  'Add import capability',
  'Fix data validation',
  'Improve user experience',
  'Add loading indicators',
  'Implement error boundaries',
  'Add form validation',
  'Create admin dashboard',
  'Implement real-time updates',
  'Add notification system',
  'Fix timezone handling',
  'Add multi-language support',
  'Implement drag and drop',
  'Add file upload',
  'Create report generator',
  'Implement audit logging'
];

// Generate random issue description
const issueDescriptions = [
  'The issue was reported by multiple users and appears to affect all modern browsers.',
  'This needs to be fixed before the next release scheduled for next week.',
  'The problem occurs when the user tries to perform a specific sequence of actions.',
  'Initial investigation suggests this might be related to the recent API changes.',
  'The error message displayed is not user-friendly and should be improved.',
  'This feature was requested by the product team to improve user engagement.',
  'The current implementation has performance issues under heavy load.',
  'The bug only manifests in production and is hard to reproduce locally.',
  'The documentation is outdated and needs to be updated to reflect recent changes.',
  'This is a critical security issue that needs immediate attention.',
  'The feature should work across all supported browsers and devices.',
  'The change needs to be backward compatible with existing data.',
  'The implementation should follow the existing design patterns.',
  'This is part of a larger initiative to improve system performance.',
  'The fix should be tested thoroughly before being merged to main.',
  'The issue affects a small percentage of users but has high impact.',
  'This is a regression introduced in the last release.',
  'The problem can be worked around but a permanent fix is needed.',
  'The feature request came from customer feedback.',
  'The implementation should be scalable to handle future growth.',
  'This needs to be coordinated with the mobile team.'
];

// Generate random labels
const possibleLabels = [
  'bugfix', 'feature', 'enhancement', 'documentation', 'performance',
  'security', 'ui', 'ux', 'backend', 'frontend', 'api', 'database',
  'testing', 'refactoring', 'critical', 'high-priority', 'medium-priority',
  'low-priority', 'needs-review', 'in-progress', 'blocked', 'help-wanted'
];

// ============================================================================
// Mock Issues Generation (50 issues)
// ============================================================================

function generateMockIssue(issueNumber) {
  const type = issueTypes[Math.floor(Math.random() * issueTypes.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  const reporter = users[Math.floor(Math.random() * users.length)];
  const assignee = Math.random() > 0.3 ? users[Math.floor(Math.random() * users.length)] : null;
  
  // Some issues are resolved/closed
  let resolution = null;
  let resolutionDate = null;
  if (status.name === 'Done' || status.name === 'Closed' || status.name === 'Resolved') {
    resolution = resolutions[Math.floor(Math.random() * resolutions.length)];
    resolutionDate = formatJiraDate(randomDate(30));
  }
  
  const createdDate = formatJiraDate(randomDate(90));
  const updatedDate = formatJiraDate(randomDate(30));
  
  // Generate summary
  const baseSummary = issueSummaries[Math.floor(Math.random() * issueSummaries.length)];
  const summary = `${baseSummary} #${issueNumber}`;
  
  // Generate description
  const descriptionText = issueDescriptions[Math.floor(Math.random() * issueDescriptions.length)];
  
  // Generate labels (0-3 labels)
  const labelCount = Math.floor(Math.random() * 4);
  const labels = [];
  for (let i = 0; i < labelCount; i++) {
    labels.push(possibleLabels[Math.floor(Math.random() * possibleLabels.length)]);
  }
  
  return {
    expand: 'renderedFields,names,schema,operations,editmeta,changelog,versionedRepresentations',
    id: (10000 + issueNumber).toString(),
    self: `http://localhost:3000/rest/api/2/issue/${10000 + issueNumber}`,
    key: `JIRA-${issueNumber}`,
    fields: {
      summary: summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Problème ${issueNumber}: ${descriptionText}`
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Ceci est une description mock pour tester l\'extension eco-jira. Les requêtes vers cette API doivent être mises en cache.'
              }
            ]
          }
        ]
      },
      status: {
        name: status.name,
        id: status.id,
        description: status.description,
        iconUrl: `https://localhost:3000/download/resources/com.atlassian.jira.jira-projects-template-plugin:project-templates/10317/1 icons/status_${status.name.toLowerCase().replace(' ', '_')}.png`
      },
      priority: {
        name: priority.name,
        id: priority.id,
        description: priority.description,
        iconUrl: `https://localhost:3000/images/icons/priority_${priority.name.toLowerCase()}.png`
      },
      issuetype: {
        name: type.name,
        id: type.id,
        description: type.description,
        iconUrl: `https://localhost:3000/images/icons/issuetype_${type.name.toLowerCase()}.png`
      },
      assignee: assignee ? {
        accountId: assignee.accountId,
        accountType: assignee.accountType,
        displayName: assignee.displayName,
        name: assignee.name,
        emailAddress: assignee.emailAddress,
        avatarUrl: assignee.avatarUrl
      } : null,
      reporter: {
        accountId: reporter.accountId,
        accountType: reporter.accountType,
        displayName: reporter.displayName,
        name: reporter.name,
        emailAddress: reporter.emailAddress,
        avatarUrl: reporter.avatarUrl
      },
      project: {
        id: projects[0].id,
        key: projects[0].key,
        name: projects[0].name,
        avatarUrl: projects[0].avatarUrl
      },
      created: createdDate,
      updated: updatedDate,
      resolution: resolution ? {
        id: resolution.id,
        name: resolution.name,
        description: resolution.description
      } : null,
      resolutiondate: resolutionDate,
      labels: labels,
      components: [],
      versions: [],
      fixVersions: [],
      timeestimate: Math.random() > 0.7 ? Math.floor(Math.random() * 10) * 3600 : null,
      timespent: Math.random() > 0.7 ? Math.floor(Math.random() * 20) * 3600 : null,
      duedate: Math.random() > 0.7 ? formatJiraDate(randomDate(30)) : null,
      environment: Math.random() > 0.8 ? 'Production, Staging' : null
    }
  };
}

// Generate all 50 issues
const mockIssues = {};
for (let i = 1; i <= 50; i++) {
  mockIssues[`JIRA-${i}`] = generateMockIssue(i);
  // Also index by ID for lookups
  mockIssues[`100${i.toString().padStart(2, '0')}`] = mockIssues[`JIRA-${i}`];
}

// ============================================================================
// Mock Boards
// ============================================================================

const mockBoards = {
  '1': {
    id: 1,
    name: 'Kanban Board',
    type: 'kanban',
    location: {
      projectId: 10000,
      displayName: 'Mock Jira Project',
      projectName: 'Mock Jira Project',
      projectKey: 'JIRA',
      projectTypeKey: 'software'
    },
    columns: [
      { id: 100, name: 'To Do', statuses: [{ id: '10000', name: 'To Do' }, { id: '10005', name: 'Open' }] },
      { id: 101, name: 'In Progress', statuses: [{ id: '10001', name: 'In Progress' }] },
      { id: 102, name: 'In Review', statuses: [{ id: '10003', name: 'In Review' }] },
      { id: 103, name: 'Blocked', statuses: [{ id: '10004', name: 'Blocked' }] },
      { id: 104, name: 'Done', statuses: [{ id: '10002', name: 'Done' }, { id: '10006', name: 'Closed' }, { id: '10007', name: 'Resolved' }] }
    ],
    issues: [] // Will be populated dynamically
  },
  '2': {
    id: 2,
    name: 'Sprint Board',
    type: 'scrum',
    location: {
      projectId: 10000,
      displayName: 'Mock Jira Project',
      projectName: 'Mock Jira Project',
      projectKey: 'JIRA',
      projectTypeKey: 'software'
    },
    columns: [
      { id: 200, name: 'To Do', statuses: [{ id: '10000', name: 'To Do' }, { id: '10005', name: 'Open' }] },
      { id: 201, name: 'In Progress', statuses: [{ id: '10001', name: 'In Progress' }] },
      { id: 202, name: 'In Review', statuses: [{ id: '10003', name: 'In Review' }] },
      { id: 203, name: 'Done', statuses: [{ id: '10002', name: 'Done' }, { id: '10006', name: 'Closed' }, { id: '10007', name: 'Resolved' }] }
    ],
    issues: [] // Will be populated dynamically
  },
  '3': {
    id: 3,
    name: 'Backlog Board',
    type: 'scrum',
    location: {
      projectId: 10000,
      displayName: 'Mock Jira Project',
      projectName: 'Mock Jira Project',
      projectKey: 'JIRA',
      projectTypeKey: 'software'
    },
    columns: [
      { id: 300, name: 'Backlog', statuses: [{ id: '10000', name: 'To Do' }, { id: '10005', name: 'Open' }] },
      { id: 301, name: 'Selected', statuses: [{ id: '10001', name: 'In Progress' }] },
      { id: 302, name: 'Done', statuses: [{ id: '10002', name: 'Done' }] }
    ],
    issues: []
  }
};

// Populate board issues
function getBoardIssues(boardId) {
  const board = mockBoards[boardId];
  if (!board) return [];
  
  // Get all status IDs for this board's columns
  const statusIds = [];
  board.columns.forEach(col => {
    col.statuses.forEach(s => statusIds.push(s.id));
  });
  
  // Filter issues that match these statuses
  const boardIssues = [];
  Object.keys(mockIssues).forEach(key => {
    if (key.startsWith('JIRA-')) {
      const issue = mockIssues[key];
      const statusId = issue.fields.status?.id;
      if (statusId && statusIds.includes(statusId)) {
        boardIssues.push({
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status
        });
      }
    }
  });
  
  return boardIssues;
}

// Update board issues
Object.keys(mockBoards).forEach(boardId => {
  mockBoards[boardId].issues = getBoardIssues(boardId);
});

// ============================================================================
// Middleware
// ============================================================================

// Middleware to add random delay (100-200ms) to all API responses
function addDelay(req, res, next) {
  if (req.path.startsWith('/rest/') || req.path.startsWith('/api/')) {
    const delay = Math.floor(Math.random() * 100) + 100; // 100-200ms
    setTimeout(next, delay);
  } else {
    next();
  }
}

// CORS middleware for development
function enableCORS(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

// JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply middlewares
app.use(addDelay);
app.use(enableCORS);

// Disable cache for development
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// API Endpoints
// ============================================================================

// Server info
app.get('/rest/api/2/serverInfo', (req, res) => {
  res.json({
    version: '9.12.0',
    buildNumber: '912001',
    buildDate: '2024-01-15T00:00:00.000+0000',
    serverTime: new Date().toISOString(),
    scmInfo: 'git',
    serverTitle: 'Mock Jira',
    deploymentType: 'Server',
    edition: 'Enterprise',
    license: {
      type: 'Enterprise',
      expiryDate: '2025-12-31',
      users: { licensed: 100, current: 7 }
    }
  });
});

// Fields
app.get('/rest/api/2/field', (req, res) => {
  res.json(fields);
});

// Individual field
app.get('/rest/api/2/field/:fieldId', (req, res) => {
  const fieldId = req.params.fieldId;
  const field = fields.find(f => f.id === fieldId);
  
  if (field) {
    res.json(field);
  } else {
    res.status(404).json({ errorMessages: ['Field not found'] });
  }
});

// Issue types
app.get('/rest/api/2/issuetype', (req, res) => {
  res.json(issueTypes);
});

// Individual issue type
app.get('/rest/api/2/issuetype/:issueTypeId', (req, res) => {
  const issueTypeId = req.params.issueTypeId;
  const issueType = issueTypes.find(it => it.id === issueTypeId);
  
  if (issueType) {
    res.json(issueType);
  } else {
    res.status(404).json({ errorMessages: ['Issue type not found'] });
  }
});

// Statuses
app.get('/rest/api/2/status', (req, res) => {
  res.json(statuses);
});

// Individual status
app.get('/rest/api/2/status/:statusId', (req, res) => {
  const statusId = req.params.statusId;
  const status = statuses.find(s => s.id === statusId);
  
  if (status) {
    res.json(status);
  } else {
    res.status(404).json({ errorMessages: ['Status not found'] });
  }
});

// Priorities
app.get('/rest/api/2/priority', (req, res) => {
  res.json(priorities);
});

// Individual priority
app.get('/rest/api/2/priority/:priorityId', (req, res) => {
  const priorityId = req.params.priorityId;
  const priority = priorities.find(p => p.id === priorityId);
  
  if (priority) {
    res.json(priority);
  } else {
    res.status(404).json({ errorMessages: ['Priority not found'] });
  }
});

// Resolutions
app.get('/rest/api/2/resolution', (req, res) => {
  res.json(resolutions);
});

// Users
app.get('/rest/api/2/user', (req, res) => {
  res.json(users);
});

// Individual user
app.get('/rest/api/2/user/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = users.find(u => u.accountId === userId || u.name === userId);
  
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ errorMessages: ['User not found'] });
  }
});

// Current user
app.get('/rest/api/2/myself', (req, res) => {
  res.json(users[0]); // Return John Doe as current user
});

// Projects
app.get('/rest/api/2/project', (req, res) => {
  res.json(projects);
});

// Individual project
app.get('/rest/api/2/project/:projectIdOrKey', (req, res) => {
  const projectIdOrKey = req.params.projectIdOrKey;
  const project = projects.find(p => p.id === projectIdOrKey || p.key === projectIdOrKey);
  
  if (project) {
    res.json(project);
  } else {
    res.status(404).json({ errorMessages: ['Project not found'] });
  }
});

// Issue endpoints
app.get('/rest/api/2/issue/:issueIdOrKey', (req, res) => {
  const issueIdOrKey = req.params.issueIdOrKey;
  
  // Check if it's a key (JIRA-*) or an ID (10000+)
  let issue = mockIssues[issueIdOrKey];
  
  if (!issue) {
    // Try to find by ID
    Object.keys(mockIssues).forEach(key => {
      if (mockIssues[key].id === issueIdOrKey) {
        issue = mockIssues[key];
      }
    });
  }
  
  if (issue) {
    // Add expand parameter support
    const expand = req.query.expand || '';
    if (expand.includes('changelog')) {
      issue.changelog = {
        startAt: 0,
        maxResults: 5,
        total: 5,
        histories: [
          {
            id: '10000',
            author: users[0],
            created: formatJiraDate(randomDate(7)),
            items: [
              {
                field: 'status',
                fieldtype: 'jira',
                from: '10000',
                fromString: 'To Do',
                to: '10001',
                toString: 'In Progress'
              }
            ]
          }
        ]
      };
    }
    
    res.json(issue);
  } else {
    // Generate a new issue if not found (for testing purposes)
    const issueNumber = parseInt(issueIdOrKey.replace('JIRA-', '') || issueIdOrKey) || 1;
    if (issueNumber > 0 && issueNumber <= 100) {
      const newIssue = generateMockIssue(issueNumber);
      mockIssues[newIssue.key] = newIssue;
      mockIssues[newIssue.id] = newIssue;
      res.json(newIssue);
    } else {
      res.status(404).json({ errorMessages: ['Issue not found'] });
    }
  }
});

// Create issue (for testing)
app.post('/rest/api/2/issue', (req, res) => {
  const newNumber = Object.keys(mockIssues).filter(k => k.startsWith('JIRA-')).length + 1;
  const newIssue = generateMockIssue(newNumber);
  mockIssues[newIssue.key] = newIssue;
  mockIssues[newIssue.id] = newIssue;
  
  // Update board issues
  Object.keys(mockBoards).forEach(boardId => {
    mockBoards[boardId].issues = getBoardIssues(boardId);
  });
  
  res.status(201).json(newIssue);
});

// Search
app.get('/rest/api/2/search', (req, res) => {
  const jql = req.query.jql || '';
  const maxResults = parseInt(req.query.maxResults) || 50;
  const startAt = parseInt(req.query.startAt) || 0;
  const fields = req.query.fields ? req.query.fields.split(',') : null;
  const expand = req.query.expand ? req.query.expand.split(',') : [];
  
  // Parse simple JQL
  let filteredIssues = Object.values(mockIssues).filter(i => i.key && i.key.startsWith('JIRA-'));
  
  // Filter by project
  if (jql.includes('project=')) {
    const projectMatch = jql.match(/project=(\w+)/);
    if (projectMatch) {
      const projectKey = projectMatch[1];
      filteredIssues = filteredIssues.filter(i => i.fields.project?.key === projectKey);
    }
  }
  
  // Filter by status
  if (jql.includes('status=')) {
    const statusMatch = jql.match(/status=(\w+)/);
    if (statusMatch) {
      const statusName = statusMatch[1].replace(/['"]/g, '');
      filteredIssues = filteredIssues.filter(i => i.fields.status?.name === statusName);
    }
  }
  
  // Filter by assignee
  if (jql.includes('assignee=')) {
    const assigneeMatch = jql.match(/assignee=(\w+)/);
    if (assigneeMatch) {
      const assigneeName = assigneeMatch[1];
      filteredIssues = filteredIssues.filter(i => i.fields.assignee?.name === assigneeName || i.fields.assignee?.displayName === assigneeName);
    }
  }
  
  // Filter by text search
  if (jql.includes('text ~')) {
    const textMatch = jql.match(/text ~ ["'](.+?)["']/);
    if (textMatch) {
      const searchText = textMatch[1].toLowerCase();
      filteredIssues = filteredIssues.filter(i => 
        (i.fields.summary?.toLowerCase().includes(searchText)) ||
        (i.fields.description?.content?.[0]?.content?.[0]?.text?.toLowerCase().includes(searchText))
      );
    }
  }
  
  // Sort
  if (jql.includes('ORDER BY')) {
    const orderByMatch = jql.match(/ORDER BY (\w+)\s*(ASC|DESC)?/i);
    if (orderByMatch) {
      const field = orderByMatch[1].toLowerCase();
      const direction = orderByMatch[2]?.toLowerCase() || 'asc';
      
      filteredIssues.sort((a, b) => {
        let aVal, bVal;
        
        if (field === 'created') {
          aVal = new Date(a.fields.created);
          bVal = new Date(b.fields.created);
        } else if (field === 'updated') {
          aVal = new Date(a.fields.updated);
          bVal = new Date(b.fields.updated);
        } else if (field === 'key') {
          aVal = a.key;
          bVal = b.key;
        } else {
          aVal = a.fields[field]?.name || a.fields[field] || '';
          bVal = b.fields[field]?.name || b.fields[field] || '';
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }
  
  // Pagination
  const total = filteredIssues.length;
  const issues = filteredIssues.slice(startAt, startAt + maxResults);
  
  // Apply field filtering if requested
  if (fields) {
    issues.forEach(issue => {
      const limitedFields = {};
      fields.forEach(f => {
        if (issue.fields[f]) {
          limitedFields[f] = issue.fields[f];
        }
      });
      issue.fields = limitedFields;
    });
  }
  
  res.json({
    expand: expand.length > 0 ? expand.join(',') : 'names,schema',
    startAt: startAt,
    maxResults: maxResults,
    total: total,
    issues: issues
  });
});

// Agile endpoints
app.get('/rest/agile/1.0/board', (req, res) => {
  const maxResults = parseInt(req.query.maxResults) || 50;
  const startAt = parseInt(req.query.startAt) || 0;
  
  const boardList = Object.values(mockBoards);
  const total = boardList.length;
  const boards = boardList.slice(startAt, startAt + maxResults);
  
  res.json({
    maxResults: maxResults,
    startAt: startAt,
    total: total,
    isLast: (startAt + maxResults) >= total,
    values: boards.map(b => ({
      id: b.id,
      name: b.name,
      type: b.type
    }))
  });
});

// Individual board
app.get('/rest/agile/1.0/board/:boardId', (req, res) => {
  const boardId = req.params.boardId;
  const board = mockBoards[boardId];
  
  if (board) {
    res.json(board);
  } else {
    res.status(404).json({ errorMessages: ['Board not found'] });
  }
});

// Board issues
app.get('/rest/agile/1.0/board/:boardId/issue', (req, res) => {
  const boardId = req.params.boardId;
  const board = mockBoards[boardId];
  
  if (!board) {
    return res.status(404).json({ errorMessages: ['Board not found'] });
  }
  
  const jql = req.query.jql || '';
  const maxResults = parseInt(req.query.maxResults) || 50;
  const startAt = parseInt(req.query.startAt) || 0;
  
  // Get issues for this board
  let boardIssues = board.issues || [];
  
  // If JQL is provided, filter further
  if (jql) {
    const issueKeys = boardIssues.map(i => i.key);
    // Simple filtering - in a real scenario, this would parse JQL
    boardIssues = boardIssues.filter(i => {
      if (jql.includes('status=')) {
        const statusMatch = jql.match(/status=(\w+)/);
        if (statusMatch) {
          const statusName = statusMatch[1];
          return i.status?.name === statusName;
        }
      }
      return true;
    });
  }
  
  const total = boardIssues.length;
  const issues = boardIssues.slice(startAt, startAt + maxResults);
  
  // Get full issue details for each
  const issuesWithDetails = issues.map(issue => mockIssues[issue.key] || issue);
  
  res.json({
    expand: 'names,schema',
    startAt: startAt,
    maxResults: maxResults,
    total: total,
    issues: issuesWithDetails
  });
});

// ============================================================================
// HTML Pages
// ============================================================================

// Serve the main Jira page
app.get('/jira', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve board pages
app.get('/jira/boards', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'boards', 'index.html'));
});

// Serve individual board page
app.get('/jira/board/:boardId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'boards', 'board.html'));
});

// Serve issue pages
app.get('/jira/issue/:issueKey', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'issue.html'));
});

// Serve boards index
app.get('/jira/boards', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'boards', 'index.html'));
});

// Root redirect to /jira
app.get('/', (req, res) => {
  res.redirect('/jira');
});

// ============================================================================
// Start Server
// ============================================================================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Mock Jira] Server error:', err);
  res.status(500).json({
    errorMessages: ['Internal server error']
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    errorMessages: ['Endpoint not found']
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    Mock Jira Server                              ║');
  console.log('║                    Version 1.0.0                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('✅ Mock Jira server running at http://localhost:3000/jira');
  console.log('');
  console.log('📋 Available pages:');
  console.log('   ├─ http://localhost:3000/jira           (Home)');
  console.log('   ├─ http://localhost:3000/jira/boards    (Board list)');
  console.log('   ├─ http://localhost:3000/jira/board/1   (Kanban Board)');
  console.log('   ├─ http://localhost:3000/jira/board/2   (Sprint Board)');
  console.log('   ├─ http://localhost:3000/jira/board/3   (Backlog Board)');
  console.log('   └─ http://localhost:3000/jira/issue/JIRA-N (Issue detail, N=1-50)');
  console.log('');
  console.log('🔌 API Endpoints:');
  console.log('   ├─ /rest/api/2/serverInfo');
  console.log('   ├─ /rest/api/2/field');
  console.log('   ├─ /rest/api/2/issuetype');
  console.log('   ├─ /rest/api/2/status');
  console.log('   ├─ /rest/api/2/priority');
  console.log('   ├─ /rest/api/2/resolution');
  console.log('   ├─ /rest/api/2/user');
  console.log('   ├─ /rest/api/2/myself');
  console.log('   ├─ /rest/api/2/project');
  console.log('   ├─ /rest/api/2/issue/{keyOrId}');
  console.log('   ├─ /rest/api/2/search?jql=...');
  console.log('   ├─ /rest/agile/1.0/board');
  console.log('   └─ /rest/agile/1.0/board/{id}');
  console.log('');
  console.log('💡 Testing eco-jira:');
  console.log('   1. Load http://localhost:3000/jira in your browser');
  console.log('   2. Activate eco-jira extension on this domain');
  console.log('   3. Navigate between pages to see caching in action!');
  console.log('   4. Check the extension popup for request statistics');
  console.log('');
  console.log('🎯 All API responses have random 100-200ms delays to simulate network latency.');
  console.log('');
  console.log('🚀 Ready to test eco-jira caching!');
  console.log('');
});
