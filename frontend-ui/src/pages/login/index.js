import React, { useState } from 'react'
import OtpLogin from './OtpLogin'

const Login = () => {
  const [showOtpLogin, setShowOtpLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const canSubmitLogin = Boolean(username.trim() && password)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Logo" className="mx-auto h-16 w-16" />
          <h1 className="mt-3 text-2xl font-bold text-gray-800">
            {showOtpLogin ? 'Login with OTP' : 'Login'}
          </h1>
        </div>

        {showOtpLogin ? (
          <OtpLogin onBack={() => setShowOtpLogin(false)} />
        ) : (
          <>
            <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
              <div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter username"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmitLogin}
                className="w-full rounded-md bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Login
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowOtpLogin(true)}
              className="mt-3 w-full rounded-md border border-blue-600 py-2 font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Login with OTP
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Login
