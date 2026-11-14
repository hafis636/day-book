import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "../../../config/api";
import { createProjectEventBody } from "./projectEventRequest";

export const usersApi = createApi({
  reducerPath: "usersApi",
  tagTypes: ["Session", "Project", "ProjectDocuments", "ProjectPayments", "ProjectEvents", "ProjectLabourAssignments", "Plans", "AdminPlans", "Roles", "Permissions"],
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
    searchLabourWorkers: builder.query({
      query: (name) => ({
        url: "/labour-workers/search",
        params: { name },
      }),
    }),
    getProjectLabourAssignments: builder.query({
      query: (projectId) => `/projects/${projectId}/labour-assignments`,
      providesTags: (result, error, projectId) => [
        { type: "ProjectLabourAssignments", id: projectId },
      ],
    }),
    createProjectLabourAssignment: builder.mutation({
      query: ({ projectId, ...assignment }) => ({
        url: `/projects/${projectId}/labour-assignments`,
        method: "POST",
        body: assignment,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectLabourAssignments", id: projectId },
        { type: "Project", id: projectId },
      ],
    }),
    getProject: builder.query({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: "Project", id }],
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
        { type: "Project", id: projectId },
      ],
    }),
    updateProjectPayment: builder.mutation({
      query: ({ projectId, paymentId, ...payment }) => ({
        url: `/projects/${projectId}/payments/${paymentId}`,
        method: "PATCH",
        body: payment,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectPayments", id: projectId },
        { type: "Project", id: projectId },
      ],
    }),
    deleteProjectPayment: builder.mutation({
      query: ({ projectId, paymentId }) => ({
        url: `/projects/${projectId}/payments/${paymentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectPayments", id: projectId },
        { type: "Project", id: projectId },
      ],
    }),
    getProjectEvents: builder.query({
      query: (projectId) => `/projects/${projectId}/events`,
      providesTags: (result, error, projectId) => [
        { type: "ProjectEvents", id: projectId },
      ],
    }),
    createProjectEvent: builder.mutation({
      query: ({ projectId, ...event }) => {
        return {
          url: `/projects/${projectId}/events`,
          method: "POST",
          body: createProjectEventBody(event),
        };
      },
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectEvents", id: projectId },
        { type: "Project", id: projectId },
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
        { type: "Project", id: projectId },
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
        { type: "Project", id: projectId },
      ],
    }),
    deleteProjectDocument: builder.mutation({
      query: ({ projectId, documentId }) => ({
        url: `/projects/${projectId}/documents/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "ProjectDocuments", id: projectId },
        { type: "Project", id: projectId },
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
        { type: "Project", id: projectId },
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
  useLazySearchLabourWorkersQuery,
  useGetProjectLabourAssignmentsQuery,
  useCreateProjectLabourAssignmentMutation,
  useGetProjectQuery,
  useUpdateProjectMutation,
  useGetProjectDocumentsQuery,
  useGetProjectPaymentsQuery,
  useCreateProjectPaymentMutation,
  useUpdateProjectPaymentMutation,
  useDeleteProjectPaymentMutation,
  useGetProjectEventsQuery,
  useCreateProjectEventMutation,
  useAddProjectDocumentReviewCommentMutation,
  useUploadProjectDocumentsMutation,
  useDeleteProjectDocumentMutation,
  useUpdateProjectDocumentMutation,
} = usersApi;