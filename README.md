# Smart Local Notes & Workspace Hub

A responsive notes workspace built with HTML, CSS, and vanilla JavaScript.

## Run the project
1. Extract the `Smart_Local_Notes_Workspace_Hub` folder.
2. Open the folder in VS Code.
3. Open `index.html` in a browser, or use the VS Code **Live Server** extension and choose **Open with Live Server**.

No Node.js, package installation, or backend is required.

## Features
- Create, read, update, pin, and delete notes (CRUD).
- Saves notes in browser `localStorage`; state reloads on startup.
- Defensive `JSON.parse()` handling and record validation.
- JSON backup export and import.
- Search notes by title, content, category, or tags.
- Filter by category and pinned status; sort by update date, creation date, or title.
- Responsive layout for desktop, tablet, and mobile.
- Summary stats use `map`, `filter`, and `Set`; note cards render from array data.
- HTML output is escaped before rendering user-entered note text.

## Storage note
Notes are stored only in the current browser profile and on this device. Clearing browser site data can remove them, so use **Export backup (JSON)** to keep a copy. This is local browser storage, not cloud sync.

## Project files
- `index.html` — page structure and note editor dialog
- `style.css` — visual design and responsive styling
- `app.js` — CRUD logic, JSON serialization, localStorage persistence, filtering, and rendering
