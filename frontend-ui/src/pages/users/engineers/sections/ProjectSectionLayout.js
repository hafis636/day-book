import { ProjectBackLink } from '../ProjectWorkspaceLayout'

const ProjectSectionLayout = ({ title, action, children }) => (
  <section className="mt-2 w-full rounded-xl border border-slate-200 border-l-4 border-l-blue-700 bg-white p-6 shadow-sm sm:p-8">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <ProjectBackLink className="mb-0 self-start" />
      {action}
    </div>
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
      Project Workspace
    </p>
    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
      {title}
    </h1>
    {children}
  </section>
)

export default ProjectSectionLayout
