async (page) => {
  await page.evaluate(() => {
    window.__dzpkTwoHandQa = {
      privateDealCount: 0,
      resultCount: 0,
      latestHandId: '',
      resultSummaries: []
    };
    wGEvent.on('Msg_DZPK_FaCards', (sourceEnvelope) => {
      window.__dzpkTwoHandQa.privateDealCount += 1;
      if (sourceEnvelope && sourceEnvelope.data && sourceEnvelope.data.handId) {
        window.__dzpkTwoHandQa.latestHandId = String(sourceEnvelope.data.handId);
      }
    });
    wGEvent.on('Msg_DZPK_Result', (sourceEnvelope) => {
      const settlement = sourceEnvelope && sourceEnvelope.data ? sourceEnvelope.data : {};
      window.__dzpkTwoHandQa.resultCount += 1;
      window.__dzpkTwoHandQa.latestHandId = String(settlement.handId || '');
      window.__dzpkTwoHandQa.resultSummaries.push({
        handId: String(settlement.handId || ''),
        winnerCount: Array.isArray(settlement.winners) ? settlement.winners.length : 0,
        potLayerCount: Array.isArray(settlement.pots) ? settlement.pots.length : 0,
        hasUncalledReturn: Array.isArray(settlement.pots)
          && settlement.pots.some((potLayer) => potLayer.uncalledReturn === true)
      });
    });
  });

  const capturedBoardCounts = new Set();
  const capturedResultCounts = new Set();
  const actionClicks = [];
  const qaDeadline = Date.now() + 150000;

  while (Date.now() < qaDeadline) {
    const browserState = await page.evaluate(() => {
      const canvasNode = cc.Canvas.instance.node;
      const tableNode = canvasNode.getChildByName('Game').children[0];
      const controller = tableNode && tableNode.getComponent('DzpkTableGameController');
      if (!controller) return { controllerMounted: false };
      const tableStateModel = controller.tableStateModel;
      const actionNotice = tableStateModel.currentActionNotice;
      const viewerParticipant = tableStateModel.viewerParticipant;
      const isViewerTurn = actionNotice
        && !Array.isArray(actionNotice)
        && viewerParticipant
        && String(actionNotice.uid) === String(viewerParticipant.participantId);
      let actionButtonCenter = null;
      if (isViewerTurn && !controller.isViewerActionSubmissionPending) {
        const bettingControls = tableNode.getChildByName('btn').getChildByName('bet');
        const callButton = bettingControls.getChildByName('btn_green');
        const checkButton = bettingControls.getChildByName('btn_rang');
        const activeActionButton = callButton.active ? callButton : checkButton.active ? checkButton : null;
        if (activeActionButton) {
          const worldBounds = activeActionButton.getBoundingBoxToWorld();
          const viewport = cc.view.getViewportRect();
          const canvasElement = document.querySelector('canvas');
          const pixelRatio = window.devicePixelRatio || 1;
          actionButtonCenter = {
            x: (viewport.x + (worldBounds.x + worldBounds.width / 2) * cc.view.getScaleX())
              / pixelRatio,
            y: (canvasElement.height
              - viewport.y
              - (worldBounds.y + worldBounds.height / 2) * cc.view.getScaleY())
              / pixelRatio
          };
        }
      }
      return {
        controllerMounted: true,
        stage: tableStateModel.sourceStageCode,
        boardCardCount: tableStateModel.publicBoardCards.length,
        viewerParticipantId: viewerParticipant ? String(viewerParticipant.participantId) : '',
        actionButtonCenter,
        resultCount: window.__dzpkTwoHandQa.resultCount,
        privateDealCount: window.__dzpkTwoHandQa.privateDealCount,
        resultSummaries: window.__dzpkTwoHandQa.resultSummaries.slice()
      };
    });

    if (!browserState.controllerMounted) throw new Error('DZPK semantic controller is unavailable');

    if (
      browserState.boardCardCount >= 3
      && !capturedBoardCounts.has(browserState.boardCardCount)
    ) {
      capturedBoardCounts.add(browserState.boardCardCount);
      await page.screenshot({
        path: 'output/playwright/board-' + browserState.boardCardCount + '-cards.png',
        type: 'png'
      });
    }

    if (
      browserState.resultCount > 0
      && !capturedResultCounts.has(browserState.resultCount)
    ) {
      capturedResultCounts.add(browserState.resultCount);
      // Source Result arrives before the preserved animation queue completes.
      // Wait for the original winner amount node instead of guessing a delay.
      await page.waitForFunction(() => {
        const tableNode = cc.Canvas.instance.node.getChildByName('Game').children[0];
        const winnerAmountNode = tableNode
          && tableNode.getChildByName('win')
          && tableNode.getChildByName('win').getChildByName('winlabel');
        return Boolean(winnerAmountNode && winnerAmountNode.active);
      }, null, { timeout: 12000 });
      await page.screenshot({
        path: 'output/playwright/result-hand-' + browserState.resultCount + '.png',
        type: 'png'
      });
    }

    if (browserState.actionButtonCenter) {
      await page.mouse.click(
        browserState.actionButtonCenter.x,
        browserState.actionButtonCenter.y
      );
      actionClicks.push({
        atEpochMs: Date.now(),
        boardCardCount: browserState.boardCardCount
      });
      await page.waitForTimeout(350);
    }

    if (browserState.resultCount >= 2) {
      return {
        verdict: 'TwoHandsCompletedThroughOriginalButtons',
        privateDealCount: browserState.privateDealCount,
        resultCount: browserState.resultCount,
        actionClickCount: actionClicks.length,
        boardStatesCaptured: Array.from(capturedBoardCounts).sort(),
        resultSummaries: browserState.resultSummaries
      };
    }
    await page.waitForTimeout(400);
  }

  const timeoutState = await page.evaluate(() => window.__dzpkTwoHandQa);
  throw new Error('Two-hand browser QA timed out: ' + JSON.stringify(timeoutState));
}
