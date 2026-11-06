import React, { useRef, useState } from 'react'
import Modal from '../../../components/common/Modal'
import {
  useCreateAdminPermissionMutation,
  useCreateAdminRoleMutation,
  useGetAdminPermissionsQuery,
  useGetAdminPlansQuery,
  useGetAdminRolesQuery,
  useUpdateAdminPermissionMutation,
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
  const preview = roleCodePreview(roleName)
  const dialogTitle = isEditing ? 'Edit role' : 'Add a role'

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
    <Modal
      ariaLabelledBy="role-dialog-title"
      isDismissible={!isSaving}
      closeOnBackdrop={false}
      initialFocusRef={nameInputRef}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/45 p-4"
      panelClassName="my-auto w-full max-w-lg border border-slate-200 bg-white shadow-2xl"
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
    </Modal>
  )
}

const permissionArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const AssignmentChoices = ({
  id,
  label,
  name,
  items,
  selectedValues,
  onChange,
  disabled,
  invalid,
  loading,
  error,
  onRetry,
  hint,
  errorMessage,
}) => {
  const describedBy = `${id}-hint${invalid ? ` ${id}-error` : ''}`
  const selectedLabels = items
    .filter((item) => selectedValues.includes(item.value))
    .map((item) => item.label)

  return (
    <fieldset
      id={id}
      aria-required="true"
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className="min-w-0 text-sm font-semibold text-slate-800"
    >
      <legend>
        {label} <span className="text-red-700" aria-hidden="true">*</span>{' '}
        <span className="font-normal text-slate-500">(required)</span>
      </legend>
      <p className="mt-1 break-words text-xs font-normal text-slate-600" aria-live="polite" aria-atomic="true">
        {selectedLabels.length
          ? `${selectedLabels.length} selected: ${selectedLabels.join(', ')}`
          : 'No choices selected'}
      </p>
      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto overscroll-contain pr-1">
        {items.length ? (
          items.map((item) => {
            const checked = selectedValues.includes(item.value)
            return (
              <label key={item.value} className="block cursor-pointer">
                <input
                  type="checkbox"
                  name={name}
                  value={item.value}
                  checked={checked}
                  disabled={disabled}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={() => onChange(item.value)}
                  className="peer sr-only"
                />
                <span
                  className={`flex min-h-12 items-center gap-3 border px-3 py-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-700 ${
                    checked
                      ? 'border-blue-700 bg-blue-50 text-blue-950'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 shrink-0 place-items-center border text-xs font-bold ${
                      checked
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-400 bg-white text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {checked && (
                    <span className="text-xs font-semibold text-blue-800">Selected</span>
                  )}
                </span>
              </label>
            )
          })
        ) : !loading && !error ? (
          <p className="border border-dashed border-slate-300 px-3 py-3 text-xs font-normal text-slate-600">
            No {label.toLowerCase()} available.
          </p>
        ) : null}
      </div>
      {loading ? (
        <span role="status" className="mt-1 block text-xs font-normal text-slate-600">
          Loading {label.toLowerCase()}…
        </span>
      ) : error ? (
        <span className="mt-2 flex items-center justify-between gap-3 text-xs text-red-800">
          <span role="alert">{label} couldn’t be loaded.</span>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 border border-red-300 bg-white px-2.5 py-1.5 font-semibold text-red-900 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Retry {label.toLowerCase()}
          </button>
        </span>
      ) : null}
      <span id={`${id}-hint`} className="mt-1 block text-xs font-normal text-slate-600">
        {hint}
      </span>
      {invalid && (
        <span id={`${id}-error`} role="alert" className="mt-1 block text-xs font-medium text-red-800">
          {errorMessage}
        </span>
      )}
    </fieldset>
  )
}

const PermissionDialog = ({
  permission,
  roles,
  plans,
  rolesLoading,
  rolesError,
  refetchRoles,
  plansLoading,
  plansError,
  refetchPlans,
  onClose,
  onSave,
  isSaving,
}) => {
  const isEditing = Boolean(permission)
  const [permissionKey, setPermissionKey] = useState(() => permission?.permission_key || '')
  const [roleIds, setRoleIds] = useState(() =>
    permission ? permissionArray(permission.role_ids).map(String) : []
  )
  const [planCodes, setPlanCodes] = useState(() =>
    permission ? permissionArray(permission.plan_ids).map(String) : []
  )
  const [description, setDescription] = useState(() => permission?.description || '')
  const [isActive, setIsActive] = useState(() => permission?.is_active !== false)
  const [submitError, setSubmitError] = useState('')
  const [assignmentErrors, setAssignmentErrors] = useState({ roles: false, plans: false })
  const keyInputRef = useRef(null)
  const assignableRoles = roles.filter(
    (role) => String(role.role_code || '').trim().toUpperCase() !== 'ADMIN'
  )
  const assignablePlans = plans.filter(
    (plan) => String(plan.plan_code || '').trim().toUpperCase() !== 'ADMIN'
  )
  const roleChoices = assignableRoles.map((role) => ({
    value: String(role.id),
    label: role.role_name,
  }))
  const planChoices = assignablePlans.map((plan) => ({
    value: String(plan.plan_code),
    label: plan.plan_name,
  }))
  const catalogsReady =
    !rolesLoading &&
    !rolesError &&
    !plansLoading &&
    !plansError

  const submit = async (event) => {
    event.preventDefault()
    const missingRoles = roleIds.length === 0
    const missingPlans = planCodes.length === 0
    setAssignmentErrors({ roles: missingRoles, plans: missingPlans })
    if (missingRoles || missingPlans) return

    if (!isEditing && !/^[A-Z_]+$/.test(permissionKey)) {
      setSubmitError('Permission key must contain only uppercase letters and underscores.')
      return
    }

    setSubmitError('')
    try {
      await onSave({
        ...(!isEditing && { permission_key: permissionKey }),
        role_ids: roleIds,
        plan_ids: planCodes,
        description: description.trim(),
        is_active: isActive,
      })
    } catch (error) {
      setSubmitError(
        error?.data?.error ||
          `The permission could not be ${isEditing ? 'updated' : 'created'}. Please try again.`
      )
    }
  }

  return (
    <Modal
      ariaLabelledBy="permission-dialog-title"
      isDismissible={!isSaving}
      closeOnBackdrop={false}
      initialFocusRef={keyInputRef}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/45 p-4"
      panelClassName="my-auto w-full max-w-2xl border border-slate-200 bg-white shadow-2xl"
    >
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Access control
            </p>
            <h2 id="permission-dialog-title" className="mt-2 text-xl font-bold tracking-tight text-slate-900">
              {isEditing ? 'Edit permission' : 'Add permission'}
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
          <label htmlFor="permission-key" className="block text-sm font-semibold text-slate-800">
            Permission key{isEditing ? ' (cannot be changed)' : <> <span className="text-red-700" aria-hidden="true">*</span></>}
            <input
              ref={keyInputRef}
              id="permission-key"
              name="permission_key"
              required={!isEditing}
              maxLength={100}
              autoComplete="off"
              disabled={isSaving}
              readOnly={isEditing}
              value={permissionKey}
              onChange={(event) => {
                if (!isEditing) {
                  setPermissionKey(event.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))
                }
              }}
              pattern={isEditing ? undefined : '[A-Z_]+'}
              title={isEditing ? undefined : 'Use uppercase letters and underscores only'}
              aria-describedby="permission-key-hint"
              className="mt-2 block w-full border border-slate-300 bg-white px-3 py-2.5 font-mono font-normal text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 read-only:bg-slate-100 disabled:bg-slate-50"
              placeholder="For example, PROJECT_READ"
            />
            <span id="permission-key-hint" className="mt-1 block text-xs font-normal text-slate-600">
              {isEditing
                ? 'This key is fixed when the permission is created and cannot be changed.'
                : 'Uppercase A–Z and underscores only.'}
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <AssignmentChoices
              id="permission-roles"
              label="Roles"
              name="role_ids"
              items={roleChoices}
              selectedValues={roleIds}
              onChange={(value) => {
                const nextRoleIds = new Set(roleIds)
                if (nextRoleIds.has(value)) {
                  nextRoleIds.delete(value)
                } else {
                  nextRoleIds.add(value)
                }
                const selectedRoleIds = roleChoices
                  .filter((role) => nextRoleIds.has(role.value))
                  .map((role) => role.value)
                setRoleIds(selectedRoleIds)
                if (selectedRoleIds.length) {
                  setAssignmentErrors((current) => ({ ...current, roles: false }))
                }
              }}
              disabled={isSaving || rolesLoading || rolesError}
              invalid={assignmentErrors.roles}
              loading={rolesLoading}
              error={rolesError}
              onRetry={refetchRoles}
              hint="Choose one or more roles. Tap a selected role to remove it."
              errorMessage="Select at least one role."
            />
            <AssignmentChoices
              id="permission-plans"
              label="Plans"
              name="plan_ids"
              items={planChoices}
              selectedValues={planCodes}
              onChange={(value) => {
                const nextPlanCodes = new Set(planCodes)
                if (nextPlanCodes.has(value)) {
                  nextPlanCodes.delete(value)
                } else {
                  nextPlanCodes.add(value)
                }
                const selectedPlanCodes = planChoices
                  .filter((plan) => nextPlanCodes.has(plan.value))
                  .map((plan) => plan.value)
                setPlanCodes(selectedPlanCodes)
                if (selectedPlanCodes.length) {
                  setAssignmentErrors((current) => ({ ...current, plans: false }))
                }
              }}
              disabled={isSaving || plansLoading || plansError}
              invalid={assignmentErrors.plans}
              loading={plansLoading}
              error={plansError}
              onRetry={refetchPlans}
              hint="Choose one or more plans. The administrator plan is unavailable."
              errorMessage="Select at least one plan."
            />
          </div>

          <label htmlFor="permission-description" className="block text-sm font-semibold text-slate-800">
            Description <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              id="permission-description"
              name="description"
              rows={3}
              disabled={isSaving}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 block w-full resize-y border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 disabled:bg-slate-50"
              placeholder="Explain what this permission allows"
            />
          </label>

          <label
            htmlFor="permission-is-active"
            className="flex cursor-pointer items-start gap-3 border border-slate-200 px-4 py-3 text-sm text-slate-800"
          >
            <input
              id="permission-is-active"
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
                Active permissions are available for assignment.
              </span>
            </span>
          </label>

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
              disabled={isSaving || !catalogsReady}
              className="inline-flex min-w-36 items-center justify-center bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save permission'}
            </button>
          </div>
        </form>
    </Modal>
  )
}

const RolesPermissionsPage = () => {
  const [activeTab, setActiveTab] = useState('roles')
  const {
    data: roleData,
    isLoading,
    isError,
    refetch,
    isLoading: rolesLoading,
    isError: rolesError,
    refetch: refetchRoles,
  } = useGetAdminRolesQuery()
  const {
    data: permissions = [],
    isLoading: permissionsLoading,
    isError: permissionsError,
    refetch: refetchPermissions,
  } = useGetAdminPermissionsQuery(undefined, { skip: activeTab !== 'permissions' })
  const {
    data: plansResult,
    isLoading: plansLoading,
    isError: plansError,
    refetch: refetchPlans,
  } = useGetAdminPlansQuery(undefined, {
    skip: activeTab !== 'permissions',
  })
  const [createAdminRole, { isLoading: isSaving }] = useCreateAdminRoleMutation()
  const [updateAdminRole, { isLoading: isUpdating }] = useUpdateAdminRoleMutation()
  const [createAdminPermission, { isLoading: isSavingPermission }] = useCreateAdminPermissionMutation()
  const [updateAdminPermission, { isLoading: isUpdatingPermission }] = useUpdateAdminPermissionMutation()
  const [dialog, setDialog] = useState(null)
  const [permissionDialog, setPermissionDialog] = useState(null)
  const rolesTabRef = useRef(null)
  const permissionsTabRef = useRef(null)

  const focusTab = (tab) => {
    setActiveTab(tab)
    if (tab === 'roles') {
      rolesTabRef.current?.focus()
    } else {
      permissionsTabRef.current?.focus()
    }
  }

  const handleTabKeyDown = (event, currentIndex) => {
    let nextIndex
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % 2
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + 2) % 2
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = 1
    }

    if (nextIndex !== undefined) {
      event.preventDefault()
      focusTab(nextIndex === 0 ? 'roles' : 'permissions')
    }
  }

  const closeDialog = () => setDialog(null)

  const saveRole = async (roleUpdates) => {
    if (dialog.mode === 'edit') {
      await updateAdminRole({ roleId: dialog.role.id, ...roleUpdates }).unwrap()
    } else {
      await createAdminRole(roleUpdates).unwrap()
    }
    closeDialog()
  }

  const savePermission = async (permission) => {
    if (permissionDialog?.mode === 'edit') {
      await updateAdminPermission({
        permissionId: permissionDialog.permission.id,
        ...permission,
      }).unwrap()
    } else {
      await createAdminPermission(permission).unwrap()
    }
    setPermissionDialog(null)
  }

  const plans = plansResult?.plans || []
  const roles = Array.isArray(roleData) ? roleData : []
  const roleNames = new Map(roles.map((role) => [String(role.id), role.role_name]))
  const planNames = new Map(plans.map((plan) => [String(plan.plan_code), plan.plan_name]))

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
          Manage the roles and permissions that control access across Day Book.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Roles and permissions"
        className="mt-8 flex border-b border-slate-200"
      >
        <button
          ref={rolesTabRef}
          id="roles-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'roles'}
          aria-controls="roles-panel"
          tabIndex={activeTab === 'roles' ? 0 : -1}
          onClick={() => setActiveTab('roles')}
          onKeyDown={(event) => handleTabKeyDown(event, 0)}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
            activeTab === 'roles'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          Roles
        </button>
        <button
          ref={permissionsTabRef}
          id="permissions-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'permissions'}
          aria-controls="permissions-panel"
          tabIndex={activeTab === 'permissions' ? 0 : -1}
          onClick={() => setActiveTab('permissions')}
          onKeyDown={(event) => handleTabKeyDown(event, 1)}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
            activeTab === 'permissions'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          Permissions
        </button>
      </div>

      <section
        id="roles-panel"
        role="tabpanel"
        aria-labelledby="roles-tab"
        tabIndex={0}
        hidden={activeTab !== 'roles'}
        className="mt-8"
      >
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

      <section
        id="permissions-panel"
        role="tabpanel"
        aria-labelledby="permissions-tab"
        tabIndex={0}
        hidden={activeTab !== 'permissions'}
        className="mt-10"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="permissions-heading" className="text-xl font-bold tracking-tight text-slate-900">
              Permissions
            </h2>
            {!permissionsLoading && !permissionsError && (
              <p className="mt-1 text-sm text-slate-600">
                {permissions.length} {permissions.length === 1 ? 'permission' : 'permissions'} configured
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPermissionDialog({ mode: 'create' })}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:self-auto"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add permission
          </button>
        </div>

        {permissionsLoading ? (
          <div
            role="status"
            aria-label="Loading permissions"
            className="mt-5 space-y-3 border border-slate-200 bg-white p-5"
          >
            {[1, 2, 3].map((item) => (
              <div key={item} aria-hidden="true" className="h-10 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : permissionsError ? (
          <div className="mt-5 border border-red-200 bg-red-50 p-6" role="alert">
            <h3 className="font-semibold text-red-900">Permissions couldn’t be loaded</h3>
            <p className="mt-1 text-sm text-red-800">Please try again in a moment.</p>
            <button
              type="button"
              onClick={() => refetchPermissions()}
              className="mt-4 border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Try again
            </button>
          </div>
        ) : permissions.length === 0 ? (
          <div className="mt-5 border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No permissions yet</h3>
            <p className="mt-2 text-sm text-slate-600">
              Add a permission to define access for selected roles and plans.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full min-w-[52rem] text-left">
              <caption className="sr-only">
                Configured permissions, assigned roles and plans, descriptions, and status
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Permission key', 'Roles', 'Plans', 'Description', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.map((permission) => {
                  const assignedRoles = permissionArray(permission.role_ids)
                  const assignedPlans = permissionArray(permission.plan_ids)
                  return (
                    <tr key={permission.id} className="transition-colors hover:bg-slate-50">
                      <th scope="row" className="px-5 py-4 font-mono text-sm font-semibold text-slate-900">
                        {permission.permission_key}
                      </th>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {assignedRoles.length
                          ? assignedRoles.map((id) => roleNames.get(String(id)) || String(id)).join(', ')
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {assignedPlans.length
                          ? assignedPlans.map((code) => planNames.get(String(code)) || String(code)).join(', ')
                          : '—'}
                      </td>
                      <td className="max-w-sm px-5 py-4 text-sm text-slate-600">
                        {permission.description || 'No description'}
                      </td>
                      <td className="px-5 py-4">
                        {permission.is_active === false ? (
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
                          onClick={() => setPermissionDialog({ mode: 'edit', permission })}
                          aria-label={`Edit ${permission.permission_key}`}
                          className="border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {permissionDialog && (
        <PermissionDialog
          key={permissionDialog.mode === 'edit' ? String(permissionDialog.permission.id) : 'create'}
          permission={permissionDialog.mode === 'edit' ? permissionDialog.permission : null}
          roles={roles}
          plans={plans}
          rolesLoading={rolesLoading || (!rolesError && !Array.isArray(roleData))}
          rolesError={rolesError}
          refetchRoles={refetchRoles}
          plansLoading={plansLoading || (!plansError && !Array.isArray(plansResult?.plans))}
          plansError={plansError}
          refetchPlans={refetchPlans}
          onClose={() => setPermissionDialog(null)}
          onSave={savePermission}
          isSaving={permissionDialog.mode === 'edit' ? isUpdatingPermission : isSavingPermission}
        />
      )}
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
