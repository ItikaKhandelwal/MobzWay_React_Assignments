# Firebase Setup for Shared Users and Admin Panel

Firebase is required when users created in different browsers, incognito windows, or devices must appear in one shared admin panel. Local demo mode uses `localStorage`, so it is intentionally limited to one browser profile.

## 1. Firebase project

1. Create/open a Firebase project.
2. Add a Web App.
3. Copy the web app `apiKey` and `projectId` values.

The app uses Firebase Authentication and the Cloud Firestore REST API; no Firebase npm package is required.

## 2. Enable Email/Password authentication

In **Authentication → Sign-in method**, enable **Email/Password**.

## 3. Create Firestore and publish secure rules

Create the Firestore database, then publish the rules from `firestore.rules.example`.

These rules keep normal users restricted to their own records while an authenticated UID with a matching `admins/{uid}` document can read all Task 6/7 data. Firestore evaluates queries against the rules, so the admin collection reads must be authorised explicitly.

## 4. Vercel environment variables

Do **not** commit `.env` to GitHub. Add these variables directly in Vercel under **Settings → Environment Variables** for Production (and Preview/Development when needed):

```env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
```

Redeploy after saving the variables. The repository ignores `.env` files.

## 5. Create the authorised Task 7 admin

1. Open **Firebase Console → Authentication → Users**.
2. Create the admin email/password account.
3. Copy its Firebase UID.
4. Open **Firestore Database → Data**.
5. Create an `admins` collection.
6. Create a document whose document ID is exactly that Firebase UID.
7. Optionally add an `email` field for reference.

The client cannot create or promote itself to admin under the supplied rules.

## 6. Shared Task 6 behaviour

With Firebase enabled, every Task 6 signup creates a Firebase Authentication account and a corresponding `/users/{uid}` Firestore document. Task lists are stored in `/taskLists/{listId}` and tasks in `/tasks/{taskId}`, each containing `createdById`.

That means User A in Chrome and User B in Edge/Incognito write to the same Firestore project instead of separate browser `localStorage` databases.

## 7. Task 7 behaviour

- A normal Task 6 account can log in to Task 7 with the same email/password and sees only its own lists/tasks.
- The authorised Firebase admin sees all registered users, all task lists, and all tasks across browsers/devices.
- Use **Refresh data** to fetch the latest shared records after another user signs up or changes tasks.
- The Users table shows per-user list/task counts, and the **Lists** / **Tasks** actions open that user's workspace.

## 8. Test

1. Open the deployed app in Browser A and sign up User A.
2. Open the app in Browser B/incognito and sign up User B.
3. Create at least one list and task for each user.
4. In Task 7, log in with the authorised Firebase admin account.
5. Refresh data.
6. Confirm both users are visible and their task/list counts are separated correctly.

## Security notes

- Never commit Firebase configuration or other environment files to source control.
- Never store Firebase Authentication passwords in Firestore or in client-side app state.
- Firebase ID tokens used by this REST integration are evaluated by Firestore Security Rules. citeturn789597search2turn789597search1
- Do not use open Firestore rules such as `allow read, write: if true`; Firebase explicitly warns that deployed public databases can then be read or modified by anyone. citeturn789597search0
