import { Link, NavLink } from 'react-router-dom';

const primaryNav = [
  { to: '/events', label: 'Scheduling' },
  { to: '/meetings', label: 'Meetings' },
  { to: '/availability', label: 'Availability' }
];

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
  quickActionLabel = 'Create',
  quickActionTo = '/events',
  onQuickAction
}) {
  return (
    <div className="admin-app">
      <aside className="cal-sidebar">
        <Link className="cal-logo" to="/">
          <span className="brand-mark">S</span>
          <span className="brand-copy">
            <strong>Syncora</strong>
            <small>Scheduling Platform</small>
          </span>
        </Link>

        <div className="cal-create-wrap">
          {onQuickAction ? (
            <button className="cal-create-button" type="button" onClick={onQuickAction}>
              + {quickActionLabel}
            </button>
          ) : (
            <Link className="cal-create-button" to={quickActionTo}>
              + {quickActionLabel}
            </Link>
          )}
        </div>

        <nav className="cal-nav">
          {primaryNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `cal-nav-item ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="cal-sidebar-footer">
          <div className="cal-plan-card">
            <strong>Assignment submission</strong>
            <span>Responsive admin, public booking, and bonus flows are all included.</span>
          </div>
          <Link to="/book">Public booking</Link>
          <Link to="/">Landing page</Link>
          <span>Help</span>
        </div>
      </aside>

      <section className="cal-main">
        <div className="cal-main-topbar">
          <div className="cal-topbar-spacer" />
          <div className="cal-user-pill">S</div>
        </div>

        <main className="cal-page">
          <header className="cal-page-header">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="page-actions">{actions}</div>
          </header>
          {children}
        </main>
      </section>

      <aside className="cal-rail">
        <div className="cal-rail-header">
          <h3>Get started</h3>
        </div>
        <div className="cal-rail-card">
          <strong>Get to know Syncora</strong>
          <span>Walk through event creation, availability, and booking flow.</span>
        </div>
        <div className="cal-rail-card">
          <strong>Perfect scheduling setup</strong>
          <span>Use schedules, overrides, buffers, and custom questions together.</span>
        </div>
        <div className="cal-rail-card">
          <strong>Booking follow-up</strong>
          <span>Booking confirmation, cancellation, and rescheduling are already wired.</span>
        </div>
      </aside>
    </div>
  );
}
