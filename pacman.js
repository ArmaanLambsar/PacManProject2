//board
let board;
const rowCount = 21;
const columnCount = 19;
const tileSize = 32;
const boardWidth = columnCount*tileSize;
const boardHeight = rowCount*tileSize;
let context;

let blueGhostImage;
let orangeGhostImage;
let pinkGhostImage;
let redGhostImage;
let pacmanUpImage;
let pacmanDownImage;
let pacmanLeftImage;
let pacmanRightImage;
let wallImage;

//X = wall, O = skip, P = pac man, ' ' = food
//Ghosts: b = blue, o = orange, p = pink, r = red
const tileMap = [
    "XXXXXXXXXXXXXXXXXXX",
    "X        X        X",
    "X XX XXX X XXX XX X",
    "X                 X",
    "X XX X XXXXX X XX X",
    "X    X       X    X",
    "XXXX XXXX XXXX XXXX",
    "OOOX X       X XOOO",
    "XXXX X XXrXX X XXXX",
    "O       bpo       O",
    "XXXX X XXXXX X XXXX",
    "OOOX X       X XOOO",
    "XXXX X XXXXX X XXXX",
    "X        X        X",
    "X XX XXX X XXX XX X",
    "X  X     P     X  X",
    "XX X X XXXXX X X XX",
    "X    X   X   X    X",
    "X XXXXXX X XXXXXX X",
    "X                 X",
    "XXXXXXXXXXXXXXXXXXX" 
];

const walls = new Set();
const foods = new Set();
const ghosts = new Set();
let pacman;

const directions = ['U', 'D', 'L', 'R']; //up down left right
let score = 0;
let lives = 3;
let gameOver = false;

window.onload = function() {
    startGame();
}

function startGame() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d"); //used for drawing on the board

    preloadImages().then((missing) => {
        loadMap();
        for (let ghost of ghosts.values()) {
            // If ghost has forced startSteps, it already has a starting direction.
            if (ghost.startSteps) continue;
            const newDirection = directions[Math.floor(Math.random()*4)];
            ghost.updateDirection(newDirection);
        }
        if (missing && missing.length > 0) {
            // show missing assets message on the canvas
            context.clearRect(0,0,board.width,board.height);
            context.fillStyle = 'white';
            context.font = '14px sans-serif';
            context.fillText('Warning: missing image assets, using fallbacks.', 10, 20);
            for (let i = 0; i < missing.length; i++) {
                context.fillText('- ' + missing[i], 10, 40 + i*18);
            }
            console.warn('Missing image assets:', missing);
        }
        update();
        document.addEventListener("keyup", movePacman);
    });
}

function loadImages() {
    wallImage = new Image();
    wallImage.src = "./wall.png";

    blueGhostImage = new Image();
    blueGhostImage.src = "./blueGhost.png";
    orangeGhostImage = new Image();
    orangeGhostImage.src = "./orangeGhost.png"
    pinkGhostImage = new Image()
    pinkGhostImage.src = "./pinkGhost.png";
    redGhostImage = new Image()
    redGhostImage.src = "./redGhost.png";

    pacmanUpImage = new Image();
    pacmanUpImage.src = "./pacmanUp.png";
    pacmanDownImage = new Image();
    pacmanDownImage.src = "./pacmanDown.png";
    pacmanLeftImage = new Image();
    pacmanLeftImage.src = "./pacmanLeft.png";
    pacmanRightImage = new Image();
    pacmanRightImage.src = "./pacmanRight.png";
}

