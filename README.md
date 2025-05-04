# Auction Website System

## Setup Instructions

### 1. Firebase Configuration
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Realtime Database
3. Update the Firebase configuration in `js/firebase-config.js`:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID",
    databaseURL: "https://your-project.firebaseio.com"
};
```

### 2. Admin Authentication
1. Update admin credentials in `js/admin-handler.js`:
```javascript
const ADMIN_USERNAME = 'YOUR_ADMIN_USERNAME';
const ADMIN_PASSWORD = 'YOUR_ADMIN_PASSWORD';
```

## Core Functionalities

### 1. Authentication Flow
- Admin login/logout system
- Persistent admin status via localStorage
- Role-based access control

### 2. Player Management
- Player listing with essential details
- Real-time status updates
  * Available
  * In Bidding
  * Sold
  * Unsold
- Interactive player cards
- Detailed player view on click

### 3. Auction System
- Admin auction controls
- Real-time bidding (+10L increments)
- Team budget validation
- Live auction status updates
- Auction control actions:
  * Clear Bidding (reset to base price)
  * Mark Unsold
  * End Bidding (assign to last bidder)

### 4. Database Structure
- playersMaster: Player database
- auctions: Active auction tracking
- teams: Team management
- Real-time Firebase updates

### 5. Team Management
- Player roster tracking
- Budget monitoring
  * Total spent
  * Remaining budget
- Real-time team statistics

## Base Price
All players start with a base price of ₹20 Lakhs

## Security Note
This repository contains placeholder credentials. Make sure to:
1. Replace Firebase configuration with your own project credentials
2. Set secure admin username and password
3. Configure proper Firebase security rules for production use