# FirstCry Intellitots: Reading Progress & Phonics Milestone Tracker

A working prototype for a child reading level progression tracker, designed for preschool workflows. This repository provides a reference implementation for tracking milestones (letter recognition, phonics, word reading, sentence reading), processing teacher observations using simulated NLP/AI logic, and managing daycare center operations (admissions, attendance, routines, fees).

## Technology Stack

- **Frontend**: Vite + React, Vanilla CSS (Premium glassmorphic styling, Outfit & Inter fonts)
- **Backend**: Node.js + Express
- **Database**: SQLite (local database stored at `backend/intellitots.db`)
- **AI Layer**: Rule-based keyword matching & regex heuristics for unstructured observation parsing
- **Testing**: Node.js automated verification scripts

## Folder Structure

- `/frontend` - React application source code
- `/backend` - Express API, database setup, and AI processing rules
- `/docs` - System design and wireframe guidelines
- `/tests` - Backend API and business logic verification scripts

## Getting Started

### Backend
1. Go to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

### Frontend
1. Go to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```
