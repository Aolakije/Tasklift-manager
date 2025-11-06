package handlers

import (
	"database/sql"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"task-manager/models"
	"time"
)

// Helper function to get current user ID from session
func getCurrentUserID(r *http.Request) (int, error) {
	cookie, err := r.Cookie("session_user")
	if err != nil {
		return 0, err
	}

	var userID int
	err = DB.QueryRow("SELECT id FROM users WHERE username = ?", cookie.Value).Scan(&userID)
	if err != nil {
		return 0, err
	}

	return userID, nil
}


// Task Handlers
func ListTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get current user ID
	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := `
		SELECT t.id, t.user_id, t.project_id, t.description, t.priority, t.done, 
		       COALESCE(t.due_date, ''), t.created_at, COALESCE(p.name, '')
		FROM tasks t 
		LEFT JOIN projects p ON t.project_id = p.id 
		WHERE t.user_id = ?
		ORDER BY t.created_at DESC`

	rows, err := DB.Query(query, userID)
	if err != nil {
		log.Printf("Query error: %v", err)
		http.Error(w, "Failed to retrieve tasks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tasks := make([]models.Task, 0)
	for rows.Next() {
		var task models.Task
		var projectID sql.NullInt64
		var dueDate, createdAt sql.NullString

		err := rows.Scan(&task.ID, &task.UserID, &projectID, &task.Description,
			&task.Priority, &task.Done, &dueDate, &createdAt, &task.ProjectName)

		if err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

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

		if task.Priority == "" {
			task.Priority = "medium"
		}

		tasks = append(tasks, task)
	}

	if r.URL.Path == "/api/tasks" || r.Header.Get("Accept") == "application/json" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tasks)
		return
	}

	tmpl, err := template.ParseFiles("templates/list_tasks.html")
	if err != nil {
		http.Error(w, "Template error", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, tasks)
}

func CreateTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		http.ServeFile(w, r, "templates/create_task.html")
		return
	}

	if r.Method == http.MethodPost {
		// Get current user ID
		userID, err := getCurrentUserID(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		description := r.FormValue("description")
		priority := r.FormValue("priority")
		dueDate := r.FormValue("due_date")
		projectIDStr := r.FormValue("project_id")

		if description == "" {
			http.Error(w, "Description required", http.StatusBadRequest)
			return
		}

		if priority == "" {
			priority = "medium"
		}

		var projectID interface{}
		if projectIDStr != "" && projectIDStr != "0" {
			projectID = projectIDStr
		} else {
			projectID = nil
		}

		_, err = DB.Exec(`
			INSERT INTO tasks (user_id, project_id, description, priority, due_date, done, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			userID, projectID, description, priority, dueDate, false, time.Now(), time.Now())

		if err != nil {
			log.Printf("Create task error: %v", err)
			http.Error(w, "Failed to create task", http.StatusInternalServerError)
			return
		}

		if r.Header.Get("X-Requested-With") == "XMLHttpRequest" || r.URL.Path == "/api/tasks" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "created"})
			return
		}

		http.Redirect(w, r, "/tasks", http.StatusSeeOther)
	}
}

func UpdateTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		http.ServeFile(w, r, "templates/update_task.html")
		return
	}

	if r.Method == http.MethodPost {
		userID, err := getCurrentUserID(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		id := r.FormValue("id")
		description := r.FormValue("description")
		priority := r.FormValue("priority")
		dueDate := r.FormValue("due_date")
		done := r.FormValue("done") == "on"

		if id == "" {
			http.Error(w, "Task ID required", http.StatusBadRequest)
			return
		}

		if priority == "" {
			priority = "medium"
		}

		_, err = DB.Exec(`
			UPDATE tasks 
			SET description = ?, priority = ?, due_date = ?, done = ?, updated_at = ?
			WHERE id = ? AND user_id = ?`,
			description, priority, dueDate, done, time.Now(), id, userID)

		if err != nil {
			log.Printf("Update task error: %v", err)
			http.Error(w, "Failed to update task", http.StatusInternalServerError)
			return
		}

		if r.Header.Get("X-Requested-With") == "XMLHttpRequest" || r.Referer() == "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
			return
		}

		http.Redirect(w, r, "/tasks", http.StatusSeeOther)
	}
}

func DeleteTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		userID, err := getCurrentUserID(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		id := r.FormValue("id")
		if id == "" {
			http.Error(w, "Missing task ID", http.StatusBadRequest)
			return
		}

		_, err = DB.Exec("DELETE FROM tasks WHERE id = ? AND user_id = ?", id, userID)
		if err != nil {
			log.Printf("Delete task error: %v", err)
			http.Error(w, "Failed to delete task", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
	}
}

func APITasks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case "GET":
		r.Header.Set("Accept", "application/json")
		ListTasks(w, r)

	case "POST":
		var task models.Task
		if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		if task.Priority == "" {
			task.Priority = "medium"
		}

		_, err := DB.Exec(`
			INSERT INTO tasks (user_id, project_id, description, priority, due_date, done, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			userID, task.ProjectID, task.Description, task.Priority, task.DueDate, task.Done, time.Now(), time.Now())

		if err != nil {
			log.Printf("API create task error: %v", err)
			http.Error(w, "Failed to create task", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "created"})
	}
}

func APIAnalytics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var totalTasks, completedTasks, highPriorityTasks, totalProjects int

	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE user_id = ?", userID).Scan(&totalTasks)
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE done = 1 AND user_id = ?", userID).Scan(&completedTasks)
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE priority = 'high' AND user_id = ?", userID).Scan(&highPriorityTasks)
	DB.QueryRow("SELECT COUNT(*) FROM projects WHERE user_id = ?", userID).Scan(&totalProjects)

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
		"active_projects":     0,
	}

	json.NewEncoder(w).Encode(analytics)
}

