"use client";

import { useSyncExternalStore } from "react";

const authChangedEvent = "gamehub-auth-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(authChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(authChangedEvent, onChange);
  };
}

function getSnapshot() {
  return Boolean(window.localStorage.getItem("gamehub-token"));
}

export function useAuth() {
  const isAuthenticated = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function authenticate(token: string) {
    window.localStorage.setItem("gamehub-token", token);
    window.dispatchEvent(new Event(authChangedEvent));
  }

  function logout() {
    window.localStorage.removeItem("gamehub-token");
    window.dispatchEvent(new Event(authChangedEvent));
  }

  return { isAuthenticated, authenticate, logout };
}
