import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  Pressable,
  AppState,
} from 'react-native';
// Import supabase with fallback for missing config
let supabase;
try {
  supabase = require('../config/supabase').supabase;
} catch (e) {
  // Fallback mock supabase if config file is missing
  const mockQuery = {
    eq: () => ({
      single: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      update: () => ({
        eq: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      }),
    }),
    single: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
    upsert: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
  };
  supabase = {
    from: () => ({
      select: () => mockQuery,
      insert: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      upsert: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      update: () => mockQuery,
    }),
    rpc: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
    auth: {
      signIn: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      signUp: async () => ({ data: null, error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      signOut: async () => ({ error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
import CryptoJS from 'crypto-js';
import { useScreenDimensions } from '../hooks/useScreenDimensions';

const IS_WEB = Platform.OS === 'web';

// Storage helper
const storage = {
  async getItem(key) {
    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        const value = window.localStorage.getItem(key);
        return value;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error('Storage getItem error:', e);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Storage setItem error:', e);
      // On web, localStorage might throw if quota exceeded
      if (IS_WEB) {
        if (Platform.OS === 'web') {
          console.error('Unable to save data. Please check your browser storage settings.');
        } else {
          Alert.alert('Storage Error', 'Unable to save data. Please check your browser storage settings.');
        }
      }
    }
  },
  async removeItem(key) {
    try {
      if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  },
};

export default function ProfilePage({ onNavigateToBuilds, onNavigateToGod, onNavigateToCustomBuild, onNavigateToMyBuilds }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showRecoveryCodeModal, setShowRecoveryCodeModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState('');
  const [pinnedBuilds, setPinnedBuilds] = useState([]);
  const [pinnedGods, setPinnedGods] = useState([]);
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  // Reload data when component becomes visible (for native apps)
  // This ensures data is fresh when user navigates to profile tab
  useEffect(() => {
    let isActive = true;
    let intervalId = null;
    
    const reloadData = async () => {
      if (currentUser && isLoggedIn && isActive) {
        console.log('Profile page - reloading user data');
        await loadUserData();
      }
    };
    
    // Reload immediately when component mounts or when user/login changes
    reloadData();
    
    // Set up periodic refresh (every 10 seconds) to catch saves from other components
    // Less frequent to avoid interfering with active saves
    intervalId = setInterval(() => {
      if (currentUser && isLoggedIn && isActive) {
        reloadData();
      }
    }, 4000);
    
    // For web, also listen to visibility changes
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden && currentUser && isLoggedIn && isActive) {
          reloadData();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        isActive = false;
        if (intervalId) clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    
    return () => {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser, isLoggedIn]);

  const checkLoginStatus = async () => {
    const loggedInUser = await storage.getItem('currentUser');
    if (loggedInUser) {
      setCurrentUser(loggedInUser);
      setIsLoggedIn(true);
      await loadUserData();
    }
  };

  const loadUserData = async () => {
    if (!currentUser) return;
    
    // ALWAYS load from local storage first (most up-to-date, source of truth)
    const localPinnedBuilds = await storage.getItem(`pinnedBuilds_${currentUser}`);
    const localPinnedGods = await storage.getItem(`pinnedGods_${currentUser}`);
    const localSavedBuilds = await storage.getItem(`savedBuilds_${currentUser}`);
    
    let pinnedBuilds = localPinnedBuilds ? JSON.parse(localPinnedBuilds) : [];
    let pinnedGods = localPinnedGods ? JSON.parse(localPinnedGods) : [];
    let savedBuilds = localSavedBuilds ? JSON.parse(localSavedBuilds) : [];
    
    console.log('Loaded from local storage:', {
      pinnedBuilds: pinnedBuilds.length,
      pinnedGods: pinnedGods.length,
      savedBuilds: savedBuilds.length,
    });
    
    // Set state immediately with local data (fast, reliable)
    setPinnedBuilds(pinnedBuilds);
    setPinnedGods(pinnedGods);
    setSavedBuilds(savedBuilds);
    
    // Then try to sync with Supabase in background (merge if Supabase has newer data)
    try {
      // Try to set user context for RLS (don't fail if this doesn't exist)
      try {
        const rpcResult = await supabase.rpc('set_current_user', { username_param: currentUser });
        if (rpcResult && rpcResult.error && rpcResult.error.code === 'MISSING_CONFIG') {
          // Supabase not configured, local storage is already loaded
          return;
        }
      } catch (rpcError) {
        // RPC function might not exist, continue anyway
      }
      
      // Try to load from Supabase
      const { data, error } = await supabase
        .from('user_data')
        .select('pinned_builds, pinned_gods, saved_builds, updated_at')
        .eq('username', currentUser)
        .single();
      
      if (error && error.code === 'MISSING_CONFIG') {
        // Supabase not configured, local storage already loaded
        return;
      }
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading user data from Supabase:', error);
        // Local storage already loaded, continue
        return;
      }
      
      if (data) {
        const supabasePinnedBuilds = data.pinned_builds || [];
        const supabasePinnedGods = data.pinned_gods || [];
        const supabaseSavedBuilds = data.saved_builds || [];
        const supabaseUpdatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
        
        // If local storage is empty but Supabase has data, use Supabase data
        // Otherwise, merge both sources
        let mergedSavedBuilds, mergedPinnedBuilds, mergedPinnedGods;
        
        if (savedBuilds.length === 0 && supabaseSavedBuilds.length > 0) {
          // Local is empty, use Supabase
          mergedSavedBuilds = supabaseSavedBuilds;
        } else {
          // Merge: start with local, add unique items from Supabase
          mergedSavedBuilds = [...savedBuilds];
          supabaseSavedBuilds.forEach(sbBuild => {
            if (!mergedSavedBuilds.find(b => b.id === sbBuild.id)) {
              mergedSavedBuilds.push(sbBuild);
            }
          });
        }
        
        if (pinnedBuilds.length === 0 && supabasePinnedBuilds.length > 0) {
          // Local is empty, use Supabase
          mergedPinnedBuilds = supabasePinnedBuilds;
        } else {
          // Merge: start with local, add unique items from Supabase
          mergedPinnedBuilds = [...pinnedBuilds];
          supabasePinnedBuilds.forEach(sbBuild => {
            const exists = mergedPinnedBuilds.find(b => 
              (b.id && b.id === sbBuild.id) || 
              (b.buildKey && b.buildKey === sbBuild.buildKey) ||
              (sbBuild.id && b.id === sbBuild.id) ||
              (sbBuild.buildKey && b.buildKey === sbBuild.buildKey)
            );
            if (!exists) {
              mergedPinnedBuilds.push(sbBuild);
            }
          });
        }
        
        if (pinnedGods.length === 0 && supabasePinnedGods.length > 0) {
          // Local is empty, use Supabase
          mergedPinnedGods = supabasePinnedGods;
        } else {
          // Merge: start with local, add unique items from Supabase
          mergedPinnedGods = [...pinnedGods];
          supabasePinnedGods.forEach(sbGod => {
            const godName = sbGod.name || sbGod.GodName;
            const exists = mergedPinnedGods.find(g => {
              const gName = g.name || g.GodName;
              return gName === godName;
            });
            if (!exists) {
              mergedPinnedGods.push(sbGod);
            }
          });
        }
        
        // Always update if Supabase has data (to ensure sync)
        const hasChanges = 
          mergedSavedBuilds.length !== savedBuilds.length || 
          mergedPinnedBuilds.length !== pinnedBuilds.length ||
          mergedPinnedGods.length !== pinnedGods.length ||
          JSON.stringify(mergedSavedBuilds) !== JSON.stringify(savedBuilds) ||
          JSON.stringify(mergedPinnedBuilds) !== JSON.stringify(pinnedBuilds) ||
          JSON.stringify(mergedPinnedGods) !== JSON.stringify(pinnedGods);
        
        if (hasChanges) {
          setPinnedBuilds(mergedPinnedBuilds);
          setPinnedGods(mergedPinnedGods);
          setSavedBuilds(mergedSavedBuilds);
          
          // Save merged data back to local storage
          await storage.setItem(`pinnedBuilds_${currentUser}`, JSON.stringify(mergedPinnedBuilds));
          await storage.setItem(`pinnedGods_${currentUser}`, JSON.stringify(mergedPinnedGods));
          await storage.setItem(`savedBuilds_${currentUser}`, JSON.stringify(mergedSavedBuilds));
          
          console.log('✅ Merged with Supabase data:', {
            pinnedBuilds: `${pinnedBuilds.length} → ${mergedPinnedBuilds.length}`,
            pinnedGods: `${pinnedGods.length} → ${mergedPinnedGods.length}`,
            savedBuilds: `${savedBuilds.length} → ${mergedSavedBuilds.length}`,
          });
        }
      }
    } catch (error) {
      console.error('Error syncing with Supabase:', error);
      // Local storage already loaded, continue
    }
  };

  const loadUserDataFromLocal = async () => {
    if (!currentUser) return;
    
    try {
      const pinnedBuildsStr = await storage.getItem(`pinnedBuilds_${currentUser}`);
      const pinnedGodsStr = await storage.getItem(`pinnedGods_${currentUser}`);
      const savedBuildsStr = await storage.getItem(`savedBuilds_${currentUser}`);
      
      const pinnedBuilds = pinnedBuildsStr ? JSON.parse(pinnedBuildsStr) : [];
      const pinnedGods = pinnedGodsStr ? JSON.parse(pinnedGodsStr) : [];
      const savedBuilds = savedBuildsStr ? JSON.parse(savedBuildsStr) : [];
      
      setPinnedBuilds(pinnedBuilds);
      setPinnedGods(pinnedGods);
      setSavedBuilds(savedBuilds);
      
      console.log('Loaded from local storage:', {
        pinnedBuilds: pinnedBuilds.length,
        pinnedGods: pinnedGods.length,
        savedBuilds: savedBuilds.length,
      });
    } catch (error) {
      console.error('Error loading from local storage:', error);
      // Initialize empty if local storage also fails
      setPinnedBuilds([]);
      setPinnedGods([]);
      setSavedBuilds([]);
    }
  };

  const hashPassword = (password) => {
    return CryptoJS.SHA256(password).toString();
  };

  // Generate a random recovery code (8 characters, alphanumeric, uppercase)
  const generateRecoveryCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking chars (0, O, I, 1)
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      const errorMsg = 'Please enter both username and password';
      console.error('Login validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    setIsLoggingIn(true);
    console.log('Attempting login for:', username.trim());
    
    try {
      const passwordHash = hashPassword(password);
      
      console.log('Querying Supabase for user...');
      const { data, error } = await supabase
        .from('app_users')
        .select('username, password_hash')
        .eq('username', username.trim())
        .single();
      
      console.log('Supabase response:', { data: !!data, error: error?.code || error?.message });
      
      if (error && error.code === 'MISSING_CONFIG') {
        console.error('Supabase MISSING_CONFIG error');
        // Supabase not configured, try local storage login
        const localUser = await storage.getItem(`user_${username.trim()}`);
        if (localUser) {
          const userData = JSON.parse(localUser);
          if (userData.password_hash === passwordHash) {
            console.log('Login successful via local storage');
            await storage.setItem('currentUser', username.trim());
            setCurrentUser(username.trim());
            setIsLoggedIn(true);
            setShowLoginModal(false);
            setUsername('');
            setPassword('');
            await loadUserDataFromLocal();
            setShowLoginSuccess(true);
            setTimeout(() => setShowLoginSuccess(false), 3000);
            setIsLoggingIn(false);
            return;
          }
        }
        const errorMsg = 'Supabase configuration is missing. Please configure your Supabase credentials.';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsLoggingIn(false);
        return;
      }
      
      if (error) {
        console.error('Supabase query error:', error.code, error.message);
      }
      
      if (error || !data) {
        // Try local storage as fallback
        const localUser = await storage.getItem(`user_${username.trim()}`);
        if (localUser) {
          const userData = JSON.parse(localUser);
          if (userData.password_hash === passwordHash) {
            console.log('Login successful via local storage fallback');
            await storage.setItem('currentUser', username.trim());
            setCurrentUser(username.trim());
            setIsLoggedIn(true);
            setShowLoginModal(false);
            setUsername('');
            setPassword('');
            await loadUserDataFromLocal();
            setShowLoginSuccess(true);
            setTimeout(() => setShowLoginSuccess(false), 3000);
            setIsLoggingIn(false);
            return;
          }
        }
        const errorMsg = 'Invalid username or password';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsLoggingIn(false);
        return;
      }
      
      if (data.password_hash === passwordHash) {
        console.log('Login successful via Supabase');
        await storage.setItem('currentUser', username.trim());
        setCurrentUser(username.trim());
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setUsername('');
        setPassword('');
        await loadUserData();
        if (Platform.OS === 'web') {
          alert('Login successful!');
        }
        setIsLoggingIn(false);
      } else {
        const errorMsg = 'Invalid username or password';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = `Failed to login: ${error.message || 'Unknown error'}`;
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!registerUsername.trim() || !registerPassword.trim() || !confirmPassword.trim()) {
      const errorMsg = 'Please fill in all fields';
      console.error('Registration validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    if (registerPassword !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      console.error('Registration validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    if (registerPassword.length < 4) {
      const errorMsg = 'Password must be at least 4 characters';
      console.error('Registration validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    if (registerUsername.length < 3) {
      const errorMsg = 'Username must be at least 3 characters';
      console.error('Registration validation error:', errorMsg);
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    setIsRegistering(true);
    console.log('Attempting registration for:', registerUsername.trim());

    try {
      const usernameTrimmed = registerUsername.trim();
      const passwordHash = hashPassword(registerPassword);
      const recoveryCodeGenerated = generateRecoveryCode();
      
      // Check if username already exists
      console.log('Checking if username exists...');
      const { data: existingUser, error: checkError } = await supabase
        .from('app_users')
        .select('username')
        .eq('username', usernameTrimmed)
        .single();
      
      console.log('Username check response:', { exists: !!existingUser, error: checkError?.code || checkError?.message });
      
      if (checkError && checkError.code === 'MISSING_CONFIG') {
        const errorMsg = 'Supabase configuration is missing. Please configure your Supabase credentials.';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsRegistering(false);
        return;
      }
      
      if (existingUser) {
        const errorMsg = 'Username already exists';
        console.error(errorMsg);
        if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
        setIsRegistering(false);
        return;
      }
      
      // Create user with recovery code
      console.log('Creating user in Supabase...');
      const { error: userError } = await supabase
        .from('app_users')
        .insert({
          username: usernameTrimmed,
          password_hash: passwordHash,
          recovery_code: recoveryCodeGenerated,
        });
      
      console.log('User creation response:', { error: userError?.code || userError?.message || 'Success' });
      
      if (userError) {
        if (userError.code === 'MISSING_CONFIG') {
          const errorMsg = 'Supabase configuration is missing. Please configure your Supabase credentials.';
          console.error(errorMsg);
          if (Platform.OS === 'web') {
            alert(errorMsg);
          } else {
            Alert.alert('Error', errorMsg);
          }
        } else if (userError.code === '23505') { // Unique constraint violation
          const errorMsg = 'Username already exists';
          console.error(errorMsg);
          if (Platform.OS === 'web') {
            alert(errorMsg);
          } else {
            Alert.alert('Error', errorMsg);
          }
        } else {
          throw userError;
        }
        setIsRegistering(false);
        return;
      }
      
      // Initialize user data
      console.log('Creating user data in Supabase...');
      const { error: dataError } = await supabase
        .from('user_data')
        .insert({
          username: usernameTrimmed,
          pinned_builds: [],
          pinned_gods: [],
          saved_builds: [],
        });
      
      if (dataError && dataError.code !== '23505') {
        console.error('Error creating user data:', dataError);
      }
      
      // Store username temporarily so we can log in after they see the code
      await storage.setItem('pendingRegistrationUsername', usernameTrimmed);
      
      // Show recovery code to user BEFORE logging in
      setGeneratedRecoveryCode(recoveryCodeGenerated);
      setShowRegisterModal(false);
      setRegisterUsername('');
      setRegisterPassword('');
      setConfirmPassword('');
      
      // Set username temporarily for the recovery code modal
      setForgotPasswordUsername(usernameTrimmed);
      
      // Show the recovery code modal - don't log in yet
      setShowRecoveryCodeModal(true);
      setIsRegistering(false);
      console.log('Registration successful!');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = `Failed to create account: ${error.message || 'Unknown error'}`;
      if (Platform.OS === 'web') {
        console.error(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      setIsRegistering(false);
    }
  };

  const handleLogout = async () => {
    await storage.removeItem('currentUser');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setPinnedBuilds([]);
    setPinnedGods([]);
    setSavedBuilds([]);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordUsername.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    // Check if username exists (but don't reveal this info for security)
    const { data: userData } = await supabase
      .from('app_users')
      .select('username')
      .eq('username', forgotPasswordUsername.trim())
      .single();

    if (!userData) {
      // Don't reveal if username exists, just proceed
      Alert.alert('Info', 'If an account exists with this username, you can reset the password with your recovery code.');
      return;
    }

    // Show recovery code input
    setShowForgotPasswordModal(false);
    setShowRecoveryCodeModal(true);
  };

  const handlePasswordReset = async () => {
    if (!forgotPasswordUsername.trim() || !recoveryCode.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    try {
      // Verify recovery code
      const { data: userData, error: fetchError } = await supabase
        .from('app_users')
        .select('username, recovery_code')
        .eq('username', forgotPasswordUsername.trim())
        .single();

      if (fetchError || !userData) {
        Alert.alert('Error', 'Invalid username or recovery code');
        return;
      }

      if (userData.recovery_code !== recoveryCode.trim().toUpperCase()) {
        Alert.alert('Error', 'Invalid recovery code');
        return;
      }

      // Update password
      const newPasswordHash = hashPassword(newPassword);
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ password_hash: newPasswordHash })
        .eq('username', forgotPasswordUsername.trim());

      if (updateError) {
        throw updateError;
      }

      Alert.alert('Success', 'Password reset successfully! You can now sign in.');
      setShowRecoveryCodeModal(false);
      setForgotPasswordUsername('');
      setRecoveryCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowLoginModal(true);
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', `Failed to reset password: ${error.message || 'Unknown error'}`);
    }
  };

  const saveUserDataToSupabase = async () => {
    if (!currentUser) {
      console.warn('saveUserDataToSupabase: No current user');
      return;
    }
    
    console.log('Saving user data:', {
      user: currentUser,
      pinnedBuilds: pinnedBuilds.length,
      pinnedGods: pinnedGods.length,
      savedBuilds: savedBuilds.length,
      platform: Platform.OS,
    });
    
    // Always save to local storage first (fast, reliable)
    try {
      await storage.setItem(`pinnedBuilds_${currentUser}`, JSON.stringify(pinnedBuilds));
      await storage.setItem(`pinnedGods_${currentUser}`, JSON.stringify(pinnedGods));
      await storage.setItem(`savedBuilds_${currentUser}`, JSON.stringify(savedBuilds));
      console.log('✅ Saved to local storage');
    } catch (storageError) {
      console.error('❌ Error saving to local storage:', storageError);
      // Continue anyway, try Supabase
    }
    
    // Then try to save to Supabase (async, don't block)
    try {
      // Try to set user context for RLS (might not exist yet)
      try {
        const rpcResult = await supabase.rpc('set_current_user', { username_param: currentUser });
        if (rpcResult && rpcResult.error && rpcResult.error.code === 'MISSING_CONFIG') {
          // Supabase not configured, local storage already saved above
          console.log('Supabase not configured, using local storage only');
          return;
        }
      } catch (rpcError) {
        // Continue without RLS context if function doesn't exist
        console.log('RPC set_current_user not available, continuing...');
      }
      
      const { error } = await supabase
        .from('user_data')
        .upsert({
          username: currentUser,
          pinned_builds: pinnedBuilds,
          pinned_gods: pinnedGods,
          saved_builds: savedBuilds,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'username'
        });
      
      if (error && error.code === 'MISSING_CONFIG') {
        // Supabase not configured, local storage already saved above
        console.log('Supabase MISSING_CONFIG, using local storage only');
        return;
      }
      
      if (error) {
        console.error('❌ Error saving user data to Supabase:', error);
        // Local storage already saved above, so data is safe
      } else {
        console.log('✅ Saved to Supabase successfully');
      }
    } catch (error) {
      console.error('❌ Error saving to Supabase:', error);
      // Local storage already saved above, so data is safe
    }
  };

  const pinBuild = async (build) => {
    if (!currentUser) return;
    const newPinned = [...pinnedBuilds, build];
    setPinnedBuilds(newPinned);
    console.log('Pinning build:', build);
    await saveUserDataToSupabase();
  };

  const unpinBuild = async (buildIdOrKey) => {
    if (!currentUser) return;
    const newPinned = pinnedBuilds.filter(b => (b.id !== buildIdOrKey && b.buildKey !== buildIdOrKey));
    setPinnedBuilds(newPinned);
    await saveUserDataToSupabase();
  };

  const pinGod = async (god) => {
    if (!currentUser) return;
    const newPinned = [...pinnedGods, god];
    setPinnedGods(newPinned);
    console.log('Pinning god:', god);
    await saveUserDataToSupabase();
  };

  const unpinGod = async (godName) => {
    if (!currentUser) return;
    const newPinned = pinnedGods.filter(g => (g.name || g.GodName) !== godName);
    setPinnedGods(newPinned);
    await saveUserDataToSupabase();
  };

  const saveBuild = async (build) => {
    if (!currentUser) return;
    const newSaved = [...savedBuilds, { ...build, id: Date.now(), savedAt: Date.now() }];
    setSavedBuilds(newSaved);
    console.log('Saving build:', build);
    await saveUserDataToSupabase();
  };

  const deleteSavedBuild = async (buildId) => {
    if (!currentUser) return;
    const newSaved = savedBuilds.filter(b => b.id !== buildId);
    setSavedBuilds(newSaved);
    await saveUserDataToSupabase();
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.loginContainer}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Sign in to save builds, pin gods, and more!</Text>
            
            <TouchableOpacity style={styles.loginButton} onPress={() => setShowLoginModal(true)}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.registerButton} onPress={() => setShowRegisterModal(true)}>
              <Text style={styles.registerButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Login Modal */}
          <Modal 
            visible={showLoginModal} 
            transparent={true} 
            animationType={IS_WEB ? "fade" : "slide"}
            onRequestClose={() => setShowLoginModal(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowLoginModal(false)}
            >
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>Sign In</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => {
                    setShowLoginModal(false);
                    setUsername('');
                    setPassword('');
                  }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.confirmButton, isLoggingIn && styles.confirmButtonDisabled]} 
                    onPress={handleLogin}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.forgotPasswordLink}
                  onPress={() => {
                    setShowLoginModal(false);
                    setForgotPasswordUsername('');
                    setShowForgotPasswordModal(true);
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Forgot Password Modal */}
          <Modal 
            visible={showForgotPasswordModal} 
            transparent={true} 
            animationType={IS_WEB ? "fade" : "slide"}
            onRequestClose={() => setShowForgotPasswordModal(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowForgotPasswordModal(false)}
            >
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>Forgot Password</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your username and recovery code to reset your password.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                  value={forgotPasswordUsername}
                  onChangeText={setForgotPasswordUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Recovery Code (8 characters)"
                  placeholderTextColor="#64748b"
                  value={recoveryCode}
                  onChangeText={(text) => setRecoveryCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handlePasswordReset}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordUsername('');
                    setRecoveryCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmButton} onPress={handlePasswordReset}>
                    <Text style={styles.confirmButtonText}>Reset Password</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Recovery Code Display Modal (shown after registration) */}
          <Modal 
            visible={showRecoveryCodeModal} 
            transparent={true} 
            animationType={IS_WEB ? "fade" : "slide"}
            onRequestClose={() => setShowRecoveryCodeModal(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowRecoveryCodeModal(false)}
            >
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>⚠️ Save Your Recovery Code</Text>
                <Text style={styles.modalSubtitle}>
                  This code will allow you to reset your password if you forget it. 
                  Save it in a safe place - you won't be able to see it again!
                </Text>
                <View style={styles.recoveryCodeContainer}>
                  <Text style={styles.recoveryCodeText}>{generatedRecoveryCode}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.confirmButton} 
                  onPress={async () => {
                    // Get the username from storage
                    const pendingUsername = await storage.getItem('pendingRegistrationUsername');
                    
                    // Now log in the user after they've seen the recovery code
                    if (pendingUsername) {
                      await storage.setItem('currentUser', pendingUsername);
                      await storage.removeItem('pendingRegistrationUsername');
                      setCurrentUser(pendingUsername);
                      setIsLoggedIn(true);
                      await loadUserData();
                    } else if (forgotPasswordUsername) {
                      // Fallback if pendingUsername wasn't set
                      await storage.setItem('currentUser', forgotPasswordUsername);
                      setCurrentUser(forgotPasswordUsername);
                      setIsLoggedIn(true);
                      await loadUserData();
                    }
                    
                    setShowRecoveryCodeModal(false);
                    setGeneratedRecoveryCode('');
                    setForgotPasswordUsername('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText} allowFontScaling={true}>
                    I've Saved It
                  </Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Register Modal */}
          <Modal 
            visible={showRegisterModal} 
            transparent={true} 
            animationType={IS_WEB ? "fade" : "slide"}
            onRequestClose={() => setShowRegisterModal(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowRegisterModal(false)}
            >
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>Create Account</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                  value={registerUsername}
                  onChangeText={setRegisterUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleRegister}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => {
                    setShowRegisterModal(false);
                    setRegisterUsername('');
                    setRegisterPassword('');
                    setConfirmPassword('');
                  }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.confirmButton, isRegistering && styles.confirmButtonDisabled]} 
                    onPress={handleRegister}
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile: {currentUser}</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 Pinned Builds</Text>
          {pinnedBuilds.length === 0 ? (
            <Text style={styles.emptyText}>No pinned builds yet</Text>
          ) : (
            pinnedBuilds.map((build, idx) => {
              const buildTitle = build.buildTitle || build.build?.notes || build.build?.title || `${build.role || 'Build'} Build`;
              const godName = build.godName || build.name || 'Unknown God';
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.buildCard}
                  onPress={() => {
                    if (onNavigateToBuilds) {
                      // Navigate to builds page, optionally with god if available
                      onNavigateToBuilds(build.godInternalName || null);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.buildName}>{godName}</Text>
                    <View style={styles.buildSubtitleContainer}>
                      <Text style={styles.buildSubtitle}>{buildTitle}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      unpinBuild(build.buildKey || build.id);
                    }}
                  >
                    <Text style={styles.unpinText}>Unpin</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Pinned Gods</Text>
          {pinnedGods.length === 0 ? (
            <Text style={styles.emptyText}>No pinned gods yet</Text>
          ) : (
            pinnedGods.map((god, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.buildCard}
                onPress={() => {
                  if (onNavigateToGod && god.internalName) {
                    onNavigateToGod(god.internalName);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.buildName}>{god.name || god.GodName || 'God'}</Text>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    unpinGod(god.name || god.GodName);
                  }}
                >
                  <Text style={styles.unpinText}>Unpin</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Saved Builds</Text>
          {savedBuilds.length === 0 ? (
            <Text style={styles.emptyText}>No saved builds yet</Text>
          ) : (
            savedBuilds.map((build, idx) => (
              <TouchableOpacity 
                key={build.id || `saved-build-${idx}`} 
                style={styles.buildCard}
                onPress={() => {
                  if (onNavigateToMyBuilds) {
                    onNavigateToMyBuilds();
                  } else if (onNavigateToCustomBuild) {
                    // Fallback to custom build if MyBuilds navigation not available
                    onNavigateToCustomBuild(build);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.buildName}>{build.name || 'Custom Build'}</Text>
                  <Text style={styles.buildDate}>
                    {build.savedAt && !isNaN(new Date(build.savedAt).getTime()) 
                      ? `Saved: ${new Date(build.savedAt).toLocaleDateString()}`
                      : 'Saved build'
                    }
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteSavedBuild(build.id);
                  }}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Export helper functions for other components to use
export const profileHelpers = {
  async getCurrentUser() {
    return await storage.getItem('currentUser');
  },
  async pinBuild(build) {
    const user = await storage.getItem('currentUser');
    if (!user) return false;
    const pinnedBuilds = await storage.getItem(`pinnedBuilds_${user}`);
    const builds = pinnedBuilds ? JSON.parse(pinnedBuilds) : [];
    builds.push({ ...build, id: Date.now() });
    await storage.setItem(`pinnedBuilds_${user}`, JSON.stringify(builds));
    return true;
  },
  async pinGod(god) {
    const user = await storage.getItem('currentUser');
    if (!user) return false;
    const pinnedGods = await storage.getItem(`pinnedGods_${user}`);
    const gods = pinnedGods ? JSON.parse(pinnedGods) : [];
    gods.push(god);
    await storage.setItem(`pinnedGods_${user}`, JSON.stringify(gods));
    return true;
  },
  async saveBuild(build) {
    const user = await storage.getItem('currentUser');
    if (!user) return false;
    const savedBuilds = await storage.getItem(`savedBuilds_${user}`);
    const builds = savedBuilds ? JSON.parse(savedBuilds) : [];
    builds.push({ ...build, id: Date.now(), savedAt: Date.now() });
    await storage.setItem(`savedBuilds_${user}`, JSON.stringify(builds));
    return true;
  },
};

const styles = StyleSheet.create({
  successTooltip: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
    }),
  },
  successTooltipText: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#071024',
  },
  scrollContent: {
    padding: 20,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  loginContainer: {
    alignItems: 'center',
    padding: 40,
  },
  title: {
    color: '#7dd3fc',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 16,
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 48,
    }),
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: '#0b1226',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 48,
      transition: 'background-color 0.2s, border-color 0.2s',
      ':hover': {
        backgroundColor: '#0f1724',
        borderColor: '#0066cc',
      },
    }),
  },
  registerButtonText: {
    color: '#1e90ff',
    fontSize: 18,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sectionTitle: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  buildCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s, border-color 0.2s',
      ':hover': {
        backgroundColor: '#f0f0f0',
        borderColor: '#1e90ff',
      },
    }),
  },
  buildName: {
    color: '#071024',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buildSubtitleContainer: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  buildSubtitle: {
    color: '#071024',
    fontSize: 14,
    fontStyle: 'italic',
  },
  buildDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  unpinText: {
    color: '#1e90ff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(IS_WEB && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    }),
  },
  modalContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    }),
  },
  modalTitle: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: '#e6eef8',
    fontSize: 16,
    ...(IS_WEB && {
      outline: 'none',
      minHeight: 44,
    }),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    ...(IS_WEB && {
      cursor: 'pointer',
      minHeight: 44,
      transition: 'background-color 0.2s',
    }),
  },
  cancelButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#1e90ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }),
  },
  confirmButtonDisabled: {
    opacity: 0.6,
    ...(IS_WEB && {
      cursor: 'not-allowed',
    }),
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  forgotPasswordLink: {
    marginTop: 12,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#7dd3fc',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  modalSubtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  recoveryCodeContainer: {
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#7dd3fc',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  recoveryCodeText: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

