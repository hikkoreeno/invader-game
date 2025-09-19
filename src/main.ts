// Space Invaders Game - メインエントリーポイント

import './style.css';
import { GameState, Player, InvaderGrid, Bullet, UFO, GAME_CONFIG } from './game';
import { InputManager } from './input';
import { AudioManager } from './audio';
import { checkCollision, removeInPlace } from './utils';

/**
 * メインゲームクラス
 */
class SpaceInvadersGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private inputManager: InputManager;
  private audioManager: AudioManager;
  
  // ゲーム状態
  private gameState: GameState = GameState.TITLE;
  private score: number = 0;
  private wave: number = 1;
  
  // ゲームオブジェクト
  private player: Player;
  private invaderGrid: InvaderGrid;
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private ufo: UFO | null = null;
  
  // タイミング制御
  private lastFrameTime: number = 0;
  private playerRespawnTime: number = 0;
  private isPlayerRespawning: boolean = false;
  private lastUfoSpawnTime: number = 0;

  constructor() {
    // Canvas要素の取得
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas要素が見つかりません');
    }
    
    this.ctx = this.canvas.getContext('2d')!;
    if (!this.ctx) {
      throw new Error('2Dコンテキストの取得に失敗しました');
    }

    // システム初期化
    this.inputManager = new InputManager();
    this.audioManager = new AudioManager();
    
    // ゲームオブジェクト初期化
    this.player = new Player();
    this.invaderGrid = new InvaderGrid();
    
    // ゲームループ開始
    requestAnimationFrame(this.gameLoop);
    
    console.log('Space Invaders ゲーム初期化完了');
  }

  /**
   * メインゲームループ
   */
  private gameLoop = (currentTime: number): void => {
    // デルタタイムの計算
    const deltaTime = this.lastFrameTime === 0 ? 0 : (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    // 更新処理
    this.update(deltaTime, currentTime);
    
    // 描画処理
    this.draw();
    
    // 入力状態のクリア
    this.inputManager.update();
    
    // 次のフレームをリクエスト
    requestAnimationFrame(this.gameLoop);
  };

  /**
   * ゲーム更新処理
   */
  private update(deltaTime: number, currentTime: number): void {
    switch (this.gameState) {
      case GameState.TITLE:
        this.updateTitle();
        break;
      case GameState.PLAYING:
        this.updatePlaying(deltaTime, currentTime);
        break;
      case GameState.GAME_OVER:
        this.updateGameOver();
        break;
    }
  }

  /**
   * タイトル画面の更新
   */
  private updateTitle(): void {
    if (this.inputManager.isEnterPressed()) {
      this.startGame();
    }
  }

  /**
   * ゲームプレイ中の更新
   */
  private updatePlaying(deltaTime: number, currentTime: number): void {
    // プレイヤーのリスポーン処理
    if (this.isPlayerRespawning) {
      if (currentTime - this.playerRespawnTime >= 1000) { // 1秒後にリスポーン
        this.isPlayerRespawning = false;
        this.player.resetPosition(); // プレイヤーを初期位置にリセット（ライフは維持）
        this.enemyBullets = []; // 敵の弾丸をクリア
      } else {
        // リスポーン中は更新を停止
        return;
      }
    }

    // プレイヤーの更新
    this.player.update(
      deltaTime,
      this.inputManager.isLeftPressed(),
      this.inputManager.isRightPressed()
    );

    // プレイヤーの射撃
    if (this.inputManager.isShootPressed() && this.playerBullets.length < GAME_CONFIG.MAX_PLAYER_BULLETS) {
      const bullet = this.player.shoot(currentTime);
      if (bullet) {
        this.playerBullets.push(bullet);
        this.audioManager.playPlayerShoot();
      }
    }

    // インベーダー隊列の更新
    const newEnemyBullets = this.invaderGrid.update(deltaTime, currentTime);
    this.enemyBullets.push(...newEnemyBullets);
    
    // 敵の射撃音
    if (newEnemyBullets.length > 0) {
      this.audioManager.playEnemyShoot();
    }

    // 弾丸の更新
    this.updateBullets(deltaTime);
    
    // UFOの更新
    this.updateUFO(deltaTime, currentTime);
    
    // 衝突判定
    this.checkCollisions();
    
    // インベーダーとプレイヤーの直接衝突チェック
    this.checkInvaderPlayerCollision();
    
    // ゲーム終了条件のチェック
    this.checkGameEndConditions();
  }

  /**
   * ゲームオーバー画面の更新
   */
  private updateGameOver(): void {
    if (this.inputManager.isEnterPressed()) {
      this.resetGame();
    }
  }

  /**
   * 弾丸の更新
   */
  private updateBullets(deltaTime: number): void {
    // プレイヤーの弾丸
    for (const bullet of this.playerBullets) {
      bullet.update(deltaTime);
    }
    
    // 敵の弾丸
    for (const bullet of this.enemyBullets) {
      bullet.update(deltaTime);
    }
    
    // 画面外の弾丸を削除
    removeInPlace(this.playerBullets, bullet => bullet.isOutOfBounds());
    removeInPlace(this.enemyBullets, bullet => bullet.isOutOfBounds());
  }

  /**
   * UFOの更新
   */
  private updateUFO(deltaTime: number, currentTime: number): void {
    // UFOの出現判定
    if (!this.ufo && currentTime - this.lastUfoSpawnTime >= GAME_CONFIG.UFO_SPAWN_INTERVAL) {
      this.ufo = new UFO();
      this.lastUfoSpawnTime = currentTime;
    }

    // UFOの更新
    if (this.ufo) {
      this.ufo.update(deltaTime);
      
      // UFOが非アクティブになったら削除
      if (!this.ufo.isActive) {
        this.ufo = null;
      }
    }
  }

  /**
   * 衝突判定
   */
  private checkCollisions(): void {
    // リスポーン中は衝突判定をスキップ
    if (this.isPlayerRespawning) {
      return;
    }

    // プレイヤーの弾丸と敵の衝突
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const bullet = this.playerBullets[i];
      let bulletHit = false;

      // 通常の敵との衝突
      const hitEnemy = this.invaderGrid.checkBulletCollision(bullet);
      if (hitEnemy) {
        // 弾丸を削除
        this.playerBullets.splice(i, 1);
        
        // スコア加算
        this.score += GAME_CONFIG.SCORE_PER_ENEMY;
        
        // 効果音
        this.audioManager.playEnemyHit();
        bulletHit = true;
      }

      // UFOとの衝突
      if (!bulletHit && this.ufo && this.ufo.isActive && 
          checkCollision(bullet.getRect(), this.ufo.getRect())) {
        // 弾丸を削除
        this.playerBullets.splice(i, 1);
        
        // UFOを撃破
        this.ufo.destroy();
        
        // 高得点加算
        this.score += GAME_CONFIG.UFO_SCORE;
        
        // UFO専用効果音
        this.audioManager.playUfoHit();
        
        // UFOボーナス表示用（後で実装）
        console.log(`UFO BONUS! +${GAME_CONFIG.UFO_SCORE} points!`);
      }
    }

    // 敵の弾丸とプレイヤーの衝突
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      
      if (checkCollision(bullet.getRect(), this.player.getRect())) {
        // 弾丸を削除
        this.enemyBullets.splice(i, 1);
        
        // プレイヤーにダメージ
        this.player.hit();
        
        // 効果音
        this.audioManager.playPlayerHit();
        
        // プレイヤーのリスポーン処理を開始
        this.startPlayerRespawn();
        
        break; // 一度に一発の弾丸のみ処理
      }
    }
  }

  /**
   * インベーダーとプレイヤーの直接衝突チェック
   */
  private checkInvaderPlayerCollision(): void {
    // リスポーン中は衝突判定をスキップ
    if (this.isPlayerRespawning) {
      return;
    }

    const collidedEnemy = this.invaderGrid.checkPlayerCollision(this.player.getRect());
    if (collidedEnemy) {
      // インベーダーがプレイヤーに接触した場合、即座にゲームオーバー
      this.gameOver();
    }
  }

  /**
   * プレイヤーのリスポーン開始
   */
  private startPlayerRespawn(): void {
    this.isPlayerRespawning = true;
    this.playerRespawnTime = performance.now();
  }

  /**
   * ゲーム終了条件のチェック
   */
  private checkGameEndConditions(): void {
    // プレイヤーのライフが0になった場合
    if (this.player.lives <= 0) {
      this.gameOver();
      return;
    }
    
    // インベーダーとの直接衝突は checkInvaderPlayerCollision で処理
    // 旧来の hasReachedPlayer チェックは削除
    
    // 全ての敵を倒した場合
    if (this.invaderGrid.getAliveCount() === 0) {
      this.nextWave();
    }
  }

  /**
   * 描画処理
   */
  private draw(): void {
    // 画面クリア
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    switch (this.gameState) {
      case GameState.TITLE:
        this.drawTitle();
        break;
      case GameState.PLAYING:
        this.drawPlaying();
        break;
      case GameState.GAME_OVER:
        this.drawGameOver();
        break;
    }
  }

  /**
   * タイトル画面の描画
   */
  private drawTitle(): void {
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SPACE INVADERS', GAME_CONFIG.CANVAS_WIDTH / 2, 200);
    
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.fillText('TypeScript Edition', GAME_CONFIG.CANVAS_WIDTH / 2, 240);
    
    this.ctx.font = '20px "Courier New", monospace';
    this.ctx.fillText('Press ENTER to Start', GAME_CONFIG.CANVAS_WIDTH / 2, 350);
    
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillText('Move: ← → or A D', GAME_CONFIG.CANVAS_WIDTH / 2, 420);
    this.ctx.fillText('Shoot: SPACE', GAME_CONFIG.CANVAS_WIDTH / 2, 450);
  }

  /**
   * ゲームプレイ中の描画
   */
  private drawPlaying(): void {
    // ゲームオブジェクトの描画
    // リスポーン中は点滅表示
    if (!this.isPlayerRespawning || Math.floor(performance.now() / 200) % 2 === 0) {
      this.player.draw(this.ctx);
    }
    
    this.invaderGrid.draw(this.ctx);
    
    // UFOの描画
    if (this.ufo && this.ufo.isActive) {
      this.ufo.draw(this.ctx);
    }
    
    // 弾丸の描画
    for (const bullet of this.playerBullets) {
      bullet.draw(this.ctx);
    }
    for (const bullet of this.enemyBullets) {
      bullet.draw(this.ctx);
    }
    
    // リスポーン中のメッセージ表示
    if (this.isPlayerRespawning) {
      this.ctx.fillStyle = '#ffff00';
      this.ctx.font = '24px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('RESPAWNING...', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
    }
    
    // UI情報の描画
    this.drawUI();
  }

  /**
   * ゲームオーバー画面の描画
   */
  private drawGameOver(): void {
    // ゲーム画面を薄暗く表示
    this.drawPlaying();
    
    // オーバーレイ
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    
    // ゲームオーバーテキスト
    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = '48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', GAME_CONFIG.CANVAS_WIDTH / 2, 250);
    
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.fillText(`Final Score: ${this.score}`, GAME_CONFIG.CANVAS_WIDTH / 2, 300);
    this.ctx.fillText(`Wave: ${this.wave}`, GAME_CONFIG.CANVAS_WIDTH / 2, 330);
    
    this.ctx.font = '20px "Courier New", monospace';
    this.ctx.fillText('Press ENTER to Restart', GAME_CONFIG.CANVAS_WIDTH / 2, 400);
  }

  /**
   * UI情報の描画
   */
  private drawUI(): void {
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '20px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    
    // スコア
    this.ctx.fillText(`Score: ${this.score}`, 20, 30);
    
    // ライフ
    this.ctx.fillText(`Lives: ${this.player.lives}`, 20, 60);
    
    // ウェーブ
    this.ctx.fillText(`Wave: ${this.wave}`, 20, 90);
    
    // 敵の残り数
    const aliveEnemies = this.invaderGrid.getAliveCount();
    this.ctx.fillText(`Enemies: ${aliveEnemies}`, 20, 120);
    
    // 現在の敵速度（デバッグ情報として表示）
    const currentSpeed = this.invaderGrid.getCurrentSpeed();
    const speedMultiplier = (currentSpeed / GAME_CONFIG.ENEMY_MOVE_SPEED).toFixed(1);
    this.ctx.fillStyle = '#ffff00';
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillText(`Speed: x${speedMultiplier}`, 20, 150);
  }

  /**
   * ゲーム開始
   */
  private startGame(): void {
    this.gameState = GameState.PLAYING;
    this.audioManager.playGameStart();
  }

  /**
   * ゲームオーバー
   */
  private gameOver(): void {
    this.gameState = GameState.GAME_OVER;
    this.audioManager.playGameOver();
  }

  /**
   * 次のウェーブ
   */
  private nextWave(): void {
    this.wave++;
    this.invaderGrid.reset();
    this.playerBullets = [];
    this.enemyBullets = [];
    
    // TODO: ウェーブが進むにつれて難易度を上げる
    // - 敵の移動速度アップ
    // - 射撃頻度アップ
    // - 新しい敵タイプの追加
  }

  /**
   * ゲームリセット
   */
  private resetGame(): void {
    this.gameState = GameState.TITLE;
    this.score = 0;
    this.wave = 1;
    this.player.reset();
    this.invaderGrid.reset();
    this.playerBullets = [];
    this.enemyBullets = [];
    this.ufo = null;
    this.isPlayerRespawning = false;
    this.playerRespawnTime = 0;
    this.lastUfoSpawnTime = 0;
  }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
  try {
    new SpaceInvadersGame();
  } catch (error) {
    console.error('ゲームの初期化に失敗しました:', error);
  }
});