function preloadImages() {
    loadImages();
    const imgs = [
        {img: wallImage, name: 'wall.png'},
        {img: blueGhostImage, name: 'blueGhost.png'},
        {img: orangeGhostImage, name: 'orangeGhost.png'},
        {img: pinkGhostImage, name: 'pinkGhost.png'},
        {img: redGhostImage, name: 'redGhost.png'},
        {img: pacmanUpImage, name: 'pacmanUp.png'},
        {img: pacmanDownImage, name: 'pacmanDown.png'},
        {img: pacmanLeftImage, name: 'pacmanLeft.png'},
        {img: pacmanRightImage, name: 'pacmanRight.png'}
    ];
    return new Promise((resolve) => {
        let remaining = imgs.length;
        const missing = [];
        if (remaining === 0) {
            resolve(missing);
            return;
        }
        for (let entry of imgs) {
            const img = entry.img;
            const name = entry.name;
            if (!img) {
                missing.push(name);
                remaining--;
                if (remaining === 0) resolve(missing);
                continue;
            }
            if (img.complete && img.naturalWidth !== 0) {
                remaining--;
                if (remaining === 0) resolve(missing);
                continue;
            }
            img.onload = () => {
                remaining--;
                if (remaining === 0) resolve(missing);
            };
            img.onerror = () => {
                // generate a simple fallback image as a data URL so the game can render
                missing.push(name);
                try {
                    const fallback = createFallbackDataURL(name, tileSize, tileSize);
                    // clear error handler to avoid loop
                    img.onerror = null;
                    img.onload = () => {
                        remaining--;
                        if (remaining === 0) resolve(missing);
                    };
                    img.src = fallback;
                } catch (e) {
                    remaining--;
                    if (remaining === 0) resolve(missing);
                }
            };
        }
    });
}

function createFallbackDataURL(name, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // choose color by name
    let color = 'gray';
    if (name.toLowerCase().includes('blue')) color = 'blue';
    else if (name.toLowerCase().includes('orange')) color = 'orange';
    else if (name.toLowerCase().includes('pink')) color = 'pink';
    else if (name.toLowerCase().includes('red')) color = 'red';
    else if (name.toLowerCase().includes('pacman')) color = 'yellow';
    else if (name.toLowerCase().includes('wall')) color = 'dimgray';

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'black';
    ctx.font = Math.floor(width/3) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = name.split('.')[0].charAt(0).toUpperCase();
    ctx.fillText(label, width/2, height/2 + 2);
    return canvas.toDataURL();
}

function loadMap() {
    walls.clear();
    foods.clear();
    ghosts.clear();

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
            const row = tileMap[r];
            const tileMapChar = row[c];

            const x = c*tileSize;
            const y = r*tileSize;

            if (tileMapChar == 'X') { //block wall
                const wall = new Block(wallImage, x, y, tileSize, tileSize);
                walls.add(wall);  
            }
            else if (tileMapChar == 'b') { //blue ghost
                const ghost = new Block(blueGhostImage, x, y, tileSize, tileSize);
                ghost.color = 'blue';
                ghost.direction = 'L';
                ghost.updateVelocity();
                ghost.roaming = false;
                ghost.startSteps = 8; // number of movement frames to force the initial left direction
                ghosts.add(ghost);
            }
            else if (tileMapChar == 'o') { //orange ghost
                const ghost = new Block(orangeGhostImage, x, y, tileSize, tileSize);
                ghost.color = 'orange';
                ghost.direction = 'R';
                ghost.updateVelocity();
                ghost.roaming = false;
                ghost.startSteps = 8; // force initial right movement for a few frames
                ghosts.add(ghost);
            }
            else if (tileMapChar == 'p') { //pink ghost
                const ghost = new Block(pinkGhostImage, x, y, tileSize, tileSize);
                ghost.color = 'pink';
                ghosts.add(ghost);
            }
            else if (tileMapChar == 'r') { //red ghost
                const ghost = new Block(redGhostImage, x, y, tileSize, tileSize);
                ghost.color = 'red';
                ghosts.add(ghost);
            }
            else if (tileMapChar == 'P') { //pacman
                pacman = new Block(pacmanRightImage, x, y, tileSize, tileSize);
            }
            else if (tileMapChar == ' ') { //empty is food
                const food = new Block(null, x + 14, y + 14, 4, 4);
                foods.add(food);
            }
        }
    }
}

function update() {
    if (gameOver) {
        return;
    }
    move();
    draw();
    setTimeout(update, 50); //1000/50 = 20 FPS
}

