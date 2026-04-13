# TaskFlow

A team task management app with kanban-style board, built with Convex + React + Vite + Tailwind CSS.

## Features

- Password-based authentication (Convex Auth)
- Project CRUD with role-based access (admin / editor / viewer)
- Kanban task board (backlog, todo, in progress, done)
- Task assignment, priority, and due dates
- Comments on tasks
- Activity logging
- Label management with task-label associations
- Member management (add / role change / remove)
- Background cascading cleanup on project/task deletion
- Task count aggregates via `@convex-dev/aggregate`

## Tech Stack

- [Convex](https://convex.dev/) — backend: database, server functions, auth
- React 19 + Vite — frontend
- Tailwind CSS v4 — styling
- Convex Auth — password-based authentication

## Running Locally

```
npm install
npm run dev
```
