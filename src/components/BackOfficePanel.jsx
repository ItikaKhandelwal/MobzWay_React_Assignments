import { useEffect, useMemo, useState } from 'react';
import {
  firebaseLogin,
  isFirebaseConfigured,
  listFirebaseDocuments,
} from '../services/firebaseRest.js';
import { readDatabase } from '../services/localDb.js';

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

function emptyDatabase() {
  return { users: [], taskLists: [], tasks: [] };
}

export default function BackOfficePanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ userId: '', password: '' });
  const [activeMenu, setActiveMenu] = useState('users');
  const [database, setDatabase] = useState(() => readDatabase());
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [dataSource, setDataSource] = useState('local');
  const [adminToken, setAdminToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dataSource !== 'local') return undefined;

    const refresh = () => setDatabase(readDatabase());
    window.addEventListener('assignment-db-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('assignment-db-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [dataSource]);

  useEffect(() => {
    if (
      selectedUserId !== 'all' &&
      !database.users.some((user) => user.id === selectedUserId)
    ) {
      setSelectedUserId('all');
    }
  }, [database.users, selectedUserId]);

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

  async function loadCloudDatabase(idToken) {
    const [users, taskLists, tasks] = await Promise.all([
      listFirebaseDocuments('users', idToken),
      listFirebaseDocuments('taskLists', idToken),
      listFirebaseDocuments('tasks', idToken),
    ]);

    const cloudDatabase = { users, taskLists, tasks };
    setDatabase(cloudDatabase);
    return cloudDatabase;
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
        await loadCloudDatabase(authResult.idToken);
        setAdminToken(authResult.idToken);
        setDataSource('firebase');
        setSelectedUserId('all');
        setIsLoggedIn(true);
        return;
      }

      if (userId === 'admin' && password === 'admin123') {
        setDatabase(readDatabase());
        setAdminToken('');
        setDataSource('local');
        setSelectedUserId('all');
        setIsLoggedIn(true);
        return;
      }

      throw new Error(
        isFirebaseConfigured
          ? 'Use admin/admin123 for this browser only, or sign in with your authorised Firebase admin email.'
          : 'Invalid admin user ID or password.',
      );
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    setLoading(true);
    setError('');

    try {
      if (dataSource === 'firebase') {
        await loadCloudDatabase(adminToken);
      } else {
        setDatabase(readDatabase());
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
    setAdminToken('');
    setDataSource('local');
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
            Use the static demo login to inspect data stored in this browser. When
            Firebase is configured, use an authorised Firebase admin email to view
            users and tasks created across browsers and devices.
          </p>
          <div className="demo-credentials">
            <span>User ID: <strong>admin</strong></span>
            <span>Password: <strong>admin123</strong></span>
          </div>
          {isFirebaseConfigured && (
            <p className="helper-text">
              Firebase mode is available. Enter the admin account email in the User ID field.
            </p>
          )}
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            User ID or Firebase admin email
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

  return (
    <article className="card backoffice-shell">
      <aside className="backoffice-sidebar">
        <div>
          <p className="card-label">Admin workspace</p>
          <h3>Back Office</h3>
          <span className="admin-source-pill">
            {dataSource === 'firebase' ? 'Firebase cloud' : 'This browser'}
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
            {activeMenu !== 'users' && database.users.length > 0 && (
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

        <div className={`admin-data-notice ${dataSource === 'firebase' ? 'is-cloud' : ''}`}>
          {dataSource === 'firebase'
            ? 'Live shared data from Firestore. New users from other browsers appear after refresh.'
            : 'Local demo data is limited to this browser profile. It cannot show users created elsewhere.'}
        </div>

        {error && <p className="form-alert is-error">{error}</p>}

        {activeMenu === 'users' && (
          <AdminTable emptyMessage="No users have signed up in Task 6 yet.">
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
