package handlers

import (
	"database/sql"
	"html/template"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var DB *sql.DB

func InitAuthHandler(db *sql.DB) {
	DB = db
}

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		http.ServeFile(w, r, "./templates/login.html")
		return
	}

	if r.Method == http.MethodPost {
		loginInput := r.FormValue("usernameorEmail")
		password := r.FormValue("password")

		if loginInput == "" || password == "" {
			http.Error(w, "Username and password required", http.StatusBadRequest)
			return
		}

		var storedHashedPassword, storedUsername string
		err := DB.QueryRow("SELECT username, password FROM users WHERE username = ? OR email = ?",
			loginInput, loginInput).Scan(&storedUsername, &storedHashedPassword)

		if err == sql.ErrNoRows {
			http.Error(w, "Invalid username or password", http.StatusUnauthorized)
			return
		} else if err != nil {
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}

		// Compare the provided password with the stored hashed password
		err = bcrypt.CompareHashAndPassword([]byte(storedHashedPassword), []byte(password))
		if err != nil {
			http.Error(w, "Invalid username or password", http.StatusUnauthorized)
			return
		}

		// Success - Set session cookie with username
		http.SetCookie(w, &http.Cookie{
			Name:     "session_user",
			Value:    storedUsername,
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // change to true if using HTTPS
			Expires:  time.Now().Add(24 * time.Hour),
		})

		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
	}
}

func Register(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "text/html")
		http.ServeFile(w, r, "./templates/register.html")
		return
	}

	if r.Method == http.MethodPost {
		username := r.FormValue("username")
		email := r.FormValue("email")
		password := r.FormValue("password")
		confirm := r.FormValue("confirmPassword")

		if username == "" || email == "" || password == "" || confirm == "" {
			http.Error(w, "All fields are required", http.StatusBadRequest)
			return
		}

		// Check if passwords match
		if password != confirm {
			http.Error(w, "Passwords do not match", http.StatusBadRequest)
			return
		}

		// Hash the password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}

		// Store the HASHED password in the database
		stmt, err := DB.Prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer stmt.Close()

		// Use hashedPassword, NOT the plain password
		_, err = stmt.Exec(username, email, string(hashedPassword))
		if err != nil {
			http.Error(w, "Username or email already exists", http.StatusConflict)
			return
		}

		http.Redirect(w, r, "/login", http.StatusSeeOther)
	}
}

func Dashboard(w http.ResponseWriter, r *http.Request) {
	// Get the session cookie
	cookie, err := r.Cookie("session_user")
	if err != nil || cookie.Value == "" {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	username := cookie.Value

	// Serve the dashboard template with the username
	tmpl, err := template.ParseFiles("./templates/dashboard.html")
	if err != nil {
		http.Error(w, "Could not load dashboard", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, struct {
		Username string
	}{
		Username: username,
	})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	// Clear the cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_user",
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
	})

	http.Redirect(w, r, "/login", http.StatusSeeOther)
}
