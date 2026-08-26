import { Component, Enum, Sprite, SpriteFrame, _decorator } from 'cc';

const { ccclass, property } = _decorator;

enum RoomImageSet {
  ImageSetOne = 1,
  ImageSetTwo = 2,
}
Enum(RoomImageSet);

/** Rotates the original room-card art with the recovered 70/20/10 weights. */
@ccclass('RoomChoose')
export class RoomChoose extends Component {
  @property([SpriteFrame]) public img1: SpriteFrame[] = [];
  @property([SpriteFrame]) public img2: SpriteFrame[] = [];
  @property({ type: RoomImageSet }) public type = RoomImageSet.ImageSetOne;

  private activeImageSet: SpriteFrame[] = [];

  protected start(): void {
    this.activeImageSet = this.type === RoomImageSet.ImageSetTwo ? this.img2 : this.img1;
    this.selectWeightedRoomImage();
    this.schedule(this.selectWeightedRoomImage, 10);
  }

  private readonly selectWeightedRoomImage = (): void => {
    if (this.activeImageSet.length === 0) return;
    const randomPercent = Math.floor(Math.random() * 100) + 1;
    const imageIndex = randomPercent < 70 ? 0 : randomPercent < 90 ? 1 : 2;
    const roomSprite = this.getComponent(Sprite);
    if (roomSprite) roomSprite.spriteFrame = this.activeImageSet[imageIndex] ?? this.activeImageSet[0];
  };
}
