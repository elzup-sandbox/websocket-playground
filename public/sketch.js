const store = {
  socket: null,
  maskLayer: null,
}
const randRange = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min
const player = {
  id: null,
  x: randRange(0, 800),
  y: randRange(0, 800),
  bullets: [],
  hp: 10,
  moveCounter: 0,
}
const players = {}
const keys = {}

const fps = 20
const playerSpeed = 10
const bulletSpeed = 15

function setup() {
  createCanvas(800, 800)
  frameRate(fps)
  store.maskLayer = createGraphics(width, height)

  const host = location.origin.replace(/^http/, 'ws')
  const socket = new WebSocket(host + '/ws2')

  socket.onopen = () => {
    console.log('Connected to the server')
  }

  socket.onmessage = (event) => {
    let data = JSON.parse(event.data)
    if (data.type === 'id') {
      player.id = data.id
      return
    }
    if (data.id === player.id) return

    if (!players[data.id]) {
      players[data.id] = { ...data, bullets: [] }
    }
    if (data.type === 'move') {
      players[data.id].x = data.x
      players[data.id].y = data.y
    } else if (data.type === 'shoot') {
      players[data.id].bullets.push(data.bullet)
    } else if (data.type === 'hit') {
      if (data.hitId === player.id) {
        player.hp -= 1
      } else if (players[data.hitId]) {
        players[data.hitId].hp -= 1
      }
    }
  }

  socket.onclose = () => {
    console.log('Disconnected from the server')
  }
  store.socket = socket
}

function draw() {
  background(200)

  // Draw current player
  fill(0)
  rect(player.x, player.y, 50, 50)
  for (let bullet of player.bullets) {
    ellipse(bullet.x, bullet.y, 10, 10)
    bullet.x += bullet.vx
    bullet.y += bullet.vy
    checkBulletCollision(bullet)
  }
  player.bullets = player.bullets.filter(
    (bullet) =>
      bullet.x > 0 &&
      bullet.x < width &&
      bullet.y > 0 &&
      bullet.y < height &&
      bullet.hit === undefined
  )
  text(player.hp, player.x + 25, player.y + 60)

  // Draw other players
  for (let id in players) {
    let otherPlayer = players[id]
    fill(100)
    rect(otherPlayer.x, otherPlayer.y, 50, 50)
    for (let bullet of otherPlayer.bullets) {
      ellipse(bullet.x, bullet.y, 10, 10)
      bullet.x += bullet.vx
      bullet.y += bullet.vy
    }
    fill(255, 0, 0)
    textAlign(CENTER)
    text(otherPlayer.hp, otherPlayer.x + 25, otherPlayer.y + 60)
  }

  const moveKeys = [
    { key: 'left', dx: -5, dy: 0 },
    { key: 'right', dx: 5, dy: 0 },
    { key: 'up', dx: 0, dy: -5 },
    { key: 'down', dx: 0, dy: 5 },
  ]

  if (player.hp <= 0) {
    return
  }
  // Move player
  const control = { left: false, right: false, up: false, down: false }

  control.left = keyIsDown(LEFT_ARROW) || keys['a']
  control.right = keyIsDown(RIGHT_ARROW) || keys['d']
  control.up = keyIsDown(UP_ARROW) || keys['w']
  control.down = keyIsDown(DOWN_ARROW) || keys['s']

  const moves = moveKeys.reduce(
    (acc, { key, dx, dy }) => {
      if (!control[key]) return acc
      return { dx: acc.dx + dx, dy: acc.dy + dy }
    },
    { dx: 0, dy: 0 }
  )

  const normalizeXy = (x, y) => {
    const l = Math.sqrt(x * x + y * y)
    return l === 0 ? { x: 0, y: 0 } : { x: x / l, y: y / l }
  }

  if (moves.dx !== 0 || moves.dy !== 0) {
    const { x, y } = normalizeXy(moves.dx, moves.dy)
    player.x += x * playerSpeed
    player.y += y * playerSpeed
    player.moveCounter = Math.min(player.moveCounter + 1, 100)
    sendPlayerData('move')
  } else {
    player.moveCounter = Math.max(player.moveCounter - 1, 0)
  }
  drawVisibilityLayer()
}
function keyPressed() {
  keys[key] = true
}
function keyReleased() {
  keys[key] = false
}

function mousePressed() {
  if (player.hp === 0 || player.bullets.length >= 5) return
  let angle = atan2(mouseY - player.y, mouseX - player.x)
  let bullet = {
    x: player.x + 25,
    y: player.y + 25,
    vx: bulletSpeed * cos(angle),
    vy: bulletSpeed * sin(angle),
  }
  player.bullets.push(bullet)
  sendPlayerData('shoot', bullet)
}

function sendPlayerData(type, bullet) {
  let data = { type: type, x: player.x, y: player.y, hp: player.hp }
  if (type === 'shoot') {
    data.bullet = bullet
  }
  store.socket.send(JSON.stringify(data))
}

function checkBulletCollision(bullet) {
  for (let id in players) {
    let otherPlayer = players[id]
    if (
      otherPlayer.hp > 0 &&
      bullet.x > otherPlayer.x &&
      bullet.x < otherPlayer.x + 50 &&
      bullet.y > otherPlayer.y &&
      bullet.y < otherPlayer.y + 50
    ) {
      otherPlayer.hp -= 1
      bullet.hit = true
      store.socket.send(JSON.stringify({ type: 'hit', hitId: id }))
    }
  }
}

function drawVisibilityLayer() {
  let visibilityRadius = 150 - player.moveCounter - player.bullets.length * 10
  const { maskLayer } = store

  maskLayer.clear()

  maskLayer.fill(0) // Semi-transparent black
  maskLayer.rect(0, 0, width, height)

  maskLayer.erase()
  maskLayer.ellipse(
    player.x + 25,
    player.y + 25,
    visibilityRadius * 5.5,
    visibilityRadius * 5.5
  )
  for (let bullet of player.bullets) {
    maskLayer.ellipse(bullet.x, bullet.y, 100, 100)
  }
  maskLayer.noErase()
  image(maskLayer, 0, 0, width, height)
}
