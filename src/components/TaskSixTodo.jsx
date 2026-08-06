import { useEffect, useMemo, useState } from 'react';
import {
  createLocalTask,
  createLocalTaskList,
  deleteLocalTask,
  getSavedSession,
  getWorkspace,
  loginDemoUser,
  mirrorCloudUser,
  registerDemoUser,
  replaceUserWorkspace,
  saveSession,
  updateLocalTask,
} from '../services/localDb.js';
import {
  deleteFirebaseDocument,
  firebaseLogin,
  firebaseSignUp,
  getFirebaseDocument,
  isFirebaseConfigured,
  queryFirebaseDocuments,
  saveFirebaseDocument,
} from '../services/firebaseRest.js';
import { useDragAutoScroll } from '../hooks/useDragAutoScroll.js';

const priorities = ['High', 'Medium', 'Low'];

const emptyTaskForm = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'Medium',
};

function makeId(prefix) {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

async function getPublicIp() {
  try {
    const response = await fetch('https://api64.ipify.org?format=json');
    if (!response.ok) return 'Unavailable';
    const data = await response.json();
    return data.ip || 'Unavailable';
  } catch {
    return 'Unavailable';
  }
}

function normaliseTask(task) {
  return {
    completed: false,
    completedAt: '',
    ...task,
  };
}

export default function TaskSixTodo() {
  const [authMode, setAuthMode] = useState('signup');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [session, setSession] = useState(() => getSavedSession());
  const [taskLists, setTaskLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newListTitle, setNewListTitle] = useState('');
  const [taskForms, setTaskForms] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [activeDropZone, setActiveDropZone] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState(emptyTaskForm);

  const user = session?.user ?? null;
  const isCloudSession = session?.mode === 'firebase';

  useDragAutoScroll(Boolean(draggedTask));

  const tasksByListAndPriority = useMemo(() => {
    return tasks.reduce((grouped, rawTask) => {
      const task = normaliseTask(rawTask);
      const key = `${task.listId}:${task.priority}`;
      grouped[key] = [...(grouped[key] ?? []), task];
      return grouped;
    }, {});
  }, [tasks]);

  useEffect(() => {
    if (!session?.user) return;
    loadWorkspace(session);
    // Restore the saved session only once when Task 6 opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWorkspace(activeSession) {
    setLoading(true);
    setError('');

    try {
      if (activeSession.mode === 'firebase') {
        const [ownedLists, ownedTasks] = await Promise.all([
          queryFirebaseDocuments(
            'taskLists',
            'createdById',
            activeSession.user.id,
            activeSession.idToken,
          ),
          queryFirebaseDocuments(
            'tasks',
            'createdById',
            activeSession.user.id,
            activeSession.idToken,
          ),
        ]);

        const safeTasks = ownedTasks.map(normaliseTask);
        setTaskLists(ownedLists);
        setTasks(safeTasks);
        replaceUserWorkspace(activeSession.user.id, ownedLists, safeTasks);
      } else {
        const workspace = getWorkspace(activeSession.user.id);
        setTaskLists(workspace.taskLists);
        setTasks(workspace.tasks.map(normaliseTask));
      }
    } catch (workspaceError) {
      setError(`Could not load the workspace: ${workspaceError.message}`);
      const workspace = getWorkspace(activeSession.user.id);
      setTaskLists(workspace.taskLists);
      setTasks(workspace.tasks.map(normaliseTask));
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const email = credentials.email.trim().toLowerCase();
      const password = credentials.password;

      if (!email || password.length < 6) {
        throw new Error('Enter a valid email and a password of at least 6 characters.');
      }

      let nextSession;

      if (isFirebaseConfigured) {
        const authResult =
          authMode === 'signup'
            ? await firebaseSignUp(email, password)
            : await firebaseLogin(email, password);

        let cloudUser;

        if (authMode === 'signup') {
          cloudUser = {
            id: authResult.localId,
            email: authResult.email,
            passwordDisplay: 'Protected by Firebase Auth',
            signupTime: new Date().toISOString(),
            ip: await getPublicIp(),
            source: 'Firebase',
          };
          await saveFirebaseDocument('users', cloudUser.id, cloudUser, authResult.idToken);
        } else {
          try {
            cloudUser = await getFirebaseDocument(
              'users',
              authResult.localId,
              authResult.idToken,
            );
          } catch {
            cloudUser = {
              id: authResult.localId,
              email: authResult.email,
              passwordDisplay: 'Protected by Firebase Auth',
              signupTime: new Date().toISOString(),
              ip: 'Unavailable',
              source: 'Firebase',
            };
            await saveFirebaseDocument('users', cloudUser.id, cloudUser, authResult.idToken);
          }
        }

        mirrorCloudUser(cloudUser);
        nextSession = {
          mode: 'firebase',
          idToken: authResult.idToken,
          user: cloudUser,
        };
      } else {
        const localUser =
          authMode === 'signup'
            ? registerDemoUser(email, password, await getPublicIp())
            : loginDemoUser(email, password);
        nextSession = { mode: 'demo', user: localUser };
      }

      setSession(nextSession);
      saveSession(nextSession);
      setCredentials({ email: '', password: '' });
      setMessage(authMode === 'signup' ? 'Account created successfully.' : 'Login successful.');
      await loadWorkspace(nextSession);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setSession(null);
    saveSession(null);
    setTaskLists([]);
    setTasks([]);
    setEditingTaskId(null);
    setEditTaskForm(emptyTaskForm);
    setMessage('You have been logged out.');
    setError('');
  }

  async function handleCreateList(event) {
    event.preventDefault();
    const title = newListTitle.trim();
    if (!title || !user) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const listId = makeId('list');
      const localList = createLocalTaskList(user, title, listId);

      if (isCloudSession) {
        await saveFirebaseDocument('taskLists', listId, localList, session.idToken);
      }

      setTaskLists((current) => [...current, localList]);
      setNewListTitle('');
      setMessage(`“${title}” was created.`);
    } catch (listError) {
      setError(listError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateTaskForm(listId, field, value) {
    setTaskForms((current) => ({
      ...current,
      [listId]: {
        ...emptyTaskForm,
        ...(current[listId] ?? {}),
        [field]: value,
      },
    }));
  }

  async function handleCreateTask(event, listId) {
    event.preventDefault();
    const form = { ...emptyTaskForm, ...(taskForms[listId] ?? {}) };

    if (!form.title.trim() || !user) {
      setError('Task title is required.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const taskId = makeId('task');
      const localTask = createLocalTask(user, listId, form, taskId);

      if (isCloudSession) {
        await saveFirebaseDocument('tasks', taskId, localTask, session.idToken);
      }

      setTasks((current) => [...current, localTask]);
      updateListTimestamp(listId, localTask.updatedAt);
      setTaskForms((current) => ({ ...current, [listId]: emptyTaskForm }));
      setMessage(`Task “${localTask.title}” was added.`);
    } catch (taskError) {
      setError(taskError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateListTimestamp(listId, updatedAt) {
    setTaskLists((current) =>
      current.map((list) => (list.id === listId ? { ...list, updatedAt } : list)),
    );
  }

  function beginEditing(task) {
    setEditingTaskId(task.id);
    setEditTaskForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || '',
      priority: task.priority || 'Medium',
    });
    setError('');
    setMessage('');
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setEditTaskForm(emptyTaskForm);
  }

  async function handleSaveEdit(event, task) {
    event.preventDefault();

    const title = editTaskForm.title.trim();
    if (!title) {
      setError('Task title is required.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const savedTask = updateLocalTask(task.id, {
        title,
        description: editTaskForm.description.trim(),
        dueDate: editTaskForm.dueDate,
        priority: editTaskForm.priority,
      });

      if (isCloudSession) {
        await saveFirebaseDocument('tasks', savedTask.id, savedTask, session.idToken);
      }

      setTasks((current) =>
        current.map((currentTask) =>
          currentTask.id === savedTask.id ? normaliseTask(savedTask) : currentTask,
        ),
      );
      updateListTimestamp(savedTask.listId, savedTask.updatedAt);
      cancelEditing();
      setMessage(`Task “${savedTask.title}” was updated.`);
    } catch (editError) {
      setError(`Task update failed: ${editError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleComplete(task) {
    const nextCompleted = !task.completed;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const savedTask = updateLocalTask(task.id, {
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : '',
      });

      if (isCloudSession) {
        await saveFirebaseDocument('tasks', savedTask.id, savedTask, session.idToken);
      }

      setTasks((current) =>
        current.map((currentTask) =>
          currentTask.id === savedTask.id ? normaliseTask(savedTask) : currentTask,
        ),
      );
      updateListTimestamp(savedTask.listId, savedTask.updatedAt);
      setMessage(
        nextCompleted
          ? `Task “${savedTask.title}” was marked complete.`
          : `Task “${savedTask.title}” was reopened.`,
      );
    } catch (completeError) {
      setError(`Could not update task status: ${completeError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask(task) {
    const shouldDelete = window.confirm(
      `Delete “${task.title}”? This action cannot be undone.`,
    );
    if (!shouldDelete) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isCloudSession) {
        await deleteFirebaseDocument('tasks', task.id, session.idToken);
      }

      const result = deleteLocalTask(task.id);
      setTasks((current) => current.filter((currentTask) => currentTask.id !== task.id));
      updateListTimestamp(task.listId, result.updatedAt);

      if (editingTaskId === task.id) cancelEditing();
      setMessage(`Task “${task.title}” was deleted.`);
    } catch (deleteError) {
      setError(`Task deletion failed: ${deleteError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function moveTask(taskId, listId, priority) {
    const original = tasks.find((task) => task.id === taskId);

    if (!original || (original.listId === listId && original.priority === priority)) {
      return;
    }

    const optimisticTask = {
      ...normaliseTask(original),
      listId,
      priority,
      updatedAt: new Date().toISOString(),
    };

    setTasks((current) =>
      current.map((task) => (task.id === taskId ? optimisticTask : task)),
    );
    setError('');
    setMessage('');

    try {
      const savedTask = updateLocalTask(taskId, { listId, priority });

      if (isCloudSession) {
        await saveFirebaseDocument('tasks', taskId, savedTask, session.idToken);
      }

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? normaliseTask(savedTask) : task,
        ),
      );
      setTaskLists((current) =>
        current.map((list) =>
          list.id === original.listId || list.id === savedTask.listId
            ? { ...list, updatedAt: savedTask.updatedAt }
            : list,
        ),
      );
      setMessage(`Task “${savedTask.title}” was moved.`);
    } catch (moveError) {
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? original : task)),
      );
      setError(`Task move failed: ${moveError.message}`);
    }
  }

  function handleDrop(event, listId, priority) {
    event.preventDefault();
    let payload = draggedTask;

    try {
      payload = JSON.parse(event.dataTransfer.getData('application/json'));
    } catch {
      // Use React state when dataTransfer is unavailable.
    }

    if (payload?.taskId) moveTask(payload.taskId, listId, priority);
    setDraggedTask(null);
    setActiveDropZone('');
  }

  if (!user) {
    return (
      <article className="card todo-app-card">
        <div className="auth-layout">
          <div className="auth-copy">
            <p className="card-label">Task 6 authentication</p>
            <h3>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h3>
            <p>
              {isFirebaseConfigured
                ? 'Firebase Authentication and Firestore are configured for this project.'
                : 'Firebase configuration is not present, so the assignment runs in safe local demo mode. Add the environment values from .env.example to enable Firebase.'}
            </p>
            <span className={`mode-pill ${isFirebaseConfigured ? 'is-cloud' : ''}`}>
              {isFirebaseConfigured ? 'Firebase cloud mode' : 'Local demo mode'}
            </span>
          </div>

          <form className="auth-form" onSubmit={handleAuth}>
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button
                className={authMode === 'signup' ? 'is-active' : ''}
                type="button"
                onClick={() => setAuthMode('signup')}
              >
                Sign up
              </button>
              <button
                className={authMode === 'login' ? 'is-active' : ''}
                type="button"
                onClick={() => setAuthMode('login')}
              >
                Log in
              </button>
            </div>

            <label>
              Email address
              <input
                type="email"
                value={credentials.email}
                onChange={(event) =>
                  setCredentials((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="name@example.com"
                autoComplete="email"
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
                placeholder="Minimum 6 characters"
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                minLength="6"
                required
              />
            </label>

            <button className="button" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Log in'}
            </button>

            {error && <p className="form-alert is-error">{error}</p>}
            {message && <p className="form-alert is-success">{message}</p>}
          </form>
        </div>
      </article>
    );
  }

  return (
    <article className="card todo-app-card">
      <div className="todo-account-bar">
        <div>
          <p className="card-label">Signed in</p>
          <strong>{user.email}</strong>
          <span>{isCloudSession ? 'Firebase' : 'Local demo'}</span>
        </div>
        <button className="button button--secondary" type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <form className="new-list-form" onSubmit={handleCreateList}>
        <label>
          New To-Do List Name
          <input
            type="text"
            value={newListTitle}
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="Example: Website launch"
          />
        </label>
        <button className="button" type="submit" disabled={loading || !newListTitle.trim()}>
          Create list
        </button>
      </form>

      {error && <p className="form-alert is-error">{error}</p>}
      {message && <p className="form-alert is-success">{message}</p>}

      {loading && taskLists.length === 0 ? (
        <div className="empty-state">Loading your task lists…</div>
      ) : taskLists.length === 0 ? (
        <div className="empty-state">Create your first To-Do List to begin.</div>
      ) : (
        <div className="todo-lists-grid">
          {taskLists.map((list) => {
            const listTasks = tasks.filter((task) => task.listId === list.id);
            const completedCount = listTasks.filter((task) => task.completed).length;
            const form = { ...emptyTaskForm, ...(taskForms[list.id] ?? {}) };

            return (
              <section className="todo-list-panel" key={list.id}>
                <header>
                  <div>
                    <h3>{list.title}</h3>
                    <span>
                      {listTasks.length} task{listTasks.length === 1 ? '' : 's'} ·{' '}
                      {completedCount} completed
                    </span>
                  </div>
                  <small>Updated {new Date(list.updatedAt).toLocaleString()}</small>
                </header>

                <form
                  className="task-create-form"
                  onSubmit={(event) => handleCreateTask(event, list.id)}
                >
                  <input
                    aria-label={`Task title for ${list.title}`}
                    type="text"
                    value={form.title}
                    onChange={(event) => updateTaskForm(list.id, 'title', event.target.value)}
                    placeholder="Task title"
                    required
                  />
                  <textarea
                    aria-label={`Task description for ${list.title}`}
                    value={form.description}
                    onChange={(event) =>
                      updateTaskForm(list.id, 'description', event.target.value)
                    }
                    placeholder="Task description"
                    rows="2"
                  />
                  <div className="task-form-row">
                    <label>
                      Due date
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(event) =>
                          updateTaskForm(list.id, 'dueDate', event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Priority
                      <select
                        value={form.priority}
                        onChange={(event) =>
                          updateTaskForm(list.id, 'priority', event.target.value)
                        }
                      >
                        {priorities.map((priority) => (
                          <option key={priority}>{priority}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="button" type="submit" disabled={loading}>
                    Add task
                  </button>
                </form>

                <div className="priority-board">
                  {priorities.map((priority) => {
                    const dropZoneId = `${list.id}:${priority}`;
                    const laneTasks = tasksByListAndPriority[dropZoneId] ?? [];

                    return (
                      <div
                        className={`priority-lane priority-lane--${priority.toLowerCase()} ${
                          activeDropZone === dropZoneId ? 'is-drag-over' : ''
                        }`}
                        key={priority}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          setActiveDropZone(dropZoneId);
                        }}
                        onDragLeave={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) {
                            setActiveDropZone('');
                          }
                        }}
                        onDrop={(event) => handleDrop(event, list.id, priority)}
                      >
                        <div className="priority-lane__heading">
                          <strong>{priority}</strong>
                          <span>{laneTasks.length}</span>
                        </div>

                        <div className="priority-lane__tasks">
                          {laneTasks.length === 0 ? (
                            <p>Drop tasks here</p>
                          ) : (
                            laneTasks.map((task) => {
                              const isEditing = editingTaskId === task.id;

                              return (
                                <article
                                  className={`todo-task-card ${
                                    task.completed ? 'is-completed' : ''
                                  } ${
                                    draggedTask?.taskId === task.id ? 'is-dragging' : ''
                                  }`}
                                  draggable={!isEditing}
                                  key={task.id}
                                  onDragStart={(event) => {
                                    if (isEditing) {
                                      event.preventDefault();
                                      return;
                                    }
                                    const payload = { taskId: task.id };
                                    event.dataTransfer.setData(
                                      'application/json',
                                      JSON.stringify(payload),
                                    );
                                    event.dataTransfer.effectAllowed = 'move';
                                    setDraggedTask(payload);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedTask(null);
                                    setActiveDropZone('');
                                  }}
                                >
                                  {isEditing ? (
                                    <form
                                      className="task-edit-form"
                                      onSubmit={(event) => handleSaveEdit(event, task)}
                                    >
                                      <label>
                                        Task title
                                        <input
                                          type="text"
                                          value={editTaskForm.title}
                                          onChange={(event) =>
                                            setEditTaskForm((current) => ({
                                              ...current,
                                              title: event.target.value,
                                            }))
                                          }
                                          required
                                        />
                                      </label>

                                      <label>
                                        Description
                                        <textarea
                                          rows="3"
                                          value={editTaskForm.description}
                                          onChange={(event) =>
                                            setEditTaskForm((current) => ({
                                              ...current,
                                              description: event.target.value,
                                            }))
                                          }
                                        />
                                      </label>

                                      <div className="task-edit-form__row">
                                        <label>
                                          Due date
                                          <input
                                            type="date"
                                            value={editTaskForm.dueDate}
                                            onChange={(event) =>
                                              setEditTaskForm((current) => ({
                                                ...current,
                                                dueDate: event.target.value,
                                              }))
                                            }
                                          />
                                        </label>

                                        <label>
                                          Priority
                                          <select
                                            value={editTaskForm.priority}
                                            onChange={(event) =>
                                              setEditTaskForm((current) => ({
                                                ...current,
                                                priority: event.target.value,
                                              }))
                                            }
                                          >
                                            {priorities.map((option) => (
                                              <option key={option}>{option}</option>
                                            ))}
                                          </select>
                                        </label>
                                      </div>

                                      <div className="task-edit-form__actions">
                                        <button
                                          className="task-action-button task-action-button--save"
                                          type="submit"
                                          disabled={loading}
                                        >
                                          Save changes
                                        </button>
                                        <button
                                          className="task-action-button"
                                          type="button"
                                          onClick={cancelEditing}
                                          disabled={loading}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <>
                                      <div className="todo-task-card__topline">
                                        <span className="drag-handle" aria-hidden="true">
                                          ⋮⋮
                                        </span>
                                        <strong>{task.title}</strong>
                                        <span
                                          className={`task-status-badge ${
                                            task.completed ? 'is-complete' : ''
                                          }`}
                                        >
                                          {task.completed ? 'Completed' : 'Open'}
                                        </span>
                                      </div>

                                      {task.description && <p>{task.description}</p>}

                                      <div className="todo-task-card__meta">
                                        <span>
                                          {task.dueDate ? `Due ${task.dueDate}` : 'No due date'}
                                        </span>
                                        <span>{task.completed ? 'Done' : 'Drag to move'}</span>
                                      </div>

                                      <div className="todo-task-card__actions">
                                        <button
                                          className={`task-action-button ${
                                            task.completed
                                              ? 'task-action-button--reopen'
                                              : 'task-action-button--complete'
                                          }`}
                                          type="button"
                                          onClick={() => handleToggleComplete(task)}
                                          disabled={loading}
                                        >
                                          {task.completed ? 'Reopen' : 'Complete'}
                                        </button>

                                        <button
                                          className="task-action-button task-action-button--edit"
                                          type="button"
                                          onClick={() => beginEditing(task)}
                                          disabled={loading}
                                        >
                                          Edit
                                        </button>

                                        <button
                                          className="task-action-button task-action-button--delete"
                                          type="button"
                                          onClick={() => handleDeleteTask(task)}
                                          disabled={loading}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </article>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}
