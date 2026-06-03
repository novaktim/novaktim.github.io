
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

// Original constants from the Processing project.
// Adjust these if you want a less crowded 960x540 simulation.
const ASTEROID_SIZE = 90;
const PLAYER_SIZE = 25;
const MAX_SPEED = 5;
const ASTEROID_SPEED = 4;
const GEN_SIZE = 100;
const ASTEROID_COUNT = 15;
const FIGHTING_TOO_LONG_TIMER = 10000;

const MUTATION_RATE = 0.04;

let seed;
let playbackSpeed = 1;
let pop;
let skip = false;
let newAsteroids = false;
let running = false;
let hasStartedOnce = false;

function setup() {
  const canvas = createCanvas(GAME_WIDTH, GAME_HEIGHT);
  canvas.parent("sketch-holder");
  canvas.mouseOver(startSimulationOnce);

  frameRate(60);
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textFont("Arial");

  seed = floor(random(10000));
  randomSeed(seed);

  pop = new Populus(GEN_SIZE);

  setupButtons();

  // Match the Processing version: the simulation starts paused.
  noLoop();
  drawPausedScreen();
}

function startSimulationOnce() {
  if (hasStartedOnce) {
    return;
  }

  hasStartedOnce = true;
  running = true;
  loop();

  const button = document.getElementById("start-stop-button");
  if (button) {
    button.textContent = "Stop";
  }
}

function toggleSimulation() {
  running = !running;

  const button = document.getElementById("start-stop-button");

  if (running) {
    loop();
    button.textContent = "Stop";
  } else {
    noLoop();
    button.textContent = "Start";
  }
}

function draw() {
  background(0);

  const currGen = pop.gen;
  while (skip && currGen === pop.gen) {
    simulate();
  }

  //const steps = pow(2, playbackSpeed - 1);
  const steps = playbackSpeed;
  for (let i = 0; i < steps; i++) {
    simulate();
  }

  pop.show();

  fill(255);
  noStroke();
  textSize(22);
  text("Generation: " + pop.gen, width / 4, 50);
  text("Best: " + formatSeconds(pop.bestFitness / 60.0) + "s", (width / 4) * 3, 50);

  textSize(22);
  text("Speed: " + steps + "x", width / 2, height - 24);
}

function drawPausedScreen() {
  background(0);
  if (pop) {
    pop.show();
  }

  fill(255);
  noStroke();
  textSize(36);
  text("Press A or Start", width / 2, height / 2);

  textSize(20);
  text("Dodge Asteroids", width / 2, height / 2 - 48);
}

function simulate() {
  pop.update();
}

function setupButtons() {
  const startButton = document.getElementById("start-stop-button");
  const slowerButton = document.getElementById("slower-button");
  const fasterButton = document.getElementById("faster-button");
  const skipButton = document.getElementById("skip-button");
  const newAsteroidsButton = document.getElementById("new-asteroids-button");

  if (startButton) {
    startButton.addEventListener("click", toggleSimulation);
  }
  if (slowerButton) {
    slowerButton.addEventListener("click", slowDown);
  }
  if (fasterButton) {
    fasterButton.addEventListener("click", speedUp);
  }
  if (skipButton) {
    skipButton.addEventListener("click", toggleSkip);
  }
  if (newAsteroidsButton) {
    newAsteroidsButton.addEventListener("click", () => {
      newAsteroids = true;
    });
  }
}

function slowDown() {
  playbackSpeed--;
  if (playbackSpeed < 1) {
    playbackSpeed = 1;
  }
  console.log("Speed: " + playbackSpeed);
}

function speedUp() {
  playbackSpeed++;
  if (playbackSpeed >= 11) {
    playbackSpeed = 11;
  }
  console.log("Speed: " + playbackSpeed);
}

function toggleSkip() {
  skip = !skip;
  const skipButton = document.getElementById("skip-button");
  if (skipButton) {
    skipButton.textContent = "Skip generation: " + (skip ? "on" : "off");
  }
}

