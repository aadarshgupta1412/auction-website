class FirebaseDataHandler {
    constructor() {
        console.log("Initializing FirebaseDataHandler");
        this.initializeHandler();
        this.currentAuctionPlayer = null;
        this.isAdmin = false; // Default to non-admin
        this.teamsRef = null;
        this.maxTeamBudget = 1000; // Maximum budget in lakhs
        this.basePrice = 20; // Base price in lakhs
        this.playersRef = database.ref('players');
        this.playersMasterRef = database.ref('playersMaster');
        this.players = [];
    }

    async initializeHandler() {
        try {
            await this.initializeFirebase();
            this.currentAuctionRef = window.database.ref('currentAuction');
            this.teamsRef = window.database.ref('teams');
            
            // Set up listeners
            this.setupPlayersListener();
            this.setupCurrentAuctionListener();
            this.setupTeamsListener();
            
            // Check admin status
            const user = await this.getCurrentUser();
            if (user) {
                const adminSnapshot = await window.database.ref('admins').child(user.uid).once('value');
                this.setAdminStatus(adminSnapshot.exists());
            }
        } catch (error) {
            console.error("Error initializing handler:", error);
        }
    }

    setupCurrentAuctionListener() {
        this.currentAuctionRef.on('value', (snapshot) => {
            const auctionData = snapshot.val();
            if (auctionData && auctionData.status === 'active') {
                this.currentAuctionPlayer = auctionData.playerId;
                this.showAuctionPage(auctionData.playerId);
            }
        });
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
                        <img src="${player.image}" alt="${player.name}" class="player-image">
                        <div class="player-info">
                            <h2>${player.name}</h2>
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
                                <button onclick="window.dataHandler.placeBid('A', 10)" class="bid-button">+10 Lakhs</button>
                                <button onclick="window.dataHandler.placeBid('A', 0)" class="bid-button">+0 Lakhs</button>
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
                                <button onclick="window.dataHandler.placeBid('B', 10)" class="bid-button">+10 Lakhs</button>
                                <button onclick="window.dataHandler.placeBid('B', 0)" class="bid-button">+0 Lakhs</button>
                            </div>
                        </div>
                    </div>

                    <div class="admin-controls">
                        <button onclick="window.dataHandler.clearBidding('${playerId}')" class="secondary-button">Clear Bidding</button>
                        <button onclick="window.dataHandler.markUnsold('${playerId}')" class="secondary-button">Mark Unsold</button>
                        <button onclick="window.dataHandler.endBidding('${playerId}')" class="primary-button">End Bidding</button>
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

    async startAuction(playerId) {
        if (!this.isAdmin) {
            console.error("Only admins can start auctions");
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
            await this.playersRef.child(playerId).update({
                status: 'bidding',
                currentPrice: currentPrice
            });

            await this.currentAuctionRef.set({
                playerId: playerId,
                currentPrice: currentPrice,
                lastBidTeam: null,
                status: 'active',
                startTime: Date.now()
            });

            // Show the auction page
            this.showAuctionPage(playerId);

        } catch (error) {
            console.error("Error starting auction:", error);
            alert("Failed to start auction. Please try again.");
        }
    }

    updateUI(players) {
        console.log("Updating UI with players:", players);
        const grid = document.getElementById('player-grid');
        if (!grid) {
            console.error("Player grid not found");
            return;
        }

        // Add filter controls if they don't exist
        this.addFilterControls(grid.parentElement);

        grid.innerHTML = players.map(player => {
            const statusClass = player.status || 'available';
            const statusText = {
                'available': '',
                'bidding': 'In Auction',
                'sold': 'Sold',
                'unsold': 'Unsold'
            }[player.status || 'available'];

            const price = player.finalPrice || player.currentPrice || this.basePrice;
            const canStartAuction = this.isAdmin && (player.status === 'available' || player.status === 'bidding');

            return `
                <div class="player-card ${statusClass}" onclick="window.dataHandler.viewPlayerDetails('${player.id}')">
                    <div class="player-image">
                        <img src="${player.image}" alt="${player.name}">
                        ${statusText ? `<div class="status-badge ${statusClass}">${statusText}</div>` : ''}
                    </div>
                    <div class="player-info">
                        <h3>${player.name}</h3>
                        <div class="price">₹${price} Lakhs</div>
                        ${player.soldTo ? `<div class="team-badge team-${player.soldTo.toLowerCase()}">Team ${player.soldTo}</div>` : ''}
                        <div class="games-grid">
                            ${player.interestedGames.map(game => `
                                <div class="game-tag">${game}</div>
                            `).join('')}
                        </div>
                    </div>
                    ${canStartAuction ? `
                        <button class="start-auction-btn" onclick="event.stopPropagation(); window.dataHandler.startAuction('${player.id}')">
                            ${player.status === 'bidding' ? 'Resume Auction' : 'Start Auction'}
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');

        this.updateTeamStats();
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

    setupDatabaseReferences() {
        this.playersRef = window.database.ref('players');
        this.currentAuctionRef = window.database.ref('currentAuction');
        this.teamsRef = window.database.ref('teams');
    }

    setupListeners() {
        console.log("Setting up Firebase listeners");
        if (!this.playersRef || !this.currentAuctionRef || !this.teamsRef) {
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

    async checkAdminStatus() {
        // Check if user is admin (you'll need to implement your admin authentication logic here)
        const user = await this.getCurrentUser();
        if (user) {
            const adminSnapshot = await window.database.ref('admins').child(user.uid).once('value');
            this.setAdminStatus(adminSnapshot.exists());
        }
    }

    setAdminStatus(isAdmin) {
        this.isAdmin = isAdmin;
        this.updateUIForRole();
    }

    updateUIForRole() {
        document.body.classList.toggle('admin-mode', this.isAdmin);
        document.body.classList.toggle('user-mode', !this.isAdmin);
        this.updateUI(this.players);
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

    async placeBid(team, amount) {
        if (!this.isAdmin) {
            console.error("Only admins can place bids");
            return;
        }

        try {
            const currentAuction = await this.currentAuctionRef.once('value');
            const auctionData = currentAuction.val();
            
            if (!auctionData || auctionData.status !== 'active') {
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
            const player = this.getPlayer(auctionData.playerId);
            if (newPrice < player.basePrice) {
                alert(`Bid cannot be lower than base price: ₹${player.basePrice} Lakhs`);
                return;
            }

            await this.currentAuctionRef.update({
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

        const teamA = teamsData.A || { players: [], totalSpent: 0 };
        const teamB = teamsData.B || { players: [], totalSpent: 0 };

        // Update team stats in the header for all users
        const teamStatsContainer = document.getElementById('team-stats') || this.createTeamStatsContainer();
        teamStatsContainer.innerHTML = `
            <div class="team-stats-panel">
                <h3>Team A</h3>
                <div>Players: ${teamA.players.length}</div>
                <div>Spent: ₹${teamA.totalSpent} Lakhs</div>
                <div>Remaining: ₹${this.maxTeamBudget - teamA.totalSpent} Lakhs</div>
            </div>
            <div class="team-stats-panel">
                <h3>Team B</h3>
                <div>Players: ${teamB.players.length}</div>
                <div>Spent: ₹${teamB.totalSpent} Lakhs</div>
                <div>Remaining: ₹${this.maxTeamBudget - teamB.totalSpent} Lakhs</div>
            </div>
        `;

        // Update auction page stats if they exist
        const teamAPlayers = document.getElementById('team-a-players');
        const teamASpent = document.getElementById('team-a-spent');
        const teamBPlayers = document.getElementById('team-b-players');
        const teamBSpent = document.getElementById('team-b-spent');

        if (teamAPlayers) teamAPlayers.textContent = teamA.players.length;
        if (teamASpent) teamASpent.textContent = teamA.totalSpent;
        if (teamBPlayers) teamBPlayers.textContent = teamB.players.length;
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
            const player = await this.getPlayer(playerId);
            await this.currentAuctionRef.update({
                currentPrice: player.basePrice,
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
            await this.playersRef.child(playerId).update({
                status: 'unsold',
                currentPrice: null,
                soldTo: null
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

            const finalPrice = auctionData.currentPrice;
            const winningTeam = auctionData.lastBidTeam;

            // Update player status
            await this.playersRef.child(playerId).update({
                status: 'sold',
                soldTo: winningTeam,
                finalPrice: finalPrice
            });

            // Update team data
            const teamRef = this.teamsRef.child(winningTeam);
            const teamSnapshot = await teamRef.once('value');
            const teamData = teamSnapshot.val() || { players: [], totalSpent: 0 };

            await teamRef.update({
                players: [...teamData.players, playerId],
                totalSpent: teamData.totalSpent + finalPrice
            });

            // End the auction
            await this.currentAuctionRef.update({
                status: 'ended'
            });

            window.location.reload();
        } catch (error) {
            console.error("Error ending auction:", error);
        }
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

    async restorePlayersFromJSON() {
        if (!this.isAdmin) {
            console.error("Only admins can restore data");
            alert("You must be an admin to restore data");
            return;
        }

        try {
            // First, fetch the sample players data
            const response = await fetch('/sample-players.json');
            const data = await response.json();
            
            if (!data || !data.players) {
                throw new Error("Invalid players data format");
            }

            // Get a reference to the players node
            const playersRef = window.database.ref('players');
            const playersMasterRef = window.database.ref('playersMaster');
            
            // Clear existing data
            await playersRef.remove();
            await playersMasterRef.remove();
            
            // Add each player
            for (const [key, player] of Object.entries(data.players)) {
                await playersMasterRef.child(player.id).set({
                    ...player,
                    basePrice: 20,
                    currentPrice: 20,
                    status: 'available',
                    soldTo: null,
                    finalPrice: null
                });
                await playersRef.child(player.id).set({
                    ...player,
                    basePrice: 20,
                    currentPrice: 20,
                    status: 'available',
                    soldTo: null,
                    finalPrice: null
                });
            }

            alert("Players data has been restored successfully!");
            window.location.reload(); // Refresh to show restored data
        } catch (error) {
            console.error("Error restoring players:", error);
            alert("Failed to restore players data. Please try again.");
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
                <h3>${player.status === 'sold' ? 'Final Price' : 'Current Price'}</h3>
                <div class="price-amount">₹${player.finalPrice || player.currentPrice || player.basePrice} Lakhs</div>
                ${player.soldTo ? `
                    <div class="team-badge team-${player.soldTo.toLowerCase()}">Sold to Team ${player.soldTo}</div>
                ` : ''}
            </div>

            ${this.isAdmin && player.status === 'available' ? `
                <div class="modal-actions">
                    <button class="primary-button" onclick="window.dataHandler.startAuction('${player.id}')">Start Auction</button>
                </div>
            ` : ''}
            
            <div class="modal-actions">
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

    async getCurrentUser() {
        // Implement your authentication logic here to get the current user
        // For now, just return a dummy user
        return {
            uid: 'dummy-user'
        };
    }

    setupPlayersListener() {
        this.playersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.players = Object.entries(data).map(([id, player]) => ({
                    id,
                    ...player
                }));
                this.updateUI();
            }
        });
    }

    updateUI() {
        const playerGrid = document.getElementById('player-grid');
        if (!playerGrid) return;

        playerGrid.innerHTML = '';
        
        this.players.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.status || 'available'}`;
            
            const cardContent = `
                <img src="${player.image || 'https://via.placeholder.com/150'}" alt="${player.name}">
                <h3>${player.name}</h3>
                <div class="player-details">
                    <p>Base Price: ₹${player.basePrice || 20} Lakhs</p>
                    ${player.currentPrice ? `<p>Current Price: ₹${player.currentPrice} Lakhs</p>` : ''}
                    ${player.team ? `<p>Team: ${player.team}</p>` : ''}
                </div>
                ${this.isAdmin && player.status !== 'sold' ? 
                    `<button onclick="window.dataHandler.startAuction('${player.id}')" class="auction-button">
                        ${player.status === 'bidding' ? 'Resume Auction' : 'Start Auction'}
                    </button>` 
                    : ''
                }
            `;
            
            card.innerHTML = cardContent;
            playerGrid.appendChild(card);
        });

        // Update team panels
        this.updateTeamPanel('a');
        this.updateTeamPanel('b');
    }

    updateTeamPanel(team) {
        const teamPlayers = this.players.filter(p => p.team === team.toUpperCase());
        const playersList = document.getElementById(`team-${team}-players`);
        const spentElement = document.getElementById(`team-${team}-spent`);
        const playersCountElement = document.getElementById(`team-${team}-players-count`);
        const remainingElement = document.getElementById(`team-${team}-remaining`);
        
        if (playersList) {
            playersList.innerHTML = teamPlayers.map(player => `
                <div class="team-player">
                    <span>${player.name}</span>
                    <span>₹${player.currentPrice} Lakhs</span>
                </div>
            `).join('');
        }
        
        if (spentElement) {
            const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.currentPrice || 0), 0);
            spentElement.textContent = totalSpent;
        }
        
        if (playersCountElement) {
            playersCountElement.textContent = teamPlayers.length;
        }
        
        if (remainingElement) {
            const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.currentPrice || 0), 0);
            remainingElement.textContent = 1000 - totalSpent;
        }
    }

    async startAuction(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        try {
            await this.playersRef.child(playerId).update({
                status: 'bidding',
                currentPrice: player.basePrice || 20
            });
        } catch (error) {
            console.error('Error starting auction:', error);
            alert('Failed to start auction. Please try again.');
        }
    }

    async restorePlayersFromJSON() {
        if (!this.isAdmin) {
            alert('Only admins can restore player data');
            return;
        }

        try {
            const response = await fetch('/sample-players.json');
            const players = await response.json();
            
            // Clear existing data
            await this.playersRef.set(null);
            await this.playersMasterRef.set(null);
            
            // Add new players
            for (const player of players) {
                const newPlayer = {
                    ...player,
                    status: 'available',
                    basePrice: 20,
                    currentPrice: 20
                };
                await this.playersRef.push(newPlayer);
                await this.playersMasterRef.push(newPlayer);
            }
            
            alert('Players data restored successfully!');
        } catch (error) {
            console.error('Error restoring players:', error);
            alert('Failed to restore players data. Please try again.');
        }
    }
}

// Initialize data handler after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing data handler");
    window.dataHandler = new FirebaseDataHandler();
});
