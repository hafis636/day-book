import { useState } from "react";
import { Link } from "react-router-dom";
import { useRegisterUserMutation } from "../../redux/services/users/usersApi";

const initialValues = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
  role: "",
};

function Register() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState("");
  const [registerUser, { isLoading }] = useRegisterUserMutation();

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setSubmitted(false);
    setApiError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!values.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!values.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!values.mobile.trim()) {
      nextErrors.mobile = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(values.mobile.trim())) {
      nextErrors.mobile = "Enter a 10-digit mobile number.";
    }
    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/.test(values.password)) {
      nextErrors.password = "Use at least 8 characters with a letter, number, and special character.";
    }
    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!values.role) nextErrors.role = "Please select a role.";

    setErrors(nextErrors);
    setSubmitted(false);
    setApiError("");

    if (Object.keys(nextErrors).length === 0) {
      try {
        await registerUser({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          mobile: values.mobile.trim(),
          password: values.password,
          role: values.role,
        }).unwrap();
        setSubmitted(true);
        setValues(initialValues);
      } catch (error) {
        setApiError(error?.data?.error || "Registration failed. Please try again.");
      }
    }
  };

  const fieldClassName = (fieldName) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
      errors[fieldName]
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
        : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
    }`;

  const renderError = (fieldName) =>
    errors[fieldName] ? (
      <p className="mt-1 text-xs text-rose-600" role="alert">
        {errors[fieldName]}
      </p>
    ) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-10">
        <header className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Day Book
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your details to get started.</p>
        </header>

        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-700">
                First name <span className="text-rose-600">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={values.firstName}
                onChange={updateField}
                className={fieldClassName("firstName")}
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={errors.firstName ? "firstName-error" : undefined}
              />
              {errors.firstName && <p id="firstName-error" className="mt-1 text-xs text-rose-600" role="alert">{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-700">
                Last name <span className="text-rose-600">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={values.lastName}
                onChange={updateField}
                className={fieldClassName("lastName")}
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={errors.lastName ? "lastName-error" : undefined}
              />
              {errors.lastName && <p id="lastName-error" className="mt-1 text-xs text-rose-600" role="alert">{errors.lastName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email <span className="text-rose-600">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={updateField}
                className={fieldClassName("email")}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && <p id="email-error" className="mt-1 text-xs text-rose-600" role="alert">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium text-slate-700">
                Mobile number <span className="text-rose-600">*</span>
              </label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="10-digit number"
                value={values.mobile}
                onChange={updateField}
                className={fieldClassName("mobile")}
                aria-invalid={Boolean(errors.mobile)}
                aria-describedby={errors.mobile ? "mobile-error" : undefined}
              />
              {errors.mobile && <p id="mobile-error" className="mt-1 text-xs text-rose-600" role="alert">{errors.mobile}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password <span className="text-rose-600">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={updateField}
                className={fieldClassName("password")}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-hint password-error" : "password-hint"}
              />
              <p id="password-hint" className="mt-1 text-xs text-slate-500">
                At least 8 characters, including a letter, number, and special character.
              </p>
              {errors.password && <p id="password-error" className="mt-1 text-xs text-rose-600" role="alert">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirm password <span className="text-rose-600">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={values.confirmPassword}
                onChange={updateField}
                className={fieldClassName("confirmPassword")}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              />
              {errors.confirmPassword && <p id="confirmPassword-error" className="mt-1 text-xs text-rose-600" role="alert">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700">
              Role <span className="text-rose-600">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={values.role}
              onChange={updateField}
              className={fieldClassName("role")}
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? "role-error" : undefined}
            >
              <option value="">Select a role</option>
              <option value="admin">Admin</option>
              <option value="shop owner">Shop owner</option>
              <option value="editor">Editor</option>
            </select>
            {renderError("role")}
          </div>

          {apiError && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {apiError}
            </p>
          )}

          {submitted && (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
              Your account has been created successfully.
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Register;