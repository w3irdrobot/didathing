import * as db from './db.js';
import { formatTimeSince, formatDateTime, getUpdateInterval } from './time.js';

// State
let currentRoute = 'list';
let sortBy = localStorage.getItem('sortBy') || 'recent';
let updateTimers = [];

// Initialize
async function init() {
  try {
    await db.initDB();
    initTheme();
    initRouter();
    initServiceWorker();
  } catch (error) {
    console.error('Initialization error:', error);
    alert('Failed to initialize app. Please reload.');
  }
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.setAttribute('data-theme', savedTheme);
  }

  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  let newTheme;

  if (currentTheme === 'dark') {
    newTheme = 'light';
  } else if (currentTheme === 'light') {
    newTheme = null; // Return to system preference
  } else {
    newTheme = 'dark';
  }

  if (newTheme) {
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  } else {
    document.body.removeAttribute('data-theme');
    localStorage.removeItem('theme');
  }
}

// Router
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || 'list';
  const [route, ...params] = hash.split('/');
  
  clearUpdateTimers();
  
  switch (route) {
    case 'list':
      renderListScreen();
      break;
    case 'add':
      renderAddScreen();
      break;
    case 'edit':
      renderEditScreen(parseInt(params[0]));
      break;
    default:
      window.location.hash = 'list';
  }
}

function navigate(path) {
  window.location.hash = path;
}

// Update timers management
function clearUpdateTimers() {
  updateTimers.forEach(timer => clearInterval(timer));
  updateTimers = [];
}

function startUpdateTimer(element, timestamp) {
  const update = () => {
    element.textContent = formatTimeSince(timestamp);
    const isRecent = Date.now() - timestamp < 3600000; // 1 hour
    element.classList.toggle('recent', isRecent);
  };
  
  update();
  const interval = setInterval(update, getUpdateInterval(timestamp));
  updateTimers.push(interval);
}

// List Screen
async function renderListScreen() {
  const app = document.getElementById('app');
  
  try {
    const tasks = await db.getTasksWithCompletions();
    
    // Sort tasks
    const sortedTasks = sortTasks(tasks, sortBy);
    
    app.innerHTML = `
      <div class="screen">
        <div class="list-header">
          <h2>Things</h2>
          <button class="sort-toggle" id="sort-toggle">
            Sort: ${sortBy === 'recent' ? 'Recent' : 'A-Z'}
          </button>
        </div>
        
        ${sortedTasks.length === 0 ? `
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <p>No things yet. Add one to get started!</p>
          </div>
        ` : `
          <div class="task-list">
            ${sortedTasks.map(task => `
              <div class="task-item" data-task-id="${task.id}">
                <div class="task-header">
                  <a href="#edit/${task.id}" class="task-title">${escapeHtml(task.title)}</a>
                </div>
                <div class="task-time ${task.lastCompletion ? '' : 'never'}" data-timestamp="${task.lastCompletion?.completedAt || task.createdAt}">
                  ${task.lastCompletion ? '' : 'Never • '}
                  ${task.lastCompletion ? 'Last done ' : 'Created '}
                  <span class="time-display"></span>
                </div>
                <div class="task-actions">
                  <button class="btn btn-primary did-it-btn" data-task-id="${task.id}">
                    Did it now
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
        
        <button class="fab" id="add-fab" aria-label="Add new thing">+</button>
      </div>
    `;

    // Attach event listeners
    document.getElementById('sort-toggle')?.addEventListener('click', toggleSort);
    document.getElementById('add-fab')?.addEventListener('click', () => navigate('add'));
    
    document.querySelectorAll('.did-it-btn').forEach(btn => {
      btn.addEventListener('click', handleDidIt);
    });

    // Start update timers for time displays
    document.querySelectorAll('.task-time').forEach(el => {
      const timestamp = parseInt(el.dataset.timestamp);
      const display = el.querySelector('.time-display');
      if (display && timestamp) {
        startUpdateTimer(display, timestamp);
      }
    });

  } catch (error) {
    console.error('Error rendering list:', error);
    app.innerHTML = `<div class="error-message">Failed to load tasks. Please reload.</div>`;
  }
}

function sortTasks(tasks, sortBy) {
  if (sortBy === 'alpha') {
    return [...tasks].sort((a, b) => a.title.localeCompare(b.title));
  }
  
  // Sort by recent (least recently done first, never at the top)
  return [...tasks].sort((a, b) => {
    const aTime = a.lastCompletion?.completedAt || 0;
    const bTime = b.lastCompletion?.completedAt || 0;
    return aTime - bTime;
  });
}

function toggleSort() {
  sortBy = sortBy === 'recent' ? 'alpha' : 'recent';
  localStorage.setItem('sortBy', sortBy);
  renderListScreen();
}

async function handleDidIt(e) {
  const taskId = parseInt(e.target.dataset.taskId);
  
  try {
    await db.createCompletion(taskId);
    renderListScreen();
  } catch (error) {
    console.error('Error marking completion:', error);
    alert('Failed to mark as done. Please try again.');
  }
}

// Add Screen
function renderAddScreen() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="screen">
      <a href="#list" class="back-link">← Back</a>
      
      <div class="form-container">
        <h2>Add a Thing</h2>
        
        <form id="add-form">
          <div class="form-group">
            <label for="task-title">What's the thing?</label>
            <input 
              type="text" 
              id="task-title" 
              name="title" 
              placeholder="e.g., Water the plants"
              required
              autofocus
            />
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Thing</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('add-form').addEventListener('submit', handleAddSubmit);
  document.getElementById('cancel-btn').addEventListener('click', () => navigate('list'));
}

async function handleAddSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const title = form.title.value.trim();
  
  if (!title) {
    alert('Please enter a thing name');
    return;
  }

  try {
    // Check for duplicates
    const exists = await db.taskTitleExists(title);
    if (exists) {
      const confirm = window.confirm(`"${title}" already exists. Add anyway?`);
      if (!confirm) return;
    }

    await db.createTask(title);
    navigate('list');
  } catch (error) {
    console.error('Error creating task:', error);
    alert('Failed to add task. Please try again.');
  }
}

