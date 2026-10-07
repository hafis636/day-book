import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useLazyConfirmUserQuery,
  useValidateOtpMutation,
} from '../../redux/services/users/usersApi'

const OtpLogin = ({ onBack }) => {
  const navigate = useNavigate()
  const [step, setStep] = useState('contact')
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState(Array(6).fill(''))
  const [confirmUser, { isFetching }] = useLazyConfirmUserQuery()
  const [validateOtp, { isLoading: isValidatingOtp }] = useValidateOtpMutation()
  const [contactError, setContactError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [isOtpValid, setIsOtpValid] = useState(false)
  const otpInputs = useRef([])
  const otpValidationInProgress = useRef(false)
  const normalizedContact = contact.trim()
  const isValidContact =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContact) ||
    /^\d{10}$/.test(normalizedContact)

  const handleGenerateOtp = async (event) => {
    event.preventDefault()
    if (!isValidContact || isFetching) return

    setContactError('')
    try {
      const result = await confirmUser(normalizedContact).unwrap()
      if (result.exists) {
        setStep('otp')
      } else {
        setContactError('No account found with this email or phone number.')
      }
    } catch (error) {
      setContactError(
        error?.data?.error || 'Unable to verify this email or phone. Please try again.'
      )
    }
  }

  const validateCompletedOtp = async (digits) => {
    if (
      digits.length !== 6 ||
      otpValidationInProgress.current ||
      isOtpValid
    ) {
      return
    }

    otpValidationInProgress.current = true
    setOtpError('')
    try {
      const result = await validateOtp({
        contact: normalizedContact,
        otp: digits,
      }).unwrap()
      if (result.valid) {
        setIsOtpValid(true)
        navigate('/dashboard', { replace: true, state: { otpValidated: true } })
      } else {
        setOtpError('Invalid or expired OTP. Please try again.')
      }
    } catch (error) {
      setOtpError(error?.data?.error || 'Unable to validate OTP. Please try again.')
    } finally {
      otpValidationInProgress.current = false
    }
  }

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const nextOtp = otp.map((currentDigit, currentIndex) =>
      currentIndex === index ? digit : currentDigit
    )
    setOtp(nextOtp)
    setOtpError('')
    validateCompletedOtp(nextOtp.join(''))
    if (digit && index < otpInputs.current.length - 1) {
      otpInputs.current[index + 1].focus()
    }
  }

  const handleOtpPaste = (event) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return

    event.preventDefault()
    const nextOtp = Array.from({ length: 6 }, (_, index) => digits[index] || '')
    setOtp(nextOtp)
    setOtpError('')
    validateCompletedOtp(nextOtp.join(''))
    otpInputs.current[Math.min(digits.length, 5)].focus()
  }

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1].focus()
    }
  }

  return (
    <>
      {step === 'contact' ? (
        <form className="space-y-4" onSubmit={handleGenerateOtp}>
          <div>
            <label
              htmlFor="contact"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Phone or email
            </label>
            <input
              id="contact"
              type="text"
              value={contact}
              onChange={(event) => {
                setContact(event.target.value)
                setContactError('')
              }}
              placeholder="Enter phone or email"
              autoComplete="email"
              required
              aria-invalid={Boolean(contactError)}
              aria-describedby={contactError ? 'contact-error' : undefined}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {contactError && (
            <p id="contact-error" className="text-sm text-red-600" role="alert">
              {contactError}
            </p>
          )}
          <button
            type="submit"
            disabled={!isValidContact || isFetching}
            className="w-full rounded-md bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isFetching ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Checking...
              </span>
            ) : (
              'Generate OTP'
            )}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-md border border-gray-300 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to login
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-sm text-gray-600">
            Enter the 6-digit OTP for {normalizedContact}.
          </p>
          <div>
            <label
              id="otp-label"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              6-digit OTP
            </label>
            <div className="mt-2 flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(input) => {
                    otpInputs.current[index] = input
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  aria-label={`OTP digit ${index + 1}`}
                  value={digit}
                  onChange={(event) => handleOtpChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  maxLength={1}
                  disabled={isValidatingOtp || isOtpValid}
                  className="h-12 w-10 rounded-md border border-gray-300 text-center text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ))}
            </div>
          </div>
          {isValidatingOtp && (
            <p className="text-center text-sm text-gray-600" role="status">
              Validating OTP...
            </p>
          )}
          {otpError && (
            <p className="text-center text-sm text-red-600" role="alert">
              {otpError}
            </p>
          )}
          {isOtpValid && (
            <p className="text-center text-sm text-green-600" role="status">
              OTP validated successfully.
            </p>
          )}
        </div>
      )}
    </>
  )
}

export default OtpLogin
