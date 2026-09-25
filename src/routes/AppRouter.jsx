import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { CommunityPage } from '../pages/CommunityPage/CommunityPage'
import { DonatePage } from '../pages/DonatePage/DonatePage'
import { FoxPlayPage } from '../pages/FoxPlayPage/FoxPlayPage'
import { HomePage } from '../pages/HomePage/HomePage'
import { LearnPage } from '../pages/LearnPage/LearnPage'
import { LoginPage } from '../pages/LoginPage/LoginPage'
import { NewsPage } from '../pages/NewsPage/NewsPage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { PlayPage } from '../pages/PlayPage/PlayPage'
import { SignupPage } from '../pages/SignupPage/SignupPage'
import { VerifyEmailPage } from '../pages/VerifyEmailPage/VerifyEmailPage'
import { ROUTES } from '../utils/constants'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.foxPlay} element={<FoxPlayPage />} />
        <Route path={ROUTES.learn} element={<LearnPage />} />
        <Route path={ROUTES.news} element={<NewsPage />} />
        <Route path={ROUTES.donate} element={<DonatePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.play} element={<PlayPage />} />
          <Route path={ROUTES.playRoom} element={<PlayPage />} />
          <Route path={ROUTES.community} element={<CommunityPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.signup} element={<SignupPage />} />
        <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />
      </Route>
    </Routes>
  )
}
