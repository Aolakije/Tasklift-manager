package handlers

import (
	"html/template"
	"net/http"
)

type Task struct {
	ID          int
	UserID      int
	Description string
	Done        bool
}

func CreateTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		http.ServeFile(w, r, "templates/create_task.html")
		return
	}

	if r.Method == http.MethodPost {
		userIDStr := r.FormValue("user_id")
		description := r.FormValue("description")

		if userIDStr == "" || description == "" {
			http.Error(w, "All fields required", http.StatusBadRequest)
			return
		}

		_, err := DB.Exec("INSERT INTO tasks (user_id, description, done) VALUES (?, ?, ?)", userIDStr, description, false)
		if err != nil {
			http.Error(w, "Failed to create task", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/tasks", http.StatusSeeOther)
	}
}

func ListTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := DB.Query("SELECT id, user_id, description, done FROM tasks")
	if err != nil {
		http.Error(w, "Failed to retrieve tasks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var task Task
		if err := rows.Scan(&task.ID, &task.UserID, &task.Description, &task.Done); err != nil {
			http.Error(w, "Failed to scan task", http.StatusInternalServerError)
			return
		}
		tasks = append(tasks, task)
	}

	tmpl, err := template.ParseFiles("templates/list_tasks.html")
	if err != nil {
		http.Error(w, "Template error", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, tasks)
}
func UpdateTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		http.ServeFile(w, r, "templates/update_task.html")
		return
	}

	if r.Method == http.MethodPost {
		id := r.FormValue("id")
		description := r.FormValue("description")
		done := r.FormValue("done") == "on"

		if id == "" || description == "" {
			http.Error(w, "Missing fields", http.StatusBadRequest)
			return
		}

		_, err := DB.Exec("UPDATE tasks SET description = ?, done = ? WHERE id = ?", description, done, id)
		if err != nil {
			http.Error(w, "Failed to update task", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/tasks", http.StatusSeeOther)
	}
}
func DeleteTask(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		id := r.FormValue("id")
		if id == "" {
			http.Error(w, "Missing task ID", http.StatusBadRequest)
			return
		}

		_, err := DB.Exec("DELETE FROM tasks WHERE id = ?", id)
		if err != nil {
			http.Error(w, "Failed to delete task", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/tasks", http.StatusSeeOther)
	}
}
