import { dataHandler } from './firebase-data-handler.js';

// Show add player modal
export function showAddPlayerModal() {
    const modal = document.getElementById('add-player-modal');
    if (modal) {
        modal.classList.add('visible');
    }
}

// Hide add player modal
export function hideAddPlayerModal() {
    const modal = document.getElementById('add-player-modal');
    if (modal) {
        modal.classList.remove('visible');
        // Clear form
        document.getElementById('add-player-form').reset();
    }
}

// Handle add player form submission
export async function handleAddPlayer(event) {
    event.preventDefault();

    const playerData = {
        name: document.getElementById('player-name').value,
        image: document.getElementById('player-image').value,
        pitch: document.getElementById('player-pitch').value,
        games: document.getElementById('player-games').value
    };

    const success = await dataHandler.addPlayer(playerData);
    
    if (success) {
        alert('Player added successfully!');
        hideAddPlayerModal();
    } else {
        alert('Error adding player. Please try again.');
    }
}

// Add these functions to window for HTML onclick access
window.showAddPlayerModal = showAddPlayerModal;
window.hideAddPlayerModal = hideAddPlayerModal;
window.handleAddPlayer = handleAddPlayer;
