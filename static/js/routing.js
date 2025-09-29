// TaskLift Dashboard - Client-side routing and functionality
// File: static/js/routing.js

// Client-side routing system
class TaskLiftRouter {
    constructor() {
        this.routes = {
            'overview': 'overview-page',
            'projects': 'projects-page', 
            'tasks': 'tasks-page',
            'analytics': 'analytics-page',
            'documents': 'documents-page',
            'notes': 'notes-page'
        };
        
        this.currentRoute = 'overview';
        this.init();
    }

    init() {
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const route = e.state?.route || 'overview';
            this.showPage(route, false);
        });

        // Handle navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = e.currentTarget.getAttribute('data-route');
                this.navigateTo(route);
            });
        });

        // Load initial route from URL hash
        const initialRoute = window.location.hash.replace('#', '') || 'overview';
        this.showPage(initialRoute, false);
    }

    navigateTo(route) {
        if (this.routes[route]) {
            this.showPage(route, true);
        }
    }

    showPage(route, updateHistory = true) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(this.routes[route]);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`[data-route="${route}"]`)?.parentElement;
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update URL and browser history
        if (updateHistory) {
            const url = route === 'overview' ? '#' : `#${route}`;
            history.pushState({ route }, '', url);
        }

        this.currentRoute = route;
        
        // Load content for specific pages
        this.loadPageContent(route);
    }

    async loadPageContent(route) {
        const loadingSpinner = document.getElementById('loading-spinner');
        
        try {
            switch(route) {
                case 'tasks':
                    await this.loadTasks();
                    break;
                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'overview':
                    await this.loadOverviewStats();
                    break;
                case 'projects':
                    await this.loadProjects();
                    break;
                case 'notes':
                    await this.loadNotes();
                    break;
            }
        } catch (error) {
            console.error('Error loading page content:', error);
        } finally {
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            const projects = await response.json();
            renderProjects(projects);
        } catch (error) {
            console.error('Error loading projects:', error);
            const container = document.getElementById('projects-container');
            if (container) {
                container.innerHTML = '<div class="error">Error loading projects. Please try again.</div>';
            }
        }
    }

    async loadNotes() {
        try {
            const response = await fetch('/api/notes');
            const notes = await response.json();
            renderNotes(notes);
        } catch (error) {
            console.error('Error loading notes:', error);
            const container = document.getElementById('notes-container');
            if (container) {
                container.innerHTML = '<div class="error">Error loading notes. Please try again.</div>';
            }
        }
    }

    async loadTasks() {
    try {
        console.log('Loading tasks from /api/tasks...');
        
        const response = await fetch('/api/tasks', {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const tasks = await response.json();
        console.log('Raw tasks data:', tasks);
        console.log('Number of tasks:', tasks.length);
        
        if (tasks.length > 0) {
            console.log('First task structure:', tasks[0]);
            console.log('First task ID:', tasks[0].ID || tasks[0].id);
            console.log('First task description:', tasks[0].Description || tasks[0].description);
        }
        
        this.renderTasks(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        const container = document.getElementById('tasks-container');
        if (container) {
            container.innerHTML = `<div class="error">Error loading tasks: ${error.message}</div>`;
        }
    }
}

    renderTasks(tasks) {
    const container = document.getElementById('tasks-container');
    const taskCount = document.getElementById('task-count');
    
    console.log('Rendering tasks:', tasks); // Debug log to see the actual data structure
    
    if (taskCount) {
        taskCount.textContent = `${tasks.length} tasks`;
    }
    
    if (!container) {
        console.error('Tasks container not found');
        return;
    }

    if (tasks.length === 0) {
        container.innerHTML = '<div class="no-tasks">No tasks found. Create your first task!</div>';
        return;
    }

    const tasksHTML = tasks.map(task => {
        // Handle both uppercase and lowercase ID
        const taskId = task.ID || task.id;
        const taskDescription = task.Description || task.description;
        const taskDone = task.Done !== undefined ? task.Done : task.done;
        
        if (!taskId) {
            console.error('Task missing ID:', task);
            return '';
        }
        
        return `
            <div class="task-item ${taskDone ? 'completed' : ''}" data-task-id="${taskId}">
                <input type="checkbox" class="task-checkbox" ${taskDone ? 'checked' : ''} 
                       onchange="toggleTask(${taskId}, this.checked)">
                <div class="task-content">
                    <span class="task-title">${taskDescription || 'No description'}</span>
                    <span class="task-id">ID: ${taskId}</span>
                </div>
                <div class="task-actions">
                    <button class="task-action edit" onclick="editTask(${taskId})">Edit</button>
                    <button class="task-action delete" onclick="deleteTask(${taskId})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = tasksHTML;
    console.log('Tasks rendered successfully');
}
    async loadAnalytics() {
        try {
            const response = await fetch('/api/analytics');
            const analytics = await response.json();
            this.renderAnalytics(analytics);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    renderAnalytics(analytics) {
        const statsContainer = document.getElementById('analytics-stats');
        const completionRateEl = document.getElementById('analytics-completion-rate');
        
        if (completionRateEl) {
            completionRateEl.textContent = `${analytics.completion_rate.toFixed(1)}% completion rate this month`;
        }
        
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-info">
                        <div class="stat-number">${analytics.total_tasks}</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-info">
                        <div class="stat-number">${analytics.completed_tasks}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-info">
                        <div class="stat-number">${analytics.completion_rate.toFixed(1)}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                </div>
            `;
        }
    }

    async loadOverviewStats() {
        try {
            const response = await fetch('/api/analytics');
            const analytics = await response.json();
            
            // Update overview stats
            const activeTasksEl = document.getElementById('active-tasks-count');
            const completionRateEl = document.getElementById('completion-rate');
            const completedCountEl = document.getElementById('completed-count');
            const progressCountEl = document.getElementById('progress-count');
            
            if (activeTasksEl) activeTasksEl.textContent = analytics.total_tasks - analytics.completed_tasks;
            if (completionRateEl) completionRateEl.textContent = `${analytics.completion_rate.toFixed(0)}%`;
            if (completedCountEl) completedCountEl.textContent = analytics.completed_tasks;
            if (progressCountEl) progressCountEl.textContent = analytics.total_tasks - analytics.completed_tasks;
        } catch (error) {
            console.error('Error loading overview stats:', error);
        }
    }
}

// Task management functions
async function toggleTask(taskId, isCompleted) {
    try {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const titleElement = taskElement?.querySelector('.task-title');
        const description = titleElement ? titleElement.textContent : '';
        
        const response = await fetch('/tasksupdate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `id=${taskId}&done=${isCompleted ? 'on' : ''}&description=${encodeURIComponent(description)}`
        });
        
        if (response.ok) {
            // Update UI
            if (taskElement) {
                if (isCompleted) {
                    taskElement.classList.add('completed');
                } else {
                    taskElement.classList.remove('completed');
                }
            }
            
            // Refresh stats
            router.loadOverviewStats();
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch('/tasksdelete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `id=${taskId}`
        });
        
        if (response.ok) {
            // Remove from UI
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.remove();
            }
            // Refresh task list
            router.loadTasks();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

function editTask(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    const titleElement = taskElement?.querySelector('.task-title');
    const currentTitle = titleElement ? titleElement.textContent : '';
    
    const newTitle = prompt('Edit task:', currentTitle);
    if (newTitle && newTitle !== currentTitle) {
        updateTaskDescription(taskId, newTitle);
    }
}

async function updateTaskDescription(taskId, newDescription) {
    try {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const checkbox = taskElement?.querySelector('.task-checkbox');
        const isCompleted = checkbox ? checkbox.checked : false;
        
        const response = await fetch('/tasksupdate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `id=${taskId}&description=${encodeURIComponent(newDescription)}&done=${isCompleted ? 'on' : ''}`
        });
        
        if (response.ok) {
            const titleElement = taskElement?.querySelector('.task-title');
            if (titleElement) {
                titleElement.textContent = newDescription;
            }
        }
    } catch (error) {
        console.error('Error updating task description:', error);
    }
}

function showCreateTaskModal() {
    const description = prompt('Enter task description:');
    if (description) {
        createTask(description);
    }
}

async function createTask(description) {
    try {
        const response = await fetch('/createtasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `user_id=1&description=${encodeURIComponent(description)}`
        });
        
        if (response.ok) {
            // Refresh task list
            router.loadTasks();
            router.loadOverviewStats();
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

// Project Management Functions
async function createProject() {
    const name = prompt('Project name:');
    if (!name) return;
    
    const description = prompt('Project description:');
    const status = prompt('Status (active/completed/paused/cancelled):') || 'active';
    const dueDate = prompt('Due date (YYYY-MM-DD):');
    const team_members = prompt('Number of team members:', '0');
    
    try {
        const response = await fetch('/api/projects/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&due_date=${dueDate || ''}&team_members=${team_members || '0'}`
        });
        
        if (response.ok) {
            alert('Project created successfully!');
            if (router.currentRoute === 'projects') {
                router.loadProjects();
            }
        } else {
            alert('Failed to create project');
        }
    } catch (error) {
        console.error('Error creating project:', error);
        alert('Error creating project');
    }
}
async function submitProjectEdit(projectId) {
    // Get values from form inputs
    const name = document.getElementById('edit-name').value;
    const description = document.getElementById('edit-description').value;
    const status = document.getElementById('edit-status').value;
    const dueDate = document.getElementById('edit-due-date').value;
    const teamMembers = document.getElementById('edit-team-members').value || 0;

    try {
        const response = await fetch('/api/projects/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${projectId}` +
                  `&name=${encodeURIComponent(name)}` +
                  `&description=${encodeURIComponent(description)}` +
                  `&status=${encodeURIComponent(status)}` +
                  `&due_date=${encodeURIComponent(dueDate)}` +
                  `&team_members=${encodeURIComponent(teamMembers)}`
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Failed to update project:", result);
            alert(result.error || "Failed to update project");
            return;
        }

        // Optionally, refresh project list or close modal
        loadProjects();
        closeEditModal();
    } catch (err) {
        console.error("Error updating project:", err);
        alert("An error occurred while updating the project");
    }
}

async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        renderProjects(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

function renderProjects(projects) {
    const container = document.getElementById('projects-container');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = '<div class="no-projects">No projects found. Create your first project!</div>';
        return;
    }
    
    const projectsHTML = projects.map(project => `
        <div class="dashboard-card">
            <div class="card-header">
                <h3>${project.name}</h3>
                <span class="project-status-badge ${project.status}">${project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>
            </div>
            <div class="project-details">
                <p>${project.description || 'No description'}</p>
                <div class="project-progress">
                    <div class="progress-bar">
                        <div class="progress" style="width: ${project.progress}%"></div>
                    </div>
                    <span class="progress-text">${project.progress}% Complete</span>
                </div>
                <div class="project-meta">
                    <span class="project-due">Due: ${project.due_date || 'No due date'}</span>
                    <span class="project-tasks">${project.task_count} tasks (${project.completed_tasks} completed)</span>
                    <span class="project-team">Team Members: ${project.team_members}</span>

                </div>
                <div class="project-actions">
                    <button class="task-action edit" onclick="editProject(${project.id})">Edit</button>
                    <button class="task-action delete" onclick="deleteProject(${project.id})">Delete</button>
                </div>
                
            </div>
        </div>
    `).join('');
    
    container.innerHTML = projectsHTML;
}

async function editProject(projectId) {
    const name = prompt('Project name:');
    if (!name) return;
    
    const description = prompt('Project description:');
    const status = prompt('Status (active/completed/paused/cancelled):') || 'active';
    const dueDate = prompt('Due date (YYYY-MM-DD):');
    const team_members = prompt('Number of team members:', '0');
    
    try {
        const response = await fetch('/api/projects/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${projectId}&name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&status=${status}&due_date=${dueDate || ''}&team_members=${team_members || '0'}`
        });
        
        if (response.ok) {
            alert('Project updated successfully!');
            router.loadProjects();
        }
    } catch (error) {
        console.error('Error updating project:', error);
    }
}

async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? Tasks will be unlinked but not deleted.')) return;
    
    try {
        const response = await fetch('/api/projects/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${projectId}`
        });
        
        if (response.ok) {
            alert('Project deleted successfully!');
            router.loadProjects();
        }
    } catch (error) {
        console.error('Error deleting project:', error);
    }
}

// Note Management Functions
async function createNote() {
    const title = prompt('Note title:');
    if (!title) return;
    
    const content = prompt('Note content:');
    
    try {
        const response = await fetch('/api/notes/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `title=${encodeURIComponent(title)}&content=${encodeURIComponent(content || '')}`
        });
        
        if (response.ok) {
            alert('Note created successfully!');
            if (router.currentRoute === 'notes') {
                router.loadNotes();
            }
        }
    } catch (error) {
        console.error('Error creating note:', error);
    }
}

