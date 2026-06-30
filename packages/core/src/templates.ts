import type { TemplateDefinition, PropertyDefinition } from "./types";

function prop(id: string, name: string, type: PropertyDefinition["type"], opts?: Partial<PropertyDefinition>): PropertyDefinition {
  return { id, name, type, ...opts };
}

export const BUILTIN_TEMPLATES: TemplateDefinition[] = [
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    color: "blue",
    icon: "users",
    category: "meeting",
    properties: [
      prop("a1000000-0000-0000-0000-000000000001", "Attendees", "text"),
      prop("a1000000-0000-0000-0000-000000000002", "Date", "date"),
      prop("a1000000-0000-0000-0000-000000000003", "Action Items", "text"),
    ],
    body: `<h1>Meeting Notes</h1>
<p><strong>Date:</strong></p>
<p><strong>Attendees:</strong></p>
<h2>Agenda</h2>
<ul>
<li></li>
</ul>
<h2>Discussion</h2>
<p></p>
<h2>Action Items</h2>
<div class="checklist-item" data-checked="false"></div>
<h2>Next Steps</h2>
<ul>
<li></li>
</ul>`,
  },
  {
    id: "daily-journal",
    name: "Daily Journal",
    color: "green",
    icon: "book-open",
    category: "journal",
    properties: [
      prop("b1000000-0000-0000-0000-000000000001", "Mood", "select", { options: ["Great", "Good", "Okay", "Rough"] }),
    ],
    body: `<h1>Daily Journal</h1>
<h2>How I'm Feeling</h2>
<p></p>
<h2>Three Things I'm Grateful For</h2>
<ol>
<li></li>
<li></li>
<li></li>
</ol>
<h2>Today's Focus</h2>
<ul>
<li></li>
</ul>
<h2>Highlights</h2>
<p></p>
<h2>Reflection</h2>
<p></p>`,
  },
  {
    id: "pros-cons",
    name: "Pros & Cons",
    color: "orange",
    icon: "scale",
    category: "decision",
    properties: [],
    body: `<h1>Pros &amp; Cons</h1>
<p><strong>Decision:</strong></p>
<h2>Pros</h2>
<ul>
<li></li>
</ul>
<h2>Cons</h2>
<ul>
<li></li>
</ul>
<h2>Verdict</h2>
<p></p>`,
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    color: "purple",
    icon: "calendar",
    category: "review",
    properties: [
      prop("d1000000-0000-0000-0000-000000000001", "Week", "text"),
      prop("d1000000-0000-0000-0000-000000000002", "Rating", "select", { options: ["1", "2", "3", "4", "5"] }),
    ],
    body: `<h1>Weekly Review</h1>
<h2>What Went Well</h2>
<ul>
<li></li>
</ul>
<h2>Challenges</h2>
<ul>
<li></li>
</ul>
<h2>Key Achievements</h2>
<div class="checklist-item" data-checked="false"></div>
<h2>Lessons Learned</h2>
<p></p>
<h2>Next Week's Priorities</h2>
<ol>
<li></li>
<li></li>
<li></li>
</ol>`,
  },
  {
    id: "product-requirements",
    name: "Product Requirements",
    color: "teal",
    icon: "clipboard-list",
    category: "product",
    properties: [
      prop("e1000000-0000-0000-0000-000000000001", "Status", "select", { options: ["Draft", "In Review", "Approved"] }),
      prop("e1000000-0000-0000-0000-000000000002", "Priority", "select", { options: ["P0", "P1", "P2"] }),
      prop("e1000000-0000-0000-0000-000000000003", "Owner", "text"),
    ],
    body: `<h1>Product Requirements</h1>
<h2>Overview</h2>
<p></p>
<h2>Problem Statement</h2>
<p></p>
<h2>Goals</h2>
<ul>
<li></li>
</ul>
<h2>Non-Goals</h2>
<ul>
<li></li>
</ul>
<h2>User Stories</h2>
<p>As a <em>user</em>, I want to <em>action</em> so that <em>outcome</em>.</p>
<h2>Requirements</h2>
<h3>Functional</h3>
<div class="checklist-item" data-checked="false"></div>
<h3>Non-Functional</h3>
<div class="checklist-item" data-checked="false"></div>
<h2>Success Metrics</h2>
<ul>
<li></li>
</ul>
<h2>Timeline</h2>
<p></p>`,
  },
  {
    id: "project-brief",
    name: "Project Brief",
    color: "blue",
    icon: "folder",
    category: "project",
    properties: [
      prop("f1000000-0000-0000-0000-000000000001", "Status", "select", { options: ["Planning", "Active", "Complete"] }),
      prop("f1000000-0000-0000-0000-000000000002", "Deadline", "date"),
    ],
    body: `<h1>Project Brief</h1>
<h2>Background</h2>
<p></p>
<h2>Objectives</h2>
<ul>
<li></li>
</ul>
<h2>Scope</h2>
<h3>In Scope</h3>
<ul>
<li></li>
</ul>
<h3>Out of Scope</h3>
<ul>
<li></li>
</ul>
<h2>Stakeholders</h2>
<ul>
<li></li>
</ul>
<h2>Key Milestones</h2>
<div class="checklist-item" data-checked="false"></div>
<h2>Risks</h2>
<ul>
<li></li>
</ul>
<h2>Budget / Resources</h2>
<p></p>`,
  },
  {
    id: "kickoff",
    name: "Kickoff",
    color: "pink",
    icon: "rocket",
    category: "meeting",
    properties: [
      prop("g1000000-0000-0000-0000-000000000001", "Project", "text"),
      prop("g1000000-0000-0000-0000-000000000002", "Team", "text"),
      prop("g1000000-0000-0000-0000-000000000003", "Launch Date", "date"),
    ],
    body: `<h1>Kickoff</h1>
<h2>Project Overview</h2>
<p></p>
<h2>Goals &amp; Success Criteria</h2>
<ul>
<li></li>
</ul>
<h2>Team &amp; Roles</h2>
<ul>
<li></li>
</ul>
<h2>Timeline</h2>
<h3>Phase 1</h3>
<p></p>
<h3>Phase 2</h3>
<p></p>
<h2>Risks &amp; Mitigations</h2>
<ul>
<li></li>
</ul>
<h2>Communication</h2>
<p><strong>Standups:</strong></p>
<p><strong>Channels:</strong></p>
<h2>Questions</h2>
<ul>
<li></li>
</ul>`,
  },
  {
    id: "retrospective",
    name: "Retrospective",
    color: "green",
    icon: "refresh-cw",
    category: "review",
    properties: [
      prop("h1000000-0000-0000-0000-000000000001", "Sprint", "text"),
    ],
    body: `<h1>Retrospective</h1>
<h2>What Went Well</h2>
<ul>
<li></li>
</ul>
<h2>What Didn't Go Well</h2>
<ul>
<li></li>
</ul>
<h2>Action Items</h2>
<div class="checklist-item" data-checked="false"></div>
<h2>Shoutouts</h2>
<p></p>`,
  },
];

export function getBuiltinTemplates(): TemplateDefinition[] {
  return BUILTIN_TEMPLATES;
}

export function getBuiltinTemplateById(id: string): TemplateDefinition | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "meeting", label: "Meeting" },
  { id: "journal", label: "Journal" },
  { id: "decision", label: "Decision" },
  { id: "review", label: "Review" },
  { id: "product", label: "Product" },
  { id: "project", label: "Project" },
  { id: "custom", label: "My Templates" },
] as const;
