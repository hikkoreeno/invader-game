// 入力管理システム

/**
 * キー入力の状態を管理するクラス
 */
export class InputManager {
  private keys: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.keysPressed.add(e.code);
      }
      this.keys.add(e.code);
      
      // ゲーム用のキーの場合、デフォルト動作を防ぐ
      if (this.isGameKey(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.keysReleased.add(e.code);
      
      if (this.isGameKey(e.code)) {
        e.preventDefault();
      }
    });

    // フォーカスが外れた時にキー状態をリセット
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.keysPressed.clear();
      this.keysReleased.clear();
    });
  }

  /**
   * ゲームで使用するキーかどうかを判定
   */
  private isGameKey(code: string): boolean {
    const gameKeys = [
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'KeyA', 'KeyD', 'KeyW', 'KeyS',
      'Space', 'Enter'
    ];
    return gameKeys.includes(code);
  }

  /**
   * キーが押されているかどうかを取得
   * @param key キーコード
   * @returns 押されているかどうか
   */
  isKeyDown(key: string): boolean {
    return this.keys.has(key);
  }

  /**
   * キーが押された瞬間かどうかを取得
   * @param key キーコード
   * @returns 押された瞬間かどうか
   */
  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }

  /**
   * キーが離された瞬間かどうかを取得
   * @param key キーコード
   * @returns 離された瞬間かどうか
   */
  isKeyReleased(key: string): boolean {
    return this.keysReleased.has(key);
  }

  /**
   * 左移動キーが押されているかどうか
   */
  isLeftPressed(): boolean {
    return this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA');
  }

  /**
   * 右移動キーが押されているかどうか
   */
  isRightPressed(): boolean {
    return this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD');
  }

  /**
   * 射撃キーが押された瞬間かどうか
   */
  isShootPressed(): boolean {
    return this.isKeyPressed('Space');
  }

  /**
   * Enterキーが押された瞬間かどうか
   */
  isEnterPressed(): boolean {
    return this.isKeyPressed('Enter');
  }

  /**
   * フレーム終了時に呼び出す（押された瞬間・離された瞬間の状態をクリア）
   */
  update(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
  }
}
