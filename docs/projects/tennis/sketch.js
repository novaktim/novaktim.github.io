const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

const BALL_SIZE = 25;
const PLAYER_SIZE = 80;
const PLAYER_SPACING = 200;
const MAX_SPEED = 10;
const BALL_SPEED = 10;
const TEAM_SIZE = 10;
const BORDER = 100;
const FIGHTING_TOO_LONG_TIMER = 3000;

const INPUTS = 6;
const OUTPUTS = 3;
const MUTATION_RATE = 0.04;

// The original Processing sketch evaluated a full generation in one tight loop.
// In the browser, that can freeze the page. This chunks the hidden evaluation.
const BACKGROUND_UPDATES_PER_DRAW = 5000;

let seed = 2;
let playbackSpeed = 1;
let popul;
let running = false;

function setup() {

  const canvas = createCanvas(GAME_WIDTH, GAME_HEIGHT);
  canvas.parent("sketch-holder");

  frameRate(60);
  textAlign(CENTER, CENTER);
  textSize(32);
  textFont("Arial");

  randomSeed(seed);

  popul = new Populus(TEAM_SIZE);

  noLoop();
}

function draw() {
  background(0, 128, 50);

  const steps = Math.pow(2, playbackSpeed - 1);
  for (let i = 0; i < steps; i++) {
    simulate();
  }

  drawCourt();
  drawHud();

  if (popul.replay) {
    // Only show actual players and ball during the visible replay.
    popul.show();
  } else {
    // During hidden evaluation, show only progress, not the hidden match state.
    drawEvaluationScreen();
  }
}

function drawCourt() {
  fill(255, 119, 40);
  strokeWeight(10);
  stroke(255);

  rectMode(CORNER);
  rect(BORDER, BORDER, width - 2 * BORDER, height - 2 * BORDER);

  // Court lines.
  line(width / 2, BORDER, width / 2, height - BORDER);
  line(BORDER, height / 2, width - BORDER, height / 2);
  line((width / 2 + BORDER) / 2, BORDER, (width / 2 + BORDER) / 2, height - BORDER);
  line(width / 2 + (width / 2 - BORDER) / 2, BORDER, width / 2 + (width / 2 - BORDER) / 2, height - BORDER);

  // Net.
  rectMode(CENTER);
  fill(224);
  stroke(0);
  strokeWeight(4);
  rect(width / 2, height / 2, 28, height - 2 * BORDER + 50);
}

function drawHud() {
  fill(0);
  noStroke();
  textSize(27);

  text("Generation: " + popul.gen, width / 4, 40);

  const totalMatchups = TEAM_SIZE * TEAM_SIZE * TEAM_SIZE * TEAM_SIZE;
  const evaluated = popul.winsA + popul.winsB;
  const label = popul.replay ? "Replay" : "Evaluating";

  text(label + ": " + evaluated + " / " + totalMatchups, (width / 4) * 3, 30);
  text("A | B: " + popul.winsA + " | " + popul.winsB, (width / 4) * 3, 65);

  textSize(16);
  text("Speed: " + Math.pow(2, playbackSpeed - 1) + "x", width / 2, height - 22);
}

function drawEvaluationScreen() {
  const totalMatchups = TEAM_SIZE * TEAM_SIZE * TEAM_SIZE * TEAM_SIZE;
  const evaluated = popul.winsA + popul.winsB;
  const progress = evaluated / totalMatchups;

  noStroke();
  fill(0, 120);
  rectMode(CENTER);
  rect(width / 2, height / 2, 420, 110, 12);

  fill(255);
  textSize(24);
  text("Evaluating generation " + (popul.gen + 1), width / 2, height / 2 - 25);

  textSize(18);
  text(evaluated + " / " + totalMatchups + " points", width / 2, height / 2 + 5);

  // Progress bar.
  const barWidth = 300;
  const barHeight = 14;
  const barX = width / 2 - barWidth / 2;
  const barY = height / 2 + 35;

  fill(70);
  rectMode(CORNER);
  rect(barX, barY, barWidth, barHeight, 6);

  fill(255);
  rect(barX, barY, barWidth * progress, barHeight, 6);
}

