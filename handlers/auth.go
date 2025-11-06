package handlers

import (
	"database/sql"
	"html/template"
	"net/http"
	"time"
	// "golang.org/x/crypto/bcrypt"
)

var DB *sql.DB

func InitAuthHandler(db *sql.DB) {
	DB = db
}

// Middleware to check authentication
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, err := getCurrentUserID(r)
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next(w, r)
	}
}

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		http.ServeFile(w, r, "./templates/login.html")
		return
	}

	if r.Method == http.MethodPost {
		Logininput := r.FormValue("usernameorEmail")
		password := r.FormValue("password")

		if Logininput == "" || password == "" {
			http.Error(w, "Username and password required", http.StatusBadRequest)
			return
		}
		var storedPassword, storedUsername string
		err := DB.QueryRow("SELECT username, password FROM users WHERE username = ? OR email = ?", Logininput, Logininput).Scan(&storedUsername, &storedPassword)
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid username or password", http.StatusUnauthorized)
			return
		} else if err != nil {
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}

		if storedPassword != password {
			http.Error(w, "Invalid username or password", http.StatusUnauthorized)
			return
		}

		// err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
		// if err != nil {
		// 	http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		// 	return
		// }

		// Success
		// Set session cookie with username
		http.SetCookie(w, &http.Cookie{
			Name:     "session_user",
			Value:    storedUsername,
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // change to true if using HTTPS
			Expires:  time.Now().Add(24 * time.Hour),
		})
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther) // Change to your actual post-login route
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
			http.Error(w, "Username and password are required", http.StatusBadRequest)
			return
		}

		// hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		// if err != nil {
		// 	http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		// 	return
		// }

		stmt, err := DB.Prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		defer stmt.Close()

		_, err = stmt.Exec(username, email, password)
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
