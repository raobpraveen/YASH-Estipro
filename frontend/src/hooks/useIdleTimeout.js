import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Tracks user inactivity and triggers logout after `idleMs` of no activity.
 * A warning toast/dialog is exposed via `showWarning` flag, surfacing
 * `warningSeconds` before the actual logout so the user can extend the session.
 */
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

const useIdleTimeout = ({ enabled = true, idleMs = 15 * 60 * 1000, warningMs = 2 * 60 * 1000, onTimeout }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(warningMs / 1000));
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    setSecondsLeft(Math.floor(warningMs / 1000));
    if (!enabled) return;
    // Trigger warning before timeout
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      let s = Math.floor(warningMs / 1000);
      setSecondsLeft(s);
      countdownRef.current = setInterval(() => {
        s -= 1;
        setSecondsLeft(Math.max(s, 0));
      }, 1000);
    }, Math.max(idleMs - warningMs, 0));
    // Final logout
    idleTimerRef.current = setTimeout(() => {
      clearTimers();
      setShowWarning(false);
      if (onTimeoutRef.current) onTimeoutRef.current();
    }, idleMs);
  }, [enabled, idleMs, warningMs, clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }
    const handler = () => {
      // Suppress activity tracking when the warning dialog is showing
      // — only the explicit "Stay signed in" action should reset the timer.
      if (showWarning) return;
      reset();
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));
    reset();
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handler));
      clearTimers();
    };
  }, [enabled, reset, clearTimers, showWarning]);

  return { showWarning, secondsLeft, extend: reset };
};

export default useIdleTimeout;
