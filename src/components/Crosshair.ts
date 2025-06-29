/**
 * クロスヘア（照準）のUIコンポーネント
 */
export class CrosshairUI {
  private element: HTMLElement;

  constructor(container: HTMLElement) {
    this.element = this.createCrosshair();
    container.appendChild(this.element);
  }

  private createCrosshair(): HTMLElement {
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      pointer-events: none;
      z-index: 1000;
    `;

    // 中央の点
    const center = document.createElement('div');
    center.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 2px;
      height: 2px;
      background-color: #00ffff;
      border-radius: 50%;
      box-shadow: 0 0 4px #00ffff, 0 0 2px #ffffff;
    `;

    // 上の線
    const top = document.createElement('div');
    top.style.cssText = `
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 1px;
      height: 6px;
      background-color: #00ffff;
      box-shadow: 0 0 2px #00ffff;
    `;

    // 下の線
    const bottom = document.createElement('div');
    bottom.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 1px;
      height: 6px;
      background-color: #00ffff;
      box-shadow: 0 0 2px #00ffff;
    `;

    // 左の線
    const left = document.createElement('div');
    left.style.cssText = `
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 1px;
      background-color: #00ffff;
      box-shadow: 0 0 2px #00ffff;
    `;

    // 右の線
    const right = document.createElement('div');
    right.style.cssText = `
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 1px;
      background-color: #00ffff;
      box-shadow: 0 0 2px #00ffff;
    `;

    crosshair.appendChild(center);
    crosshair.appendChild(top);
    crosshair.appendChild(bottom);
    crosshair.appendChild(left);
    crosshair.appendChild(right);

    return crosshair;
  }

  /**
   * クロスヘアの表示/非表示を切り替え
   */
  setVisible(visible: boolean): void {
    this.element.style.display = visible ? 'block' : 'none';
  }

  /**
   * クロスヘアの色を変更
   */
  setColor(color: string): void {
    const elements = this.element.querySelectorAll('div');
    elements.forEach(el => {
      (el as HTMLElement).style.backgroundColor = color;
      (el as HTMLElement).style.boxShadow = `0 0 4px ${color}, 0 0 2px #ffffff`;
    });
  }

  /**
   * クロスヘアを削除
   */
  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}