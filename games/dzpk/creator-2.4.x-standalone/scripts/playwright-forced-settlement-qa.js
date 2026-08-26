async (page) => {
  const forcedSettlementSummary = await page.evaluate(() => {
    // Forced visual path only: stop live events before injecting a viewer-safe
    // source-shaped settlement. No deck/control/wallet fact enters the client.
    wNetWork.closeAuthenticatedConnection();
    const tableNode = cc.Canvas.instance.node.getChildByName('Game').children[0];
    const controller = tableNode.getComponent('DzpkTableGameController');
    const tableStateModel = controller.tableStateModel;
    const participantIds = tableStateModel.participants
      .slice(0, 4)
      .map((participant) => String(participant.participantId));
    const communityCards = [1401, 1302, 1203, 1104, 1001];
    tableStateModel.publicBoardCards = communityCards.slice();
    controller.tablePresentation.renderExistingCommunityCards(communityCards);

    const balanceByParticipant = {};
    tableStateModel.participants.forEach((participant) => {
      balanceByParticipant[String(participant.participantId)] = participant.stackChips;
      participant.isParticipating = true;
    });
    const forcedSettlement = {
      handId: 'forced-visual-only',
      revision: 999,
      actionSeq: 999,
      winner: participantIds[0],
      winners: [participantIds[0], participantIds[1], participantIds[2]],
      winnersByPot: [[participantIds[0], participantIds[1]], [participantIds[2]]],
      wingold: 150,
      upgold: {
        [participantIds[0]]: 150,
        [participantIds[1]]: 150,
        [participantIds[2]]: 200,
        [participantIds[3]]: 100
      },
      usergold: balanceByParticipant,
      time: 15,
      pots: [
        {
          index: 0,
          amount: 300,
          rake: 0,
          distributable: 300,
          uncalledReturn: false,
          winnerIds: [participantIds[0], participantIds[1]],
          awards: { [participantIds[0]]: 150, [participantIds[1]]: 150 }
        },
        {
          index: 1,
          amount: 200,
          rake: 0,
          distributable: 200,
          uncalledReturn: false,
          winnerIds: [participantIds[2]],
          awards: { [participantIds[2]]: 200 }
        },
        {
          index: 2,
          amount: 100,
          rake: 0,
          distributable: 100,
          uncalledReturn: true,
          winnerIds: [participantIds[3]],
          awards: { [participantIds[3]]: 100 }
        }
      ],
      uncalledReturns: { [participantIds[3]]: 100 },
      totalRake: 0,
      cards: {
        [participantIds[0]]: {
          hcards: [1404, 1304],
          cards: [1404, 1304, 1203, 1104, 1001],
          value: '80000000000'
        },
        [participantIds[1]]: {
          hcards: [1403, 1303],
          cards: [1403, 1303, 1203, 1104, 1001],
          value: '80000000000'
        },
        [participantIds[2]]: {
          hcards: [1204, 1202],
          cards: [1204, 1202, 1104, 1001, 1401],
          value: '20000000000'
        },
        [participantIds[3]]: {
          hcards: [904, 902],
          cards: [904, 902, 1401, 1302, 1203],
          value: '10000000000'
        }
      }
    };
    controller.presentationEpoch += 1;
    controller.presentationQueue = Promise.resolve();
    controller.lastSettlementFingerprint = '';
    controller.handleHandSettled(forcedSettlement);
    return {
      handId: forcedSettlement.handId,
      winnerCount: forcedSettlement.winners.length,
      potLayerCount: forcedSettlement.pots.length,
      uncalledReturnChips: forcedSettlement.uncalledReturns[participantIds[3]]
    };
  });

  await page.waitForFunction(() => {
    const tableNode = cc.Canvas.instance.node.getChildByName('Game').children[0];
    return tableNode.getChildByName('win').getChildByName('winlabel').active;
  }, null, { timeout: 15000 });
  await page.screenshot({
    path: 'output/playwright/forced-tie-sidepot-uncalled.png',
    type: 'png'
  });
  return forcedSettlementSummary;
}

