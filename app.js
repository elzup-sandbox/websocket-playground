const express = require('express')
const expressWs = require('express-ws')

const app = express()
expressWs(app)

const port = process.env.PORT || 3001
let connects = []

app.use(express.static('public'))

app.ws('/ws', (ws, req) => {
  connects.push(ws)

  ws.on('message', (message) => {
    console.log('Received:', message)

    connects.forEach((socket) => {
      if (socket.readyState === 1) {
        // Check if the connection is open
        socket.send(message)
      }
    })
  })

  ws.on('close', () => {
    connects = connects.filter((conn) => conn !== ws)
  })
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})

let players = []

app.ws('/ws2', (ws, req) => {
  let player = { id: generateId(), ws: ws }
  players.push(player)
  req.ws.send(JSON.stringify({ type: 'id', id: player.id }))

  ws.on('message', (message) => {
    let data = JSON.parse(message)
    data.id = player.id
    players.forEach((p) => {
      if (p.ws !== ws) {
        p.ws.send(JSON.stringify(data))
      }
    })
  })

  ws.on('close', () => {
    players = players.filter((p) => p.ws !== ws)
  })
})

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}
