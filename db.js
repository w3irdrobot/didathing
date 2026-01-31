// IndexedDB wrapper for Did a Thing - Cycle-based model

const DB_NAME = 'DidAThingDB';
const DB_VERSION = 1;
const TASK_STORE = 'tasks';
const PHASE_STORE = 'phases';
const TRANSITION_STORE = 'transitions';

let db = null;

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(new Error(`Failed to open database: ${event.target.error?.message || 'Unknown error'}`));
    };

    request.onblocked = () => {
      console.warn('Database upgrade blocked - close other tabs');
      reject(new Error('Database blocked - please close other tabs and reload'));
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      
      db.onerror = (event) => {
        console.error('Database error:', event.target.error);
      };
      
      console.log('Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('Creating database schema...');

      // Tasks store
      const taskStore = db.createObjectStore(TASK_STORE, { 
        keyPath: 'id', 
        autoIncrement: true 
      });
      taskStore.createIndex('title', 'title', { unique: false });
      taskStore.createIndex('createdAt', 'createdAt', { unique: false });
      taskStore.createIndex('updatedAt', 'updatedAt', { unique: false });

      // Phases store
      const phaseStore = db.createObjectStore(PHASE_STORE, {
        keyPath: 'id',
        autoIncrement: true
      });
      phaseStore.createIndex('taskId', 'taskId', { unique: false });
      phaseStore.createIndex('taskId_index', ['taskId', 'index'], { unique: true });

      // Transitions store
      const transitionStore = db.createObjectStore(TRANSITION_STORE, {
        keyPath: 'id',
        autoIncrement: true
      });
      transitionStore.createIndex('taskId', 'taskId', { unique: false });
      transitionStore.createIndex('taskId_transitionedAt', ['taskId', 'transitionedAt'], { unique: false });

      console.log('Database schema created');
    };
  });
}

// Task operations
export async function createTask(title, currentPhaseIndex = 0, currentPhaseSince = null) {
  const now = Date.now();
  const transaction = db.transaction([TASK_STORE], 'readwrite');
  const store = transaction.objectStore(TASK_STORE);
  
  const task = {
    title: title.trim(),
    currentPhaseIndex,
    currentPhaseSince: currentPhaseSince || now,
    createdAt: now,
    updatedAt: now
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
  // Delete task and all its phases and transitions
  const transaction = db.transaction([TASK_STORE, PHASE_STORE, TRANSITION_STORE], 'readwrite');
  const taskStore = transaction.objectStore(TASK_STORE);
  const phaseStore = transaction.objectStore(PHASE_STORE);
  const transitionStore = transaction.objectStore(TRANSITION_STORE);

  return new Promise((resolve, reject) => {
    // Delete all phases
    const phaseIndex = phaseStore.index('taskId');
    const phaseRequest = phaseIndex.getAllKeys(id);
    phaseRequest.onsuccess = () => {
      phaseRequest.result.forEach(key => phaseStore.delete(key));
    };

    // Delete all transitions
    const transitionIndex = transitionStore.index('taskId');
    const transitionRequest = transitionIndex.getAllKeys(id);
    transitionRequest.onsuccess = () => {
      transitionRequest.result.forEach(key => transitionStore.delete(key));
      
      // Finally delete the task
      const taskRequest = taskStore.delete(id);
      taskRequest.onsuccess = () => resolve();
      taskRequest.onerror = () => reject(new Error('Failed to delete task'));
    };

    phaseRequest.onerror = () => reject(new Error('Failed to delete phases'));
    transitionRequest.onerror = () => reject(new Error('Failed to delete transitions'));
  });
}

// Phase operations
export async function createPhase(taskId, index, name, durationDays = null) {
  const now = Date.now();
  const transaction = db.transaction([PHASE_STORE], 'readwrite');
  const store = transaction.objectStore(PHASE_STORE);
  
  const phase = {
    taskId,
    index,
    name: name.trim(),
    durationDays,
    createdAt: now,
    updatedAt: now
  };

  return new Promise((resolve, reject) => {
    const request = store.add(phase);
    request.onsuccess = () => resolve({ ...phase, id: request.result });
    request.onerror = () => reject(new Error('Failed to create phase'));
  });
}

export async function getPhasesForTask(taskId) {
  const transaction = db.transaction([PHASE_STORE], 'readonly');
  const store = transaction.objectStore(PHASE_STORE);
  const index = store.index('taskId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(taskId);
    request.onsuccess = () => {
      const phases = request.result;
      phases.sort((a, b) => a.index - b.index);
      resolve(phases);
    };
    request.onerror = () => reject(new Error('Failed to get phases'));
  });
}

