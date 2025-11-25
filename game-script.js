/**
 * CONFIGURACIÓN Y BASE DE DATOS EMBEBIDOS (SIN LLAMADAS A API EXTERNAS)
 */

// Datos de palabras incrustados directamente
const EMBEDDED_WORD_DATA = {
    "frecuentes": [
        {"text": "DIFICULTAD", "stress": "Aguda", "tilde": false},
        {"text": "EDUCACION", "stress": "Aguda", "tilde": true},
        {"text": "GRAVE", "stress": "Grave", "tilde": false},
        {"text": "CLASE", "stress": "Grave", "tilde": false},
        {"text": "ESDRUJULA", "stress": "Esdrújula", "tilde": true},
        {"text": "LIBRO", "stress": "Grave", "tilde": false},
        {"text": "CAPITAN", "stress": "Aguda", "tilde": true},
        {"text": "CUADRILATERO", "stress": "Esdrújula", "tilde": true},
        {"text": "RELOJ", "stress": "Aguda", "tilde": false},
        {"text": "ACENTUACION", "stress": "Aguda", "tilde": true},
        {"text": "CELULA", "stress": "Esdrújula", "tilde": true},
        {"text": "DETERMINACION", "stress": "Aguda", "tilde": true},
        {"text": "VENTANA", "stress": "Grave", "tilde": false},
        {"text": "REVOLVER", "stress": "Grave", "tilde": true},
        {"text": "CANTARO", "stress": "Esdrújula", "tilde": true},
        {"text": "COMUN", "stress": "Aguda", "tilde": true},
        {"text": "EXAMEN", "stress": "Grave", "tilde": false},
        {"text": "ARBOL", "stress": "Grave", "tilde": true},
        {"text": "MURCIELAGO", "stress": "Esdrújula", "tilde": true},
        {"text": "VELOZ", "stress": "Aguda", "tilde": false},
        {"text": "ESTADISTICAS", "stress": "Sobreesdrújula", "tilde": true},
        {"text": "CUENTAMELO", "stress": "Sobreesdrújula", "tilde": true},
        {"text": "COMPRAMELO", "stress": "Sobreesdrújula", "tilde": true},
        {"text": "DEBIL", "stress": "Grave", "tilde": true},
        {"text": "FUTBOL", "stress": "Grave", "tilde": true},
        {"text": "AZUCAR", "stress": "Grave", "tilde": true},
    ],
};

// Tipos de acentuación
const STRESS = {
    AGUDA: 'Aguda',
    GRAVE: 'Grave',
    ESDRUJULA: 'Esdrújula',
    SOBRE: 'Sobreesdrújula' // Actualizado para consistencia en la lista
};

// Lista de datos cargados
let rawWords = null;
const startButton = document.getElementById('start-button');

// Lista maestra final que contiene todas las palabras barajadas.
let masterWordList = [];

function loadWords() {
    // Usar datos incrustados
    rawWords = EMBEDDED_WORD_DATA; 
    startButton.textContent = 'INICIAR MISIÓN ESTÁNDAR';
    startButton.disabled = false;
}

// Llama a loadWords al iniciar la página
window.onload = loadWords;


/**
 * Prepara la lista de palabras para el juego (usando mapeo directo)
 */
function prepareWords() {
    if (!rawWords) {
        console.error("No hay palabras para preparar.");
        return;
    }
    
    masterWordList = [];
    const TARGET_COUNT = 50; 
    
    // 1. Mapear y estandarizar la data (sin usar constructor/clase)
    const allWords = rawWords.frecuentes.map(data => ({
        text: data.text.toUpperCase(),
        stressType: data.stress,
        hasTilde: data.tilde,
    }));

    // 2. Llenar la lista maestra hasta el conteo objetivo
    for(let i=0; i<TARGET_COUNT; i++) {
        // Usamos el módulo para reciclar las palabras si son menos de TARGET_COUNT
        masterWordList.push(allWords[i % allWords.length]);
    }
    
    // 3. Barajar (Fisher-Yates)
    for (let i = masterWordList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [masterWordList[i], masterWordList[j]] = [masterWordList[j], masterWordList[i]];
    }
}

