"use client";

import { useState, useEffect } from "react";

/**
 * A custom hook to check if a media query matches.
 * It's safe for server-side rendering.
 * @param query The media query string (e.g., '(max-width: 768px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);

    // Set the initial state
    listener();

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
