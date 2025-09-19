// 音響システム（AudioContextを使用した簡易SE）

/**
 * 音響効果を管理するクラス
 */
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.3;

  constructor() {
    // ユーザーインタラクション後にAudioContextを初期化
    this.initializeAudioContext();
  }

  /**
   * AudioContextの初期化
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // AudioContextが suspended 状態の場合は resume を試行
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.warn('AudioContext の初期化に失敗しました:', error);
    }
  }

  /**
   * AudioContextが利用可能かどうかを確認
   */
  private ensureAudioContext(): boolean {
    if (!this.audioContext) {
      this.initializeAudioContext();
      return false;
    }
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    return this.audioContext.state === 'running';
  }

  /**
   * ビープ音を生成して再生
   * @param frequency 周波数（Hz）
   * @param duration 持続時間（秒）
   * @param volume 音量（0-1）
   * @param waveType 波形タイプ
   */
  private playBeep(
    frequency: number,
    duration: number,
    volume: number = 1,
    waveType: OscillatorType = 'square'
  ): void {
    if (!this.ensureAudioContext()) return;

    try {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      // オシレーターの設定
      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);

      // ゲインノードの設定（音量制御）
      const finalVolume = volume * this.masterVolume;
      gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume, this.audioContext!.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + duration);

      // ノードの接続
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      // 再生開始と停止
      oscillator.start(this.audioContext!.currentTime);
      oscillator.stop(this.audioContext!.currentTime + duration);
    } catch (error) {
      console.warn('音声再生エラー:', error);
    }
  }

  /**
   * プレイヤーの射撃音
   */
  playPlayerShoot(): void {
    this.playBeep(800, 0.1, 0.5, 'square');
  }

  /**
   * 敵の射撃音
   */
  playEnemyShoot(): void {
    this.playBeep(400, 0.15, 0.3, 'sawtooth');
  }

  /**
   * 敵撃破音
   */
  playEnemyHit(): void {
    // 複数の周波数を組み合わせた爆発音風
    this.playBeep(200, 0.2, 0.6, 'square');
    setTimeout(() => this.playBeep(150, 0.15, 0.4, 'sawtooth'), 50);
  }

  /**
   * プレイヤー被弾音
   */
  playPlayerHit(): void {
    // 下降する音で被弾を表現
    if (!this.ensureAudioContext()) return;

    try {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(600, this.audioContext!.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext!.currentTime + 0.3);

      const finalVolume = 0.7 * this.masterVolume;
      gainNode.gain.setValueAtTime(finalVolume, this.audioContext!.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.start(this.audioContext!.currentTime);
      oscillator.stop(this.audioContext!.currentTime + 0.3);
    } catch (error) {
      console.warn('音声再生エラー:', error);
    }
  }

  /**
   * ゲームオーバー音
   */
  playGameOver(): void {
    // 悲しげな下降音階
    const notes = [440, 392, 349, 311, 277];
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playBeep(freq, 0.4, 0.5, 'triangle');
      }, index * 200);
    });
  }

  /**
   * ゲーム開始音
   */
  playGameStart(): void {
    // 上昇する音階
    const notes = [262, 330, 392, 523];
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playBeep(freq, 0.2, 0.4, 'triangle');
      }, index * 100);
    });
  }

  /**
   * マスター音量の設定
   * @param volume 音量（0-1）
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * UFO撃破音（特別な高得点音）
   */
  playUfoHit(): void {
    // 上昇する音階で高得点を表現
    const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playBeep(freq, 0.15, 0.6, 'triangle');
      }, index * 80);
    });
  }

  /**
   * AudioContextの状態を取得
   */
  getAudioContextState(): string {
    return this.audioContext?.state || 'not initialized';
  }
}