/**
 * MOTOR DEL JUEGO
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajuste de tamaño del canvas para móviles
const updateCanvasSize = () => {
    const container = document.getElementById('game-container');
    const newWidth = container.clientWidth;
    // Mantenemos la relación 800:600 (4:3)
    const newHeight = (newWidth / 4) * 3; 
    canvas.width = newWidth;
    canvas.height = newHeight;
    // Asegurarse de que el jugador se centre de nuevo si está jugando
    if (gameState === 'PLAYING') {
            player.y = canvas.height - 50;
    }
};

window.addEventListener('resize', updateCanvasSize);
// Llamar al inicio para establecer el tamaño correcto
updateCanvasSize();


// Elementos UI
const scoreEl = document.getElementById('score-display');
const levelEl = document.getElementById('level-display');
const livesEl = document.getElementById('lives-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const winScreen = document.getElementById('win-screen');
const finalScoreEl = document.getElementById('final-score');
const winScoreEl = document.getElementById('win-score');

// Estado del juego
let gameLoopId;
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, WIN

let score = 0;
let lives = 5;
let level = 1;
let pointsForNextLevel = 75; 
let baseSpeed = 0.3;
let speedMultiplier = 1.0;

// Entidades
let player = { x: 0, y: 0, width: 40, height: 40, color: '#00d2ff' };
let bullets = [];
let activeWords = [];
let keysPressed = {};

// Mapeo de teclas a tipos de disparo
const KEY_MAP = {
    'KeyA': { type: STRESS.AGUDA, category: 'STRESS', color: '#ff5555' },
    'KeyS': { type: STRESS.GRAVE, category: 'STRESS', color: '#55ff55' },
    'KeyD': { type: STRESS.ESDRUJULA, category: 'STRESS', color: '#5555ff' },
    'KeyF': { type: STRESS.SOBRE, category: 'STRESS', color: '#ffff55' },
    'KeyZ': { type: true, category: 'TILDE', color: '#00ffff' }, // Con tilde
    'KeyX': { type: false, category: 'TILDE', color: '#ff00ff' }  // Sin tilde
};

/**
 * Lógica de Controles Táctiles/Virtuales
 */
function handleTouchAction(e) {
    e.preventDefault(); // Previene el zoom/scroll en touch
    
    const key = e.currentTarget.dataset.key;
    const action = e.currentTarget.dataset.action;
    
    if (e.type === 'touchstart' || e.type === 'mousedown') {
        if (action === 'shoot') {
            // Disparo instantáneo al tocar
            if (KEY_MAP[key]) shoot(KEY_MAP[key]);
        } else if (action === 'move') {
            keysPressed[key] = true;
        }
    } else if (e.type === 'touchend' || e.type === 'mouseup' || e.type === 'touchcancel') {
            if (action === 'move') {
            keysPressed[key] = false;
        }
    }
}

// Asignar listeners de ratón (para desktop/prueba de touch)
document.querySelectorAll('.touch-btn[data-action="move"]').forEach(btn => {
    btn.addEventListener('mousedown', handleTouchAction);
    btn.addEventListener('mouseup', handleTouchAction);
    btn.addEventListener('mouseleave', handleTouchAction); // Previene movimiento infinito
});


/**
 * Inicialización y control del juego
 */
function startGame() {
    prepareWords(); 
    
    gameState = 'PLAYING';
    score = 0;
    lives = 5;
    level = 1;
    baseSpeed = 0.3;
    speedMultiplier = 1.0;
    activeWords = [];
    bullets = [];
    keysPressed = {};

    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 50;

    // Ocultar pantallas de estado
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    winScreen.classList.add('hidden');

    updateHUD();

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(gameLoop);
    
    // Genera la primera palabra
    spawnWord();
}

function resetGame() {
    // Detiene el juego y vuelve al menú
    cancelAnimationFrame(gameLoopId);
    gameState = 'MENU';
    startScreen.classList.remove('hidden');
}

function gameOver() {
    gameState = 'GAMEOVER';
    cancelAnimationFrame(gameLoopId);
    
    finalScoreEl.textContent = `Puntaje Final: ${score}`;
    gameOverScreen.classList.remove('hidden');
}

function gameWin() {
    gameState = 'WIN';
    cancelAnimationFrame(gameLoopId);
    
    winScoreEl.textContent = `Puntaje Final: ${score}`;
    winScreen.classList.remove('hidden');
}

