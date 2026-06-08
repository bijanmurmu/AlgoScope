import React, { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
// import DPVisualizer from "./components/dynamicProgramming/DPVisualizer";

const HAS_CLERK = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
import AppLayout from './components/AppLayout'

// Lazy load pages for better performance
const Home = lazy(() =>
  import('./components/Home').then((module) => ({ default: module.Home }))
)
const SortingVisualizerPage = lazy(
  () => import('./components/sortingAlgo/VisualizerPage')
)
const VisualizerPage = lazy(() =>
  import('./components/searchAlgo/VisualizerPage').then((module) => ({
    default: module.VisualizerPage,
  }))
)

const MathTheory = lazy(() =>
  import('./components/MathTheory/MathSoloVisualizer').then((module) => ({
    default: module.MathSoloVisualizer,
  }))
)
const ShortestPathPage = lazy(() =>
  import('./components/shortestPathAlgo/ShortestPathPage').then((module) => ({
    default: module.ShortestPathPage,
  }))
)
const DSLayout = lazy(() =>
  import('./components/dataStructures/DSLayout').then((module) => ({
    default: module.DSLayout,
  }))
)
const ArrayVisualizerPage = lazy(
  () => import('./components/arraySearch/VisualizerPage')
)

const KadaneVisualizerPage = lazy(
  () => import('./components/kadaneAlgo/VisualizerPage')
)

const MooreVotingVisualizerPage = lazy(
  () => import('./components/mooreVotingAlgo/VisualizerPage')
)

const BacktrackingVisualizerPage = lazy(
  () => import('./components/backtrackingAlgo/VisualizerPage')
)
const StringAlgoVisualizerPage = lazy(
  () => import('./components/stringAlgo/VisualizerPage')
)

const DPVisualizerPage = lazy(
  () => import('./components/dynamicProgramming/DPVisualizer')
)
const DPOptimizationJourneyPage = lazy(
  () => import('./components/dynamicProgramming/DPOptimizationJourney') // Path to your main component
)
const PracticePage = lazy(() => import('./components/PracticePage'))
const AboutAlgoScope = lazy(() => import('./components/about/About'))
const Favorites = lazy(() => import('./components/Favorites'))
const NotFound = lazy(() => import('./components/PageNotFound'))
const ChallengePage = lazy(() => import('./components/challenge/ChallengePage'))
const OperatingSystemsPage = lazy(
  () => import('./components/operatingSystems/OperatingSystemsPage')
)

// Simple fallback for Suspense
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#020617]">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent shadow-[0_0_15px_rgba(6,182,212,0.4)]"></div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout showBackground={false}>
                <Home />
              </AppLayout>
            }
          />
          <Route
            path="/search"
            element={
              <AppLayout notesKey="algo-notes-search">
                <VisualizerPage />
              </AppLayout>
            }
          />
          <Route
            path="/math-theory"
            element={
              <AppLayout notesKey="algo-notes-math-theory">
                <MathTheory />
              </AppLayout>
            }
          />
          <Route
            path="/spath"
            element={
              <AppLayout notesKey="algo-notes-shortest-path">
                <ShortestPathPage />
              </AppLayout>
            }
          />
          <Route
            path="/practice"
            element={
              <AppLayout>
                {HAS_CLERK ? (
                  <>
                    <SignedIn>
                      <PracticePage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                ) : import.meta.env.DEV ? (
                  <PracticePage />
                ) : (
                  <Navigate to="/" replace />
                )}
              </AppLayout>
            }
          />
          <Route
            path="/about"
            element={
              <AppLayout>
                <AboutAlgoScope />
              </AppLayout>
            }
          />
          <Route
            path="/favorites"
            element={
              <AppLayout>
                <Favorites />
              </AppLayout>
            }
          />
          <Route
            path="/sort"
            element={
              <AppLayout notesKey="algo-notes-sorting">
                <SortingVisualizerPage />
              </AppLayout>
            }
          />
          <Route
            path="/ldssearch"
            element={
              <AppLayout notesKey="algo-notes-array-search">
                <ArrayVisualizerPage />
              </AppLayout>
            }
          />
          <Route
            path="/adt"
            element={
              <AppLayout>
                <DSLayout />
              </AppLayout>
            }
          />
          <Route
            path="/kadane"
            element={
              <AppLayout notesKey="algo-notes-kadane">
                <KadaneVisualizerPage />
              </AppLayout>
            }
          />
          <Route
            path="/moore-voting"
            element={
              <AppLayout notesKey="algo-notes-moore-voting">
                <MooreVotingVisualizerPage />
              </AppLayout>
            }
          />
          <Route
            path="/backtracking"
            element={
              <AppLayout notesKey="algo-notes-backtracking">
                <BacktrackingVisualizerPage />
              </AppLayout>
            }
          />
          <Route
            path="/dynamic-programming"
            element={
              <AppLayout notesKey="algo-notes-dynamic-programming">
                <DPVisualizerPage />
              </AppLayout>
            }
          />
          <Route
            path="/dp-journey"
            element={
              <AppLayout notesKey="algo-notes-dp-journey">
                <DPOptimizationJourneyPage />
              </AppLayout>
            }
          />
          <Route
            path="/challenge"
            element={
              <AppLayout>
                <ChallengePage />
              </AppLayout>
            }
          />
          <Route
            path="/string-algorithms"
            element={
              <AppLayout notesKey="algo-notes-string-algorithms">
                <StringAlgoVisualizerPage />
              </AppLayout>
            }
          />
          <Route
            path="/operating-systems"
            element={
              <AppLayout>
                <OperatingSystemsPage />
              </AppLayout>
            }
          />
          <Route
            path="*"
            element={
              <AppLayout>
                <NotFound />
              </AppLayout>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
