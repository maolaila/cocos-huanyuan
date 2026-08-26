import { Component, Label, Node, SpriteAtlas, _decorator } from 'cc';

const { ccclass, property } = _decorator;

/** Serialized field bridge; visual behavior is migrated in Checkpoint 02. */
@ccclass('DzpkTablePresentation')
export class DzpkTablePresentation extends Component {
  @property(Node) public opponentWaitingTipNode: Node | null = null;
  @property(Node) public participantSeatRootNode: Node | null = null;
  @property(Label) public totalPotLabel: Label | null = null;
  @property(Node) public collectedPotNode: Node | null = null;
  @property(SpriteAtlas) public cardSpriteAtlas: SpriteAtlas | null = null;
  @property(SpriteAtlas) public handCategorySpriteAtlas: SpriteAtlas | null = null;
}