function updateHUD() {
    scoreEl.textContent = `Puntos: ${score}`;
    levelEl.textContent = `Nivel: ${level}`;
    livesEl.textContent = `Vidas: ${lives}`;
}

function checkLevelUp() {
    if (score >= pointsForNextLevel) {
        level++;
        speedMultiplier += 0.2; // Aumenta la velocidad
        pointsForNextLevel += level * 50; // Aumenta el requisito
        
        console.log(`¡Nivel ${level} alcanzado! Velocidad aumentada.`);
    }
}


/**
 * Gestión de Palabras
 */
function spawnWord() {
    if (masterWordList.length === 0) {
        gameWin();
        return;
    }
    
    // La palabra base que contiene text, stressType, hasTilde
    const wordBaseData = masterWordList.shift();
    
    ctx.font = '24px "Roboto Mono"'; // Necesario para la medición de texto
    const wordWidth = ctx.measureText(wordBaseData.text).width + 20;
    
    // Objeto de la palabra activa (contiene data base + estado de juego)
    const newWord = {
        data: wordBaseData,
        x: Math.random() * (canvas.width - wordWidth) + wordWidth / 2, // Posición horizontal aleatoria (centro)
        y: -50, // Comienza fuera del canvas
        width: wordWidth,
        height: 30, // Altura estándar para el texto
        hits: { stress: false, tilde: false }, // Balas que han impactado
        shield: 0, // 0 = no fallada, 1 = un error (necesita 2 hits)
    };
    
    activeWords.push(newWord);
}

function drawWord(word) {
    ctx.fillStyle = '#fff';
    ctx.font = '24px "Roboto Mono"';
    ctx.textAlign = 'center';
    
    // Dibujar recuadro si tiene escudo
    if (word.shield > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        // Usa las propiedades x/y como el centro para dibujar el rectángulo
        ctx.fillRect(word.x - word.width / 2, word.y - word.height / 2, word.width, word.height);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(word.x - word.width / 2, word.y - word.height / 2, word.width, word.height);
    }
    
    // Dibuja la palabra centrada
    ctx.fillStyle = '#fff'; 
    ctx.fillText(word.data.text, word.x, word.y + 8);

    // Muestra los tags de acierto debajo para claridad
    if (word.hits.stress) {
        ctx.fillStyle = KEY_MAP['KeyS'].color; // Color de ejemplo, verde
        ctx.font = '12px "Roboto Mono"';
        ctx.fillText(`[${word.data.stressType}]`, word.x, word.y + 25);
    }
    if (word.hits.tilde) {
        ctx.fillStyle = KEY_MAP['KeyZ'].color; // Color de ejemplo, cyan
        ctx.font = '12px "Roboto Mono"';
        ctx.fillText(`[${word.data.hasTilde ? 'TILDADA' : 'SIN TILDE'}]`, word.x, word.y + 40);
    }
}

function updateWords() {
    const currentSpeed = baseSpeed * speedMultiplier;
    
    for (let i = activeWords.length - 1; i >= 0; i--) {
        const word = activeWords[i];
        word.y += currentSpeed * (1 + level * 0.1); // Aumenta la velocidad por nivel
        
        // Si la palabra llega al final (pierde)
        if (word.y > canvas.height) {
            lives--;
            updateHUD();
            activeWords.splice(i, 1);
            
            if (lives <= 0) {
                gameOver();
                return;
            }
            
            // Generar una nueva palabra después de perder una
            spawnWord();
        }
        
        // Si la palabra está clasificada correctamente, la eliminamos y sumamos puntos
        if (word.hits.stress && word.hits.tilde) {
            score += 10;
            updateHUD();
            checkLevelUp();
            activeWords.splice(i, 1);
            spawnWord(); // Generar la siguiente
        }
    }
}


/**
 * Gestión del Jugador y Balas
 */
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Dibujar los cañones de color
    ctx.fillStyle = KEY_MAP['KeyD'].color; // Cañón de acentuación (Izquierdo)
    ctx.fillRect(player.x, player.y - 10, 5, 10);
    
    ctx.fillStyle = KEY_MAP['KeyZ'].color; // Cañón de tilde (Derecho)
    ctx.fillRect(player.x + player.width - 5, player.y - 10, 5, 10);
}

