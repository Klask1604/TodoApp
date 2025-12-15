#!/usr/bin/env node

/**
 * Script pentru validarea configurației Expo Go + Google OAuth
 * Rulează: node validate-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validare Configurație Expo Go\n');

let hasErrors = false;
let hasWarnings = false;

// 1. Verifică .env
console.log('📄 Verificare .env...');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ Fișierul .env lipsește!');
  hasErrors = true;
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');

  // Verifică variabilele necesare
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'
  ];

  requiredVars.forEach(varName => {
    const regex = new RegExp(`${varName}=(.+)`);
    const match = envContent.match(regex);

    if (!match) {
      console.log(`❌ Variabila ${varName} lipsește din .env`);
      hasErrors = true;
    } else {
      const value = match[1].trim();
      if (value === '' || value.includes('YOUR_') || value.includes('HERE')) {
        console.log(`⚠️  Variabila ${varName} nu este configurată (placeholder detectat)`);
        hasWarnings = true;
      } else {
        console.log(`✅ ${varName} configurată`);
      }
    }
  });
}

console.log('');

// 2. Verifică app.json
console.log('📄 Verificare app.json...');
const appJsonPath = path.join(__dirname, 'app.json');

if (!fs.existsSync(appJsonPath)) {
  console.log('❌ Fișierul app.json lipsește!');
  hasErrors = true;
} else {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const expo = appJson.expo;

  // Verifică scheme
  if (expo.scheme !== 'todoapp') {
    console.log(`⚠️  Scheme trebuie să fie "todoapp", este: "${expo.scheme}"`);
    hasWarnings = true;
  } else {
    console.log('✅ Scheme configurat corect');
  }

  // Verifică că nu există plugin-uri native
  const nativePlugins = ['@react-native-google-signin/google-signin'];
  const hasNativePlugins = expo.plugins?.some(plugin => {
    const pluginName = typeof plugin === 'string' ? plugin : plugin[0];
    return nativePlugins.includes(pluginName);
  });

  if (hasNativePlugins) {
    console.log('❌ Plugin-uri native detectate în app.json (incompatibile cu Expo Go)');
    hasErrors = true;
  } else {
    console.log('✅ Nu există plugin-uri native (compatibil cu Expo Go)');
  }

  // Verifică Bundle ID și Package name
  if (expo.ios?.bundleIdentifier === 'com.fusehub.todoapp') {
    console.log('✅ iOS Bundle ID corect');
  } else {
    console.log(`⚠️  iOS Bundle ID: ${expo.ios?.bundleIdentifier}`);
    hasWarnings = true;
  }

  if (expo.android?.package === 'com.fusehub.todoapp') {
    console.log('✅ Android Package name corect');
  } else {
    console.log(`⚠️  Android Package name: ${expo.android?.package}`);
    hasWarnings = true;
  }

  // Verifică EAS Project ID
  if (expo.extra?.eas?.projectId) {
    console.log(`✅ EAS Project ID: ${expo.extra.eas.projectId}`);
  } else {
    console.log('⚠️  EAS Project ID lipsește (opțional pentru Expo Go)');
  }
}

console.log('');

// 3. Verifică package.json
console.log('📄 Verificare package.json...');
const packageJsonPath = path.join(__dirname, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.log('❌ Fișierul package.json lipsește!');
  hasErrors = true;
} else {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = packageJson.dependencies || {};

  // Verifică dependențe necesare pentru Expo Go
  const requiredDeps = {
    'expo-auth-session': 'OAuth web-based',
    'expo-web-browser': 'Browser pentru OAuth',
    'expo-notifications': 'Push notifications'
  };

  Object.entries(requiredDeps).forEach(([dep, description]) => {
    if (deps[dep]) {
      console.log(`✅ ${dep} instalat (${description})`);
    } else {
      console.log(`❌ ${dep} lipsește (${description})`);
      hasErrors = true;
    }
  });

  // Verifică că nu există dependențe native incompatibile
  const incompatibleDeps = [
    '@react-native-google-signin/google-signin',
    'expo-dev-client'
  ];

  incompatibleDeps.forEach(dep => {
    if (deps[dep]) {
      console.log(`⚠️  ${dep} detectat (nu este necesar pentru Expo Go)`);
      hasWarnings = true;
    }
  });

  console.log('✅ Dependențe compatibile cu Expo Go');
}

console.log('');

// 4. Verifică AuthContext.tsx
console.log('📄 Verificare AuthContext.tsx...');
const authContextPath = path.join(__dirname, 'src', 'contexts', 'AuthContext.tsx');

if (!fs.existsSync(authContextPath)) {
  console.log('❌ Fișierul AuthContext.tsx lipsește!');
  hasErrors = true;
} else {
  const authContent = fs.readFileSync(authContextPath, 'utf8');

  // Verifică import-uri corecte
  if (authContent.includes('expo-auth-session/providers/google')) {
    console.log('✅ Import expo-auth-session/providers/google găsit');
  } else {
    console.log('❌ Import expo-auth-session/providers/google lipsește');
    hasErrors = true;
  }

  if (authContent.includes('expo-web-browser')) {
    console.log('✅ Import expo-web-browser găsit');
  } else {
    console.log('❌ Import expo-web-browser lipsește');
    hasErrors = true;
  }

  // Verifică configurația OAuth
  if (authContent.includes('useIdTokenAuthRequest')) {
    console.log('✅ useIdTokenAuthRequest folosit');
  } else {
    console.log('❌ useIdTokenAuthRequest lipsește');
    hasErrors = true;
  }

  // Verifică că nu mai folosește native Google Sign-In
  if (authContent.includes('@react-native-google-signin/google-signin')) {
    console.log('❌ Import @react-native-google-signin detectat (trebuie eliminat)');
    hasErrors = true;
  } else {
    console.log('✅ Nu folosește native Google Sign-In');
  }

  // Verifică configurarea Client IDs
  if (authContent.includes('iosClientId') && authContent.includes('androidClientId')) {
    console.log('✅ iOS și Android Client IDs configurate');
  } else {
    console.log('⚠️  iOS sau Android Client ID lipsește din configurare');
    hasWarnings = true;
  }
}

console.log('');

// Rezumat final
console.log('═══════════════════════════════════════');
if (hasErrors) {
  console.log('❌ ERORI DETECTATE - Aplicația nu va funcționa corect!');
  console.log('');
  console.log('📚 Vezi documentația:');
  console.log('   - QUICK_START_EXPO_GO.md');
  console.log('   - GOOGLE_OAUTH_SETUP.md');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  ATENȚIONĂRI - Verifică configurația');
  console.log('');
  console.log('Aplicația poate rula, dar unele funcționalități pot să nu meargă.');
  console.log('');
  console.log('📚 Vezi documentația:');
  console.log('   - QUICK_START_EXPO_GO.md');
  process.exit(0);
} else {
  console.log('✅ CONFIGURAȚIA ESTE VALIDĂ!');
  console.log('');
  console.log('🚀 Poți rula aplicația cu:');
  console.log('   npm start');
  console.log('');
  console.log('📱 Apoi scanează QR code-ul cu Expo Go');
  process.exit(0);
}