function simulate() {
  popul.simulate();
}

function isOut(pos) {
  return pos.x < -50 || pos.y < -50 || pos.x > width + 50 || pos.y > height + 50;
}

function toggleSimulation() {
  running = !running;

  const button = document.getElementById("start-stop-button");

  if (running) {
    loop();
    if (button) button.textContent = "Stop";
  } else {
    noLoop();
    if (button) button.textContent = "Start";
  }
}

function speedDown() {
  playbackSpeed--;
  playbackSpeed = constrain(playbackSpeed, 1, 8);
}

function speedUp() {
  playbackSpeed++;
  playbackSpeed = constrain(playbackSpeed, 1, 8);
}

class Ball {
  constructor() {
    this.pos = createVector(width / 2, height / 2);
    this.vel = createVector(1, 0);
    this.radius = BALL_SIZE;
  }

  reset() {
    if (random(0, 1) < 0.5) {
      this.pos = createVector(width / 2 + 300, height / 2);
      this.vel = createVector(-1, 0).normalize();
    } else {
      this.pos = createVector(width / 2 - 300, height / 2);
      this.vel = createVector(1, 0).normalize();
    }
  }

  show() {
    stroke(0);

    const shadow = this.pos.copy().sub(this.vel.copy().mult(15));
    const size = 2000 / (abs(this.pos.x - width / 2) + 1000);

    fill(128);
    ellipse(shadow.x, shadow.y, size * this.radius, size * this.radius);

    fill(255, 255, 0);
    ellipse(this.pos.x, this.pos.y, size * this.radius, size * this.radius);
  }

  move() {
    const movement = this.vel.copy().mult(BALL_SPEED);
    this.pos.add(movement);
  }

  checkIfHitPlayer(player) {
    return dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y) < (this.radius + player.radius) / 2;
  }
}

