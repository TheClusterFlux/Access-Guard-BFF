const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://admin:accessguard2024@localhost:27017/accessguard?authSource=admin';

async function updatePasswords() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('accessguard');
    const usersCollection = db.collection('users');
    
    // Test users with their passwords
    const testUsers = [
      { email: 'john.smith@example.com', password: 'password123' },
      { email: 'sarah.johnson@example.com', password: 'password123' },
      { email: 'mike.wilson@example.com', password: 'password123' },
      { email: 'security@accessguard.com', password: 'password123' },
      { email: 'admin@accessguard.com', password: 'password123' }
    ];
    
    for (const user of testUsers) {
      const passwordHash = bcrypt.hashSync(user.password, 12);
      
      const result = await usersCollection.updateOne(
        { email: user.email },
        { $set: { passwordHash: passwordHash } }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ Updated password for ${user.email}`);
      } else {
        console.log(`❌ User not found: ${user.email}`);
      }
    }
    
    console.log('\n🎉 All passwords updated successfully!');
    console.log('\nYou can now test login with:');
    console.log('curl -X POST http://localhost:3000/api/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"email": "john.smith@example.com", "password": "password123"}\'');
    
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    await client.close();
  }
}

updatePasswords(); 