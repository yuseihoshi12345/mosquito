const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');

// ハイスコアの初期化
let highScore = localStorage.getItem('mosquitoHighScore') || 0;
highScore = parseInt(highScore);

// キャンバスのサイズ設定
function resizeCanvas() {
    canvas.width = 400; // 横幅を固定
    canvas.height = 600; // 縦幅を600pxに固定
}

// 初期サイズを設定
resizeCanvas();

// ウィンドウサイズが変更されたときにキャンバスサイズを更新
window.addEventListener('resize', () => {
    resizeCanvas();
});

// ゲーム設定
const gravity = 0.25;
const jumpForce = -7;
const pipeGap = 150;
const pipeWidth = 50;
const pipeSpawnInterval = 2000;
const pipeSpeed = 1.5;

// ゲーム状態
let isGameStarted = false;
let isTitleScreen = true;
let pipeGeneratorInterval = null;
let titleAnimationTime = 0; // タイトルアニメーション用のタイマー

// 鳥のオブジェクト
const bird = {
    x: 100,
    y: canvas.height / 2,
    velocity: 0,
    size: 20, // 絵文字のサイズ
    rotation: 0, // 回転角度
    draw() {
        ctx.save();
        
        // タイトル画面では蚊を中央に表示
        if (isTitleScreen) {
            this.y = canvas.height * 0.4; // 画面の上部40%の位置に表示
        }
        
        // 移動方向に応じて回転角度を計算
        this.rotation = this.velocity * 0.1;
        if (this.rotation > Math.PI / 4) this.rotation = Math.PI / 4;
        if (this.rotation < -Math.PI / 4) this.rotation = -Math.PI / 4;

        // 蚊の絵文字を描画（左右反転）
        ctx.translate(this.x, this.y);
        ctx.scale(-1, 1); // 左右反転
        ctx.rotate(this.rotation);
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦟', 0, 0);
        
        ctx.restore();
    },
    update() {
        if (!isGameStarted) return;
        this.velocity += gravity;
        this.y += this.velocity;
    },
    jump() {
        if (isTitleScreen) {
            isTitleScreen = false;
            return;
        }
        if (!isGameStarted) {
            startGame();
            this.velocity = jumpForce;
            return;
        }
        this.velocity = jumpForce;
    }
};

// パイプの配列
let pipes = [];
let score = 0;
let gameOver = false;
let animationId;

// パイプを生成する関数
function createPipe() {
    const gapPosition = Math.random() * (canvas.height - pipeGap - 100) + 50;
    pipes.push({
        x: canvas.width,
        topHeight: gapPosition,
        bottomY: gapPosition + pipeGap,
        scored: false
    });
}

// パイプを描画
function drawPipe(x, topHeight, bottomY) {
    const pipeBodyColor = '#2E8B57';
    const pipeBorderColor = '#1B5233';
    const pipeHighlightColor = '#3CB371';
    const pipeShadowColor = '#1a472a';
    
    // 上部パイプ
    // メインボディ
    ctx.fillStyle = pipeBodyColor;
    ctx.fillRect(x, 0, pipeWidth, topHeight);
    
    // 右側の影
    ctx.fillStyle = pipeShadowColor;
    ctx.fillRect(x + pipeWidth - 5, 0, 5, topHeight);
    
    // 左側のハイライト
    ctx.fillStyle = pipeHighlightColor;
    ctx.fillRect(x, 0, 3, topHeight);
    
    // パイプの先端（上部）
    const lipSize = 8; // 先端の出っ張りサイズ
    ctx.fillStyle = pipeBodyColor;
    ctx.fillRect(x - lipSize, topHeight - 20, pipeWidth + lipSize * 2, 20);
    
    // 先端の影とハイライト
    ctx.fillStyle = pipeShadowColor;
    ctx.fillRect(x + pipeWidth - 5, topHeight - 20, 5, 20);
    ctx.fillRect(x - lipSize, topHeight - 5, pipeWidth + lipSize * 2, 5);
    ctx.fillStyle = pipeHighlightColor;
    ctx.fillRect(x - lipSize, topHeight - 20, 3, 20);
    
    // 下部パイプ
    // メインボディ
    ctx.fillStyle = pipeBodyColor;
    ctx.fillRect(x, bottomY, pipeWidth, canvas.height - bottomY);
    
    // 右側の影
    ctx.fillStyle = pipeShadowColor;
    ctx.fillRect(x + pipeWidth - 5, bottomY, 5, canvas.height - bottomY);
    
    // 左側のハイライト
    ctx.fillStyle = pipeHighlightColor;
    ctx.fillRect(x, bottomY, 3, canvas.height - bottomY);
    
    // パイプの先端（下部）
    ctx.fillStyle = pipeBodyColor;
    ctx.fillRect(x - lipSize, bottomY, pipeWidth + lipSize * 2, 20);
    
    // 先端の影とハイライト
    ctx.fillStyle = pipeShadowColor;
    ctx.fillRect(x + pipeWidth - 5, bottomY, 5, 20);
    ctx.fillRect(x - lipSize, bottomY + 15, pipeWidth + lipSize * 2, 5);
    ctx.fillStyle = pipeHighlightColor;
    ctx.fillRect(x - lipSize, bottomY, 3, 20);
    
    // パイプの輪郭線
    ctx.strokeStyle = pipeBorderColor;
    ctx.lineWidth = 1;
    
    // 上部パイプの輪郭
    ctx.strokeRect(x, 0, pipeWidth, topHeight);
    ctx.strokeRect(x - lipSize, topHeight - 20, pipeWidth + lipSize * 2, 20);
    
    // 下部パイプの輪郭
    ctx.strokeRect(x, bottomY, pipeWidth, canvas.height - bottomY);
    ctx.strokeRect(x - lipSize, bottomY, pipeWidth + lipSize * 2, 20);
    
    // 装飾的な溝（上部）
    for (let i = 30; i < topHeight - 30; i += 30) {
        ctx.fillStyle = pipeShadowColor;
        ctx.fillRect(x + 10, i, pipeWidth - 20, 2);
        ctx.fillStyle = pipeHighlightColor;
        ctx.fillRect(x + 10, i + 2, pipeWidth - 20, 1);
    }
    
    // 装飾的な溝（下部）
    for (let i = bottomY + 30; i < canvas.height - 30; i += 30) {
        ctx.fillStyle = pipeShadowColor;
        ctx.fillRect(x + 10, i, pipeWidth - 20, 2);
        ctx.fillStyle = pipeHighlightColor;
        ctx.fillRect(x + 10, i + 2, pipeWidth - 20, 1);
    }
}