async function loadNotes() {
    try {
        const response = await fetch('/api/notes');
        const notes = await response.json();
        renderNotes(notes);
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

function renderNotes(notes) {
    const container = document.getElementById('notes-container');
    if (!container) return;
    
    if (notes.length === 0) {
        container.innerHTML = '<div class="no-notes">No notes found. Create your first note!</div>';
        return;
    }
    
    const notesHTML = notes.map(note => `
        <div class="dashboard-card note-card">
            <div class="note-header">
                <h4>${note.title}</h4>
                <small>Updated: ${new Date(note.updated_at).toLocaleDateString()}</small>
            </div>
            <div class="note-content">
                <p>${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}</p>
            </div>
            <div class="note-actions">
                <button class="note-action" onclick="editNote(${note.id})">Edit</button>
                <button class="note-action" onclick="deleteNote(${note.id})">Delete</button>
                <button class="note-action" onclick="viewNote(${note.id})">View Full</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = notesHTML;
}

async function editNote(noteId) {
    // First get the current note
    try {
        const response = await fetch('/api/notes');
        const notes = await response.json();
        const note = notes.find(n => n.id === noteId);
        
        if (!note) return;
        
        const title = prompt('Note title:', note.title);
        if (!title) return;
        
        const content = prompt('Note content:', note.content);
        
        const updateResponse = await fetch('/api/notes/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${noteId}&title=${encodeURIComponent(title)}&content=${encodeURIComponent(content || '')}`
        });
        
        if (updateResponse.ok) {
            alert('Note updated successfully!');
            router.loadNotes();
        }
    } catch (error) {
        console.error('Error editing note:', error);
    }
}

