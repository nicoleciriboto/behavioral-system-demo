import { useCallback } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import DashboardNav from '../components/DashboardNav'
import OnboardingScreen from './screens/OnboardingScreen'
import HomeScreen from './screens/HomeScreen'
import RecognizeScreen from './screens/RecognizeScreen'
import RecognitionWallScreen from './screens/RecognitionWallScreen'
import SubmissionStatusScreen from './screens/SubmissionStatusScreen'
import { isSeniorMgmt, isSuperAdmin, landingPath } from '../utils/landing'
import '../styles/Dashboard.css'

// URL <-> screen name map. Old rating routes are gone; the new flow is
// landing → home → recognize → (optional) wall for senior management, or the
// submission tracker for the super admin.
const SCREEN_TO_PATH = {
  onboarding: '/overview',
  home: '/home',
  recognize: '/recognize',
  wall: '/wall',
  submissions: '/submissions'
}
const PATH_TO_SCREEN = Object.fromEntries(
  Object.entries(SCREEN_TO_PATH).map(([screen, path]) => [path, screen])
)

export default function Dashboard({ userForm, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()

  const screen = PATH_TO_SCREEN[location.pathname] || 'onboarding'
  const setScreen = useCallback((name) => {
    navigate(SCREEN_TO_PATH[name] || '/home')
  }, [navigate])

  const me = {
    id: 'me',
    name: (userForm.name || '').trim() || 'Demo User',
    email: userForm.email,
    office: userForm.office,
    level: userForm.level || 'Staff'
  }

  const seniorMgmt = isSeniorMgmt(userForm)
  const superAdmin = isSuperAdmin(userForm)

  const screenProps = {
    screen,
    setScreen,
    me,
    seniorMgmt,
    superAdmin,
    logout: onLogout
  }

  return (
    <div className="dashboard">
      {['home', 'recognize', 'wall', 'submissions'].includes(screen) && (
        <DashboardNav {...screenProps} />
      )}

      <main className="dashboard-content">
        <Routes>
          <Route index element={<Navigate to={landingPath(userForm)} replace />} />
          <Route path="overview" element={<OnboardingScreen {...screenProps} />} />
          <Route path="home" element={<HomeScreen {...screenProps} />} />
          <Route path="recognize" element={<RecognizeScreen {...screenProps} />} />
          <Route
            path="wall"
            element={
              seniorMgmt
                ? <RecognitionWallScreen {...screenProps} />
                : <Navigate to="/home" replace />
            }
          />
          {/* Redirected to the landing path rather than /home, because a super
              admin who is not one is not a member who took a wrong turn — the
              server refuses the data either way, this only avoids the 403. */}
          <Route
            path="submissions"
            element={
              superAdmin
                ? <SubmissionStatusScreen {...screenProps} />
                : <Navigate to={landingPath(userForm)} replace />
            }
          />
          <Route path="*" element={<Navigate to={landingPath(userForm)} replace />} />
        </Routes>
      </main>
    </div>
  )
}
