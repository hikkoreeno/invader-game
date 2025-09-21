// ゲームエンティティの定義

import type { Rect } from './utils';
import { checkCollision, clamp, randomInt } from './utils';

/**
 * ゲーム定数
 */
export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  PLAYER_SPEED: 300, // px/s
  PLAYER_WIDTH: 40,
  PLAYER_HEIGHT: 20,
  PLAYER_LIVES: 3,
  BULLET_SPEED: 400, // px/s
  BULLET_WIDTH: 4,
  BULLET_HEIGHT: 12,
  MAX_PLAYER_BULLETS: 5,
  PLAYER_SHOOT_COOLDOWN: 200, // ms
  ENEMY_WIDTH: 48,  // 60 → 48 (80%)
  ENEMY_HEIGHT: 32, // 40 → 32 (80%)
  ENEMY_ROWS: 5,
  ENEMY_COLS: 9,    // 7 → 9列に変更
  ENEMY_SPACING_X: 64,  // 80 → 64 (80%)
  ENEMY_SPACING_Y: 40,  // 50 → 40 (80%)
  ENEMY_START_X: 88,  // 9列用に中央配置 ((800-(9*64-16))/2)
  ENEMY_START_Y: 80,
  ENEMY_MOVE_SPEED: 20, // px/s (ゆっくりとした動き)
  ENEMY_DROP_DISTANCE: 20,
  ENEMY_SHOOT_INTERVAL: 2000, // ms
  SCORE_PER_ENEMY: 10,
  UFO_SPEED: 100, // px/s
  UFO_WIDTH: 50,
  UFO_HEIGHT: 20,
  UFO_SCORE: 100, // 高得点
  UFO_SPAWN_INTERVAL: 15000, // 15秒間隔でUFO出現
  UFO_Y_POSITION: 30, // 画面上部の位置
} as const;

/**
 * ゲーム状態の列挙型
 */
