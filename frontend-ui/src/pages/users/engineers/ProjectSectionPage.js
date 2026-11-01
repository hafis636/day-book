import { useParams } from 'react-router-dom'
import { useGetProjectQuery } from '../../../redux/services/users/usersApi'
import ProjectWorkspaceLayout, { ProjectBackLink } from './ProjectWorkspaceLayout'
import DocumentsPage from './sections/DocumentsPage'
import ExpenditurePage from './sections/ExpenditurePage'
import LabourDetailsPage from './sections/LabourDetailsPage'
import MaterialDetailsPage from './sections/MaterialDetailsPage'
import PaymentsPage from './sections/PaymentsPage'
import ProjectProgressPage from './sections/ProjectProgressPage'
import ProjectSectionLayout from './sections/ProjectSectionLayout'
import WorkPlanningPage from './sections/WorkPlanningPage'

const sectionPages = {
  documents: DocumentsPage,
  payments: PaymentsPage,
  expenditure: ExpenditurePage,
  'project-progress': ProjectProgressPage,
  'labour-details': LabourDetailsPage,
  'work-planning': WorkPlanningPage,
  'material-details': MaterialDetailsPage,
}

const formatSectionTitle = (section) =>
  section
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const ProjectSectionPage = () => {
  const { projectId, section } = useParams()
  const { data, isLoading, isError } = useGetProjectQuery(projectId)
  const project = data?.project

  if (isLoading) {
    return (
      <ProjectWorkspaceLayout projectId={projectId} activePath={section}>
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ProjectBackLink />
          <div
            className="grid min-h-64 place-items-center"
            role="status"
            aria-label="Loading project"
          >
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

  const SectionPage = sectionPages[section]
  const sectionTitle = formatSectionTitle(section)

  return (
    <ProjectWorkspaceLayout
      projectId={projectId}
      projectStatus={project.status}
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
        {SectionPage ? (
          <SectionPage projectId={projectId} />
        ) : (
          <ProjectSectionLayout title={sectionTitle}>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              This section is coming soon. Project information and tools for this area will appear here.
            </p>
          </ProjectSectionLayout>
        )}
      </div>
    </ProjectWorkspaceLayout>
  )
}

export default ProjectSectionPage
