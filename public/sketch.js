let socket
let player = { id: null, x: 400, y: 500, bullets: [], hp: 10 }
let players = {}
const keys = {}

function setup() {
  createCanvas(800, 600)
  const host = location.origin.replace(/^http/, 'ws')
  socket = new WebSocket(host + '/ws2')

  socket.onopen = () => {
    console.log('Connected to the server')
  }

  socket.onmessage = (event) => {
    let data = JSON.parse(event.data)
    if (data.id !== player.id) {
      if (!players[data.id]) {
        players[data.id] = { x: data.x, y: data.y, bullets: [], hp: data.hp }
      }
      if (data.type === 'move') {
        players[data.id].x = data.x
        players[data.id].y = data.y
      } else if (data.type === 'shoot') {
        players[data.id].bullets.push(data.bullet)
      }
    }
  }

  socket.onclose = () => {
    console.log('Disconnected from the server')
  }
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
    return l === 0 ? { x: 0, y: 0 } : { x: (x / l) * 2, y: (y / l) * 2 }
  }

  if (moves.dx !== 0 || moves.dy !== 0) {
    const { x, y } = normalizeXy(moves.dx, moves.dy)
    player.x += x
    player.y += y
    sendPlayerData('move')
  }
}
function keyPressed() {
  keys[key] = true
}
function keyReleased() {
  keys[key] = false
}

function mousePressed() {
  let angle = atan2(mouseY - player.y, mouseX - player.x)
  let bullet = {
    x: player.x + 25,
    y: player.y + 25,
    vx: 5 * cos(angle),
    vy: 5 * sin(angle),
  }
  player.bullets.push(bullet)
  sendPlayerData('shoot', bullet)
}

function sendPlayerData(type, bullet) {
  let data = { type: type, x: player.x, y: player.y, hp: player.hp }
  if (type === 'shoot') {
    data.bullet = bullet
  }
  socket.send(JSON.stringify(data))
}

function checkBulletCollision(bullet) {
  for (let id in players) {
    let otherPlayer = players[id]
    if (
      bullet.x > otherPlayer.x &&
      bullet.x < otherPlayer.x + 50 &&
      bullet.y > otherPlayer.y &&
      bullet.y < otherPlayer.y + 50
    ) {
      otherPlayer.hp -= 1
      bullet.hit = true
    }
  }
}
