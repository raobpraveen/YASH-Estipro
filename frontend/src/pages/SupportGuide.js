import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer, Search, ChevronDown, ChevronRight, Shield,
  Server, Users, Database, Settings, FileText, AlertTriangle,
  Lock, Mail, Activity, Info, Terminal, HardDrive, RefreshCw
} from "lucide-react";

const TOC = [
  { id: "architecture", title: "1. System Architecture", icon: Server },
  { id: "user-mgmt", title: "2. User Management", icon: Users },
  { id: "master-data", title: "3. Master Data Administration", icon: Database },
  { id: "roles-access", title: "4. Roles & Access Control", icon: Lock },
  { id: "audit-logs", title: "5. Audit Logs", icon: FileText },
  { id: "notifications", title: "6. Notifications & Email", icon: Mail },
  { id: "data-mgmt", title: "7. Data Management & Backup", icon: HardDrive },
  { id: "troubleshooting", title: "8. Troubleshooting Guide", icon: AlertTriangle },
  { id: "api-reference", title: "9. API Reference", icon: Terminal },
  { id: "deployment", title: "10. Deployment & Configuration", icon: Settings },
  { id: "security", title: "11. Security Best Practices", icon: Shield },
  { id: "maintenance", title: "12. Maintenance & Updates", icon: RefreshCw },
  { id: "monitoring", title: "13. Monitoring & Health Checks", icon: Activity },
  { id: "faq", title: "14. FAQ & Known Issues", icon: Info },
];

const Section = ({ id, title, children }) => (
  <section id={id} className="mb-10 scroll-mt-20" data-testid={`guide-section-${id}`}>
    <h2 className="text-2xl font-bold text-[#0F172A] border-b-2 border-[#10B981] pb-2 mb-4">{title}</h2>
    <div className="space-y-4 text-gray-700 leading-relaxed">{children}</div>
  </section>
);

const Tip = ({ children }) => (
  <div className="flex gap-3 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg my-3">
    <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-green-800">{children}</div>
  </div>
);

const Warning = ({ children }) => (
  <div className="flex gap-3 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg my-3">
    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-red-800">{children}</div>
  </div>
);

const CodeBlock = ({ title, children }) => (
  <div className="my-3">
    {title && <p className="text-xs font-semibold text-gray-500 mb-1">{title}</p>}
    <pre className="bg-[#1E293B] text-green-300 p-4 rounded-lg text-xs overflow-x-auto font-mono whitespace-pre-wrap">{children}</pre>
  </div>
);

const KeyValue = ({ label, children }) => (
  <div className="grid grid-cols-[200px_1fr] gap-2 py-1.5 border-b border-gray-100 text-sm">
    <span className="font-semibold text-gray-600">{label}</span>
    <span>{children}</span>
  </div>
);

