import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layout/app-layout'
import { ExerciseDetailsPage } from '../../features/exercises/exercise-details-page'
import { ExercisesPage } from '../../features/exercises/exercises-page'
import { NewExercisePage } from '../../features/exercises/new-exercise-page'
import { ExerciseFormPage } from '../../features/exercises/exercise-form-page'
import { LegacyExerciseStatisticsRedirect } from '../../features/exercises/legacy-exercise-statistics-redirect'
import { SettingsPage } from '../../features/settings/settings-page'
import { StatisticsPage } from '../../features/statistics/statistics-page'
import { WorkoutDetailsPage } from '../../features/workouts/workout-details-page'
import { WorkoutsPage } from '../../features/workouts/workouts-page'

export const appRouter = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <WorkoutsPage /> },
      { path: 'workouts/:sessionId', element: <WorkoutDetailsPage /> },
      { path: 'statistics', element: <StatisticsPage /> },
      {
        path: 'statistics/exercises/:exerciseId',
        element: <LegacyExerciseStatisticsRedirect />,
      },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'exercises/new', element: <NewExercisePage /> },
      { path: 'exercises/:exerciseId', element: <ExerciseDetailsPage /> },
      { path: 'exercises/:exerciseId/edit', element: <ExerciseFormPage mode="edit" /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