function formatSeconds(value) {
  return value.toFixed(2);
}

function isOut(pos) {
  return pos.x < -50 || pos.y < -50 || pos.x > width + 50 || pos.y > height + 50;
}

class Asteroid {
  constructor(posX, posY, velX, velY) {
    this.startingPos = createVector(posX, posY);
    this.pos = createVector(posX, posY);
    this.vel = createVector(velX, velY);
    this.vel.normalize().mult(ASTEROID_SPEED);
    this.radius = ASTEROID_SIZE;
  }

  show() {
    noStroke();
    fill(64);
    ellipse(this.pos.x, this.pos.y, this.radius, this.radius);
  }

  move() {
    this.pos.add(this.vel);
    if (isOut(this.pos)) {
      this.teleport();
    }
  }

  teleport() {
    if (this.pos.y < -50) {
      this.pos.y = height + 50;
    } else if (this.pos.y > height + 50) {
      this.pos.y = -50;
    }

    if (this.pos.x < -50) {
      this.pos.x = width + 50;
    } else if (this.pos.x > width + 50) {
      this.pos.x = -50;
    }
  }

  checkIfHitPlayer(player) {
    if (dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y) < (this.radius + player.radius) / 2) {
      player.hit();
    }
  }

  checkIfHit(asteroidPos) {
    return dist(this.pos.x, this.pos.y, asteroidPos.x, asteroidPos.y) < this.radius;
  }
}

class Player {
  constructor() {
    this.pos = createVector(width / 2, height / 2);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);

    this.fitness = 0;
    this.brain = new Brain(8 + 1, 16 + 1, 2);
    this.input = new Array(8).fill(0);
    this.output = new Array(2).fill(0);
    this.radius = PLAYER_SIZE;
    this.dead = false;
    this.lifespan = 0;
  }

  move() {
    if (!this.dead) {
      this.lifespan++;
      this.vel.add(this.acc);
      this.vel.limit(MAX_SPEED);
      this.pos.add(this.vel);

      if (isOut(this.pos)) {
        this.teleport();
      }
    }
  }

  teleport() {
    if (this.pos.y < -50) {
      this.pos.y = height + 50;
    } else if (this.pos.y > height + 50) {
      this.pos.y = -50;
    }

    if (this.pos.x < -50) {
      this.pos.x = width + 50;
    } else if (this.pos.x > width + 50) {
      this.pos.x = -50;
    }
  }

  show() {
    if (!this.dead) {
      noStroke();
      ellipse(this.pos.x, this.pos.y, this.radius, this.radius);
    }
  }

  clone() {
    const player = new Player();
    player.brain = this.brain.clone();
    return player;
  }

  calculateFitness() {
    this.fitness = this.lifespan;
  }

  hit() {
    this.dead = true;
  }
}

class Brain {
  constructor(input, hidden, output) {
    this.neurons = [];
    this.axons = [];
    this.BRAIN_LAYER_SIZES = [input, hidden, output];

    this.condenseLayerOne = true;
    this.drawWidth = 5;
    this.alpha = 0.2;
    this.confidence = 0.0;
    this.topOutput = 0;

    this.pos = createVector(0, 0);
    this.size = 100;
    this.hit = 0;
    this.finesse = 0;

    for (let x = 0; x < this.BRAIN_LAYER_SIZES.length; x++) {
      this.neurons[x] = new Array(this.BRAIN_LAYER_SIZES[x]);

      for (let y = 0; y < this.BRAIN_LAYER_SIZES[x]; y++) {
        if (y === this.BRAIN_LAYER_SIZES[x] - 1) {
          this.neurons[x][y] = 1;
        } else {
          this.neurons[x][y] = 0;
        }
      }

      if (x < this.BRAIN_LAYER_SIZES.length - 1) {
        this.axons[x] = [];

        for (let y = 0; y < this.BRAIN_LAYER_SIZES[x]; y++) {
          this.axons[x][y] = [];

          for (let z = 0; z < this.BRAIN_LAYER_SIZES[x + 1]; z++) {
            this.axons[x][y][z] = random(-1, 1);
          }
        }
      }
    }
  }

