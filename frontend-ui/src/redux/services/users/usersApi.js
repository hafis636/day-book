import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const usersApi = createApi({
  reducerPath: "usersApi",
  tagTypes: ["Session"],
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    registerUser: builder.mutation({
      query: (user) => ({
        url: "/register",
        method: "POST",
        body: user,
      }),
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
  }),
});

export const {
  useRegisterUserMutation,
  useLazyConfirmUserQuery,
  useValidateOtpMutation,
  useGetCurrentSessionQuery,
  useLogoutMutation,
} = usersApi;