export default function SupportGuide() {
  const [search, setSearch] = useState("");
  const [expandedToc, setExpandedToc] = useState(true);
  const contentRef = useRef(null);

  const handlePrint = () => window.print();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredTOC = TOC.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto" data-testid="support-guide-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-4">
          <img src="/yash-logo-new.png" alt="YASH" className="h-10 object-contain" />
          <img src="/estipro-logo-new.png" alt="EstiPro" className="h-10 object-contain" />
          <div className="ml-2">
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Support Guide</h1>
            <p className="text-sm text-gray-500">YASH EstiPro &mdash; Administration & Technical Reference</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="bg-[#10B981] hover:bg-[#059669] text-white print:hidden" data-testid="print-guide-btn">
          <Printer className="w-4 h-4 mr-2" /> Download / Print
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sticky TOC */}
        <aside className="w-72 flex-shrink-0 print:hidden">
          <Card className="sticky top-20 border border-gray-200">
            <CardContent className="p-4">
              <button onClick={() => setExpandedToc(!expandedToc)} className="flex items-center justify-between w-full mb-3">
                <span className="font-bold text-sm text-[#0F172A] uppercase tracking-wide">Table of Contents</span>
                {expandedToc ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedToc && (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <Input placeholder="Search sections..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" data-testid="guide-search" />
                  </div>
                  <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto">
                    {filteredTOC.map(item => (
                      <button key={item.id} onClick={() => scrollTo(item.id)} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-100 hover:text-[#10B981] transition-colors">
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{item.title}</span>
                      </button>
                    ))}
                  </nav>
                </>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          {/* Section 1: Architecture */}
          <Section id="architecture" title="1. System Architecture">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">1.1 Technology Stack</h3>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">Component</th><th className="p-2 text-left">Technology</th><th className="p-2 text-left">Version</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-semibold">Frontend</td><td className="p-2">React.js</td><td className="p-2">18.x</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">UI Framework</td><td className="p-2">Tailwind CSS + Shadcn UI</td><td className="p-2">Latest</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Backend</td><td className="p-2">Python FastAPI</td><td className="p-2">0.100+</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Database</td><td className="p-2">MongoDB</td><td className="p-2">6.x+</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Authentication</td><td className="p-2">JWT (python-jose)</td><td className="p-2">SHA-256</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Deployment</td><td className="p-2">Docker + Docker Compose</td><td className="p-2">Latest</td></tr>
                  <tr><td className="p-2 font-semibold">Reverse Proxy</td><td className="p-2">Nginx</td><td className="p-2">Latest</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">1.2 Architecture Diagram</h3>
            <CodeBlock>
{`Client Browser
      |
  [Nginx Reverse Proxy]
      |         |
  Frontend   Backend API
  (React)    (FastAPI :8001)
      |         |
      +----+----+
           |
       [MongoDB]
    (Collections: projects, users, 
     skills, base_locations, customers,
     technologies, sub_technologies,
     project_types, sales_managers,
     proficiency_rates, audit_logs,
     notifications, change_logs,
     milestones)

Backend Modular Structure:
  server.py → routers/
    ├── auth_routes.py
    ├── projects.py
    ├── dashboard.py
    ├── masters.py
    ├── financials.py
    ├── files.py
    ├── notifications.py
    └── users.py`}
            </CodeBlock>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">1.3 Key Libraries</h3>
            <KeyValue label="ExcelJS">Formula-based Excel generation for exports.</KeyValue>
            <KeyValue label="FileSaver">Client-side file download handling.</KeyValue>
            <KeyValue label="@hello-pangea/dnd">Drag-and-drop row reordering in wave grids.</KeyValue>
            <KeyValue label="Recharts">Dashboard analytics charts.</KeyValue>
            <KeyValue label="Axios">HTTP client for API communication.</KeyValue>
            <KeyValue label="python-jose">JWT token generation and validation.</KeyValue>
            <KeyValue label="passlib[bcrypt]">Password hashing for user authentication.</KeyValue>
          </Section>

          {/* Section 2: User Management */}
          <Section id="user-mgmt" title="2. User Management">
            <p>Admin users can manage all user accounts from the <strong>User Management</strong> page (Admin menu in sidebar).</p>

            <h3 className="text-lg font-semibold text-[#10B981] mt-2">2.1 Creating Users</h3>
            <p>Click <strong>"Add User"</strong> and fill in:</p>
            <KeyValue label="Full Name">User's display name.</KeyValue>
            <KeyValue label="Email">Login email (must be unique).</KeyValue>
            <KeyValue label="Password">Initial password (user should change on first login).</KeyValue>
            <KeyValue label="Role">Admin, Approver, or User.</KeyValue>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">2.2 Managing Users</h3>
            <KeyValue label="Edit">Modify user details and role assignments.</KeyValue>
            <KeyValue label="Deactivate">Disable a user's access without deleting their data.</KeyValue>
            <KeyValue label="Reset Password">Set a new password for a locked-out user.</KeyValue>
            <Warning>Deleting an admin user cannot be undone. Ensure at least one admin account exists in the system at all times.</Warning>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">2.3 Default Admin Account</h3>
            <CodeBlock title="Default Credentials (change immediately after first deployment)">
{`Email:    admin@yash.com
Password: password`}
            </CodeBlock>
            <Warning>Change the default admin password immediately after deployment. This is a critical security requirement.</Warning>
          </Section>

          {/* Section 3: Master Data */}
          <Section id="master-data" title="3. Master Data Administration">
            <p>Master data forms the foundation for project estimations. All master data screens support full CRUD operations with search and filter.</p>

            <h3 className="text-lg font-semibold text-[#10B981] mt-2">3.1 Skills Management</h3>
            <p>Navigate to <strong>Master Data &rarr; Skills</strong>. Each skill represents a resource role used in estimations.</p>
            <KeyValue label="Skill Name">E.g., "Senior Java Developer", "Project Manager", "DevOps Engineer".</KeyValue>
            <KeyValue label="Category">Grouping for skills (Development, QA, Management, etc.).</KeyValue>
            <Tip>Skills are referenced in proficiency rates. Deleting a skill that is in use may cause data integrity issues. Deactivate instead.</Tip>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">3.2 Base Locations</h3>
            <p>Locations determine the base salary rates and logistics configuration.</p>
            <KeyValue label="Location Name">E.g., "UAE", "India", "Egypt", "US".</KeyValue>
            <KeyValue label="Country Code">ISO country code for the location.</KeyValue>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">3.3 Proficiency Rates</h3>
            <p>The proficiency rates table maps <strong>Skill + Level + Location</strong> to monthly salary rates and overhead percentages.</p>
            <KeyValue label="Skill">The resource skill/role.</KeyValue>
            <KeyValue label="Level">Proficiency level (Junior through Delivery).</KeyValue>
            <KeyValue label="Location">Base location.</KeyValue>
            <KeyValue label="Monthly Rate">Average monthly salary in USD.</KeyValue>
            <KeyValue label="Overhead %">Standard overhead percentage for this combination.</KeyValue>
            <Warning>Changes to proficiency rates affect <strong>new</strong> resource additions. Existing project allocations retain their saved rates.</Warning>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">3.4 Other Master Data</h3>
            <KeyValue label="Customers">Client organizations linked to projects.</KeyValue>
            <KeyValue label="Technologies">Technology stacks (SAP, Java, Cloud, etc.).</KeyValue>
            <KeyValue label="Project Types">Categories (Fixed Price, T&M, Managed Services, etc.).</KeyValue>
            <KeyValue label="Sales Managers">Sales team members assigned to projects.</KeyValue>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">3.5 Bulk Data Import</h3>
            <p>Master data can be imported via Excel upload. Navigate to the relevant master data page and use the <strong>"Upload"</strong> button. The template can be downloaded from the same page.</p>
          </Section>

          {/* Section 4: Roles & Access */}
          <Section id="roles-access" title="4. Roles & Access Control">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">4.1 Role-Based Permissions</h3>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">Feature</th><th className="p-2 text-center">Admin</th><th className="p-2 text-center">Approver</th><th className="p-2 text-center">User</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Create Projects</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td></tr>
                  <tr className="border-b"><td className="p-2">Edit Own Projects</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td></tr>
                  <tr className="border-b"><td className="p-2">Submit for Review</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td></tr>
                  <tr className="border-b"><td className="p-2">Approve/Reject Projects</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-red-500 font-bold">No</td></tr>
                  <tr className="border-b"><td className="p-2">Manage Master Data</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-red-500 font-bold">No</td><td className="p-2 text-center text-red-500 font-bold">No</td></tr>
                  <tr className="border-b"><td className="p-2">Manage Users</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-red-500 font-bold">No</td><td className="p-2 text-center text-red-500 font-bold">No</td></tr>
                  <tr className="border-b"><td className="p-2">View Audit Logs</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-red-500 font-bold">No</td><td className="p-2 text-center text-red-500 font-bold">No</td></tr>
                  <tr className="border-b"><td className="p-2">Export to Excel</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td></tr>
                  <tr className="border-b"><td className="p-2">View All Public Projects</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td><td className="p-2 text-center text-green-600 font-bold">Yes</td></tr>
                  <tr><td className="p-2">View Restricted Projects</td><td className="p-2 text-center text-green-600 font-bold">All</td><td className="p-2 text-center text-amber-600 font-bold">If Listed</td><td className="p-2 text-center text-amber-600 font-bold">If Listed</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">4.2 Project-Level Access Control (Access Level)</h3>
            <p>Projects can have an <strong>Access Level</strong> setting that restricts visibility:</p>
            <KeyValue label="Public (Default)">Visible and editable by all users based on role permissions.</KeyValue>
            <KeyValue label="Restricted">Only visible to: Project Creator, users in the Restricted Users list, the Approver (when in review), and Admins.</KeyValue>
            
            <h3 className="text-lg font-semibold text-[#10B981] mt-6">4.3 Access Control Database Fields</h3>
            <CodeBlock title="Project Collection - Access Fields">
{`{
  "visibility": "public" | "restricted",
  "restricted_user_ids": ["user_id_1", "user_id_2"],
  "restricted_user_names": ["User Name 1", "User Name 2"]
}`}
            </CodeBlock>
            
            <Tip>Admins bypass all access restrictions and can view/edit all projects in the system for administrative purposes.</Tip>
          </Section>

          {/* Section 5: Audit Logs */}
          <Section id="audit-logs" title="5. Audit Logs">
            <p>The Audit Logs page (Admin menu) provides a complete trail of all significant actions in the system.</p>
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">5.1 Tracked Events</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Project creation, updates, and deletions</li>
              <li>Status changes (Draft &rarr; In Review &rarr; Approved/Rejected)</li>
              <li>Version creation with comments</li>
              <li>User account changes</li>
              <li>Master data modifications</li>
            </ul>
            <h3 className="text-lg font-semibold text-[#10B981] mt-6">5.2 Filtering Audit Logs</h3>
            <KeyValue label="Date Range">Filter by time period.</KeyValue>
            <KeyValue label="User">Filter by the user who performed the action.</KeyValue>
            <KeyValue label="Action Type">Filter by event type (create, update, delete, status change).</KeyValue>
            <KeyValue label="Entity">Filter by entity type (project, user, master data).</KeyValue>
          </Section>

          {/* Section 6: Notifications */}
          <Section id="notifications" title="6. Notifications & Email">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">6.1 In-App Notifications</h3>
            <p>The notification bell in the top bar shows real-time alerts for:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Review Requests</strong> &mdash; When a project is submitted for your approval.</li>
              <li><strong>Approvals</strong> &mdash; When your project is approved.</li>
              <li><strong>Rejections</strong> &mdash; When your project is rejected with feedback.</li>
              <li><strong>System Alerts</strong> &mdash; Important system-level notifications.</li>
            </ul>
            <p className="text-sm mt-2">Click <strong>"Mark all read"</strong> to clear all unread notifications.</p>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">6.2 Email Notifications</h3>
            <p>Email notifications are sent via Office 365 SMTP for workflow events.</p>
            <CodeBlock title="SMTP Configuration (backend .env)">
{`SMTP_SERVER=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yash.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yash.com`}
            </CodeBlock>
            <Warning>Email credentials must be configured in the backend environment. If not configured, in-app notifications will still work but email delivery will fail silently.</Warning>
          </Section>

          {/* Section 7: Data Management */}
          <Section id="data-mgmt" title="7. Data Management & Backup">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">7.1 Database Collections</h3>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">Collection</th><th className="p-2 text-left">Purpose</th><th className="p-2 text-left">Key Fields</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">projects</td><td className="p-2">Project estimations with all waves and allocations.</td><td className="p-2 text-xs">name, waves, status, version, nego_buffer_percentage</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">users</td><td className="p-2">User accounts and roles.</td><td className="p-2 text-xs">email, password_hash, role, name</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">skills</td><td className="p-2">Resource skill definitions.</td><td className="p-2 text-xs">name, category</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">base_locations</td><td className="p-2">Geographic locations for resource deployment.</td><td className="p-2 text-xs">name, country_code</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">proficiency_rates</td><td className="p-2">Salary and overhead rate matrix.</td><td className="p-2 text-xs">skill_id, level, location_id, monthly_rate, overhead_pct</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">customers</td><td className="p-2">Client organizations.</td><td className="p-2 text-xs">name, industry</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">audit_logs</td><td className="p-2">System audit trail.</td><td className="p-2 text-xs">user_id, action, entity, timestamp</td></tr>
                  <tr><td className="p-2 font-mono text-xs">notifications</td><td className="p-2">In-app notification queue.</td><td className="p-2 text-xs">user_id, title, message, is_read</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">7.2 Backup Procedures</h3>
            <CodeBlock title="MongoDB Backup (run from server)">
{`# Full database backup
mongodump --uri="mongodb://localhost:27017" --db=estipro --out=/backups/$(date +%Y%m%d)

# Restore from backup
mongorestore --uri="mongodb://localhost:27017" --db=estipro /backups/20260307/estipro`}
            </CodeBlock>
            <Tip>Schedule automated backups using cron jobs. Recommended: daily backups with 30-day retention.</Tip>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">7.3 Data Retention</h3>
            <p>Archived projects are soft-deleted and can be restored by an admin. Audit logs are retained indefinitely by default. Configure retention policies based on your organization's compliance requirements.</p>
          </Section>

          {/* Section 8: Troubleshooting */}
          <Section id="troubleshooting" title="8. Troubleshooting Guide">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">8.1 Common Issues</h3>
            <div className="space-y-4 mt-3">
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <h4 className="font-bold text-sm">Login fails with "Invalid credentials"</h4>
                  <p className="text-sm text-gray-600 mt-1"><strong>Cause:</strong> Incorrect email/password or account deactivated.</p>
                  <p className="text-sm text-gray-600"><strong>Fix:</strong> Verify credentials. Admin can reset password from User Management. Check if the account is active.</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <h4 className="font-bold text-sm">Excel export fails or downloads empty file</h4>
                  <p className="text-sm text-gray-600 mt-1"><strong>Cause:</strong> Browser popup blocker or insufficient data.</p>
                  <p className="text-sm text-gray-600"><strong>Fix:</strong> Allow popups/downloads. Ensure the project has at least one wave with resource allocations. Check browser console for errors.</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <h4 className="font-bold text-sm">Salary not auto-populating when adding a resource</h4>
                  <p className="text-sm text-gray-600 mt-1"><strong>Cause:</strong> Missing proficiency rate entry for the selected Skill + Level + Location combination.</p>
                  <p className="text-sm text-gray-600"><strong>Fix:</strong> Navigate to Master Data &rarr; Proficiency Rates and add the missing rate entry. The salary will auto-populate once the rate exists.</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <h4 className="font-bold text-sm">Notifications not showing</h4>
                  <p className="text-sm text-gray-600 mt-1"><strong>Cause:</strong> API connection issue or notification service error.</p>
                  <p className="text-sm text-gray-600"><strong>Fix:</strong> Refresh the page. Check backend logs for notification API errors. Verify the backend service is running.</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <h4 className="font-bold text-sm">Project won't save - "Unsaved changes" keeps appearing</h4>
                  <p className="text-sm text-gray-600 mt-1"><strong>Cause:</strong> Network timeout or validation error.</p>
                  <p className="text-sm text-gray-600"><strong>Fix:</strong> Check internet connection. Look for validation errors in the UI. Try saving again. If persistent, check backend logs.</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <h4 className="font-bold text-sm">Drag-and-drop not working in wave grid</h4>
                  <p className="text-sm text-gray-600 mt-1"><strong>Cause:</strong> Project is in read-only mode (Approved/In Review status).</p>
                  <p className="text-sm text-gray-600"><strong>Fix:</strong> Only Draft projects support drag-and-drop. Clone the project to create an editable version.</p>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">8.2 Log Locations</h3>
            <CodeBlock title="Server Log Locations">
{`# Backend API logs
/var/log/supervisor/backend.out.log
/var/log/supervisor/backend.err.log

# Frontend build logs
/var/log/supervisor/frontend.out.log
/var/log/supervisor/frontend.err.log

# Nginx access/error logs
/var/log/nginx/access.log
/var/log/nginx/error.log`}
            </CodeBlock>
          </Section>

          {/* Section 9: API Reference */}
          <Section id="api-reference" title="9. API Reference">
            <p>All API endpoints are prefixed with <code className="bg-gray-100 px-1 rounded">/api</code>. Authentication is required via JWT Bearer token in the Authorization header.</p>

            <h3 className="text-lg font-semibold text-[#10B981] mt-2">9.1 Authentication</h3>
            <CodeBlock title="POST /api/auth/login">
{`Request:  { "email": "user@yash.com", "password": "****" }
Response: { "token": "eyJ...", "user": { "id", "name", "email", "role" } }`}
            </CodeBlock>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">9.2 Key Endpoints</h3>
            <div className="rounded-lg border overflow-hidden mt-2 text-xs">
              <table className="w-full">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">Method</th><th className="p-2 text-left">Endpoint</th><th className="p-2 text-left">Description</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/projects</td><td className="p-2">List all projects</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/projects/{'{id}'}</td><td className="p-2">Get project details</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-blue-600">POST</td><td className="p-2 font-mono">/api/projects</td><td className="p-2">Create new project</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-amber-600">PUT</td><td className="p-2 font-mono">/api/projects/{'{id}'}</td><td className="p-2">Update project</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-red-600">DELETE</td><td className="p-2 font-mono">/api/projects/{'{id}'}</td><td className="p-2">Delete project</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/projects/compare-detail</td><td className="p-2">Compare two versions (returns metrics + diff)</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/projects/{'{id}'}/changelog</td><td className="p-2">Get project change history</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-blue-600">POST</td><td className="p-2 font-mono">/api/projects/{'{id}'}/submit</td><td className="p-2">Submit for review</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-blue-600">POST</td><td className="p-2 font-mono">/api/projects/{'{id}'}/approve</td><td className="p-2">Approve project</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-blue-600">POST</td><td className="p-2 font-mono">/api/projects/{'{id}'}/reject</td><td className="p-2">Reject project</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/skills</td><td className="p-2">List all skills</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/base-locations</td><td className="p-2">List all locations</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/proficiency-rates</td><td className="p-2">List proficiency rates</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/notifications</td><td className="p-2">Get user notifications</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-amber-600">PUT</td><td className="p-2 font-mono">/api/notifications/mark-all-read</td><td className="p-2">Mark all notifications read</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/audit-logs</td><td className="p-2">Get audit logs (admin)</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/sub-technologies</td><td className="p-2">List sub-technologies</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/projects/compare-detail?v1=&v2=</td><td className="p-2">Field-level version diff</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/change-logs/{'{pn}'}</td><td className="p-2">Change history by project number</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-amber-600">PUT</td><td className="p-2 font-mono">/api/projects/{'{id}'}/obsolete</td><td className="p-2">Mark project obsolete</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-blue-600">POST</td><td className="p-2 font-mono">/api/projects/{'{id}'}/gantt</td><td className="p-2">Upload Gantt chart image (binary body)</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/projects/{'{id}'}/gantt</td><td className="p-2">Get Gantt chart image</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-red-600">DELETE</td><td className="p-2 font-mono">/api/projects/{'{id}'}/gantt</td><td className="p-2">Delete Gantt chart image</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/projects/{'{id}'}/milestones</td><td className="p-2">Get payment milestones (version-specific)</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-amber-600">PUT</td><td className="p-2 font-mono">/api/projects/{'{id}'}/milestones</td><td className="p-2">Save payment milestones</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-green-600">GET</td><td className="p-2 font-mono">/api/projects/{'{id}'}/cashflow</td><td className="p-2">Get cashflow statement (wave-wise + combined)</td></tr>
                  <tr><td className="p-2 font-mono text-blue-600">POST</td><td className="p-2 font-mono">/api/download-file</td><td className="p-2">Upload file for download proxy</td></tr>
                </tbody>
              </table>
            </div>
            <Tip>All API responses follow a consistent JSON format. Error responses include a <code className="bg-gray-100 px-1 rounded">detail</code> field with a human-readable error message.</Tip>
            
            <h3 className="text-lg font-semibold text-[#10B981] mt-6">9.3 Version Comparison Response</h3>
            <p>The <code className="bg-gray-100 px-1 rounded">/api/projects/compare-detail</code> endpoint returns comprehensive metrics for version comparison:</p>
            <CodeBlock title="GET /api/projects/compare-detail?left_id=xxx&right_id=yyy">
{`{
  "summary": {
    "total_changes": 15,
    "header_changes": 2,
    "resources_added": 3,
    "resources_removed": 1,
    "resources_modified": 5,
    "allocation_changes": 10,
    "logistics_changes": 2
  },
  "metrics": {
    "old": {
      "total_resources": 84,
      "total_mm": 564.75,
      "onsite_mm": 150.5,
      "offshore_mm": 414.25,
      "avg_onsite_cost_per_mm": 8000,
      "avg_offshore_cost_per_mm": 4000,
      "avg_onsite_selling_per_mm": 10000,
      "avg_offshore_selling_per_mm": 5000,
      "total_cost": 2700000,
      "selling_price": 3700000,
      "logistics": 448000,
      "profit_margin": 35,
      "wave_metrics": [ /* per-wave breakdown */ ]
    },
    "new": { /* same structure as old */ }
  },
  "header_diff": [ /* field-level diffs */ ],
  "wave_diffs": [ /* per-wave resource/allocation diffs */ ]
}`}
            </CodeBlock>
          </Section>

          {/* Section 10: Deployment */}
          <Section id="deployment" title="10. Deployment & Configuration">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">10.1 Docker Deployment</h3>
            <CodeBlock title="Quick Start with Docker Compose">
{`# Clone the repository
git clone <repository-url>
cd yash-estipro

# Configure environment variables
cp .env.example .env
# Edit .env with your settings

# Build and start all services
docker-compose up -d --build

# Verify services are running
docker-compose ps`}
            </CodeBlock>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">10.2 Environment Variables</h3>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">Variable</th><th className="p-2 text-left">Location</th><th className="p-2 text-left">Description</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">MONGO_URL</td><td className="p-2">backend/.env</td><td className="p-2">MongoDB connection string</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">DB_NAME</td><td className="p-2">backend/.env</td><td className="p-2">Database name</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">JWT_SECRET</td><td className="p-2">backend/.env</td><td className="p-2">Secret key for JWT token signing</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">REACT_APP_BACKEND_URL</td><td className="p-2">frontend/.env</td><td className="p-2">Backend API URL for frontend</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono text-xs">SMTP_SERVER</td><td className="p-2">backend/.env</td><td className="p-2">Email SMTP server</td></tr>
                  <tr><td className="p-2 font-mono text-xs">SMTP_PORT</td><td className="p-2">backend/.env</td><td className="p-2">SMTP port (587 for TLS)</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">10.3 Nginx Configuration</h3>
            <p>The Nginx reverse proxy routes requests:</p>
            <KeyValue label="/api/*">Proxied to FastAPI backend (port 8001)</KeyValue>
            <KeyValue label="/*">Served from React frontend build (port 3000)</KeyValue>
          </Section>

          {/* Section 11: Security */}
          <Section id="security" title="11. Security Best Practices">
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Change default credentials</strong> immediately after deployment.</li>
              <li><strong>Use HTTPS</strong> in production. Configure SSL/TLS certificates in Nginx.</li>
              <li><strong>Rotate JWT secrets</strong> periodically. Update the JWT_SECRET environment variable.</li>
              <li><strong>Set strong password policies</strong> for all user accounts (minimum 8 characters, mix of types).</li>
              <li><strong>Restrict MongoDB access</strong> to internal network only. Do not expose port 27017 publicly.</li>
              <li><strong>Enable MongoDB authentication</strong> with username/password in production.</li>
              <li><strong>Review audit logs</strong> regularly for suspicious activities.</li>
              <li><strong>Keep dependencies updated</strong>. Run security audits on both frontend (yarn audit) and backend (pip-audit).</li>
              <li><strong>Implement rate limiting</strong> on the login endpoint to prevent brute-force attacks.</li>
              <li><strong>Use environment variables</strong> for all sensitive configuration. Never hardcode credentials.</li>
            </ul>
          </Section>

          {/* Section 12: Maintenance */}
          <Section id="maintenance" title="12. Maintenance & Updates">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">12.1 Updating the Application</h3>
            <CodeBlock title="Standard Update Procedure">
{`# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Verify services
docker-compose ps
docker-compose logs -f --tail=50`}
            </CodeBlock>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">12.2 Database Maintenance</h3>
            <CodeBlock title="MongoDB Maintenance Commands">
{`# Check database statistics
mongosh --eval "db.stats()"

# Compact collections (reduces disk usage)
mongosh --eval "db.runCommand({compact: 'projects'})"

# Create indexes for performance
mongosh --eval "db.projects.createIndex({status: 1, created_at: -1})"
mongosh --eval "db.audit_logs.createIndex({created_at: -1})"
mongosh --eval "db.notifications.createIndex({user_id: 1, is_read: 1})"

# Check collection sizes
mongosh --eval "db.getCollectionNames().forEach(c => { print(c + ': ' + db[c].count() + ' docs') })"`}
            </CodeBlock>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">12.3 Log Rotation</h3>
            <p>Configure log rotation to prevent disk space issues:</p>
            <CodeBlock title="/etc/logrotate.d/estipro">
{`/var/log/supervisor/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}`}
            </CodeBlock>
          </Section>

          {/* Section 13: Monitoring */}
          <Section id="monitoring" title="13. Monitoring & Health Checks">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">13.1 Health Check Endpoint</h3>
            <CodeBlock title="Backend Health Check">
{`GET /api/health

Response: { "status": "healthy", "database": "connected" }`}
            </CodeBlock>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">13.2 Key Metrics to Monitor</h3>
            <KeyValue label="API Response Time">Average should be &lt; 500ms. Alert if &gt; 2s.</KeyValue>
            <KeyValue label="Error Rate">Monitor 5xx errors. Alert if rate exceeds 1%.</KeyValue>
            <KeyValue label="Database Connections">MongoDB connection pool usage.</KeyValue>
            <KeyValue label="Disk Usage">MongoDB data directory and log files.</KeyValue>
            <KeyValue label="Memory Usage">Backend Python process memory consumption.</KeyValue>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">13.3 Service Status Commands</h3>
            <CodeBlock title="Checking Service Health">
{`# Docker services
docker-compose ps

# Supervisor-managed services (in container)
supervisorctl status

# Backend logs (last 100 lines)
tail -n 100 /var/log/supervisor/backend.err.log

# Frontend build status
tail -n 50 /var/log/supervisor/frontend.out.log

# MongoDB connection test
mongosh --eval "db.adminCommand('ping')"`}
            </CodeBlock>
          </Section>

          {/* Section 14: FAQ */}
          <Section id="faq" title="14. FAQ & Known Issues">
            <h3 className="text-lg font-semibold text-[#10B981] mt-2">Frequently Asked Questions</h3>
            <div className="space-y-4 mt-3">
              <div>
                <p className="font-bold text-sm">Q: Can I have multiple projects with the same name?</p>
                <p className="text-sm text-gray-600 mt-1">A: Yes, projects are identified by unique project numbers (PRJ-XXXX), not names. However, using unique names is recommended for clarity.</p>
              </div>
              <div>
                <p className="font-bold text-sm">Q: What happens when I clone a project?</p>
                <p className="text-sm text-gray-600 mt-1">A: A new project is created with all waves, resources, and configurations copied from the original. The new project starts in Draft status with its own project number.</p>
              </div>
              <div>
                <p className="font-bold text-sm">Q: Can I edit an approved project?</p>
                <p className="text-sm text-gray-600 mt-1">A: No. Approved projects are read-only. Clone the project to create an editable copy for revisions.</p>
              </div>
              <div>
                <p className="font-bold text-sm">Q: How are proficiency rates used?</p>
                <p className="text-sm text-gray-600 mt-1">A: When you add a resource to a wave grid with a specific Skill + Level + Location combination, the system automatically looks up the monthly salary rate and overhead percentage from the proficiency rates table.</p>
              </div>
              <div>
                <p className="font-bold text-sm">Q: What does the Nego Buffer do?</p>
                <p className="text-sm text-gray-600 mt-1">A: The Negotiation Buffer is an additional percentage added to the Total Selling Price before presenting the Final Price to the client. It provides margin for price negotiations.</p>
              </div>
              <div>
                <p className="font-bold text-sm">Q: Why do logistics costs show as $0?</p>
                <p className="text-sm text-gray-600 mt-1">A: Logistics costs are only calculated for resources with <strong>Travel = YES</strong>. Additionally, the logistics configuration must be set for the wave (click "Logistics Config" in the wave toolbar).</p>
              </div>
              <div>
                <p className="font-bold text-sm">Q: How do I export multiple waves to Excel?</p>
                <p className="text-sm text-gray-600 mt-1">A: The Excel export automatically includes all waves. Each wave gets its own detail sheet, plus a Summary sheet that aggregates across all waves.</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[#10B981] mt-6">Known Limitations</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Maximum recommended waves per project: 10 (for optimal performance).</li>
              <li>Maximum recommended resources per wave: 50.</li>
              <li>Excel export may be slow for very large projects (&gt; 100 resources total).</li>
              <li>Concurrent editing of the same project by multiple users is not supported. Use the version system for collaborative work.</li>
            </ul>
          </Section>

          {/* Footer */}
          <div className="border-t-2 border-[#10B981] pt-4 mt-10 text-center text-sm text-gray-500 print:mt-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/yash-logo-new.png" alt="YASH" className="h-6 object-contain" />
              <img src="/estipro-logo-new.png" alt="EstiPro" className="h-6 object-contain" />
            </div>
            <p>YASH EstiPro Support Guide &mdash; &copy; 2026 YASH Technologies. All rights reserved.</p>
            <p className="text-xs text-gray-400 mt-1">Version 1.0 &mdash; Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
