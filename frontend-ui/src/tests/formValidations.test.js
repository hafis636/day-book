import { validateProject, validateProjectImages } from '../pages/users/builders/forms/validations/projectValidation'
import { validateDocument } from '../pages/users/builders/forms/validations/documentValidation'
import { validateExpense } from '../pages/users/builders/forms/validations/expenseValidation'
import { validatePayment } from '../pages/users/builders/forms/validations/paymentValidation'
import { validateProjectEvent } from '../pages/users/builders/forms/validations/projectEventValidation'

test('validates required project fields and optional date values', () => {
  expect(
    validateProject({
      projectName: '   ',
      projectType: '',
      startDate: '2026-02-30',
    })
  ).toEqual({
    projectName: 'Enter a project name.',
    projectType: 'Select a project type.',
    startDate: 'Enter a valid date.',
  })

  expect(
    validateProject({
      projectName: 'Project',
      projectType: 'Residential House',
      startDate: '2026-02-28',
    })
  ).toEqual({})
})

test('validates project image type, size, and image count', () => {
  const unsupportedImage = new File(['text'], 'notes.txt', { type: 'text/plain' })
  expect(
    validateProjectImages({
      fieldName: 'otherImages',
      selectedFiles: [unsupportedImage],
      otherImageCount: 0,
    })
  ).toMatch(/not a supported image file/)

  const oversizedImage = {
    name: 'large.png',
    size: 5 * 1024 * 1024 + 1,
    type: 'image/png',
  }
  expect(
    validateProjectImages({
      fieldName: 'coverImage',
      selectedFiles: [oversizedImage],
      otherImageCount: 0,
    })
  ).toMatch(/5 MB per-file limit/)

  expect(
    validateProjectImages({
      fieldName: 'otherImages',
      selectedFiles: [{ name: 'image.png', size: 1, type: 'image/png' }],
      otherImageCount: 10,
    })
  ).toMatch(/maximum of 10 other images/)
})

test('validates document details, required uploads, and upload size', () => {
  expect(validateDocument({ title: 'Plan', category: 'Other' }, [], false)).toEqual({
    files: 'Select at least one file to upload.',
  })
  expect(
    validateDocument(
      { title: 'Plan', category: 'Other' },
      [{ name: 'large.pdf', size: 20 * 1024 * 1024 + 1 }],
      true
    )
  ).toEqual({ files: 'Each document file must be 20 MB or smaller.' })
  expect(validateDocument({ title: 'Plan', category: 'Other' }, [], true)).toEqual({})
})

test('validates payment details and does not require methods for due transactions', () => {
  expect(
    validatePayment({
      title: 'Materials',
      amount: '10.123',
      status: 'completed',
      payment_method: '',
      party_name: 'Supplier',
    })
  ).toEqual({
    amount: 'Enter an amount of at least 0.01 with no more than two decimal places.',
    payment_method: 'Select a payment method.',
  })

  expect(
    validatePayment({
      title: 'Materials',
      amount: '10.50',
      status: 'pending',
      payment_method: '',
      party_name: 'Supplier',
    })
  ).toEqual({})
  expect(
    validatePayment({
      title: 'Materials',
      amount: '10.000',
      status: 'pending',
      payment_method: '',
      party_name: 'Supplier',
    })
  ).toEqual({})
})

test('validates expense details through the expense validation entry point', () => {
  expect(
    validateExpense({
      title: '   ',
      amount: '0',
      status: 'completed',
      payment_method: '',
      party_name: '',
    })
  ).toEqual({
    title: 'Enter a title.',
    amount: 'Enter an amount of at least 0.01 with no more than two decimal places.',
    payment_method: 'Select a payment method.',
    party_name: 'Enter a party name.',
  })
})

test('validates project event fields and date boundaries', () => {
  expect(
    validateProjectEvent(
      {
        title: ' ',
        type: '',
        phase: '',
        startDate: '2026-02-28',
        endDate: '2026-02-27',
        status: '',
      },
      { minDate: '2026-03-01', maxDate: '2026-04-30' }
    )
  ).toEqual({
    title: 'Enter an event title.',
    type: 'Select an event type.',
    phase: 'Select a project phase.',
    status: 'Select an event status.',
    startDate: 'Start date must be on or after the project start date.',
    endDate: 'End date must be on or after the project start date.',
  })

  expect(
    validateProjectEvent({
      title: 'Foundation inspection',
      type: 'INSPECTION',
      phase: 'FOUNDATION',
      startDate: '2026-03-10',
      endDate: '2026-03-11',
      status: 'PLANNED',
    })
  ).toEqual({})
})