export const GameState = {
  TITLE: 'title',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

/**
 * 弾丸クラス
 */
export class Bullet {
  public x: number;
  public y: number;
  public width: number = GAME_CONFIG.BULLET_WIDTH;
  public height: number = GAME_CONFIG.BULLET_HEIGHT;
  public speed: number;
  public isPlayerBullet: boolean;

  constructor(x: number, y: number, speed: number, isPlayerBullet: boolean = true) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.isPlayerBullet = isPlayerBullet;
  }

  /**
   * 弾丸の更新
   */
  update(deltaTime: number): void {
    this.y += this.speed * deltaTime;
  }

  /**
   * 弾丸の描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.isPlayerBullet ? '#00ff00' : '#ff0000';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  /**
   * 画面外に出たかどうかを判定
   */
  isOutOfBounds(): boolean {
    return this.y < -this.height || this.y > GAME_CONFIG.CANVAS_HEIGHT;
  }

  /**
   * 矩形として取得
   */
  getRect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

/**
 * プレイヤークラス
 */
export class Player {
  public x: number;
  public y: number;
  public width: number = GAME_CONFIG.PLAYER_WIDTH;
  public height: number = GAME_CONFIG.PLAYER_HEIGHT;
  public speed: number = GAME_CONFIG.PLAYER_SPEED;
  public lives: number = GAME_CONFIG.PLAYER_LIVES;
  public lastShootTime: number = 0;

  constructor() {
    this.x = (GAME_CONFIG.CANVAS_WIDTH - this.width) / 2;
    this.y = GAME_CONFIG.CANVAS_HEIGHT - this.height - 20;
  }

  /**
   * プレイヤーの更新
   */
  update(deltaTime: number, moveLeft: boolean, moveRight: boolean): void {
    // 移動処理
    if (moveLeft) {
      this.x -= this.speed * deltaTime;
    }
    if (moveRight) {
      this.x += this.speed * deltaTime;
    }

    // 画面内に制限
    this.x = clamp(this.x, 0, GAME_CONFIG.CANVAS_WIDTH - this.width);
  }

  /**
   * 射撃可能かどうかを判定
   */
  canShoot(currentTime: number): boolean {
    return currentTime - this.lastShootTime >= GAME_CONFIG.PLAYER_SHOOT_COOLDOWN;
  }

  /**
   * 射撃
   */
  shoot(currentTime: number): Bullet | null {
    if (!this.canShoot(currentTime)) {
      return null;
    }

    this.lastShootTime = currentTime;
    const bulletX = this.x + this.width / 2 - GAME_CONFIG.BULLET_WIDTH / 2;
    const bulletY = this.y - GAME_CONFIG.BULLET_HEIGHT;
    return new Bullet(bulletX, bulletY, -GAME_CONFIG.BULLET_SPEED, true);
  }

  /**
   * プレイヤーの描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // プレイヤー本体（緑色の矩形）
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // 砲台部分
    const cannonWidth = 6;
    const cannonHeight = 8;
    const cannonX = this.x + this.width / 2 - cannonWidth / 2;
    const cannonY = this.y - cannonHeight;
    ctx.fillRect(cannonX, cannonY, cannonWidth, cannonHeight);
  }

  /**
   * 被弾処理
   */
  hit(): void {
    this.lives--;
  }

  /**
   * 矩形として取得
   */
  getRect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * 位置のみリセット（リスポーン用）
   */
  resetPosition(): void {
    this.x = (GAME_CONFIG.CANVAS_WIDTH - this.width) / 2;
    this.y = GAME_CONFIG.CANVAS_HEIGHT - this.height - 20;
    this.lastShootTime = 0;
  }

  /**
   * 完全リセット（ゲーム開始時用）
   */
  reset(): void {
    this.resetPosition();
    this.lives = GAME_CONFIG.PLAYER_LIVES;
  }
}

/**
 * 敵クラス
 */
export class Enemy {
  public x: number;
  public y: number;
  public width: number = GAME_CONFIG.ENEMY_WIDTH;
  public height: number = GAME_CONFIG.ENEMY_HEIGHT;
  public isAlive: boolean = true;
  public row: number;
  public col: number;

  constructor(x: number, y: number, row: number, col: number) {
    this.x = x;
    this.y = y;
    this.row = row;
    this.col = col;
  }

  /**
   * 敵の描画
   */
  draw(ctx: CanvasRenderingContext2D, speedMultiplier: number = 1): void {
    if (!this.isAlive) return;

    // 敵の種類によって色を変える
    const baseColors = ['#ff0000', '#ff4400', '#ff8800', '#ffaa00', '#ffcc00'];
    let bodyColor = baseColors[this.row] || '#ff0000';
    
    // 速度が上がるにつれて色を明るく（危険度を表現）
    if (speedMultiplier > 1.5) {
      // 速度が1.5倍を超えると赤みを強くする
      const intensity = Math.min((speedMultiplier - 1) * 0.4, 0.9);
      const red = Math.min(255, Math.round(parseInt(bodyColor.slice(1, 3), 16) + intensity * 80));
      const green = Math.max(0, Math.round(parseInt(bodyColor.slice(3, 5), 16) - intensity * 30));
      const blue = Math.max(0, Math.round(parseInt(bodyColor.slice(5, 7), 16) - intensity * 30));
      
      // 16進数変換を正確に行う
      const redHex = red.toString(16).padStart(2, '0');
      const greenHex = green.toString(16).padStart(2, '0');
      const blueHex = blue.toString(16).padStart(2, '0');
      bodyColor = `#${redHex}${greenHex}${blueHex}`;
    }
    
    // インベーダーの本体（頭部）- 80%サイズ
    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x + 5, this.y, 38, 13);      // 上部 (3*1.6, 0, 24*1.6, 8*1.6)
    ctx.fillRect(this.x, this.y + 5, 48, 16);      // 中央部（幅広） (0, 3*1.6, 30*1.6, 10*1.6)
    ctx.fillRect(this.x + 8, this.y + 21, 32, 6);  // 下部 (5*1.6, 13*1.6, 20*1.6, 4*1.6)
    
    // 目（白い部分）- 80%サイズ
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + 11, this.y + 8, 6, 6);   // 左目 (7*1.6, 5*1.6, 4*1.6, 4*1.6)
    ctx.fillRect(this.x + 30, this.y + 8, 6, 6);   // 右目 (19*1.6, 5*1.6, 4*1.6, 4*1.6)
    
    // 瞳（黒い部分）- アニメーション効果、80%サイズ
    ctx.fillStyle = '#000000';
    const eyeOffset = Math.floor(performance.now() / 1000) % 2; // 1秒ごとに瞬き
    if (eyeOffset === 0) {
      ctx.fillRect(this.x + 13, this.y + 10, 3, 3); // 左瞳 (8*1.6, 6*1.6, 2*1.6, 2*1.6)
      ctx.fillRect(this.x + 32, this.y + 10, 3, 3); // 右瞳 (20*1.6, 6*1.6, 2*1.6, 2*1.6)
    } else {
      // 瞬き状態（目を細める）
      ctx.fillRect(this.x + 13, this.y + 11, 3, 2); // 左瞳（細い） (8*1.6, 7*1.6, 2*1.6, 1*1.6)
      ctx.fillRect(this.x + 32, this.y + 11, 3, 2); // 右瞳（細い） (20*1.6, 7*1.6, 2*1.6, 1*1.6)
    }
    
    // 触手（足）- 歩行アニメーション付き、80%サイズ
    ctx.fillStyle = bodyColor; // 足も同じ色（速度変化に対応）
    const walkCycle = Math.floor(performance.now() / 500) % 2; // 0.5秒ごとに歩行サイクル
    const footOffset = walkCycle === 0 ? 0 : 2; // 足の上下動
    
    // 左側の足（交互に動く）- 80%サイズ
    ctx.fillRect(this.x + 3, this.y + 27 + (walkCycle === 0 ? 0 : 2), 5, 5);   // 左足1 (2*1.6, 17*1.6, 3*1.6, 3*1.6)
    ctx.fillRect(this.x + 11, this.y + 27 + (walkCycle === 1 ? 0 : 2), 5, 5);  // 左足2 (7*1.6, 17*1.6, 3*1.6, 3*1.6)
    ctx.fillRect(this.x + 19, this.y + 27 + footOffset, 5, 5);  // 中央足 (12*1.6, 17*1.6, 3*1.6, 3*1.6)
    // 右側の足（交互に動く）- 80%サイズ
    ctx.fillRect(this.x + 27, this.y + 27 + (walkCycle === 1 ? 0 : 2), 5, 5);  // 右足1 (17*1.6, 17*1.6, 3*1.6, 3*1.6)
    ctx.fillRect(this.x + 35, this.y + 27 + (walkCycle === 0 ? 0 : 2), 5, 5);  // 右足2 (22*1.6, 17*1.6, 3*1.6, 3*1.6)
    ctx.fillRect(this.x + 40, this.y + 27 + footOffset, 5, 5);  // 右足3 (25*1.6, 17*1.6, 3*1.6, 3*1.6)
    
    // 足の先端（歩行に合わせて動く）- 80%サイズ
    ctx.fillRect(this.x + 3, this.y + 32 + (walkCycle === 0 ? 0 : 2), 3, 2);   // 左足1先端 (2*1.6, 20*1.6, 2*1.6, 1*1.6)
    ctx.fillRect(this.x + 6, this.y + 32 + (walkCycle === 0 ? 0 : 2), 3, 2);   // 左足1先端2 (4*1.6, 20*1.6, 2*1.6, 1*1.6)
    ctx.fillRect(this.x + 13, this.y + 32 + (walkCycle === 1 ? 0 : 2), 3, 2);  // 左足2先端 (8*1.6, 20*1.6, 2*1.6, 1*1.6)
    ctx.fillRect(this.x + 21, this.y + 32 + footOffset, 3, 2);  // 中央足先端 (13*1.6, 20*1.6, 2*1.6, 1*1.6)
    ctx.fillRect(this.x + 29, this.y + 32 + (walkCycle === 1 ? 0 : 2), 3, 2);  // 右足1先端 (18*1.6, 20*1.6, 2*1.6, 1*1.6)
    ctx.fillRect(this.x + 37, this.y + 32 + (walkCycle === 0 ? 0 : 2), 3, 2);  // 右足2先端 (23*1.6, 20*1.6, 2*1.6, 1*1.6)
    ctx.fillRect(this.x + 42, this.y + 32 + footOffset, 3, 2);  // 右足3先端 (26*1.6, 20*1.6, 2*1.6, 1*1.6)
    ctx.fillRect(this.x + 45, this.y + 32 + footOffset, 3, 2);  // 右足3先端2 (28*1.6, 20*1.6, 2*1.6, 1*1.6)
    
    // 触角（アンテナ）- 地球外生物らしさを追加、80%サイズ
    ctx.fillStyle = bodyColor; // 触角も同じ色（速度変化に対応）
    ctx.fillRect(this.x + 16, this.y - 3, 2, 5);   // 左触角 (10*1.6, -2*1.6, 1*1.6, 3*1.6)
    ctx.fillRect(this.x + 30, this.y - 3, 2, 5);   // 右触角 (19*1.6, -2*1.6, 1*1.6, 3*1.6)
    
    // 触角の先端（小さな球）- 80%サイズ
    ctx.fillStyle = '#ffff00'; // 黄色で目立たせる
    ctx.fillRect(this.x + 14, this.y - 5, 3, 3);   // 左触角先端 (9*1.6, -3*1.6, 2*1.6, 2*1.6)
    ctx.fillRect(this.x + 29, this.y - 5, 3, 3);   // 右触角先端 (18*1.6, -3*1.6, 2*1.6, 2*1.6)
  }

  /**
   * 射撃
   */
  shoot(): Bullet {
    const bulletX = this.x + this.width / 2 - GAME_CONFIG.BULLET_WIDTH / 2;
    const bulletY = this.y + this.height;
    return new Bullet(bulletX, bulletY, GAME_CONFIG.BULLET_SPEED, false);
  }

  /**
   * 撃破処理
   */
  destroy(): void {
    this.isAlive = false;
  }

  /**
   * 矩形として取得
   */
  getRect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

