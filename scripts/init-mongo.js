// MongoDB initialization script for AccessGuard
// This script runs when the MongoDB container starts for the first time

print('Starting AccessGuard MongoDB initialization...');

// Switch to the accessguard database
db = db.getSiblingDB('accessguard');

// Create a dedicated user for the application
db.createUser({
  user: 'accessguard_user',
  pwd: 'accessguard_app_password',
  roles: [
    { role: 'readWrite', db: 'accessguard' },
    { role: 'dbAdmin', db: 'accessguard' }
  ]
});

// Create collections with proper indexes
print('Creating collections and indexes...');

// Users collection
db.createCollection('users');
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "status": 1 });

// Residents collection
db.createCollection('residents');
db.residents.createIndex({ "userId": 1 }, { unique: true });
db.residents.createIndex({ "unitNumber": 1 });
db.residents.createIndex({ "status": 1 });

// Guest codes collection
db.createCollection('guestCodes');
db.guestCodes.createIndex({ "code": 1 }, { unique: true });
db.guestCodes.createIndex({ "residentId": 1 });
db.guestCodes.createIndex({ "validTo": 1 });
db.guestCodes.createIndex({ "status": 1 });

// Guest visits collection
db.createCollection('guestVisits');
db.guestVisits.createIndex({ "residentId": 1 });
db.guestVisits.createIndex({ "visitDate": 1 });
db.guestVisits.createIndex({ "status": 1 });

// Deliveries collection
db.createCollection('deliveries');
db.deliveries.createIndex({ "residentId": 1 });
db.deliveries.createIndex({ "expectedDate": 1 });
db.deliveries.createIndex({ "status": 1 });

// Access logs collection
db.createCollection('accessLogs');
db.accessLogs.createIndex({ "timestamp": 1 });
db.accessLogs.createIndex({ "userId": 1 });
db.accessLogs.createIndex({ "result": 1 });
db.accessLogs.createIndex({ "accessPoint": 1 });

// Notifications collection
db.createCollection('notifications');
db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "read": 1 });
db.notifications.createIndex({ "createdAt": 1 });

print('Collections and indexes created successfully');

// Insert initial test data
print('Inserting initial test data...');

// Insert test users
const users = [
  {
    _id: ObjectId(),
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+1234567890",
    role: "resident",
    passwordHash: "$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    phone: "+1234567891",
    role: "resident",
    passwordHash: "$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: "Mike Wilson",
    email: "mike.wilson@example.com",
    phone: "+1234567892",
    role: "admin",
    passwordHash: "$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: "Security Guard",
    email: "security@accessguard.com",
    phone: "+1234567893",
    role: "security",
    passwordHash: "$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: "System Owner",
    email: "admin@accessguard.com",
    phone: "+1234567894",
    role: "super_admin",
    passwordHash: "$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const userIds = users.map(user => user._id);
db.users.insertMany(users);

// Insert test residents
const residents = [
  {
    _id: ObjectId(),
    userId: userIds[0],
    unitNumber: "A101",
    block: "Block A",
    vehicleInfo: {
      make: "Toyota",
      model: "Camry",
      color: "Silver",
      plateNumber: "ABC123"
    },
    emergencyContacts: [
      {
        name: "Jane Smith",
        phone: "+1234567895",
        relationship: "Spouse"
      }
    ],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    userId: userIds[1],
    unitNumber: "B205",
    block: "Block B",
    vehicleInfo: {
      make: "Honda",
      model: "Civic",
      color: "Blue",
      plateNumber: "XYZ789"
    },
    emergencyContacts: [
      {
        name: "David Johnson",
        phone: "+1234567896",
        relationship: "Spouse"
      }
    ],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const residentIds = residents.map(resident => resident._id);
db.residents.insertMany(residents);

// Insert test guest codes
const guestCodes = [
  {
    _id: ObjectId(),
    code: "123456",
    type: "PIN",
    residentId: residentIds[0],
    guestName: "Alice Brown",
    validFrom: new Date(),
    validTo: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    status: "active",
    createdAt: new Date()
  },
  {
    _id: ObjectId(),
    code: "QR_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
    type: "QR",
    residentId: residentIds[1],
    guestName: "Bob Wilson",
    validFrom: new Date(),
    validTo: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    status: "active",
    createdAt: new Date()
  }
];

const guestCodeIds = guestCodes.map(code => code._id);
db.guestCodes.insertMany(guestCodes);

// Insert test guest visits
const guestVisits = [
  {
    _id: ObjectId(),
    residentId: residentIds[0],
    guestName: "Alice Brown",
    guestCodeId: guestCodeIds[0],
    visitDate: new Date(),
    checkInTime: new Date(),
    checkOutTime: null,
    vehicleInfo: {
      make: "Ford",
      model: "Focus",
      color: "Red",
      plateNumber: "DEF456"
    },
    status: "active",
    notes: "Dinner visit"
  },
  {
    _id: ObjectId(),
    residentId: residentIds[1],
    guestName: "Bob Wilson",
    guestCodeId: guestCodeIds[1],
    visitDate: new Date(),
    checkInTime: null,
    checkOutTime: null,
    vehicleInfo: null,
    status: "scheduled",
    notes: "Business meeting"
  }
];

db.guestVisits.insertMany(guestVisits);

// Insert test deliveries
const deliveries = [
  {
    _id: ObjectId(),
    residentId: residentIds[0],
    deliveryCompany: "Amazon",
    trackingNumber: "AMZ123456789",
    authorizedBy: userIds[0],
    expectedDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    deliveredAt: null,
    status: "authorized",
    notes: "Package delivery"
  },
  {
    _id: ObjectId(),
    residentId: residentIds[1],
    deliveryCompany: "FedEx",
    trackingNumber: "FDX987654321",
    authorizedBy: userIds[1],
    expectedDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    deliveredAt: null,
    status: "authorized",
    notes: "Document delivery"
  }
];

db.deliveries.insertMany(deliveries);

// Insert test access logs
const accessLogs = [
  {
    _id: ObjectId(),
    userId: userIds[0],
    guestCodeId: guestCodeIds[0],
    visitId: null,
    deliveryId: null,
    timestamp: new Date(),
    accessPoint: "main_gate",
    result: "success",
    method: "PIN",
    details: "Resident entry"
  },
  {
    _id: ObjectId(),
    userId: null,
    guestCodeId: guestCodeIds[0],
    visitId: null,
    deliveryId: null,
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    accessPoint: "main_gate",
    result: "success",
    method: "PIN",
    details: "Guest entry - Alice Brown"
  }
];

db.accessLogs.insertMany(accessLogs);

// Insert test notifications
const notifications = [
  {
    _id: ObjectId(),
    userId: userIds[0],
    type: "info",
    title: "Guest Arrival",
    message: "Alice Brown has arrived at the main gate",
    eventRef: guestCodeIds[0],
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    _id: ObjectId(),
    userId: userIds[1],
    type: "alert",
    title: "Delivery Scheduled",
    message: "FedEx delivery scheduled for today",
    eventRef: null,
    read: false,
    createdAt: new Date()
  }
];

db.notifications.insertMany(notifications);

print('Initial test data inserted successfully');
print('AccessGuard MongoDB initialization completed!');

// Print connection information
print('Database: accessguard');
print('Application User: accessguard_user');
print('Application Password: accessguard_app_password');
print('Connection String: mongodb://accessguard_user:accessguard_app_password@localhost:27017/accessguard'); 