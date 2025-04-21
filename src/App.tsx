import { useEffect, useState, useCallback } from 'react'
import { Canvas3D } from './scene/Canvas3D'
import { PlayerCloud, UserPlayerDots } from './scene/PlayerCloud'
import { NeighborLines } from './scene/NeighborLines'
import { CameraRig } from './scene/CameraRig'
import { Highlight } from './scene/Highlight'
import { HoverCard } from './ui/HoverCard'
import { FilterPanel } from './ui/FilterPanel'
import { PlayerDetail } from './ui/PlayerDetail'
import { AddPlayerForm } from './ui/AddPlayerForm'
import { SalaryResult } from './ui/SalaryResult'
import { loadData } from './data/loader'
import { buildFeatureMatrix, findKNN } from './data/knn'
import { featuresToCoords, buildUserFeatureVector } from './data/projection'
import { estimateSalary } from './data/salary'
import { usePlayersStore } from './store/usePlayersStore'
import { useSceneStore } from './store/useSceneStore'
import { useUserStore } from './store/useUserStore'
import type { ModelData, UserPlayer } from './data/types'

function LoadingOverlay({ error }: { error: string | null }) {
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 text-white">
      {error ? (
        <>
          <div className="text-red-400 text-xl mb-2">Failed to load</div>
          <p className="text-white/50 text-sm max-w-xs text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-orange-500 hover:bg-orange-400 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </>
      ) : (
        <>
          <div className="text-4xl mb-4 animate-bounce">🏀</div>
          <p className="text-lg font-semibold mb-1">Loading NBA Universe</p>
          <p className="text-white/40 text-sm">Fetching player data...</p>
        </>
      )}
    </div>
  )
}

function HoverCardWrapper() {
  const hoveredIdx = useSceneStore((s) => s.hoveredIdx)
  const allPlayers = usePlayersStore((s) => s.allPlayers)
  const player = hoveredIdx !== null ? (allPlayers[hoveredIdx] ?? null) : null
  return <HoverCard player={player} />
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [model, setModel] = useState<ModelData | null>(null)
  const [featureMatrix, setFeatureMatrix] = useState<number[][] | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [pendingUser, setPendingUser] = useState<UserPlayer | null>(null)
  const [showSalaryResult, setShowSalaryResult] = useState(false)

  const loadPlayers = usePlayersStore((s) => s.loadPlayers)
  const allPlayers = usePlayersStore((s) => s.allPlayers)
  const addUserPlayer = useUserStore((s) => s.addUserPlayer)

  useEffect(() => {
    loadData()
      .then(({ players, model: m }) => {
        loadPlayers(players)
        setModel(m)
        const matrix = buildFeatureMatrix(
          { ...players },
          m,
        )
        setFeatureMatrix(matrix)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      })
  }, [loadPlayers])

  const handleAddPlayer = useCallback(
    (
      partial: Omit<
        UserPlayer,
        'x' | 'y' | 'z' | 'neighbors' | 'expectedSalaryLow' | 'expectedSalaryHigh' | 'expectedSalaryMid' | 'createdAt'
      >,
    ) => {
      if (!model || !featureMatrix) return

      const features = buildUserFeatureVector(partial)
      const [x, y, z] = featuresToCoords(features, model)
      const neighborIndices = findKNN(features, allPlayers, featureMatrix, 10)
      const salary = estimateSalary(partial, features, model)

      const fullUser: UserPlayer = {
        ...partial,
        x,
        y,
        z,
        neighbors: neighborIndices,
        expectedSalaryLow: salary.low,
        expectedSalaryHigh: salary.high,
        expectedSalaryMid: salary.mid,
        createdAt: Date.now(),
      }

      addUserPlayer(fullUser)
      setPendingUser(fullUser)
      setShowAddForm(false)
      setShowSalaryResult(true)
    },
    [model, featureMatrix, allPlayers, addUserPlayer],
  )

  const nearestPlayerName =
    pendingUser && pendingUser.neighbors.length > 0
      ? (allPlayers[pendingUser.neighbors[0]]?.name ?? 'an NBA player')
      : 'an NBA player'

  if (isLoading || loadError) {
    return <LoadingOverlay error={loadError} />
  }

  return (
    <div className="relative w-screen h-screen bg-gray-950 overflow-hidden">
      {/* 3D Canvas */}
      <Canvas3D>
        <ambientLight intensity={0.6} />
        <CameraRig />
        <PlayerCloud />
        <UserPlayerDots />
        <NeighborLines />
        <Highlight />
        <HoverCardWrapper />
      </Canvas3D>

      {/* DOM overlays */}
      <FilterPanel />
      <PlayerDetail />

      {/* Add-yourself button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-400 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-lg z-40 transition-colors"
        title="Add yourself to the graph"
        aria-label="Add yourself to the graph"
      >
        +
      </button>

      {/* Modals */}
      {showAddForm && (
        <AddPlayerForm
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddPlayer}
        />
      )}
      {showSalaryResult && pendingUser && (
        <SalaryResult
          user={pendingUser}
          nearestPlayerName={nearestPlayerName}
          onClose={() => setShowSalaryResult(false)}
        />
      )}
    </div>
  )
}
