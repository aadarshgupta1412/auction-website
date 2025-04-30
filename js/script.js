// Global variables for tracking current bidding
let currentBiddingPlayer = null;

// Show add player modal
window.showAddPlayerModal = () => {
    document.getElementById('add-player-modal').classList.remove('hidden');
};

// Hide add player modal
window.hideAddPlayerModal = () => {
    document.getElementById('add-player-modal').classList.add('hidden');
};

// Handle add player form submission
window.handleAddPlayer = async (event) => {
    event.preventDefault();
    
    const playerData = {
        name: document.getElementById('player-name').value,
        image: document.getElementById('player-image').value,
        pitch: document.getElementById('player-pitch').value,
        interestedGames: document.getElementById('player-games').value.split(',').map(g => g.trim())
    };
    
    try {
        await window.dataHandler.addPlayer(playerData);
        hideAddPlayerModal();
        document.getElementById('add-player-form').reset();
    } catch (error) {
        console.error('Error adding player:', error);
        alert('Failed to add player. Please try again.');
    }
};

// View player details
window.viewPlayerDetails = (playerId) => {
    const player = window.dataHandler.getPlayer(playerId);
    if (!player) return;

    document.getElementById('modal-player-name').textContent = player.name;
    document.getElementById('modal-player-image').src = player.image;
    document.getElementById('modal-player-pitch').textContent = player.pitch;
    document.getElementById('modal-player-games').textContent = player.interestedGames.join(', ');
    document.getElementById('modal-player-price').textContent = `₹${player.currentPrice} Lakhs`;
    
    const teamElement = document.getElementById('modal-player-team');
    if (player.team) {
        teamElement.textContent = `Current Team: ${player.team}`;
        teamElement.classList.remove('hidden');
    } else {
        teamElement.classList.add('hidden');
    }
    
    document.getElementById('player-modal').classList.remove('hidden');
};