function draw() {
    context.clearRect(0, 0, board.width, board.height);
    // Defensive drawing: only draw if objects and images exist
    try {
        if (pacman) {
            if (pacman.image) {
                context.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);
            } else {
                // draw fallback pacman (yellow circle)
                context.fillStyle = 'yellow';
                context.beginPath();
                context.arc(pacman.x + pacman.width/2, pacman.y + pacman.height/2, pacman.width/2 - 2, 0, Math.PI*2);
                context.fill();
            }
        }
    } catch (e) {
        console.error('Error drawing pacman', e);
        context.fillStyle = 'white';
        context.fillText('Render error: see console', 10, 30);
        return;
    }
    for (let ghost of ghosts.values()) {
        if (ghost) {
            if (ghost.image) {
                try { context.drawImage(ghost.image, ghost.x, ghost.y, ghost.width, ghost.height); } catch(e) { }
            } else {
                // fallback ghost drawing
                const color = ghost.color || 'white';
                context.fillStyle = color;
                context.fillRect(ghost.x + 2, ghost.y + 2, ghost.width - 4, ghost.height - 4);
            }
        }
    }
    
    for (let wall of walls.values()) {
        context.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
    }

    context.fillStyle = "white";
    for (let food of foods.values()) {
        context.fillRect(food.x, food.y, food.width, food.height);
    }

    //score
    context.fillStyle = "white";
    context.font="14px sans-serif";
    if (gameOver) {
        context.fillText("Game Over: " + String(score), tileSize/2, tileSize/2);
    }
    else {
        context.fillText("x" + String(lives) + " " + String(score), tileSize/2, tileSize/2);
    }
}

function move() {
    pacman.x += pacman.velocityX;
    pacman.y += pacman.velocityY;

    //check wall collisions
    for (let wall of walls.values()) {
        if (collision(pacman, wall)) {
            pacman.x -= pacman.velocityX;
            pacman.y -= pacman.velocityY;
            break;
        }
    }

    //check ghosts collision
    for (let ghost of ghosts.values()) {
        if (collision(ghost, pacman)) {
            lives -= 1;
            if (lives == 0) {
                gameOver = true;
                return;
            }
            resetPositions();
        }

        // If ghost has forced startSteps, keep its initial direction for those frames
        if (ghost.startSteps && ghost.startSteps > 0) {
            const desired = (ghost.color === 'blue') ? 'L' : ((ghost.color === 'orange') ? 'R' : ghost.direction);
            if (desired && ghost.direction !== desired) {
                ghost.direction = desired;
                ghost.updateVelocity();
            }
        }

        // make sure ghosts don't stop moving if velocity falls to zero
        if (ghost.velocityX === 0 && ghost.velocityY === 0) {
            const newDirection = directions[Math.floor(Math.random()*4)];
            ghost.updateDirection(newDirection);
        }

        // start roaming immediately once initial forced movement is finished
        if ((!ghost.startSteps || ghost.startSteps <= 0) && !ghost.roaming) {
            ghost.roaming = true;
            const newDirection = directions[Math.floor(Math.random()*4)];
            ghost.updateDirection(newDirection);
            ghost.lastRoamChange = Date.now();
            ghost.roamInterval = 600 + Math.floor(Math.random()*900); // ms
        }

        // When roaming, occasionally pick a new random direction
        if (ghost.roaming) {
            if (!ghost.lastRoamChange) {
                ghost.lastRoamChange = Date.now();
                ghost.roamInterval = 600 + Math.floor(Math.random()*900);
            }
            if (Date.now() - ghost.lastRoamChange >= (ghost.roamInterval || 0)) {
                const newDirection = directions[Math.floor(Math.random()*4)];
                ghost.updateDirection(newDirection);
                ghost.lastRoamChange = Date.now();
                ghost.roamInterval = 400 + Math.floor(Math.random()*1000);
            }
        }

        // ensure velocity matches current direction before moving
        ghost.updateVelocity();
        ghost.x += ghost.velocityX;
        ghost.y += ghost.velocityY;
        // decrement forced startSteps after the ghost has moved
        if (ghost.startSteps && ghost.startSteps > 0) {
            ghost.startSteps--;
            if (ghost.startSteps <= 0) {
                // immediately begin roaming once startSteps are consumed
                ghost.roaming = true;
                ghost.lastRoamChange = Date.now();
                ghost.roamInterval = 500 + Math.floor(Math.random()*800);
            }
        }
        for (let wall of walls.values()) {
            if (collision(ghost, wall) || ghost.x <= 0 || ghost.x + ghost.width >= boardWidth) {
                ghost.x -= ghost.velocityX;
                ghost.y -= ghost.velocityY;
                const newDirection = directions[Math.floor(Math.random()*4)];
                ghost.updateDirection(newDirection);
            }
        }
    }

    //check food collision
    let foodEaten = null;
    for (let food of foods.values()) {
        if (collision(pacman, food)) {
            foodEaten = food;
            score += 10;
            break;
        }
    }
    foods.delete(foodEaten);

    //next level
    if (foods.size == 0) {
        loadMap();
        resetPositions();
    }
}

