Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = undefined;
(function (t) {
  var e;
  t.ViewConfig = {
    AccountLogin: "Prefab/AccountLogin",
    Register_RetrievePow: "Prefab/Register_RetrievePow",
    AllAccount: "Prefab/AllAccount",
    LoginCheck: "Prefab/LoginCheck",
    SetPlayerInfo: "Prefab/SetPlayerInfo",
    SoundOnOff: "Prefab/SoundOnOff",
    SetHead: "Prefab/SetHead",
    BankCheck: "Prefab/BankCheck",
    Bank: "Prefab/Bank",
    ChangeBindPhone: "Prefab/ChangeBindPhone",
    MaintainGame: "Prefab/MaintainGame",
    HotUpDateGame: "Prefab/HotUpDateGame",
    GiveEvidence: "Prefab/GiveEvidence",
    Mail: "Prefab/Mail",
    MailDetails: "Prefab/MailDetails",
    Ranking: "Prefab/Ranking",
    SignIn: "Prefab/SignIn",
    Privilege: "Prefab/Privilege",
    PrivilegeShop: "Prefab/PrivilegeShop",
    PrivilegeHelp: "Prefab/PrivilegeHelp",
    PopUpNotice: "Prefab/PopUpNotice",
    PlayerCheck: "Prefab/PlayerCheck",
    Agent: "Agent/Agent",
    AReceiveRecord: "Agent/AReceiveRecord",
    APlayerInfo: "Agent/APlayerInfo",
    ChangeGuns: "Game/BUYU/ChangeGuns/ChangeGuns",
    BUYUSet: "Game/BUYU/BUYUSet/BUYUSet",
    GamePlayerList: "Game/prefab/GamePlayerList",
    GuestTips: "UICommon/GuestTips",
    GameExitTips: "UICommon/GameExitTips",
    UserAgreement: "UICommon/UserAgreement",
    Knapsack: "Prefab/Knapsack",
    PopUpNoticeTips: "Prefab/PopUpNoticeTips",
    Service: "Prefab/Service",
    WEB: "Prefab/WEB",
    RankTips: "Prefab/RankTips",
    quit_game: "Prefab/QuitGame"
  };
  (function (t) {
    t[t.FISHING = 1] = "FISHING";
    t[t.POKER = 2] = "POKER";
    t[t.MULTI = 3] = "MULTI";
    t[t.ARCADE = 4] = "ARCADE";
    t[t.CASUAL = 5] = "CASUAL";
  })(e = t.RoomType || (t.RoomType = {}));
  (function (t) {
    t.H = "横屏游戏";
    t.V = "竖屏游戏";
  })(t.SCREEN_DIR || (t.SCREEN_DIR = {}));
  t.GamePrefab = {
    10: {
      type: e.FISHING,
      prefabUrl: "prefab/XLDBMain",
      zhName: "寻龙夺宝",
      enName: "XLDB",
      music: "sound/game_Fish_bgMusic_01",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(0, 360)
    },
    11: {
      type: e.FISHING,
      prefabUrl: "prefab/LKBYMain",
      zhName: "李逵劈鱼",
      enName: "LKPY",
      music: "sound/bgm/room",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(0, 360)
    },
    12: {
      type: e.FISHING,
      prefabUrl: "prefab/JCBYMain",
      zhName: "金蟾捕鱼",
      enName: "JCBY",
      music: "sound/bgm/buyuBgMusic1",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(0, 360)
    },
    13: {
      type: e.FISHING,
      prefabUrl: "prefab/DNTGMain",
      zhName: "大闹天宫",
      enName: "DNTG",
      music: "sound/bgm/bgm1",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(0, 360)
    },
    3: {
      type: e.MULTI,
      prefabUrl: "prefab/HBSLMain",
      zhName: "红包扫雷",
      enName: "HBSL",
      music: "sound/bgm",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 300),
      noticePos2: cc.v2(0, 530),
      dir: t.SCREEN_DIR.H
    },
    1: {
      type: e.MULTI,
      prefabUrl: "prefab/FQZSMain",
      zhName: "飞禽走兽",
      enName: "FQZS",
      music: "sound/BACK_GROUND",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 315),
      noticePos2: cc.v2(0, 265)
    },
    2: {
      type: e.MULTI,
      prefabUrl: "prefab/BRNNMain",
      zhName: "百人牛牛",
      enName: "BRNN",
      music: "sound/BACK_GROUND",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(0, 295)
    },
    6: {
      type: e.MULTI,
      prefabUrl: "prefab/LHDMain",
      zhName: "龙虎斗",
      enName: "LHD",
      music: "sound/bg",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 250),
      noticePos2: cc.v2(-355, 270)
    },
    7: {
      type: e.MULTI,
      prefabUrl: "prefab/BCBMMain",
      zhName: "奔驰宝马",
      enName: "BCBM",
      music: "sound/BACK_GROUND",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 305),
      noticePos2: cc.v2(0, 250)
    },
    8: {
      type: e.MULTI,
      prefabUrl: "prefab/BJLMain",
      zhName: "百家乐",
      enName: "BJL",
      music: "sound/BACK_GROUND",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(-235, 295)
    },
    9: {
      type: e.MULTI,
      prefabUrl: "prefab/SDBMain",
      zhName: "十点半",
      enName: "SDB",
      music: "sound/bgm/BACK_GROUND",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 307),
      noticePos2: cc.v2(0, 355)
    },
    29: {
      type: e.MULTI,
      prefabUrl: "prefab/HLZZMain",
      zhName: "欢乐至尊",
      enName: "HLZZ",
      music: "sound/bgm",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 230),
      noticePos2: cc.v2(0, 355)
    },
    14: {
      type: e.POKER,
      prefabUrl: "prefab/QZNNMain",
      zhName: "抢庄牛牛",
      enName: "QZNN",
      music: "sound/bgm/bgm_bg",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(-195, 300)
    },
    15: {
      type: e.POKER,
      prefabUrl: "prefab/ERNNMain",
      zhName: "二人牛牛",
      enName: "ERNN",
      music: "sound/bgm/bgm_bg",
      table: true,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 285),
      noticePos2: cc.v2(-195, 300)
    },
    19: {
      type: e.POKER,
      prefabUrl: "prefab/DZPKMain",
      zhName: "德州扑克",
      enName: "DZPK",
      music: "sound/back",
      table: false,
      loadMaxSpeed: false,
      noticePos1: cc.v2(0, 294),
      noticePos2: cc.v2(-195, 300)
    },
    20: {
      type: e.POKER,
      prefabUrl: "prefab/ZJHMain",
      zhName: "炸金花",
      enName: "ZJH",
      music: "sound/0_BGM",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 294),
      noticePos2: cc.v2(0, 300)
    },
    21: {
      type: e.POKER,
      prefabUrl: "prefab/SRNNMain",
      zhName: "四人牛牛",
      enName: "SRNN",
      music: "sound/bgm/bgm_bg",
      table: true,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(-195, 300)
    },
    18: {
      type: e.POKER,
      prefabUrl: "prefab/TBNNMain",
      zhName: "通比牛牛",
      enName: "TBNN",
      music: "sound/bgm/bgm_bg",
      table: true,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(-195, 300)
    },
    16: {
      type: e.POKER,
      prefabUrl: "prefab/HLWZMain",
      zhName: "欢乐五张",
      enName: "HLWZ",
      music: "sound/bgm",
      table: true,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(-195, 300)
    },
    17: {
      type: e.POKER,
      prefabUrl: "prefab/ERQSGame",
      zhName: "二人雀神",
      enName: "ERQS",
      music: "sound/erqs_bg",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(-195, 300)
    },
    28: {
      type: e.POKER,
      prefabUrl: "prefab/WZMJMain",
      zhName: "温州麻将",
      enName: "WZMJ",
      music: "sound/bgm",
      table: true,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(-195, 300)
    },
    4: {
      type: e.MULTI,
      prefabUrl: "prefab/SLWHMain",
      zhName: "森林舞会",
      enName: "SLWH",
      music: "sound/bgm",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 230),
      noticePos2: cc.v2(0, 355)
    },
    22: {
      type: e.ARCADE,
      prefabUrl: "prefab/JXLWMain",
      zhName: "九线拉王",
      enName: "JXLW",
      music: "sound/music-tiger-bg",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(-138, 280)
    },
    23: {
      type: e.ARCADE,
      prefabUrl: "prefab/SHZMain",
      zhName: "水浒传",
      enName: "SHZ",
      music: "sound/sound_water_bg",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 262),
      noticePos2: cc.v2(0, 300)
    },
    26: {
      type: e.ARCADE,
      prefabUrl: "prefab/DFDCMain",
      zhName: "多福多财",
      enName: "DFDC",
      music: "sound/sound-bg",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(0, 365)
    },
    1e3: {
      zhName: "麻将合集",
      enName: "MJHJ",
      music: "sound/bgm/bgm1",
      table: false,
      loadMaxSpeed: true,
      noticePos1: cc.v2(0, 351),
      noticePos2: cc.v2(0, 360)
    }
  };
  t.local_Event = {
    login_Success: "login_Success",
    up_Gold: "up_Gold",
    up_Nickname: "up_Nickname",
    up_Head: "up_Head",
    up_HeadFrame: "up_HeadFrame",
    bind_Phone: "bind_Phone",
    bind_Agent: "bind_Agent",
    setGameBankBtn: "setGameBankBtn",
    mailHD: "MailHD",
    sginHD: "sginHD",
    up_Excard: "up_Excard",
    up_Mcard: "up_Mcard",
    changeTable: "changeTable"
  };
  t.colorSet = {
    ash: cc.color(140, 140, 140),
    white: cc.color(255, 255, 255)
  };
  t.NoTipsMsg = {
    Msg_Hall_GetBenefits: 1,
    Msg_Hall_QueryUserInfo: 1
  };
  t.NoLogMsg = {
    Msg_Hall_Heart: 1,
    Msg_Game_Jackpot: 1,
    Msg_Hall_HorseLamp: 1
  };
  t.DeBugGame = [22, 26, 23, 25, 24, 36, 38, 37, 39, 40];
})(exports.Config || (exports.Config = {}));