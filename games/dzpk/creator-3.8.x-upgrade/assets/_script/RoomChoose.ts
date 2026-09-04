/**
 * 学习导读：原房间卡片会定时更换装饰图，本组件保留 70%/20%/10% 的随机权重。
 *
 * Cocos API 速查：`Sprite` 是显示图片的组件，`SpriteFrame` 是具体图片帧；`Enum` 让图片组类型出现在
 * Inspector；`schedule(callback, seconds)` 按组件生命周期每隔指定秒数调用一次，组件销毁后会自动停止。
 */
import { Component, Enum, Sprite, SpriteFrame, _decorator } from 'cc';

const { ccclass, property } = _decorator;

enum RoomImageSet {
  ImageSetOne = 1,
  ImageSetTwo = 2,
}
// 把普通 TypeScript 枚举登记进 Cocos 类型系统，Inspector 才能显示下拉选项。
Enum(RoomImageSet);

/** 按还原出的 70/20/10 权重轮换原版房间卡片图片。 */
@ccclass('RoomChoose')
export class RoomChoose extends Component {
  // 两组 SpriteFrame 都由原 Prefab 序列化；`type` 决定本卡片使用哪一组。
  @property([SpriteFrame]) public img1: SpriteFrame[] = [];
  @property([SpriteFrame]) public img2: SpriteFrame[] = [];
  @property({ type: RoomImageSet }) public type = RoomImageSet.ImageSetOne;

  private activeImageSet: SpriteFrame[] = [];

  /** 首次显示立刻选图，之后每 10 秒重新抽一次。 */
  protected start(): void {
    this.activeImageSet = this.type === RoomImageSet.ImageSetTwo ? this.img2 : this.img1;
    this.selectWeightedRoomImage();
    this.schedule(this.selectWeightedRoomImage, 10);
  }

  /**
   * 使用箭头函数固定 `this`，schedule 稍后回调时仍指向当前组件实例。
   * 这里只控制装饰图，不影响房间概率、牌局或资金。
   */
  private readonly selectWeightedRoomImage = (): void => {
    if (this.activeImageSet.length === 0) return;
    const randomPercent = Math.floor(Math.random() * 100) + 1;
    const imageIndex = randomPercent < 70 ? 0 : randomPercent < 90 ? 1 : 2;
    const roomSprite = this.getComponent(Sprite);
    if (roomSprite) roomSprite.spriteFrame = this.activeImageSet[imageIndex] ?? this.activeImageSet[0];
  };
}
