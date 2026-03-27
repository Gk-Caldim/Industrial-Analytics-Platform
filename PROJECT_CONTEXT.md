# Project Context: Industrial Analytics Platform

A comprehensive guide for AI agents and developers to understand the project architecture, technology stack, and core modules.

## 🚀 Overview

The **Industrial Analytics Platform** is a high-performance web application designed for industrial-scale data management, tracking, and visualization. It provides a suite of tools for managing projects, employees, departments, and manufacturing parts, with integrated analytics and real-time trackers.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) (Vite)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) (Animations)
- **Data Visualization**: [Apache ECharts](https://echarts.apache.org/) (via `echarts-for-react`)
- **Data Grids**: [Handsontable](https://handsontable.com/) (Excel-like interface)
- **Icons**: [Lucide React](https://lucide.dev/), [React Icons](https://react-icons.github.io/react-icons/)
- **Utility**: [Axios](https://axios-http.com/) (API calls), [XLSX](https://github.com/SheetJS/sheetjs), [jsPDF](https://github.com/parallax/jsPDF)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database ORM**: [SQLAlchemy](https://www.sqlalchemy.org/)
- **Security**: Argon2 (Password Hashing)
- **Server**: [Uvicorn](https://www.uvicorn.org/)

---

## 📂 Directory Structure

### `/frontend` (React Application)
- `src/pages/`: Core application views.
  - `/Masters`: Management interfaces for Departments, Employees, Parts, and Projects.
  - `/Trackers`: Real-time data trackers and upload management.
  - `ProjectDashboard.jsx`: Complex dashboard for project-specific analytics (very active file).
- `src/components/`: Reusable UI elements (Sidebar, Header, ErrorBoundary).
- `src/store/`: Redux slices (`authSlice`, `navSlice`, `projectSlice`).
- `src/hooks/` & `src/utils/`: Shared logic and helper functions.

### `/backend` (FastAPI Application)
- `app/api/`: Route handlers (Auth, Employees, Projects, Parts, Datasets, Email, Budget).
- `app/models/`: SQLAlchemy models defining the database schema.
- `app/schemas/`: Pydantic models for request/response validation.
- `app/crud/`: Content creation, read, update, and delete logic.
- `app/core/`: Application configuration (CORS, Database connection).

---

## 🔑 Core Modules & Features

### 1. Master Data Management
- **Project Master**: Central hub for defining and tracking industrial projects.
- **Employee & Department Master**: Organizational hierarchy and access control management.
- **Part Master**: Inventory and specification tracking for manufactured parts.

### 2. Analytics & Visualization
- **Dynamic Dashboards**: Interactive charts using ECharts for high-level overviews.
- **Project Dashboard**: Deep dive into specific project metrics, budgets, and progress.

### 3. Data Integration
- **Excel Support**: Upload and view large datasets using Handsontable.
- **File Tracking**: Versioning and tracking of data uploads.

### 4. Security & Access
- **Authentication**: JWT-based auth with secure password hashing.
- **Employee Access Control**: Granular permissions for different platform modules.

---

## 💻 Internal Communication & AI Context

### State Management Patterns
- **Auth**: Managed via Redux (`authSlice`) and persisted locally.
- **Navigation**: Sidebar state and breadcrumbs managed in `navSlice`.

### API Conventions
- Prefixed with `/api` (configurable in `app.core.config`).
- Error handling uses custom FastAPI exception handlers for detailed validation feedback.

### Key Active Files
- **Frontend Main Page**: `frontend/src/pages/LandingPage.jsx`
- **Analytics Hub**: `frontend/src/pages/ProjectDashboard.jsx` (270KB+, contains master logic)
- **Backend Entry**: `backend/app/main.py`
