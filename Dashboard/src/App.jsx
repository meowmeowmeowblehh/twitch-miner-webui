import { useEffect, useMemo, useState } from 'react'

export default function App() {
  const [miners, setMiners] = useState([])
  const [selectedMiner, setSelectedMiner] = useState(null)

  const [search, setSearch] = useState('')
  const [compactMode, setCompactMode] = useState(false)
  const [showOffline, setShowOffline] = useState(true)
  const [gridMode, setGridMode] = useState(false)

  const [refreshTick, setRefreshTick] = useState(0)

  const [editingMiner, setEditingMiner] = useState(null)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    fetch('http://localhost:4000/miners')
      .then((res) => res.json())
      .then((data) => {
        const savedNames = JSON.parse(
          localStorage.getItem('minerNames') || '{}'
        )

        const mapped = data.map((miner) => ({
          ...miner,
          url: `http://localhost:${miner.port}`,
          account: miner.name,
          customName:
            savedNames[miner.name] || miner.name
        }))

        setMiners(mapped)

        if (mapped.length > 0) {
          setSelectedMiner((prev) => {
            if (!prev) return mapped[0]

            return (
              mapped.find(
                (m) => m.id === prev.id
              ) || mapped[0]
            )
          })
        }
      })
      .catch(console.error)
  }, [refreshTick])

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick((v) => v + 1)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const filteredMiners = useMemo(() => {
    return miners.filter((miner) => {
      const matchesSearch =
        miner.customName
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        miner.account
          .toLowerCase()
          .includes(search.toLowerCase())

      const matchesOffline =
        showOffline || miner.status === 'running'

      return matchesSearch && matchesOffline
    })
  }, [miners, search, showOffline])

  const saveMinerName = () => {
    const updated = miners.map((m) =>
      m.id === editingMiner
        ? { ...m, customName: newName }
        : m
    )

    setMiners(updated)

    const map = {}
    updated.forEach((m) => {
      map[m.name] = m.customName
    })

    localStorage.setItem(
      'minerNames',
      JSON.stringify(map)
    )

    setSelectedMiner(
      updated.find(
        (m) => m.id === selectedMiner.id
      )
    )

    setEditingMiner(null)
    setNewName('')
  }

  if (!selectedMiner) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        Loading miners...
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-zinc-950 text-white overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-96 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-2xl font-bold">
            Miner Dashboard
          </h1>

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search..."
            className="w-full mt-4 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredMiners.map((miner) => (
            <button
              key={miner.id}
              onClick={() =>
                setSelectedMiner(miner)
              }
              className={`w-full text-left p-3 rounded-xl border ${
                selectedMiner.id === miner.id
                  ? 'bg-violet-600 border-violet-500'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <div className="font-semibold">
                {miner.customName}
              </div>
              <div className="text-xs text-zinc-400">
                {miner.status}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col">

        <div className="p-4 border-b border-zinc-800 flex justify-between">
          <div>
            <div className="text-xl font-bold">
              {selectedMiner.customName}
            </div>
            <div className="text-sm text-zinc-400">
              {selectedMiner.status}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingMiner(selectedMiner.id)
                setNewName(selectedMiner.customName)
              }}
              className="px-3 py-1 bg-blue-600 rounded"
            >
              Rename
            </button>

            <button
              onClick={() =>
                window.open(
                  selectedMiner.url,
                  '_blank'
                )
              }
              className="px-3 py-1 bg-violet-600 rounded"
            >
              Open
            </button>

            <button
              onClick={async () => {
                await fetch(
                  `http://localhost:4000/miners/${selectedMiner.name}/restart`,
                  { method: 'POST' }
                )
                setRefreshTick((v) => v + 1)
              }}
              className="px-3 py-1 bg-zinc-700 rounded"
            >
              Restart
            </button>

            <button
              onClick={async () => {
                await fetch(
                  `http://localhost:4000/miners/${selectedMiner.name}/stop`,
                  { method: 'POST' }
                )
                setRefreshTick((v) => v + 1)
              }}
              className="px-3 py-1 bg-red-600 rounded"
            >
              Stop
            </button>
          </div>
        </div>

        {/* VIEW */}
        <div className="flex-1 bg-black">
          <iframe
            src={selectedMiner.url}
            className="w-full h-full"
          />
        </div>

        {/* MODAL */}
        {editingMiner && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="bg-zinc-900 p-6 rounded-xl w-96">
              <div className="text-xl mb-3">
                Rename Miner
              </div>

              <input
                value={newName}
                onChange={(e) =>
                  setNewName(e.target.value)
                }
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() =>
                    setEditingMiner(null)
                  }
                  className="px-3 py-1 bg-zinc-700 rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={saveMinerName}
                  className="px-3 py-1 bg-violet-600 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}