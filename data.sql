-- Enhanced TaskLift Database Schema
-- File: schema.sql

-- Users table (enhanced)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Enhanced tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    done BOOLEAN DEFAULT 0,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activity log table (for tracking user actions)
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'completed'
    entity_type TEXT NOT NULL, -- 'task', 'project', 'note', 'document'
    entity_id INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);


-- Insert sample data for development/testing
INSERT OR IGNORE INTO users (id, username, email, password) VALUES 
(1, 'testuser', 'test@example.com', 'hashed_password_here');

-- -- Sample projects
-- INSERT OR IGNORE INTO projects (user_id, name, description, status, due_date) VALUES 
-- (1, 'Website Redesign', 'Modernize the company website with new design and functionality', 'active', '2025-04-15'),
-- (1, 'Mobile App Development', 'Develop cross-platform mobile application', 'active', '2025-06-30'),
-- (1, 'Marketing Campaign', 'Q2 marketing campaign planning and execution', 'active', '2025-03-31');

-- -- Sample tasks with different priorities and projects
-- INSERT OR IGNORE INTO tasks (user_id, project_id, description, priority, done, due_date) VALUES 
-- (1, 1, 'Design new homepage layout', 'high', 0, '2025-02-15'),
-- (1, 1, 'Implement responsive navigation', 'medium', 0, '2025-02-20'),
-- (1, 1, 'Optimize page loading speed', 'high', 1, '2025-02-10'),
-- (1, 2, 'Create app wireframes', 'high', 1, '2025-01-30'),
-- (1, 2, 'Set up development environment', 'medium', 1, '2025-02-01'),
-- (1, 2, 'Implement user authentication', 'high', 0, '2025-02-25'),
-- (1, 3, 'Research target audience', 'medium', 1, '2025-02-05'),
-- (1, 3, 'Create content calendar', 'low', 0, '2025-02-28'),
-- (1, NULL, 'Review quarterly reports', 'medium', 0, '2025-02-18'),
-- (1, NULL, 'Team meeting preparation', 'low', 1, '2025-02-08');

-- -- Sample notes
-- INSERT OR IGNORE INTO notes (user_id, title, content) VALUES 
-- (1, 'Meeting Notes - Client Call', 'Discussed project timeline and deliverables. Client wants to expedite the mobile app development phase. Key points: - Increase team size, - Focus on core features first, - Weekly progress reviews'),
-- (1, 'Ideas for Q2 Planning', 'Focus areas for next quarter: 1. Automation tools implementation, 2. Team expansion (2 new developers), 3. New client acquisition strategies, 4. Process optimization'),
-- (1, 'Technical Specifications', 'Database requirements: - PostgreSQL for production, - Redis for caching, - ElasticSearch for full-text search, - AWS S3 for file storage');

-- -- Sample documents (placeholders - actual files would be uploaded)
-- INSERT OR IGNORE INTO documents (user_id, title, file_path, file_type, file_size) VALUES 
-- (1, 'Project Requirements.pdf', '/uploads/project_requirements.pdf', 'application/pdf', 2621440),
-- (1, 'Analytics Report.xlsx', '/uploads/analytics_report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1258291),
-- (1, 'Design Mockups.zip', '/uploads/design_mockups.zip', 'application/zip', 15728640);

SELECT * FROM users;
SELECT * FROM projects;
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM notes;
SELECT COUNT(*) FROM documents;