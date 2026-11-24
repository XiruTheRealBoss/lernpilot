import { useCallback, useEffect, useState } from 'react';
import { useGoogleLogin, googleLogout, type TokenResponse } from '@react-oauth/google';
import type { GoogleUserProfile } from '../types';

const TOKEN_STORAGE_KEY = 'lernpilot_access_token';
const TOKEN_EXPIRY_KEY = 'lernpilot_token_expiry';
const PROFILE_STORAGE_KEY = 'lernpilot_user_profile';

export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

interface UseAuthResult {
  accessToken: string | null;
  profile: GoogleUserProfile | null;
  isSessionExpired: boolean;
  login: () => void;
  logout: () => void;
}

/** Busca o perfil básico do usuário autenticado via Google UserInfo endpoint. */
async function fetchGoogleProfile(accessToken: string): Promise<GoogleUserProfile | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: data.sub,
      name: data.name ?? data.email ?? 'Aluno',
      email: data.email ?? '',
      imageUrl: data.picture ?? '',
    };
  } catch {
    return null;
  }
}

/** Hook de autenticação Google OAuth com persistência em localStorage. */
export function useAuth(): UseAuthResult {
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [profile, setProfile] = useState<GoogleUserProfile | null>(() => {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as GoogleUserProfile) : null;
  });
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      setAccessToken(null);
      setIsSessionExpired(true);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  }, []);

  const handleLoginSuccess = useCallback(async (tokenResponse: TokenResponse) => {
    const token = tokenResponse.access_token;
    const expiresInMs = (tokenResponse.expires_in ?? 3600) * 1000;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInMs));
    setAccessToken(token);
    setIsSessionExpired(false);

    const userProfile = await fetchGoogleProfile(token);
    if (userProfile) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
      setProfile(userProfile);
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: () => setIsSessionExpired(true),
    scope: CLASSROOM_SCOPES,
  });

  const logout = useCallback(() => {
    googleLogout();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setAccessToken(null);
    setProfile(null);
    setIsSessionExpired(false);
  }, []);

  return { accessToken, profile, isSessionExpired, login, logout };
}
