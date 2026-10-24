import { Link, NavLink } from 'react-router-dom'

const projectSections = [
  { label: 'Documents', path: 'documents' },
  { label: 'Payments', path: 'payments' },
  { label: 'Expenditure', path: 'expenditure' },
  { label: 'Project Progress', path: 'project-progress' },
  { label: 'Labour Details', path: 'labour-details' },
  { label: 'Work Planning', path: 'work-planning' },
  { label: 'Material Details', path: 'material-details' },
]

export const ProjectBackLink = () => (
  <Link
    to="/manage-projects"
    className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
  >
    <span aria-hidden="true" className="text-lg leading-none">←</span>
    Projects
  </Link>
)

const ProjectWorkspaceLayout = ({
  projectId,
  activePath = '',
  children,
}) => {
  const projectPath = `/manage-projects/${projectId}`

  return (
    <section
      aria-label="Project workspace"
      className="relative grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-6"
    >
      <nav
        aria-label="Sections"
        className="sticky top-0 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:col-start-2 lg:row-start-1 lg:w-56 lg:self-start lg:overflow-hidden"
      >
        <div className="px-1 pb-2 lg:px-0 lg:pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sections
          </p>
        </div>
        <p className="px-1 pb-2 text-[10px] font-medium text-slate-400 lg:hidden">
          Swipe to see more
        </p>
        <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {activePath && (
            <Link
              to={projectPath}
              className="flex min-h-10 shrink-0 items-center justify-center rounded-lg px-3 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:justify-start lg:px-3 lg:text-sm"
            >
              Edit Project
            </Link>
          )}
          {projectSections.map((section) => {
            const to = `${projectPath}/${section.path}`
            return (
              <NavLink
                key={section.label}
                to={to}
                end
                aria-current={activePath === section.path ? 'page' : undefined}
                className={({ isActive }) =>
                  `flex min-h-10 shrink-0 items-center justify-center rounded-lg px-3 text-center text-xs font-medium text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:justify-start lg:px-3 lg:text-sm ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {section.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">{children}</div>
    </section>
  )
}

export default ProjectWorkspaceLayout