class Brain {
  constructor(input, hidden, output) {
    this.BRAIN_LAYER_SIZES = [input, hidden, output];

    this.neurons = [];
    this.axons = [];

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

    for (let x = 0; x < this.BRAIN_LAYER_SIZES.length; x++) {
      this.neurons[x][this.BRAIN_LAYER_SIZES[x] - 1] = 1.0;
    }

    // Input to hidden.
    for (let y = 0; y < this.BRAIN_LAYER_SIZES[1] - 1; y++) {
      let total = 0;

      for (let i = 0; i < this.BRAIN_LAYER_SIZES[0]; i++) {
        total += this.neurons[0][i] * this.axons[0][i][y];
      }

      this.neurons[1][y] = total;
    }

    // Hidden to output.
    for (let y = 0; y < this.BRAIN_LAYER_SIZES[2]; y++) {
      let total = 0;

      for (let i = 0; i < this.BRAIN_LAYER_SIZES[1]; i++) {
        total += this.neurons[1][i] * this.axons[1][i][y];
      }

      this.neurons[2][y] = total;
    }

    return this.neurons[2];
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

class Player {
  constructor() {
    this.pos = createVector(0, 0);
    this.target = height / 2;
    this.targetVector = createVector(0, 0);

    this.fitness = 0;
    this.brain = new Brain(INPUTS + 1, 16 + 1, OUTPUTS);

    this.input = new Array(INPUTS).fill(0);
    this.output = new Array(OUTPUTS).fill(0);
    this.radius = PLAYER_SIZE;
  }

  show() {
    const rotation = this.targetVector.copy().sub(this.pos);
    if (rotation.mag() > 0) {
      rotation.normalize();
    } else {
      rotation.set(1, 0);
    }

    push();
    rectMode(CENTER);
    noStroke();
    fill(216, 203, 160);
    translate(this.pos.x - rotation.x * 0.6 * this.radius, this.pos.y - rotation.y * 0.6 * this.radius);
    rotate(rotation.heading());
    rect(0, 0, this.radius, 0.3 * this.radius, 20);
    pop();

    ellipse(this.pos.x, this.pos.y, this.radius, this.radius);

    push();
    noFill();
    translate(this.pos.x, this.pos.y);
    rotate(rotation.heading());
    rectMode(CENTER);
    rect(0, 0, this.radius, 0.4 * this.radius, 30);
    rect(0, 0, this.radius, 0.8 * this.radius, 100);
    rect(0, 0, this.radius, 0, 100);
    rotate(HALF_PI);
    rect(0, 0, this.radius, 0.4 * this.radius, 30);
    rect(0, 0, this.radius, 0.8 * this.radius, 100);
    rect(0, 0, this.radius, 0, 100);
    pop();
  }

  clone() {
    const player = new Player();
    player.brain = this.brain.clone();
    return player;
  }
}

class Populus {
  constructor(size) {
    this.playersA1 = [];
    this.playersA2 = [];
    this.playersB1 = [];
    this.playersB2 = [];

    for (let i = 0; i < size; i++) {
      this.playersA1[i] = new Player();
      this.playersA2[i] = new Player();
      this.playersB1[i] = new Player();
      this.playersB2[i] = new Player();
    }

    this.playerA1 = this.playersA1[0];
    this.playerA2 = this.playersA2[0];
    this.playerB1 = this.playersB1[0];
    this.playerB2 = this.playersB2[0];

    this.bestPlayerNoA1 = 0;
    this.bestPlayerNoA2 = 0;
    this.bestPlayerNoB1 = 0;
    this.bestPlayerNoB2 = 0;

    this.gen = 0;
    this.ball = new Ball();
    this.timer = 0;

    this.currentPlayerA1 = 0;
    this.currentPlayerA2 = 0;
    this.againstPlayerB1 = 0;
    this.againstPlayerB2 = 0;

    this.replay = false;
    this.winsA = 0;
    this.winsB = 0;

    this.beginMatch();
  }

  beginMatch() {
    this.timer = 0;
    this.ball.reset();

    this.playerA1.pos = createVector(width / 3, height / 4);
    this.playerA2.pos = createVector(width / 8, (height / 4) * 3);
    this.playerB1.pos = createVector((width * 2) / 3, height / 4);
    this.playerB2.pos = createVector((width / 8) * 7, (height / 4) * 3);
  }

  simulate() {
    if (!this.replay) {
      let updates = 0;

      while (!this.replay && updates < BACKGROUND_UPDATES_PER_DRAW) {
        this.update();
        updates++;
      }

      return;
    }

    this.update();
  }

  update() {
    this.timer++;
    this.ball.move();

    this.look(this.playerA1, this.playerA2);
    this.look(this.playerA2, this.playerA1);
    this.look(this.playerB1, this.playerB2);
    this.look(this.playerB2, this.playerB1);

    this.think(this.playerA1);
    this.think(this.playerA2);
    this.think(this.playerB1);
    this.think(this.playerB2);

    let x = constrain(this.playerA1.pos.x, 100, width / 2 - PLAYER_SPACING);
    this.playerA1.pos = createVector(x, this.playerA1.pos.y);

    x = constrain(this.playerA2.pos.x, 100, width / 2 - PLAYER_SPACING);
    this.playerA2.pos = createVector(x, this.playerA2.pos.y);

    x = constrain(this.playerB1.pos.x, width / 2 + PLAYER_SPACING, width - 100);
    this.playerB1.pos = createVector(x, this.playerB1.pos.y);

    x = constrain(this.playerB2.pos.x, width / 2 + PLAYER_SPACING, width - 100);
    this.playerB2.pos = createVector(x, this.playerB2.pos.y);

    if (isOut(this.ball.pos)) {
      if (!this.replay) {
        if (this.ball.pos.x < width / 2) {
          this.playerB1.fitness++;
          this.playerB2.fitness++;
          this.winsB++;
        } else {
          this.playerA1.fitness++;
          this.playerA2.fitness++;
          this.winsA++;
        }
      }

      this.endFight();
      return;
    }

    if (this.ball.checkIfHitPlayer(this.playerA1)) {
      this.playerA1.target += random(-1, 1) * height;
      this.playerA1.target = constrain(this.playerA1.target, 0, height);
      const dir = createVector(width, this.playerA1.target);
      this.ball.vel = dir.sub(this.ball.pos).normalize();
      this.ball.move();
    }

    if (this.ball.checkIfHitPlayer(this.playerA2)) {
      this.playerA2.target += random(-1, 1) * height;
      this.playerA2.target = constrain(this.playerA2.target, 0, height);
      const dir = createVector(width, this.playerA2.target);
      this.ball.vel = dir.sub(this.ball.pos).normalize();
      this.ball.move();
    }

    if (this.ball.checkIfHitPlayer(this.playerB1)) {
      this.playerB1.target += random(-1, 1) * height;
      this.playerB1.target = constrain(this.playerB1.target, 0, height);
      const dir = createVector(0, this.playerB1.target);
      this.ball.vel = dir.sub(this.ball.pos).normalize();
      this.ball.move();
    }

    if (this.ball.checkIfHitPlayer(this.playerB2)) {
      this.playerB2.target += random(-1, 1) * height;
      this.playerB2.target = constrain(this.playerB2.target, 0, height);
      const dir = createVector(0, this.playerB2.target);
      this.ball.vel = dir.sub(this.ball.pos).normalize();
      this.ball.move();
    }

    if (this.timer >= FIGHTING_TOO_LONG_TIMER) {
      console.log("Fight was too long: " + this.gen);
      this.endFight();
    }
  }

  endFight() {
    // Case 1: the visible replay point just ended.
    // Now start hidden evaluation of the next generation.
    if (this.replay === true) {
      this.replay = false;

      this.winsA = 0;
      this.winsB = 0;

      this.currentPlayerA1 = 0;
      this.currentPlayerA2 = 0;
      this.againstPlayerB1 = 0;
      this.againstPlayerB2 = 0;

      this.playerA1 = this.playersA1[this.currentPlayerA1];
      this.playerA2 = this.playersA2[this.currentPlayerA2];
      this.playerB1 = this.playersB1[this.againstPlayerB1];
      this.playerB2 = this.playersB2[this.againstPlayerB2];

      this.beginMatch();
      return;
    }

    // Case 2: hidden evaluation point ended.
    // Move to the next A1/A2/B1/B2 combination.
    let generationFinished = false;

    if (this.againstPlayerB1 < TEAM_SIZE - 1) {
      this.againstPlayerB1++;
    } else {
      this.againstPlayerB1 = 0;

      if (this.againstPlayerB2 < TEAM_SIZE - 1) {
        this.againstPlayerB2++;
      } else {
        this.againstPlayerB2 = 0;

        if (this.currentPlayerA1 < TEAM_SIZE - 1) {
          this.currentPlayerA1++;
        } else {
          this.currentPlayerA1 = 0;

          if (this.currentPlayerA2 < TEAM_SIZE - 1) {
            this.currentPlayerA2++;
          } else {
            generationFinished = true;
          }
        }
      }
    }

    // Case 3: full hidden generation finished.
    // Evolve the population, then start one visible replay.
    if (generationFinished) {
      this.calculateFitness();
      this.setBestPlayers();
      this.naturalSelection();

      console.log("Gen " + this.gen + ": " + this.winsA + " | " + this.winsB);

      this.gen++;

      this.currentPlayerA1 = 0;
      this.currentPlayerA2 = 0;
      this.againstPlayerB1 = 0;
      this.againstPlayerB2 = 0;

      // After naturalSelection(), index 0 is the elite of each role.
      this.playerA1 = this.playersA1[0];
      this.playerA2 = this.playersA2[0];
      this.playerB1 = this.playersB1[0];
      this.playerB2 = this.playersB2[0];

      this.replay = true;
      this.beginMatch();
      return;
    }

    // Case 4: generation not finished yet.
    // Continue hidden evaluation with the next matchup.
    this.playerA1 = this.playersA1[this.currentPlayerA1];
    this.playerA2 = this.playersA2[this.currentPlayerA2];
    this.playerB1 = this.playersB1[this.againstPlayerB1];
    this.playerB2 = this.playersB2[this.againstPlayerB2];

    this.beginMatch();
  }

  show() {
    this.playerA1.targetVector = createVector(width, this.playerA1.target);
    this.playerA2.targetVector = createVector(width, this.playerA2.target);
    this.playerB1.targetVector = createVector(0, this.playerB1.target);
    this.playerB2.targetVector = createVector(0, this.playerB2.target);

    stroke(255);
    strokeWeight(4);
    this.ball.show();

    fill(0, 100, 255);
    this.playerA1.show();
    this.playerA2.show();

    fill(255, 0, 0);
    this.playerB1.show();
    this.playerB2.show();
  }

  look(player, mate) {
    const input = new Array(INPUTS).fill(0);

    input[0] = this.ball.pos.x / width;
    input[1] = this.ball.pos.y / height;
    input[2] = this.ball.vel.x;
    input[3] = this.ball.vel.y;
    input[4] = (mate.pos.x - width / 2) / (width / 2);
    input[5] = (mate.pos.y - height / 2) / (height / 2);

    player.input = input;
  }

  think(player) {
    player.output = player.brain.output(player.input);

    const x = width / 2 + player.output[0] * width / 2;
    const y = height / 2 + player.output[1] * height / 2;

    const movement = createVector(constrain(x, 0, width), constrain(y, 0, height));
    player.pos.add(movement.sub(player.pos).limit(MAX_SPEED));

    player.target = height / 2 + player.output[2] * height / 2;
    player.target = constrain(player.target, 0, height);
  }

  calculateFitness() {
    for (let i = 0; i < TEAM_SIZE; i++) {
      this.playersA1[i].fitness = Math.pow(this.playersA1[i].fitness, 2);
      this.playersA2[i].fitness = Math.pow(this.playersA2[i].fitness, 2);
      this.playersB1[i].fitness = Math.pow(this.playersB1[i].fitness, 2);
      this.playersB2[i].fitness = Math.pow(this.playersB2[i].fitness, 2);
    }
  }

  setBestPlayers() {
    this.bestPlayerNoA1 = this.findBestPlayerIndex(this.playersA1);
    this.bestPlayerNoA2 = this.findBestPlayerIndex(this.playersA2);
    this.bestPlayerNoB1 = this.findBestPlayerIndex(this.playersB1);
    this.bestPlayerNoB2 = this.findBestPlayerIndex(this.playersB2);
  }

  findBestPlayerIndex(players) {
    let maxFitness = -Infinity;
    let maxIndex = 0;

    for (let i = 0; i < players.length; i++) {
      if (players[i].fitness > maxFitness) {
        maxFitness = players[i].fitness;
        maxIndex = i;
      }
    }

    return maxIndex;
  }

  naturalSelection() {
    this.playersA1 = this.evolvePopulation(this.playersA1, this.bestPlayerNoA1);
    this.playersA2 = this.evolvePopulation(this.playersA2, this.bestPlayerNoA2);
    this.playersB1 = this.evolvePopulation(this.playersB1, this.bestPlayerNoB1);
    this.playersB2 = this.evolvePopulation(this.playersB2, this.bestPlayerNoB2);
  }

  evolvePopulation(players, bestPlayerNo) {
    const newPlayers = [];

    newPlayers[0] = players[bestPlayerNo].clone();

    for (let i = 1; i < players.length; i++) {
      newPlayers[i] = this.selectPlayer(players).clone();
      newPlayers[i].brain.mutate();
    }

    // clone() creates fresh players with fitness = 0, but keep this explicit.
    for (let i = 0; i < newPlayers.length; i++) {
      newPlayers[i].fitness = 0;
    }

    return newPlayers;
  }

  selectPlayer(players) {
    let fitnessSum = 0;

    for (let i = 0; i < players.length; i++) {
      fitnessSum += players[i].fitness;
    }

    if (fitnessSum <= 0) {
      return players[floor(random(players.length))];
    }

    const randValue = random(fitnessSum);
    let runningSum = 0;

    for (let i = 0; i < players.length; i++) {
      runningSum += players[i].fitness;

      if (runningSum >= randValue) {
        return players[i];
      }
    }

    return players[players.length - 1];
  }
}
