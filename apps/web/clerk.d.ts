interface Window {
  Clerk?: {
    session?: { getToken(): Promise<string | null> }
    user?: { id: string }
  }
}