// Edit Screen
async function renderEditScreen(taskId) {
  const app = document.getElementById('app');
  
  try {
    const task = await db.getTask(taskId);
    if (!task) {
      navigate('list');
      return;
    }

    const completions = await db.getCompletionsForTask(taskId);
    
    app.innerHTML = `
      <div class="screen">
        <a href="#list" class="back-link">← Back</a>
        
        <div class="form-container">
          <h2>Edit Thing</h2>
          
          <form id="edit-form">
            <div class="form-group">
              <label for="task-title">Thing name</label>
              <input 
                type="text" 
                id="task-title" 
                name="title" 
                value="${escapeHtml(task.title)}"
                required
                autofocus
              />
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>

          ${completions.length > 0 ? `
            <div class="completion-list">
              <h3>Completion History (${completions.length})</h3>
              
              <div class="form-group">
                <button type="button" class="btn btn-secondary btn-small" id="add-completion-btn">
                  Add completion...
                </button>
              </div>

              <div id="add-completion-form" style="display: none; margin-bottom: 1rem;">
                <div class="form-group">
                  <label for="completion-date">Date and time</label>
                  <input type="datetime-local" id="completion-date" />
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button type="button" class="btn btn-primary btn-small" id="save-completion-btn">
                    Add
                  </button>
                  <button type="button" class="btn btn-secondary btn-small" id="cancel-completion-btn">
                    Cancel
                  </button>
                </div>
              </div>
              
              ${completions.map(completion => `
                <div class="completion-item">
                  <span class="completion-time">${formatDateTime(completion.completedAt)}</span>
                  <button 
                    class="btn btn-danger btn-small delete-completion-btn" 
                    data-completion-id="${completion.id}"
                  >
                    Delete
                  </button>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="delete-section">
            <button type="button" class="btn btn-danger" id="delete-task-btn">
              Delete Thing
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('edit-form').addEventListener('submit', (e) => handleEditSubmit(e, taskId, task.title));
    document.getElementById('cancel-btn').addEventListener('click', () => navigate('list'));
    document.getElementById('delete-task-btn').addEventListener('click', () => handleDeleteTask(taskId));
    
    document.querySelectorAll('.delete-completion-btn').forEach(btn => {
      btn.addEventListener('click', (e) => handleDeleteCompletion(e, taskId));
    });

    // Add completion functionality
    const addCompletionBtn = document.getElementById('add-completion-btn');
    const addCompletionForm = document.getElementById('add-completion-form');
    const saveCompletionBtn = document.getElementById('save-completion-btn');
    const cancelCompletionBtn = document.getElementById('cancel-completion-btn');
    const completionDateInput = document.getElementById('completion-date');

    if (addCompletionBtn) {
      addCompletionBtn.addEventListener('click', () => {
        addCompletionForm.style.display = 'block';
        addCompletionBtn.style.display = 'none';
        
        // Set to current time
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        completionDateInput.value = now.toISOString().slice(0, 16);
      });

      cancelCompletionBtn.addEventListener('click', () => {
        addCompletionForm.style.display = 'none';
        addCompletionBtn.style.display = 'inline-block';
      });

      saveCompletionBtn.addEventListener('click', async () => {
        const dateValue = completionDateInput.value;
        if (!dateValue) {
          alert('Please select a date and time');
          return;
        }

        try {
          const timestamp = new Date(dateValue).getTime();
          await db.createCompletion(taskId, timestamp);
          renderEditScreen(taskId);
        } catch (error) {
          console.error('Error adding completion:', error);
          alert('Failed to add completion. Please try again.');
        }
      });
    }

  } catch (error) {
    console.error('Error rendering edit screen:', error);
    app.innerHTML = `<div class="error-message">Failed to load task. <a href="#list">Go back</a></div>`;
  }
}

async function handleEditSubmit(e, taskId, originalTitle) {
  e.preventDefault();
  
  const form = e.target;
  const title = form.title.value.trim();
  
  if (!title) {
    alert('Please enter a thing name');
    return;
  }

  try {
    // Check for duplicates if title changed
    if (title.toLowerCase() !== originalTitle.toLowerCase()) {
      const exists = await db.taskTitleExists(title, taskId);
      if (exists) {
        alert(`"${title}" already exists. Please use a different name.`);
        return;
      }
    }

    await db.updateTask(taskId, { title });
    navigate('list');
  } catch (error) {
    console.error('Error updating task:', error);
    alert('Failed to update task. Please try again.');
  }
}

async function handleDeleteTask(taskId) {
  const confirm = window.confirm('Are you sure you want to delete this thing? This cannot be undone.');
  if (!confirm) return;

  try {
    await db.deleteTask(taskId);
    navigate('list');
  } catch (error) {
    console.error('Error deleting task:', error);
    alert('Failed to delete task. Please try again.');
  }
}

async function handleDeleteCompletion(e, taskId) {
  const completionId = parseInt(e.target.dataset.completionId);
  
  const confirm = window.confirm('Delete this completion?');
  if (!confirm) return;

  try {
    await db.deleteCompletion(completionId);
    renderEditScreen(taskId);
  } catch (error) {
    console.error('Error deleting completion:', error);
    alert('Failed to delete completion. Please try again.');
  }
}

// Service Worker
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  }
}

// Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start app
init();
