import { useEffect, useMemo, useState } from 'react';
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

export default function BackOfficePanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ userId: '', password: '' });
  const [activeMenu, setActiveMenu] = useState('users');
  const [database, setDatabase] = useState(() => readDatabase());
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => setDatabase(readDatabase());
    window.addEventListener('assignment-db-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('assignment-db-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const listRows = useMemo(
    () =>
      database.taskLists.map((list) => ({
        ...list,
        taskCount: database.tasks.filter((task) => task.listId === list.id).length,
      })),
    [database],
  );

  function handleLogin(event) {
    event.preventDefault();
    if (credentials.userId === 'admin' && credentials.password === 'admin123') {
      setIsLoggedIn(true);
      setError('');
      setDatabase(readDatabase());
      return;
    }
    setError('Invalid admin user ID or password.');
  }

  if (!isLoggedIn) {
    return (
      <article className="card backoffice-login-card">
        <div>
          <p className="card-label">Task 7 secure area</p>
          <h3>Back Office Login</h3>
          <p>
            This assignment uses static credentials. In a production app, admin
            authentication and Firebase Admin SDK access should run on a secure backend.
          </p>
          <div className="demo-credentials">
            <span>User ID: <strong>admin</strong></span>
            <span>Password: <strong>admin123</strong></span>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            User ID
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
          <button className="button" type="submit">Open panel</button>
          {error && <p className="form-alert is-error">{error}</p>}
        </form>
      </article>
    );
  }

  return (
    <article className="card backoffice-shell">
      <aside className="backoffice-sidebar">
        <div>
          <p className="card-label">Admin workspace</p>
          <h3>Back Office</h3>
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
                    ? database.taskLists.length
                    : database.tasks.length}
              </strong>
            </button>
          ))}
        </nav>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => {
            setIsLoggedIn(false);
            setCredentials({ userId: '', password: '' });
          }}
        >
          Log out
        </button>
      </aside>

      <div className="backoffice-content">
        <div className="backoffice-topbar">
          <div>
            <p className="card-label">Data grid</p>
            <h3>{menuItems.find((item) => item.id === activeMenu)?.label}</h3>
          </div>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => setDatabase(readDatabase())}
          >
            Refresh data
          </button>
        </div>

        {activeMenu === 'users' && (
          <AdminTable emptyMessage="No users have signed up in Task 6 yet.">
            <thead>
              <tr>
                <th>Email ID</th>
                <th>Password</th>
                <th>Signup Time</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {database.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.passwordDisplay ?? '••••••••'}</td>
                  <td>{formatDate(user.signupTime)}</td>
                  <td>{user.ip || 'Unavailable'}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}

        {activeMenu === 'lists' && (
          <AdminTable emptyMessage="No task lists have been created yet.">
            <thead>
              <tr>
                <th>Task List Title</th>
                <th>Create By (Email ID)</th>
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
          <AdminTable emptyMessage="No tasks have been created yet.">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Task Description</th>
                <th>Task List Title</th>
                <th>Create By (Email ID)</th>
                <th>Creation Time</th>
              </tr>
            </thead>
            <tbody>
              {database.tasks.map((task) => {
                const taskList = database.taskLists.find((list) => list.id === task.listId);
                return (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td className="description-cell">{task.description || '—'}</td>
                    <td>{taskList?.title ?? 'Deleted list'}</td>
                    <td>{task.createdByEmail}</td>
                    <td>{formatDate(task.createdAt)}</td>
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
