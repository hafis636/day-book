import { useNavigate, useParams } from 'react-router-dom'
import AddProjects from './AddProjects'
import ProjectWorkspaceLayout, { ProjectBackLink } from './ProjectWorkspaceLayout'
import {
  useGetProjectQuery,
  useUpdateProjectMutation,
} from '../../../redux/services/users/usersApi'

const EditProject = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useGetProjectQuery(projectId)
  const [updateProject, { isLoading: isSaving }] = useUpdateProjectMutation()
  const project = data?.project

  const handleSubmit = async (formData) => {
    await updateProject({ id: projectId, formData }).unwrap()
    navigate('/manage-projects', { state: { projectUpdated: true } })
  }

  if (isLoading) {
    return (
      <div className="grid min-h-64 place-items-center" role="status" aria-label="Loading project">
        <span className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
      </div>
    )
  }

  if (isError || !project) {
    return (
      <ProjectWorkspaceLayout projectId={projectId} projectName={project?.name}>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
    <ProjectWorkspaceLayout projectId={projectId}>
      <AddProjects
        key={project.id}
        project={project}
        existingImages={project.images || []}
        onSubmitProject={handleSubmit}
        isSaving={isSaving}
      />
    </ProjectWorkspaceLayout>
  )
}

export default EditProject
