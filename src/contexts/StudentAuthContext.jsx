import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../services/supabase";
import { useAuth } from "./AuthContext";

const StudentAuthContext = createContext(null);

export function StudentAuthProvider({ children }) {
  const {
    user,
    session,
    loading: authLoading,
  } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadStudentProfile(userId) {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from("student_profiles")
      .select(`
        id,
        full_name,
        student_id,
        grade,
        class_name,
        created_at,
        updated_at
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "Could not load student profile:",
        error
      );

      setProfile(null);
      return null;
    }

    setProfile(data ?? null);
    return data ?? null;
  }

  useEffect(() => {
    let active = true;

    async function syncStudent() {
      if (authLoading) {
        return;
      }

      if (!user) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }

        return;
      }

      setLoading(true);

      await loadStudentProfile(user.id);

      if (active) {
        setLoading(false);
      }
    }

    syncStudent();

    return () => {
      active = false;
    };
  }, [
    user?.id,
    authLoading,
  ]);

  async function signIn(email, password) {
    setLoading(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email:
          email
            .trim()
            .toLowerCase(),
        password,
      });

    if (error) {
      setLoading(false);

      return {
        data: null,
        error,
      };
    }

    const studentProfile =
      await loadStudentProfile(
        data.user.id
      );

    if (!studentProfile) {
      await supabase.auth.signOut({
        scope: "local",
      });

      setProfile(null);
      setLoading(false);

      return {
        data: null,
        error: new Error(
          "This account is not registered as a student."
        ),
      };
    }

    setLoading(false);

    return {
      data,
      error: null,
    };
  }

  async function signUp({
    email,
    password,
    fullName,
    studentId,
    grade,
    className,
  }) {
    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signUp({
          email:
            email
              .trim()
              .toLowerCase(),
          password,
          options: {
            data: {
              account_type: "student",
              full_name: fullName.trim(),
              student_id: studentId.trim(),
            },
          },
        });

      if (error) {
        return {
          data: null,
          error,
        };
      }

      if (!data.user) {
        return {
          data: null,
          error: new Error(
            "Student account could not be created."
          ),
        };
      }

      if (!data.session) {
        return {
          data,
          error: null,
          requiresEmailConfirmation: true,
        };
      }

      const { error: profileError } =
        await supabase
          .from("student_profiles")
          .insert({
            id: data.user.id,
            full_name: fullName.trim(),
            student_id: studentId.trim(),
            grade:
              grade?.trim() ||
              null,
            class_name:
              className?.trim() ||
              null,
          });

      if (profileError) {
        console.error(
          "Could not create student profile:",
          profileError
        );

        await supabase.auth.signOut({
          scope: "local",
        });

        setProfile(null);

        return {
          data: null,
          error: profileError,
        };
      }

      await loadStudentProfile(
        data.user.id
      );

      return {
        data,
        error: null,
        requiresEmailConfirmation: false,
      };
    } catch (error) {
      console.error(
        "Student signup failed:",
        error
      );

      return {
        data: null,
        error,
      };
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const result =
      await supabase.auth.signOut({
        scope: "local",
      });

    if (!result.error) {
      setProfile(null);
    }

    return result;
  }

  async function refreshProfile() {
    if (!user) {
      setProfile(null);
      return null;
    }

    return loadStudentProfile(user.id);
  }

  const isStudent = Boolean(
    session &&
    user &&
    profile
  );

  const value = {
    student: user,
    profile,
    isStudent,
    loading:
      authLoading ||
      loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context =
    useContext(
      StudentAuthContext
    );

  if (!context) {
    throw new Error(
      "useStudentAuth must be used inside StudentAuthProvider."
    );
  }

  return context;
}