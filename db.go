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

	// Use the createBasicSchema function from main.go to create tables
	log.Println("Creating database schema...")
	createBasicSchema()

	// Then execute data.sql to add sample data (optional)
	if _, err := os.Stat("data.sql"); err == nil {
		log.Println("Adding sample data...")
		data, err := os.ReadFile("data.sql")
		if err != nil {
			log.Println("Warning: Failed to read data.sql:", err)
			return
		}

		_, err = DB.Exec(string(data))
		if err != nil {
			log.Println("Warning: Failed to execute data.sql:", err)
			log.Println("This might be normal if data already exists")
			return
		}
		log.Println("Sample data added successfully")
	} else {
		log.Println("No data.sql found, skipping sample data")
	}
}