export async function updatePhase(id, updates) {
  const transaction = db.transaction([PHASE_STORE], 'readwrite');
  const store = transaction.objectStore(PHASE_STORE);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const phase = getRequest.result;
      if (!phase) {
        reject(new Error('Phase not found'));
        return;
      }

      const updatedPhase = {
        ...phase,
        ...updates,
        updatedAt: Date.now()
      };

      const putRequest = store.put(updatedPhase);
      putRequest.onsuccess = () => resolve(updatedPhase);
      putRequest.onerror = () => reject(new Error('Failed to update phase'));
    };
    getRequest.onerror = () => reject(new Error('Failed to get phase'));
  });
}

export async function deletePhase(id) {
  const transaction = db.transaction([PHASE_STORE], 'readwrite');
  const store = transaction.objectStore(PHASE_STORE);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete phase'));
  });
}

// Transition operations
export async function createTransition(taskId, fromPhaseIndex, toPhaseIndex, transitionedAt = Date.now()) {
  const transaction = db.transaction([TRANSITION_STORE], 'readwrite');
  const store = transaction.objectStore(TRANSITION_STORE);
  
  const transition = {
    taskId,
    fromPhaseIndex,
    toPhaseIndex,
    transitionedAt
  };

  return new Promise((resolve, reject) => {
    const request = store.add(transition);
    request.onsuccess = () => resolve({ ...transition, id: request.result });
    request.onerror = () => reject(new Error('Failed to create transition'));
  });
}

export async function getTransitionsForTask(taskId) {
  const transaction = db.transaction([TRANSITION_STORE], 'readonly');
  const store = transaction.objectStore(TRANSITION_STORE);
  const index = store.index('taskId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(taskId);
    request.onsuccess = () => {
      const transitions = request.result;
      transitions.sort((a, b) => b.transitionedAt - a.transitionedAt);
      resolve(transitions);
    };
    request.onerror = () => reject(new Error('Failed to get transitions'));
  });
}

export async function deleteTransition(id) {
  const transaction = db.transaction([TRANSITION_STORE], 'readwrite');
  const store = transaction.objectStore(TRANSITION_STORE);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete transition'));
  });
}

// Advance to next phase
export async function advancePhase(taskId) {
  const task = await getTask(taskId);
  const phases = await getPhasesForTask(taskId);
  
  if (!task || phases.length === 0) {
    throw new Error('Task or phases not found');
  }

  const currentIndex = task.currentPhaseIndex;
  const nextIndex = (currentIndex + 1) % phases.length;
  const now = Date.now();

  // Create transition
  await createTransition(taskId, currentIndex, nextIndex, now);

  // Update task
  await updateTask(taskId, {
    currentPhaseIndex: nextIndex,
    currentPhaseSince: now
  });

  return { currentIndex: nextIndex, phases };
}

// Get all data for export
export async function getAllData() {
  const tasks = await getAllTasks();
  const allPhases = [];
  const allTransitions = [];

  for (const task of tasks) {
    const phases = await getPhasesForTask(task.id);
    const transitions = await getTransitionsForTask(task.id);
    allPhases.push(...phases);
    allTransitions.push(...transitions);
  }

  return {
    tasks,
    phases: allPhases,
    transitions: allTransitions
  };
}

// Wipe all data
export async function wipeAllData() {
  return new Promise((resolve, reject) => {
    // Close the database connection first
    if (db) {
      db.close();
      db = null;
    }

    // Delete the entire database
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error('Failed to delete database'));
    };
    
    request.onblocked = () => {
      console.warn('Database deletion blocked');
      reject(new Error('Database deletion blocked - close all tabs'));
    };
  });
}

// Get tasks with their phase info for display
export async function getTasksWithPhaseInfo() {
  const tasks = await getAllTasks();
  
  const tasksWithInfo = await Promise.all(
    tasks.map(async (task) => {
      const phases = await getPhasesForTask(task.id);
      const transitions = await getTransitionsForTask(task.id);
      const currentPhase = phases.find(p => p.index === task.currentPhaseIndex);
      
      return {
        ...task,
        phases,
        phaseCount: phases.length,
        currentPhase,
        lastTransition: transitions.length > 0 ? transitions[0] : null,
        hasTransitions: transitions.length > 0
      };
    })
  );
  
  return tasksWithInfo;
}

// Check if a task title already exists (case-insensitive)
export async function taskTitleExists(title, excludeId = null) {
  const tasks = await getAllTasks();
  const normalizedTitle = title.trim().toLowerCase();
  return tasks.some(task => 
    task.title.toLowerCase() === normalizedTitle && task.id !== excludeId
  );
}
