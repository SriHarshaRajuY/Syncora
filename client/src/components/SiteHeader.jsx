import { Link, NavLink } from 'react-router-dom';

const primaryLinks = [
  { to: '/', label: 'Overview' },
  { to: '/events', label: 'Event Types' },
  { to: '/availability', label: 'Availability' },
  { to: '/meetings', label: 'Meetings' }
];

export function SiteHeader({
  ctaLabel = 'Find a Time',
  ctaTo = '/book',
  compact = false,
  showSecondary = true,
  secondaryLabel = 'Dashboard',
  secondaryTo = '/events'
}) {
  return (
    <header className={`site-header ${compact ? 'compact' : ''}`}>
      <div className="site-header-inner">
        <Link className="brand-inline" to="/">
          <span className="brand-mark">S</span>
          <span className="brand-copy">
            <strong>Syncora</strong>
            <small>Scheduling Platform</small>
          </span>
        </Link>

        <nav className="site-nav">
          {primaryLinks.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `site-nav-link ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

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
    </header>
  );
}
