const DB_KEY = 'react-programming-assignment-db-v1';
const SESSION_KEY = 'react-programming-assignment-session-v1';

const emptyDatabase = {
  users: [],
  taskLists: [],
  tasks: [],
};

function makeId(prefix) {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

export function readDatabase() {
  try {
    const saved = localStorage.getItem(DB_KEY);
    if (!saved) return structuredClone(emptyDatabase);

    const parsed = JSON.parse(saved);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      taskLists: Array.isArray(parsed.taskLists) ? parsed.taskLists : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    return structuredClone(emptyDatabase);
  }
}

export function writeDatabase(database) {
  localStorage.setItem(DB_KEY, JSON.stringify(database));
  window.dispatchEvent(new Event('assignment-db-change'));
  return database;
}

export function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function registerDemoUser(email, password, ip = 'Unavailable') {
  const normalizedEmail = email.trim().toLowerCase();
  const database = readDatabase();

  if (database.users.some((user) => user.email === normalizedEmail)) {
    throw new Error('An account already exists for this email. Please log in.');
  }

  const user = {
    id: makeId('user'),
    email: normalizedEmail,
    demoPassword: password,
    passwordDisplay: '••••••••',
    signupTime: new Date().toISOString(),
    ip,
    source: 'Local demo',
  };

  database.users.push(user);
  writeDatabase(database);
  return user;
}

export function loginDemoUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = readDatabase().users.find(
    (record) => record.email === normalizedEmail && record.demoPassword === password,
  );

  if (!user) {
    throw new Error('Email or password is incorrect.');
  }

  return user;
}

export function mirrorCloudUser(user) {
  const database = readDatabase();
  const index = database.users.findIndex((record) => record.id === user.id);
  const safeUser = {
    ...user,
    demoPassword: undefined,
    passwordDisplay: 'Protected by Firebase Auth',
    source: 'Firebase',
  };

  if (index >= 0) database.users[index] = { ...database.users[index], ...safeUser };
  else database.users.push(safeUser);

  writeDatabase(database);
  return safeUser;
}

export function getWorkspace(userId) {
  const database = readDatabase();
  return {
    taskLists: database.taskLists.filter((list) => list.createdById === userId),
    tasks: database.tasks
      .filter((task) => task.createdById === userId)
      .map((task) => ({
        completed: false,
        completedAt: '',
        ...task,
      })),
  };
}

export function createLocalTaskList(user, title, providedId) {
  const database = readDatabase();
  const now = new Date().toISOString();
  const taskList = {
    id: providedId ?? makeId('list'),
    title: title.trim(),
    createdById: user.id,
    createdByEmail: user.email,
    createdAt: now,
    updatedAt: now,
  };

  database.taskLists.push(taskList);
  writeDatabase(database);
  return taskList;
}

export function createLocalTask(user, listId, details, providedId) {
  const database = readDatabase();
  const now = new Date().toISOString();
  const task = {
    id: providedId ?? makeId('task'),
    listId,
    title: details.title.trim(),
    description: details.description.trim(),
    dueDate: details.dueDate || '',
    priority: details.priority || 'Medium',
    completed: false,
    completedAt: '',
    createdById: user.id,
    createdByEmail: user.email,
    createdAt: now,
    updatedAt: now,
  };

  database.tasks.push(task);
  database.taskLists = database.taskLists.map((list) =>
    list.id === listId ? { ...list, updatedAt: now } : list,
  );
  writeDatabase(database);
  return task;
}

export function updateLocalTask(taskId, updates) {
  const database = readDatabase();
  const now = new Date().toISOString();
  let updatedTask = null;
  let previousListId = null;

  database.tasks = database.tasks.map((task) => {
    if (task.id !== taskId) return task;
    previousListId = task.listId;
    updatedTask = {
      completed: false,
      completedAt: '',
      ...task,
      ...updates,
      updatedAt: now,
    };
    return updatedTask;
  });

  if (!updatedTask) throw new Error('Task could not be found.');

  database.taskLists = database.taskLists.map((list) =>
    list.id === updatedTask.listId || list.id === previousListId
      ? { ...list, updatedAt: now }
      : list,
  );
  writeDatabase(database);
  return updatedTask;
}

export function deleteLocalTask(taskId) {
  const database = readDatabase();
  const taskToDelete = database.tasks.find((task) => task.id === taskId);

  if (!taskToDelete) throw new Error('Task could not be found.');

  const now = new Date().toISOString();
  database.tasks = database.tasks.filter((task) => task.id !== taskId);
  database.taskLists = database.taskLists.map((list) =>
    list.id === taskToDelete.listId ? { ...list, updatedAt: now } : list,
  );
  writeDatabase(database);

  return {
    deletedTask: taskToDelete,
    updatedAt: now,
  };
}

export function replaceUserWorkspace(userId, taskLists, tasks) {
  const database = readDatabase();
  database.taskLists = [
    ...database.taskLists.filter((list) => list.createdById !== userId),
    ...taskLists,
  ];
  database.tasks = [
    ...database.tasks.filter((task) => task.createdById !== userId),
    ...tasks.map((task) => ({
      completed: false,
      completedAt: '',
      ...task,
    })),
  ];
  writeDatabase(database);
}
