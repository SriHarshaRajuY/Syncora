import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';

const primaryLinks = [
  { to: '/events', label: 'Scheduling' },
  { to: '/availability', label: 'Availability' },
  { to: '/meetings', label: 'Meetings' }
];

export function SiteHeader({
  ctaLabel = 'Find a Time',
  ctaTo = '/book',
  compact = false,
  showSecondary = true,
  secondaryLabel = 'Dashboard',
  secondaryTo = '/events',
  brandTo = '/'
}) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onMouseDown = (event) => {
      const el = dropdownRef.current;
      if (!el) return;
      const btn = buttonRef.current;
      if (event.target instanceof Node && !el.contains(event.target)) {
        // If the user clicked the hamburger button, let its own onClick toggle handle it.
        if (btn && event.target instanceof Node && btn.contains(event.target)) {
          return;
        }

        setMobileOpen(false);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [mobileOpen]);

  const navLinks = useMemo(
    () =>
      primaryLinks.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `site-nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          {item.label}
        </NavLink>
      )),
    []
  );

  return (
    <header className={`site-header ${compact ? 'compact' : ''}`}>
      <div className="site-header-inner">
        <Link className="brand-inline" to={brandTo}>
          <span className="brand-mark">S</span>
          <span className="brand-copy">
            <strong>Syncora</strong>
            <small>Scheduling Platform</small>
          </span>
        </Link>

        <nav className="site-nav site-nav-desktop">{navLinks}</nav>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          ref={buttonRef}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="site-header-actions">
          {showSecondary ? (
            <Link className="ghost-button" to={secondaryTo}>
              {secondaryLabel}
            </Link>
          ) : null}
          <Link className="primary-button" to={ctaTo}>
            {ctaLabel}
          </Link>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="mobile-nav-dropdown" ref={dropdownRef}>
          {navLinks}
        </nav>
      ) : null}
    </header>
  );
}