// タイトル画面の描画
function drawTitle() {
    titleAnimationTime += 0.016; // 約60FPSで1秒あたり1増加

    // 背景のグラデーション
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // キラキラエフェクト
    for (let i = 0; i < 20; i++) {
        const x = Math.sin(titleAnimationTime * 2 + i) * canvas.width/2 + canvas.width/2;
        const y = Math.cos(titleAnimationTime * 3 + i) * canvas.height/3 + canvas.height/2;
        const size = Math.sin(titleAnimationTime * 4 + i) * 2 + 3;
        
        ctx.fillStyle = `rgba(255, 255, ${Math.sin(titleAnimationTime + i) * 128 + 127}, 0.6)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // 装飾的な背景の光の輪
    for (let i = 0; i < 5; i++) {
        const radius = 100 + i * 20 + Math.sin(titleAnimationTime * 2) * 10;
        ctx.fillStyle = `rgba(255, 215, 0, ${0.1 - i * 0.02})`;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height * 0.3, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // タイトルの外側のグロー（パルス効果）
    const glowIntensity = Math.sin(titleAnimationTime * 3) * 10 + 20;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = glowIntensity;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    
    // タイトルテキストに波打ち効果を追加
    const letters = 'MOSQUITO'.split('');
    letters.forEach((letter, i) => {
        const x = canvas.width/2 - (letters.length * 20)/2 + i * 20;
        const y = canvas.height * 0.3 + Math.sin(titleAnimationTime * 4 + i * 0.5) * 5;
        ctx.fillText(letter, x, y);
    });

    // タイトルの内側の影
    ctx.shadowColor = 'rgba(139, 69, 19, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#FFA500';
    letters.forEach((letter, i) => {
        const x = canvas.width/2 - (letters.length * 20)/2 + i * 20;
        const y = canvas.height * 0.3 + Math.sin(titleAnimationTime * 4 + i * 0.5) * 5;
        ctx.fillText(letter, x, y);
    });

    // タイトルの輪郭
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    letters.forEach((letter, i) => {
        const x = canvas.width/2 - (letters.length * 20)/2 + i * 20;
        const y = canvas.height * 0.3 + Math.sin(titleAnimationTime * 4 + i * 0.5) * 5;
        ctx.strokeText(letter, x, y);
    });

    // 装飾的な線（波打ち効果）
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    
    ctx.moveTo(canvas.width * 0.2, canvas.height * 0.4);
    for (let x = canvas.width * 0.2; x <= canvas.width * 0.8; x++) {
        const y = canvas.height * 0.4 + Math.sin((x + titleAnimationTime * 100) * 0.05) * 5;
        ctx.lineTo(x, y);
    }
    ctx.stroke();

    // サブテキストのグロー効果（点滅）
    const subTextOpacity = Math.sin(titleAnimationTime * 4) * 0.3 + 0.7;
    ctx.shadowColor = `rgba(255, 215, 0, ${subTextOpacity * 0.3})`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(255, 215, 0, ${subTextOpacity})`;
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE or CLICK', canvas.width / 2, canvas.height * 0.7);

    // リセット
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

// ゲームの描画
function draw() {
    // 背景をクリア
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 鳥を描画
    bird.draw();

    // パイプを描画（タイトル画面では表示しない）
    if (!isTitleScreen) {
        pipes.forEach(pipe => {
            drawPipe(pipe.x, pipe.topHeight, pipe.bottomY);
        });

        // スコア表示（タイトル画面以外で表示）
        // スコアとハイスコアの背景（半透明の黒）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 120, 70); // 高さを増やしてハイスコアも表示
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 120, 70);

        // スコアテキスト
        ctx.fillStyle = '#FFD700'; // 金色
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(`Score: ${score}`, 70, 25);
        
        // ハイスコアテキスト
        ctx.fillStyle = '#FFA500'; // オレンジ色
        ctx.fillText(`Best: ${highScore}`, 70, 55);
        
        // 影をリセット
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // ゲームオーバー時のスコア表示
        if (gameOver) {
            // 半透明の黒い背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, canvas.height/2 - 70, canvas.width, 140);
            
            // 結果テキスト
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(`獲得スコア: ${score}`, canvas.width/2, canvas.height/2 - 20);
            
            // ハイスコア更新時のメッセージ
            if (score > highScore) {
                ctx.fillStyle = '#FFA500';
                ctx.fillText('New Record!', canvas.width/2, canvas.height/2 + 20);
            }

            // リスタートボタンの描画
            const buttonWidth = 160;
            const buttonHeight = 40;
            const buttonX = canvas.width/2 - buttonWidth/2;
            const buttonY = canvas.height/2 + 50;

            // ボタンの背景
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

            // ボタンの境界線
            ctx.strokeStyle = '#45a049';
            ctx.lineWidth = 2;
            ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

            // ボタンのテキスト
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('リスタート', canvas.width/2, buttonY + buttonHeight/2);
            
            // 影をリセット
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    }

    // タイトル画面の表示
    if (isTitleScreen) {
        drawTitle();
    }
    // スタート画面の表示
    else if (!isGameStarted && !gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('スペースキーを押してスタート', canvas.width / 2, canvas.height / 2);
    }
}

// ゲームの更新
function update() {
    if (gameOver) {
        // ゲームオーバー時はスコアをリセットしない
        return;
    }

    bird.update();

    if (!isGameStarted) return;

    // パイプの移動
    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;

        // スコアの計算
        if (!pipe.scored && pipe.x + pipeWidth < bird.x) {
            score++;
            pipe.scored = true;
        }

        // より大きな衝突判定
        const hitboxWidth = bird.size * 0.5; // 横幅を大きく (0.15 → 0.5)
        const hitboxHeight = bird.size * 0.6; // 縦幅を大きく (0.2 → 0.6)

        // 天井と地面の衝突判定
        if (bird.y - hitboxHeight < 0 || bird.y + hitboxHeight > canvas.height) {
            gameOver = true;
        }

        // パイプとの衝突判定（より大きく）
        const birdLeft = bird.x - hitboxWidth;
        const birdRight = bird.x + hitboxWidth;
        const birdTop = bird.y - hitboxHeight;
        const birdBottom = bird.y + hitboxHeight;

        // パイプとの衝突判定
        if (birdRight > pipe.x && birdLeft < pipe.x + pipeWidth) {
            // 上のパイプとの衝突
            if (birdTop < pipe.topHeight) {
                gameOver = true;
            }
            // 下のパイプとの衝突
            if (birdBottom > pipe.bottomY) {
                gameOver = true;
            }
        }

        if (gameOver) {
            // ハイスコアの更新
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('mosquitoHighScore', highScore);
            }
            
            cancelAnimationFrame(animationId);
            if (pipeGeneratorInterval) {
                clearInterval(pipeGeneratorInterval);
                pipeGeneratorInterval = null;
            }
            
            // ゲームオーバー時のリスタートボタン表示
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText('Click or Press SPACE to Restart', canvas.width/2, canvas.height/2 + 50);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    });

    // 画面外のパイプを削除
    pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);
}