async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
        const response = await fetch('/api/notes/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${noteId}`
        });
        
        if (response.ok) {
            alert('Note deleted successfully!');
            router.loadNotes();
        }
    } catch (error) {
        console.error('Error deleting note:', error);
    }
}

function viewNote(noteId) {
    // Simple implementation - you could enhance this with a modal
    fetch('/api/notes')
        .then(response => response.json())
        .then(notes => {
            const note = notes.find(n => n.id === noteId);
            if (note) {
                alert(`${note.title}\n\n${note.content}`);
            }
        });
}

// Enhanced task creation with project assignment
async function showCreateTaskModal() {
    const description = prompt('Enter task description:');
    if (!description) return;
    
    const priority = prompt('Priority (high/medium/low):', 'medium');
    const dueDate = prompt('Due date (YYYY-MM-DD):');
    
    // Get projects for assignment
    try {
        const projectsResponse = await fetch('/api/projects');
        const projects = await projectsResponse.json();
        
        let projectId = null;
        if (projects.length > 0) {
            const projectOptions = projects.map(p => `${p.id}: ${p.name}`).join('\n');
            const selectedProject = prompt(`Assign to project (enter project ID or leave blank):\n\n${projectOptions}`);
            if (selectedProject) {
                projectId = parseInt(selectedProject);
            }
        }
        
        createTaskWithDetails(description, priority, dueDate, projectId);
    } catch (error) {
        console.error('Error loading projects:', error);
        createTaskWithDetails(description, priority, dueDate, null);
    }
}