/**
 * UFOクラス
 */
export class UFO {
  public x: number;
  public y: number;
  public width: number = GAME_CONFIG.UFO_WIDTH;
  public height: number = GAME_CONFIG.UFO_HEIGHT;
  public speed: number = GAME_CONFIG.UFO_SPEED;
  public isActive: boolean = true;
  public direction: number; // 1: 右, -1: 左

  constructor() {
    this.y = GAME_CONFIG.UFO_Y_POSITION;
    // ランダムに左右どちらかから出現
    this.direction = Math.random() < 0.5 ? 1 : -1;
    if (this.direction === 1) {
      // 左から右へ
      this.x = -this.width;
    } else {
      // 右から左へ
      this.x = GAME_CONFIG.CANVAS_WIDTH;
    }
  }

  /**
   * UFOの更新
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;

    this.x += this.speed * this.direction * deltaTime;

    // 画面外に出たら非アクティブ化
    if (this.direction === 1 && this.x > GAME_CONFIG.CANVAS_WIDTH) {
      this.isActive = false;
    } else if (this.direction === -1 && this.x < -this.width) {
      this.isActive = false;
    }
  }

  /**
   * UFOの描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;

    // UFOの本体（楕円形）
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2,
      this.height / 3,
      0,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // UFOの上部ドーム
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2,
      this.y + this.height / 3,
      this.width / 3,
      this.height / 4,
      0,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // UFOのライト（点滅効果）
    if (Math.floor(performance.now() / 300) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      const lightSize = 3;
      const numLights = 5;
      for (let i = 0; i < numLights; i++) {
        const lightX = this.x + (this.width / (numLights + 1)) * (i + 1);
        const lightY = this.y + this.height * 0.7;
        ctx.beginPath();
        ctx.arc(lightX, lightY, lightSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  /**
   * 撃破処理
   */
  destroy(): void {
    this.isActive = false;
  }

