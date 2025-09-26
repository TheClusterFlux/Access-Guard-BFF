// Script to fix test user passwords
const bcrypt = require('bcryptjs');

// Test users with their correct passwords
const testUsers = [
  {
    email: 'john.smith@example.com',
    password: 'password123'
  },
  {
    email: 'sarah.johnson@example.com',
    password: 'password123'
  },
  {
    email: 'mike.wilson@example.com',
    password: 'password123'
  },
  {
    email: 'security@accessguard.com',
    password: 'password123'
  },
  {
    email: 'admin@accessguard.com',
    password: 'password123'
  }
];

// Generate proper password hashes
const usersWithHashes = testUsers.map(user => ({
  ...user,
  passwordHash: bcrypt.hashSync(user.password, 12)
}));

console.log('Test users with proper password hashes:');
console.log(JSON.stringify(usersWithHashes, null, 2));

console.log('\nTo update the database, run this MongoDB command:');
console.log('db.users.updateOne({email: "john.smith@example.com"}, {$set: {passwordHash: "' + usersWithHashes[0].passwordHash + '"}})');
console.log('db.users.updateOne({email: "sarah.johnson@example.com"}, {$set: {passwordHash: "' + usersWithHashes[1].passwordHash + '"}})');
console.log('db.users.updateOne({email: "mike.wilson@example.com"}, {$set: {passwordHash: "' + usersWithHashes[2].passwordHash + '"}})');
console.log('db.users.updateOne({email: "security@accessguard.com"}, {$set: {passwordHash: "' + usersWithHashes[3].passwordHash + '"}})');
console.log('db.users.updateOne({email: "admin@accessguard.com"}, {$set: {passwordHash: "' + usersWithHashes[4].passwordHash + '"}})'); 