package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "./taskmanager.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	schema, err := os.ReadFile("data.sql")
	if err != nil {
		log.Fatal("Failed to read data.sql:", err)
	}

	_, err = DB.Exec(string(schema))
	if err != nil {
		log.Fatal("Failed to execute data.sql:", err)
	}
}
