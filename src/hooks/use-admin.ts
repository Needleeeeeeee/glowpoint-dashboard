"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * A hook to check if the current user is an admin.
 * @returns An object containing the admin status, loading state, and the user object.
 */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const { data: profile, error } = await supabase
            .from('Profiles')
            .select('isAdmin')
            .eq('email', user.email)
            .single();

          if (error) throw error;
          setIsAdmin(profile?.isAdmin || false);
        } catch (error) {
          console.error('Error fetching admin status:', error);
          setIsAdmin(false);
        }
      }
      setIsLoading(false);
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, isLoading, user };
}
