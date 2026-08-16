import { newsItems } from '../data/news'
import { fakeRequest } from './api'

// Front end only displays news — a backend cron/scheduled job is what
// actually posts new items. This mock plays the role of that API.
export function fetchNews() {
  return fakeRequest(newsItems)
}
