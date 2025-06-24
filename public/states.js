let states = [];
let draggedElement = null;
let draggedIndex = null;

// Load states from backend
async function loadStates() {
    try {
        const response = await fetch('/api/states');
        if (!response.ok) throw new Error('Failed to fetch states');
        
        states = await response.json();
        renderStates();
    } catch (error) {
        showAlert('Failed to load states: ' + error.message, 'danger');
    }
}

// Render states list
function renderStates() {
    const container = document.getElementById('states-container');
    
    if (states.length === 0) {
        container.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                <div class="h5 mt-3">No states found</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="states-container p-3">
            ${states.map((state, index) => `
                <div class="state-item p-3" 
                        draggable="true" 
                        data-index="${index}"
                        ondragstart="handleDragStart(event)"
                        ondragover="handleDragOver(event)"
                        ondrop="handleDrop(event)"
                        ondragend="handleDragEnd(event)"
                        ondragenter="handleDragEnter(event)"
                        ondragleave="handleDragLeave(event)">
                    
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="drag-handle">
                                <i class="fas fa-grip-vertical"></i>
                            </div>
                        </div>
                        
                        <div class="col-auto">
                            <div class="priority-badge">
                                ${state.priority}
                            </div>
                        </div>
                        
                        <div class="col-12 col-md-5">
                            <div class="state-name">
                                ${state.name}
                            </div>
                        </div>
                        
                        <div class="col-12 col-md-3">
                            <div class="status-indicator ${getProcessingStatusClass(state.processing_status)}">
                                ${state.processing_status === 1 ? '<div class="spinner"></div>' : getProcessingStatusIcon(state.processing_status)}
                                ${getProcessingStatusText(state.processing_status)}
                            </div>
                        </div>
                        
                        <div class="col-12 col-md-1">
                            <button class="btn btn-status ${state.status === 1 ? 'active' : 'inactive'}"
                                    onclick="toggleStateStatus(${state.id}, ${state.status})">
                                ${state.status === 1 ? 'Active' : 'Inactive'}
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Drag and drop handlers
function handleDragStart(e) {
    draggedElement = e.target.closest('.state-item');
    draggedIndex = parseInt(draggedElement.dataset.index);
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.state-item');
    if (targetItem && targetItem !== draggedElement) {
        targetItem.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const targetItem = e.target.closest('.state-item');
    if (targetItem) {
        targetItem.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    const targetElement = e.target.closest('.state-item');
    if (!targetElement || targetElement === draggedElement) return;
    
    const targetIndex = parseInt(targetElement.dataset.index);
    
    // Reorder the states array
    const draggedState = states[draggedIndex];
    states.splice(draggedIndex, 1);
    states.splice(targetIndex, 0, draggedState);
    
    // Update priorities based on new order
    updatePriorities();
    
    targetElement.classList.remove('drag-over');
}

function handleDragEnd(e) {
    const draggedItem = e.target.closest('.state-item');
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
    draggedElement = null;
    draggedIndex = null;
}

// Update priorities after drag and drop
async function updatePriorities() {
    try {
        // Update local priorities
        states.forEach((state, index) => {
            state.priority = index + 1;
        });

        // Send to backend
        const response = await fetch('/api/states/priorities', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                states: states.map(state => ({ 
                    id: state.id, 
                    priority: state.priority 
                }))
            })
        });

        if (!response.ok) throw new Error('Failed to update priorities');
        
        renderStates();
    } catch (error) {
        showAlert('Failed to update priorities: ' + error.message, 'danger');
        loadStates(); // Reload to reset
    }
}

// Toggle state status
async function toggleStateStatus(id, currentStatus) {
    try {
        const newStatus = currentStatus === 1 ? 0 : 1;
        
        const response = await fetch(`/api/states/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Failed to update status');
        
        // Update local state
        const stateIndex = states.findIndex(s => s.id === id);
        if (stateIndex !== -1) {
            states[stateIndex].status = newStatus;
            renderStates();
        }
    } catch (error) {
        showAlert('Failed to update status: ' + error.message, 'danger');
    }
}

// Reset all priorities to default
async function resetPriorities() {
    const confirmModal = new bootstrap.Modal(document.createElement('div'));
    
    if (!confirm('Are you sure you want to reset all priorities?')) return;
    
    try {
        const response = await fetch('/api/states/reset-priorities', {
            method: 'PUT'
        });

        if (!response.ok) throw new Error('Failed to reset priorities');
        
        loadStates();
    } catch (error) {
        showAlert('Failed to reset priorities: ' + error.message, 'danger');
    }
}

// Helper functions
function getProcessingStatusClass(status) {
    switch (status) {
        case 0: return 'status-pending';
        case 1: return 'status-processing';
        case 2: return 'status-completed';
        default: return 'status-pending';
    }
}

function getProcessingStatusText(status) {
    switch (status) {
        case 0: return 'Pending';
        case 1: return 'Processing';
        case 2: return 'Completed';
        default: return 'Unknown';
    }
}

function getProcessingStatusIcon(status) {
    switch (status) {
        case 0: return '<i class="fas fa-clock"></i>';
        case 1: return '<i class="fas fa-spinner fa-spin"></i>';
        case 2: return '<i class="fas fa-check-circle"></i>';
        default: return '<i class="fas fa-question-circle"></i>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadStates();
});