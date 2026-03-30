export function logDeveloperError(scope: string, error: unknown) {
  if (!__DEV__) {
    return;
  }

  console.error(`[RoomXchange] ${scope}`, error);
}
