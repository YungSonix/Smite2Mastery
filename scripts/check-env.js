#!/usr/bin/env node

/**
 * Script to check if Supabase environment variables are configured
 * Run with: node scripts/check-env.js
 */

const requiredVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_KEY'
];

console.log('🔍 Checking Supabase environment variables...\n');

let allPresent = true;
const results = {};

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  const length = value ? value.length : 0;
  
  results[varName] = {
    present: isPresent,
    length: length,
    preview: isPresent ? (value.substring(0, 20) + '...') : 'MISSING'
  };
  
  if (!isPresent) {
    allPresent = false;
  }
});

// Display results
console.log('Results:');
console.log('─'.repeat(60));
requiredVars.forEach(varName => {
  const result = results[varName];
  const status = result.present ? '✅' : '❌';
  console.log(`${status} ${varName}`);
  console.log(`   Present: ${result.present}`);
  console.log(`   Length: ${result.length}`);
  if (result.present) {
    console.log(`   Preview: ${result.preview}`);
  }
  console.log('');
});

if (allPresent) {
  console.log('✅ All required environment variables are set!');
  console.log('\n💡 For Vercel: Make sure these are also set in Vercel dashboard');
  console.log('💡 For Expo: Make sure these are set in Expo dashboard');
  process.exit(0);
} else {
  console.log('❌ Some environment variables are missing!');
  console.log('\n📝 Setup Instructions:');
  console.log('   1. For Vercel: Set in Vercel Dashboard → Settings → Environment Variables');
  console.log('   2. For Expo: Set in Expo Dashboard → Environment Variables');
  console.log('   3. For Local: Create a .env file with these variables');
  console.log('\n📖 See ENV_SETUP.md for detailed instructions');
  process.exit(1);
}