  /**
   * 矩形として取得
   */
  getRect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

/**
 * インベーダーの隊列を管理するクラス
 */
export class InvaderGrid {
  public enemies: Enemy[] = [];
  public moveDirection: number = 1; // 1: 右, -1: 左
  public lastMoveTime: number = 0;
  public lastShootTime: number = 0;
  private baseY: number;
  private previousSpeedStage: number = 1; // 前回の速度段階を記録

  constructor() {
    this.baseY = GAME_CONFIG.ENEMY_START_Y;
    this.createEnemies();
  }

  /**
   * 敵の配列を作成
   */
  private createEnemies(): void {
    this.enemies = [];
    for (let row = 0; row < GAME_CONFIG.ENEMY_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.ENEMY_COLS; col++) {
        const x = GAME_CONFIG.ENEMY_START_X + col * GAME_CONFIG.ENEMY_SPACING_X;
        const y = this.baseY + row * GAME_CONFIG.ENEMY_SPACING_Y;
        this.enemies.push(new Enemy(x, y, row, col));
      }
    }
  }

  /**
   * 現在の高度に基づいて4段階の移動速度を計算
   */
  private getCurrentMoveSpeed(): number {
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);
    if (aliveEnemies.length === 0) return GAME_CONFIG.ENEMY_MOVE_SPEED;