  output(inputs) {
    for (let i = 0; i < inputs.length; i++) {
      this.neurons[0][i] = inputs[i];
    }

    this.neurons[0][this.BRAIN_LAYER_SIZES[0] - 1] = 1;
    this.neurons[1][this.BRAIN_LAYER_SIZES[1] - 1] = 1;

    for (let x = 0; x < this.BRAIN_LAYER_SIZES.length; x++) {
      this.neurons[x][this.BRAIN_LAYER_SIZES[x] - 1] = 1.0;
    }

    // Input to hidden layer.
    for (let y = 0; y < this.BRAIN_LAYER_SIZES[1] - 1; y++) {
      let total = 0;

      for (let i = 0; i < this.BRAIN_LAYER_SIZES[0]; i++) {
        total += this.neurons[0][i] * this.axons[0][i][y];
      }

      this.neurons[1][y] = total;
    }

    // Hidden to output layer.
    for (let y = 0; y < this.BRAIN_LAYER_SIZES[2]; y++) {
      let total = 0;

      for (let i = 0; i < this.BRAIN_LAYER_SIZES[1]; i++) {
        total += this.neurons[1][i] * this.axons[1][i][y];
      }

      this.neurons[2][y] = total;
    }

    return this.neurons[2];
  }

  draw() {
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.size, this.size);

    fill(192);
    const shield = createVector(this.neurons[2][0], this.neurons[2][1]);
    if (shield.mag() > 0) {
      shield.normalize();
    }
    const rad = atan2(shield.y, shield.x) + TWO_PI;
    arc(this.pos.x, this.pos.y, 150, 150, rad - QUARTER_PI, rad + QUARTER_PI, CHORD);
  }

  clone() {
    const brain = new Brain(
      this.BRAIN_LAYER_SIZES[0],
      this.BRAIN_LAYER_SIZES[1],
      this.BRAIN_LAYER_SIZES[2]
    );

    for (let x = 0; x < this.axons.length; x++) {
      for (let y = 0; y < this.axons[x].length; y++) {
        for (let z = 0; z < this.axons[x][y].length; z++) {
          brain.axons[x][y][z] = this.axons[x][y][z];
        }
      }
    }

    return brain;
  }

  mutate() {
    for (let x = 0; x < this.axons.length; x++) {
      for (let y = 0; y < this.axons[x].length; y++) {
        for (let z = 0; z < this.axons[x][y].length; z++) {
          const randValue = random(1);

          if (randValue < MUTATION_RATE) {
            this.axons[x][y][z] = random(-1, 1);
          }

          this.axons[x][y][z] += randomGaussian() / 20;
          this.axons[x][y][z] = constrain(this.axons[x][y][z], -1, 1);
        }
      }
    }
  }
}

class Populus {
  constructor(size) {
    this.players = [];

    for (let i = 0; i < size; i++) {
      this.players[i] = new Player();
    }

    this.bestPlayerNo = 0;
    this.gen = 0;
    this.bestFitness = 0;
    this.asteroids = [];
    this.timer = 0;

    this.newAsteroids();
  }

