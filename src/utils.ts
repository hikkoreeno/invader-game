// ユーティリティ関数集

/**
 * 矩形の定義
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 2D座標の定義
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * AABB（軸平行境界ボックス）による衝突判定
 * @param rect1 矩形1
 * @param rect2 矩形2
 * @returns 衝突しているかどうか
 */
export function checkCollision(rect1: Rect, rect2: Rect): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * 値を指定した範囲内に制限する
 * @param value 値
 * @param min 最小値
 * @param max 最大値
 * @returns 制限された値
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 指定した範囲内のランダムな整数を生成
 * @param min 最小値（含む）
 * @param max 最大値（含む）
 * @returns ランダムな整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 指定した範囲内のランダムな浮動小数点数を生成
 * @param min 最小値
 * @param max 最大値
 * @returns ランダムな浮動小数点数
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 線形補間
 * @param a 開始値
 * @param b 終了値
 * @param t 補間係数（0-1）
 * @returns 補間された値
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 距離の計算
 * @param p1 座標1
 * @param p2 座標2
 * @returns 距離
 */
export function distance(p1: Vector2, p2: Vector2): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 配列から要素をin-placeで削除（パフォーマンス重視）
 * @param array 配列
 * @param predicate 削除条件
 */
export function removeInPlace<T>(array: T[], predicate: (item: T) => boolean): void {
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < array.length; readIndex++) {
    if (!predicate(array[readIndex])) {
      if (writeIndex !== readIndex) {
        array[writeIndex] = array[readIndex];
      }
      writeIndex++;
    }
  }
  array.length = writeIndex;
}
