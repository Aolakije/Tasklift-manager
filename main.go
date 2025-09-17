package main

import (
	"log"
	"net/http"
	"task-manager/handlers"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Initialize DB and schema
 	InitDB()
	// Give the DB to the handlers package
	handlers.InitAuthHandler(DB)

	mux := http.NewServeMux()
	fileServer := http.FileServer(http.Dir("./static"))
	mux.Handle("/static/", http.StripPrefix("/static", fileServer))

	mux.HandleFunc("/", handlers.Register)
	mux.HandleFunc("/login", handlers.Login)
	mux.HandleFunc("/dashboard", handlers.Dashboard)
	mux.HandleFunc("/logout", handlers.Logout)
	mux.HandleFunc("/createtasks", handlers.CreateTask)
	mux.HandleFunc("/taskslist", handlers.ListTasks)
	mux.HandleFunc("/tasksupdate", handlers.UpdateTask)
	mux.HandleFunc("/tasksdelete", handlers.DeleteTask)
	log.Println("Starting new server on :5050")
	err := http.ListenAndServe(":5050", mux)
	log.Fatal(err)
}
