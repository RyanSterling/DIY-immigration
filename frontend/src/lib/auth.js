/**
 * Authentication utilities for Clerk integration
 */

import { useAuth, useUser } from '@clerk/react';

/**
 * Hook to get authenticated API headers
 * Returns a function that gets headers with the current auth token
 */
export function useAuthHeaders() {
  const { getToken } = useAuth();

  return async () => {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { isSignedIn, isLoaded } = useAuth();
  return { isAuthenticated: isSignedIn, isLoaded };
}

/**
 * Hook to get current user info
 */
export function useCurrentUser() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return { user: null, isLoaded };
  }

  return {
    user: {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
    },
    isLoaded,
  };
}

/**
 * Sync user to backend after sign-in
 * Call this after successful authentication to ensure user exists in database
 * @param {Function} getToken - Function to get auth token
 * @param {Object} userData - User data from Clerk (email, firstName, lastName)
 */
export async function syncUserToBackend(getToken, userData = null) {
  try {
    const token = await getToken();
    if (!token) return { success: false, error: 'No token' };

    const workerUrl = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

    const response = await fetch(`${workerUrl}/sync-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: userData?.email,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to sync user');
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    console.error('Error syncing user:', error);
    return { success: false, error: error.message };
  }
}
