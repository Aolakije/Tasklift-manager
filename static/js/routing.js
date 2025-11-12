// TaskLift Dashboard - Unified routing and functionality

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
        this.allTasks = [];
        this.currentFilter = 'all';
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
                    await this.loadOverview();
                    break;
                case 'projects':
                    await this.loadProjects();
                    break;
                case 'notes':
                    await this.loadNotes();
                    break;
                case 'documents':
                    await this.loadDocuments();
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

    // OVERVIEW PAGE
    async loadOverview() {
        await this.loadOverviewStats();
        await this.loadRecentTasks();
        await this.loadRecentProjects();
    }

    async loadOverviewStats() {
        try {
            const response = await fetch('/api/analytics');
            const data = await response.json();
            
            // Update stat cards
            const activeTasksEl = document.getElementById('active-tasks-count');
            const completionRateEl = document.getElementById('completion-rate');
            const totalProjectsEl = document.getElementById('total-projects-count');
            const completedCountEl = document.getElementById('completed-count');
            const progressCountEl = document.getElementById('progress-count');
            const highPriorityEl = document.getElementById('high-priority-count');
            
            if (activeTasksEl) activeTasksEl.textContent = data.pending_tasks || 0;
            if (completionRateEl) completionRateEl.textContent = Math.round(data.completion_rate || 0) + '%';
            if (totalProjectsEl) totalProjectsEl.textContent = data.total_projects || 0;
            if (completedCountEl) completedCountEl.textContent = data.completed_tasks || 0;
            if (progressCountEl) progressCountEl.textContent = data.pending_tasks || 0;
            if (highPriorityEl) highPriorityEl.textContent = data.high_priority_tasks || 0;
            
            // Update change indicators
            const activeChangeEl = document.getElementById('active-tasks-change');
            const completionChangeEl = document.getElementById('completion-change');
            const projectsChangeEl = document.getElementById('projects-change');
            
            if (activeChangeEl) activeChangeEl.textContent = 'Track your progress';
            if (completionChangeEl) completionChangeEl.textContent = 'Keep it up!';
            if (projectsChangeEl) projectsChangeEl.textContent = 'Stay organized';
            
        } catch (error) {
            console.error('Error loading overview stats:', error);
        }
    }

    async loadRecentTasks() {
        try {
            const response = await fetch('/api/tasks');
            const tasks = await response.json();
            
            const container = document.getElementById('recent-tasks-list');
            if (!container) return;
            
            if (tasks.length === 0) {
                container.innerHTML = '<div class="no-tasks"><p>No tasks yet</p></div>';
                return;
            }
            
            // Show up to 5 most recent tasks
            const recentTasks = tasks.slice(0, 5);
            container.innerHTML = '';
            
            recentTasks.forEach(task => {
                const div = document.createElement('div');
                div.className = 'priority-item';
                
                const priorityClass = task.priority || 'medium';
                const statusText = task.done ? 'Completed' : 'Pending';
                
                div.innerHTML = `
                    <div class="priority-info">
                        <span class="priority-label">${this.escapeHtml(task.description.substring(0, 30))}${task.description.length > 30 ? '...' : ''}</span>
                        <span class="priority-count">${statusText}</span>
                    </div>
                    <span class="priority-date">${task.due_date ? this.formatDate(task.due_date) : 'No date'}</span>
                `;
                
                container.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading recent tasks:', error);
        }
    }

    async loadRecentProjects() {
        try {
            const response = await fetch('/api/projects');
            const projects = await response.json();
            
            const container = document.getElementById('recent-projects-list');
            if (!container) return;
            
            if (projects.length === 0) {
                container.innerHTML = '<div class="no-tasks"><p>No projects yet</p></div>';
                return;
            }
            
            // Show up to 3 most recent projects
            const recentProjects = projects.slice(0, 3);
            container.innerHTML = '';
            
            recentProjects.forEach(project => {
                const div = document.createElement('div');
                div.className = 'project-item';
                div.style.cursor = 'pointer';
                div.onclick = () => this.navigateTo('projects');
                
                const initial = project.name.charAt(0).toUpperCase();
                
                div.innerHTML = `
                    <div class="project-avatar">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #6c7d36; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                            ${initial}
                        </div>
                    </div>
                    <div class="project-info">
                        <span class="project-name">${this.escapeHtml(project.name)}</span>
                        <span class="project-desc">${project.progress}% Complete</span>
                    </div>
                    <div class="project-status">
                        <span class="status-indicator ${project.status}"></span>
                        <span class="status-text">${project.status}</span>
                    </div>
                `;
                
                container.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading recent projects:', error);
        }
    }

    // TASKS PAGE
    async loadTasks() {
        const container = document.getElementById('tasks-container');
        if (!container) return;
        
        try {
            container.innerHTML = '<div class="loading-tasks">Loading tasks...</div>';
            
            const response = await fetch('/api/tasks');
            this.allTasks = await response.json();
            
            if (this.allTasks.length === 0) {
                container.innerHTML = '<div class="no-tasks"><p>Create your first task to get started!</p></div>';
                const taskCount = document.getElementById('task-count');
                if (taskCount) taskCount.textContent = '0 tasks';
                return;
            }
            
            this.displayTasks(this.allTasks);
            
            const taskCount = document.getElementById('task-count');
            if (taskCount) taskCount.textContent = `${this.allTasks.length} task${this.allTasks.length !== 1 ? 's' : ''}`;
            
        } catch (error) {
            console.error('Failed to load tasks:', error);
            container.innerHTML = '<div class="error">Failed to load tasks. Please refresh the page.</div>';
        }
    }

    displayTasks(tasks) {
        const container = document.getElementById('tasks-container');
        if (!container) return;
        
        let filteredTasks = tasks;
        
        if (this.currentFilter === 'completed') {
            filteredTasks = tasks.filter(t => t.done);
        } else if (this.currentFilter === 'pending') {
            filteredTasks = tasks.filter(t => !t.done);
        } else if (this.currentFilter === 'high') {
            filteredTasks = tasks.filter(t => t.priority === 'high');
        }
        
        if (filteredTasks.length === 0) {
            container.innerHTML = '<div class="no-tasks"><p>No tasks match this filter.</p></div>';
            return;
        }
        
        container.innerHTML = '';
        filteredTasks.forEach(task => {
            const taskEl = this.createTaskElement(task);
            container.appendChild(taskEl);
        });
    }

   createTaskElement(task) {
        console.log('Creating task element:', task); // ADD THIS LINE
    const div = document.createElement('div');
    div.className = 'task-item';
    div.setAttribute('data-task-id', task.id);
    
    div.innerHTML = `
        <div class="task-checkbox">
            <input type="checkbox" ${task.done ? 'checked' : ''} onchange="router.toggleTask(${task.id}, this.checked)">
        </div>
        <div class="task-content">
            <div class="task-description ${task.done ? 'completed' : ''}">${this.escapeHtml(task.description)}</div>
            <div class="task-meta">
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                ${task.due_date ? `<span class="task-due">${task.due_date}</span>` : ''}
            </div>
        </div>
        <div class="task-actions">
            <button onclick="router.editTask(${task.id})" class="btn-icon" title="Edit">Edit</button>
            <button onclick="router.deleteTask(${task.id})" class="btn-icon" title="Delete">Delete</button>
        </div>
    `;
    return div;
}
   async toggleTask(taskId, done) {
    try {
        // Find the task first to get all its data
        const task = this.allTasks.find(t => t.id === taskId);
        if (!task) {
            alert('Task not found');
            return;
        }
        
        const formData = new FormData();
        formData.append('id', taskId);
        formData.append('description', task.description); // IMPORTANT: Keep the description
        formData.append('priority', task.priority); // IMPORTANT: Keep the priority
        formData.append('done', done ? 'on' : '');
        if (task.due_date) formData.append('due_date', task.due_date);
        if (task.project_id) formData.append('project_id', task.project_id);
        
        const response = await fetch('/updatetasks', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: formData
        });
        
        if (response.ok) {
            await this.loadTasks();
            await this.loadOverviewStats();
        } else {
            alert('Failed to update task');
        }
    } catch (error) {
        console.error('Failed to toggle task:', error);
        alert('Network error while updating task');
    }
}

    async deleteTask(taskId) {
    // Create custom modal instead of confirm()
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>Delete Task</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <div style="padding: 20px;">
                <p>Are you sure you want to delete this task? This action cannot be undone.</p>
            </div>
            <div class="form-actions">
                <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                <button type="button" onclick="router.confirmDeleteTask(${taskId}); this.closest('.modal').remove();" class="btn-danger">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async confirmDeleteTask(taskId) {
    try {
        const formData = new FormData();
        formData.append('id', taskId);
        
        const response = await fetch('/deletetasks', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: formData
        });
        
        if (response.ok) {
            await this.loadTasks();
            await this.loadOverviewStats();
        } else {
            alert('Failed to delete task');
        }
    } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Network error while deleting task');
    }
}
    async editTask(taskId) {
        try {
            // Find the task in the current list
            const task = this.allTasks.find(t => t.id === taskId);
            if (!task) {
                alert('Task not found');
                return;
            }
            
            // Show edit modal
            showEditTaskModal(task);
        } catch (error) {
            console.error('Failed to load task for editing:', error);
            alert('Failed to load task details');
        }
    }

    filterTasks(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.task-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active');
            }
        });
        
        this.displayTasks(this.allTasks);
    }

    // PROJECTS PAGE
    async loadProjects() {
        const container = document.getElementById('projects-container');
        if (!container) return;
        
        try {
            container.innerHTML = '<div class="loading-tasks">Loading projects...</div>';
            
            const response = await fetch('/api/projects');
            const projects = await response.json();
            
            container.innerHTML = '';
            
            if (projects.length === 0) {
                container.innerHTML = '<div class="dashboard-card2"><p>Create your first project!</p></div>';
                return;
            }
            
            projects.forEach(project => {
                const projectEl = this.createProjectElement(project);
                container.appendChild(projectEl);
            });
            
        } catch (error) {
            console.error('Failed to load projects:', error);
            container.innerHTML = '<div class="error">Failed to load projects</div>';
        }
    }

    createProjectElement(project) {
        const div = document.createElement('div');
        div.className = 'dashboard-card';
        
        const statusClass = project.status.toLowerCase();
        
        div.innerHTML = `
            <div class="card-header">
                <h3>${this.escapeHtml(project.name)}</h3>
                <span class="project-status-badge ${statusClass}">${project.status}</span>
            </div>
            <div class="project-details">
                <p>${this.escapeHtml(project.description || 'No description')}</p>
                <div class="project-progress">
                    <div class="progress-bar">
                        <div class="progress" style="width: ${project.progress}%"></div>
                    </div>
                    <span class="progress-text">${project.progress}% Complete</span>
                </div>
                <div class="project-meta">
                    ${project.due_date ? `<span class="project-due">Due: ${project.due_date} |</span>` : ''}
                    <span class="project-team">Team: ${project.team_members} member${project.team_members !== 1 ? 's' : ''} |</span>
                    <span class="project-tasks">Tasks: ${project.completed_tasks}/${project.task_count}</span>
                </div>
                <div class="project-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                    <button onclick="router.editProject(${project.id})" class="btn-secondary">Edit</button>
                    <button onclick="router.deleteProject(${project.id})" class="btn-danger">Delete</button>
                </div>
            </div>
        `;
        return div;
    }

    async editProject(projectId) {
        try {
            const response = await fetch('/api/projects');
            const projects = await response.json();
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                alert('Project not found');
                return;
            }
            
            showEditProjectModal(project);
        } catch (error) {
            console.error('Failed to load project for editing:', error);
            alert('Failed to load project details');
        }
    }

    async deleteProject(projectId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>Delete Project</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <div style="padding: 20px;">
                <p>Are you sure you want to delete this project? All tasks will be unlinked from this project.</p>
            </div>
            <div class="form-actions">
                <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                <button type="button" onclick="router.confirmDeleteProject(${projectId}); this.closest('.modal').remove();" class="btn-danger">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async confirmDeleteProject(projectId) {
    try {
        const formData = new FormData();
        formData.append('id', projectId);
        
        const response = await fetch('/api/projects/delete', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            await this.loadProjects();
            await this.loadOverviewStats();
        } else {
            alert('Failed to delete project');
        }
    } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Network error while deleting project');
    }
}

    // ANALYTICS PAGE
    async loadAnalytics() {
        try {
            const response = await fetch('/api/analytics');
            const data = await response.json();
            
            // Update analytics stats grid
            const statsContainer = document.getElementById('analytics-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-info">
                            <div class="stat-number">${data.total_tasks || 0}</div>
                            <div class="stat-label">Total Tasks</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-info">
                            <div class="stat-number">${data.completed_tasks || 0}</div>
                            <div class="stat-label">Completed</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⏳</div>
                        <div class="stat-info">
                            <div class="stat-number">${data.pending_tasks || 0}</div>
                            <div class="stat-label">Pending</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🔥</div>
                        <div class="stat-info">
                            <div class="stat-number">${data.high_priority_tasks || 0}</div>
                            <div class="stat-label">High Priority</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-info">
                            <div class="stat-number">${Math.round(data.completion_rate || 0)}%</div>
                            <div class="stat-label">Completion Rate</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📁</div>
                        <div class="stat-info">
                            <div class="stat-number">${data.total_projects || 0}</div>
                            <div class="stat-label">Total Projects</div>
                        </div>
                    </div>
                `;
            }
            
            // Update completion rate text
            const completionRateEl = document.getElementById('analytics-completion-rate');
            if (completionRateEl) {
                completionRateEl.textContent = `You complete ${Math.round(data.completion_rate || 0)}% of your tasks`;
            }
            
            const totalTasksEl = document.getElementById('analytics-total-tasks');
            if (totalTasksEl) {
                totalTasksEl.textContent = `You have ${data.total_tasks || 0} total tasks`;
            }
            
            // Load task statistics
            const statsContainerDetail = document.getElementById('task-statistics');
            if (statsContainerDetail) {
                statsContainerDetail.innerHTML = `
                    <div class="insight-item">
                        <div class="insight-icon">📊</div>
                        <div class="insight-text">
                            <h4>Task Distribution</h4>
                            <p>Completed: ${data.completed_tasks || 0} | Pending: ${data.pending_tasks || 0}</p>
                        </div>
                    </div>
                    <div class="insight-item">
                        <div class="insight-icon">🎯</div>
                        <div class="insight-text">
                            <h4>Priority Breakdown</h4>
                            <p>High Priority: ${data.high_priority_tasks || 0} tasks need attention</p>
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    // NOTES PAGE
    async loadNotes() {
        const container = document.getElementById('notes-container');
        if (!container) return;
        
        try {
            container.innerHTML = '<div class="loading-tasks">Loading notes...</div>';
            
            const response = await fetch('/api/notes');
            const notes = await response.json();
            
            container.innerHTML = '';
            
            if (notes.length === 0) {
                container.innerHTML = '<div class="dashboard-card2"><p>Create your first note!</p></div>';
                return;
            }
            
            notes.forEach(note => {
                const noteEl = this.createNoteElement(note);
                container.appendChild(noteEl);
            });
        } catch (error) {
            console.error('Failed to load notes:', error);
            container.innerHTML = '<div class="error">Failed to load notes</div>';
        }
    }

    createNoteElement(note) {
        const div = document.createElement('div');
        div.className = 'dashboard-card note-card';
        div.innerHTML = `
            <div class="note-header">
                <h4>${this.escapeHtml(note.title)}</h4>
                <small>Updated ${this.formatDate(note.updated_at)}</small>
            </div>
            <div class="note-content">
                <p>${this.escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? '...' : ''}</p>
            </div>
            <div class="note-actions">
                <button onclick="router.editNote(${note.id})" class="note-action">Edit</button>
                <button onclick="router.deleteNote(${note.id})" class="note-action">Delete</button>
            </div>
        `;
        return div;
    }

    async editNote(noteId) {
        try {
            const response = await fetch('/api/notes');
            const notes = await response.json();
            const note = notes.find(n => n.id === noteId);
            
            if (!note) {
                alert('Note not found');
                return;
            }
            
            showEditNoteModal(note);
        } catch (error) {
            console.error('Failed to load note for editing:', error);
            alert('Failed to load note details');
        }
    }

    async deleteNote(noteId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>Delete Project</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <div style="padding: 20px;">
                <p>Are you sure you want to delete this note?</p>
            </div>
            <div class="form-actions">
                <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                <button type="button" onclick="router.confirmDeleteProject(${noteId}); this.closest('.modal').remove();" class="btn-danger">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
    async confirmDeleteNote(noteId) {
        try {
            const formData = new FormData();
            formData.append('id', noteId);
            
            const response = await fetch('/api/notes/delete', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                await this.loadNotes();
            } else {
                alert('Failed to delete note');
            }
        } catch (error) {
            console.error('Failed to delete note:', error);
            alert('Network error while deleting note');
        }
    }

    // DOCUMENTS PAGE
    async loadDocuments() {
        const container = document.getElementById('documents-container');
        if (!container) return;
        
        container.innerHTML = '<div class="dashboard-card2"><p>Document management coming soon!</p></div>';
    }

    // UTILITY FUNCTIONS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
        if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
        if (diff < 604800) return Math.floor(diff / 86400) + ' days ago';
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================

function showCreateTaskModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create New Task</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <form onsubmit="createTask(event)" class="task-form">
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" name="description" required class="form-input" placeholder="What needs to be done?">
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select name="priority" class="form-input">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" name="due_date" class="form-input">
                </div>
                <div class="form-group">
                    <label>Project (optional)</label>
                    <select name="project_id" class="form-input" id="task-project-select">
                        <option value="">No Project</option>
                    </select>
                </div>
                <input type="hidden" name="done" value="">
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Create Task</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    loadProjectsForSelect();
}

async function loadProjectsForSelect() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        const select = document.getElementById('task-project-select');
        if (select && projects.length > 0) {
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

async function createTask(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Clean up empty project_id
    if (!formData.get('project_id')) {
        formData.delete('project_id');
    }
    
    try {
        const response = await fetch('/createtasks', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: formData
        });
        
        if (response.ok) {
            form.closest('.modal').remove();
            await router.loadTasks();
            await router.loadOverviewStats();
        } else {
            const contentType = response.headers.get('content-type');
            let errorMessage = 'Failed to create task';
            
            if (contentType && contentType.includes('application/json')) {
                const errorJson = await response.json();
                errorMessage = errorJson.error || errorJson.message || errorMessage;
            }
            
            console.error('Server error:', errorMessage);
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Failed to create task:', error);
        alert('Network error: ' + error.message);
    }
}

function showEditTaskModal(task) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Task</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <form onsubmit="updateTask(event, ${task.id})" class="task-form">
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" name="description" required class="form-input" placeholder="What needs to be done?" value="${router.escapeHtml(task.description)}">
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select name="priority" class="form-input">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" name="due_date" class="form-input" value="${task.due_date || ''}">
                </div>
                <div class="form-group">
                    <label>Project (optional)</label>
                    <select name="project_id" class="form-input" id="edit-task-project-select">
                        <option value="">No Project</option>
                    </select>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" name="done" ${task.done ? 'checked' : ''}>
                        Mark as completed
                    </label>
                </div>
                <input type="hidden" name="id" value="${task.id}">
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Update Task</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    loadProjectsForEditSelect(task.project_id);
}

async function loadProjectsForEditSelect(currentProjectId) {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        const select = document.getElementById('edit-task-project-select');
        if (select && projects.length > 0) {
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                if (project.id === currentProjectId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

async function updateTask(event, taskId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Set done value properly
    if (form.querySelector('input[name="done"]').checked) {
        formData.set('done', 'on');
    } else {
        formData.set('done', '');
    }
    
    // Clean up empty project_id
    if (!formData.get('project_id')) {
        formData.delete('project_id');
    }
    
    try {
        const response = await fetch('/updatetasks', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: formData
        });
        
        if (response.ok) {
            form.closest('.modal').remove();
            await router.loadTasks();
            await router.loadOverviewStats();
        } else {
            const contentType = response.headers.get('content-type');
            let errorMessage = 'Failed to update task';
            
            if (contentType && contentType.includes('application/json')) {
                const errorJson = await response.json();
                errorMessage = errorJson.error || errorJson.message || errorMessage;
            }
            
            console.error('Server error:', errorMessage);
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Failed to update task:', error);
        alert('Network error: ' + error.message);
    }
}

function createProject() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create New Project</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <form onsubmit="submitProject(event)" class="task-form">
                <div class="form-group">
                    <label>Project Name *</label>
                    <input type="text" name="name" required class="form-input" placeholder="Enter project name">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" class="form-input" rows="3" placeholder="Project description..."></textarea>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="form-input">
                        <option value="active">Active</option>
                        <option value="planning">Planning</option>
                        <option value="completed">Completed</option>
                        <option value="paused">Paused</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" name="due_date" class="form-input">
                </div>
                <div class="form-group">
                    <label>Team Members</label>
                    <input type="number" name="team_members" min="0" value="1" class="form-input">
                </div>
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Create Project</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitProject(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/projects/create', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            form.closest('.modal').remove();
            await router.loadProjects();
            await router.loadOverviewStats();
        } else {
            alert('Failed to create project. Please try again.');
        }
    } catch (error) {
        console.error('Failed to create project:', error);
        alert('Failed to create project. Please try again.');
    }
}

function showEditProjectModal(project) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Project</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <form onsubmit="updateProject(event, ${project.id})" class="task-form">
                <div class="form-group">
                    <label>Project Name *</label>
                    <input type="text" name="name" required class="form-input" placeholder="Enter project name" value="${router.escapeHtml(project.name)}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" class="form-input" rows="3" placeholder="Project description...">${router.escapeHtml(project.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="form-input">
                        <option value="active" ${project.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="planning" ${project.status === 'planning' ? 'selected' : ''}>Planning</option>
                        <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="paused" ${project.status === 'paused' ? 'selected' : ''}>Paused</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" name="due_date" class="form-input" value="${project.due_date || ''}">
                </div>
                <div class="form-group">
                    <label>Team Members</label>
                    <input type="number" name="team_members" min="0" value="${project.team_members || 1}" class="form-input">
                </div>
                <input type="hidden" name="id" value="${project.id}">
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Update Project</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function updateProject(event, projectId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/projects/update', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            form.closest('.modal').remove();
            await router.loadProjects();
            await router.loadOverviewStats();
        } else {
            alert('Failed to update project. Please try again.');
        }
    } catch (error) {
        console.error('Failed to update project:', error);
        alert('Failed to update project. Please try again.');
    }
}

function createNote() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create New Note</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <form onsubmit="submitNote(event)" class="task-form">
                <div class="form-group">
                    <label>Title *</label>
                    <input type="text" name="title" required class="form-input" placeholder="Note title">
                </div>
                <div class="form-group">
                    <label>Content</label>
                    <textarea name="content" class="form-input" rows="6" placeholder="Write your note here..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Create Note</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitNote(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/notes/create', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            form.closest('.modal').remove();
            await router.loadNotes();
        } else {
            alert('Failed to create note. Please try again.');
        }
    } catch (error) {
        console.error('Failed to create note:', error);
        alert('Failed to create note. Please try again.');
    }
}

function showEditNoteModal(note) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Note</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
            </div>
            <form onsubmit="updateNote(event, ${note.id})" class="task-form">
                <div class="form-group">
                    <label>Title *</label>
                    <input type="text" name="title" required class="form-input" placeholder="Note title" value="${router.escapeHtml(note.title)}">
                </div>
                <div class="form-group">
                    <label>Content</label>
                    <textarea name="content" class="form-input" rows="6" placeholder="Write your note here...">${router.escapeHtml(note.content || '')}</textarea>
                </div>
                <input type="hidden" name="id" value="${note.id}">
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Update Note</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function updateNote(event, noteId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/notes/update', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            form.closest('.modal').remove();
            await router.loadNotes();
        } else {
            alert('Failed to update note. Please try again.');
        }
    } catch (error) {
        console.error('Failed to update note:', error);
        alert('Failed to update note. Please try again.');
    }
}

function exportReport() {
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

This is a basic report. Enhanced reporting features coming soon!`;

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
    alert('Document upload feature coming soon!');
}

// ============================================================================
// GLOBAL VARIABLES AND FUNCTIONS
// ============================================================================

// Global router instance
let router;

// Global navigation function
function navigateTo(route) {
    if (router) {
        router.navigateTo(route);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize router
    router = new TaskLiftRouter();

    // Mobile sidebar toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebar = document.querySelector('.sidebar');
    
    function toggleSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        }
    }
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
    
    // Close sidebar when clicking nav links on mobile
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });

    // Toggle buttons in analytics card
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Filter buttons setup
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.closest('.project-filters, .task-filters');
            if (parent) {
                parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Handle task filtering
                if (parent.classList.contains('task-filters')) {
                    const filter = this.getAttribute('data-filter');
                    if (router) {
                        router.filterTasks(filter);
                    }
                }
            }
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            // Simple search - filter visible tasks
            const taskItems = document.querySelectorAll('.task-item');
            taskItems.forEach(item => {
                const description = item.querySelector('.task-description');
                if (description) {
                    const text = description.textContent.toLowerCase();
                    item.style.display = text.includes(query) ? 'flex' : 'none';
                }
            });
        });
    }
});