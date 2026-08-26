import { Component, Event, _decorator } from 'cc';

const { ccclass } = _decorator;

/**
 * Temporary serialized bridge for Checkpoint 01.
 *
 * Keeping the 2.4 semantic UUID and handler names lets Creator 3.8 upgrade the
 * original 321-node Prefab without deleting component bindings. Table behavior
 * is migrated in the next checkpoint; this class must not be treated as playable.
 */
@ccclass('DzpkTableGameController')
export class DzpkTableGameController extends Component {
  public requestFoldAction(_event?: Event): void { this.reportTableMigrationPending(); }
  public requestCallAction(_event?: Event): void { this.reportTableMigrationPending(); }
  public requestCheckAction(_event?: Event): void { this.reportTableMigrationPending(); }
  public openRaiseSelection(_event?: Event): void { this.reportTableMigrationPending(); }
  public closeRaiseSelection(_event?: Event): void { this.reportTableMigrationPending(); }
  public requestPreflopPresetByIndex(_event?: Event, _index?: string): void {
    this.reportTableMigrationPending();
  }
  public requestPostflopPresetByIndex(_event?: Event, _index?: string): void {
    this.reportTableMigrationPending();
  }
  public submitRaiseSelectionFromButton(_event?: Event, _index?: string): void {
    this.reportTableMigrationPending();
  }
  public handleRaiseSliderChanged(_event?: Event): void { this.reportTableMigrationPending(); }
  public toggleAutomaticActionSelection(_event?: Event, _index?: string): void {
    this.reportTableMigrationPending();
  }
  public handleUnavailableBankRequest(_event?: Event): void {
    this.reportTableMigrationPending();
  }
  public requestReturnToRoomSelection(_event?: Event): void {
    this.reportTableMigrationPending();
  }

  private reportTableMigrationPending(): void {
    console.warn('[DZPK 3.8] Table controller migration is pending Checkpoint 02');
  }
}