// Project Handlers
func CreateProject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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

	tm := 0
	if teamMembersStr != "" {
		if val, err := strconv.Atoi(teamMembersStr); err == nil {
			tm = val
		} else {
			http.Error(w, "Invalid value for team members", http.StatusBadRequest)
			return
		}
	}

	_, err = DB.Exec(`
		INSERT INTO projects (user_id, name, description, status, due_date, team_members, created_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID, name, description, status, dueDate, tm, time.Now())

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

	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

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
		ORDER BY p.created_at DESC`, userID)
	if err != nil {
		log.Println("DB query error:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to retrieve projects"})
		return
	}
	defer rows.Close()

	projects := make([]models.Project, 0)
	for rows.Next() {
		var project models.Project
		var dueDate sql.NullString
		var teamMembers sql.NullInt64

		err := rows.Scan(
			&project.ID, &project.Name, &project.Description,
			&project.Status, &project.Progress, &dueDate, &project.CreatedAt,
			&project.TaskCount, &project.CompletedTasks, &teamMembers,
		)
		if err != nil {
			log.Println("Row scan error:", err)
			continue
		}

		if dueDate.Valid {
			project.DueDate = dueDate.String
		}

		if teamMembers.Valid {
			project.TeamMembers = int(teamMembers.Int64)
		} else {
			project.TeamMembers = 0
		}

		if project.TaskCount > 0 {
			project.Progress = (project.CompletedTasks * 100) / project.TaskCount
		}

		projects = append(projects, project)
	}

	json.NewEncoder(w).Encode(projects)
}