    // 最も下にいる敵の位置を取得
    const lowestY = Math.max(...aliveEnemies.map(enemy => enemy.y));
    
    // 初期位置からの降下距離を計算
    const initialY = this.baseY;
    const descentDistance = lowestY - initialY;
    
    // 4段階の速度設定
    const speedStages = [
      { threshold: 0,   multiplier: 1.0 },   // 段階1: 通常速度
      { threshold: 100, multiplier: 1.5 },   // 段階2: 1.5倍速
      { threshold: 200, multiplier: 2.2 },   // 段階3: 2.2倍速
      { threshold: 300, multiplier: 3.0 }    // 段階4: 3倍速（最高速）
    ];
    
    // 現在の降下距離に応じた段階を決定
    let currentMultiplier = speedStages[0].multiplier;
    for (const stage of speedStages) {
      if (descentDistance >= stage.threshold) {
        currentMultiplier = stage.multiplier;
      } else {
        break;
      }
    }
    
    return GAME_CONFIG.ENEMY_MOVE_SPEED * currentMultiplier;
  }

  /**
   * 現在の速度段階を取得（UI表示用）
   */
  getCurrentSpeedStage(): number {
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);
    if (aliveEnemies.length === 0) return 1;

    const lowestY = Math.max(...aliveEnemies.map(enemy => enemy.y));
    const descentDistance = lowestY - this.baseY;
    
    if (descentDistance >= 300) return 4;      // 段階4
    else if (descentDistance >= 200) return 3; // 段階3
    else if (descentDistance >= 100) return 2; // 段階2
    else return 1;                             // 段階1
  }

  /**
   * 隊列の更新
   */
  update(_deltaTime: number, currentTime: number): { bullets: Bullet[], stageChanged: boolean } {
    const newBullets: Bullet[] = [];

    // 現在の速度段階をチェック
    const currentStage = this.getCurrentSpeedStage();
    const stageChanged = currentStage !== this.previousSpeedStage;
    
    if (stageChanged) {
      this.previousSpeedStage = currentStage;
    }

    // 動的速度を取得
    const currentSpeed = this.getCurrentMoveSpeed();

    // 移動処理（速度が動的に変化）
    if (currentTime - this.lastMoveTime >= 1000 / currentSpeed) {
      this.move();
      this.lastMoveTime = currentTime;
    }

    // 射撃処理（速度が上がるにつれて射撃頻度も上昇）
    const shootInterval = GAME_CONFIG.ENEMY_SHOOT_INTERVAL / (currentSpeed / GAME_CONFIG.ENEMY_MOVE_SPEED);
    if (currentTime - this.lastShootTime >= shootInterval) {
      const bullet = this.randomShoot();
      if (bullet) {
        newBullets.push(bullet);
      }
      this.lastShootTime = currentTime;
    }

    return { bullets: newBullets, stageChanged };
  }

  /**
   * 隊列の移動
   */
  private move(): void {
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);
    if (aliveEnemies.length === 0) return;

    // 端の敵の位置を確認
    const leftmostX = Math.min(...aliveEnemies.map(enemy => enemy.x));
    const rightmostX = Math.max(...aliveEnemies.map(enemy => enemy.x + enemy.width));

    // 端に到達したら方向転換と下降
    let shouldDrop = false;
    if (this.moveDirection === 1 && rightmostX >= GAME_CONFIG.CANVAS_WIDTH - 10) {
      this.moveDirection = -1;
      shouldDrop = true;
    } else if (this.moveDirection === -1 && leftmostX <= 10) {
      this.moveDirection = 1;
      shouldDrop = true;
    }

    // 移動実行
    for (const enemy of aliveEnemies) {
      if (shouldDrop) {
        enemy.y += GAME_CONFIG.ENEMY_DROP_DISTANCE;
      } else {
        enemy.x += this.moveDirection * 10;
      }
    }
  }

  /**
   * ランダムな敵が射撃
   */
  private randomShoot(): Bullet | null {
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);
    if (aliveEnemies.length === 0) return null;

    // 最前列の敵のみが射撃可能
    const frontLineEnemies = this.getFrontLineEnemies();
    if (frontLineEnemies.length === 0) return null;

    const shooter = frontLineEnemies[randomInt(0, frontLineEnemies.length - 1)];
    return shooter.shoot();
  }

  /**
   * 最前列の敵を取得
   */
  private getFrontLineEnemies(): Enemy[] {
    const frontLine: Enemy[] = [];
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);

    // 各列で最も下にいる敵を取得
    for (let col = 0; col < GAME_CONFIG.ENEMY_COLS; col++) {
      const columnEnemies = aliveEnemies.filter(enemy => enemy.col === col);
      if (columnEnemies.length > 0) {
        const bottomEnemy = columnEnemies.reduce((prev, current) => 
          prev.y > current.y ? prev : current
        );
        frontLine.push(bottomEnemy);
      }
    }

    return frontLine;
  }

  /**
   * 隊列の描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    const speedMultiplier = this.getCurrentMoveSpeed() / GAME_CONFIG.ENEMY_MOVE_SPEED;
    for (const enemy of this.enemies) {
      enemy.draw(ctx, speedMultiplier);
    }
  }

  /**
   * 敵との衝突判定
   */
  checkBulletCollision(bullet: Bullet): Enemy | null {
    for (const enemy of this.enemies) {
      if (enemy.isAlive && checkCollision(bullet.getRect(), enemy.getRect())) {
        enemy.destroy();
        return enemy;
      }
    }
    return null;
  }

  /**
   * 生存している敵の数を取得
   */
  getAliveCount(): number {
    return this.enemies.filter(enemy => enemy.isAlive).length;
  }

  /**
   * 現在の移動速度を取得（UI表示用）
   */
  getCurrentSpeed(): number {
    return this.getCurrentMoveSpeed();
  }

  /**
   * プレイヤーとの衝突判定
   * @param playerRect プレイヤーの矩形
   * @returns 衝突した敵、なければnull
   */
  checkPlayerCollision(playerRect: Rect): Enemy | null {
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);
    
    for (const enemy of aliveEnemies) {
      if (checkCollision(enemy.getRect(), playerRect)) {
        return enemy;
      }
    }
    
    return null;
  }

  /**
   * プレイヤーに到達したかどうかを判定（旧版・互換性のため残す）
   * 実際の接触判定は checkPlayerCollision を使用
   */
  hasReachedPlayer(): boolean {
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);
    if (aliveEnemies.length === 0) return false;

    const lowestY = Math.max(...aliveEnemies.map(enemy => enemy.y + enemy.height));
    return lowestY >= GAME_CONFIG.CANVAS_HEIGHT - 100; // プレイヤーエリアに到達
  }

  /**
   * リセット（新しいウェーブ用）
   */
  reset(): void {
    this.moveDirection = 1;
    this.lastMoveTime = 0;
    this.lastShootTime = 0;
    this.previousSpeedStage = 1; // 速度段階もリセット
    this.createEnemies();
  }
}
