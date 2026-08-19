import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting VIT Life Android APK / AAB Build Helper...');

const rootDir = process.cwd();
const keystorePath = path.join(rootDir, 'android.keystore');

// Check if Android Keystore exists
if (!fs.existsSync(keystorePath)) {
  console.log('\n🔑 Android Keystore missing. Generating release keystore...');
  try {
    execSync(
      'keytool -genkeypair -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000 -storepass vitlife123 -keypass vitlife123 -dname "CN=VIT Life, OU=College Portal, O=VIT Bhopal, L=Bhopal, ST=MP, C=IN"',
      { stdio: 'inherit' }
    );
    console.log('✅ Keystore android.keystore successfully generated!');
  } catch (err) {
    console.log('⚠️ keytool command not on PATH. Please ensure Java JDK is installed or use an existing keystore.');
  }
} else {
  console.log('✅ Found existing android.keystore');
}

console.log('\n📦 TWA Manifest Configuration:');
console.log('   - App Name: VIT Life');
console.log('   - Package ID: com.vitlife.app');
console.log('   - Domain: https://vitlife.vercel.app');

console.log('\n🛠️ Commands to build signed APK & AAB:');
console.log('   1. npx @bubblewrap/cli init --manifest=https://vitlife.vercel.app/manifest.json');
console.log('   2. npx @bubblewrap/cli build');
console.log('\nResult: app-release-signed.apk & app-release-signed.aab');
