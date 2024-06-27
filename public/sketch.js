let socket
let player = { id: null, x: 400, y: 500, bullets: [], hp: 10 }
let players = {}

function setup() {
  createCanvas(800, 600)
  socket = new WebSocket('ws://localhost:3001/ws2')

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
  background(255)

  // Draw current player
  fill(0)
  rect(player.x, player.y, 50, 50)
  for (let bullet of player.bullets) {
    ellipse(bullet.x, bullet.y, 10, 10)
    bullet.y -= bullet.speed
    checkBulletCollision(bullet)
  }
  player.bullets = player.bullets.filter(
    (bullet) => bullet.y > 0 && bullet.hit === undefined
  )

  // Draw other players
  for (let id in players) {
    let otherPlayer = players[id]
    fill(100)
    rect(otherPlayer.x, otherPlayer.y, 50, 50)
    for (let bullet of otherPlayer.bullets) {
      ellipse(bullet.x, bullet.y, 10, 10)
      bullet.y -= bullet.speed
    }
    fill(255, 0, 0)
    textAlign(CENTER)
    text(otherPlayer.hp, otherPlayer.x + 25, otherPlayer.y + 60)
  }

  // Move player
  if (keyIsDown(LEFT_ARROW)) {
    player.x -= 5
    sendPlayerData('move')
  }
  if (keyIsDown(RIGHT_ARROW)) {
    player.x += 5
    sendPlayerData('move')
  }
  if (keyIsDown(UP_ARROW)) {
    player.y -= 5
    sendPlayerData('move')
  }
  if (keyIsDown(DOWN_ARROW)) {
    player.y += 5
    sendPlayerData('move')
  }
}

function keyPressed() {
  if (key === ' ') {
    let bullet = { x: player.x + 25, y: player.y, speed: 5 }
    player.bullets.push(bullet)
    sendPlayerData('shoot', bullet)
  }
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
