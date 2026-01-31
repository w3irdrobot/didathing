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

// Theme management - Auto mode only (follows system preference)
function initTheme() {
  // Always use system preference (prefers-color-scheme)
  // No manual override needed
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
    case 'advanced':
      renderAdvancedScreen();
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
    const tasks = await db.getTasksWithPhaseInfo();
    
    // Sort tasks
    const sortedTasks = sortTasks(tasks, sortBy);
    
    app.innerHTML = `
      <div class="screen">
        <div class="list-header">
          <h2>Things</h2>
          <div style="display: flex; gap: 0.5rem;">
            <button class="sort-toggle" id="sort-toggle">
              Sort: ${sortBy === 'recent' ? 'Recent' : 'A-Z'}
            </button>
            <a href="#advanced" class="btn btn-secondary btn-small">⚙</a>
          </div>
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
            ${sortedTasks.map(task => renderTaskItem(task)).join('')}
          </div>
        `}
        
        <button class="fab" id="add-fab" aria-label="Add new thing">+</button>
      </div>
    `;

    // Attach event listeners
    document.getElementById('sort-toggle')?.addEventListener('click', toggleSort);
    document.getElementById('add-fab')?.addEventListener('click', () => navigate('add'));
    
    document.querySelectorAll('.advance-btn').forEach(btn => {
      btn.addEventListener('click', handleAdvance);
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

function renderTaskItem(task) {
  const isSinglePhase = task.phaseCount === 1;
  const hasTransitions = task.hasTransitions;
  
  if (isSinglePhase) {
    // 1-phase cycle: show like old "simple task"
    return `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-header">
          <a href="#edit/${task.id}" class="task-title">${escapeHtml(task.title)}</a>
        </div>
        <div class="task-time ${hasTransitions ? '' : 'never'}" data-timestamp="${task.currentPhaseSince}">
          ${hasTransitions ? 'Last done ' : 'Never • Created '}
          <span class="time-display"></span>
        </div>
        <div class="task-actions">
          <button class="btn btn-primary advance-btn" data-task-id="${task.id}">
            Did it now
          </button>
        </div>
      </div>
    `;
  } else {
    // Multi-phase cycle
    const phases = task.phases;
    const nextPhaseIndex = (task.currentPhaseIndex + 1) % task.phaseCount;
    const nextPhase = phases.find(p => p.index === nextPhaseIndex);
    
    return `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-header">
          <a href="#edit/${task.id}" class="task-title">${escapeHtml(task.title)}</a>
        </div>
        <div class="cycle-info">
          <div class="current-phase">Phase: ${escapeHtml(task.currentPhase?.name || 'Unknown')}</div>
          <div class="task-time" data-timestamp="${task.currentPhaseSince}">
            In phase for <span class="time-display"></span>
          </div>
          ${nextPhase ? `<div class="next-phase">Next: ${escapeHtml(nextPhase.name)}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="btn btn-primary advance-btn" data-task-id="${task.id}">
            Next phase
          </button>
        </div>
      </div>
    `;
  }
}

function sortTasks(tasks, sortBy) {
  if (sortBy === 'alpha') {
    return [...tasks].sort((a, b) => a.title.localeCompare(b.title));
  }
  
  // Sort by recent (least recently transitioned first)
  return [...tasks].sort((a, b) => {
    const aTime = a.currentPhaseSince || 0;
    const bTime = b.currentPhaseSince || 0;
    return aTime - bTime;
  });
}

function toggleSort() {
  sortBy = sortBy === 'recent' ? 'alpha' : 'recent';
  localStorage.setItem('sortBy', sortBy);
  renderListScreen();
}

