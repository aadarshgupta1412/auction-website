// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
    measurementId: "G-ABCDEF123",
    databaseURL: "https://your-project.firebaseio.com"
};

// Initialize Firebase
console.log("Initializing Firebase...");
firebase.initializeApp(firebaseConfig);

// Initialize services
const database = firebase.database();
const auth = firebase.auth();

// Export the services
export { database, auth };

// Add a test player if database is empty
console.log("Checking database for players...");
database.ref('players').once('value').then((snapshot) => {
    if (!snapshot.exists()) {
        console.log("No players found, adding test player...");
        database.ref('players').push({
            name: "Test Player",
            image: "https://i.pravatar.cc/300?img=1",
            pitch: "Test player for database initialization",
            interestedGames: ["Chess", "Football"],
            currentPrice: 20,
            status: "available",
            team: null
        }).then(() => {
            console.log("Test player added successfully!");
        }).catch((error) => {
            console.error("Error adding test player:", error);
        });
    } else {
        console.log("Players already exist in database:", snapshot.val());
    }
}).catch((error) => {
    console.error("Error checking database:", error);
});

// Set up anonymous auth
console.log("Starting anonymous auth...");
auth.signInAnonymously().catch((error) => {
    console.error("Error with anonymous auth:", error);
});

// Make database available globally
console.log("Setting up database reference...");
window.database = database;

// Function to manually write sample data
window.writeSampleData = async () => {
    console.log("Writing sample data...");
    try {
        const playersRef = window.database.ref('players');
        
        // Sample data
        const samplePlayers = {
            "player1": {
                "id": "player1",
                "name": "Rahul Kumar",
                "image": "https://i.pravatar.cc/300?img=11",
                "pitch": "State-level chess player with experience in organizing tournaments. Also play football as striker. Known for strategic gameplay and quick decision making.",
                "interestedGames": ["Chess", "Football", "Table Tennis"],
                "currentPrice": 20,
                "status": "available",
                "team": null
            },
            "player2": {
                "id": "player2",
                "name": "Priya Singh",
                "image": "https://i.pravatar.cc/300?img=5",
                "pitch": "Professional badminton player with district-level achievements. Also enjoy carrom and chess. Strong in both singles and doubles formats.",
                "interestedGames": ["Badminton Singles", "Badminton Doubles", "Carrom", "Chess"],
                "currentPrice": 20,
                "status": "available",
                "team": null
            },
            "player3": {
                "id": "player3",
                "name": "Alex D'Souza",
                "image": "https://i.pravatar.cc/300?img=7",
                "pitch": "The Mafia game master! Also skilled in table tennis and volleyball. Great at team coordination and strategy games.",
                "interestedGames": ["Mafia", "Table Tennis", "Volleyball", "Chess"],
                "currentPrice": 20,
                "status": "available",
                "team": null
            }
        };
        
        await playersRef.set(samplePlayers);
        console.log("Sample data written successfully!");
        return true;
    } catch (error) {
        console.error("Error writing sample data:", error);
        return false;
    }
};

// Initialize data
async function initializeData() {
    console.log("Initializing data...");
    try {
        const playersRef = window.database.ref('players');
        const snapshot = await playersRef.once('value');
        console.log("Got snapshot:", snapshot.val());
        
        if (!snapshot.exists()) {
            console.log("No data exists, adding sample data...");
            // Sample data
            const samplePlayers = {
                "player1": {
                    "id": "player1",
                    "name": "Rahul Kumar",
                    "image": "https://i.pravatar.cc/300?img=11",
                    "pitch": "State-level chess player with experience in organizing tournaments. Also play football as striker. Known for strategic gameplay and quick decision making.",
                    "interestedGames": ["Chess", "Football", "Table Tennis"],
                    "currentPrice": 20,
                    "status": "available",
                    "team": null
                },
                "player2": {
                    "id": "player2",
                    "name": "Priya Singh",
                    "image": "https://i.pravatar.cc/300?img=5",
                    "pitch": "Professional badminton player with district-level achievements. Also enjoy carrom and chess. Strong in both singles and doubles formats.",
                    "interestedGames": ["Badminton Singles", "Badminton Doubles", "Carrom", "Chess"],
                    "currentPrice": 20,
                    "status": "available",
                    "team": null
                },
                "player3": {
                    "id": "player3",
                    "name": "Alex D'Souza",
                    "image": "https://i.pravatar.cc/300?img=7",
                    "pitch": "The Mafia game master! Also skilled in table tennis and volleyball. Great at team coordination and strategy games.",
                    "interestedGames": ["Mafia", "Table Tennis", "Volleyball", "Chess"],
                    "currentPrice": 20,
                    "status": "available",
                    "team": null
                }
            };
            await playersRef.set(samplePlayers);
            console.log("Sample data added successfully!");
        } else {
            console.log("Data already exists");
        }
    } catch (error) {
        console.error("Error initializing data:", error);
    }
}

// Initialize data
initializeData().catch(console.error);
