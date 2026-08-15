import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../services/supabase";


const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);


  async function loadProfile(userId) {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        *,
        societies (
          id,
          name,
          code
        )
      `)
      .eq("id", userId)
      .maybeSingle();


    if (error) {
      console.error(
        "Could not load CMS profile:",
        error
      );

      setProfile(null);

      return null;
    }


    setProfile(
      data ?? null
    );


    return data ?? null;
  }


  useEffect(() => {
    let mounted = true;


    async function initializeAuth() {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();


      if (!mounted) {
        return;
      }


      setSession(session);

      setUser(
        session?.user ??
        null
      );


      if (session?.user) {
        await loadProfile(
          session.user.id
        );
      } else {
        setProfile(null);
      }


      if (mounted) {
        setLoading(false);
      }
    }


    initializeAuth();


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          async (
            _event,
            session
          ) => {
            if (!mounted) {
              return;
            }


            setSession(
              session
            );

            setUser(
              session?.user ??
              null
            );


            if (
              session?.user
            ) {
              await loadProfile(
                session.user.id
              );
            } else {
              setProfile(null);
            }


            if (mounted) {
              setLoading(false);
            }
          }
        );


    return () => {
      mounted = false;

      subscription
        .unsubscribe();
    };
  }, []);


  async function signIn(
    email,
    password
  ) {
    const result =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        });


    if (result.error) {
      return result;
    }


    const cmsProfile =
      await loadProfile(
        result.data.user.id
      );


    if (!cmsProfile) {
      await supabase.auth
        .signOut({
          scope: "local",
        });


      setSession(null);
      setUser(null);
      setProfile(null);


      return {
        data: null,

        error:
          new Error(
            "This account does not have CMS access."
          ),
      };
    }


    return result;
  }


  async function signOut() {
    const result =
      await supabase.auth
        .signOut({
          scope: "local",
        });


    if (!result.error) {
      setSession(null);
      setUser(null);
      setProfile(null);
    }


    return result;
  }


  async function refreshProfile() {
    if (!user) {
      setProfile(null);

      return null;
    }


    return loadProfile(
      user.id
    );
  }


  const role =
    profile?.role ??
    null;


  const isCMSUser =
    Boolean(
      session &&
      user &&
      profile &&
      role
    );


  const value = {
    session,
    user,
    profile,
    role,

    isCMSUser,
    loading,

    signIn,
    signOut,
    refreshProfile,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  return useContext(
    AuthContext
  );
}