async function handleAdvance(e) {
  const taskId = parseInt(e.target.dataset.taskId);
  
  try {
    await db.advancePhase(taskId);
    renderListScreen();
  } catch (error) {
    console.error('Error advancing phase:', error);
    alert('Failed to advance. Please try again.');
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

          <div class="form-group">
            <label>Type</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="type" value="single" checked>
                Single step (just track when you do it)
              </label>
              <label class="radio-label">
                <input type="radio" name="type" value="cycle">
                Cycle (multiple phases)
              </label>
            </div>
          </div>

          <div id="phases-section" style="display: none;">
            <div class="form-group">
              <label>Phases</label>
              <div id="phases-list"></div>
              <button type="button" class="btn btn-secondary btn-small" id="add-phase-btn">
                + Add phase
              </button>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Thing</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('add-form');
  const phasesSection = document.getElementById('phases-section');
  const phasesList = document.getElementById('phases-list');
  let phases = [];

  // Type toggle
  document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'cycle') {
        phasesSection.style.display = 'block';
        if (phases.length === 0) {
          addPhase();
          addPhase();
        }
      } else {
        phasesSection.style.display = 'none';
      }
    });
  });

  // Add phase button
  document.getElementById('add-phase-btn').addEventListener('click', () => addPhase());

  function addPhase() {
    const index = phases.length;
    phases.push({ name: '', durationDays: null });
    renderPhases();
  }

  function renderPhases() {
    phasesList.innerHTML = phases.map((phase, i) => `
      <div class="phase-item" data-index="${i}">
        <input 
          type="text" 
          class="phase-name-input" 
          placeholder="Phase ${i + 1} name" 
          value="${escapeHtml(phase.name)}"
          data-index="${i}"
        />
        ${phases.length > 2 ? `
          <button type="button" class="btn btn-danger btn-small remove-phase-btn" data-index="${i}">
            Remove
          </button>
        ` : ''}
      </div>
    `).join('');

    // Attach listeners
    document.querySelectorAll('.phase-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index);
        phases[idx].name = e.target.value;
      });
    });

    document.querySelectorAll('.remove-phase-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        phases.splice(idx, 1);
        renderPhases();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = form.title.value.trim();
    const type = form.type.value;
    
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

      if (type === 'single') {
        // Create single-phase task
        const task = await db.createTask(title, 0, Date.now());
        await db.createPhase(task.id, 0, 'Done', null);
      } else {
        // Create multi-phase task
        const validPhases = phases.filter(p => p.name.trim());
        if (validPhases.length < 2) {
          alert('Please add at least 2 phases');
          return;
        }

        const task = await db.createTask(title, 0, Date.now());
        for (let i = 0; i < validPhases.length; i++) {
          await db.createPhase(task.id, i, validPhases[i].name, validPhases[i].durationDays);
        }
      }

      navigate('list');
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to add task. Please try again.');
    }
  });

  document.getElementById('cancel-btn').addEventListener('click', () => navigate('list'));
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

    const phases = await db.getPhasesForTask(taskId);
    const transitions = await db.getTransitionsForTask(taskId);
    const isSinglePhase = phases.length === 1;
    
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

          ${!isSinglePhase ? `
            <div class="phases-section">
              <h3>Phases</h3>
              <div id="phases-edit-list">
                ${phases.map(p => `
                  <div class="phase-edit-item">
                    <span>${p.index + 1}. ${escapeHtml(p.name)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="completion-list">
            <h3>${isSinglePhase ? 'Completion History' : 'Transition History'} (${transitions.length})</h3>
            
            <div class="form-group">
              <button type="button" class="btn btn-secondary btn-small" id="add-transition-btn">
                + Add ${isSinglePhase ? 'completion' : 'transition'}...
              </button>
            </div>

            <div id="add-transition-form" style="display: none; margin-bottom: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 0.375rem;">
              <div class="form-group">
                <label for="transition-date">Date and time</label>
                <input type="datetime-local" id="transition-date" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.375rem; background: var(--bg-primary); color: var(--text-primary);" />
              </div>
              ${!isSinglePhase ? `
                <div class="form-group">
                  <label for="transition-to-phase">To phase</label>
                  <select id="transition-to-phase" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.375rem; background: var(--bg-primary); color: var(--text-primary);">
                    ${phases.map(p => `<option value="${p.index}">${escapeHtml(p.name)}</option>`).join('')}
                  </select>
                </div>
              ` : ''}
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="btn btn-primary btn-small" id="save-transition-btn">
                  Add
                </button>
                <button type="button" class="btn btn-secondary btn-small" id="cancel-transition-btn">
                  Cancel
                </button>
              </div>
            </div>

            ${transitions.length > 0 ? transitions.map(transition => {
                if (isSinglePhase) {
                  return `
                    <div class="completion-item">
                      <span class="completion-time">Completed at ${formatDateTime(transition.transitionedAt)}</span>
                      <button 
                        class="btn btn-danger btn-small delete-transition-btn" 
                        data-transition-id="${transition.id}"
                      >
                        Delete
                      </button>
                    </div>
                  `;
                } else {
                  const fromPhase = phases.find(p => p.index === transition.fromPhaseIndex);
                  const toPhase = phases.find(p => p.index === transition.toPhaseIndex);
                  return `
                    <div class="completion-item">
                      <span class="completion-time">
                        ${fromPhase ? escapeHtml(fromPhase.name) : 'Start'} → ${toPhase ? escapeHtml(toPhase.name) : 'Unknown'}
                        <br><small>${formatDateTime(transition.transitionedAt)}</small>
                      </span>
                      <button 
                        class="btn btn-danger btn-small delete-transition-btn" 
                        data-transition-id="${transition.id}"
                      >
                        Delete
                      </button>
                    </div>
                  `;
                }
              }).join('') : '<p style="color: var(--text-secondary); font-style: italic;">No history yet</p>'}
          </div>

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
    
    document.querySelectorAll('.delete-transition-btn').forEach(btn => {
      btn.addEventListener('click', (e) => handleDeleteTransition(e, taskId));
    });

    // Add transition functionality
    const addTransitionBtn = document.getElementById('add-transition-btn');
    const addTransitionForm = document.getElementById('add-transition-form');
    const saveTransitionBtn = document.getElementById('save-transition-btn');
    const cancelTransitionBtn = document.getElementById('cancel-transition-btn');
    const transitionDateInput = document.getElementById('transition-date');

    if (addTransitionBtn) {
      addTransitionBtn.addEventListener('click', () => {
        addTransitionForm.style.display = 'block';
        addTransitionBtn.style.display = 'none';
        
        // Set to current time
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        transitionDateInput.value = now.toISOString().slice(0, 16);
      });

      cancelTransitionBtn.addEventListener('click', () => {
        addTransitionForm.style.display = 'none';
        addTransitionBtn.style.display = 'inline-block';
      });

      saveTransitionBtn.addEventListener('click', async () => {
        const dateValue = transitionDateInput.value;
        if (!dateValue) {
          alert('Please select a date and time');
          return;
        }

        try {
          const timestamp = new Date(dateValue).getTime();
          
          if (isSinglePhase) {
            // Single phase: just add a completion (transition to same phase)
            await db.createTransition(taskId, 0, 0, timestamp);
          } else {
            // Multi-phase: get selected phase
            const toPhaseSelect = document.getElementById('transition-to-phase');
            const toPhaseIndex = parseInt(toPhaseSelect.value);
            const fromPhaseIndex = task.currentPhaseIndex;
            
            await db.createTransition(taskId, fromPhaseIndex, toPhaseIndex, timestamp);
            
            // Update task's current phase if this is the most recent transition
            const allTransitions = await db.getTransitionsForTask(taskId);
            const mostRecent = allTransitions[0]; // Already sorted newest first
            
            if (mostRecent.transitionedAt === timestamp) {
              await db.updateTask(taskId, {
                currentPhaseIndex: toPhaseIndex,
                currentPhaseSince: timestamp
              });
            }
          }
          
          // Recalculate current phase based on all transitions
          await recalculateCurrentPhase(taskId);
          
          renderEditScreen(taskId);
        } catch (error) {
          console.error('Error adding transition:', error);
          alert('Failed to add entry. Please try again.');
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

async function recalculateCurrentPhase(taskId) {
  const transitions = await db.getTransitionsForTask(taskId);
  const task = await db.getTask(taskId);
  
  if (transitions.length > 0) {
    const lastTransition = transitions[0]; // Already sorted newest first
    await db.updateTask(taskId, {
      currentPhaseIndex: lastTransition.toPhaseIndex,
      currentPhaseSince: lastTransition.transitionedAt
    });
  } else {
    // No transitions left, reset to phase 0 at created time
    await db.updateTask(taskId, {
      currentPhaseIndex: 0,
      currentPhaseSince: task.createdAt
    });
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

async function handleDeleteTransition(e, taskId) {
  const transitionId = parseInt(e.target.dataset.transitionId);
  
  const confirm = window.confirm('Delete this entry?');
  if (!confirm) return;

  try {
    await db.deleteTransition(transitionId);
    
    // Recalculate current phase after deleting a transition
    await recalculateCurrentPhase(taskId);
    
    renderEditScreen(taskId);
  } catch (error) {
    console.error('Error deleting transition:', error);
    alert('Failed to delete entry. Please try again.');
  }
}

// Advanced Screen
function renderAdvancedScreen() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="screen">
      <a href="#list" class="back-link">← Back</a>
      
      <div class="form-container">
        <h2>Advanced</h2>
        
        <div class="advanced-section">
          <h3>Export Data</h3>
          <p>Download all your data as a JSON file.</p>
          <button class="btn btn-primary" id="export-btn">Export Data</button>
        </div>

        <div class="advanced-section delete-section">
          <h3>Delete All Data</h3>
          <p style="color: var(--danger);">This will permanently delete all your things, phases, and history. This cannot be undone!</p>
          
          <div class="form-group">
            <label for="wipe-confirm">Type <strong>DELETE</strong> to confirm:</label>
            <input 
              type="text" 
              id="wipe-confirm" 
              placeholder="DELETE"
              autocomplete="off"
            />
          </div>
          
          <button class="btn btn-danger" id="wipe-btn" disabled>Delete All Data</button>
        </div>
      </div>
    </div>
  `;

  // Export button
  document.getElementById('export-btn').addEventListener('click', async () => {
    try {
      const data = await db.getAllData();
      const exportData = {
        exportedAt: new Date().toISOString(),
        app: 'Did a Thing',
        dbVersion: 2,
        sortPreference: localStorage.getItem('sortBy'),
        ...data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const date = new Date().toISOString().split('T')[0];
      a.download = `did-a-thing-export-${date}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    }
  });

  // Wipe confirmation
  const wipeConfirm = document.getElementById('wipe-confirm');
  const wipeBtn = document.getElementById('wipe-btn');
  
  wipeConfirm.addEventListener('input', (e) => {
    wipeBtn.disabled = e.target.value !== 'DELETE';
  });

  wipeBtn.addEventListener('click', async () => {
    if (wipeConfirm.value !== 'DELETE') return;

    const finalConfirm = window.confirm('Are you absolutely sure? This will delete EVERYTHING and cannot be undone!');
    if (!finalConfirm) return;

    try {
      await db.wipeAllData();
      localStorage.clear();
      alert('All data deleted. The page will now reload.');
      window.location.href = window.location.origin + window.location.pathname;
    } catch (error) {
      console.error('Wipe error:', error);
      alert('Failed to delete data: ' + error.message);
    }
  });
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
