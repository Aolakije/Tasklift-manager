package handlers

import (
	"database/sql"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"time"
)

// Enhanced structs
type Task struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	ProjectID   *int   `json:"project_id,omitempty"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	Done        bool   `json:"done"`
	DueDate     string `json:"due_date,omitempty"`
	CreatedAt   string `json:"created_at"`
	ProjectName string `json:"project_name,omitempty"`
}

type Project struct {
	ID             int    `json:"id"`
	UserID         int    `json:"user_id"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	Status         string `json:"status"` // active, completed, paused, cancelled
	Progress       int    `json:"progress"`
	DueDate        string `json:"due_date,omitempty"`
	CreatedAt      string `json:"created_at"`
	TaskCount      int    `json:"task_count"`
	CompletedTasks int    `json:"completed_tasks"`
	TeamMembers    int    `json:"team_members"` // <--- new field

}

type Document struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	Title     string `json:"title"`
	FilePath  string `json:"file_path"`
	FileType  string `json:"file_type"`
	FileSize  int64  `json:"file_size"`
	CreatedAt string `json:"created_at"`
}

type Note struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// Task Handlers
func ListTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET allowed", http.StatusMethodNotAllowed)
		return
	}

	// Query that matches your actual database schema
	query := `
		SELECT t.id, t.user_id, t.project_id, t.description, t.priority, t.done, 
		       COALESCE(t.due_date, ''), t.created_at, COALESCE(p.name, '')
		FROM tasks t 
		LEFT JOIN projects p ON t.project_id = p.id 
		WHERE t.user_id = ?
		ORDER BY t.created_at DESC`

	rows, err := DB.Query(query, 1) // TODO: Get from session
	if err != nil {
		log.Printf("Query error: %v", err)
		http.Error(w, "Failed to retrieve tasks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tasks := make([]Task, 0)
	for rows.Next() {
		var task Task
		var projectID sql.NullInt64
		var dueDate, createdAt sql.NullString

		// Scan all columns in the correct order
		err := rows.Scan(&task.ID, &task.UserID, &projectID, &task.Description,
			&task.Priority, &task.Done, &dueDate, &createdAt, &task.ProjectName)

		if err != nil {
			log.Printf("Scan error: %v", err)
			continue // Skip this row but continue with others
		}

		// Handle nullable fields
		if projectID.Valid {
			pid := int(projectID.Int64)
			task.ProjectID = &pid
		}
		if dueDate.Valid {
			task.DueDate = dueDate.String
		}
		if createdAt.Valid {
			task.CreatedAt = createdAt.String
		}

		// Ensure priority has a default value
		if task.Priority == "" {
			task.Priority = "medium"
		}

		tasks = append(tasks, task)
	}

	// Check if this is an API request
	if r.URL.Path == "/api/tasks" || r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tasks)
		return
	}

	// Return HTML template for regular requests
	tmpl, err := template.ParseFiles("templates/list_tasks.html")
	if err != nil {
		http.Error(w, "Template error", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, tasks)
}

