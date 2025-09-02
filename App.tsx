
import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from './types';
import { auth } from './services/mockApi';
// Fix: Removed incorrect imports for Firebase v9. Authentication methods will be called from the 'auth' object.
import { getUserById, saveUser as saveUserProfile } from './services/mockApi';
import Login from './components/Login';
import Layout from './components/Layout';
import StudentDashboard from './components/dashboards/StudentDashboard';
import IndustrialSupervisorDashboard from './components/dashboards/IndustrialSupervisorDashboard';
import AcademicSupervisorDashboard from './components/dashboards/AcademicSupervisorDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import NotFound from './components/NotFound';
import Profile from './components/Profile';
import { Spinner } from './components/common';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password?: string }) => Promise<void>;
  logout: () => Promise<void>;
  signup: (userData: Omit<User, 'id'>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fix: Changed onAuthStateChanged(auth, ...) to auth.onAuthStateChanged(...) to use the Firebase v8 compat API.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile = await getUserById(firebaseUser.uid);
        if (userProfile) {
          setUser({ ...userProfile, id: firebaseUser.uid, email: firebaseUser.email! });
        } else {
          // This case can happen briefly during signup before the profile is created.
          // Or if a user exists in Auth but not in the database.
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            firstName: firebaseUser.displayName || 'New',
            lastName: 'User',
            role: 'student' // Default role
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (credentials: { email: string; password?: string }): Promise<void> => {
     if(!credentials.password) throw new Error("Password is required.");
     // Fix: Changed signInWithEmailAndPassword(auth, ...) to auth.signInWithEmailAndPassword(...) to use the Firebase v8 compat API.
     const userCredential = await auth.signInWithEmailAndPassword(credentials.email, credentials.password);
     const firebaseUser = userCredential.user;
     if (!firebaseUser) throw new Error("User authentication failed.");


     // After successful sign-in, fetch profile and set user state
     const userProfile = await getUserById(firebaseUser.uid);
     if (userProfile) {
        setUser({ ...userProfile, id: firebaseUser.uid, email: firebaseUser.email! });
     } else {
        // Handle case where user is in Auth but not in DB
        // Fix: Changed signOut(auth) to auth.signOut() to use the Firebase v8 compat API.
        await auth.signOut(); // Sign them out to prevent being in a broken state
        throw new Error("User profile not found. Please contact support.");
     }
  };

  const signup = async (userData: Omit<User, 'id'>): Promise<User> => {
    const { email, password, ...profileData } = userData;
    if (!password) throw new Error("Password is required for signup.");

    // Fix: Changed createUserWithEmailAndPassword(auth, ...) to auth.createUserWithEmailAndPassword(...) to use the Firebase v8 compat API.
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const firebaseUser = userCredential.user;
    if (!firebaseUser) throw new Error("User creation failed.");

    const newUser: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      ...profileData,
    } as User;
    
    await saveUserProfile(newUser); // Save profile to Realtime Database
    setUser(newUser); // Set user in context immediately
    return newUser;
  };

  const logout = () => {
    // Fix: Changed signOut(auth) to auth.signOut() to use the Firebase v8 compat API.
    return auth.signOut();
  };
  
  const value = useMemo(() => ({ user, loading, login, logout, signup }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


const App: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen font-sans">
       <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<DashboardRedirect />} />
              <Route path="student-dashboard" element={<StudentDashboard />} />
              <Route path="industrial-dashboard" element={<IndustrialSupervisorDashboard />} />
              <Route path="academic-dashboard" element={<AcademicSupervisorDashboard />} />
              <Route path="admin-dashboard" element={<AdminDashboard />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </div>
  );
};


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Spinner />
          </div>
      );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  switch(user.role) {
    case 'student': return <Navigate to="/student-dashboard" />;
    case 'industrial-supervisor': return <Navigate to="/industrial-dashboard" />;
    case 'academic-supervisor': return <Navigate to="/academic-dashboard" />;
    case 'admin': return <Navigate to="/admin-dashboard" />;
    default: return <Navigate to="/login" />;
  }
};


export default App;
