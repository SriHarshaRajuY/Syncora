import { SiteHeader } from './SiteHeader.jsx';

export function AdminShell({ title, subtitle, actions, children }) {
  return (
    <div className="admin-page">
      <SiteHeader />

      <div className="dashboard-shell">
        <main className="content-pane">
          <header className="page-header admin-header">
            <div>
              <p className="eyebrow">Scheduling Dashboard</p>
              <h2>{title}</h2>
              <p className="page-subtitle">{subtitle}</p>
            </div>
            <div className="page-actions">{actions}</div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
