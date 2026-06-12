// AuraBoard - Main Application Controller

document.addEventListener('DOMContentLoaded', () => {
    // Add electron class helper
    if (window.electronAPI) {
        document.documentElement.classList.add('is-electron');
    }

    // --- Application State ---
    let state = {
        items: [],
        preferences: {
            shortcut: 'cmd_opt_v',
            maxHistory: 200,
            soundEnabled: true,
            launchLogin: false
        },
        searchQuery: '',
        activeEditorMode: 'note' // 'checklist', 'note'
    };

    // --- DOM Elements ---
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    const quickAddSection = document.getElementById('quickAddSection');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    const quickAddEditor = document.getElementById('quickAddEditor');
    const editorForm = document.getElementById('editorForm');
    const editItemId = document.getElementById('editItemId');
    const itemTitle = document.getElementById('itemTitle');
    const itemChecklistToggle = document.getElementById('itemChecklistToggle');
    
    // Editor section wrappers
    const checklistFields = document.getElementById('checklistEditorFields');
    const noteFields = document.getElementById('noteEditorFields');
    const checklistBuilder = document.getElementById('checklistBuilder');
    const addChecklistItemBtn = document.getElementById('addChecklistItemBtn');
    const noteContent = document.getElementById('noteContent');
    const editorMeta = document.getElementById('editorMeta');
    const cancelEditorBtn = document.getElementById('cancelEditorBtn');
    const saveEditorBtn = document.getElementById('saveEditorBtn');

    // Cards feed
    const cardsGrid = document.getElementById('cardsGrid');
    const noItemsState = document.getElementById('noItemsState');

    // Preferences Modal Elements
    const prefBtn = document.getElementById('prefBtn');
    const prefModal = document.getElementById('prefModal');
    const closePrefModal = document.getElementById('closePrefModal');
    const preferencesForm = document.getElementById('preferencesForm');
    const prefShortcut = document.getElementById('prefShortcut');
    const prefMaxHistory = document.getElementById('prefMaxHistory');
    const maxHistoryLabel = document.getElementById('maxHistoryLabel');
    const prefSoundEnabled = document.getElementById('prefSoundEnabled');
    const prefLaunchLogin = document.getElementById('prefLaunchLogin');
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');

    // --- Sound Initializer Gesture Hook ---
    // Make sure we initialize sound on first interaction
    document.body.addEventListener('click', () => {
        if (window.soundSynth) {
            window.soundSynth.init();
        }
    }, { once: true });

    // --- State Initialization & Persistence ---
    function loadState() {
        const savedItems = localStorage.getItem('auraboard_items');
        const savedPrefs = localStorage.getItem('auraboard_preferences');

        if (savedItems) {
            try {
                state.items = JSON.parse(savedItems);
            } catch (e) {
                console.error("Error parsing items from localStorage", e);
                state.items = [];
            }
        } else {
            // Seed welcome data if empty
            state.items = getWelcomeData();
            saveItemsToStorage();
        }

        if (savedPrefs) {
            try {
                state.preferences = { ...state.preferences, ...JSON.parse(savedPrefs) };
            } catch (e) {
                console.error("Error parsing preferences", e);
            }
        }
        
        // Sync Sound Synth Enabled Status
        if (window.soundSynth) {
            window.soundSynth.setEnabled(state.preferences.soundEnabled);
        }

        // Setup preference UI values
        prefShortcut.value = state.preferences.shortcut;
        prefMaxHistory.value = state.preferences.maxHistory;
        maxHistoryLabel.textContent = `Max History Items: ${state.preferences.maxHistory}`;
        prefSoundEnabled.checked = state.preferences.soundEnabled;
        prefLaunchLogin.checked = state.preferences.launchLogin;

        renderCards();
    }

    function saveItemsToStorage() {
        localStorage.setItem('auraboard_items', JSON.stringify(state.items));
    }

    function savePreferencesToStorage() {
        localStorage.setItem('auraboard_preferences', JSON.stringify(state.preferences));
        if (window.soundSynth) {
            window.soundSynth.setEnabled(state.preferences.soundEnabled);
        }
    }

    function getWelcomeData() {
        return [
            {
                id: 'welcome-1',
                type: 'checklist',
                title: '⚡ Getting Started with AuraBoard',
                isPinned: true,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                todos: [
                    { id: 't1', text: 'Click on a checklist checkbox directly from this card', completed: true },
                    { id: 't2', text: 'Create a new Checklist or Note using the editor above', completed: false },
                    { id: 't3', text: 'Toggle preferences to hear the custom synthesized sounds', completed: false },
                    { id: 't4', text: 'Pin cards to keep them at the top of your feed', completed: false }
                ]
            },
            {
                id: 'welcome-2',
                type: 'note',
                title: '💡 Quick Tip: Notes',
                isPinned: false,
                createdAt: new Date(Date.now() - 60000).toISOString(),
                modifiedAt: new Date(Date.now() - 60000).toISOString(),
                content: "AuraBoard is designed for frictionless copy-pasting. Hover over a note card to reveal edit, delete, and copy buttons.\n\nYou can store code snippets, paragraphs, or meeting minutes here."
            }
        ];
    }

    // --- Search & Filters Hook ---
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        renderCards();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderCards();
    });

    // --- Card Filtering & Rendering ---
    function renderCards() {
        // Clear grid
        cardsGrid.innerHTML = '';

        // Filter items
        let filteredItems = state.items.filter(item => {
            // Filter by search query
            if (state.searchQuery) {
                const titleMatch = item.title.toLowerCase().includes(state.searchQuery);
                
                let contentMatch = false;
                if (item.type === 'note' && item.content) {
                    contentMatch = item.content.toLowerCase().includes(state.searchQuery);
                } else if (item.type === 'checklist' && item.todos) {
                    contentMatch = item.todos.some(todo => todo.text.toLowerCase().includes(state.searchQuery));
                }

                return titleMatch || contentMatch;
            }

            return true;
        });

        // Sort items: Pinned first (modified descending), then others (modified descending)
        filteredItems.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.modifiedAt) - new Date(a.modifiedAt);
        });

        if (filteredItems.length === 0) {
            noItemsState.style.display = 'flex';
            cardsGrid.style.display = 'none';
        } else {
            noItemsState.style.display = 'none';
            cardsGrid.style.display = 'grid';
            
            filteredItems.forEach(item => {
                const card = createCardDOM(item);
                cardsGrid.appendChild(card);
            });
        }
    }

    // --- DOM Elements Creator for Cards ---
    function createCardDOM(item) {
        const card = document.createElement('article');
        card.className = `board-card type-${item.type} ${item.isPinned ? 'is-pinned' : ''}`;
        card.setAttribute('data-id', item.id);

        // Header: Type + Actions
        const header = document.createElement('div');
        header.className = 'card-header';
        
        const badge = document.createElement('span');
        badge.className = 'card-type-badge';
        badge.textContent = item.type;
        header.appendChild(badge);

        const actions = document.createElement('div');
        actions.className = 'card-actions';

        // Pin Button
        const pinBtn = document.createElement('button');
        pinBtn.className = 'card-action-btn pin-indicator';
        pinBtn.title = item.isPinned ? 'Unpin' : 'Pin to top';
        pinBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="${item.isPinned ? 'currentColor' : 'none'}" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
        `;
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePin(item.id);
        });
        actions.appendChild(pinBtn);

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.className = 'card-action-btn';
        editBtn.title = 'Edit Item';
        editBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditorForEdit(item);
        });
        actions.appendChild(editBtn);

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-action-btn delete-btn';
        deleteBtn.title = 'Delete Item';
        deleteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteItem(item.id);
        });
        actions.appendChild(deleteBtn);

        header.appendChild(actions);
        card.appendChild(header);

        // Title
        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = item.title || 'Untitled';
        card.appendChild(title);

        // Body Elements (Type-specific)
        if (item.type === 'checklist') {
            const progressWrapper = document.createElement('div');
            progressWrapper.className = 'card-checklist-progress';
            
            const total = item.todos.length;
            const completed = item.todos.filter(t => t.completed).length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            const progressInfo = document.createElement('div');
            progressInfo.className = 'progress-info';
            progressInfo.innerHTML = `<span>Progress</span> <span>${completed}/${total} completed (${percent}%)</span>`;
            progressWrapper.appendChild(progressInfo);

            const progressTrack = document.createElement('div');
            progressTrack.className = 'progress-bar-track';
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar-fill';
            progressBar.style.width = `${percent}%`;
            progressTrack.appendChild(progressBar);
            progressWrapper.appendChild(progressTrack);
            card.appendChild(progressWrapper);

            // Todo List items inside the card
            const listContainer = document.createElement('div');
            listContainer.className = 'card-checklist-items';

            const sortedTodos = [...item.todos].sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                return 0;
            });

            sortedTodos.forEach(todo => {
                const todoLabel = document.createElement('label');
                todoLabel.className = 'card-todo-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = todo.completed;
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    toggleTodoCompletion(item.id, todo.id, checkbox.checked);
                });

                const checkVisual = document.createElement('span');
                checkVisual.className = 'card-todo-checkbox';

                const todoText = document.createElement('span');
                todoText.className = 'card-todo-text';
                todoText.textContent = todo.text;

                todoLabel.appendChild(checkbox);
                todoLabel.appendChild(checkVisual);
                todoLabel.appendChild(todoText);
                listContainer.appendChild(todoLabel);
            });

            card.appendChild(listContainer);

        } else if (item.type === 'note') {
            const body = document.createElement('div');
            body.className = 'card-note-body';
            body.textContent = item.content;
            card.appendChild(body);
        }

        // Card Footer
        const footer = document.createElement('div');
        footer.className = 'card-footer';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'card-date';
        dateSpan.textContent = formatDate(item.modifiedAt);
        footer.appendChild(dateSpan);

        // Copy/Open Quick Action Buttons
        const footerActions = document.createElement('div');
        footerActions.className = 'footer-actions';

        if (item.type === 'note') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'secondary-btn btn-sm';
            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
            `;
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(item.content, copyBtn);
            });
            footerActions.appendChild(copyBtn);
        }

        footer.appendChild(footerActions);
        card.appendChild(footer);

        return card;
    }

    // --- Helper Utilities ---
    function formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;

        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString(undefined, options);
    }

    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const textSpan = buttonElement.querySelector('span');
            const originalText = textSpan.textContent;
            textSpan.textContent = 'Copied!';
            buttonElement.style.borderColor = 'var(--success)';
            buttonElement.style.color = 'var(--success)';
            
            if (window.soundSynth) {
                window.soundSynth.playTick();
            }

            setTimeout(() => {
                textSpan.textContent = originalText;
                buttonElement.style.borderColor = '';
                buttonElement.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    // --- State Operations (Mutations) ---
    function togglePin(id) {
        const item = state.items.find(i => i.id === id);
        if (item) {
            item.isPinned = !item.isPinned;
            item.modifiedAt = new Date().toISOString();
            saveItemsToStorage();
            renderCards();
            
            if (window.soundSynth) {
                window.soundSynth.playSave();
            }
        }
    }

    function deleteItem(id) {
        const index = state.items.findIndex(i => i.id === id);
        if (index > -1) {
            state.items.splice(index, 1);
            saveItemsToStorage();
            renderCards();
            
            if (window.soundSynth) {
                window.soundSynth.playDelete();
            }
        }
    }

    function toggleTodoCompletion(itemId, todoId, completed) {
        const item = state.items.find(i => i.id === itemId);
        if (item && item.type === 'checklist') {
            const todo = item.todos.find(t => t.id === todoId);
            if (todo) {
                todo.completed = completed;
                item.modifiedAt = new Date().toISOString();
                saveItemsToStorage();
                
                // Play specific completion chime or simple tick
                const allDone = item.todos.every(t => t.completed);
                if (allDone && completed) {
                    if (window.soundSynth) window.soundSynth.playSuccess();
                } else {
                    if (window.soundSynth) window.soundSynth.playTick();
                }

                // Instead of full render (which resets scroll or focus in cards), let's just update the specific card UI
                updateChecklistCardUI(item);
            }
        }
    }

    // Direct DOM updates for checklist toggle to avoid re-rendering layout jump
    function updateChecklistCardUI(item) {
        const card = document.querySelector(`.board-card[data-id="${item.id}"]`);
        if (!card) return;

        const total = item.todos.length;
        const completed = item.todos.filter(t => t.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Update progress bar & label
        const progressInfo = card.querySelector('.progress-info span:last-child');
        if (progressInfo) {
            progressInfo.textContent = `${completed}/${total} completed (${percent}%)`;
        }

        const progressBar = card.querySelector('.progress-bar-fill');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }

        // Update date text
        const dateSpan = card.querySelector('.card-date');
        if (dateSpan) {
            dateSpan.textContent = formatDate(item.modifiedAt);
        }

        // Re-render and sort checklist items container
        const listContainer = card.querySelector('.card-checklist-items');
        if (listContainer) {
            listContainer.innerHTML = '';
            const sortedTodos = [...item.todos].sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                return 0;
            });

            sortedTodos.forEach(todo => {
                const todoLabel = document.createElement('label');
                todoLabel.className = 'card-todo-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = todo.completed;
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    toggleTodoCompletion(item.id, todo.id, checkbox.checked);
                });

                const checkVisual = document.createElement('span');
                checkVisual.className = 'card-todo-checkbox';

                const todoText = document.createElement('span');
                todoText.className = 'card-todo-text';
                todoText.textContent = todo.text;

                todoLabel.appendChild(checkbox);
                todoLabel.appendChild(checkVisual);
                todoLabel.appendChild(todoText);
                listContainer.appendChild(todoLabel);
            });
        }
    }

    // --- Quick Add Panel Toggle and Editor modes ---
    addNoteBtn.addEventListener('click', () => {
        if (quickAddSection.style.display === 'block') {
            closeEditor();
        } else {
            openEditor('note');
        }
    });

    if (emptyStateAddBtn) {
        emptyStateAddBtn.addEventListener('click', () => {
            openEditor('note');
        });
    }

    function openEditor(mode) {
        quickAddSection.style.display = 'block';
        itemChecklistToggle.checked = (mode === 'checklist');
        setEditorMode(mode);
        itemTitle.focus();
        
        if (window.soundSynth) {
            window.soundSynth.playTick();
        }
    }

    function setEditorMode(mode) {
        state.activeEditorMode = mode;

        // Hide/Show correct input sections
        checklistFields.style.display = mode === 'checklist' ? 'block' : 'none';
        noteFields.style.display = mode === 'note' ? 'block' : 'none';

        // Additional setup
        if (mode === 'checklist' && checklistBuilder.children.length === 0) {
            // Seed first empty checklist row
            addChecklistBuilderRow('');
            addChecklistBuilderRow('');
        }
    }

    itemChecklistToggle.addEventListener('change', () => {
        const mode = itemChecklistToggle.checked ? 'checklist' : 'note';
        setEditorMode(mode);
        
        if (window.soundSynth) {
            window.soundSynth.playTick();
        }
    });

    cancelEditorBtn.addEventListener('click', () => {
        closeEditor();
    });

    function closeEditor() {
        // Clear editor fields
        editorForm.reset();
        editItemId.value = '';
        checklistBuilder.innerHTML = '';
        editorMeta.textContent = '';
        saveEditorBtn.textContent = 'Save';

        quickAddSection.style.display = 'none';
        
        if (window.soundSynth) {
            window.soundSynth.playTick();
        }
    }

    // --- Checklist builder logic inside editor ---
    function addChecklistBuilderRow(value = '', focus = false) {
        const row = document.createElement('div');
        row.className = 'builder-row';

        row.innerHTML = `
            <span class="drag-handle">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="9" x2="16" y2="9"></line>
                    <line x1="8" y1="15" x2="16" y2="15"></line>
                </svg>
            </span>
            <input type="text" class="checklist-item-input" placeholder="Task item description..." value="${value}">
            <button type="button" class="remove-item-btn" aria-label="Remove item">&times;</button>
        `;

        // Handle Enter inside rows
        const input = row.querySelector('.checklist-item-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addChecklistBuilderRow('', true);
            }
        });

        // Handle remove button
        const removeBtn = row.querySelector('.remove-item-btn');
        removeBtn.addEventListener('click', () => {
            row.remove();
            // Ensure we keep at least one row
            if (checklistBuilder.children.length === 0) {
                addChecklistBuilderRow('');
            }
        });

        checklistBuilder.appendChild(row);
        
        if (focus) {
            input.focus();
        }
    }

    addChecklistItemBtn.addEventListener('click', () => {
        addChecklistBuilderRow('', true);
        if (window.soundSynth) {
            window.soundSynth.playTick();
        }
    });

    // --- Save/Add Form Submission ---
    editorForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = itemTitle.value.trim();
        const id = editItemId.value;

        let newItem = {
            id: id || 'item-' + Date.now(),
            type: state.activeEditorMode,
            title: title || 'Untitled Snippet',
            isPinned: false,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        // If editing existing item, preserve pinning and creation dates
        if (id) {
            const oldItem = state.items.find(i => i.id === id);
            if (oldItem) {
                newItem.isPinned = oldItem.isPinned;
                newItem.createdAt = oldItem.createdAt;
            }
        }

        // Save fields depending on mode
        if (state.activeEditorMode === 'checklist') {
            const todos = [];
            const inputs = checklistBuilder.querySelectorAll('.checklist-item-input');
            
            // Map old completed state if editing
            let oldTodos = [];
            if (id) {
                const oldItem = state.items.find(i => i.id === id);
                if (oldItem && oldItem.type === 'checklist') {
                    oldTodos = oldItem.todos;
                }
            }

            inputs.forEach((input, index) => {
                const text = input.value.trim();
                if (text) {
                    // Try to match text to keep completion status of the task if edited
                    const matchOld = oldTodos.find(ot => ot.text === text);
                    const completed = matchOld ? matchOld.completed : false;
                    
                    todos.push({
                        id: 'todo-' + index + '-' + Date.now(),
                        text,
                        completed
                    });
                }
            });

            if (todos.length === 0) {
                alert('Please enter at least one task for your checklist.');
                return;
            }
            newItem.todos = todos;

        } else if (state.activeEditorMode === 'note') {
            newItem.content = noteContent.value.trim();
            if (!newItem.content) {
                alert('Please enter some text content for your note.');
                return;
            }
        }

        // Save to state
        if (id) {
            const index = state.items.findIndex(i => i.id === id);
            if (index > -1) {
                state.items[index] = newItem;
            }
        } else {
            state.items.unshift(newItem);
        }

        // Apply Max Saved Items Limit (Pruning)
        pruneItemsList();

        saveItemsToStorage();
        closeEditor();
        renderCards();

        if (window.soundSynth) {
            window.soundSynth.playSave();
        }
    });

    // Prune logic to match preferences max items
    function pruneItemsList() {
        const limit = parseInt(state.preferences.maxHistory) || 200;
        if (state.items.length <= limit) return;

        // Separate pinned and unpinned items
        // We only prune unpinned items, starting with the oldest modifiedAt
        let pinned = [];
        let unpinned = [];

        state.items.forEach(item => {
            if (item.isPinned) {
                pinned.push(item);
            } else {
                unpinned.push(item);
            }
        });

        // Sort unpinned by date ascending (oldest first) so we delete from the beginning of this list
        unpinned.sort((a, b) => new Date(a.modifiedAt) - new Date(b.modifiedAt));

        const pruneCount = state.items.length - limit;
        if (pruneCount > 0) {
            // Remove the oldest unpinned items
            unpinned.splice(0, pruneCount);
        }

        // Reassemble items list: restore original order (or pinned + remaining unpinned)
        state.items = [...pinned, ...unpinned];
    }

    // --- Edit Mode Activator ---
    function openEditorForEdit(item) {
        // Open the editor view
        quickAddSection.style.display = 'block';

        // Load values
        editItemId.value = item.id;
        itemTitle.value = item.title;
        itemChecklistToggle.checked = (item.type === 'checklist');
        setEditorMode(item.type);

        saveEditorBtn.textContent = 'Update';
        editorMeta.textContent = `Created: ${new Date(item.createdAt).toLocaleDateString()}`;

        if (item.type === 'checklist') {
            checklistBuilder.innerHTML = '';
            item.todos.forEach(todo => {
                addChecklistBuilderRow(todo.text);
            });
        } else if (item.type === 'note') {
            noteContent.value = item.content;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (window.soundSynth) {
            window.soundSynth.playTick();
        }
    }

    // --- Preferences Modal Operations ---
    prefBtn.addEventListener('click', () => {
        prefModal.style.display = 'flex';
        
        if (window.soundSynth) {
            window.soundSynth.playTick();
        }
    });

    const quitBtn = document.getElementById('quitBtn');
    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.quitApp) {
                window.electronAPI.quitApp();
            }
        });
    }

    // Listen to Electron Tray menu trigger
    if (window.electronAPI && window.electronAPI.onOpenPreferences) {
        window.electronAPI.onOpenPreferences(() => {
            prefModal.style.display = 'flex';
            if (window.soundSynth) {
                window.soundSynth.playTick();
            }
        });
    }

    closePrefModal.addEventListener('click', () => {
        prefModal.style.display = 'none';
        
        if (window.soundSynth) {
            window.soundSynth.playTick();
        }
    });

    // Close on background click
    prefModal.addEventListener('click', (e) => {
        if (e.target === prefModal) {
            prefModal.style.display = 'none';
            
            if (window.soundSynth) {
                window.soundSynth.playTick();
            }
        }
    });

    // Slider range label update
    prefMaxHistory.addEventListener('input', (e) => {
        maxHistoryLabel.textContent = `Max History Items: ${e.target.value}`;
    });

    // Save preferences
    preferencesForm.addEventListener('submit', (e) => {
        e.preventDefault();

        state.preferences.shortcut = prefShortcut.value;
        state.preferences.maxHistory = parseInt(prefMaxHistory.value);
        state.preferences.soundEnabled = prefSoundEnabled.checked;
        state.preferences.launchLogin = prefLaunchLogin.checked;

        savePreferencesToStorage();
        
        // Instantly check and prune list with the new limit
        pruneItemsList();
        saveItemsToStorage();
        renderCards();

        prefModal.style.display = 'none';

        if (window.soundSynth) {
            window.soundSynth.playSave();
        }
    });

    // Danger Zone Reset
    clearAllDataBtn.addEventListener('click', () => {
        const confirmClear = confirm("⚠️ Are you absolutely sure you want to delete all saved checklists and notes? This action is permanent and cannot be undone.");
        
        if (confirmClear) {
            state.items = [];
            saveItemsToStorage();
            renderCards();
            prefModal.style.display = 'none';

            if (window.soundSynth) {
                window.soundSynth.playDelete();
            }
            
            alert("All saved board data has been deleted.");
        }
    });

    // --- Load Application Data on Launch ---
    loadState();

    // --- Window Drag Resize Handler ---
    const resizeHandle = document.getElementById('resizeHandle');
    if (resizeHandle && window.electronAPI && window.electronAPI.resizeWindow) {
        let isResizing = false;
        let startWidth, startHeight, startX, startY;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startWidth = window.innerWidth;
            startHeight = window.innerHeight;
            startX = e.clientX;
            startY = e.clientY;
            document.body.style.cursor = 'nwse-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newWidth = Math.max(320, Math.min(800, startWidth + (e.clientX - startX)));
            const newHeight = Math.max(400, Math.min(900, startHeight + (e.clientY - startY)));
            window.electronAPI.resizeWindow(newWidth, newHeight);
        });

        window.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }
});
