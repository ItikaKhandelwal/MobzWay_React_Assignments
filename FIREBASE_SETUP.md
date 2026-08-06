# Firebase Setup for Shared Users and Admin Panel

Firebase is required only when users created in different browsers, incognito windows, or devices must appear in one shared admin panel. The local demo mode uses `localStorage`, so it is intentionally limited to one browser profile.

## 1. Create a Firebase project and web app

1. Open Firebase Console and create a project.
2. Add a Web App inside the project.
3. From the web app configuration, copy:
   - `apiKey`
   - `projectId`

This project uses Firebase REST APIs, so no Firebase npm package is required.

## 2. Enable email/password login

1. Go to **Authentication → Sign-in method**.
2. Enable **Email/Password**.

## 3. Create Cloud Firestore

1. Go to **Firestore Database**.
2. Create the database.
3. Open the **Rules** tab.
4. Replace the rules with the contents of `firestore.rules.example`.
5. Publish the rules.

## 4. Add environment variables

Create a `.env` file locally:

```env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
```

For Vercel:

1. Open the Vercel project.
2. Go to **Settings → Environment Variables**.
3. Add both variables for Production, Preview, and Development as needed.
4. Redeploy the project after saving them.

## 5. Create the authorised admin account

1. Go to **Firebase Authentication → Users**.
2. Add an email/password user for the administrator.
3. Copy that user's Firebase UID.
4. Go to **Firestore Database → Data**.
5. Create a collection named `admins`.
6. Create a document with the copied UID as the exact document ID.
7. Add an optional string field:

```text
email: your-admin-email@example.com
```

The document ID, not the email field, grants admin access through the Firestore rules.

## 6. Use the admin panel

- `admin / admin123` opens local demo data from the same browser only.
- Enter the authorised Firebase admin email in the **User ID** field and its Firebase password to load all shared users, task lists, and tasks.
- Use **Refresh data** after another user signs up or changes tasks.
- Use the **Lists** and **Tasks** buttons in the Users table, or the **Workspace owner** filter, to inspect one user's data individually.

## 7. Test the complete flow

1. Sign up User A in a normal browser window.
2. Sign up User B in an incognito window or a different device.
3. Create lists and tasks under both accounts.
4. Log in to Task 7 with the authorised Firebase admin email.
5. Click **Refresh data**.
6. Confirm both users appear and their workspaces remain separated.

## Security notes

- Never place the Firebase admin password in `.env` or source code. Vite environment variables are delivered to the browser.
- Firebase user passwords are handled by Firebase Authentication and are never stored in Firestore.
- The `admins/{uid}` document is read by security rules and cannot be created from the client under the supplied rules. Create it from Firebase Console or a trusted server environment.
