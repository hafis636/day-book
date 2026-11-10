import { createElement } from 'react'
import ProjectProgressPageView from './ProjectProgressPageView'
import {
  useCreateProjectEventMutation,
} from '../../../../../redux/services/users/usersApi'

const EMPTY_EVENTS = []

const ProjectProgressPage = ({ project, projectId }) => {
  const [createProjectEvent] = useCreateProjectEventMutation()

  const saveProjectEvent = async (event) => {
    const result = await createProjectEvent({
      projectId,
      title: event.title,
      description: event.description,
      event_type: event.type,
      event_status: event.status,
      project_phase: event.phase,
      start_date: event.startDate,
      end_date: event.endDate || null,
      priority: event.priority,
      files: event.files,
    }).unwrap()
    return result.event
  }

  return createElement(ProjectProgressPageView, {
    project,
    transactions: [
      ...(Array.isArray(project?.payments) ? project.payments : []),
      ...(Array.isArray(project?.expenses) ? project.expenses : []),
    ],
    events: Array.isArray(project?.events) ? project.events : EMPTY_EVENTS,
    isLoadingTransactions: false,
    isTransactionsError: false,
    isEventsError: false,
    onSaveEvent: saveProjectEvent,
  })
}

export default ProjectProgressPage
