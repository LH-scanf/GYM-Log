import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layout/app-layout'
import { ExerciseDetailsPage } from '../../features/exercises/exercise-details-page'
import { ExercisesPage } from '../../features/exercises/exercises-page'
import { NewExercisePage } from '../../features/exercises/new-exercise-page'
import { SettingsPage } from '../../features/settings/settings-page'
import { ExerciseStatisticsPage } from '../../features/statistics/exercise-statistics-page'
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
        element: <ExerciseStatisticsPage />,
      },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'exercises/new', element: <NewExercisePage /> },
      { path: 'exercises/:exerciseId', element: <ExerciseDetailsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
