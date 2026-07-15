export const isFixtureReady = async (
  app: Pick<IAppOption, 'fixtureReady'> = getApp<IAppOption>(),
): Promise<boolean> => {
  try {
    await app.fixtureReady
    return true
  } catch {
    return false
  }
}
