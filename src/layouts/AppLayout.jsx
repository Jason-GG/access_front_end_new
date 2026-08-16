import { Outlet } from 'react-router-dom'
import { Footer } from '../components/common/Footer'
import { Navbar } from '../components/common/Navbar'

export function AppLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
