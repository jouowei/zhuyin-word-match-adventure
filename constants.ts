
import { ShopItem, WordItem, RewardCard, Lesson } from "./types";
import { LIBRARY_LESSONS } from "./lessons/library";

export const INITIAL_WORD_SET: WordItem[] = [
  { id: '1', character: '日', zhuyin: 'ㄖˋ', emoji: '☀️', matched: false },
  { id: '2', character: '月', zhuyin: 'ㄩㄝˋ', emoji: '🌙', matched: false },
  { id: '3', character: '水', zhuyin: 'ㄕㄨㄟˇ', emoji: '💧', matched: false }, 
  { id: '4', character: '火', zhuyin: 'ㄏㄨㄛˇ', emoji: '🔥', matched: false },
];

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'l1',
    title: '第一課：小船',
    content: '小船水上走，一左一右向前走。小船水上走，一二一，一二一，小魚也來加加油。',
    vocabulary: ['小船', '左右', '向前走', '小魚', '加油', '小', '船', '水', '上', '走', '左', '右', '前', '一', '二', '魚', '加', '油']
  },
  {
    id: 'l2',
    title: '第二課：印手印',
    content: '張開小手，印一印。印出小魚招招手，印出車子地上走，印出小花一朵朵。一朵朵小花，開在一張張笑臉上。',
    vocabulary: ['張開', '小手', '小魚', '招手', '車子', '地上', '小花', '笑臉', '開花', '開', '印', '手', '車', '地', '走', '花', '朵', '笑', '臉', '魚']
  },
  {
    id: 'l3',
    title: '第三課：吹泡泡',
    content: '吹泡泡，玩泡泡，大家一起吹泡泡，吹出好多小泡泡。吹泡泡，玩泡泡，我的泡泡，你的泡泡，泡泡好像在抱抱。',
    vocabulary: ['吹泡泡', '泡泡', '抱抱', '大家','吹', '泡', '玩',  '你', '我', '抱', '像', '多', '的']
  },
  {
    id: 'l4',
    title: '第四課：快樂的生活',
    content: '山想和我當朋友，我想和外星人當朋友。小金魚搖搖尾巴，吐著泡泡說：我也要跟你們一起玩，天天幸福又快樂。',
    vocabulary: ['朋友', '外星人', '金魚', '幸福','快樂', '尾巴', '泡泡',  '你們', '一起玩', '山', '想', '我', '友', '星', '魚', '吐', '福', '樂', '快']
  },
  {
    id: 'l5',
    title: '第五課：你好',
    content: '我跟爸爸到山上玩，在青青的山上，我大叫：「你好！」。一下子，山的那頭也大叫：「你好！」。山想和我玩，我要和他做朋友。',
    vocabulary: ['爸爸', '山上', '你好', '一下子','大叫', '做朋友', '爸',  '大叫', '叫', '下', '那', '頭', '想', '和', '要', '他', '要', '做', '朋']
  },
  {
    id: 'l6',
    title: '第六課：外星人',
    content: '外星人，你住在哪個星球？ 我們這裡有的，你們那裡有沒有？ === 我們住的是地球，你們住在什麼球？ 有沒有青山？有沒有河流？',
    vocabulary: ['哪個','星球','外', '人', '住',  '球', '住',  '哪', '有', '我們', '地球', '地', '球', '青山', '河流', '河', '流']
  },
  // 一、二年級的短文 (written for this app)
  ...LIBRARY_LESSONS,
];


export const FALLBACK_DICTIONARY: { character: string; zhuyin: string; emoji: string }[] = [];

export const VOCABULARY_LIST: string[] = [];

export const ZHUYIN_VOCABULARY: string[] = [
  'ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', 
  'ㄍ', 'ㄎ', 'ㄏ', 'ㄐ', 'ㄑ', 'ㄒ', 'ㄓ', 'ㄔ', 
  'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ', 'ㄚ', 'ㄛ', 'ㄜ', 
  'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ', 'ㄢ', 'ㄣ', 'ㄤ', 
  'ㄥ', 'ㄦ', 'ㄧ', 'ㄨ', 'ㄩ'
];

