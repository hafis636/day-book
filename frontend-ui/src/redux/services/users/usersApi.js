import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "../../../config/api";

export const usersApi = createApi({
  reducerPath: "usersApi",
  tagTypes: ["Session", "Project"],
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
  }),
});

export const {
  useLoginUserMutation,
  useRegisterUserMutation,
  useGetRolesQuery,
  useLazyConfirmUserQuery,
  useValidateOtpMutation,
  useGetCurrentSessionQuery,
  useLogoutMutation,
  useCreateProjectMutation,
} = usersApi;