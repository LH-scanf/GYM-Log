import { Navigate, useParams } from 'react-router-dom'

export function LegacyExerciseStatisticsRedirect() {
  const { exerciseId } = useParams()
  return <Navigate replace to={`/exercises/${exerciseId ?? ''}`} />
}