export const INITIAL_SHOP_ITEMS: ShopItem[] = [
  { id: 'gift1', name: '神秘糖果', cost: 50, emoji: '🍬', description: '一顆甜甜的虛擬糖果', purchased: false },
  { id: 'gift2', name: '玩具機器人', cost: 100, emoji: '🤖', description: '嗶嗶啵啵！機器人好朋友', purchased: false },
  { id: 'gift3', name: '彩虹獨角獸', cost: 200, emoji: '🦄', description: '傳說中的魔法寵物', purchased: false },
  { id: 'gift4', name: '太空火箭', cost: 300, emoji: '🚀', description: '飛向宇宙，浩瀚無垠！', purchased: false },
  { id: 'gift5', name: '皇冠', cost: 500, emoji: '👑', description: '你是最棒的小國王/女王', purchased: false },
];

/**
 * 圖片設定說明：
 * 已將路徑指向 public/cards/ 下的對應 jpg 檔案。
 * 如果檔案名稱不同 (例如是 .png)，請修改下方的 imageUrl 副檔名。
 */
export const REWARD_CARDS: RewardCard[] = [
  { id: 'c16', title: '抱抱充電卡', emoji: '🐻', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczPr9x2zvtjsXknrKO08y0oMHeAZX88qD2aSAbTC0M3YX-A8xCIdguUaVHlusg9r5Pia6XRk99PZii1aTjh_6CPq02jMtPD5VepyfhIoBz1RFoWwM2dZiFeZafvaqmiK7FH_wEqmxDHSQXEI6TtOXvIQ5w=w600-h327-s-no-gm?authuser=0', description: '當生氣或難過時使用，爸媽必須暫停說教，給個10秒擁抱。', color: 'bg-orange-200', cost: 100 },
  { id: 'c14', title: '故事點播機', emoji: '📖', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczPg8d9BBHdRHMj7xW_8FHgQAOvYYXOKK5i-Sj7O55C3kuIGbgVLWmAaaGvEzSpldv24FEX5-F6e_zFW7Iuo7scLIDAwplicn2uPCs7Uw3Pkcnx0OcpuZPi3soqN1CaTGfNpVAfQgfqIS9YBg9SlPnbK7A=w600-h327-s-no-gm?authuser=0', description: '指定爸媽講一個「特定主題」的故事。', color: 'bg-rose-100', cost: 200 },
  { id: 'c10', title: '追風騎士卡', emoji: '🚲', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczPWAJDQ3v3rINrCZ_PuSJIo1tOfB7voImwupMCimb218612o6EVnkaKGKCZpa8EM6I3_cK1I_8oQQDcf4LA5nqNo5ggfxCZ2sSgofDkVYIRqzC3EgB2S3D_q9GxdW3Q3HuZwDXIZBrhQ4qbkrjJ5kXCgw=w600-h327-s-no-gm?authuser=0', description: '發動騎士任務！立刻帶上腳踏車出門騎30分鐘。', color: 'bg-teal-100', cost: 300 },
  { id: 'c6', title: '人力計程車', emoji: '🚕', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczPc6lS4ZXQqtAheyGdHGSwM8Lo-SYuLgYtPrvTMZWTxqzlUjBW6kUniI_hoCYoI1BCwVxySf7wvEPXIPXqGzv9PPcAfGJpOwJjUY5-4SLaSFIULNn2d5_483Sjfal1zZMndNM2LNA3nwKduNmHmu3FIsA=w600-h327-s-no-gm?authuser=0', description: '從客廳到房間，爸爸必須背著或抱著移動。', color: 'bg-green-100', cost: 400 },
  { id: 'c8', title: '派對DJ卡', emoji: '🎧', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczNV7mJDqVGLWBUUmL2T1ymuFOXBcciUp6EahidEaetOvTT3-645JjkfixglJX-6NBC6p-7lCZt8OCwG4OFcw5Tej29felDJ2jjKzGBRlRLz_Z7OzTzOocgQfqD8ST5SLTbTdveNnv_Vm85N7W48zPX8DQ=w600-h327-s-no-gm?authuser=0', description: '獲得音樂控制權！可以在車上播放指定的歌單。', color: 'bg-purple-100', cost: 300 },
  { id: 'c15', title: '睡衣整天卡', emoji: '👚', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczO-kRZtavzjPNq4odgT_9dfsMCcm_jPO-ecZPIhzyi9Z5N1RWA-Q9PJFja93RXRNdmdbr-tOusp2DHQQY6xrVXCI30deGAmChe20QJgP18GxBXJRdzL0dkzeXHfu0wEkXo-4v1sKJRGReuYLU9Givol3g=w600-h327-s-no-gm?authuser=0', description: '假日限定！如果不出門，可以一整天穿著睡衣。', color: 'bg-blue-200', cost: 300 },
  { id: 'c13', title: '秘密基地券', emoji: '⛺', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczNX5n-pMwgZCMxyRGyUiYKRwl9GjZMWs81KYqmGrAwsD0p4zkQ9K3-TeltdNORd4eL5IP2EhK8IjonwKd4O5ZeWFBR0vFjmt6guKaSuIGqx2OeFx-oQOr1dy6HbxyFGlNCj3vRgaDLTCE8ccPydEWDAPg=w600-h327-s-no-gm?authuser=0', description: '准許把客廳椅子棉被搬出來蓋堡壘，維持2小時不用收。', color: 'bg-stone-100', cost: 400 },
  { id: 'c1', title: '爸爸召喚術', emoji: '🦸‍♂️', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczM68KEMddXN11iP8umJdiICdoFc9dUWV2IN9Aj-fZSL5iIIArXUgiCsQmePclzvrWVqHuDr3c70W1rMykqxBtcuuSC6QE6znbWM0QTwDNNkEPXQ_hzjWVHRO1JbCSgarGXrcGTRLpKTReOjqZ17YwuTGQ=w600-h327-s-no-gm?authuser=0', description: '無視爸爸在做什麼，必須放下手機陪玩15分鐘。', color: 'bg-blue-100', cost: 500 },
  { id: 'c12', title: '鬼抓人召喚', emoji: '👻', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczPGxMK7-05wziOZlt18Gq2u72sskvLEpnkJMQ5cEJSSWxTbUhB9uXmjhmsTUNV0T5-ql-K7hJuq_jr_dafITvhk8DTuDrLqFkdY_cBc1e6MRQh0uVOxc5K_KMW6SSehd6QFNTs3Uha4mrMwSnZF4bM1jQ=w600-h327-s-no-gm?authuser=0', description: '爸媽必須放下手邊工作，帶孩子去公園玩鬼抓人。', color: 'bg-red-100', cost: 500 },
  { id: 'c2', title: '時光暫停卡', emoji: '⏳', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczOLIs4HYLnuosAN2m1XXAeUU_iu9abiEZx5pQ1hPoinatc9sSTo0ralKZoVskYhfn6G09zOZtbj90EMAvyCG1GCXU6opEfzS_IgEOWeRJdidMzx2v2aePJaybyHOKmY_jV8TemKobne8A009gddc1H9PQ=w600-h327-s-no-gm?authuser=0', description: '當爸媽說時間到了要關電視時，可續命5分鐘。', color: 'bg-indigo-100', cost: 600 },
  { id: 'c17', title: '家事防護罩', emoji: '🛡️', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczPdKGqK5UibSx5iHtewvJLre7HcLn4Fsq8HZyUU021ysC3cABw_QPP9G7NJOna16z2Q6U04aBlgnCDFTupLrOd7Gt-fkwVCo8iZgjRkaqnf82glSChpzkOpWisoAj_5hZ53Dg5ppCw3e-hO0vhdvDX0Fg=w600-h327-s-no-gm?authuser=0', description: '當被分配到不想做的小任務時，可以抵銷一次。', color: 'bg-cyan-100', cost: 600 },
  { id: 'c7', title: '卡通放送券', emoji: '📺', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczN34GGeEuXCufVoKsgbcDM03Om5XhWOT9o7Ko6ITujTXhUWuHOOWRH7Qz7vvOlLrGRNjpODWbuHQA90NKuuD3I6w-bYkAHG2KHeTlZCeYUebO2G7egcG9_o16UWe0qEwDwjf-tH3mSdzfYWGLs7zt7TOw=w600-h327-s-no-gm?authuser=0', description: '可以在非原本約定的時間，額外獲得觀看一集卡通的權利。', color: 'bg-sky-100', cost: 800 },
  { id: 'c18', title: '深夜探險家', emoji: '🔦', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczOiLtzwpkycgalrFpi72ShoDHN4AB7Yp0F4P1AgYVqdA9xvqfRAJH7IYcGqxvXtsDVBBgdameY-rERNInxnmUB6TIj622ClFLs7s5cQhF_18FOTvHupBukSS2gVqRxhzDY--L2zQzxId_rWTtPPsZUuwg=w600-h327-s-no-gm?authuser=0', description: '週五或週六晚上，可以比平常晚30分鐘睡覺。', color: 'bg-indigo-200', cost: 800 },
  { id: 'c41', title: '飲料自由卡', emoji: '🍪', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczMFPoMF1y-cObBWJfPw3z_hYD1mkw1SPjecdZd9sOaY6dfPhr9UUTeX_-hCMI0WybVzju-UrMWzeswfZa_OjfVRI8-U3lcqs45nB2-B4iwR680Jg2kbTR6zvdEagm9TnHXuYVcm0TLk5B-Yt7fIkuEP-w=w600-h327-s-no-gm?authuser=0', description: '去超市時，可以自己挑選一樣30元以內的飲料。', color: 'bg-orange-100', cost: 800 },
  { id: 'c42', title: '餅乾自由卡', emoji: '🍪', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczMemHhSVErbSDgxS3aUTyWoOSZB1gMBOS6VN73qeblIbQsqZO0ZkyJubIeFB8NR7ooAftWF955orLLqYjM70cBF19-hOPYXqH_FxuPNkR2Ckn9RmbGxpQTPDYC-15ET52ZJaToLSP1nosgYUkAOfCT20Q=w600-h327-s-no-gm?authuser=0', description: '去超市時，可以自己挑選一樣30元以內的餅乾。', color: 'bg-orange-100', cost: 800 },
  { id: 'c43', title: '糖果自由卡', emoji: '🍪', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczOZOyMkxCdO1MJvX0SW5cU1tu-GT0-UTitS1en930Ih8iTNqUacS5LPl0kZfjbRv0LY19TA97nVa_01qx-sevqxVRIjIcAmOTrUPje3hlOx-Nwl4nxhNHh9TZv7nmVM0BIRRBpw9hpIhpjeTBPoT7w5Wg=w600-h327-s-no-gm?authuser=0', description: '去超市時，可以自己挑選一樣30元以內的糖果。', color: 'bg-orange-100', cost: 800 },
  { id: 'c5', title: '國王的晚餐', emoji: '👑', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczME20GcFcuYiItuCSEzN3aAXREzQPI3nt11-LdmMUPIvoC4fZG_YYsiWku9IDo8iXtjUUmwD65NETAyRtA4hJ0lZL2bap2NfpiFzof6BkZS1fath8aErnisUJsuAsygTyuG-XrL9IVK2tIfCYvDGf-O5Q=w600-h327-s-no-gm?authuser=0', description: '今晚吃什麼由持卡人決定，爸媽不能反對。', color: 'bg-yellow-100', cost: 1000 },
  { id: 'c3', title: '冰淇淋召喚卡', emoji: '🍦', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczPx3NrznHuSVpuHILqHRdezmHHETzlq3ojHmLJ3Cii4s0hv4riAEww_9m1PIN8xmZoDyyITkYg5I7SRs8FOWluRXXHKBNk4t0Tr2V2MAQuaLMhQkJbQJnHJG8csH8dZUBtoUcJPL87mbMOe7r8Pd39CsA=w600-h327-s-no-gm?authuser=0', description: '可以立刻去買一支冰淇淋(或家裡庫存)。', color: 'bg-pink-100', cost: 1200 },
  { id: 'c9', title: '傳說訓練家', emoji: '🐹', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczOFOFR2xGsfTJNebhQEWSfgd4882FvUizCMnn0v2L2fKT-B7krPerRBfe_EzN9DqZRcL4A5BZR8swYfSW3Pj0coRJjl4c6e42_5dvtILT49SforURFEiBsn003iiGoCsOr5lNiiGZP53vsCVfIo_iq4Og=w600-h327-s-no-gm?authuser=0', description: '爸媽必須帶去有寶可夢機臺的地方，讓你玩一次。', color: 'bg-amber-100', cost: 1500 },
  { id: 'c11', title: '空白魔法書', emoji: '📜', imageUrl: 'https://lh3.googleusercontent.com/pw/AP1GczPR1S4CU5-qUYPmgS3WrLE-CeZ8RedQvjFOCY0h1XOajfYPMChWi4RnwML7_7GBiuHy-bvH2vfGPtgT0RDBPyHyNf_Zv1zehunJb4ecWntqismoJAsbNNq47GRveY1nZM3tcuxDtFsv4Nh1Vc-YFw9Z0g=w600-h327-s-no-gm?authuser=0', description: '寫下一個其他卡片沒有的特權，並向爸媽許願。', color: 'bg-gray-100', cost: 2000 },
];
