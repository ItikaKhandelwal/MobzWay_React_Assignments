import { useEffect, useMemo, useState } from 'react';
import {
  firebaseLogin,
  getFirebaseDocument,
  isFirebaseConfigured,
  listFirebaseDocuments,
  queryFirebaseDocuments,
} from '../services/firebaseRest.js';
import { loginDemoUser, readDatabase } from '../services/localDb.js';

const menuItems = [
  { id: 'users', label: 'Users' },
  { id: 'lists', label: 'Task Lists' },
  { id: 'tasks', label: 'Tasks' },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getIndividualDatabase(database, userId) {
  return {
    users: database.users.filter((user) => user.id === userId),
    taskLists: database.taskLists.filter((list) => list.createdById === userId),
    tasks: database.tasks.filter((task) => task.createdById === userId),
  };
}

export default function BackOfficePanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ userId: '', password: '' });
  const [activeMenu, setActiveMenu] = useState('users');
  const [database, setDatabase] = useState(() => readDatabase());
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [dataSource, setDataSource] = useState('local');
  const [accessMode, setAccessMode] = useState('admin');
  const [firebaseToken, setFirebaseToken] = useState('');
  const [signedInUserId, setSignedInUserId] = useState('');
  const [firebaseIdentity, setFirebaseIdentity] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dataSource !== 'local' || !isLoggedIn) return undefined;

    const refresh = () => {
      const latestDatabase = readDatabase();
      setDatabase(
        accessMode === 'user'
          ? getIndividualDatabase(latestDatabase, signedInUserId)
          : latestDatabase,
      );
    };

    window.addEventListener('assignment-db-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('assignment-db-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [accessMode, dataSource, isLoggedIn, signedInUserId]);

  useEffect(() => {
    if (
      selectedUserId !== 'all' &&
      !database.users.some((user) => user.id === selectedUserId)
    ) {
      setSelectedUserId(accessMode === 'user' ? signedInUserId : 'all');
    }
  }, [accessMode, database.users, selectedUserId, signedInUserId]);

  const selectedUser = useMemo(
    () => database.users.find((user) => user.id === selectedUserId) ?? null,
    [database.users, selectedUserId],
  );

  const visibleTaskLists = useMemo(
    () =>
      selectedUserId === 'all'
        ? database.taskLists
        : database.taskLists.filter((list) => list.createdById === selectedUserId),
    [database.taskLists, selectedUserId],
  );

  const visibleTasks = useMemo(
    () =>
      selectedUserId === 'all'
        ? database.tasks
        : database.tasks.filter((task) => task.createdById === selectedUserId),
    [database.tasks, selectedUserId],
  );

  const listRows = useMemo(
    () =>
      visibleTaskLists.map((list) => ({
        ...list,
        taskCount: database.tasks.filter((task) => task.listId === list.id).length,
      })),
    [database.tasks, visibleTaskLists],
  );

  const userRows = useMemo(
    () =>
      database.users.map((user) => ({
        ...user,
        listCount: database.taskLists.filter((list) => list.createdById === user.id).length,
        taskCount: database.tasks.filter((task) => task.createdById === user.id).length,
      })),
    [database],
  );

  async function isFirebaseAdmin(userId, idToken) {
    try {
      await getFirebaseDocument('admins', userId, idToken);
      return true;
    } catch {
      return false;
    }
  }

  async function loadCloudAdminDatabase(idToken) {
    const [users, taskLists, tasks] = await Promise.all([
      listFirebaseDocuments('users', idToken),
      listFirebaseDocuments('taskLists', idToken),
      listFirebaseDocuments('tasks', idToken),
    ]);

    const cloudDatabase = { users, taskLists, tasks };
    setDatabase(cloudDatabase);
    return cloudDatabase;
  }

  async function loadCloudUserDatabase(identity, idToken) {
    let user;

    try {
      user = await getFirebaseDocument('users', identity.localId, idToken);
    } catch {
      user = {
        id: identity.localId,
        email: identity.email,
        passwordDisplay: 'Protected by Firebase Auth',
        signupTime: '',
        ip: 'Unavailable',
        source: 'Firebase',
      };
    }

    const [taskLists, tasks] = await Promise.all([
      queryFirebaseDocuments('taskLists', 'createdById', identity.localId, idToken),
      queryFirebaseDocuments('tasks', 'createdById', identity.localId, idToken),
    ]);

    const userDatabase = { users: [user], taskLists, tasks };
    setDatabase(userDatabase);
    return userDatabase;
  }

  async function loadCloudDatabase(identity, idToken) {
    const hasAdminAccess = await isFirebaseAdmin(identity.localId, idToken);

    if (hasAdminAccess) {
      await loadCloudAdminDatabase(idToken);
      return 'admin';
    }

    await loadCloudUserDatabase(identity, idToken);
    return 'user';
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userId = credentials.userId.trim();
      const password = credentials.password;

      if (isFirebaseConfigured && userId.includes('@')) {
        const authResult = await firebaseLogin(userId.toLowerCase(), password);
        const nextAccessMode = await loadCloudDatabase(authResult, authResult.idToken);

        setFirebaseToken(authResult.idToken);
        setFirebaseIdentity(authResult);
        setSignedInUserId(authResult.localId);
        setDataSource('firebase');
        setAccessMode(nextAccessMode);
        setSelectedUserId(nextAccessMode === 'admin' ? 'all' : authResult.localId);
        setIsLoggedIn(true);
        return;
      }

      if (userId === 'admin' && password === 'admin123') {
        setDatabase(readDatabase());
        setFirebaseToken('');
        setFirebaseIdentity(null);
        setSignedInUserId('');
        setDataSource('local');
        setAccessMode('admin');
        setSelectedUserId('all');
        setIsLoggedIn(true);
        return;
      }

      const localUser = loginDemoUser(userId, password);
      const localDatabase = getIndividualDatabase(readDatabase(), localUser.id);
      setDatabase(localDatabase);
      setFirebaseToken('');
      setFirebaseIdentity(null);
      setSignedInUserId(localUser.id);
      setDataSource('local');
      setAccessMode('user');
      setSelectedUserId(localUser.id);
      setIsLoggedIn(true);
    } catch (loginError) {
      setError(
        loginError.message === 'Missing or insufficient permissions.'
          ? 'Login succeeded, but this account cannot read the requested workspace. Please publish the included Firestore rules.'
          : loginError.message,
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    setLoading(true);
    setError('');

    try {
      if (dataSource === 'firebase') {
        if (!firebaseIdentity) throw new Error('Firebase session is unavailable. Please log in again.');

        if (accessMode === 'admin') {
          await loadCloudAdminDatabase(firebaseToken);
        } else {
          await loadCloudUserDatabase(firebaseIdentity, firebaseToken);
        }
      } else {
        const latestDatabase = readDatabase();
        setDatabase(
          accessMode === 'user'
            ? getIndividualDatabase(latestDatabase, signedInUserId)
            : latestDatabase,
        );
      }
    } catch (refreshError) {
      setError(`Could not refresh data: ${refreshError.message}`);
    } finally {
      setLoading(false);
    }
  }

  function openUserWorkspace(userId, menu = 'lists') {
    setSelectedUserId(userId);
    setActiveMenu(menu);
  }

  function logout() {
    setIsLoggedIn(false);
    setCredentials({ userId: '', password: '' });
    setFirebaseToken('');
    setFirebaseIdentity(null);
    setSignedInUserId('');
    setDataSource('local');
    setAccessMode('admin');
    setSelectedUserId('all');
    setActiveMenu('users');
    setError('');
  }

  if (!isLoggedIn) {
    return (
      <article className="card backoffice-login-card">
        <div>
          <p className="card-label">Task 7 secure area</p>
          <h3>Back Office Login</h3>
          <p>
            Log in with an email and password created in Task 6 to open that
            user&apos;s individual workspace. The admin login opens all users available
            to that admin account.
          </p>
          <div className="demo-credentials">
            <span>Local Admin ID: <strong>admin</strong></span>
            <span>Password: <strong>admin123</strong></span>
          </div>
          {isFirebaseConfigured && (
            <p className="helper-text">
              Firebase mode is active. Task 6 users see only their own lists and tasks;
              authorised Firebase admins can see every user.
            </p>
          )}
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Task 6 email or admin ID
            <input
              type="text"
              value={credentials.userId}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, userId: event.target.value }))
              }
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, password: event.target.value }))
              }
              autoComplete="current-password"
              required
            />
          </label>
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Opening…' : 'Open panel'}
          </button>
          {error && <p className="form-alert is-error">{error}</p>}
        </form>
      </article>
    );
  }

  const listCount = selectedUserId === 'all' ? database.taskLists.length : visibleTaskLists.length;
  const taskCount = selectedUserId === 'all' ? database.tasks.length : visibleTasks.length;
  const isCloud = dataSource === 'firebase';
  const isIndividualAccess = accessMode === 'user';

  return (
    <article className="card backoffice-shell">
      <aside className="backoffice-sidebar">
        <div>
          <p className="card-label">
            {isIndividualAccess ? 'Individual workspace' : 'Admin workspace'}
          </p>
          <h3>Back Office</h3>
          <span className="admin-source-pill">
            {isCloud ? 'Firebase cloud' : 'This browser'} ·{' '}
            {isIndividualAccess ? 'User access' : 'Admin access'}
          </span>
        </div>
        <nav aria-label="Back office sections">
          {menuItems.map((item) => (
            <button
              className={activeMenu === item.id ? 'is-active' : ''}
              key={item.id}
              type="button"
              onClick={() => setActiveMenu(item.id)}
            >
              <span>{item.label}</span>
              <strong>
                {item.id === 'users'
                  ? database.users.length
                  : item.id === 'lists'
                    ? listCount
                    : taskCount}
              </strong>
            </button>
          ))}
        </nav>
        <button className="button button--secondary" type="button" onClick={logout}>
          Log out
        </button>
      </aside>

      <div className="backoffice-content">
        <div className="backoffice-topbar">
          <div>
            <p className="card-label">Data grid</p>
            <h3>{menuItems.find((item) => item.id === activeMenu)?.label}</h3>
            <p className="backoffice-context">
              {selectedUser
                ? `Showing workspace for ${selectedUser.email}`
                : 'Showing all users'}
            </p>
          </div>
          <div className="backoffice-actions">
            {activeMenu !== 'users' && !isIndividualAccess && database.users.length > 0 && (
              <label className="user-workspace-filter">
                Workspace owner
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                >
                  <option value="all">All users</option>
                  {database.users.map((user) => (
                    <option key={user.id} value={user.id}>{user.email}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="button button--secondary"
              type="button"
              onClick={refreshData}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>
          </div>
        </div>

        <div className={`admin-data-notice ${isCloud ? 'is-cloud' : ''}`}>
          {isCloud && !isIndividualAccess
            ? 'Live shared Firestore data. This authorised admin can view all users, lists and tasks.'
            : isCloud
              ? 'Live Firestore data for this Task 6 account. Other users remain private.'
              : !isIndividualAccess
                ? 'Local admin data is limited to users created in this browser profile.'
                : 'Showing only the Task 6 data belonging to this user in this browser profile.'}
        </div>

        {error && <p className="form-alert is-error">{error}</p>}

        {activeMenu === 'users' && (
          <AdminTable emptyMessage="No Task 6 user record is available yet.">
            <thead>
              <tr>
                <th>Email ID</th>
                <th>Password</th>
                <th>Signup Time</th>
                <th>IP</th>
                <th>Lists</th>
                <th>Tasks</th>
                <th>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.passwordDisplay ?? '••••••••'}</td>
                  <td>{formatDate(user.signupTime)}</td>
                  <td>{user.ip || 'Unavailable'}</td>
                  <td>{user.listCount}</td>
                  <td>{user.taskCount}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => openUserWorkspace(user.id, 'lists')}>
                        Lists
                      </button>
                      <button type="button" onClick={() => openUserWorkspace(user.id, 'tasks')}>
                        Tasks
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}

        {activeMenu === 'lists' && (
          <AdminTable
            emptyMessage={
              selectedUser
                ? `${selectedUser.email} has not created any task lists yet.`
                : 'No task lists have been created yet.'
            }
          >
            <thead>
              <tr>
                <th>Task List Title</th>
                <th>Created By (Email ID)</th>
                <th>No. of Tasks</th>
                <th>Creation Time</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {listRows.map((list) => (
                <tr key={list.id}>
                  <td>{list.title}</td>
                  <td>{list.createdByEmail}</td>
                  <td>{list.taskCount}</td>
                  <td>{formatDate(list.createdAt)}</td>
                  <td>{formatDate(list.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}

        {activeMenu === 'tasks' && (
          <AdminTable
            emptyMessage={
              selectedUser
                ? `${selectedUser.email} has not created any tasks yet.`
                : 'No tasks have been created yet.'
            }
          >
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Task Description</th>
                <th>Task List Title</th>
                <th>Created By (Email ID)</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Creation Time</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => {
                const taskList = database.taskLists.find((list) => list.id === task.listId);
                return (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td className="description-cell">{task.description || '—'}</td>
                    <td>{taskList?.title ?? 'Deleted list'}</td>
                    <td>{task.createdByEmail}</td>
                    <td>{task.completed ? 'Completed' : 'Open'}</td>
                    <td>{task.priority || 'Medium'}</td>
                    <td>{task.dueDate || '—'}</td>
                    <td>{formatDate(task.createdAt)}</td>
                    <td>{formatDate(task.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        )}
      </div>
    </article>
  );
}

function AdminTable({ children, emptyMessage }) {
  const body = children.find?.((child) => child?.type === 'tbody');
  const rows = body?.props?.children;
  const hasRows = Array.isArray(rows) ? rows.length > 0 : Boolean(rows);

  return (
    <div className="admin-table-wrap">
      <div className="table-wrap">
        <table className="admin-table">{children}</table>
      </div>
      {!hasRows && <div className="empty-state">{emptyMessage}</div>}
    </div>
  );
}
