const LANDING_SEEN_KEY = 'syncora-landing-seen';

export function hasSeenLanding() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(LANDING_SEEN_KEY) === 'true';
}

export function markLandingSeen() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LANDING_SEEN_KEY, 'true');
}