// ゲームの開始
function startGame() {
    isGameStarted = true;
    pipeGeneratorInterval = setInterval(createPipe, pipeSpawnInterval);
}

// ゲームの初期化
function initGame() {
    // 既存のアニメーションをキャンセル
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    isGameStarted = false;
    isTitleScreen = true; // タイトル画面に戻る
    
    if (pipeGeneratorInterval) {
        clearInterval(pipeGeneratorInterval);
        pipeGeneratorInterval = null;
    }
    
    // 新しいゲームループを開始
    gameLoop();
}

// ゲームループ
function gameLoop() {
    if (!gameOver) { // ゲームオーバー時はループを続けない
        update();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }
}

// イベントリスナー
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameOver) {
            bird.jump();
        }
    }
});

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameOver) {
        bird.jump();
    }
});

canvas.addEventListener('click', (e) => {
    if (gameOver) {
        // クリック位置の取得
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // リスタートボタンの領域
        const buttonWidth = 160;
        const buttonHeight = 40;
        const buttonX = canvas.width/2 - buttonWidth/2;
        const buttonY = canvas.height/2 + 50;

        // ボタンがクリックされたかチェック
        if (x >= buttonX && x <= buttonX + buttonWidth &&
            y >= buttonY && y <= buttonY + buttonHeight) {
            initGame();
        }
    } else {
        bird.jump();
    }
});

// ゲームを初期化
initGame(); 