  newAsteroids() {
    this.asteroids = [];
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      this.asteroids[i] = new Asteroid(random(width), random(height), random(-1, 1), random(-1, 1));

      while (
        dist(this.asteroids[i].pos.x, this.asteroids[i].pos.y, width / 2, height / 2) <
        ASTEROID_SIZE + PLAYER_SIZE + 200
      ) {
        this.asteroids[i] = new Asteroid(random(width), random(height), random(-1, 1), random(-1, 1));
      }
    }
  }

  update() {
    this.timer++;

    for (const a of this.asteroids) {
      a.move();
    }

    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].dead) {
        this.look(this.players[i]);
        this.think(this.players[i]);
        this.players[i].move();

        for (const a of this.asteroids) {
          a.checkIfHitPlayer(this.players[i]);
        }
      }
    }

    if (this.done()) {
      this.endFight();
    }

    if (this.timer >= FIGHTING_TOO_LONG_TIMER) {
      console.log("Fight was too long: " + this.gen);
      this.endFight();
    }
  }

  resetAsteroids() {
    for (const a of this.asteroids) {
      a.pos = a.startingPos.copy();
    }
  }

  endFight() {
    this.calculateFitness();
    this.setBestPlayer();
    this.naturalSelection();

    if (newAsteroids === true) {
      this.newAsteroids();
      newAsteroids = false;
    } else {
      this.resetAsteroids();
    }

    console.log("Gen " + this.gen + ": " + this.bestFitness);
    this.gen++;
    this.timer = 0;
  }

  show() {
    for (const a of this.asteroids) {
      a.show();
    }

    for (let i = 1; i < this.players.length; i++) {
      if (!this.players[i].dead) {
        fill(0, 0, 255);
        this.players[i].show();
      }
    }

    if (!this.players[0].dead) {
      fill(0, 255, 0);
      this.players[0].show();
    }
  }

  look(player) {
    player.input = new Array(8).fill(0);

    for (let i = 0; i < player.input.length; i++) {
      const direction = p5.Vector.fromAngle(i * (PI / 4));
      direction.mult(10);
      player.input[i] = this.lookInDirection(player.pos, direction);
    }
  }

  lookInDirection(source, direction) {
    const position = source.copy();
    position.add(direction);
    let distanceValue = 1;

    while (distanceValue < 100) {
      for (const a of this.asteroids) {
        if (a.checkIfHit(position)) {
          return 1 / distanceValue;
        }
      }

      position.add(direction);

      if (position.y < -50) {
        position.y += height + 50;
      } else if (position.y > height + 50) {
        // This preserves the original Processing behavior.
        position.y -= height - 50;
      }

      if (position.x < -50) {
        position.x += width + 50;
      } else if (position.x > width + 50) {
        position.x -= width + 50;
      }

      distanceValue++;
    }

    return 0;
  }

  think(player) {
    player.output = player.brain.output(player.input);
    player.acc = createVector(player.output[0], player.output[1]);

    if (player.acc.mag() > 0) {
      player.acc.normalize();
    }
  }

  done() {
    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].dead) {
        return false;
      }
    }

    return true;
  }

  calculateFitness() {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].calculateFitness();
    }
  }

  setBestPlayer() {
    let maxFitness = 0;
    let maxIndex = 0;

    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].fitness > maxFitness) {
        maxFitness = this.players[i].fitness;
        maxIndex = i;
      }
    }

    this.bestPlayerNo = maxIndex;
    this.bestFitness = maxFitness;
  }

  naturalSelection() {
    const newPlayers = [];
    newPlayers[0] = this.players[this.bestPlayerNo].clone();

    for (let i = 1; i < this.players.length; i++) {
      newPlayers[i] = this.selectPlayer().clone();
      newPlayers[i].brain.mutate();
    }

    this.players = newPlayers;
  }

  selectPlayer() {
    let fitnessSum = 0;

    for (let i = 0; i < this.players.length; i++) {
      fitnessSum += this.players[i].fitness;
    }

    if (fitnessSum <= 0) {
      return this.players[floor(random(this.players.length))];
    }

    const randValue = random(fitnessSum);
    let runningSum = 0;

    for (let i = 0; i < this.players.length; i++) {
      runningSum += this.players[i].fitness;

      if (runningSum >= randValue) {
        return this.players[i];
      }
    }

    return this.players[this.players.length - 1];
  }
}
