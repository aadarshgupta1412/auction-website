// Function to load players from CSV
async function loadPlayers() {
    try {
        const response = await fetch('data/players.csv');
        const csvText = await response.text();
        const players = parseCSV(csvText);
        return players.map(p => ({
            id: parseInt(p.id),
            name: p.name,
            image: p.image,
            pitch: p.pitch,
            interestedGames: p.interested_games.split(','),
            basePrice: parseInt(p.base_price),
            currentPrice: parseInt(p.current_price),
            team: p.team === 'null' ? null : p.team,
            status: p.status
        }));
    } catch (error) {
        console.error('Error loading players:', error);
        return [];
    }
}

// Function to save auction history
async function saveAuctionHistory(player, amount, team, action) {
    const timestamp = new Date().toISOString();
    const newEntry = `\n${timestamp},${player.id},${amount},${team || 'null'},${action}`;
    
    try {
        // In a real implementation, you would use a server endpoint to append to the CSV
        // For now, we'll just log it to console
        console.log('New auction history entry:', newEntry);
    } catch (error) {
        console.error('Error saving auction history:', error);
    }
}

// Function to update player data
async function updatePlayer(player) {
    try {
        // In a real implementation, you would use a server endpoint to update the CSV
        // For now, we'll just log it to console
        console.log('Player updated:', player);
    } catch (error) {
        console.error('Error updating player:', error);
    }
}

// Helper function to parse CSV
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index];
            return obj;
        }, {});
    });
}

// Export functions
window.dataHandler = {
    loadPlayers,
    saveAuctionHistory,
    updatePlayer
};
