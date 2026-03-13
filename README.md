# 🚀 Sprint Board Portal - Project Manual & User Guide

Welcome to the **Sprint Board Portal**, a high-performance project management solution designed for seamless team collaboration, smart data ingestion, and unified cloud storage.

---

## 📑 Table of Contents
1. [Overivew](#overview-high-level-architecture)
2. [Getting Started (Setup)](#getting-started-setup-instructions)
3. [User Roles & Permissions](#user-roles--permissions)
4. [User Manual: Feature Guide](#user-manual-feature-guide)
    - [Smart Bulk Import](#smart-bulk-import-csv-excel-pdf)
    - [Sprint & Kanban Boards](#sprint--kanban-boards-pro-tips)
    - [Daily Reports (Zoho Integration)](#daily-reports-zoho-workdrive)
5. [Technical Architecture](#technical-architecture-database--storage)
6. [Maintenance & Troubleshooting](#maintenance--troubleshooting)

---

## 🌟 Overview: High-Level Architecture
This application is built using a **PostgreSQL** backend for robust data management and a **React/Vite** frontend for a premium, responsive UI. It features a unique migration-ready architecture that uses **Zoho WorkDrive** for all file storage, ensuring your data is centralized and professional.

---

## 🛠️ Getting Started: Setup Instructions

### 1. Requirements
- **Node.js** (v18 or higher)
- **PostgreSQL** Database
- **Zoho WorkDrive** Account (Unified storage)

### 2. Environment Configuration
Navigate to the `backend` folder and create/edit the `.env` file with the following:

```env
# Server Config
PORT=5000
NODE_ENV=development

# Database Settings (Individual Parameters)
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=sprint_board

# OR Connection String (Preferred for Vercel/Neon/Supabase)
DATABASE_URL=postgres://user:pass@host:port/dbname?sslmode=require

# Note: In production (NODE_ENV=production), SSL is automatically enabled
# with rejectUnauthorized: false to support most cloud providers.

# Authentication
JWT_SECRET=your_secure_random_key
JWT_EXPIRES_IN=7d

# Zoho WorkDrive Credentials (CRITICAL)
# Access Token for immediate use (Optional if OAuth is set)
ZOHO_WORKDRIVE_API_KEY=your_access_token

# Dynamic OAuth Credentials (Recommended for 24/7 Uptime)
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token

# Folder IDs
ZOHO_WORKDRIVE_REPORTS_FOLDER_ID=your_reports_id
ZOHO_WORKDRIVE_ATTACHMENTS_FOLDER_ID=your_attachments_id
ZOHO_WORKDRIVE_WORK_FOLDER_ID=your_work_folder_id
```

### 🗝️ How to get Zoho OAuth Credentials
To ensure your file uploads never stop working, follow these steps to get a **Refresh Token**:
1.  Go to the [Zoho API Console](https://api-console.zoho.com/).
2.  Add a **"Self-Client"**.
3.  In the **"Generate Code"** tab, use scope: `WorkDrive.files.ALL,WorkDrive.workspace.ALL`.
4.  Copy the **Grant Code**.
5.  Quickly (within 10 mins) exchange this Grant Code for a **Refresh Token** using a POST request to `https://accounts.zoho.com/oauth/v2/token`.
6.  Place your `Client ID`, `Client Secret`, and `Refresh Token` into the `.env` file.

### 3. Running the App
1.  **Backend**: `cd backend && npm install && npm run dev`
2.  **Frontend**: `cd frontend && npm install && npm run dev`
3.  Access the app at `http://localhost:5173`

---

## 👥 User Roles & Permissions

| Role | Permissions |
| :--- | :--- |
| **Admin** | Full system access. Import data, manage teams, and view all global analytics. |
| **Team Lead** | Full access to their assigned team's boards and projects. Can submit daily reports. |
| **Member** | Access to assigned tasks and team boards. Can submit daily reports. |

---

## 📖 User Manual: Feature Guide

### 📂 Smart Bulk Import (CSV, Excel, PDF)
Located in the **Admin Import** section, this tool allows you to build your entire workspace in seconds.
- **Auto-Mapping**: You don't need exact headers! The system understands "Employee Name" as "Name," "Mail" as "Email," etc.
- **Validation**: Any invalid roles in your file are automatically corrected to "Member" to prevent crashes.
- **Admin Visibility**: Admins are automatically added to every imported team for immediate visibility.

### 🛡️ Sprint & Kanban Boards: Pro Tips
- **Drag-and-Drop**: Built with a "Strong Fix" algorithm. You can drop tasks directly onto other cards or into empty statuses with 100% accuracy.
- **Persistence**: Every move is saved to the database instantly.
- **Vanishing Task Prevention**: Sprints are locked to their specific boards—tasks never "disappear" during a status change.

### 📁 Daily Reports & Work Uploads (Zoho WorkDrive)
For Members and Team Leads:
1.  Go to the **Dashboard**.
2.  **"Submit Today's Report"**: Uploads to the Reports directory.
3.  **"Upload Work"**: Uploads to the Dedicated Work directory.
4.  **Automatic Organization**: Both features automatically create a folder named after **YOU** in the respective Zoho WorkDrive directory.
5.  **Smart Fallback**: If a personal folder cannot be created for any reason, the system will automatically rename your file to `[Your Name]_[Current Date]_[Filename]` and store it securely in the main folder so it remains identifiable.

---

## 🏗️ Technical Architecture: Database & Storage

### 🧠 The Database (PostgreSQL)
The database stores "logical" data:
- **`tasks`**: Tracks status, priority, and `sort_order` (BIGINT).
- **`task_attachments`**: Stores the **URLs** to Zoho files, not the files themselves.

### ☁️ Unified Storage (Zoho WorkDrive)
We have removed all Reliance on Cloudinary. Every file you upload (Daily Reports and Task Attachments) is relayed to Zoho WorkDrive. 
- **Folder IDs**: Managed via `.env` to keep project data and member reports perfectly separated.

---

## 🔧 Maintenance & Troubleshooting
- **Drag-and-Drop Lag?**: Ensure your `sort_order` is using the `BIGINT` column type.
- **Import Failing?**: Use the provided `task_import_template.csv` in the root folder for the smoothest experience.
- **Zoho Upload Error?**: Check your OAuth token expiration in the `.env` file.

---
**Developed with ❤️ for the Sprint Board Team.**
