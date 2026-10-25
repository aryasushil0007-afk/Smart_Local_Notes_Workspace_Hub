(() => {
  "use strict";

  const STORAGE_KEY = "notenest_workspace_v1";
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#notesGrid");
  const dialog = $("#noteDialog");
  const form = $("#noteForm");
  const toast = $("#toast");

  let notes = loadNotes();
  let activeFilter = "All";
  let searchTerm = "";
  let toastTimer;

  function makeId() {
    return window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function isValidNote(item) {
    return item && typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.content === "string" &&
      typeof item.category === "string" &&
      Array.isArray(item.tags) &&
      item.tags.every(tag => typeof tag === "string") &&
      typeof item.pinned === "boolean" &&
      typeof item.createdAt === "string" &&
      typeof item.updatedAt === "string";
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Stored notes must be an array.");
      // Defensive validation: discard malformed records instead of crashing the app.
      return parsed.filter(isValidNote);
    } catch (error) {
      console.warn("Saved notes could not be read. Starting with an empty workspace.", error);
      return [];
    }
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      return true;
    } catch (error) {
      console.error("Could not save notes to localStorage.", error);
      showToast("Could not save. Browser storage may be full or disabled.");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Recently";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }

  function render() {
    const normalized = searchTerm.trim().toLowerCase();
    let visibleNotes = notes.filter(note => {
      const filterMatch = activeFilter === "All" ||
        (activeFilter === "Pinned" ? note.pinned : note.category === activeFilter);
      const searchMatch = !normalized ||
        [note.title, note.content, note.category, ...note.tags].join(" ").toLowerCase().includes(normalized);
      return filterMatch && searchMatch;
    });

    visibleNotes = visibleNotes.sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      if ($("#sortSelect").value === "title") return a.title.localeCompare(b.title);
      if ($("#sortSelect").value === "created") return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    // Higher-order methods drive the UI and summary statistics.
    const categoryCount = new Set(notes.map(note => note.category)).size;
    const today = new Date().toDateString();
    $("#totalStat").textContent = notes.length;
    $("#pinnedStat").textContent = notes.filter(note => note.pinned).length;
    $("#todayStat").textContent = notes.filter(note => new Date(note.updatedAt).toDateString() === today).length;
    $("#categoryStat").textContent = categoryCount;
    $("#navCount").textContent = notes.length;
    $("#resultsLabel").textContent = `${visibleNotes.length} ${visibleNotes.length === 1 ? "note" : "notes"} found`;

    grid.innerHTML = visibleNotes.map(note => {
      const categoryClass = note.category.toLowerCase().replace(/[^a-z]/g, "");
      const tags = note.tags.map(tag => `<span class="tag">#${escapeHTML(tag)}</span>`).join("");
      return `
        <article class="note-card" data-id="${escapeHTML(note.id)}">
          <div class="note-card-top">
            <span class="category-pill ${categoryClass}">${escapeHTML(note.category)}</span>
            ${note.pinned ? '<span class="pin-mark" title="Pinned">★</span>' : ""}
          </div>
          <h3>${escapeHTML(note.title)}</h3>
          <p class="note-excerpt">${escapeHTML(note.content)}</p>
          ${tags ? `<div class="tag-list">${tags}</div>` : ""}
          <div class="note-card-bottom">
            <span class="note-date">Updated ${formatDate(note.updatedAt)}</span>
            <div class="card-actions">
              <button type="button" data-action="pin" title="${note.pinned ? "Unpin" : "Pin"} note" aria-label="${note.pinned ? "Unpin" : "Pin"} ${escapeHTML(note.title)}">${note.pinned ? "★" : "☆"}</button>
              <button type="button" data-action="edit" title="Edit note" aria-label="Edit ${escapeHTML(note.title)}">✎</button>
              <button type="button" data-action="delete" title="Delete note" aria-label="Delete ${escapeHTML(note.title)}">⌫</button>
            </div>
          </div>
        </article>`;
    }).join("");

    const noNotes = visibleNotes.length === 0;
    $("#emptyState").hidden = !noNotes;
    grid.hidden = noNotes;
    if (noNotes) {
      $("#emptyTitle").textContent = notes.length ? "No notes match this view" : "Your workspace is waiting";
      $("#emptyText").textContent = notes.length ? "Try another search or category filter." : "Create your first note and make this space yours.";
      $("#emptyCreateBtn").style.display = notes.length ? "none" : "inline-flex";
    }
    $("#pageTitle").textContent = activeFilter === "All" ? "All notes" : activeFilter === "Pinned" ? "Pinned notes" : `${activeFilter} notes`;
    $("#sectionTitle").textContent = activeFilter === "All" ? "Recent notes" : $("#pageTitle").textContent;
    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle("active", button.id === "allNotesNav" ? activeFilter === "All" : button.dataset.filter === activeFilter);
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function openNewNote() {
    form.reset();
    $("#noteId").value = "";
    $("#modalTitle").textContent = "Create a note";
    $("#formError").textContent = "";
    $("#noteCategory").value = activeFilter !== "All" && activeFilter !== "Pinned" ? activeFilter : "Personal";
    dialog.showModal();
    $("#noteTitle").focus();
  }

  function openEditNote(id) {
    const note = notes.find(item => item.id === id);
    if (!note) return;
    $("#noteId").value = note.id;
    $("#noteTitle").value = note.title;
    $("#noteCategory").value = note.category;
    $("#noteTags").value = note.tags.join(", ");
    $("#noteContent").value = note.content;
    $("#notePinned").checked = note.pinned;
    $("#modalTitle").textContent = "Edit note";
    $("#formError").textContent = "";
    dialog.showModal();
    $("#noteTitle").focus();
  }

  $("#newNoteBtn").addEventListener("click", openNewNote);
  $("#emptyCreateBtn").addEventListener("click", openNewNote);
  $("#closeDialog").addEventListener("click", () => dialog.close());
  $("#cancelDialog").addEventListener("click", () => dialog.close());
  $("#allNotesNav").addEventListener("click", () => { activeFilter = "All"; render(); });
  document.querySelectorAll(".nav-item[data-filter]").forEach(button => {
    button.addEventListener("click", () => { activeFilter = button.dataset.filter; render(); });
  });
  $("#searchInput").addEventListener("input", event => { searchTerm = event.target.value; render(); });
  $("#sortSelect").addEventListener("change", render);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const title = $("#noteTitle").value.trim();
    const content = $("#noteContent").value.trim();
    if (!title || !content) {
      $("#formError").textContent = "Please add both a title and note content.";
      return;
    }
    const now = new Date().toISOString();
    const existingId = $("#noteId").value;
    const tags = [...new Set($("#noteTags").value.split(",").map(tag => tag.trim()).filter(Boolean))].slice(0, 12);
    if (existingId) {
      const index = notes.findIndex(note => note.id === existingId);
      if (index < 0) { $("#formError").textContent = "This note no longer exists. Please close and try again."; return; }
      notes[index] = { ...notes[index], title, content, category: $("#noteCategory").value, tags, pinned: $("#notePinned").checked, updatedAt: now };
    } else {
      notes.unshift({ id: makeId(), title, content, category: $("#noteCategory").value, tags, pinned: $("#notePinned").checked, createdAt: now, updatedAt: now });
    }
    if (saveNotes()) {
      dialog.close();
      render();
      showToast(existingId ? "Note updated and saved." : "Note created and saved.");
    }
  });

  grid.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest("[data-id]");
    const id = card?.dataset.id;
    const action = button.dataset.action;
    if (action === "edit") openEditNote(id);
    if (action === "pin") {
      const note = notes.find(item => item.id === id);
      if (!note) return;
      note.pinned = !note.pinned;
      note.updatedAt = new Date().toISOString();
      if (saveNotes()) { render(); showToast(note.pinned ? "Note pinned." : "Note unpinned."); }
    }
    if (action === "delete") {
      const note = notes.find(item => item.id === id);
      if (!note) return;
      if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
      notes = notes.filter(item => item.id !== id);
      if (saveNotes()) { render(); showToast("Note deleted."); }
    }
  });

  $("#exportBtn").addEventListener("click", () => {
    try {
      const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `notenest-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("JSON backup exported.");
    } catch (error) { showToast("Could not export backup."); }
  });

  $("#importInput").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported) || !imported.every(isValidNote)) {
        throw new Error("Invalid note backup format.");
      }
      if (!window.confirm(`Import ${imported.length} notes? This will replace the notes currently in this browser.`)) return;
      notes = imported;
      if (saveNotes()) { activeFilter = "All"; searchTerm = ""; $("#searchInput").value = ""; render(); showToast("Backup imported successfully."); }
    } catch (error) {
      showToast("Import failed: invalid or corrupted JSON backup.");
    } finally { event.target.value = ""; }
  });

  // Keep this tab synchronized if localStorage changes in another tab.
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      notes = loadNotes();
      render();
      showToast("Workspace synced from another tab.");
    }
  });

  render();
})(); 
