import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const latestUserIdRef = useRef(null);
  const initialLoadDoneRef = useRef(false);

  const buildUserFromSession = (session) => {
    if (!session?.user) return null;
    const u = session.user;
    return {
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || '',
      role: u.app_metadata?.role || 'user',
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata,
    };
  };

  const enrichWithProfile = async (session, forceLoad = false) => {
    if (!session?.user) {
      latestUserIdRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      initialLoadDoneRef.current = true;
      return;
    }

    const userId = session.user.id;

    if (!forceLoad && latestUserIdRef.current === userId && initialLoadDoneRef.current) {
      return;
    }

    latestUserIdRef.current = userId;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, created_date')
        .eq('id', userId)
        .maybeSingle();

      if (latestUserIdRef.current !== userId) return;

      const baseUser = buildUserFromSession(session);
      setUser({
        ...baseUser,
        full_name: profile?.full_name || baseUser.full_name,
        role: profile?.role || baseUser.role,
        created_date: profile?.created_date || null,
      });
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Profile enrich error:', err);
      if (latestUserIdRef.current === userId) {
        setUser(buildUserFromSession(session));
        setIsAuthenticated(true);
      }
    } finally {
      if (latestUserIdRef.current === userId) {
        setIsLoadingAuth(false);
        initialLoadDoneRef.current = true;
      }
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        latestUserIdRef.current = null;
        initialLoadDoneRef.current = false;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        (async () => {
          await enrichWithProfile(session, true);
        })();
        return;
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      latestUserIdRef.current = null;
      initialLoadDoneRef.current = false;
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
