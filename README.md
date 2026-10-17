# Second Brain ⚡ | Task Scheduling & Personal Command Center

> A modern, full-stack personal operating system engineered for scheduling tasks, cultivating weekly habits, managing project deliverables, and capturing knowledge with mental clarity.

---

## 📑 Table of Contents
1. [Overview & Core Concept](#overview--core-concept)
2. [Project Architecture & Directory Structure](#project-architecture--directory-structure)
3. [Key Features & Scheduling Engine](#key-features--scheduling-engine)
4. [Shared Reusable UI Components](#shared-reusable-ui-components)
5. [Backend REST API Specification](#backend-rest-api-specification)
6. [Offline-First Resilience & Sync](#offline-first-resilience--sync)
7. [Installation & Getting Started](#installation--getting-started)
8. [Configuration & Environment](#configuration--environment)

---

## 🌟 Overview & Core Concept

**Second Brain** elevates traditional to-do lists into a comprehensive command center. Built on cognitive time-blocking principles, it aligns daily granular execution with high-level quarterly milestones.

- **Primary Focus**: Task Scheduling across multiple perspectives (**List View**, **Kanban Board**, **Chronological Timeline**, and **Time-Slot Blocks**).
- **Architecture**: Clean separation of concerns with a Node.js/Express backend, an atomic zero-dependency JSON database engine, and a modular JavaScript frontend powered by shared reusable UI components.

---

## 📁 Project Architecture & Directory Structure

```text
secound brain/
├── backend/
│   ├── server.js                 # Complete All-in-One Backend (Database, Controllers, REST Routes, & Static Hosting)
│   └── data/
│       └── database.json          # Persistent JSON database (auto-created & seeded)
│
├── frontend/
│   ├── css/
│   │   ├── variables.css          # Design tokens (Obsidian, Midnight Blue, Cyber Emerald themes)
│   │   ├── base.css               # Typography, custom scrollbars, and responsive sidebar layout
│   │   ├── components.css         # Shared component styling (Buttons, Cards, Modals, Toasts)
│   │   └── pages.css              # Page-specific grids (Dashboard, Today, Kanban, Insights)
│   ├── js/
│   │   ├── api.js                 # REST API client with automatic offline fallback
│   │   ├── store.js               # Reactive central state store with event subscription
│   │   ├── components/            # Reusable UI components (TaskCard, StatCard, Modal, Toast, FilterBar, EmptyState)
│   │   ├── views/                 # Modular page views (Dashboard, Today, Tasks, Weekly, Projects, Goals, Notes, Insights, Settings)
│   │   └── app.js                 # Application router, global handlers, and initialization
│   └── index.html                 # Clean frontend markup entrypoint
│
├── index.html                     # Root entrypoint linking to modular frontend
├── package.json                   # NPM configuration and execution scripts
└── README.md                      # Comprehensive project documentation
```

---

## ⚡ Key Features & Scheduling Engine

### 1. Master Task Scheduling Center (`/tasks`)
- **Multi-Perspective Views**:
  - **List View**: Comprehensive list with priority indicators, due dates, project tags, and estimated minutes.
  - **Kanban Board**: Drag-or-click workflow columns (*To Do / Backlog*, *Scheduled Today*, *In Progress*, and *Completed*).
  - **Timeline Schedule**: Chronological date-grouped sequence of scheduled commitments.
- **Time-Slot Allocation**: Tag tasks as **Morning (08:00–12:00)**, **Afternoon (12:00–17:00)**, or **Evening (17:00–21:00)**.
- **Priority Matrix**: `🔥 Urgent`, `⚡ High`, `✦ Medium`, and `☕ Low`.
- **One-Click Rescheduling**: Bulk reschedule all overdue tasks to today with a single button click.

### 2. Today's Command & Focus Timer (`/today`)
- Hourly time-blocking for today's agenda.
- Integrated **Deep Work Pomodoro Timer** with work (25m) and break (5m) cycles.
- Direct association with scheduled tasks. When a focus session finishes, logging saves time duration directly into `/api/timers` and increments the task's actual minutes.

### 3. Weekly Habit Matrix (`/weekly`)
- Tracks recurring discipline routines on a **Saturday–Friday cycle**.
- Auto-rollover detection: Automatically begins a clean weekly sheet when a new Saturday begins while preserving historical totals.
- Target day calculation with dynamic gradient progress bars.

### 4. Projects & Deliverables (`/projects`)
- High-level project containers with status selectors (*Not Started*, *In Progress*, *On Hold*, *Completed*).
- Live progress slider (0% to 100%) and automatic progress calculation based on linked tasks.

### 5. Knowledge Base & Quick Capture (`/notes`)
- Fast idea capture to avoid interrupting flow state.
- Supports pinned notes, searchable tags, and 1-click clipboard copy.

### 6. Productivity Velocity Insights (`/insights`)
- Real-time calculations: Task completion rate, focus hours logged, category distribution (Deep Work, Engineering, Meeting, Health, Admin), and priority breakdowns.

---

## 🧩 Shared Reusable UI Components

To maintain clean and DRY (Don't Repeat Yourself) code, repeated UI elements are isolated into modular component builders:

| Component | File Location | Purpose & Capabilities |
| :--- | :--- | :--- |
| `TaskCard` | [`frontend/js/components/TaskCard.js`](file:///Users/marwanmohamed/Desktop/secound%20brain/frontend/js/components/TaskCard.js) | Renders task rows/cards across Dashboard, Today, Tasks, and Kanban. Features priority color bar, due date badges, estimated vs. actual minutes, interactive timer launcher, edit modal, and deletion confirmation. |
| `StatCard` | [`frontend/js/components/StatCard.js`](file:///Users/marwanmohamed/Desktop/secound%20brain/frontend/js/components/StatCard.js) | Standardized metric card displaying icons, large numbers, subtext captions, and trend indicators. |
| `Modal` | [`frontend/js/components/Modal.js`](file:///Users/marwanmohamed/Desktop/secound%20brain/frontend/js/components/Modal.js) | Accessible modal popup system with backdrop blur, keyboard ESC dismissal, dynamic body injection, and pre-built confirmation dialogs. |
| `Toast` | [`frontend/js/components/Toast.js`](file:///Users/marwanmohamed/Desktop/secound%20brain/frontend/js/components/Toast.js) | Animated feedback toasts (`Toast.success`, `Toast.error`, `Toast.info`) with auto-dismiss timers. |
| `FilterBar` | [`frontend/js/components/FilterBar.js`](file:///Users/marwanmohamed/Desktop/secound%20brain/frontend/js/components/FilterBar.js) | Standardized filter pill group with active state tracking and dynamic count badges. |
| `EmptyState` | [`frontend/js/components/EmptyState.js`](file:///Users/marwanmohamed/Desktop/secound%20brain/frontend/js/components/EmptyState.js) | Polished fallback UI for empty lists with customizable icon, title, description, and primary call-to-action button. |

---

## 🔌 Backend REST API Specification

All backend endpoints are prefixed with `/api`.

### Tasks API (`/api/tasks`)
- `GET /api/tasks` — Retrieve all tasks (Query filters: `filter`, `date`, `priority`, `projectId`, `search`, `timeSlot`).
- `POST /api/tasks` — Create and schedule a new task.
- `GET /api/tasks/:id` — Retrieve a single task by ID.
- `PUT /api/tasks/:id` — Update task details.
- `PATCH /api/tasks/:id/toggle` — Toggle task completion status.
- `DELETE /api/tasks/:id` — Delete a task.
- `POST /api/tasks/reschedule-overdue` — Bulk reschedule overdue uncompleted tasks to today.

### Projects API (`/api/projects`)
- `GET /api/projects` — Retrieve projects with computed task completion stats.
- `POST /api/projects` — Create a new project.
- `PUT /api/projects/:id` — Update project metadata, status, or progress.
- `DELETE /api/projects/:id` — Delete project.

### Weekly Habits API (`/api/weekly`)
- `GET /api/weekly` — Retrieve weekly habits, overall completion rate, and current week key.
- `POST /api/weekly` — Register a new weekly habit and target days.
- `PATCH /api/weekly/:id/toggle-day` — Toggle completion for a specific day index (0–6).
- `DELETE /api/weekly/:id` — Remove habit.

### Notes API (`/api/notes`)
- `GET /api/notes` — Retrieve notes (Query filters: `search`, `tag`, `pinned`).
- `POST /api/notes` — Save a new note.
- `PUT /api/notes/:id` — Update note content, tags, or pin status.
- `DELETE /api/notes/:id` — Delete note.

### Timers API (`/api/timers`)
- `GET /api/timers` — Retrieve logged focus sessions and monthly aggregation.
- `POST /api/timers` — Log completed Pomodoro session and update task's actual minutes.
- `DELETE /api/timers/:id` — Remove a time session entry.

### Stats & System API (`/api/stats`)
- `GET /api/stats/overview` — Aggregated overview metrics (completed tasks, overdue count, focus hours, weekly percent).
- `GET /api/stats/intention` & `POST /api/stats/intention` — Read and persist daily focus intention.
- `GET /api/stats/backup/export` — Download full JSON backup.
- `POST /api/stats/backup/import` — Restore database from JSON backup.
- `POST /api/stats/seed/reset` — Reset database to pristine default template.

---

## 🛡️ Offline-First Resilience & Sync

The frontend API client ([`frontend/js/api.js`](file:///Users/marwanmohamed/Desktop/secound%20brain/frontend/js/api.js)) monitors server reachability:
- **Online Mode**: Reads and persists data via the Express REST API and atomic JSON database.
- **Offline / Standalone Fallback**: If the server is offline or the HTML file is opened directly in a browser via `file://`, the client seamlessly mirrors all CRUD operations to `localStorage`.
- Real-time status indicator in the sidebar informs you whether cloud sync is active or running locally.

---

## 🚀 Installation & Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Quick Start

1. **Clone or Navigate to the Workspace**:
   ```bash
   cd "/Users/marwanmohamed/Desktop/secound brain"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Full-Stack Server**:
   ```bash
   npm start
   ```

4. **Launch the Application**:
   Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

*(Optional) For development with automatic server restart:*
```bash
npm run dev
```

---

## ⚙️ Configuration & Environment

You can configure the application port and settings using environment variables or a `.env` file in the workspace root:

```env
PORT=3000
NODE_ENV=production
```

Enjoy your newfound cognitive clarity and mastery over your schedule with **Second Brain**! ⚡
