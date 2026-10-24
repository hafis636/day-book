import { useParams } from 'react-router-dom'
import { useGetProjectQuery } from '../../../redux/services/users/usersApi'
import ProjectWorkspaceLayout, { ProjectBackLink } from './ProjectWorkspaceLayout'

const sectionTitles = {
  documents: 'Documents',
  payments: 'Payments',
  expenditure: 'Expenditure',
  'project-progress': 'Project Progress',
  'labour-details': 'Labour Details',
  'work-planning': 'Work Planning',
  'material-details': 'Material Details',
};

const ProjectSectionPage = () => {
  const { projectId, section } = useParams()
  const { data, isLoading, isError } = useGetProjectQuery(projectId)
  const project = data?.project
  const title =
    sectionTitles[section] ||
    section
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  if (isLoading) {
    return (
      <ProjectWorkspaceLayout projectId={projectId} activePath={section}>
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ProjectBackLink />
          <div className="grid min-h-64 place-items-center" role="status" aria-label="Loading project">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          </div>
        </section>
      </ProjectWorkspaceLayout>
    )
  }

  if (isError || !project) {
    return (
      <ProjectWorkspaceLayout projectId={projectId} activePath={section}>
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ProjectBackLink />
          <h1 className="text-2xl font-bold text-slate-900">Project Not Found</h1>
          <p className="mt-3 text-slate-600">
            This project could not be loaded. It may have been removed or you may not have access.
          </p>
        </section>
      </ProjectWorkspaceLayout>
    )
  }

  return (
    <ProjectWorkspaceLayout
      projectId={projectId}
      activePath={section}
    >
      <div className="w-full">
        <section
          aria-label="Project summary"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Project summary
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            {project.name}
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Project type
              </dt>
              <dd className="mt-1 font-medium text-slate-800">
                {project.project_type || 'Not specified'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Status
              </dt>
              <dd className="mt-1 font-medium text-slate-800">
                {project.status || 'Not specified'}
              </dd>
            </div>
          </dl>
        </section>
        <section className="mt-2 w-full rounded-xl border border-slate-200 border-l-4 border-l-blue-700 bg-white p-6 shadow-sm sm:p-8">
          <ProjectBackLink />
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Project Workspace
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This section is coming soon. Project information and tools for this area will appear here.
          </p>
        </section>
      </div>
    </ProjectWorkspaceLayout>
  )
}

export default ProjectSectionPage
