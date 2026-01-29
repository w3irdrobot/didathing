// IndexedDB wrapper for Did a Thing

const DB_NAME = 'DidAThingDB';
const DB_VERSION = 1;
const TASK_STORE = 'tasks';
const COMPLETION_STORE = 'completions';

let db = null;

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open database'));

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Tasks store
      if (!db.objectStoreNames.contains(TASK_STORE)) {
        const taskStore = db.createObjectStore(TASK_STORE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        taskStore.createIndex('title', 'title', { unique: false });
        taskStore.createIndex('createdAt', 'createdAt', { unique: false });
        taskStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Completions store
      if (!db.objectStoreNames.contains(COMPLETION_STORE)) {
        const completionStore = db.createObjectStore(COMPLETION_STORE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        completionStore.createIndex('taskId', 'taskId', { unique: false });
        completionStore.createIndex('completedAt', 'completedAt', { unique: false });
        completionStore.createIndex('taskId_completedAt', ['taskId', 'completedAt'], { unique: false });
      }
    };
  });
}

// Task operations
export async function createTask(title) {
  const transaction = db.transaction([TASK_STORE], 'readwrite');
  const store = transaction.objectStore(TASK_STORE);
  
  const task = {
    title: title.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const request = store.add(task);
    request.onsuccess = () => resolve({ ...task, id: request.result });
    request.onerror = () => reject(new Error('Failed to create task'));
  });
}

export async function getAllTasks() {
  const transaction = db.transaction([TASK_STORE], 'readonly');
  const store = transaction.objectStore(TASK_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get tasks'));
  });
}

export async function getTask(id) {
  const transaction = db.transaction([TASK_STORE], 'readonly');
  const store = transaction.objectStore(TASK_STORE);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get task'));
  });
}

export async function updateTask(id, updates) {
  const task = await getTask(id);
  if (!task) throw new Error('Task not found');

  const updatedTask = {
    ...task,
    ...updates,
    updatedAt: Date.now()
  };

  const transaction = db.transaction([TASK_STORE], 'readwrite');
  const store = transaction.objectStore(TASK_STORE);

  return new Promise((resolve, reject) => {
    const request = store.put(updatedTask);
    request.onsuccess = () => resolve(updatedTask);
    request.onerror = () => reject(new Error('Failed to update task'));
  });
}

export async function deleteTask(id) {
  // Delete task and all its completions
  const transaction = db.transaction([TASK_STORE, COMPLETION_STORE], 'readwrite');
  const taskStore = transaction.objectStore(TASK_STORE);
  const completionStore = transaction.objectStore(COMPLETION_STORE);
  const completionIndex = completionStore.index('taskId');

  return new Promise((resolve, reject) => {
    // First delete all completions
    const completionsRequest = completionIndex.getAllKeys(id);
    completionsRequest.onsuccess = () => {
      const completionKeys = completionsRequest.result;
      completionKeys.forEach(key => completionStore.delete(key));
      
      // Then delete the task
      const taskRequest = taskStore.delete(id);
      taskRequest.onsuccess = () => resolve();
      taskRequest.onerror = () => reject(new Error('Failed to delete task'));
    };
    completionsRequest.onerror = () => reject(new Error('Failed to delete completions'));
  });
}

// Completion operations
export async function createCompletion(taskId, completedAt = Date.now()) {
  const transaction = db.transaction([COMPLETION_STORE], 'readwrite');
  const store = transaction.objectStore(COMPLETION_STORE);
  
  const completion = {
    taskId,
    completedAt
  };

  return new Promise((resolve, reject) => {
    const request = store.add(completion);
    request.onsuccess = () => resolve({ ...completion, id: request.result });
    request.onerror = () => reject(new Error('Failed to create completion'));
  });
}

export async function getCompletionsForTask(taskId) {
  const transaction = db.transaction([COMPLETION_STORE], 'readonly');
  const store = transaction.objectStore(COMPLETION_STORE);
  const index = store.index('taskId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(taskId);
    request.onsuccess = () => {
      const completions = request.result;
      // Sort by completedAt descending (newest first)
      completions.sort((a, b) => b.completedAt - a.completedAt);
      resolve(completions);
    };
    request.onerror = () => reject(new Error('Failed to get completions'));
  });
}

export async function getLastCompletionForTask(taskId) {
  const completions = await getCompletionsForTask(taskId);
  return completions.length > 0 ? completions[0] : null;
}

export async function deleteCompletion(id) {
  const transaction = db.transaction([COMPLETION_STORE], 'readwrite');
  const store = transaction.objectStore(COMPLETION_STORE);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete completion'));
  });
}

// Get all tasks with their last completion
export async function getTasksWithCompletions() {
  const tasks = await getAllTasks();
  const tasksWithCompletions = await Promise.all(
    tasks.map(async (task) => {
      const lastCompletion = await getLastCompletionForTask(task.id);
      return {
        ...task,
        lastCompletion
      };
    })
  );
  return tasksWithCompletions;
}

// Check if a task title already exists (case-insensitive)
export async function taskTitleExists(title, excludeId = null) {
  const tasks = await getAllTasks();
  const normalizedTitle = title.trim().toLowerCase();
  return tasks.some(task => 
    task.title.toLowerCase() === normalizedTitle && task.id !== excludeId
  );
}
