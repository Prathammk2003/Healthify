/**
 * Mock database utility functions
 * Used when MongoDB is not available
 */

// Mock collections storage
const mockCollections = {
  users: [],
  medicationReminders: [
    {
      _id: 'mock-reminder-1',
      userId: 'mock-user-1',
      medicationName: 'Test Medication',
      dosage: '10mg',
      frequency: 'Daily',
      time: '08:00',
      status: 'Pending',
      active: true,
      enableVoiceCall: false,
      lastSent: null,
      notes: 'Take with food',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  userProfiles: [
    {
      _id: 'mock-profile-1',
      userId: 'mock-user-1',
      firstName: 'Test',
      lastName: 'User',
      contactNumber: '+1234567890',
      voiceCallEnabled: false
    }
  ],
  appointments: [],
  notifications: []
};

/**
 * Get a mock collection
 * @param {string} collectionName - The name of the collection
 * @returns {Array} - The mock collection data
 */
export function getMockCollection(collectionName) {
  return mockCollections[collectionName] || [];
}

/**
 * Add an item to a mock collection
 * @param {string} collectionName - The name of the collection
 * @param {Object} item - The item to add
 * @returns {Object} - The added item
 */
export function addToMockCollection(collectionName, item) {
  if (!mockCollections[collectionName]) {
    mockCollections[collectionName] = [];
  }
  
  const newItem = {
    ...item,
    _id: item._id || `mock-${collectionName}-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  mockCollections[collectionName].push(newItem);
  return newItem;
}

/**
 * Find items in a mock collection
 * @param {string} collectionName - The name of the collection
 * @param {Object} query - The query to match
 * @returns {Array} - The matching items
 */
export function findInMockCollection(collectionName, query = {}) {
  const collection = mockCollections[collectionName] || [];
  
  if (Object.keys(query).length === 0) {
    return [...collection];
  }
  
  return collection.filter(item => {
    for (const [key, value] of Object.entries(query)) {
      // Handle special operators like $ne, $gt, etc.
      if (typeof value === 'object' && value !== null) {
        if (value.$ne !== undefined && item[key] === value.$ne) {
          return false;
        }
        continue;
      }
      
      // Simple equality check
      if (item[key] !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Check if mock mode is enabled
 * @returns {boolean} - True if mock mode is enabled
 */
export function isMockMode() {
  return global.mockMongoDB === true;
} 