async function createTaskWithDetails(description, priority, dueDate, projectId) {
    try {
        const response = await fetch('/createtasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `user_id=1&description=${encodeURIComponent(description)}&priority=${priority || 'medium'}&due_date=${dueDate || ''}&project_id=${projectId || ''}`
        });
        
        if (response.ok) {
            alert('Task created successfully!');
            router.loadTasks();
            router.loadOverviewStats();
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

function exportReport() {
    // Generate a simple text report
    fetch('/api/analytics')
        .then(response => response.json())
        .then(analytics => {
            const report = `TaskLift Analytics Report
Generated: ${new Date().toLocaleString()}

TASK STATISTICS:
- Total Tasks: ${analytics.total_tasks}
- Completed Tasks: ${analytics.completed_tasks}
- Pending Tasks: ${analytics.pending_tasks}
- High Priority Tasks: ${analytics.high_priority_tasks}
- Completion Rate: ${analytics.completion_rate.toFixed(1)}%

PROJECT STATISTICS:
- Total Projects: ${analytics.total_projects}
- Active Projects: ${analytics.active_projects}

This is a basic report. Enhanced reporting features coming soon!`;

            // Create and download the report
            const blob = new Blob([report], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tasklift-report-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error generating report:', error);
            alert('Error generating report');
        });
}

function uploadDocument() {
    alert('Document upload feature will be implemented in the next phase!\n\nPlanned features:\n- File upload with drag & drop\n- Document preview\n- Version control\n- Sharing capabilities');
}

// Global variables
let router;

// Global navigation function
function navigateTo(route) {
    if (router) {
        router.navigateTo(route);
    }
}

// Filter and search functions
function filterTasks(filter) {
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
        const isCompleted = item.classList.contains('completed');
        let show = true;
        
        switch(filter) {
            case 'pending':
                show = !isCompleted;
                break;
            case 'completed':
                show = isCompleted;
                break;
            case 'all':
            default:
                show = true;
                break;
        }
        
        item.style.display = show ? 'flex' : 'none';
    });
}

function searchTasks(query) {
    const taskItems = document.querySelectorAll('.task-item');
    const lowerQuery = query.toLowerCase();
    
    taskItems.forEach(item => {
        const titleElement = item.querySelector('.task-title');
        const title = titleElement ? titleElement.textContent.toLowerCase() : '';
        const matches = title.includes(lowerQuery);
        item.style.display = matches ? 'flex' : 'none';
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize router
    router = new TaskLiftRouter();

    // Toggle buttons in analytics card
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Filter buttons in projects card and tasks page
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.closest('.project-filters, .task-filters');
            if (parent) {
                parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Handle task filtering
                if (parent.classList.contains('task-filters')) {
                    const filter = this.getAttribute('data-filter');
                    filterTasks(filter);
                }
            }
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchTasks(this.value);
            }, 300);
        });
    }
});