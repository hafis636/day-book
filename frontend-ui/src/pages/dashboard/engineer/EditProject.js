import { Link, useNavigate, useParams } from 'react-router-dom'
import AddProjects from './AddProjects'
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
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Project Not Found</h1>
        <p className="mt-3 text-slate-600">
          This project could not be loaded. It may have been removed or you may not have access.
        </p>
        <Link
          to="/manage-projects"
          className="mt-5 inline-flex font-semibold text-blue-700 hover:text-blue-800"
        >
          Back To Manage Projects
        </Link>
      </section>
    )
  }

  return (
    <>
      <Link
        to="/manage-projects"
        className="mb-5 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800"
      >
        Back To Manage Projects
      </Link>
      <AddProjects
        key={project.id}
        project={project}
        existingImages={project.images || []}
        onSubmitProject={handleSubmit}
        isSaving={isSaving}
      />
    </>
  )
}

export default EditProject
