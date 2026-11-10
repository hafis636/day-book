import { createProjectEventBody } from '../redux/services/users/projectEventRequest'

test('uses JSON-compatible event fields when no attachments are selected', () => {
  const event = {
    title: 'Foundation inspection',
    event_type: 'INSPECTION',
    description: '',
    end_date: null,
    files: [],
  }

  expect(createProjectEventBody(event)).toEqual({
    title: 'Foundation inspection',
    event_type: 'INSPECTION',
    description: '',
    end_date: null,
  })
})

test('uses multipart event fields when attachments are selected', () => {
  const file = new File(['report'], 'inspection.pdf', { type: 'application/pdf' })
  const body = createProjectEventBody({
    title: 'Foundation inspection',
    event_type: 'INSPECTION',
    end_date: null,
    files: [file],
  })

  expect(body).toBeInstanceOf(FormData)
  expect(body.get('title')).toBe('Foundation inspection')
  expect(body.get('event_type')).toBe('INSPECTION')
  expect(body.get('end_date')).toBeNull()
  expect(body.get('files')).toBe(file)
})
