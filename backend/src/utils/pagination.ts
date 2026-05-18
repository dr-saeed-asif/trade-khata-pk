export const parsePagination = (query?: { page?: string; limit?: string }, defaultLimit = 10) => {
  const page = Math.max(1, Math.floor(Number(query?.page ?? '1')) || 1)
  const limit = Math.max(1, Math.min(100, Math.floor(Number(query?.limit ?? String(defaultLimit)) || defaultLimit)))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}
