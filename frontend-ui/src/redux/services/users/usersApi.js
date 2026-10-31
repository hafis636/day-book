import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "../../../config/api";

export const usersApi = createApi({
  reducerPath: "usersApi",
  tagTypes: ["Session", "Project", "ProjectDocuments", "Plans"],
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
  useLazyConfirmUserQuery,
  useValidateOtpMutation,
  useGetCurrentSessionQuery,
  useGetPlansQuery,
  useLogoutMutation,
  useCreateProjectMutation,
  useGetProjectsQuery,
  useGetProjectQuery,
  useUpdateProjectMutation,
  useGetProjectDocumentsQuery,
  useUploadProjectDocumentsMutation,
  useDeleteProjectDocumentMutation,
  useUpdateProjectDocumentMutation,
} = usersApi;