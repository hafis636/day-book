import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "../../../config/api";

export const usersApi = createApi({
  reducerPath: "usersApi",
  tagTypes: ["Session", "Project", "ProjectDocuments", "ProjectPayments", "Plans", "AdminPlans", "Roles", "Permissions"],
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    loginUser: builder.mutation({
      query: ({ username, password }) => ({
        url: "/login",
        method: "POST",
        body: { username, password },
      }),
      invalidatesTags: ["Session"],
    }),
    registerUser: builder.mutation({
      query: (user) => ({
        url: "/register",
        method: "POST",
        body: user,
      }),
    }),
    getRoles: builder.query({
      query: () => "/roles",
      providesTags: ["Roles"],
    }),
    getAdminRoles: builder.query({
      query: () => "/admin/roles",
      providesTags: ["Roles"],
    }),
    createAdminRole: builder.mutation({
      query: (role) => ({
        url: "/admin/roles",
        method: "POST",
        body: role,
      }),
      invalidatesTags: ["Roles"],
    }),
    updateAdminRole: builder.mutation({
      query: ({ roleId, ...role }) => ({
        url: `/admin/roles/${encodeURIComponent(roleId)}`,
        method: "PATCH",
        body: role,
      }),
      invalidatesTags: ["Roles"],
    }),
    getAdminPermissions: builder.query({
      query: () => "/admin/permissions",
      providesTags: ["Permissions"],
    }),
    createAdminPermission: builder.mutation({
      query: (permission) => ({
        url: "/admin/permissions",
        method: "POST",
        body: permission,
      }),
      invalidatesTags: ["Permissions"],
    }),
    updateAdminPermission: builder.mutation({
      query: ({ permissionId, ...permission }) => ({
        url: `/admin/permissions/${encodeURIComponent(String(permissionId))}`,
        method: "PATCH",
        body: permission,
      }),
      invalidatesTags: ["Permissions"],
    }),
    confirmUser: builder.query({
      query: (contact) => ({
        url: "/otp/confirm-user",
        params: { contact },
      }),
    }),
    validateOtp: builder.mutation({
      query: ({ contact, otp }) => ({
        url: "/otp/validate",
        method: "POST",
        body: { contact, otp },
      }),
      invalidatesTags: ["Session"],
    }),
    getCurrentSession: builder.query({
      query: () => "/session",
      providesTags: ["Session"],
    }),
    getPlans: builder.query({
      query: () => "/plans",
      providesTags: ["Plans"],
    }),
    selectPlan: builder.mutation({
      query: (planCode) => ({
        url: `/plans/${encodeURIComponent(planCode)}`,
        method: "PATCH",
      }),
      invalidatesTags: ["Session"],
    }),
    getAdminPlans: builder.query({
      query: () => "/admin/plans",
      providesTags: ["AdminPlans"],
    }),
    updateAdminPlan: builder.mutation({
      query: ({ planCode, ...plan }) => ({
        url: `/admin/plans/${encodeURIComponent(planCode)}`,
        method: "PATCH",
        body: plan,
      }),
      invalidatesTags: ["AdminPlans"],
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/session/logout",
        method: "POST",
      }),
      invalidatesTags: ["Session"],
    }),
    createProject: builder.mutation({
      query: (formData) => ({
        url: "/projects",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Project"],
    }),
    getProjects: builder.query({
      query: () => "/projects",
      providesTags: ["Project"],
    }),
    getProject: builder.query({
      query: (id) => `/projects/${id}`,
      providesTags: ["Project"],
    }),
    updateProject: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/projects/${id}`,
        method: "PATCH",
        body: formData,
      }),
      invalidatesTags: ["Project"],
    }),
    getProjectDocuments: builder.query({
      query: (projectId) => `/projects/${projectId}/documents`,
      providesTags: (result, error, projectId) => [
        { type: "ProjectDocuments", id: projectId },
      ],
    }),
    getProjectPayments: builder.query({
      query: (projectId) => `/projects/${projectId}/payments`,
      providesTags: (result, error, projectId) => [
        { type: "ProjectPayments", id: projectId },
      ],
    }),
    createProjectPayment: builder.mutation({
      query: ({ projectId, ...payment }) => ({
        url: `/projects/${projectId}/payments`,
        method: "POST",
        body: payment,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectPayments", id: projectId },
      ],
    }),
    addProjectDocumentReviewComment: builder.mutation({
      query: ({ projectId, documentId, comment }) => ({
        url: `/projects/${projectId}/documents/${documentId}/review-comments`,
        method: "POST",
        body: { comment },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectDocuments", id: projectId },
      ],
    }),
    uploadProjectDocuments: builder.mutation({
      query: ({ projectId, formData }) => ({
        url: `/projects/${projectId}/documents`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectDocuments", id: projectId },
      ],
    }),
    deleteProjectDocument: builder.mutation({
      query: ({ projectId, documentId }) => ({
        url: `/projects/${projectId}/documents/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectDocuments", id: projectId },
      ],
    }),
    updateProjectDocument: builder.mutation({
      query: ({ projectId, documentId, formData }) => ({
        url: `/projects/${projectId}/documents/${documentId}`,
        method: "PATCH",
        body: formData,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectDocuments", id: projectId },
      ],
    }),
  }),
});

export const {
  useLoginUserMutation,
  useRegisterUserMutation,
  useGetRolesQuery,
  useGetAdminRolesQuery,
  useCreateAdminRoleMutation,
  useUpdateAdminRoleMutation,
  useGetAdminPermissionsQuery,
  useCreateAdminPermissionMutation,
  useUpdateAdminPermissionMutation,
  useLazyConfirmUserQuery,
  useValidateOtpMutation,
  useGetCurrentSessionQuery,
  useGetPlansQuery,
  useSelectPlanMutation,
  useGetAdminPlansQuery,
  useUpdateAdminPlanMutation,
  useLogoutMutation,
  useCreateProjectMutation,
  useGetProjectsQuery,
  useGetProjectQuery,
  useUpdateProjectMutation,
  useGetProjectDocumentsQuery,
  useGetProjectPaymentsQuery,
  useCreateProjectPaymentMutation,
  useAddProjectDocumentReviewCommentMutation,
  useUploadProjectDocumentsMutation,
  useDeleteProjectDocumentMutation,
  useUpdateProjectDocumentMutation,
} = usersApi;