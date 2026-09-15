export function formatApplicationTitle(pageTitle: string): string {
  return pageTitle === 'GymLog' ? pageTitle : `${pageTitle} · GymLog`
}
