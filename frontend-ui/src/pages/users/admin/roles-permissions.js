import React, { useEffect, useRef, useState } from 'react'
import {
  useCreateAdminRoleMutation,
  useGetAdminRolesQuery,
  useUpdateAdminRoleMutation,
} from '../../../redux/services/users/usersApi'

const roleCodePreview = (value) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const apiErrorMessage = (error, isEditing) =>
  error?.data?.error ||
  `The role could not be ${isEditing ? 'updated' : 'created'}. Please try again.`

const RoleDialog = ({ role, onClose, onSave, isSaving }) => {
  const isEditing = Boolean(role)
  const [roleName, setRoleName] = useState(() => role?.role_name || '')
  const [description, setDescription] = useState(() => role?.description || '')
  const [isActive, setIsActive] = useState(() => role?.is_active !== false)
  const [submitError, setSubmitError] = useState('')
  const nameInputRef = useRef(null)
  const dialogRef = useRef(null)
  const previousActiveElementRef = useRef(null)
  const preview = roleCodePreview(roleName)
  const dialogTitle = isEditing ? 'Edit role' : 'Add a role'

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement
    nameInputRef.current?.focus()
    return () => previousActiveElementRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusableElements = dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onClose])

  const submit = async (event) => {
    event.preventDefault()
    const cleanName = roleName.trim()
    if (!cleanName) {
      setSubmitError('Role name is required')
      return
    }

    setSubmitError('')
    try {
      await onSave({
        role_name: cleanName,
        description: description.trim(),
        is_active: isActive,
      })
    } catch (error) {
      setSubmitError(apiErrorMessage(error, isEditing))
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/45 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-dialog-title"
        data-role-dialog
        className="my-auto w-full max-w-lg border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Role management
            </p>
            <h2 id="role-dialog-title" className="mt-2 text-xl font-bold tracking-tight text-slate-900">
              {dialogTitle}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={isSaving}
            className="grid h-9 w-9 shrink-0 place-items-center text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </header>

        <form onSubmit={submit} className="space-y-5 px-6 py-6">
          <label htmlFor="role-name" className="block text-sm font-semibold text-slate-800">
            Role name <span className="text-red-700" aria-hidden="true">*</span>
            <input
              ref={nameInputRef}
              id="role-name"
              name="role_name"
              required
              maxLength={50}
              autoComplete="off"
              disabled={isSaving}
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              className="mt-2 block w-full border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 disabled:bg-slate-50"
              placeholder="For example, Project Manager"
              aria-describedby="role-code-hint"
            />
          </label>

          <label htmlFor="role-description" className="block text-sm font-semibold text-slate-800">
            Description <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              id="role-description"
              name="description"
              rows={3}
              disabled={isSaving}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 block w-full resize-y border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 disabled:bg-slate-50"
              placeholder="Describe this role’s responsibilities"
            />
          </label>

          <label
            htmlFor="role-is-active"
            className="flex cursor-pointer items-start gap-3 border border-slate-200 px-4 py-3 text-sm text-slate-800"
          >
            <input
              id="role-is-active"
              name="is_active"
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={isSaving}
              className="mt-0.5 h-4 w-4 accent-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            <span>
              <span className="block font-semibold">Active</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                Active roles are available for assignment.
              </span>
            </span>
          </label>

          <div className="border-l-2 border-blue-700 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {isEditing ? 'Immutable role code' : 'Generated role code'}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {isEditing ? role.role_code : preview || 'Will be generated from the role name'}
            </p>
            <p id="role-code-hint" className="mt-1 text-xs leading-5 text-slate-600">
              {isEditing
                ? 'This code is fixed when the role is created and cannot be changed.'
                : 'Codes use uppercase letters, numbers, and underscores.'}
            </p>
          </div>

          {submitError && (
            <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
              {submitError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-w-32 items-center justify-center bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Save role'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

const RolesPermissionsPage = () => {
  const { data: roles = [], isLoading, isError, refetch } = useGetAdminRolesQuery()
  const [createAdminRole, { isLoading: isSaving }] = useCreateAdminRoleMutation()
  const [updateAdminRole, { isLoading: isUpdating }] = useUpdateAdminRoleMutation()
  const [dialog, setDialog] = useState(null)

  const closeDialog = () => setDialog(null)

  const saveRole = async (roleUpdates) => {
    if (dialog.mode === 'edit') {
      await updateAdminRole({ roleId: dialog.role.id, ...roleUpdates }).unwrap()
    } else {
      await createAdminRole(roleUpdates).unwrap()
    }
    closeDialog()
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <header className="border-b border-slate-200 pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
          Administration
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Roles &amp; Permissions
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Manage the roles available across Day Book. Permission assignment is not
          available yet.
        </p>
      </header>

      <section aria-labelledby="roles-heading" className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="roles-heading" className="text-xl font-bold tracking-tight text-slate-900">
              Roles
            </h2>
            {!isLoading && !isError && (
              <p className="mt-1 text-sm text-slate-600">
                {roles.length} {roles.length === 1 ? 'role' : 'roles'} configured
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDialog({ mode: 'create' })}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:self-auto"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add role
          </button>
        </div>

        {isLoading ? (
          <div
            role="status"
            aria-label="Loading roles"
            className="mt-5 space-y-3 border border-slate-200 bg-white p-5"
          >
            {[1, 2, 3].map((item) => (
              <div key={item} aria-hidden="true" className="h-10 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-5 border border-red-200 bg-red-50 p-6" role="alert">
            <h3 className="font-semibold text-red-900">Roles couldn’t be loaded</h3>
            <p className="mt-1 text-sm text-red-800">Please try again in a moment.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Try again
            </button>
          </div>
        ) : roles.length === 0 ? (
          <div className="mt-5 border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No roles yet</h3>
            <p className="mt-2 text-sm text-slate-600">
              Create a role to make it available in Day Book.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full min-w-[48rem] text-left">
              <caption className="sr-only">
                Configured roles, descriptions, status, role codes, and actions
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                    Role name
                  </th>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                    Role code
                  </th>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                    Description
                  </th>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((role) => (
                  <tr key={role.id} className="transition-colors hover:bg-slate-50">
                    <th scope="row" className="px-5 py-4 text-sm font-semibold text-slate-900">
                      {role.role_name}
                    </th>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-semibold tracking-wide text-slate-700">
                        {role.role_code}
                      </span>
                    </td>
                    <td className="max-w-sm px-5 py-4 text-sm text-slate-600">
                      {role.description || 'No description'}
                    </td>
                    <td className="px-5 py-4">
                      {role.is_active === false ? (
                        <span className="inline-flex border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setDialog({ mode: 'edit', role })}
                        aria-label={`Edit ${role.role_name}`}
                        className="border border-slate-300 px-3 py-1.5 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="permissions-heading" className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="permissions-heading" className="text-xl font-bold tracking-tight text-slate-900">
            Permissions
          </h2>
          <span className="border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
            Coming soon
          </span>
        </div>
        <div className="mt-4 border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-sm leading-6 text-slate-700">
            Permission assignment will be available when Day Book supports a
            permission catalog. No permissions are configured or enforced here.
          </p>
        </div>
      </section>

      {dialog && (
        <RoleDialog
          key={dialog.mode === 'edit' ? dialog.role.id : 'create'}
          role={dialog.mode === 'edit' ? dialog.role : null}
          onClose={closeDialog}
          onSave={saveRole}
          isSaving={dialog.mode === 'edit' ? isUpdating : isSaving}
        />
      )}
    </section>
  )
}

export default RolesPermissionsPage
