import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useGetProjectsQuery } from '../../../redux/services/users/usersApi'

const ManageProjects = () => {
  const { data, isLoading, isError } = useGetProjectsQuery()
  const projects = data?.projects ?? []
  const [statusFilter, setStatusFilter] = useState('')
  const [projectTypeFilter, setProjectTypeFilter] = useState('')
  const statuses = [...new Set(projects.map((project) => project.status).filter(Boolean))]
  const projectTypes = [
    ...new Set(projects.map((project) => project.project_type).filter(Boolean)),
  ]
  const filteredProjects = projects.filter(
    (project) =>
      (!statusFilter || project.status === statusFilter) &&
      (!projectTypeFilter || project.project_type === projectTypeFilter)
  )
  const hasActiveFilters = Boolean(statusFilter || projectTypeFilter)
  const capitalizeWords = (text) =>
    text.replace(/\b\w/g, (character) => character.toUpperCase())

  return (
    <section>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manage Projects</h1>
          <p className="mt-2 text-slate-600">View and manage your projects.</p>
        </div>

        {!isLoading && !isError && projects.length > 0 && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-slate-700">
              <select
                aria-label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 block min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                <option value="">{statusFilter ? 'All' : 'Status'}</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {capitalizeWords(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              <select
                aria-label="Project Type"
                value={projectTypeFilter}
                onChange={(event) => setProjectTypeFilter(event.target.value)}
                className="mt-1 block min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                <option value="">
                  {projectTypeFilter ? 'All' : 'Project Type'}
                </option>
                {projectTypes.map((projectType) => (
                  <option key={projectType} value={projectType}>
                    {projectType}
                  </option>
                ))}
              </select>
            </label>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('')
                  setProjectTypeFilter('')
                }}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid min-h-64 place-items-center" role="status" aria-label="Loading projects">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
        </div>
      )}

      {isError && (
        <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          Unable to load projects. Please try again.
        </p>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <p className="mt-6 rounded-lg bg-white p-6 text-slate-600 ring-1 ring-slate-200">
          You haven’t added any projects yet.
        </p>
      )}

      {!isLoading && !isError && projects.length > 0 && filteredProjects.length === 0 && (
        <p className="mt-6 rounded-lg bg-white p-6 text-slate-600 ring-1 ring-slate-200">
          No projects match the selected filters.
        </p>
      )}

      {!isLoading && !isError && filteredProjects.length > 0 && (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const displayName = capitalizeWords(project.name)

            return (
              <li
                key={project.id}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
              >
                <Link
                  to={`/manage-projects/${project.id}`}
                  aria-label={`Edit ${displayName}`}
                  className="relative block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-inset"
                >
                  <img
                    src={project.cover_image || '/default-cover.jpg'}
                    alt={`${displayName} cover`}
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {displayName}
                      </h2>
                      <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {capitalizeWords(project.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {capitalizeWords(project.project_type)}
                    </p>
                  </div>
                  <span className="absolute inset-0 grid place-items-center bg-slate-950/45 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="rounded-lg bg-blue-700 px-4 py-2">Edit</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ManageProjects
