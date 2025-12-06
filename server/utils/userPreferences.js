/**
 * User Preferences Utility Functions
 * Handles reading and writing user preferences from JSON file
 */

const fs = require('fs');
const path = require('path');

const USER_PREFERENCES_FILE = path.join(__dirname, '../data/user-preferences.json');

/**
 * Load all user preferences from file
 */
const loadUserPreferences = () => {
  try {
    if (fs.existsSync(USER_PREFERENCES_FILE)) {
      const data = fs.readFileSync(USER_PREFERENCES_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return [];
  }
};

/**
 * Save user preferences to file
 */
const saveUserPreferences = (preferences) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(USER_PREFERENCES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(USER_PREFERENCES_FILE, JSON.stringify(preferences, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
};

/**
 * Get preferences for a specific user
 */
const getUserPreferences = (userId) => {
  const allPreferences = loadUserPreferences();
  return allPreferences.find(pref => pref.userId === userId) || null;
};

/**
 * Save or update preferences for a user
 */
const saveUserPreference = (userId, preferences) => {
  const allPreferences = loadUserPreferences();
  const existingIndex = allPreferences.findIndex(pref => pref.userId === userId);
  
  const preferenceData = {
    userId,
    interestedAccounts: preferences.interestedAccounts || [],
    interestedProjects: preferences.interestedProjects || [],
    updatedAt: new Date().toISOString(),
    ...(existingIndex === -1 ? { createdAt: new Date().toISOString() } : {})
  };
  
  if (existingIndex >= 0) {
    // Update existing
    allPreferences[existingIndex] = {
      ...allPreferences[existingIndex],
      ...preferenceData
    };
  } else {
    // Add new
    allPreferences.push(preferenceData);
  }
  
  return saveUserPreferences(allPreferences);
};

/**
 * Delete preferences for a user
 */
const deleteUserPreference = (userId) => {
  const allPreferences = loadUserPreferences();
  const filtered = allPreferences.filter(pref => pref.userId !== userId);
  return saveUserPreferences(filtered);
};

module.exports = {
  loadUserPreferences,
  saveUserPreferences,
  getUserPreferences,
  saveUserPreference,
  deleteUserPreference
};

