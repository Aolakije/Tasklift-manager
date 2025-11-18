package main

import (
	"log"
	"net/http"
	"os"
	"task-manager/handlers"
	"task-manager/middleware"

	_ "github.com/mattn/go-sqlite3"
)

func createBasicSchema() {
	// Fallback basic schema if schema.sql is not found
	basicSchema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE,
		password TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS projects (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		status TEXT DEFAULT 'active',
		progress INTEGER DEFAULT 0,
		due_date DATE,
		team_members INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		project_id INTEGER,
		description TEXT NOT NULL,
		priority TEXT DEFAULT 'medium',
		done BOOLEAN DEFAULT 0,
		due_date DATE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (project_id) REFERENCES projects(id)
	);

	CREATE TABLE IF NOT EXISTS documents (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		file_path TEXT NOT NULL,
		file_type TEXT,
		file_size INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS notes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		content TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	-- Insert test user
	INSERT OR IGNORE INTO users (id, username, email, password) VALUES 
	(1, 'testuser', 'test@example.com', 'test_password');
	`

	if _, err := DB.Exec(basicSchema); err != nil {
		log.Fatal("Failed to create basic schema:", err)
	}
}

func main() {
	// Initialize DB and schema
	InitDB()

	// Give the DB to the handlers package
	handlers.InitAuthHandler(DB)

	mux := http.NewServeMux()

	// Static files
	fileServer := http.FileServer(http.Dir("./static"))
	mux.Handle("/static/", http.StripPrefix("/static", fileServer))

	// Serve landing page at root
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "templates/homepage.html")
	})

	// Auth routes
	mux.HandleFunc("/login", handlers.Login)
	mux.HandleFunc("/register", handlers.Register)
	mux.HandleFunc("/logout", handlers.Logout)

	// Dashboard routes
	mux.HandleFunc("/dashboard", middleware.RequireAuth(handlers.Dashboard))
	mux.HandleFunc("/overview", handlers.Dashboard) // Alias to dashboard

	// Task management routes
	mux.HandleFunc("/api/tasks", handlers.APITasks)
	mux.HandleFunc("/tasks", handlers.ListTasks)
	mux.HandleFunc("/createtasks", handlers.CreateTask)
	mux.HandleFunc("/updatetasks", handlers.UpdateTask)
	mux.HandleFunc("/deletetasks", handlers.DeleteTask)

	// Project management routes
	mux.HandleFunc("/api/projects", handlers.ListProjects)
	mux.HandleFunc("/api/projects/create", handlers.CreateProject)
	mux.HandleFunc("/api/projects/update", handlers.UpdateProject)
	mux.HandleFunc("/api/projects/delete", handlers.DeleteProject)

	// Note management routes
	mux.HandleFunc("/api/notes", handlers.ListNotes)
	mux.HandleFunc("/api/notes/create", handlers.CreateNote)
	mux.HandleFunc("/api/notes/update", handlers.UpdateNote)
	mux.HandleFunc("/api/notes/delete", handlers.DeleteNote)

	// Document management routes (placeholder for now)
	mux.HandleFunc("/api/analytics", handlers.APIAnalytics)
	mux.HandleFunc("/analytics", handlers.Analytics)

	// Document routes (protected)
	mux.HandleFunc("/documents", handlers.Documents)

	// Quick action routes (aliases for convenience)
	mux.HandleFunc("/create-task", handlers.CreateTask)
	mux.HandleFunc("/view-tasks", handlers.ListTasks)

	// Get port from environment variable (required by Render)
	port := os.Getenv("PORT")
	if port == "" {
		port = "5050" // fallback for local development
	}

	log.Printf("Starting TaskLift server on port %s\n", port)
	log.Println("Features available:")
	log.Println("  - Task Management (CRUD operations)")
	log.Println("  - Project Management (CRUD operations)")
	log.Println("  - Note Management (CRUD operations)")
	log.Println("  - Analytics Dashboard")
	log.Println("  - Client-side routing")

	err := http.ListenAndServe(":"+port, mux)
	if err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
