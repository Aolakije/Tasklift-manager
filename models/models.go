package models

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
	Status         string `json:"status"`
	Progress       int    `json:"progress"`
	DueDate        string `json:"due_date,omitempty"`
	CreatedAt      string `json:"created_at"`
	TaskCount      int    `json:"task_count"`
	CompletedTasks int    `json:"completed_tasks"`
	TeamMembers    int    `json:"team_members"`
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