function movePacman(e) {
    if (gameOver) {
        loadMap();
        resetPositions();
        lives = 3;
        score = 0;
        gameOver = false;
        update(); //restart game loop
        return;
    }

    if (e.code == "ArrowUp" || e.code == "KeyW") {
        pacman.updateDirection('U');
    }
    else if (e.code == "ArrowDown" || e.code == "KeyS") {
        pacman.updateDirection('D');
    }
    else if (e.code == "ArrowLeft" || e.code == "KeyA") {
        pacman.updateDirection('L');
    }
    else if (e.code == "ArrowRight" || e.code == "KeyD") {
        pacman.updateDirection('R');
    }

    //update pacman images
    if (pacman.direction == 'U') {
        pacman.image = pacmanUpImage;
    }
    else if (pacman.direction == 'D') {
        pacman.image = pacmanDownImage;
    }
    else if (pacman.direction == 'L') {
        pacman.image = pacmanLeftImage;
    }
    else if (pacman.direction == 'R') {
        pacman.image = pacmanRightImage;
    }
    
}

function collision(a, b) {
    return a.x < b.x + b.width &&   //a's top left corner doesn't reach b's top right corner
           a.x + a.width > b.x &&   //a's top right corner passes b's top left corner
           a.y < b.y + b.height &&  //a's top left corner doesn't reach b's bottom left corner
           a.y + a.height > b.y;    //a's bottom left corner passes b's top left corner
}

function resetPositions() {
    pacman.reset();
    pacman.velocityX = 0;
    pacman.velocityY = 0;
    for (let ghost of ghosts.values()) {
        ghost.reset();
        if (ghost.color === 'blue') {
            ghost.direction = 'L';
            ghost.startSteps = 8;
            ghost.roaming = false;
            ghost.updateVelocity();
        } else if (ghost.color === 'orange') {
            ghost.direction = 'R';
            ghost.startSteps = 8;
            ghost.roaming = false;
            ghost.updateVelocity();
        } else {
            const newDirection = directions[Math.floor(Math.random()*4)];
            ghost.updateDirection(newDirection);
        }
    }
}

class Block {
    constructor(image, x, y, width, height) {
        this.image = image;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.startX = x;
        this.startY = y;

        this.direction = 'R';
        this.velocityX = 0;
        this.velocityY = 0;
    }

    updateDirection(direction) {
        const prevDirection = this.direction;
        this.direction = direction;
        this.updateVelocity();
        // Do not immediately move the block here — only update velocity.
        // Moving immediately can place the block inside a wall and revert
        // to the previous direction, which may cause some ghosts to become stuck.
        // Collision checks happen during the normal movement step in `move()`.
    }

    updateVelocity() {
        if (this.direction == 'U') {
            this.velocityX = 0;
            this.velocityY = -tileSize/4;
        }
        else if (this.direction == 'D') {
            this.velocityX = 0;
            this.velocityY = tileSize/4;
        }
        else if (this.direction == 'L') {
            this.velocityX = -tileSize/4;
            this.velocityY = 0;
        }
        else if (this.direction == 'R') {
            this.velocityX = tileSize/4;
            this.velocityY = 0;
        }
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
    }
};