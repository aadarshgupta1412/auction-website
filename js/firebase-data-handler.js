class FirebaseDataHandler {
    constructor() {
        this.isAdmin = false;  // Explicitly set to false initially
        this.basePrice = 20;
        
        // Initialize Firebase references
        this.playersMasterRef = database.ref('playersMaster');
        this.auctionsRef = database.ref('auctions');
        this.teamsRef = database.ref('teams');
        this.adminsRef = database.ref('admins');
        
        this.players = [];
        this.auctionState = {};
        this.teams = {
            A: { budget: 1000, spent: 0, players: {} },
            B: { budget: 1000, spent: 0, players: {} }
        };

        // Check admin status before setting up anything else
        this.checkAdminStatus().then(() => {
            this.setupListeners();
        }).catch(error => {
            console.error('Failed to check admin status:', error);
            this.isAdmin = false; // Ensure it's false on error
        });
    }

    async initializeFirebase() {
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
    }

    setupListeners() {
        // Listen for master player data changes
        this.playersMasterRef.on('value', (snapshot) => {
            const masterData = snapshot.val() || {};
            // Get auction data
            this.auctionsRef.once('value').then((auctionSnapshot) => {
                const auctionData = auctionSnapshot.val() || {};
                
                // Combine master data with auction state
                this.players = Object.entries(masterData).map(([id, player]) => ({
                    ...player,
                    ...(auctionData[id] || {
                        status: 'available',
                        currentPrice: player.basePrice || this.basePrice,
                        team: null,
                        bidHistory: {}
                    })
                }));
                
                this.updateUI(this.players);
            });
        });

        // Listen for auction state changes
        this.auctionsRef.on('value', (snapshot) => {
            const auctionData = snapshot.val() || {};
            this.auctionState = auctionData;
            
            // Update player states with auction data
            if (this.players.length > 0) {
                this.players = this.players.map(player => ({
                    ...player,
                    ...(auctionData[player.id] || {
                        status: 'available',
                        currentPrice: player.basePrice || this.basePrice,
                        team: null,
                        bidHistory: {}
                    })
                }));
                this.updateUI(this.players);
            }
        });

        // Listen for team changes
        this.teamsRef.on('value', (snapshot) => {
            this.teams = snapshot.val() || {
                A: { budget: 1000, spent: 0, players: {} },
                B: { budget: 1000, spent: 0, players: {} }
            };
            this.updateTeamPanels();
        });
    }

    async restorePlayersFromJSON() {
        if (!this.isAdmin) {
            alert('Only admins can restore player data');
            return;
        }

        try {
            const response = await fetch('/database.json');
            if (!response.ok) throw new Error('Failed to fetch database');
            
            const databaseData = await response.json();
            
            if (!databaseData.playersMaster || !databaseData.auctions || !databaseData.teams) {
                throw new Error('Invalid database format');
            }

            // Create a single update object
            const updates = {
                '/playersMaster': databaseData.playersMaster,
                '/auctions': databaseData.auctions,
                '/teams': databaseData.teams,
                '/admins': databaseData.admins
            };

            // Update everything in one transaction
            await database.ref().update(updates);
            
            console.log('Database restored successfully');
            alert('Database restored successfully!');
        } catch (error) {
            console.error('Error restoring database:', error);
            alert(`Failed to restore database: ${error.message}`);
        }
    }

    async checkAdminStatus() {
        try {
            const user = await this.getCurrentUser();
            this.isAdmin = !!user; // Will be true only if user exists (admin is logged in)
            
            // Update UI based on admin status
            document.body.classList.toggle('admin-mode', this.isAdmin);
            document.body.classList.toggle('user-mode', !this.isAdmin);
            
            // Force UI update
            if (this.players.length > 0) {
                this.updateUI(this.players);
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            this.isAdmin = false;
        }
    }

    setAdminStatus(isAdmin) {
        this.isAdmin = isAdmin;
        this.updateUIForRole();
    }

    updateUIForRole() {
        document.body.classList.toggle('admin-mode', this.isAdmin);
        document.body.classList.toggle('user-mode', !this.isAdmin);
        this.updateUI();
    }

    async getCurrentUser() {
        // Check if admin is logged in through AdminHandler
        const isAdminLoggedIn = localStorage.getItem('isAdmin') === 'true';
        return isAdminLoggedIn ? { uid: 'admin-user' } : null;
    }

    updateUI(players = this.players) {
        console.log("Updating UI with players:", players);
        const grid = document.getElementById('player-grid');
        if (!grid) {
            console.error("Player grid not found");
            return;
        }

        grid.innerHTML = players.map(player => {
            const statusClass = player.status || 'available';
            const statusText = {
                'available': '',
                'bidding': 'In Auction',
                'sold': 'Sold',
                'unsold': 'Unsold'
            }[player.status || 'available'];

            const price = player.finalPrice || player.currentPrice || this.basePrice;

            // Create the player card HTML without the auction button first
            let cardHtml = `
                <div class="player-card ${statusClass}" onclick="window.dataHandler.viewPlayerDetails('${player.id}')">
                    <div class="player-image">
                        <img src="${player.image}" alt="${player.name}">
                        ${statusText ? `<div class="status-badge ${statusClass}">${statusText}</div>` : ''}
                    </div>
                    <div class="player-info">
                        <h3>${player.name}</h3>
                        <div class="price">₹${price} Lakhs</div>
                        ${player.team ? `<div class="team-badge team-${player.team.toLowerCase()}">Team ${player.team}</div>` : ''}
                        <div class="games-grid">
                            ${player.interestedGames.map(game => `
                                <div class="game-tag">${game}</div>
                            `).join('')}
                        </div>
                    </div>`;

            // Only add the Start Auction button if user is admin and player is available
            if (this.isAdmin && player.status === 'available') {
                cardHtml += `
                    <button class="start-auction-btn" onclick="event.stopPropagation(); window.dataHandler.startAuction('${player.id}')">
                        Start Auction
                    </button>`;
            }

            cardHtml += `</div>`;
            return cardHtml;
        }).join('');

        // Update team stats
        this.updateTeamStats();
    }

    async viewPlayerDetails(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const modalHtml = `
            <div id="player-details-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${player.name}</h2>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="player-image">
                            <img src="${player.image}" alt="${player.name}">
                        </div>
                        <div class="player-info">
                            <div class="info-section">
                                <h3>About</h3>
                                <p>${player.pitch || 'No pitch available'}</p>
                            </div>
                            <div class="info-section">
                                <h3>Interested Games</h3>
                                <ul>
                                    ${(player.interestedGames || []).map(game => `<li>${game}</li>`).join('')}
                                </ul>
                            </div>
                            ${player.stats ? `
                            <div class="info-section">
                                <h3>Statistics</h3>
                                <p>Tournaments: ${player.stats.tournaments}</p>
                                <div class="achievements">
                                    <h4>Achievements:</h4>
                                    <ul>
                                        ${player.stats.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                            ` : ''}
                            <div class="info-section">
                                <h3>Auction Status</h3>
                                <p>Status: <span class="status ${player.status}">${player.status || 'available'}</span></p>
                                <p>Base Price: ₹${player.basePrice} Lakhs</p>
                                <p>Current Price: ₹${player.currentPrice} Lakhs</p>
                                ${player.team ? `<p>Team: ${player.team}</p>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        // Remove existing modal if any
        const existingModal = document.getElementById('player-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('player-details-modal');
        const closeBtn = modal.querySelector('.close');

        modal.style.display = 'block';

        closeBtn.onclick = () => {
            modal.style.display = 'none';
            modal.remove();
        };

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                modal.remove();
            }
        };
    }

    async startAuction(playerId) {
        if (!this.isAdmin) {
            console.error('Only admins can start auctions');
            return;
        }
        try {
            const player = await this.getPlayer(playerId);
            if (!player) {
                console.error("Player not found");
                return;
            }

            // Set initial price to base price if not set
            const currentPrice = player.currentPrice || this.basePrice;
            
            // Update player status and current auction in Firebase
            await this.auctionsRef.child(playerId).update({
                status: 'bidding',
                currentPrice: currentPrice,
                lastBidTeam: null,
                lastBidTime: Date.now()
            });

            // Show the auction page
            this.showAuctionPage(playerId);

        } catch (error) {
            console.error("Error starting auction:", error);
            alert("Failed to start auction. Please try again.");
        }
    }

    async placeBid(playerId, team, amount) {
        if (!this.isAdmin) {
            console.error("Only admins can place bids");
            return;
        }

        try {
            const currentAuction = await this.auctionsRef.child(playerId).once('value');
            const auctionData = currentAuction.val();
            
            if (!auctionData || auctionData.status !== 'bidding') {
                alert('No active auction');
                return;
            }

            // Get team data
            const teamSnapshot = await this.teamsRef.child(team).once('value');
            const teamData = teamSnapshot.val() || { totalSpent: 0 };
            
            // Calculate new price and check budget
            const newPrice = auctionData.currentPrice + amount;
            const remainingBudget = this.maxTeamBudget - teamData.totalSpent;
            
            if (newPrice > remainingBudget) {
                alert(`Team ${team} cannot afford this bid. Remaining budget: ₹${remainingBudget} Lakhs`);
                return;
            }

            // Validate against base price
            const player = this.getPlayer(playerId);
            if (newPrice < player.basePrice) {
                alert(`Bid cannot be lower than base price: ₹${player.basePrice} Lakhs`);
                return;
            }

            await this.auctionsRef.child(playerId).update({
                currentPrice: newPrice,
                lastBidTeam: team,
                lastBidTime: Date.now()
            });
        } catch (error) {
            console.error("Error placing bid:", error);
            alert("Failed to place bid. Please try again.");
        }
    }

    async updateTeamStats(teamsData = null) {
        if (!teamsData) {
            const snapshot = await this.teamsRef.once('value');
            teamsData = snapshot.val() || {};
        }

        const teamA = teamsData.A || { players: {}, totalSpent: 0 };
        const teamB = teamsData.B || { players: {}, totalSpent: 0 };

        // Update team stats in the header for all users
        const teamStatsContainer = document.getElementById('team-stats') || this.createTeamStatsContainer();
        teamStatsContainer.innerHTML = `
            <div class="team-stats-panel">
                <h3>Team A</h3>
                <div>Players: ${Object.keys(teamA.players).length}</div>
                <div>Spent: ₹${teamA.totalSpent} Lakhs</div>
                <div>Remaining: ₹${this.maxTeamBudget - teamA.totalSpent} Lakhs</div>
            </div>
            <div class="team-stats-panel">
                <h3>Team B</h3>
                <div>Players: ${Object.keys(teamB.players).length}</div>
                <div>Spent: ₹${teamB.totalSpent} Lakhs</div>
                <div>Remaining: ₹${this.maxTeamBudget - teamB.totalSpent} Lakhs</div>
            </div>
        `;

        // Update auction page stats if they exist
        const teamAPlayers = document.getElementById('team-a-players');
        const teamASpent = document.getElementById('team-a-spent');
        const teamBPlayers = document.getElementById('team-b-players');
        const teamBSpent = document.getElementById('team-b-spent');

        if (teamAPlayers) teamAPlayers.textContent = Object.keys(teamA.players).length;
        if (teamASpent) teamASpent.textContent = teamA.totalSpent;
        if (teamBPlayers) teamBPlayers.textContent = Object.keys(teamB.players).length;
        if (teamBSpent) teamBSpent.textContent = teamB.totalSpent;
    }

    createTeamStatsContainer() {
        const container = document.createElement('div');
        container.id = 'team-stats';
        container.className = 'team-stats-container';
        document.body.insertBefore(container, document.body.firstChild);
        return container;
    }

    async clearBidding(playerId) {
        if (!this.isAdmin) return;

        try {
            // Reset to base price and clear bid history
            await this.auctionsRef.child(playerId).update({
                currentPrice: this.basePrice,
                lastBidTeam: null,
                lastBidTime: null
            });
        } catch (error) {
            console.error("Error clearing bids:", error);
        }
    }

    async markUnsold(playerId) {
        if (!this.isAdmin) return;

        try {
            // Update status in both auctions and playersMaster
            await this.auctionsRef.child(playerId).update({
                status: 'unsold',
                currentPrice: this.basePrice,  // Reset to base price
                soldTo: null
            });

            await this.playersMasterRef.child(playerId).update({
                status: 'unsold',
                currentPrice: this.basePrice,
                team: null
            });

            // Remove from active auctions
            await this.auctionsRef.child(playerId).remove();

            // Force UI update
            window.location.reload();
        } catch (error) {
            console.error("Error marking player as unsold:", error);
        }
    }

    async endAuction(playerId) {
        if (!this.isAdmin) return;

        try {
            const currentAuction = await this.auctionsRef.child(playerId).once('value');
            const auctionData = currentAuction.val();

            if (!auctionData.lastBidTeam) {
                alert('No bids placed. Mark as unsold or clear bidding.');
                return;
            }

            const finalPrice = auctionData.currentPrice;
            const winningTeam = auctionData.lastBidTeam;

            // Update player status in both auctions and playersMaster
            await this.auctionsRef.child(playerId).update({
                status: 'sold',
                soldTo: winningTeam,
                finalPrice: finalPrice,
                currentPrice: finalPrice
            });

            await this.playersMasterRef.child(playerId).update({
                status: 'sold',
                team: winningTeam,
                currentPrice: finalPrice
            });

            // Update team data
            const teamRef = this.teamsRef.child(winningTeam);
            const teamSnapshot = await teamRef.once('value');
            const teamData = teamSnapshot.val() || { players: {}, totalSpent: 0 };

            await teamRef.update({
                players: { ...teamData.players, [playerId]: true },
                totalSpent: teamData.totalSpent + finalPrice
            });

            // Remove from active auctions and reload
            await this.auctionsRef.child(playerId).remove();
            window.location.reload();
        } catch (error) {
            console.error("Error ending auction:", error);
        }
    }

    async addPlayer(playerData) {
        if (!this.playersMasterRef) {
            console.error("Cannot add player - database not initialized");
            throw new Error("Database not initialized");
        }

        try {
            const newPlayerRef = this.playersMasterRef.push();
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
        if (!this.playersMasterRef) {
            console.error("Cannot start bidding - database not initialized");
            throw new Error("Database not initialized");
        }

        try {
            const playerRef = this.playersMasterRef.child(playerId);
            const snapshot = await playerRef.once('value');
            const player = snapshot.val();
            
            if (player) {
                await this.auctionsRef.child(playerId).update({
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
        if (!this.playersMasterRef) {
            console.error("Cannot update bid - database not initialized");
            throw new Error("Database not initialized");
        }

        try {
            const playerRef = this.playersMasterRef.child(playerId);
            const snapshot = await playerRef.once('value');
            const player = snapshot.val();
            
            if (player) {
                const newPrice = player.currentPrice + 10; // Increment by 10 lakhs
                await this.auctionsRef.child(playerId).update({
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
        if (!this.playersMasterRef) {
            console.error("Cannot complete auction - database not initialized");
            throw new Error("Database not initialized");
        }

        try {
            const playerRef = this.playersMasterRef.child(playerId);
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
            const playerRef = this.playersMasterRef.child(playerId);
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

    async showAuctionPage(playerId) {
        try {
            const player = await this.getPlayer(playerId);
            if (!player) {
                console.error("Player not found");
                return;
            }

            // Create auction page HTML
            const auctionPage = document.createElement('div');
            auctionPage.className = 'auction-page';
            auctionPage.innerHTML = `
                <div class="auction-container">
                    <div class="auction-header">
                        <h1>Current Auction</h1>
                        <button onclick="window.location.reload()" class="secondary-button">Back to Players</button>
                    </div>

                    <div class="current-player">
                        <div class="player-image-container">
                            <img src="${player.image}" alt="${player.name}">
                        </div>
                        <div class="player-info">
                            <h2>${player.name}</h2>
                            <p class="player-pitch">${player.pitch}</p>
                            <div class="player-sports">
                                ${player.interestedGames.map(game => `<span class="sport-tag">${game}</span>`).join('')}
                            </div>
                            <div class="base-price">Base Price: ₹${player.currentPrice || this.basePrice} Lakhs</div>
                        </div>
                    </div>

                    <div class="teams-section">
                        <div class="team-panel team-a">
                            <h3>Team A</h3>
                            <div class="team-stats">
                                <div class="stat">Players: <span id="team-a-players">0</span></div>
                                <div class="stat">Spent: ₹<span id="team-a-spent">0</span> Lakhs</div>
                                <div class="stat">Remaining: ₹<span id="team-a-remaining">1000</span> Lakhs</div>
                            </div>
                            <div class="bid-controls">
                                <button onclick="window.dataHandler.placeBid('${playerId}', 'A', 10)" class="bid-button">+10 Lakhs</button>
                            </div>
                        </div>

                        <div class="current-bid-panel">
                            <h3>Current Bid</h3>
                            <div class="current-amount">₹<span id="current-bid">${player.currentPrice || this.basePrice}</span> Lakhs</div>
                            <div id="last-bidder" class="last-bidder">No bids yet</div>
                            <div class="bid-timer" id="bid-timer"></div>
                        </div>

                        <div class="team-panel team-b">
                            <h3>Team B</h3>
                            <div class="team-stats">
                                <div class="stat">Players: <span id="team-b-players">0</span></div>
                                <div class="stat">Spent: ₹<span id="team-b-spent">0</span> Lakhs</div>
                                <div class="stat">Remaining: ₹<span id="team-b-remaining">1000</span> Lakhs</div>
                            </div>
                            <div class="bid-controls">
                                <button onclick="window.dataHandler.placeBid('${playerId}', 'B', 10)" class="bid-button">+10 Lakhs</button>
                            </div>
                        </div>
                    </div>

                    <div class="admin-controls">
                        <button onclick="window.dataHandler.clearBidding('${playerId}')" class="secondary-button">Clear Bidding</button>
                        <button onclick="window.dataHandler.markUnsold('${playerId}')" class="secondary-button">Mark Unsold</button>
                        <button onclick="window.dataHandler.endAuction('${playerId}')" class="primary-button">End Bidding</button>
                    </div>
                </div>
            `;
            
            // Clear existing content and add auction page
            document.body.innerHTML = '';
            document.body.appendChild(auctionPage);

            // Update team stats
            this.updateTeamStats();
        } catch (error) {
            console.error("Error showing auction page:", error);
        }
    }

    async updateTeamPanels() {
        const teamAPlayers = this.players.filter(p => p.team === 'A');
        const teamBPlayers = this.players.filter(p => p.team === 'B');
        const playersListA = document.getElementById('team-a-players');
        const playersListB = document.getElementById('team-b-players');
        const spentElementA = document.getElementById('team-a-spent');
        const spentElementB = document.getElementById('team-b-spent');
        const playersCountElementA = document.getElementById('team-a-players-count');
        const playersCountElementB = document.getElementById('team-b-players-count');
        const remainingElementA = document.getElementById('team-a-remaining');
        const remainingElementB = document.getElementById('team-b-remaining');
        
        if (playersListA) {
            playersListA.innerHTML = teamAPlayers.map(player => `
                <div class="team-player">
                    <span>${player.name}</span>
                    <span>₹${player.currentPrice} Lakhs</span>
                </div>
            `).join('');
        }
        
        if (playersListB) {
            playersListB.innerHTML = teamBPlayers.map(player => `
                <div class="team-player">
                    <span>${player.name}</span>
                    <span>₹${player.currentPrice} Lakhs</span>
                </div>
            `).join('');
        }
        
        if (spentElementA) {
            const totalSpentA = teamAPlayers.reduce((sum, p) => sum + (p.currentPrice || 0), 0);
            spentElementA.textContent = totalSpentA;
        }
        
        if (spentElementB) {
            const totalSpentB = teamBPlayers.reduce((sum, p) => sum + (p.currentPrice || 0), 0);
            spentElementB.textContent = totalSpentB;
        }
        
        if (playersCountElementA) {
            playersCountElementA.textContent = teamAPlayers.length;
        }
        
        if (playersCountElementB) {
            playersCountElementB.textContent = teamBPlayers.length;
        }
        
        if (remainingElementA) {
            const totalSpentA = teamAPlayers.reduce((sum, p) => sum + (p.currentPrice || 0), 0);
            remainingElementA.textContent = 1000 - totalSpentA;
        }
        
        if (remainingElementB) {
            const totalSpentB = teamBPlayers.reduce((sum, p) => sum + (p.currentPrice || 0), 0);
            remainingElementB.textContent = 1000 - totalSpentB;
        }
    }

    async addFilterControls(container) {
        // This method is now empty to remove the filter checkboxes
    }

    async getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    getPlayers() {
        return this.players;
    }
}

// Initialize data handler after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing data handler");
    window.dataHandler = new FirebaseDataHandler();
});