// Fixed CreateTask function
func CreateTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		http.ServeFile(w, r, "templates/create_task.html")
		return
	}

	if r.Method == http.MethodPost {
		userIDStr := r.FormValue("user_id")
		description := r.FormValue("description")
		priority := r.FormValue("priority")
		dueDate := r.FormValue("due_date")
		projectIDStr := r.FormValue("project_id")

		if userIDStr == "" || description == "" {
			http.Error(w, "User ID and description required", http.StatusBadRequest)
			return
		}

		// Set default priority if empty
		if priority == "" {
			priority = "medium"
		}

		// Handle project_id (can be empty)
		var projectID interface{}
		if projectIDStr != "" && projectIDStr != "0" {
			projectID = projectIDStr
		} else {
			projectID = nil
		}

		// Insert with all available columns
		_, err := DB.Exec(`
			INSERT INTO tasks (user_id, project_id, description, priority, due_date, done, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			userIDStr, projectID, description, priority, dueDate, false, time.Now(), time.Now())

		if err != nil {
			log.Printf("Create task error: %v", err)
			http.Error(w, "Failed to create task", http.StatusInternalServerError)
			return
		}

		// Return appropriate response
		if r.Header.Get("X-Requested-With") == "XMLHttpRequest" || r.URL.Path == "/api/tasks" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "created"})
			return
		}

		http.Redirect(w, r, "/tasks", http.StatusSeeOther)
	}
}

// Fixed UpdateTask function
func UpdateTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		http.ServeFile(w, r, "templates/update_task.html")
		return
	}

	if r.Method == http.MethodPost {
		id := r.FormValue("id")
		description := r.FormValue("description")
		priority := r.FormValue("priority")
		dueDate := r.FormValue("due_date")
		done := r.FormValue("done") == "on"

		if id == "" {
			http.Error(w, "Task ID required", http.StatusBadRequest)
			return
		}

		// Set default priority if empty
		if priority == "" {
			priority = "medium"
		}

		// Update with all available columns
		_, err := DB.Exec(`
			UPDATE tasks 
			SET description = ?, priority = ?, due_date = ?, done = ?, updated_at = ?
			WHERE id = ?`,
			description, priority, dueDate, done, time.Now(), id)

		if err != nil {
			log.Printf("Update task error: %v", err)
			http.Error(w, "Failed to update task", http.StatusInternalServerError)
			return
		}

		// Return appropriate response
		if r.Header.Get("X-Requested-With") == "XMLHttpRequest" || r.Referer() == "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
			return
		}

		http.Redirect(w, r, "/tasks", http.StatusSeeOther)
	}
}

// Fixed DeleteTask function
func DeleteTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		id := r.FormValue("id")
		if id == "" {
			http.Error(w, "Missing task ID", http.StatusBadRequest)
			return
		}

		_, err := DB.Exec("DELETE FROM tasks WHERE id = ?", id)
		if err != nil {
			log.Printf("Delete task error: %v", err)
			http.Error(w, "Failed to delete task", http.StatusInternalServerError)
			return
		}

		// Always return JSON for delete operations (since they're called via AJAX)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
	}
}

// API endpoint for tasks (handles both GET and POST)
func APITasks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "GET":
		// Forward to ListTasks with proper headers
		r.Header.Set("Accept", "application/json")
		ListTasks(w, r)

	case "POST":
		// Handle JSON task creation
		var task Task
		if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// Set defaults
		if task.Priority == "" {
			task.Priority = "medium"
		}

		_, err := DB.Exec(`
			INSERT INTO tasks (user_id, project_id, description, priority, due_date, done, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			1, task.ProjectID, task.Description, task.Priority, task.DueDate, task.Done, time.Now(), time.Now())

		if err != nil {
			log.Printf("API create task error: %v", err)
			http.Error(w, "Failed to create task", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "created"})
	}
}

// Enhanced Analytics
func APIAnalytics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var totalTasks, completedTasks, highPriorityTasks, totalProjects int

	// Get task statistics
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE user_id = ?", 1).Scan(&totalTasks)
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE done = 1 AND user_id = ?", 1).Scan(&completedTasks)
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE priority = 'high' AND user_id = ?", 1).Scan(&highPriorityTasks)

	// Get project statistics (will be 0 if projects table doesn't exist)
	DB.QueryRow("SELECT COUNT(*) FROM projects WHERE user_id = ?", 1).Scan(&totalProjects)

	completionRate := 0.0
	if totalTasks > 0 {
		completionRate = float64(completedTasks) / float64(totalTasks) * 100
	}

	analytics := map[string]interface{}{
		"total_tasks":         totalTasks,
		"completed_tasks":     completedTasks,
		"pending_tasks":       totalTasks - completedTasks,
		"high_priority_tasks": highPriorityTasks,
		"completion_rate":     completionRate,
		"total_projects":      totalProjects,
		"active_projects":     0, // Will be updated when projects are implemented
	}

	json.NewEncoder(w).Encode(analytics)
}