func UpdateProject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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

	tm := 0
	if teamMembersStr != "" {
		if val, err := strconv.Atoi(teamMembersStr); err == nil {
			tm = val
		}
	}

	_, err = DB.Exec(`
		UPDATE projects 
		SET name = ?, description = ?, status = ?, due_date = ?, team_members = ?, updated_at = ? 
		WHERE id = ? AND user_id = ?`,
		name, description, status, dueDate, tm, time.Now(), id, userID)

	if err != nil {
		log.Println("Failed to update project:", err)
		http.Error(w, "Failed to update project", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func DeleteProject(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		userID, err := getCurrentUserID(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		id := r.FormValue("id")
		if id == "" {
			http.Error(w, "Project ID required", http.StatusBadRequest)
			return
		}

		_, err = DB.Exec("UPDATE tasks SET project_id = NULL WHERE project_id = ?", id)
		if err != nil {
			http.Error(w, "Failed to unlink tasks", http.StatusInternalServerError)
			return
		}

		_, err = DB.Exec("DELETE FROM projects WHERE id = ? AND user_id = ?", id, userID)
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
		userID, err := getCurrentUserID(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		title := r.FormValue("title")
		content := r.FormValue("content")

		if title == "" {
			http.Error(w, "Note title required", http.StatusBadRequest)
			return
		}

		_, err = DB.Exec(`
			INSERT INTO notes (user_id, title, content, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?)`,
			userID, title, content, time.Now(), time.Now())

		if err != nil {
			http.Error(w, "Failed to create note", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "created"})
	}
}

func ListNotes(w http.ResponseWriter, r *http.Request) {
	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := DB.Query(`
		SELECT id, title, content, created_at, updated_at 
		FROM notes 
		WHERE user_id = ? 
		ORDER BY updated_at DESC`, userID)

	if err != nil {
		http.Error(w, "Failed to retrieve notes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	notes := make([]models.Note, 0)
	for rows.Next() {
		var note models.Note
		err := rows.Scan(&note.ID, &note.Title, &note.Content, &note.CreatedAt, &note.UpdatedAt)
		if err != nil {
			continue
		}
		notes = append(notes, note)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notes)
}

func UpdateNote(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		userID, err := getCurrentUserID(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		id := r.FormValue("id")
		title := r.FormValue("title")
		content := r.FormValue("content")

		if id == "" || title == "" {
			http.Error(w, "Note ID and title required", http.StatusBadRequest)
			return
		}

		_, err = DB.Exec(`
			UPDATE notes 
			SET title = ?, content = ?, updated_at = ? 
			WHERE id = ? AND user_id = ?`,
			title, content, time.Now(), id, userID)

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
		userID, err := getCurrentUserID(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		id := r.FormValue("id")
		if id == "" {
			http.Error(w, "Note ID required", http.StatusBadRequest)
			return
		}

		_, err = DB.Exec("DELETE FROM notes WHERE id = ? AND user_id = ?", id, userID)
		if err != nil {
			http.Error(w, "Failed to delete note", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
	}
}

func Documents(w http.ResponseWriter, r *http.Request) {
	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	switch r.Method {
	case http.MethodGet:
		rows, err := DB.Query(`
			SELECT id, title, file_type, file_size, created_at 
			FROM documents 
			WHERE user_id = ? 
			ORDER BY created_at DESC`, userID)

		if err != nil {
			http.Error(w, "Failed to load documents", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		documents := make([]models.Document, 0)
		for rows.Next() {
			var doc models.Document
			err := rows.Scan(&doc.ID, &doc.Title, &doc.FileType, &doc.FileSize, &doc.CreatedAt)
			if err != nil {
				continue
			}
			documents = append(documents, doc)
		}

		if r.Header.Get("Accept") == "application/json" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(documents)
			return
		}

		w.Header().Set("Content-Type", "text/html")
		html := `<!DOCTYPE html><html><head><title>Documents</title></head><body><h1>Documents</h1>`
		if len(documents) == 0 {
			html += `<p>No documents uploaded yet.</p>`
		}
		html += `</body></html>`
		w.Write([]byte(html))

	case http.MethodPost:
		http.Error(w, "Document upload not yet implemented", http.StatusNotImplemented)
	}
}

func Analytics(w http.ResponseWriter, r *http.Request) {
	userID, err := getCurrentUserID(r)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	var totalTasks, completedTasks, highPriorityTasks, totalProjects, activeProjects, totalNotes int

	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE user_id = ?", userID).Scan(&totalTasks)
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE done = 1 AND user_id = ?", userID).Scan(&completedTasks)
	DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE priority = 'high' AND user_id = ?", userID).Scan(&highPriorityTasks)
	DB.QueryRow("SELECT COUNT(*) FROM projects WHERE user_id = ?", userID).Scan(&totalProjects)
	DB.QueryRow("SELECT COUNT(*) FROM projects WHERE status = 'active' AND user_id = ?", userID).Scan(&activeProjects)
	DB.QueryRow("SELECT COUNT(*) FROM notes WHERE user_id = ?", userID).Scan(&totalNotes)

	completionRate := 0.0
	if totalTasks > 0 {
		completionRate = float64(completedTasks) / float64(totalTasks) * 100
	}

	w.Header().Set("Content-Type", "text/html")
	html := `<!DOCTYPE html><html><head><title>Analytics</title></head><body>
		<h1>Analytics Dashboard</h1>
		<p>Total Tasks: ` + strconv.Itoa(totalTasks) + `</p>
		<p>Completed: ` + strconv.Itoa(completedTasks) + `</p>
		<p>Completion Rate: ` + strconv.FormatFloat(completionRate, 'f', 1, 64) + `%</p>
		</body></html>`
	w.Write([]byte(html))
}
