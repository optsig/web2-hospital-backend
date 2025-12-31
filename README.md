# web2-hospital-backend

Simple backend for a hospital appointment system built with Node.js, Express, and MySQL.

## Project Description

This repository contains a small REST API for managing users, doctors, patients, availabilities and appointments. It exposes endpoints to register and verify users, add/delete doctors, manage doctor availability, and book or cancel appointments.

The server uses Express and connects to a MySQL database. Passwords are hashed with bcrypt. Environment variables are used for database configuration.

## Prerequisites

- Node.js (v16+ recommended)
- npm (comes with Node.js)
- A MySQL-compatible database

## Setup

1. Clone the repository and change into the project directory:

```powershell
cd c:\Users\capta\OneDrive\Desktop\web2Sandbox\hospital-backend
```

2. Install dependencies:

```powershell
npm install
```

3. Create a `.env` file in the project root with the following variables (use your own values):

```
DB_HOST=your_db_host
DB_PORT=your_db_port
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

Note: A `.env` file is already listed in `.gitignore` to avoid committing secrets.

4. Ensure your database has the expected schema and tables (users, doctors, patients, availability, appointments). The server expects those tables; migrate or create them according to your own SQL schema.

## Running the server

Start the server with Node.js or nodemon (if you prefer automatic restarts during development):

```powershell
node index.js
# or, if you have nodemon installed:
npx nodemon index.js
```

The server listens on port `5000` by default (see `index.js`).

## Useful endpoints (examples)

- `POST /adduser` — create a new user
- `POST /verifyuser` — verify user credentials
- `GET /getdoctors` — list doctors
- `POST /adddoctor` — add a doctor
- `GET /getavailabilities` — list available slots
- `POST /bookappointment` — book an appointment

Refer to the route handlers in `index.js` for full parameter details and expected request bodies.

## Optional: Add a start script

You can add a `start` script to `package.json` for convenience:

```json
"scripts": {
	"start": "node index.js"
}
```

Then run `npm start`.

## Notes

- The project uses ES modules (`"type": "module"` in `package.json`), so ensure your Node.js version supports them.
- Do not commit real credentials. If you need, create a `.env.example` with placeholder values.