function updatePlayer() {
    const speed = 5;
    if (keysPressed['ArrowLeft'] && player.x > 0) {
        player.x -= speed;
    }
    if (keysPressed['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += speed;
    }
}

function shoot(bulletType) {
    // Previene disparar si el cañón ya está cargado con un tipo de bala
    if (bullets.some(b => b.category === bulletType.category)) {
        return; 
    }
    
    // Determina la posición de inicio basada en la categoría de la bala (Cañón izquierdo o derecho)
    let startX;
    if (bulletType.category === 'STRESS') { // Cañón de acentuación (Izquierdo)
        startX = player.x;
    } else { // Cañón de tilde (Derecho)
        startX = player.x + player.width - 5;
    }
    
    bullets.push({
        x: startX,
        y: player.y,
        width: 5,
        height: 15,
        color: bulletType.color,
        type: bulletType.type, // 'Aguda', 'Grave', etc. O true/false para tilde
        category: bulletType.category // 'STRESS' o 'TILDE'
    });
    
    // Un pequeño retraso para permitir el disparo de ambas categorías
    setTimeout(() => {
        // En un juego de disparos rápido, la bala debería eliminarse sola al impactar
    }, 100); 
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function updateBullets() {
    const bulletSpeed = 10;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bulletSpeed;
        
        // Eliminar bala si sale del canvas
        if (bullet.y < 0) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Detectar colisiones
        for (let j = activeWords.length - 1; j >= 0; j--) {
            const word = activeWords[j];
            
            // Colisión con la palabra
            if (bullet.x < word.x + word.width / 2 &&
                bullet.x + bullet.width > word.x - word.width / 2 &&
                bullet.y < word.y + word.height / 2 &&
                bullet.y + bullet.height > word.y - word.height / 2) 
            {
                handleCollision(bullet, word);
                bullets.splice(i, 1); // Eliminar bala
                break;
            }
        }
    }
}

/**
 * Lógica de Colisión
 */
function handleCollision(bullet, word) {
    let correct = false;
    
    if (bullet.category === 'STRESS') {
        if (bullet.type === word.data.stressType) {
            word.hits.stress = true;
            correct = true;
        }
    } else if (bullet.category === 'TILDE') {
        if (bullet.type === word.data.hasTilde) {
            word.hits.tilde = true;
            correct = true;
        }
    }
    
    if (!correct) {
        // Penalización por error
        if (word.shield === 0) {
            word.shield = 1; // Primer error: pone escudo (la palabra sigue cayendo)
        } else if (word.shield === 1) {
            word.shield = 2; // Segundo error: la palabra toma más daño (podría ser otra penalización)
        }
        lives = Math.max(0, lives - 1); // Pierde 1 vida por error de clasificación
        updateHUD();
        
        if (lives <= 0) {
            gameOver();
        }
    }
}


/**
 * Loop Principal del Juego
 */
function gameLoop() {
    if (gameState !== 'PLAYING') return;

    // 1. Limpiar Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Actualizar/Dibujar Entidades
    updatePlayer();
    updateBullets();
    updateWords();
    
    drawPlayer();
    drawBullets();
    
    activeWords.forEach(drawWord);

    // 3. Generar nueva palabra si la lista está vacía (o casi vacía)
    if (activeWords.length === 0 && masterWordList.length > 0) {
            spawnWord();
    } else if (activeWords.length === 0 && masterWordList.length === 0) {
        gameWin();
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}


// --- Manejo de Eventos de Teclado ---
document.addEventListener('keydown', (e) => {
    if (gameState !== 'PLAYING') return;
    
    // Movimiento
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keysPressed[e.key] = true;
    }

    // Disparo
    const key = e.code;
    if (KEY_MAP[key]) {
        e.preventDefault(); // Evita scroll con A/S/D/F
        shoot(KEY_MAP[key]);
    }
});

document.addEventListener('keyup', (e) => {
    if (gameState !== 'PLAYING') return;
    
    // Movimiento
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keysPressed[e.key] = false;
    }
});

// Exponer funciones al ámbito global para handlers inline en el HTML
// (si el script se carga con `type="module"` o similar, las
// funciones no quedan en `window` automáticamente).
window.startGame = startGame;
window.resetGame = resetGame;
window.gameOver = gameOver;
window.gameWin = gameWin;