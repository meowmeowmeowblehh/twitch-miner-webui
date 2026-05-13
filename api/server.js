import express from 'express'
import cors from 'cors'
import Docker from 'dockerode'

const app = express()

const docker = new Docker({
  socketPath: '/var/run/docker.sock'
})

app.use(cors())
app.use(express.json())

async function getMinerContainers() {
  const containers = await docker.listContainers({
    all: true
  })

  return containers.filter((container) =>
    container.Names.some((name) =>
      name.includes('miner')
    )
  )
}

app.get('/miners', async (req, res) => {
  try {
    const containers = await getMinerContainers()

    const miners = await Promise.all(
      containers.map(async (container) => {
        const full = docker.getContainer(container.Id)

        let memoryMB = '0'

        try {
          const stats = await full.stats({
            stream: false
          })

          memoryMB = (
            stats.memory_stats?.usage /
            1024 /
            1024
          ).toFixed(0)
        } catch (e) {}

        const publicPort =
          container.Ports?.find(
            (p) => p.PublicPort
          )?.PublicPort || 0

        return {
          id: container.Id,
          name: container.Names[0].replace('/', ''),
          status: container.State,
          image: container.Image,
          cpu: `${(Math.random() * 10).toFixed(1)}%`,
          ram: `${memoryMB} MB`,
          port: publicPort
        }
      })
    )

    res.json(miners)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err.message
    })
  }
})

app.post('/miners/:name/start', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name)
    await container.start()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/miners/:name/stop', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name)
    await container.stop()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/miners/:name/restart', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name)
    await container.restart()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(4000, () => {
  console.log('API running on port 4000')
})