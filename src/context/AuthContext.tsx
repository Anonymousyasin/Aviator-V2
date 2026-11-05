import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserBalance: (newBalance: number, newVipPoints?: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'aviator_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // 1. Firebase onAuthStateChanged listener
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            // Initialize new user in Firestore
            const initialUserData = {
              id: fbUser.uid,
              email: fbUser.email || 'user@aviator.bd',
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Player',
              balance: 5000,
              vipPoints: 200,
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, initialUserData);
            setUser(initialUserData as User);
          } else {
            const data = userSnap.data();
            setUser({
              id: data.id || fbUser.uid,
              email: data.email,
              name: data.name || fbUser.displayName || 'Player',
              balance: data.balance ?? 5000,
              vipPoints: data.vipPoints ?? 200,
              createdAt: data.createdAt,
            });
          }

          // Real-time listener for balance / status updates from Firestore
          unsubscribeSnapshot = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                const updated = snap.data();
                setUser({
                  id: updated.id || fbUser.uid,
                  email: updated.email,
                  name: updated.name || 'Player',
                  balance: updated.balance ?? 5000,
                  vipPoints: updated.vipPoints ?? 200,
                  createdAt: updated.createdAt,
                });
              }
            },
            (error) => {
              console.warn('User snapshot subscription error:', error);
            }
          );
        } catch (err) {
          console.error('Firestore user profile sync error:', err);
          setUser({
            id: fbUser.uid,
            email: fbUser.email || 'user@aviator.bd',
            name: fbUser.displayName || 'Player',
            balance: 5000,
            vipPoints: 200,
            createdAt: new Date().toISOString(),
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }

        // Check backend session if not using Firebase Auth
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedToken) {
          fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.user) {
                setUser(data.user);
                setToken(storedToken);
              } else {
                localStorage.removeItem(TOKEN_STORAGE_KEY);
                setToken(null);
                setUser(null);
              }
            })
            .catch(() => {
              localStorage.removeItem(TOKEN_STORAGE_KEY);
              setToken(null);
              setUser(null);
            })
            .finally(() => setIsLoading(false));
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Google Sign-In via Firebase Auth
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;

      // Optimistically set user in local state immediately
      setUser({
        id: fbUser.uid,
        email: fbUser.email || 'user@aviator.bd',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Player',
        balance: 5000,
        vipPoints: 200,
        createdAt: new Date().toISOString(),
      });

      // Mirror to Firestore user doc if not yet created
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          const initialUserData = {
            id: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'Player',
            balance: 5000,
            vipPoints: 200,
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, initialUserData, { merge: true });
        }
      } catch (firestoreErr) {
        console.warn('Firestore profile sync info:', firestoreErr);
      }

      setAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Sign-in cancelled' };
      }
      return { success: false, error: err.message || 'Google sign-in was interrupted.' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to login' };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

      // Sync user profile to Firestore
      try {
        const userDocRef = doc(db, 'users', data.user.id);
        await setDoc(
          userDocRef,
          {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            balance: data.user.balance,
            vipPoints: data.user.vipPoints,
            status: 'active',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not mirror to Firestore:', e);
      }

      setAuthModalOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to register' };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

      // Persist to Firestore
      try {
        const userDocRef = doc(db, 'users', data.user.id);
        await setDoc(userDocRef, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          balance: data.user.balance,
          vipPoints: data.user.vipPoints,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not mirror registration to Firestore:', e);
      }

      setAuthModalOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
      setFirebaseUser(null);
    }
  };

  const updateUserBalance = (newBalance: number, newVipPoints?: number) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      balance: newBalance,
      vipPoints: newVipPoints !== undefined ? newVipPoints : user.vipPoints,
    };
    setUser(updatedUser);

    // Update in Firestore
    try {
      const userDocRef = doc(db, 'users', user.id);
      updateDoc(userDocRef, {
        balance: newBalance,
        vipPoints: updatedUser.vipPoints,
        updatedAt: new Date().toISOString(),
      }).catch((e) => console.warn('Firestore balance update warning:', e));
    } catch (err) {
      console.warn('Firestore updateDoc error:', err);
    }

    if (token) {
      fetch('/api/user/sync-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          balance: newBalance,
          vipPoints: updatedUser.vipPoints,
        }),
      }).catch((e) => console.error('Failed to sync wallet with server:', e));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        token,
        isAuthenticated: !!user || !!firebaseUser,
        isLoading,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        signInWithGoogle,
        logout,
        updateUserBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