// Project Handlers
func CreateProject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	name := r.FormValue("name")
	description := r.FormValue("description")
	dueDate := r.FormValue("due_date")
	status := r.FormValue("status")
	teamMembersStr := r.FormValue("team_members")

	if name == "" {
		http.Error(w, "Project name required", http.StatusBadRequest)
		return
	}

	if status == "" {
		status = "active"
	}

	// Convert team_members to int, default to 0
	tm := 0
	if teamMembersStr != "" {
		if val, err := strconv.Atoi(teamMembersStr); err == nil {
			tm = val
		} else {
			http.Error(w, "Invalid value for team members", http.StatusBadRequest)
			return
		}
	}

	_, err := DB.Exec(`
		INSERT INTO projects (user_id, name, description, status, due_date, team_members, created_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		1, name, description, status, dueDate, tm, time.Now(), // TODO: replace 1 with session user_id
	)

	if err != nil {
		log.Println("Failed to create project:", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create project"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "created"})
}

func ListProjects(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := DB.Query(`
		SELECT p.id, p.name, p.description, p.status, p.progress, 
		       COALESCE(p.due_date, ''), p.created_at,
		       COUNT(t.id) as task_count,
		       COUNT(CASE WHEN t.done = 1 THEN 1 END) as completed_tasks,
		       p.team_members
		FROM projects p 
		LEFT JOIN tasks t ON p.id = t.project_id 
		WHERE p.user_id = ? 
		GROUP BY p.id, p.name, p.description, p.status, p.progress, p.due_date, p.created_at, p.team_members
		ORDER BY p.created_at DESC`, 1) // TODO: replace 1 with session user_id
	if err != nil {
		log.Println("DB query error:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to retrieve projects"})
		return
	}
	defer rows.Close()

	projects := make([]Project, 0)
	for rows.Next() {
		var project Project
		var dueDate sql.NullString
		var teamMembers sql.NullInt64

		err := rows.Scan(
			&project.ID, &project.Name, &project.Description,
			&project.Status, &project.Progress, &dueDate, &project.CreatedAt,
			&project.TaskCount, &project.CompletedTasks, &teamMembers,
		)
		if err != nil {
			log.Println("Row scan error:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to parse project data"})
			return
		}

		if dueDate.Valid {
			project.DueDate = dueDate.String
		}

		if teamMembers.Valid {
			project.TeamMembers = int(teamMembers.Int64)
		} else {
			project.TeamMembers = 0
		}

		// Calculate progress based on completed tasks
		if project.TaskCount > 0 {
			project.Progress = (project.CompletedTasks * 100) / project.TaskCount
		}

		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		log.Println("Rows iteration error:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error reading project rows"})
		return
	}

	json.NewEncoder(w).Encode(projects)
}
func UpdateProject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	id := r.FormValue("id")
	name := r.FormValue("name")
	description := r.FormValue("description")
	status := r.FormValue("status")
	dueDate := r.FormValue("due_date")
	teamMembersStr := r.FormValue("team_members")

	if id == "" || name == "" {
		http.Error(w, "Project ID and name required", http.StatusBadRequest)
		return
	}

	// Convert team_members to int, default to 0
	tm := 0
	if teamMembersStr != "" {
		if val, err := strconv.Atoi(teamMembersStr); err == nil {
			tm = val
		} else {
			http.Error(w, "Invalid value for team members", http.StatusBadRequest)
			return
		}
	}

	_, err := DB.Exec(`
		UPDATE projects 
		SET name = ?, description = ?, status = ?, due_date = ?, team_members = ?, updated_at = ? 
		WHERE id = ? AND user_id = ?`,
		name, description, status, dueDate, tm, time.Now(), id, 1, // TODO: use session user_id
	)

	if err != nil {
		log.Println("Failed to update project:", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update project"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func DeleteProject(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		id := r.FormValue("id")
		if id == "" {
			http.Error(w, "Project ID required", http.StatusBadRequest)
			return
		}

		// First, unlink tasks from this project
		_, err := DB.Exec("UPDATE tasks SET project_id = NULL WHERE project_id = ?", id)
		if err != nil {
			http.Error(w, "Failed to unlink tasks", http.StatusInternalServerError)
			return
		}

		// Then delete the project
		_, err = DB.Exec("DELETE FROM projects WHERE id = ? AND user_id = ?", id, 1) // TODO: Get user_id from session
		if err != nil {
			http.Error(w, "Failed to delete project", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
	}
}

// Note Handlers
func CreateNote(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		title := r.FormValue("title")
		content := r.FormValue("content")

		if title == "" {
			http.Error(w, "Note title required", http.StatusBadRequest)
			return
		}

		_, err := DB.Exec(`
			INSERT INTO notes (user_id, title, content, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?)`,
			1, title, content, time.Now(), time.Now()) // TODO: Get user_id from session

		if err != nil {
			http.Error(w, "Failed to create note", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "created"})
	}
}

func ListNotes(w http.ResponseWriter, r *http.Request) {
	rows, err := DB.Query(`
		SELECT id, title, content, created_at, updated_at 
		FROM notes 
		WHERE user_id = ? 
		ORDER BY updated_at DESC`, 1) // TODO: Get user_id from session

	if err != nil {
		http.Error(w, "Failed to retrieve notes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	notes := make([]Note, 0)
	for rows.Next() {
		var note Note
		err := rows.Scan(&note.ID, &note.Title, &note.Content, &note.CreatedAt, &note.UpdatedAt)
		if err != nil {
			http.Error(w, "Failed to scan note", http.StatusInternalServerError)
			return
		}
		notes = append(notes, note)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notes)
}

func UpdateNote(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		id := r.FormValue("id")
		title := r.FormValue("title")
		content := r.FormValue("content")

		if id == "" || title == "" {
			http.Error(w, "Note ID and title required", http.StatusBadRequest)
			return
		}

		_, err := DB.Exec(`
			UPDATE notes 
			SET title = ?, content = ?, updated_at = ? 
			WHERE id = ? AND user_id = ?`,
			title, content, time.Now(), id, 1) // TODO: Get user_id from session

		if err != nil {
			http.Error(w, "Failed to update note", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
	}
}

func DeleteNote(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		id := r.FormValue("id")
		if id == "" {
			http.Error(w, "Note ID required", http.StatusBadRequest)
			return
		}

		_, err := DB.Exec("DELETE FROM notes WHERE id = ? AND user_id = ?", id, 1) // TODO: Get user_id from session
		if err != nil {
			http.Error(w, "Failed to delete note", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
	}
}

// Document Handlers
func Documents(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// For now, return a simple HTML page showing documents
		rows, err := DB.Query(`
			SELECT id, title, file_type, file_size, created_at 
			FROM documents 
			WHERE user_id = ? 
			ORDER BY created_at DESC`, 1) // TODO: Get user_id from session

		if err != nil {
			http.Error(w, "Create new documents", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		documents := make([]Document, 0)
		for rows.Next() {
			var doc Document
			err := rows.Scan(&doc.ID, &doc.Title, &doc.FileType, &doc.FileSize, &doc.CreatedAt)
			if err != nil {
				http.Error(w, "Failed to scan document", http.StatusInternalServerError)
				return
			}
			documents = append(documents, doc)
		}

		// Return JSON for API calls
		if r.Header.Get("Accept") == "application/json" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(documents)
			return
		}

		// Return HTML template (create this later)
		w.Header().Set("Content-Type", "text/html")
		html := `
		<!DOCTYPE html>
		<html>
		<head>
			<title>Document Management</title>
			<link rel="stylesheet" href="/static/css/styles.css">
		</head>
		<body>
			<div class="container">
				<h1>Document Management</h1>
				<div class="actions">
					<button onclick="uploadDocument()">Upload Document</button>
					<a href="/dashboard" class="btn">Back to Dashboard</a>
				</div>
				<div id="documents-list">
		`

		if len(documents) == 0 {
			html += `<p>No documents uploaded yet.</p>`
		} else {
			html += `<div class="documents-grid">`
			for _, doc := range documents {
				html += `<div class="document-card">
					<h3>` + doc.Title + `</h3>
					<p>Type: ` + doc.FileType + `</p>
					<p>Size: ` + strconv.FormatInt(doc.FileSize, 10) + ` bytes</p>
					<p>Created: ` + doc.CreatedAt + `</p>
				</div>`
			}
			html += `</div>`
		}

		html += `
				</div>
			</div>
			<script>
				function uploadDocument() {
					alert('Document upload feature coming soon!');
				}
			</script>
		</body>
		</html>
		`

		w.Write([]byte(html))

	case http.MethodPost:
		// Placeholder for document upload
		http.Error(w, "Document upload not yet implemented", http.StatusNotImplemented)
	}
}

// Analytics Handler (HTML version)
func Analytics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get analytics data (reuse the existing APIAnalytics logic)
	var totalTasks, completedTasks, highPriorityTasks, totalProjects, activeProjects, totalNotes int

	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE user_id = ?", 1).Scan(&totalTasks)
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE done = 1 AND user_id = ?", 1).Scan(&completedTasks)
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE priority = 'high' AND user_id = ?", 1).Scan(&highPriorityTasks)
	DB.QueryRow("SELECT COUNT(*) FROM projects WHERE user_id = ?", 1).Scan(&totalProjects)
	DB.QueryRow("SELECT COUNT(*) FROM projects WHERE status = 'active' AND user_id = ?", 1).Scan(&activeProjects)
	DB.QueryRow("SELECT COUNT(*) FROM notes WHERE user_id = ?", 1).Scan(&totalNotes)

	completionRate := 0.0
	if totalTasks > 0 {
		completionRate = float64(completedTasks) / float64(totalTasks) * 100
	}

	pendingTasks := totalTasks - completedTasks

	w.Header().Set("Content-Type", "text/html")
	html := `
	<!DOCTYPE html>
	<html>
	<head>
		<title>TaskLift Analytics</title>
		<link rel="stylesheet" href="/static/css/styles.css">
		<style>
			.analytics-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
				gap: 20px;
				margin: 20px 0;
			}
			.analytics-card {
				background: white;
				border: 1px solid #ddd;
				border-radius: 8px;
				padding: 20px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}
			.metric-value {
				font-size: 2em;
				font-weight: bold;
				color: #2563eb;
			}
			.metric-label {
				color: #666;
				font-size: 0.9em;
			}
			.progress-bar {
				background: #f0f0f0;
				border-radius: 10px;
				height: 20px;
				margin: 10px 0;
				overflow: hidden;
			}
			.progress-fill {
				background: #2563eb;
				height: 100%;
				transition: width 0.3s ease;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<h1>Analytics Dashboard</h1>
			<a href="/dashboard" class="btn">Back to Dashboard</a>
			
			<div class="analytics-grid">
				<div class="analytics-card">
					<div class="metric-value">` + strconv.Itoa(totalTasks) + `</div>
					<div class="metric-label">Total Tasks</div>
				</div>
				
				<div class="analytics-card">
					<div class="metric-value">` + strconv.Itoa(completedTasks) + `</div>
					<div class="metric-label">Completed Tasks</div>
				</div>
				
				<div class="analytics-card">
					<div class="metric-value">` + strconv.Itoa(pendingTasks) + `</div>
					<div class="metric-label">Pending Tasks</div>
				</div>
				
				<div class="analytics-card">
					<div class="metric-value">` + strconv.Itoa(highPriorityTasks) + `</div>
					<div class="metric-label">High Priority Tasks</div>
				</div>
				
				<div class="analytics-card">
					<div class="metric-value">` + strconv.Itoa(totalProjects) + `</div>
					<div class="metric-label">Total Projects</div>
				</div>
				
				<div class="analytics-card">
					<div class="metric-value">` + strconv.Itoa(activeProjects) + `</div>
					<div class="metric-label">Active Projects</div>
				</div>
				
				<div class="analytics-card">
					<div class="metric-value">` + strconv.Itoa(totalNotes) + `</div>
					<div class="metric-label">Total Notes</div>
				</div>
				
				<div class="analytics-card">
					<div class="metric-value">` + strconv.FormatFloat(completionRate, 'f', 1, 64) + `%</div>
					<div class="metric-label">Task Completion Rate</div>
					<div class="progress-bar">
						<div class="progress-fill" style="width: ` + strconv.FormatFloat(completionRate, 'f', 1, 64) + `%"></div>
					</div>
				</div>
			</div>
			
			<div style="margin-top: 30px;">
				<h2>Quick Actions</h2>
				<div style="display: flex; gap: 10px; flex-wrap: wrap;">
					<a href="/createtasks" class="btn">Create New Task</a>
					<a href="/projects/create" class="btn">Create New Project</a>
					<a href="/notes/create" class="btn">Create New Note</a>
					<a href="/tasks" class="btn">View All Tasks</a>
				</div>
			</div>
		</div>
	</body>
	</html>
	`

	w.Write([]byte(html))
}
