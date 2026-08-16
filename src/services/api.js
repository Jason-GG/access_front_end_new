// Mock transport used by the service layer. Swap `fakeRequest` for real
// fetch/axios calls once a backend exists — the UI never talks to it directly.
const MOCK_DELAY_MS = 400

export function fakeRequest(payload) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY_MS)
  })
}

export function fakeReject(message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), MOCK_DELAY_MS)
  })
}
