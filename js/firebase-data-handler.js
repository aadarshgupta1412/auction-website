class FirebaseDataHandler {
    constructor() {
        console.log("Initializing FirebaseDataHandler");
        this.initializeHandler();
        this.currentAuctionPlayer = null;
        this.isAdmin = true; // Added this line
    }

    async initializeHandler() {
        // Wait for Firebase to be ready
        let attempts = 0;
        while (!window.database && attempts < 10) {
            console.log("Waiting for Firebase to initialize...");
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (!window.database) {
            console.error("Firebase database not initialized after waiting!");
            return;
        }

        console.log("Firebase ready, setting up references...");
        this.playersRef = window.database.ref('players');
        this.currentAuctionRef = window.database.ref('currentAuction');
        this.players = [];
        this.setupListeners();
    }

    setupListeners() {
        console.log("Setting up Firebase listeners");
        if (!this.playersRef || !this.currentAuctionRef) {
            console.error("Database references not initialized!");
            return;
        }
        
        // Listen for player updates
        this.playersRef.on('value', (snapshot) => {
            console.log("Received players data from Firebase:", snapshot.val());
            const data = snapshot.val();
            if (data) {
                this.players = Object.entries(data).map(([key, value]) => ({
                    ...value,
                    id: key
                }));
                this.updateUI(this.players);
                this.updateTeams();
            } else {
                console.log("No players in Firebase");
                this.updateUI([]);
            }
        }, (error) => {
            console.error("Error fetching players data:", error);
        });

        // Listen for current auction updates
        this.currentAuctionRef.on('value', (snapshot) => {
            console.log("Received current auction data:", snapshot.val());
            const data = snapshot.val();
            if (data) {
                this.currentAuctionPlayer = data;
                this.updateCurrentAuction(data);
            } else {
                console.log("No current auction");
                this.updateCurrentAuction(null);
            }
        }, (error) => {
            console.error("Error fetching current auction:", error);
        });
    }

    updateCurrentAuction(auctionData) {
        const currentAuctionSection = document.querySelector('.current-auction');
        if (!currentAuctionSection) {
            console.error("Current auction section not found");
            return;
        }

        if (!auctionData || !auctionData.playerId) {
            currentAuctionSection.innerHTML = `
                <h3>Current Auction</h3>
                <p>No active auction at the moment</p>
            `;
            return;
        }

        const player = this.players.find(p => p.id === auctionData.playerId);
        if (!player) {
            console.error("Player not found for current auction");
            return;
        }

        const timeLeft = auctionData.endTime ? Math.max(0, Math.floor((auctionData.endTime - Date.now()) / 1000)) : null;
        
        currentAuctionSection.innerHTML = `
            <h3>Current Auction</h3>
            <div class="current-player">
                <img src="${player.image}" alt="${player.name}">
                <div class="player-info">
                    <h4>${player.name}</h4>
                    <p class="current-price">Current Bid: ₹${player.currentPrice} Lakhs</p>
                    <p class="last-bidder">${player.lastBidTeam ? `Last bid by: ${player.lastBidTeam}` : 'No bids yet'}</p>
                    ${timeLeft ? `<p class="time-left">Time left: ${timeLeft}s</p>` : ''}
                    <div class="games">
                        ${player.interestedGames.map(game => `<span class="game-tag">${game}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    updateUI(players) {
        console.log("Updating UI with players:", players);
        const grid = document.getElementById('player-grid');
        if (!grid) {
            console.error("Player grid not found");
            return;
        }

        if (players.length === 0) {
            grid.innerHTML = '<p>No players available</p>';
            return;
        }

        grid.innerHTML = players
            .filter(player => player.status === 'available')
            .map(player => `
                <div class="player-card" onclick="window.dataHandler.viewPlayerDetails('${player.id}')">
                    <div class="player-image">
                        <img src="${player.image}" alt="${player.name}">
                    </div>
                    <div class="player-info">
                        <h3>${player.name}</h3>
                        <div class="price">₹${player.currentPrice} Lakhs</div>
                        <div class="games-grid">
                            ${player.interestedGames.map(game => `
                                <div class="game-tag">${game}</div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('');
    }

    updateTeams() {
        const teamAPlayers = this.players.filter(p => p.team === 'Team A');
        const teamBPlayers = this.players.filter(p => p.team === 'Team B');

        const teamAList = document.getElementById('team-a-players');
        const teamBList = document.getElementById('team-b-players');
        const teamATotal = document.getElementById('team-a-total');
        const teamBTotal = document.getElementById('team-b-total');

        if (!teamAList || !teamBList || !teamATotal || !teamBTotal) {
            console.error("Team elements not found");
            return;
        }

        teamAList.innerHTML = this.renderTeamPlayers(teamAPlayers);
        teamBList.innerHTML = this.renderTeamPlayers(teamBPlayers);

        teamATotal.textContent = teamAPlayers.reduce((sum, p) => sum + p.currentPrice, 0);
        teamBTotal.textContent = teamBPlayers.reduce((sum, p) => sum + p.currentPrice, 0);
    }

    renderTeamPlayers(players) {
        if (players.length === 0) {
            return '<p>No players</p>';
        }
        return players.map(player => `
            <div class="team-player" onclick="window.viewPlayerDetails('${player.id}')">
                <img src="${player.image}" alt="${player.name}" style="width: 50px; height: 50px; border-radius: 25px;">
                <span>${player.name} (₹${player.currentPrice} Lakhs)</span>
            </div>
        `).join('');
    }

    async addPlayer(playerData) {
        if (!this.playersRef) {
            console.error("Cannot add player - database not initialized");
            throw new Error("Database not initialized");
        }

        try {
            const newPlayerRef = this.playersRef.push();
            const player = {
                id: newPlayerRef.key,
                ...playerData,
                currentPrice: 20,
                status: 'available',
                team: null
            };
            await newPlayerRef.set(player);
            return player;
        } catch (error) {
            console.error("Error adding player:", error);
            throw error;
        }
    }

    async startBidding(playerId) {
        if (!this.playersRef) {
            console.error("Cannot start bidding - database not initialized");
            throw new Error("Database not initialized");
        }

        try {
            const playerRef = this.playersRef.child(playerId);
            const snapshot = await playerRef.once('value');
            const player = snapshot.val();
            
            if (player) {
                await playerRef.update({
                    status: 'bidding'
                });
            }
            
            return player;
        } catch (error) {
            console.error("Error starting bidding:", error);
            throw error;
        }
    }

    async updateBid(playerId, team) {
        if (!this.playersRef) {
            console.error("Cannot update bid - database not initialized");
            throw new Error("Database not initialized");
        }

        try {
            const playerRef = this.playersRef.child(playerId);
            const snapshot = await playerRef.once('value');
            const player = snapshot.val();
            
            if (player) {
                const newPrice = player.currentPrice + 10; // Increment by 10 lakhs
                await playerRef.update({
                    currentPrice: newPrice,
                    lastBidTeam: team
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error updating bid:", error);
            throw error;
        }
    }

    async completeAuction(playerId, status, team = null) {
        if (!this.playersRef) {
            console.error("Cannot complete auction - database not initialized");
            throw new Error("Database not initialized");
        }

        try {
            const playerRef = this.playersRef.child(playerId);
            const updates = {
                status: status
            };
            
            if (team) {
                updates.team = team;
            }
            
            await playerRef.update(updates);
            return true;
        } catch (error) {
            console.error("Error completing auction:", error);
            throw error;
        }
    }

    async clearPlayerBidding(playerId) {
        try {
            const playerRef = this.playersRef.child(playerId);
            const updates = {
                currentPrice: 20,
                status: 'available',
                team: null,
                lastBidTeam: null
            };
            
            await playerRef.update(updates);
            return true;
        } catch (error) {
            console.error("Error clearing player bidding:", error);
            throw error;
        }
    }

    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    getPlayers() {
        return this.players;
    }

    viewPlayerDetails(playerId) {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.error("Player not found:", playerId);
            return;
        }

        const modalContent = `
            <h2>${player.name}</h2>
            <img src="${player.image}" alt="${player.name}">
            
            <div class="player-description">
                <h3>About Player</h3>
                <p>${player.pitch || 'No description available.'}</p>
            </div>

            <div class="player-interests">
                <h3>Interested in Playing</h3>
                <div class="interests-grid">
                    ${player.interestedGames.map(game => `
                        <div class="interest-card">
                            ${game}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="price-section">
                <h3>Current Price</h3>
                <div class="current-price">₹${player.currentPrice} Lakhs</div>
            </div>

            <div class="modal-actions">
                ${this.isAdmin && player.status === 'available' ? `
                    <button class="primary-button" onclick="window.dataHandler.startAuction('${player.id}')">Start Auction</button>
                ` : ''}
                <button onclick="this.closest('.modal').remove()">Close</button>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                ${modalContent}
            </div>
        `;

        document.body.appendChild(modal);
    }

    async startAuction(playerId) {
        if (!this.isAdmin) {
            console.error("Only admins can start auctions");
            return;
        }

        try {
            const player = this.getPlayer(playerId);
            
            // Create auction page HTML
            const auctionPage = document.createElement('div');
            auctionPage.className = 'auction-page';
            auctionPage.innerHTML = `
                <div class="auction-container">
                    <div class="current-player">
                        <img src="${player.image}" alt="${player.name}">
                        <h2>${player.name}</h2>
                        <div class="player-sports">
                            ${player.interestedGames.map(game => `<span class="sport-tag">${game}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="bidding-section">
                        <div class="current-price">
                            <h3>Current Bid</h3>
                            <div class="price-amount">₹<span id="current-bid">${player.currentPrice}</span> Lakhs</div>
                            <div class="last-bidder" id="last-bidder">No bids yet</div>
                        </div>
                        
                        <div class="team-controls">
                            <div class="team-a-controls">
                                <h3>Team A</h3>
                                <button onclick="window.dataHandler.placeBid('A', 10)">+10 Lakhs</button>
                                <button onclick="window.dataHandler.placeBid('A', 0)">+0 Lakhs</button>
                            </div>
                            
                            <div class="team-b-controls">
                                <h3>Team B</h3>
                                <button onclick="window.dataHandler.placeBid('B', 10)">+10 Lakhs</button>
                                <button onclick="window.dataHandler.placeBid('B', 0)">+0 Lakhs</button>
                            </div>
                        </div>
                        
                        <div class="admin-controls">
                            <button onclick="window.dataHandler.clearBidding('${playerId}')" class="secondary-button">Clear Bidding</button>
                            <button onclick="window.dataHandler.markUnsold('${playerId}')" class="secondary-button">Mark Unsold</button>
                            <button onclick="window.dataHandler.endBidding('${playerId}')" class="primary-button">End Bidding</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Clear existing content and add auction page
            document.body.innerHTML = '';
            document.body.appendChild(auctionPage);

            // Update player status and current auction in Firebase
            await this.playersRef.child(playerId).update({
                status: 'bidding'
            });

            await this.currentAuctionRef.set({
                playerId: playerId,
                currentPrice: player.currentPrice,
                lastBidTeam: null,
                status: 'active'
            });

        } catch (error) {
            console.error("Error starting auction:", error);
            alert("Failed to start auction. Please try again.");
        }
    }

    async placeBid(team, amount) {
        const currentAuction = await this.currentAuctionRef.once('value');
        const auctionData = currentAuction.val();
        
        if (!auctionData || auctionData.status !== 'active') {
            alert('No active auction');
            return;
        }

        const player = this.getPlayer(auctionData.playerId);
        const newPrice = auctionData.currentPrice + amount;

        await this.currentAuctionRef.update({
            currentPrice: newPrice,
            lastBidTeam: team
        });

        document.getElementById('current-bid').textContent = newPrice;
        document.getElementById('last-bidder').textContent = `Last bid: Team ${team}`;
    }

    async clearBidding(playerId) {
        if (!this.isAdmin) return;

        try {
            await this.currentAuctionRef.update({
                currentPrice: this.getPlayer(playerId).basePrice,
                lastBidTeam: null,
                status: 'active'
            });

            document.getElementById('current-bid').textContent = this.getPlayer(playerId).basePrice;
            document.getElementById('last-bidder').textContent = 'No bids yet';
        } catch (error) {
            console.error("Error clearing bids:", error);
        }
    }

    async markUnsold(playerId) {
        if (!this.isAdmin) return;

        try {
            await this.playersRef.child(playerId).update({
                status: 'unsold'
            });

            await this.currentAuctionRef.update({
                status: 'ended'
            });

            window.location.reload();
        } catch (error) {
            console.error("Error marking player as unsold:", error);
        }
    }

    async endBidding(playerId) {
        if (!this.isAdmin) return;

        try {
            const currentAuction = await this.currentAuctionRef.once('value');
            const auctionData = currentAuction.val();

            if (!auctionData.lastBidTeam) {
                alert('No bids placed. Mark as unsold or clear bidding.');
                return;
            }

            await this.playersRef.child(playerId).update({
                status: 'sold',
                soldTo: auctionData.lastBidTeam,
                finalPrice: auctionData.currentPrice
            });

            await this.currentAuctionRef.update({
                status: 'ended'
            });

            window.location.reload();
        } catch (error) {
            console.error("Error ending auction:", error);
        }
    }
}

// Initialize data handler after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing data handler");
    window.dataHandler = new FirebaseDataHandler();
});
