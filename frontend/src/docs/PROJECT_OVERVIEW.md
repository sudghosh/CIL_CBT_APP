# CIL_CBT_App Project Documentation

## 1. Project Overview

CIL_CBT_App is a full-stack web application designed for managing and conducting Computer-Based Tests (CBT) for HR exams. It provides a robust platform for test-takers, administrators, and question managers, supporting user authentication, test management, question banks, and result tracking.

- **Frontend:** React (TypeScript), Material UI, Google OAuth
- **Backend:** FastAPI (Python), PostgreSQL
- **Containerization:** Docker, Docker Compose

## 2. Architecture

### 2.1. Frontend
- **Framework:** React (TypeScript)
- **Routing:** React Router
- **State Management:** React Context (AuthContext)
- **UI:** Material UI
- **Authentication:** Google OAuth (production), Dev token (development)
- **Testing:** Jest

**Key Folders:**
- `src/components/` – Reusable UI components (Layout, ErrorBoundary, DevModeAuthFix, etc.)
- `src/pages/` – Main pages (Login, Home, MockTest, PracticeTest, Results, QuestionManagement, UserManagement)
- `src/contexts/` – Context providers (AuthContext)
- `src/utils/` – Utility modules (auth, dev tools, caching, etc.)
- `src/services/` – API service wrappers

### 2.2. Backend
- **Framework:** FastAPI
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **Testing:** Pytest

**Key Folders:**
- `src/auth/` – Authentication logic
- `src/routers/` – API endpoints (auth, questions, users, tests)
- `src/database/` – DB models and connection
- `src/utils/` – Utility functions
- `src/validation/` – Data validation

## 3. Authentication System

### 3.1. Production
- Uses Google OAuth for secure login
- JWT tokens are stored in localStorage
- User/admin status is verified via backend API

### 3.2. Development Mode
- Uses a special dev token (`dev-token-for-testing`)
- Mock admin user is injected for local testing
- Dev tools available in browser console (`window.devTools`)
- Caching and synchronization utilities ensure admin status persists across navigation

**Key Files:**
- `AuthContext.tsx` – Manages auth state, login/logout, and user context
- `authCache.ts` – Caches auth/admin state in sessionStorage
- `syncAuthState.ts` – Synchronizes and repairs auth state in dev mode
- `devTools.ts` – Exposes global dev utilities for fixing/testing auth
- `NavigationAuthGuard.tsx` – Ensures auth state is preserved on route changes

## 4. Main Components & Pages

- **LoginPage:** Handles Google/dev login
- **HomePage:** Dashboard for users
- **MockTestPage/PracticeTestPage:** Test-taking interfaces
- **ResultsPage:** Shows test results
- **QuestionManagement/UserManagement:** Admin-only pages for managing questions/users
- **Layout:** Main app shell with navigation
- **DevModeAuthFix:** Button for fixing dev auth issues
- **NavigationAuthGuard:** Invisible component that maintains auth state during navigation

## 5. How to Run, Build, and Deploy

### 5.1. Development
- `docker-compose -f docker-compose.dev.yml up` (from `CIL_CBT_App` root)
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Use the "Development Login" button for dev mode

### 5.2. Production
- `docker-compose -f docker-compose.prod.yml up --build`
- Configure secrets in `secrets/` and `.env.prod`

## 6. Development Mode & Dev Tools

- Use `window.devTools.forceAdmin()` to force admin login
- Use `window.devTools.syncAuth()` to synchronize/fix auth state
- Use `window.devTools.checkAuth()` to inspect current auth state
- Use `window.devTools.resetAuth()` to clear all auth data

## 7. Troubleshooting

- If admin routes are inaccessible in dev mode, use the "Fix Admin Auth" button or `window.devTools.syncAuth()`
- If you are logged out unexpectedly, refresh the page or use the dev tools
- Check the browser console for `[DEBUG]` logs for detailed state

## 8. References & Further Reading

- [The Ultimate Website Project Documentation List (Crucible)](https://crucible.io/insights/news/the-ultimate-website-project-documentation-list-20-must-have-documents/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Material UI](https://mui.com/)
- [Docker Documentation](https://docs.docker.com/)

---

This documentation provides a high-level and practical overview for developers and maintainers. For more details, see inline code comments and the `src/docs/` folder.
