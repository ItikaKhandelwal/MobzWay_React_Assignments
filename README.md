# React Programming Assignment

A ready-to-run React application covering all seven assignment tasks:

1. Small learning tasks
   - Display JSX
   - Render an array of records
   - Show/hide an element
   - Enable/disable a button
   - Controlled textbox (two-way binding behaviour)
   - Dynamically add/remove child components
   - Sum two numbers
2. Counter with increase, decrease and reset
3. Live search filter over an array
4. Static JSON data grid with search, segment filter, sorting and row selection
5. Drag-and-drop task board with five blocks and ten initially unplanned tasks
6. User To-Do application
   - Email/password signup and login
   - Firebase Authentication and Cloud Firestore support
   - Local demo mode when Firebase is not configured
   - Create multiple To-Do Lists
   - Add task title, description, due date and priority
   - Drag tasks between lists and High/Medium/Low priority lanes
7. Back Office panel
   - Static admin login
   - Users data grid
   - Task Lists data grid
   - Tasks data grid

## Requirements

- Node.js 20.19+ or Node.js 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Task 6 Firebase setup

Task 6 works immediately in local demo mode. To use Firebase:

1. Create a Firebase project.
2. Enable **Email/Password** in Firebase Authentication.
3. Create a Cloud Firestore database.
4. Copy `.env.example` to `.env`.
5. Add your Firebase Web API key and Firebase project ID:

```env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
```

6. Use `firestore.rules.example` as the starting point for your Firestore security rules.
7. Restart `npm run dev` after changing `.env`.

The project uses Firebase Authentication and Firestore REST APIs, so no additional Firebase npm package is required.

## Task 7 login

The assignment uses static demonstration credentials:

```text
User ID: admin
Password: admin123
```

Task 7 displays data created in Task 6. Firebase passwords are never stored or exposed; the password column shows a protected placeholder. In local demo mode, the password is retained only in browser local storage to support the assignment login flow and is masked in the admin panel.

## Production build

```bash
npm run build
npm run preview
```

The production files are generated in the `dist` folder.

## Main project files

```text
src/
├── components/
│   ├── BackOfficePanel.jsx
│   ├── Counter.jsx
│   ├── DataGrid.jsx
│   ├── DragDropBoard.jsx
│   ├── SearchFilter.jsx
│   ├── TaskOne.jsx
│   └── TaskSixTodo.jsx
├── data/
│   └── customers.json
├── services/
│   ├── firebaseRest.js
│   └── localDb.js
├── App.jsx
├── main.jsx
└── styles.css
```

Tasks 5 and 6 use the browser's native HTML drag-and-drop API.

## Deploy as a live website

### Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Select the Vite framework preset.
4. Add the optional Firebase environment variables in Vercel project settings.
5. Use `npm run build` as the build command and `dist` as the output directory.

### Netlify

1. Import the GitHub repository into Netlify.
2. Add the optional Firebase environment variables in Netlify site settings.
3. Use `npm run build` as the build command.
4. Use `dist` as the publish directory.
