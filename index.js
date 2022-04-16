import Qieyun from 'qieyun';

const schemas = {};

/**
 * 查詢字頭的擬音。
 * @param {string | string[]} schema 推導方案或推導方案陣列
 * @param {string} 字頭 要查詢的字頭
 * @param {Object=} 選項 選項（可選）
 * @return {{音韻地位: Qieyun.音韻地位, 解釋: string, 擬音: string | string[]}[]} 音韻地位、解釋、音韻地位對應的擬音或擬音陣列
 */
export function from字頭(schema, 字頭, 選項) {
  return Qieyun.資料.query字頭(字頭).map(result => ({
    ...result,
    擬音: schema.map
      ? schema.map(schema => schemas[schema](result.音韻地位, result.字頭, 選項))
      : schemas[schema](result.音韻地位, result.字頭, 選項),
  }));
}

schemas.tupa = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
// 注意：切韻拼音各選項僅適用於處理其他資料來源的音韻地位時
// 推導器所用預設資料採用已經正則化的音系分析，故在推導器下各選項均無效果差別
if (!音韻地位) return [
  // 嚴格：僅允許正則地位
  // 標準：允許部分非正則地位（推導為對應的正則地位），不允許無法自動正則化的聲韻搭配
  // 寬鬆：允許非正則地位，無法自動正則化的聲韻搭配保持原樣
  ['模式', [1, '嚴格', '標準', '寬鬆']],
  // 僅在「標準」「寬鬆」模式下有效，脣音咍韻推導為開口
  ['脣音咍韻歸灰韻', true],
];

const is = (...x) => 音韻地位.屬於(...x);

// 正則化之前需保留該信息
const is脣音咍韻 = is`脣音 咍韻`;

const 正則化 = {
  標準: 'v2',
  寬鬆: 'v2lenient',
}[選項.模式] || 'v2Strict';
音韻地位 = Qieyun.適配分析體系[正則化](音韻地位);

// 恢復脣音咍韻信息
if (is脣音咍韻 && !選項.脣音咍韻歸灰韻) {
  音韻地位 = 音韻地位.調整({ 韻: '咍' });
}

function get聲母() {
  return {
    幫: 'p',  滂: 'ph',  並: 'b',  明: 'm',
    端: 't',  透: 'th',  定: 'd',  泥: 'n',  來: 'l',
    知: 'tr', 徹: 'trh', 澄: 'dr', 孃: 'nr',
    見: 'k',  溪: 'kh',  羣: 'g',  疑: 'ng', 云: '',
    影: 'q',  曉: 'h',   匣: 'gh',
    精: 'ts',  清: 'tsh',  從: 'dz',  心: 's',  邪: 'z',
    莊: 'tsr', 初: 'tsrh', 崇: 'dzr', 生: 'sr', 俟: 'zr',
    章: 'tj',  昌: 'tjh',  常: 'dj',  書: 'sj', 船: 'zj', 日: 'nj', 以: 'j',
  }[音韻地位.母];
}

function get韻() {
  // 爲了方便推導，對韻類稍作調整
  return 音韻地位.判斷([
    ['蒸韻 (重紐B類 或 幫組 或 合口)', '冰'],
    ['東韻 三等', '終'],
    ['清韻', '庚'],
    ['陽韻', '唐'],
    ['莊組 臻韻', '眞'],
    ['', 音韻地位.韻],
  ]);
}

function get韻母() {
  const 韻到韻尾 = [
    ['脂之尤侯 　佳　模　 支魚虞 麻歌', ''],
    ['冰蒸終東 青耕登冬江 　　鍾 庚唐', 'ng', 'k'],
    ['　微微　 齊皆咍灰　 祭廢廢 夬泰', 'j'],
    ['眞欣文　 先山痕魂　 仙元元 刪寒', 'n', 't'],
    ['幽　　　 蕭　　　　 宵　　 肴豪', 'w'],
    ['侵　　　 添咸　覃　 鹽嚴凡 銜談', 'm', 'p'],
  ];
  const 元音列表 = [
    'i',       'y',  'u', 'ou',
    'e', 'ee', 'eo', 'o', 'oeu',
    'e',       'yo', 'uo',
         'ae', 'a',
  ];

  let 韻 = get韻();
  let 元音;
  let 韻尾;
  韻到韻尾.some((item) => {
    if (item[0].includes(韻)) {
      元音 = 元音列表[item[0].replace(/ /g, '')[is`開口` ? 'indexOf' : 'lastIndexOf'](韻)];
      韻尾 = item[1 + is`入聲`];
      return true;
    }
  });

  // 添加三等 C 介音（僅歌陽韻需要處理）
  if (is`三等` && 元音 === 'a') {
    // 重紐A類用於𩦠小韻
    元音 = (is`脣音 重紐A類` ? 'i' : is`開口` ? 'y' : 'u') + 元音;
  }
  // 添加三等 A、B 介音
  if (is`三等` && ['i', 'e', 'ae'].includes(元音)) {
    if (is`重紐B類 或 云母 或 莊組 或 庚蒸韻 或 幽韻 幫組`) {
      元音 = (is`合口` ? 'u' : 'y') + 元音;
    } else if (元音 !== 'i') {
      // 拼莊組以外的銳音一律視爲 A 類（同《切韻》清韻、《廣韻》諄韻的獨立條件）
      元音 = 'i' + 元音;
    }
  }
  // 添加合口介音
  if (is`合口` && !['u', 'o'].includes(元音[0])) {
    元音 = 'w' + 元音;
  }
  return 元音 + 韻尾;
}

function get聲調() {
  return { 上: 'q', 去: 'h' }[音韻地位.聲] || '';
}

return get聲母() + get韻母() + get聲調();
});

/**
 * 切韻拼音
 *
 * https://zhuanlan.zhihu.com/p/478751152
 *
 * @author unt
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的切韻拼音
 */
export function tupa(音韻地位, 字頭, 選項) {
  return schemas.tupa(音韻地位, 字頭, 選項);
}

schemas.baxter = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
if (!音韻地位) return [
  // 版本可選 '1992' 或 '2014'，預設值為 '2014'
  ['版本', [2, '1992', '2014']],
];

const is = (...x) => 音韻地位.屬於(...x);

let 聲母 = {
  幫: 'p',   滂: 'ph',   並: 'b',   明: 'm',
  端: 't',   透: 'th',   定: 'd',   泥: 'n',  來: 'l',
  知: 'tr',  徹: 'trh',  澄: 'dr',  孃: 'nr',
  精: 'ts',  清: 'tsh',  從: 'dz',                     心: 's',  邪: 'z',
  莊: 'tsr', 初: 'tsrh', 崇: 'dzr',                    生: 'sr', 俟: 'zr',
  章: 'tsy', 昌: 'tsyh', 常: 'dzy', 日: 'ny',          書: 'sy', 船: 'zy', 以: 'y',
  見: 'k',   溪: 'kh',   羣: 'g',   疑: 'ng',
  影: "'",   曉: 'x',    匣: 'h',                                          云: 'h',
}[音韻地位.母];

if (選項.版本 === '1992' && 聲母 === "'") {
  聲母 = 'ʔ';
}

let 韻母 = {
  // 一等韻
  東: 'uwng',
  冬: 'owng',
  模: 'u',
  泰: 'aj',
  灰: 'oj',
  咍: 'oj',
  魂: 'on',
  痕: 'on',
  寒: 'an',
  豪: 'aw',
  歌: 'a',
  唐: 'ang',
  登: 'ong',
  侯: 'uw',
  覃: 'om',
  談: 'am',

  // 二等韻
  江: 'aewng',
  佳: 'ea',
  皆: 'eaj',
  夬: 'aej',
  刪: 'aen',
  山: 'ean',
  肴: 'aew',
  麻: 'ae',
  庚: 'aeng',
  耕: 'eang',
  咸: 'eam',
  銜: 'aem',

  // 四等韻
  齊: 'ej',
  先: 'en',
  蕭: 'ew',
  青: 'eng',
  添: 'em',

  // 三等陰聲韻
  支: 'je',
  脂: 'ij',
  之: 'i',
  微: 'j+j',
  魚: 'jo',
  虞: 'ju',
  祭: 'jej',
  廢: 'joj',
  宵: 'jew',
  // 歌: 'ja',
  // 麻: 'jae',
  尤: 'juw',
  幽: 'jiw',

  // 三等陽聲韻
  // 東: 'juwng',
  鍾: 'jowng',
  眞: 'in',
  臻: 'in',
  文: 'jun',
  欣: 'j+n',
  元: 'jon',
  仙: 'jen',
  陽: 'jang',
  // 庚: 'jaeng',
  清: 'jeng',
  蒸: 'ing',
  侵: 'im',
  鹽: 'jem',
  嚴: 'jaem',
  凡: 'jom',
}[音韻地位.韻];

// 東歌麻庚韻同時含三等與非三等，上文僅處理非三等，此處處理三等
if (is`東歌麻庚韻 三等`) {
  韻母 = 'j' + 韻母;
}

if (選項.版本 === '1992') {
  if (韻母 === 'ea') 韻母 = 'ɛɨ';
  韻母 = 韻母.replace('+', 'ɨ').replace('ae', 'æ').replace('ea', 'ɛ');
}

// 章組或日以母只與三等韻相拼，省去韻母起始的 j
if (is`章組 或 日以母` && 韻母.startsWith('j')) {
  韻母 = 韻母.slice(1);
}

// 重紐 A 類添加 j 或 i
if (is`(重紐A類 非 陽韻) 或 (清韻 ${Qieyun.表達式.重紐母} 非 重紐B類)`) {
  if (韻母.startsWith('j')) 韻母 = 'ji' + 韻母.slice(1);
  else 韻母 = 'j' + 韻母;
}

// 合口字添加 w
if (is`(合口 或 灰魂韻) 非 文凡韻`) {
  if (韻母.startsWith('j')) 韻母 = 'jw' + 韻母.slice(1);
  else 韻母 = 'w' + 韻母;
}

if (is`入聲`) {
  if (韻母.endsWith('m')) 韻母 = 韻母.slice(0, -1) + 'p';
  else if (韻母.endsWith('n')) 韻母 = 韻母.slice(0, -1) + 't';
  else if (韻母.endsWith('ng')) 韻母 = 韻母.slice(0, -2) + 'k';
}

const 聲調 = {
  上: 'X',
  去: 'H',
}[音韻地位.聲] || '';

return 聲母 + 韻母 + 聲調;
});

/**
 * 白一平轉寫
 *
 * - Baxter, W. H. (1992). A Handbook of Old Chinese Phonology. De Gruyter Mouton.
 * - Baxter, W. H., & Sagart, L. (2014). Old Chinese: A New Reconstruction. Oxford University Press.
 *
 * @author Ayaka
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的白一平轉寫
 */
export function baxter(音韻地位, 字頭, 選項) {
  return schemas.baxter(音韻地位, 字頭, 選項);
}

schemas.blankego = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
// 可調整參數
if (!音韻地位) {
  return [
    // 祭廢韻平上（章組云以日母）
    // - 停用（預設）：不認可祭廢非去聲，歸為齊灰咍韻
    // - 啟用：認可該類地位（實際上祭、齊韻推導結果相同，僅廢與灰咍會不同）
    ['蟹攝三等平上', false],

    // 莊組眞韻開口上、去聲
    // - 停用（預設）：按原表，均處理為臻韻
    // - 啟用：認可莊組眞韻
    ['莊組眞韻開口', false],

    // 清B處理法（推導器預設資料無此類，僅適用於其他資料音韻地位）
    // - `'清B'`（預設）：按清B拼寫
    // - `'合口'`：按原表處理，以清韻合口拼寫
    // - `'庚三'`：不認可清韻B類，視同庚三
    ['清B脣音', [1, '清B', '合口', '庚三']],
  ];
}

const is = (...x) => 音韻地位.屬於(...x);

// 調整音韻地位

音韻地位.呼 && is`脣音` && (音韻地位 = 音韻地位.調整({ 呼: null }));
音韻地位.重紐 && is`陽蒸幽韻` && (音韻地位 = 音韻地位.調整({ 重紐: null }));
is`莊組 欣韻` && (音韻地位 = 音韻地位.調整({ 韻: '臻' }));

// 選項相關
if (!選項.蟹攝三等平上 && is`祭廢韻 平上聲`) {
  音韻地位 = 音韻地位.調整(
    is`祭韻`
      ? { 韻: '齊', 等: '四' }
      : { 韻: is`開口` ? '咍' : '灰', 等: '一' },
  );
} else if (!選項.莊組眞韻開口 && is`莊組 眞韻 開口`) {
  音韻地位 = 音韻地位.調整({ 韻: '臻' });
} else if (選項.清B脣音 === '庚三' && is`幫組 清韻 重紐B類`) {
  音韻地位 = 音韻地位.調整({ 韻: '庚', 重紐: null });
}

/**
 * 依次匹配列表 `rules` 中的規則，返回第一項測試為 true 的對應結果。
 * 無匹配規則時抛出異常，`name` 會包含於異常信息中。
 *
 * `rules` 每項為 `[條件, 結果]`
 * 條件可為：
 * - 字串，會用 `音韻地位.屬於` 測試
 * - 函數，會直接調用並測試返回結果
 * - 其他，直接測試真值
 */
function 規則(name, rules) {
  for (const [rule, res] of rules) {
    if (typeof rule === 'string') {
      if (is(rule.replace(/　/g, ''))) {
        return res;
      }
    } else if (typeof rule === 'function') {
      if (rule()) {
        return res;
      }
    } else if (rule) {
      return res;
    }
  }
  throw new Error(`無${name}規則：${音韻地位.描述}`);
}

// 聲母

// prettier-ignore
let 母 = {
  幫: 'p',  滂: 'ph', 並: 'b',  明: 'm',
  端: 't',  透: 'th', 定: 'd',  泥: 'n',
  知: 't',  徹: 'th', 澄: 'd',  孃: 'n',
  精: 'z',  清: 'c',  從: 'dz',           心: 's',  邪: 'sz',
  莊: 'tr', 初: 'ch', 崇: 'dr',           生: 'sh', 俟: 'zh',
  章: 'tj', 昌: 'tc', 船: 'dj', 日: 'r',  書: 'sj', 常: 'zj',
  見: 'k',  溪: 'q',  羣: 'g',  疑: 'ng',
  影: '',   曉: 'x',  匣: 'h',  云: 'h',
                                以: 'j',
                                來: 'l',
}[音韻地位.母];

if (母 === undefined) {
  throw new Error(`無聲母規則: ${音韻地位.描述}`);
}

// 韻尾

let 尾 = 音韻地位.判斷(
  [
    ['遇果假攝 或 支脂之佳韻', ''],
    ['通江宕梗曾攝', 'ng'],
    ['蟹攝 或 微韻', 'i'], // 已排除佳韻
    ['臻山攝', 'n'],
    ['效流攝', 'u'],
    ['深咸攝', 'm'],
  ],
  `無韻尾規則: ${音韻地位.描述}`,
);

// 主元音

let 元 = 音韻地位.判斷(
  [
    ['歌麻　唐庚陽　泰夬廢　寒刪元　豪肴　談銜嚴凡韻', 'a'],
    ['佳支　青耕清　齊皆祭　先山仙　蕭宵　添咸鹽　韻', 'e'],
    ['　脂　　　　　　　　　眞　　　　幽　　　侵　韻', 'i'],
    ['　　　　　　　　　　　臻　　　　　　　　　　韻', 'yi'],
    ['　　　登江蒸　咍灰微　痕魂欣　侯尤　覃　　　韻', 'o'],
    ['　之　　　　　　　　　　　　　　　　　　　　韻', 'io'], // 之韻 io 的 i 視為主元音
    ['模虞　東　　　　　　　　　文　　　　　　　　韻', 'u'],
    ['　魚　冬　鍾　　　　　　　　　　　　　　　　韻', 'v'],
  ].map(([cond, ...rest]) => [cond.replace(/　/g, ''), ...rest]),
  `無主元音規則: ${音韻地位.描述}`,
);

// 介音

// 拼寫上使用合口介音的場合
const 合口 = !is`脣音`
  ? is`合口 非 文韻`
  : is`歌陽廢寒元凡灰微魂韻` || is`清韻 重紐B類 ${選項.清B脣音 === '合口'}`;

let 介 = {
  一: ['', 'u'],
  二: ['e', 'o'],
  三: ['i', 'v'],
  四: ['', 'u'],
}[音韻地位.等][+合口];

if (介 === 'i' && (元.startsWith('i') || 元.startsWith('y'))) {
  介 = '';
} else if (介 === 'e' && 元 === 'e') {
  // 二等開口 e 元音寫作 ae
  介 = '';
  元 = 'ae';
} else if (介 === 'o' && 元 === 'e') {
  // oe 上聲要雙寫 o，亦視作整體
  介 = '';
  元 = 'oe';
}

// 三等重紐、重韻
if (
  (is('重紐B類') && (選項.清B脣音 !== '合口' || !is('幫組 清韻'))) ||
  (['i', 'e'].includes(元) &&
    is`(三等 知莊組 或 云母) 非 (知組 (清韻 或 眞韻 合口))`) || // 清、諄韻知組視作A類
  is('麻庚韻 三等 或 幽韻') // 重韻
) {
  介 = {
    i: 'y',
    v: 'w',
    '': '', // 主元音為 i 時
  }[介];
  if (介 === undefined) {
    throw new Error(`無重紐重韻規則: ${音韻地位.描述}`);
  }
  if (元 === 'i') {
    元 = 'y';
  }
}

// 拼寫規則

if (is('章組 或 日以母')) {
  // 章組、日以母省略 i 介音，麻三亦省略 y 介音
  if (介.startsWith('i')) {
    介 = 介.slice(1);
  } else if (is('麻韻 三等') && !合口) {
    介 = '';
  }
} else if (is('莊組')) {
  // 莊組拼 ea 省 e，拼 io, iu, iv 省 i（不含之韻），拼 ye 省 y（支韻除外）
  if (
    (介 === 'e' && 元 === 'a') ||
    (介 === 'i' && ['o', 'u', 'v'].includes(元)) ||
    (介 === 'y' && 元 === 'e' && 尾 !== '')
  ) {
    介 = '';
  }
}

// 聲調
if (音韻地位.聲 === '入') {
  尾 = {
    m: 'p',
    n: 't',
    ng: 'k',
  }[尾];
} else if (音韻地位.聲 !== '平') {
  if (['i', 'u', 'ng'].includes(尾)) {
    尾 = {
      i: ['j', 'y'],
      u: ['v', 'w'],
      ng: ['nk', 'nq'],
    }[尾][Number(音韻地位.聲 === '去')];
  } else if (音韻地位.聲 === '上') {
    元 = ['io', 'ae', 'oe'].includes(元) ? 元[0] + 元 : 元 + 元.slice(-1);
  } else if (音韻地位.聲 === '去' && ['m', 'n'].includes(尾)) {
    尾 = 尾 + 尾;
  } else if (音韻地位.聲 === '去' && 尾 === '') {
    元 = 元 + 'h';
  } else {
    throw new Error(`無聲調規則: ${音韻地位.描述}`);
  }
}
if (尾 === undefined || 元 === undefined) {
  throw new Error(`無聲調規則: ${音韻地位.描述}`);
}

return `${母}${介}${元}${尾}`;
});

/**
 * 有女羅馬字
 *
 * https://github.com/BYVoid/ytenx/blob/master/ytenx/sync/kyonh/PrengQim.txt
 *
 * 本版說明：
 *
 * - 基於韻典網數據，並參照有女同車原版《〈廣韻〉全字表》（下稱「原表」）有所校正
 * - 目前推導器預設資料與原表有數十小韻在聲母、開合、等、重紐類等歸類有所不同，但除個別外均不影響原拼寫系統（需擴展原表拼寫系統的，列為選項）
 * - 旨韻（脂上聲）若干精、章組小韻，韻母寫為B類，與他處精章組均用A類不合，現修正
 * - 崇開三眞上（濜）：真諄上去聲莊組開口，原表及拼寫均析為臻韻上去聲，惟此小韻遺漏，現修正
 * - 莊合三真入（𠭴）：韻母寫為A類，與他處莊組均用B類不合，現修正（雖然不排除是因該小韻列於術韻而非質韻，但術韻下亦有「率」小韻用B類拼作 shwyt，故當以B類為正）
 * - 以開一寒入（poem表「䔾」）：原表無寒韻拼章組日以母例，但有談韻書母例與之平行，故可拼作 jat
 * - 幫清B入（碧）：原表處理為清韻合口作 pvek，與「辟」小韻開合對立。亦可處理為庚三即 pyak。原表清韻無B類，但可據體系推出處理為「清B」時的拼法 pyek。本代碼同時支持三種處理法
 *
 * @author SyiMyuZya
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的有女羅馬字
 */
export function blankego(音韻地位, 字頭, 選項) {
  return schemas.blankego(音韻地位, 字頭, 選項);
}

schemas.kyonh = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
if (!音韻地位) return [];

const is = (...x) => 音韻地位.屬於(...x);

const { 重紐母 } = Qieyun.表達式;

音韻地位 = Qieyun.適配分析體系('ytenx')(音韻地位);

function 聲母規則() {
  switch (音韻地位.母) {
    case '幫': return 'p';
    case '滂': return 'ph';
    case '並': return 'b';
    case '明': return 'm';
    case '端': return 't';
    case '透': return 'th';
    case '定': return 'd';
    case '泥': return 'n';
    case '知': return 'tr';
    case '徹': return 'thr';
    case '澄': return 'dr';
    case '孃': return 'nr';
    case '精': return 'c';
    case '清': return 'ch';
    case '從': return 'z';
    case '心': return 's';
    case '邪': return 'zs';
    case '莊': return 'cr';
    case '初': return 'chr';
    case '崇': return 'zr';
    case '生': return 'sr';
    case '俟': return 'zsr';
    case '章': return 'cj';
    case '昌': return 'chj';
    case '船': return 'zsj';
    case '書': return 'sj';
    case '常': return 'zj';
    case '見': return 'k';
    case '溪': return 'kh';
    case '羣': return 'g';
    case '疑': return 'ng';
    case '影': return 'q';
    case '曉': return 'h';
    case '匣': return 'gh';
    case '云': return '';
    case '以': return 'j';
    case '來': return 'l';
    case '日': return 'nj';
    default: throw new Error('無聲母規則');
  }
}

function 韻母規則() {
  // 通攝
  if (is('東韻 一等')) return 'ung';
  if (is('東韻 三等')) return 'iung';
  if (is('冬韻')) return 'uung';
  if (is('鍾韻')) return 'yung';
  // 江攝
  if (is('江韻')) return 'rung';
  // 止攝
  if (is('支韻 合口')) return is('重紐A類') ? 'jye' : 'ye';
  if (is('支韻')) return is('重紐A類') ? 'je' : 'ie';
  if (is('脂韻 合口')) return is('重紐A類') ? 'jyi' : 'yi';
  if (is('脂韻')) return is('重紐A類') ? 'jii' : 'ii';
  if (is('之韻')) return 'i';
  if (is('微韻 開口')) return 'ioi';
  if (is('微韻')) return 'yoi';
  // 遇攝
  if (is('魚韻')) return 'io';
  if (is('虞韻')) return 'yo';
  if (is('模韻')) return 'o';
  // 蟹攝
  if (is('齊韻 合口')) return 'ue';
  if (is('齊韻')) return 'e';
  if (is('祭韻 合口')) return 'yed';
  if (is('祭韻')) return is('重紐A類') ? 'jed' : 'ied';
  if (is('泰韻 合口')) return 'uad';
  if (is('泰韻')) return 'ad';
  if (is('佳韻 合口')) return 'rue';
  if (is('佳韻')) return 're';
  if (is('皆韻 合口')) return 'ruai';
  if (is('皆韻')) return 'rai';
  if (is('夬韻 合口')) return 'ruad';
  if (is('夬韻')) return 'rad';
  if (is('咍韻')) return 'ai';
  if (is('灰韻')) return 'uai';
  if (is('廢韻 開口')) return 'iad';
  if (is('廢韻')) return 'yad';
  // 臻攝
  if (is('眞韻 合口')) return is('重紐A類') ? 'jyn' : 'yn';
  if (is('眞韻')) return is('重紐A類') ? 'jin' : 'in';
  if (is('臻韻')) return 'in';
  if (is('欣韻')) return 'ion';
  if (is('文韻')) return 'yon';
  if (is('元韻 開口')) return 'ian';
  if (is('元韻')) return 'yan';
  if (is('痕韻')) return 'on';
  if (is('魂韻')) return 'uon';
  // 山攝
  if (is('寒韻 開口')) return 'an';
  if (is('寒韻')) return 'uan';
  if (is('刪韻 合口')) return 'ruan';
  if (is('刪韻')) return 'ran';
  if (is('山韻 合口')) return 'ruen';
  if (is('山韻')) return 'ren';
  if (is('仙韻 合口')) return is('重紐A類') ? 'jyen' : 'yen';
  if (is('仙韻')) return is('重紐A類') ? 'jen' : 'ien';
  if (is('先韻 合口')) return 'uen';
  if (is('先韻')) return 'en';
  // 效攝
  if (is('蕭韻')) return 'eu';
  if (is('宵韻')) return is('重紐A類') ? 'jeu' : 'ieu';
  if (is('肴韻')) return 'rau';
  if (is('豪韻')) return 'au';
  // 果攝
  if (is('歌韻 一等 開口')) return 'a';
  if (is('歌韻 一等')) return 'ua';
  if (is('歌韻 三等 開口')) return 'ia';
  if (is('歌韻 三等')) return 'ya';
  // 假攝
  if (is('麻韻 二等 合口')) return 'rua';
  if (is('麻韻 二等')) return 'ra';
  if (is('麻韻 三等')) return 'ia';
  // 宕攝
  if (is('陽韻 開口')) return 'iang';
  if (is('陽韻')) return 'yang';
  if (is('唐韻 合口')) return 'uang';
  if (is('唐韻')) return 'ang';
  // 梗攝
  if (is('庚韻 二等 合口')) return 'ruang';
  if (is('庚韻 二等')) return 'rang';
  if (is('庚韻 三等 合口')) return 'yeng';
  if (is('庚韻 三等')) return 'ieng';
  if (is('耕韻 合口')) return 'rueng';
  if (is('耕韻')) return 'reng';
  if (is('清韻 合口')) return is`${重紐母} 非 重紐B類` ? 'jyeng' : 'yeng';
  if (is('清韻')) return is`${重紐母} 非 重紐B類` ? 'jeng' : 'ieng';
  if (is('青韻 合口')) return 'ueng';
  if (is('青韻')) return 'eng';
  // 曾攝
  if (is('蒸韻 合口')) return 'yng';
  if (is('蒸韻')) return 'ing';
  if (is('登韻 合口')) return 'uong';
  if (is('登韻')) return 'ong';
  // 流攝
  if (is('尤韻')) return 'iu';
  if (is('侯韻')) return 'u';
  if (is('幽韻')) return 'y';
  // 深攝
  if (is('侵韻')) return is('重紐A類') ? 'jim' : 'im';
  // 咸攝
  if (is('覃韻')) return 'om';
  if (is('談韻')) return 'am';
  if (is('鹽韻')) return is('重紐A類') ? 'jem' : 'iem';
  if (is('添韻')) return 'em';
  if (is('咸韻')) return 'rem';
  if (is('銜韻')) return 'ram';
  if (is('嚴韻')) return 'iam';
  if (is('凡韻')) return 'yam';
  throw new Error('無韻母規則');
}

function 聲調規則() {
  if (is('平入聲')) return '';
  if (is('上聲')) return 'x';
  if (is('去聲')) return 'h';
  throw new Error('無聲調規則');
}

let 聲母 = 聲母規則();
let 隔音符號 = "'";
let 韻母 = 韻母規則();
let 聲調 = 聲調規則();

if (is('入聲')) {
  if (韻母.endsWith('m')) 韻母 = `${韻母.slice(0, -1)}p`;
  else if (韻母.endsWith('n')) 韻母 = `${韻母.slice(0, -1)}t`;
  else if (韻母.endsWith('ng')) 韻母 = `${韻母.slice(0, -2)}k`;
}

if (韻母.endsWith('d')) {
  聲調 = '';
}

if (聲母.endsWith('r') && 韻母.startsWith('r')) {
  韻母 = 韻母.slice(1);
}

if (聲母.endsWith('j') && 韻母.startsWith('i') && [...'aeou'].some((x) => 韻母.includes(x))) {
  韻母 = 韻母.slice(1);
}

if (is(`幫組 一二三四等 \
或 端組 一四等 \
或 知組 二三等 \
或 精組 一三四等 \
或 莊組 二三等 \
或 章組 三等 \
或 見溪疑母 一二三四等 \
或 羣母 二三等 \
或 影曉母 一二三四等 \
或 匣母 一二四等 \
或 云以母 三等 \
或 來母 一二三四等 \
或 日母 三等`)) {
  隔音符號 = '';
}

if (is('云母 一二四等')) 聲母 = 'i'; // 如 1444 倄小韻 i'uaix

if (is('端組 三等') && !韻母.startsWith('j')) {
  隔音符號 = ''; // 如 2237 地小韻 diih
}

return 聲母 + 隔音符號 + 韻母 + 聲調;
});

/**
 * 古韻羅馬字
 *
 * https://zh.wikipedia.org/wiki/User:Polyhedron/中古漢語拼音
 *
 * @author Ayaka
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的古韻羅馬字
 */
export function kyonh(音韻地位, 字頭, 選項) {
  return schemas.kyonh(音韻地位, 字頭, 選項);
}

schemas.zyepheng = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
if (!音韻地位) return [['$legacy', true]];

return {
  EAA: 'tuŋ',
  GAA: 'duŋ',
  JBA: 'tryuŋ',
  LBA: 'dryuŋ',
  XBA: 'tyuŋ',
  KBA: 'thryuŋ',
  UBA: 'dzryuŋ',
  QBA: 'syuŋ',
  cBA: 'nyuŋ',
  dBA: 'kyuŋ',
  lBA: 'jyuŋ',
  kBA: 'xyuŋ',
  DBA: 'myuŋ',
  eBA: 'khyuŋ',
  fBA: 'gyuŋ',
  CBA: 'byuŋ',
  ABA: 'pyuŋ',
  BBA: 'phyuŋ',
  YBA: 'thyuŋ',
  IBA: 'lyuŋ',
  eAA: 'khuŋ',
  dAA: 'kuŋ',
  DAA: 'muŋ',
  IAA: 'luŋ',
  jAA: 'xuŋ',
  PAA: 'dzuŋ',
  hAA: 'quŋ',
  OAA: 'chuŋ',
  FAA: 'thuŋ',
  NAA: 'cuŋ',
  CAA: 'buŋ',
  iAA: 'qhuŋ',
  gAA: 'ŋuŋ',
  QAA: 'suŋ',
  ECA: 'toŋ',
  GCA: 'doŋ',
  PCA: 'dzoŋ',
  HCA: 'noŋ',
  dCA: 'koŋ',
  jCA: 'xoŋ',
  ICA: 'loŋ',
  NCA: 'coŋ',
  QCA: 'soŋ',
  FCA: 'thoŋ',
  XDA: 'tyoŋ',
  IDA: 'lyoŋ',
  aDA: 'shyoŋ',
  RDA: 'zyoŋ',
  YDA: 'thyoŋ',
  lDA: 'jyoŋ',
  ADA: 'pyoŋ',
  iDA: 'qhyoŋ',
  gDA: 'ŋyoŋ',
  hDA: 'qyoŋ',
  MDA: 'nryoŋ',
  LDA: 'dryoŋ',
  PDA: 'dzyoŋ',
  KDA: 'thryoŋ',
  CDA: 'byoŋ',
  BDA: 'phyoŋ',
  NDA: 'cyoŋ',
  cDA: 'nyoŋ',
  fDA: 'gyoŋ',
  ZDA: 'dyoŋ',
  dDA: 'kyoŋ',
  QDA: 'syoŋ',
  ODA: 'chyoŋ',
  eDA: 'khyoŋ',
  dEA: 'kroŋ',
  DEA: 'mroŋ',
  MEA: 'nroŋ',
  TEA: 'chroŋ',
  AEA: 'proŋ',
  jEA: 'xroŋ',
  BEA: 'phroŋ',
  IEA: 'lroŋ',
  VEA: 'sroŋ',
  CEA: 'broŋ',
  iEA: 'qhroŋ',
  hEA: 'qroŋ',
  eEA: 'khroŋ',
  LEA: 'droŋ',
  KEA: 'throŋ',
  JEA: 'troŋ',
  gEA: 'ŋroŋ',
  UEA: 'dzroŋ',
  XFA: 'tie',
  lFA: 'jie',
  kFI: 'xrye',
  dFM: 'krye',
  iFM: 'qhrye',
  hFM: 'qrye',
  DFE: 'mrie',
  iFI: 'qhye',
  LFI: 'drye',
  ZFI: 'dye',
  IFI: 'lye',
  YFI: 'thye',
  BFE: 'phrie',
  AFE: 'prie',
  RFI: 'zye',
  eFM: 'khrye',
  eFI: 'khye',
  fFE: 'grie',
  fFA: 'gie',
  iFE: 'qhrie',
  eFE: 'khrie',
  gFE: 'ŋrie',
  CFE: 'brie',
  ZFA: 'die',
  cFA: 'nie',
  IFA: 'lie',
  PFA: 'dzie',
  NFA: 'cie',
  dFE: 'krie',
  AFA: 'pie',
  CFA: 'bie',
  aFA: 'shie',
  QFA: 'sie',
  TFA: 'chrie',
  KFA: 'thrie',
  DFA: 'mie',
  OFA: 'chie',
  JFA: 'trie',
  hFE: 'qrie',
  LFA: 'drie',
  QFI: 'sye',
  gFM: 'ŋrye',
  iFA: 'qhie',
  VFA: 'srie',
  VFI: 'srye',
  cFI: 'nye',
  dFI: 'kye',
  NFI: 'cye',
  TFI: 'chrye',
  JFI: 'trye',
  YFA: 'thie',
  SFA: 'crie',
  BFA: 'phie',
  lFI: 'jye',
  UFA: 'dzrie',
  XGA: 'ti',
  lGA: 'ji',
  VGA: 'sri',
  CGA: 'bi',
  NGA: 'ci',
  dGE: 'kri',
  YGA: 'thi',
  KGA: 'thri',
  OGA: 'chi',
  PGA: 'dzi',
  MGA: 'nri',
  LGA: 'dri',
  QGA: 'si',
  aGA: 'shi',
  hGA: 'qi',
  IGA: 'li',
  fGI: 'gyi',
  JGI: 'tryi',
  dGM: 'kryi',
  cGI: 'nyi',
  VGI: 'sryi',
  lGI: 'jyi',
  IGI: 'lyi',
  QGI: 'syi',
  fGM: 'gryi',
  DGE: 'mryi',
  AGE: 'pryi',
  XGI: 'tyi',
  ZGI: 'dyi',
  kGI: 'xryi',
  CGE: 'bryi',
  BGE: 'phryi',
  iGI: 'qhyi',
  LGI: 'dryi',
  YGI: 'thyi',
  JGA: 'tri',
  BGA: 'phi',
  NGI: 'cyi',
  eGM: 'khryi',
  gGE: 'ŋri',
  iGA: 'qhi',
  XHA: 'tiə',
  lHA: 'jiə',
  ZHA: 'diə',
  gHA: 'ŋiə',
  QHA: 'siə',
  THA: 'chriə',
  fHA: 'giə',
  aHA: 'shiə',
  cHA: 'niə',
  eHA: 'khiə',
  dHA: 'kiə',
  RHA: 'ziə',
  IHA: 'liə',
  SHA: 'criə',
  iHA: 'qhiə',
  hHA: 'qiə',
  KHA: 'thriə',
  LHA: 'driə',
  YHA: 'thiə',
  PHA: 'dziə',
  NHA: 'ciə',
  UHA: 'dzriə',
  WHA: 'zriə',
  DIA: 'myui',
  iII: 'qhyui',
  kII: 'xyui',
  BIA: 'phyui',
  AIA: 'pyui',
  CIA: 'byui',
  hII: 'qyui',
  fIA: 'giəi',
  dIA: 'kiəi',
  iIA: 'qhiəi',
  hIA: 'qiəi',
  gIA: 'ŋiəi',
  gII: 'ŋyui',
  dII: 'kyui',
  eII: 'khyui',
  gJA: 'ŋio',
  TJA: 'chrio',
  aJA: 'shio',
  dJA: 'kio',
  fJA: 'gio',
  lJA: 'jio',
  QJA: 'sio',
  OJA: 'chio',
  UJA: 'dzrio',
  KJA: 'thrio',
  VJA: 'srio',
  iJA: 'qhio',
  RJA: 'zio',
  hJA: 'qio',
  JJA: 'trio',
  IJA: 'lio',
  XJA: 'tio',
  LJA: 'drio',
  cJA: 'nio',
  NJA: 'cio',
  eJA: 'khio',
  SJA: 'crio',
  ZJA: 'dio',
  MJA: 'nrio',
  gKA: 'ŋyo',
  TKA: 'chryo',
  DKA: 'myo',
  kKA: 'xyo',
  iKA: 'qhyo',
  fKA: 'gyo',
  cKA: 'nyo',
  QKA: 'syo',
  JKA: 'tryo',
  KKA: 'thryo',
  ZKA: 'dyo',
  lKA: 'jyo',
  eKA: 'khyo',
  XKA: 'tyo',
  OKA: 'chyo',
  IKA: 'lyo',
  CKA: 'byo',
  UKA: 'dzryo',
  SKA: 'cryo',
  BKA: 'phyo',
  NKA: 'cyo',
  AKA: 'pyo',
  hKA: 'qyo',
  aKA: 'shyo',
  YKA: 'thyo',
  LKA: 'dryo',
  dKA: 'kyo',
  VKA: 'sryo',
  DLA: 'mo',
  CLA: 'bo',
  jLA: 'xo',
  dLA: 'ko',
  GLA: 'do',
  HLA: 'no',
  iLA: 'qho',
  gLA: 'ŋo',
  NLA: 'co',
  ILA: 'lo',
  QLA: 'so',
  PLA: 'dzo',
  hLA: 'qo',
  ALA: 'po',
  eLA: 'kho',
  OLA: 'cho',
  FLA: 'tho',
  ELA: 'to',
  BLA: 'pho',
  PMA: 'dzei',
  IMA: 'lei',
  OMA: 'chei',
  EMA: 'tei',
  GMA: 'dei',
  AMA: 'pei',
  dMA: 'kei',
  jMA: 'xei',
  hMA: 'qei',
  gMA: 'ŋei',
  iMA: 'qhei',
  QMA: 'sei',
  FMA: 'thei',
  CMA: 'bei',
  BMA: 'phei',
  NMA: 'cei',
  DMA: 'mei',
  HMA: 'nei',
  eMA: 'khei',
  dMI: 'kuei',
  eMI: 'khuei',
  jMI: 'xuei',
  cMA: 'nьʼei',
  ZMA: 'dьʼei',
  hMI: 'quei',
  iMI: 'qhuei',
  dPA: 'kre',
  jPA: 'xre',
  CPA: 'bre',
  dPI: 'krue',
  hPI: 'qrue',
  ePI: 'khrue',
  UPA: 'dzre',
  TPA: 'chre',
  iPI: 'qhrue',
  MPA: 'nre',
  gPA: 'ŋre',
  hPA: 'qre',
  VPA: 'sre',
  iPA: 'qhre',
  KPA: 'thre',
  DPA: 'mre',
  jPI: 'xrue',
  dQA: 'krei',
  hQA: 'qrei',
  jQA: 'xrei',
  CQA: 'brei',
  dQI: 'kruei',
  jQI: 'xruei',
  eQI: 'khruei',
  UQA: 'dzrei',
  TQA: 'chrei',
  iQI: 'qhruei',
  LQI: 'druei',
  DQA: 'mrei',
  SQA: 'crei',
  hQI: 'qruei',
  JQA: 'trei',
  IQA: 'lrei',
  eQA: 'khrei',
  MQA: 'nrei',
  VQA: 'srei',
  gQA: 'ŋrei',
  KQA: 'threi',
  iQA: 'qhrei',
  IQI: 'lruei',
  UQI: 'dzruei',
  iSI: 'qhui',
  eSI: 'khui',
  hSI: 'qui',
  jSI: 'xui',
  DSA: 'mui',
  dSI: 'kui',
  ISI: 'lui',
  GSI: 'dui',
  OSI: 'chui',
  ESI: 'tui',
  QSI: 'sui',
  PSI: 'dzui',
  CSA: 'bui',
  ASA: 'pui',
  BSA: 'phui',
  gSI: 'ŋui',
  FSI: 'thui',
  HSI: 'nui',
  NSI: 'cui',
  iTA: 'qhəi',
  eTA: 'khəi',
  hTA: 'qəi',
  GTA: 'dəi',
  dTA: 'kəi',
  PTA: 'dzəi',
  ITA: 'ləi',
  NTA: 'cəi',
  OTA: 'chəi',
  FTA: 'thəi',
  jTA: 'xəi',
  QTA: 'səi',
  gTA: 'ŋəi',
  HTA: 'nəi',
  ETA: 'təi',
  YTA: 'thьʼəi',
  XVA: 'tin',
  KVA: 'thrin',
  hVA: 'qin',
  QVA: 'sin',
  ZVA: 'din',
  cVA: 'nin',
  bVA: 'zhin',
  OVA: 'chin',
  kVA: 'xrin',
  aVA: 'shin',
  AVA: 'pin',
  IVA: 'lin',
  fVE: 'grin',
  JVA: 'trin',
  LVA: 'drin',
  NVA: 'cin',
  YVA: 'thin',
  PVA: 'dzin',
  lVA: 'jin',
  MVA: 'nrin',
  BVA: 'phin',
  CVA: 'bin',
  gVE: 'ŋrin',
  dVE: 'krin',
  dVM: 'kryn',
  kVI: 'xryn',
  eVM: 'khryn',
  DVE: 'mryn',
  CVE: 'bryn',
  hVE: 'qrin',
  hVM: 'qryn',
  AVE: 'pryn',
  DVA: 'min',
  XVI: 'tyn',
  KVI: 'thryn',
  LVI: 'dryn',
  QVI: 'syn',
  ZVI: 'dyn',
  cVI: 'nyn',
  bVI: 'zhyn',
  IVI: 'lyn',
  JVI: 'tryn',
  OVI: 'chyn',
  NVI: 'cyn',
  YVI: 'thyn',
  PVI: 'dzyn',
  lVI: 'jyn',
  RVI: 'zyn',
  dVI: 'kyn',
  fVA: 'gin',
  BVE: 'phryn',
  SWA: 'crin',
  VWA: 'srin',
  UWA: 'dzrin',
  DXA: 'myun',
  kXI: 'xyun',
  hXI: 'qyun',
  CXA: 'byun',
  AXA: 'pyun',
  fXI: 'gyun',
  iXI: 'qhyun',
  dXI: 'kyun',
  BXA: 'phyun',
  iYA: 'qhiən',
  hYA: 'qiən',
  fYA: 'giən',
  dYA: 'kiən',
  gYA: 'ŋiən',
  gZI: 'ŋyon',
  kZI: 'xyon',
  CZA: 'byon',
  BZA: 'phyon',
  iZI: 'qhyon',
  hZI: 'qyon',
  gZA: 'ŋian',
  eZA: 'khian',
  iZA: 'qhian',
  dZA: 'kian',
  hZA: 'qian',
  AZA: 'pyon',
  fZA: 'gian',
  DZA: 'myon',
  jaI: 'xun',
  daI: 'kun',
  haI: 'qun',
  DaA: 'mun',
  QaI: 'sun',
  NaI: 'cun',
  PaI: 'dzun',
  EaI: 'tun',
  FaI: 'thun',
  GaI: 'dun',
  OaI: 'chun',
  gaI: 'ŋun',
  CaA: 'bun',
  AaA: 'pun',
  IaI: 'lun',
  eaI: 'khun',
  iaI: 'qhun',
  BaA: 'phun',
  HaI: 'nun',
  jbA: 'xən',
  dbA: 'kən',
  hbA: 'qən',
  FbA: 'thən',
  gbA: 'ŋən',
  jcA: 'xan',
  gcA: 'ŋan',
  EcA: 'tan',
  hcA: 'qan',
  HcA: 'nan',
  OcA: 'chan',
  FcA: 'than',
  QcA: 'san',
  GcA: 'dan',
  PcA: 'dzan',
  dcA: 'kan',
  IcA: 'lan',
  ecA: 'khan',
  icA: 'qhan',
  HcI: 'nuan',
  jcI: 'xuan',
  gcI: 'ŋuan',
  EcI: 'tuan',
  hcI: 'quan',
  FcI: 'thuan',
  QcI: 'suan',
  GcI: 'duan',
  PcI: 'dzuan',
  dcI: 'kuan',
  IcI: 'luan',
  icI: 'qhuan',
  ecI: 'khuan',
  NcI: 'cuan',
  CcA: 'ban',
  DcA: 'man',
  BcA: 'phan',
  AcA: 'pan',
  VdA: 'sran',
  ddI: 'kruan',
  hdI: 'qruan',
  VdI: 'sruan',
  jdI: 'xruan',
  AdA: 'pran',
  DdA: 'mran',
  gdA: 'ŋran',
  ddA: 'kran',
  BdA: 'phran',
  MdI: 'nruan',
  gdI: 'ŋruan',
  edA: 'khran',
  SdI: 'cruan',
  VeA: 'sren',
  deI: 'kruen',
  deA: 'kren',
  jeA: 'xren',
  eeA: 'khren',
  UeA: 'dzren',
  ieA: 'qhren',
  geA: 'ŋren',
  heA: 'qren',
  AeA: 'pren',
  IeA: 'lren',
  MeA: 'nren',
  YeA: 'thьʼren',
  heI: 'qruen',
  LeI: 'druen',
  IeI: 'lruen',
  feI: 'gruen',
  JeA: 'tren',
  LeA: 'dren',
  jeI: 'xruen',
  QgA: 'sen',
  PgA: 'dzen',
  OgA: 'chen',
  NgA: 'cen',
  FgA: 'then',
  dgA: 'ken',
  jgA: 'xen',
  hgA: 'qen',
  IgA: 'len',
  GgA: 'den',
  HgA: 'nen',
  EgA: 'ten',
  egA: 'khen',
  ggA: 'ŋen',
  DgA: 'men',
  CgA: 'ben',
  hgI: 'quen',
  dgI: 'kuen',
  igI: 'qhuen',
  AgA: 'pen',
  jgI: 'xuen',
  igA: 'qhen',
  UgI: 'dzrʼuen',
  QfA: 'sien',
  PfA: 'dzien',
  OfA: 'chien',
  NfA: 'cien',
  cfA: 'nien',
  lfA: 'jien',
  XfA: 'tien',
  dfA: 'kien',
  JfA: 'trien',
  UfA: 'dzrien',
  afA: 'shien',
  KfA: 'thrien',
  ZfA: 'dien',
  LfA: 'drien',
  ifE: 'qhrien',
  IfA: 'lien',
  BfA: 'phien',
  CfA: 'bien',
  DfA: 'mien',
  PfI: 'dzyen',
  QfI: 'syen',
  NfI: 'cyen',
  ifI: 'qhyen',
  cfI: 'nyen',
  YfI: 'thyen',
  lfI: 'jyen',
  RfI: 'zyen',
  hfI: 'qyen',
  bfI: 'zhyen',
  AfA: 'pien',
  RfA: 'zien',
  OfI: 'chyen',
  XfI: 'tyen',
  ZfI: 'dyen',
  kfI: 'xryen',
  SfI: 'cryen',
  VfI: 'sryen',
  KfI: 'thryen',
  ffE: 'grien',
  efE: 'khrien',
  ffM: 'gryen',
  LfI: 'dryen',
  IfI: 'lyen',
  efM: 'khryen',
  hfE: 'qrien',
  kfA: 'xrien',
  hfM: 'qryen',
  YfA: 'thien',
  JfI: 'tryen',
  dfM: 'kryen',
  QhA: 'seu',
  FhA: 'theu',
  EhA: 'teu',
  GhA: 'deu',
  dhA: 'keu',
  IhA: 'leu',
  ghA: 'ŋeu',
  ihA: 'qheu',
  hhA: 'qeu',
  ehA: 'kheu',
  QiA: 'sieu',
  KiA: 'thrieu',
  JiA: 'trieu',
  LiA: 'drieu',
  iiE: 'qhrieu',
  PiA: 'dzieu',
  diE: 'krieu',
  NiA: 'cieu',
  ciA: 'nieu',
  aiA: 'shieu',
  liA: 'jieu',
  ZiA: 'dieu',
  XiA: 'tieu',
  AiA: 'pieu',
  AiE: 'prieu',
  CiA: 'bieu',
  DiA: 'mieu',
  DiE: 'mrieu',
  hiA: 'qieu',
  kiA: 'xrieu',
  fiE: 'grieu',
  OiA: 'chieu',
  hiE: 'qrieu',
  eiA: 'khieu',
  YiA: 'thieu',
  BiA: 'phieu',
  fiA: 'gieu',
  IiA: 'lieu',
  eiE: 'khrieu',
  jjA: 'xrau',
  djA: 'krau',
  UjA: 'dzrau',
  MjA: 'nrau',
  VjA: 'srau',
  DjA: 'mrau',
  ijA: 'qhrau',
  AjA: 'prau',
  BjA: 'phrau',
  ejA: 'khrau',
  gjA: 'ŋrau',
  SjA: 'crau',
  JjA: 'trau',
  TjA: 'chrau',
  CjA: 'brau',
  hjA: 'qrau',
  KjA: 'thrau',
  IjA: 'lrau',
  LjA: 'drau',
  jkA: 'xau',
  dkA: 'kau',
  IkA: 'lau',
  ikA: 'qhau',
  DkA: 'mau',
  FkA: 'thau',
  EkA: 'tau',
  QkA: 'sau',
  CkA: 'bau',
  AkA: 'pau',
  GkA: 'dau',
  NkA: 'cau',
  gkA: 'ŋau',
  PkA: 'dzau',
  hkA: 'qau',
  HkA: 'nau',
  ekA: 'khau',
  OkA: 'chau',
  BkA: 'phau',
  dlA: 'ka',
  OlA: 'cha',
  ElA: 'ta',
  QlA: 'sa',
  GlA: 'da',
  PlA: 'dza',
  glA: 'ŋa',
  FlA: 'tha',
  IlA: 'la',
  HlA: 'na',
  jlA: 'xa',
  ilA: 'qha',
  elA: 'kha',
  hlA: 'qa',
  dlI: 'kua',
  OlI: 'chua',
  ElI: 'tua',
  QlI: 'sua',
  ClA: 'ba',
  GlI: 'dua',
  DlA: 'ma',
  PlI: 'dzua',
  glI: 'ŋua',
  FlI: 'thua',
  IlI: 'lua',
  HlI: 'nua',
  AlA: 'pa',
  BlA: 'pha',
  jlI: 'xua',
  elI: 'khua',
  hlI: 'qua',
  imI: 'qhya',
  hmI: 'qya',
  emI: 'khya',
  fmA: 'gia',
  emA: 'khia',
  dmA: 'kia',
  OmI: 'chya',
  NmI: 'cya',
  fmI: 'gya',
  ImI: 'lya',
  DnA: 'mra',
  YoA: 'thia',
  aoA: 'shia',
  loA: 'jia',
  XoA: 'tia',
  NoA: 'cia',
  boA: 'zhia',
  jnI: 'xrua',
  dnI: 'krua',
  inI: 'qhrua',
  enI: 'khrua',
  MnA: 'nra',
  dnA: 'kra',
  jnA: 'xra',
  BnA: 'phra',
  hnA: 'qra',
  AnA: 'pra',
  TnA: 'chra',
  VnA: 'sra',
  gnA: 'ŋra',
  SnA: 'cra',
  LnA: 'dra',
  RoA: 'zia',
  ZoA: 'dia',
  hnI: 'qrua',
  SnI: 'crua',
  JnI: 'trua',
  CnA: 'bra',
  UnA: 'dzra',
  KnA: 'thra',
  JnA: 'tra',
  inA: 'qhra',
  enA: 'khra',
  PoA: 'dzia',
  coA: 'nia',
  QoA: 'sia',
  JoA: 'tria',
  gnI: 'ŋrua',
  lpA: 'jiaŋ',
  RpA: 'ziaŋ',
  IpA: 'liaŋ',
  ipA: 'qhiaŋ',
  apA: 'shiaŋ',
  CpA: 'byaŋ',
  XpA: 'tiaŋ',
  YpA: 'thiaŋ',
  epA: 'khiaŋ',
  dpA: 'kiaŋ',
  LpA: 'driaŋ',
  JpA: 'triaŋ',
  cpA: 'niaŋ',
  ApA: 'pyaŋ',
  QpA: 'siaŋ',
  NpA: 'ciaŋ',
  TpA: 'chriaŋ',
  DpA: 'myaŋ',
  MpA: 'nriaŋ',
  UpA: 'dzriaŋ',
  SpA: 'criaŋ',
  ZpA: 'diaŋ',
  VpA: 'sriaŋ',
  PpA: 'dziaŋ',
  OpA: 'chiaŋ',
  epI: 'khyaŋ',
  kpI: 'xyaŋ',
  hpA: 'qiaŋ',
  fpA: 'giaŋ',
  KpA: 'thriaŋ',
  BpA: 'phyaŋ',
  fpI: 'gyaŋ',
  GqA: 'daŋ',
  IqA: 'laŋ',
  EqA: 'taŋ',
  OqA: 'chaŋ',
  dqA: 'kaŋ',
  QqA: 'saŋ',
  eqA: 'khaŋ',
  iqI: 'qhuaŋ',
  jqI: 'xuaŋ',
  dqI: 'kuaŋ',
  FqA: 'thaŋ',
  BqA: 'phaŋ',
  hqI: 'quaŋ',
  hqA: 'qaŋ',
  iqA: 'qhaŋ',
  jqA: 'xaŋ',
  DqA: 'maŋ',
  NqA: 'caŋ',
  HqA: 'naŋ',
  CqA: 'baŋ',
  gqA: 'ŋaŋ',
  PqA: 'dzaŋ',
  eqI: 'khuaŋ',
  AqA: 'paŋ',
  drA: 'kraŋ',
  erA: 'khraŋ',
  DrA: 'mraŋ',
  jrI: 'xruaŋ',
  ArA: 'praŋ',
  irI: 'qhruaŋ',
  drI: 'kruaŋ',
  CrA: 'braŋ',
  irA: 'qhraŋ',
  KrA: 'thraŋ',
  TrA: 'chraŋ',
  UrA: 'dzraŋ',
  hsA: 'qrieŋ',
  BrA: 'phraŋ',
  CsA: 'brieŋ',
  dsA: 'krieŋ',
  DsA: 'mrieŋ',
  LrA: 'draŋ',
  JrA: 'traŋ',
  ksI: 'xryeŋ',
  AsA: 'prieŋ',
  isI: 'qhryeŋ',
  esA: 'khrieŋ',
  fsA: 'grieŋ',
  gsA: 'ŋrieŋ',
  jrA: 'xraŋ',
  MrA: 'nraŋ',
  dtA: 'kreŋ',
  etA: 'khreŋ',
  DtA: 'mreŋ',
  AtA: 'preŋ',
  jtI: 'xrueŋ',
  jtA: 'xreŋ',
  JtA: 'treŋ',
  htA: 'qreŋ',
  UtA: 'dzreŋ',
  TtA: 'chreŋ',
  MtA: 'nreŋ',
  BtA: 'phreŋ',
  itI: 'qhrueŋ',
  LtA: 'dreŋ',
  htI: 'qrueŋ',
  CtA: 'breŋ',
  gtA: 'ŋreŋ',
  StA: 'creŋ',
  OuA: 'chieŋ',
  PuA: 'dzieŋ',
  NuA: 'cieŋ',
  luA: 'jieŋ',
  luI: 'jyeŋ',
  huA: 'qieŋ',
  JuA: 'trieŋ',
  KuA: 'thrieŋ',
  ZuA: 'dieŋ',
  LuA: 'drieŋ',
  auA: 'shieŋ',
  XuA: 'tieŋ',
  euA: 'khieŋ',
  DuA: 'mieŋ',
  IuA: 'lieŋ',
  AuA: 'pieŋ',
  euI: 'khyeŋ',
  RuA: 'zieŋ',
  huI: 'qyeŋ',
  fuI: 'gyeŋ',
  QuI: 'syeŋ',
  fuA: 'gieŋ',
  iuI: 'qhyeŋ',
  OvA: 'cheŋ',
  dvA: 'keŋ',
  jvA: 'xeŋ',
  GvA: 'deŋ',
  EvA: 'teŋ',
  ivA: 'qheŋ',
  QvA: 'seŋ',
  BvA: 'pheŋ',
  IvA: 'leŋ',
  HvA: 'neŋ',
  FvA: 'theŋ',
  DvA: 'meŋ',
  CvA: 'beŋ',
  jvI: 'xueŋ',
  dvI: 'kueŋ',
  XwA: 'tiəŋ',
  ZwA: 'diəŋ',
  LwA: 'driəŋ',
  IwA: 'liəŋ',
  hwA: 'qiəŋ',
  CwA: 'bryəŋ',
  AwA: 'pryəŋ',
  lwA: 'jiəŋ',
  bwA: 'zhiəŋ',
  awA: 'shiəŋ',
  cwA: 'niəŋ',
  dwA: 'kiəŋ',
  JwA: 'triəŋ',
  PwA: 'dziəŋ',
  gwA: 'ŋiəŋ',
  iwA: 'qhiəŋ',
  YwA: 'thiəŋ',
  fwA: 'giəŋ',
  VwA: 'sriəŋ',
  ewA: 'khiəŋ',
  KwA: 'thriəŋ',
  UwA: 'dzriəŋ',
  BwA: 'phryəŋ',
  ExA: 'təŋ',
  IxA: 'ləŋ',
  QxA: 'səŋ',
  AxA: 'pəŋ',
  NxA: 'cəŋ',
  DxA: 'məŋ',
  PxA: 'dzəŋ',
  CxA: 'bəŋ',
  jxI: 'xuəŋ',
  dxI: 'kuəŋ',
  ixI: 'qhuəŋ',
  HxA: 'nəŋ',
  GxA: 'dəŋ',
  jxA: 'xəŋ',
  dxA: 'kəŋ',
  FxA: 'thəŋ',
  BxA: 'phəŋ',
  kyA: 'xyu',
  hyA: 'qyu',
  IyA: 'lyu',
  OyA: 'chyu',
  lyA: 'jyu',
  gyA: 'ŋyu',
  NyA: 'cyu',
  PyA: 'dzyu',
  QyA: 'syu',
  KyA: 'thryu',
  eyA: 'khyu',
  YyA: 'thyu',
  XyA: 'tyu',
  ZyA: 'dyu',
  cyA: 'nyu',
  ayA: 'shyu',
  ByA: 'phyu',
  dyA: 'kyu',
  AyA: 'pyu',
  VyA: 'sryu',
  TyA: 'chryu',
  SyA: 'cryu',
  UyA: 'dzryu',
  iyA: 'qhyu',
  RyA: 'zyu',
  LyA: 'dryu',
  JyA: 'tryu',
  fyA: 'gyu',
  CyA: 'byu',
  DyA: 'myu',
  jzA: 'xu',
  hzA: 'qu',
  HzA: 'nu',
  IzA: 'lu',
  QzA: 'su',
  ezA: 'khu',
  izA: 'qhu',
  NzA: 'cu',
  FzA: 'thu',
  GzA: 'du',
  gzA: 'ŋu',
  dzA: 'ku',
  EzA: 'tu',
  PzA: 'dzu',
  CzA: 'bu',
  OzA: 'chu',
  DzA: 'mu',
  h0A: 'qiu',
  f0A: 'griu',
  A0A: 'piu',
  I0A: 'liu',
  d0A: 'kriu',
  C0A: 'briu',
  N0A: 'ciu',
  V0A: 'sriu',
  g0A: 'ŋiu',
  i0A: 'qhriu',
  D0A: 'miu',
  O1A: 'chim',
  R1A: 'zim',
  I1A: 'lim',
  K1A: 'thrim',
  X1A: 'tim',
  L1A: 'drim',
  J1A: 'trim',
  Z1A: 'dim',
  c1A: 'nim',
  a1A: 'shim',
  l1A: 'jim',
  Q1A: 'sim',
  h1A: 'qim',
  N1A: 'cim',
  P1A: 'dzim',
  M1A: 'nrim',
  f1E: 'grim',
  e1E: 'khrim',
  g1E: 'ŋrim',
  i1E: 'qhrim',
  d1E: 'krim',
  h1E: 'qrim',
  V1A: 'srim',
  U1A: 'dzrim',
  S1A: 'crim',
  T1A: 'chrim',
  Y1A: 'thim',
  G2A: 'dəm',
  O2A: 'chəm',
  H2A: 'nəm',
  h2A: 'qəm',
  j2A: 'xəm',
  I2A: 'ləm',
  P2A: 'dzəm',
  N2A: 'cəm',
  F2A: 'thəm',
  E2A: 'təm',
  e2A: 'khəm',
  i2A: 'qhəm',
  Q2A: 'səm',
  d2A: 'kəm',
  g2A: 'ŋəm',
  G3A: 'dam',
  d3A: 'kam',
  E3A: 'tam',
  Q3A: 'sam',
  I3A: 'lam',
  e3A: 'kham',
  F3A: 'tham',
  P3A: 'dzam',
  j3A: 'xam',
  D3A: 'mam',
  i3A: 'qham',
  l4A: 'jiem',
  I4A: 'liem',
  A4E: 'priem',
  Q4A: 'siem',
  O4A: 'chiem',
  X4A: 'tiem',
  Z4A: 'diem',
  a4A: 'shiem',
  Y4A: 'thiem',
  c4A: 'niem',
  M4A: 'nriem',
  k4A: 'xriem',
  J4A: 'triem',
  K4A: 'thriem',
  h4E: 'qriem',
  e4E: 'khriem',
  g4E: 'ŋriem',
  N4A: 'ciem',
  P4A: 'dziem',
  f4E: 'griem',
  h4A: 'qiem',
  R4A: 'ziem',
  V4A: 'sriem',
  L4A: 'driem',
  f4A: 'giem',
  F5A: 'them',
  E5A: 'tem',
  G5A: 'dem',
  I5A: 'lem',
  e5A: 'khem',
  d5A: 'kem',
  j5A: 'xem',
  H5A: 'nem',
  i5A: 'qhem',
  j6A: 'xrem',
  d6A: 'krem',
  V6A: 'srem',
  h6A: 'qrem',
  g6A: 'ŋrem',
  i6A: 'qhrem',
  J6A: 'trem',
  M6A: 'nrem',
  U6A: 'dzrem',
  e6A: 'khrem',
  j7A: 'xram',
  U7A: 'dzram',
  g7A: 'ŋram',
  T7A: 'chram',
  V7A: 'sram',
  d7A: 'kram',
  C7A: 'bram',
  e7A: 'khram',
  g8A: 'ŋiam',
  i8A: 'qhiam',
  h8A: 'qiam',
  e8A: 'khiam',
  C9A: 'byom',
  B9A: 'phyom',
  EAB: 'túŋ',
  DAB: 'múŋ',
  eAB: 'khúŋ',
  QAB: 'súŋ',
  FAB: 'thúŋ',
  NAB: 'cúŋ',
  jAB: 'xúŋ',
  hAB: 'qúŋ',
  HAB: 'núŋ',
  AAB: 'púŋ',
  IAB: 'lúŋ',
  iAB: 'qhúŋ',
  GAB: 'dúŋ',
  CAB: 'búŋ',
  XDB: 'tyóŋ',
  KDB: 'thryóŋ',
  IDB: 'lyóŋ',
  hDB: 'qyóŋ',
  cDB: 'nyóŋ',
  LDB: 'dryóŋ',
  JDB: 'tryóŋ',
  CDB: 'byóŋ',
  BDB: 'phyóŋ',
  lDB: 'jyóŋ',
  eDB: 'khyóŋ',
  ZDB: 'dyóŋ',
  dDB: 'kyóŋ',
  QDB: 'syóŋ',
  iDB: 'qhyóŋ',
  ADB: 'pyóŋ',
  ECB: 'tóŋ',
  DCB: 'móŋ',
  fDB: 'gyóŋ',
  YDB: 'thyóŋ',
  NDB: 'cyóŋ',
  dEB: 'króŋ',
  CEB: 'bróŋ',
  hEB: 'qróŋ',
  DEB: 'mróŋ',
  jEB: 'xróŋ',
  AEB: 'próŋ',
  iEB: 'qhróŋ',
  XFB: 'tié',
  ZFB: 'dié',
  DFF: 'mrié',
  AFF: 'prié',
  CFF: 'brié',
  iFN: 'qhryé',
  hFN: 'qryé',
  eFN: 'khryé',
  dFN: 'kryé',
  QFJ: 'syé',
  IFJ: 'lyé',
  fFF: 'grié',
  hFF: 'qrié',
  dFF: 'krié',
  eFF: 'khrié',
  gFF: 'ŋrié',
  kFJ: 'xryé',
  NFJ: 'cyé',
  cFJ: 'nyé',
  OFB: 'chié',
  LFB: 'drié',
  QFB: 'sié',
  lFB: 'jié',
  IFB: 'lié',
  VFB: 'srié',
  AFB: 'pié',
  cFB: 'nié',
  DFB: 'mié',
  CFB: 'bié',
  YFB: 'thié',
  aFB: 'shié',
  NFB: 'cié',
  XFJ: 'tyé',
  TFJ: 'chryé',
  RFJ: 'zyé',
  bFB: 'zhié',
  SFB: 'crié',
  BFF: 'phrié',
  BFB: 'phié',
  lFJ: 'jyé',
  PFJ: 'dzyé',
  eFJ: 'khyé',
  MFB: 'nrié',
  gFN: 'ŋryé',
  fFN: 'gryé',
  KFB: 'thrié',
  JFB: 'trié',
  iFF: 'qhrié',
  eFB: 'khié',
  ZFJ: 'dyé',
  dFB: 'kié',
  XGB: 'tí',
  ZGB: 'dí',
  DGF: 'mrýi',
  AGF: 'prýi',
  RGB: 'zí',
  dGF: 'krí',
  NGB: 'cí',
  AGB: 'pí',
  dGN: 'krýi',
  kGJ: 'xrýi',
  aGB: 'shí',
  LGB: 'drí',
  QGB: 'sí',
  CGB: 'bí',
  IGB: 'lí',
  aGJ: 'shýi',
  IGJ: 'lýi',
  fGJ: 'gýi',
  OGJ: 'chýi',
  MGB: 'nrí',
  dGJ: 'kýi',
  CGF: 'brýi',
  PGJ: 'dzýi',
  BGF: 'phrýi',
  cGJ: 'nýi',
  lGJ: 'jýi',
  hGF: 'qrí',
  NGJ: 'cýi',
  JGB: 'trí',
  KGB: 'thrí',
  iGJ: 'qhýi',
  fGN: 'grýi',
  fGF: 'grí',
  eGN: 'khrýi',
  XHB: 'tiə́',
  ZHB: 'diə́',
  JHB: 'triə́',
  iHB: 'qhiə́',
  dHB: 'kiə́',
  lHB: 'jiə́',
  RHB: 'ziə́',
  VHB: 'sriə́',
  cHB: 'niə́',
  IHB: 'liə́',
  QHB: 'siə́',
  aHB: 'shiə́',
  LHB: 'driə́',
  eHB: 'khiə́',
  UHB: 'dzriə́',
  WHB: 'zriə́',
  NHB: 'ciə́',
  kHB: 'xiə́',
  gHB: 'ŋiə́',
  YHB: 'thiə́',
  KHB: 'thriə́',
  THB: 'chriə́',
  SHB: 'criə́',
  hHB: 'qiə́',
  MHB: 'nriə́',
  DIB: 'myúi',
  hIB: 'qiə́i',
  eIB: 'khiə́i',
  dIB: 'kiə́i',
  BIB: 'phyúi',
  AIB: 'pyúi',
  kIJ: 'xyúi',
  dIJ: 'kyúi',
  iIJ: 'qhyúi',
  gIB: 'ŋiə́i',
  iIB: 'qhiə́i',
  hIJ: 'qyúi',
  CIB: 'byúi',
  gJB: 'ŋió',
  IJB: 'lió',
  LJB: 'drió',
  lJB: 'jió',
  XJB: 'tió',
  cJB: 'nió',
  aJB: 'shió',
  YJB: 'thió',
  JJB: 'trió',
  QJB: 'sió',
  KJB: 'thrió',
  MJB: 'nrió',
  iJB: 'qhió',
  fJB: 'gió',
  VJB: 'srió',
  TJB: 'chrió',
  SJB: 'crió',
  UJB: 'dzrió',
  PJB: 'dzió',
  hJB: 'qió',
  dJB: 'kió',
  RJB: 'zió',
  eJB: 'khió',
  bJB: 'zhió',
  ZJB: 'dió',
  OJB: 'chió',
  NJB: 'ció',
  gKB: 'ŋyó',
  kKB: 'xyó',
  PKB: 'dzyó',
  AKB: 'pyó',
  DKB: 'myó',
  CKB: 'byó',
  BKB: 'phyó',
  LKB: 'dryó',
  iKB: 'qhyó',
  ZKB: 'dyó',
  lKB: 'jyó',
  XKB: 'tyó',
  hKB: 'qyó',
  eKB: 'khyó',
  JKB: 'tryó',
  cKB: 'nyó',
  fKB: 'gyó',
  VKB: 'sryó',
  dKB: 'kyó',
  OKB: 'chyó',
  IKB: 'lyó',
  QKB: 'syó',
  UKB: 'dzryó',
  DLB: 'mó',
  FLB: 'thó',
  GLB: 'dó',
  ILB: 'ló',
  OLB: 'chó',
  ELB: 'tó',
  dLB: 'kó',
  gLB: 'ŋó',
  CLB: 'bó',
  PLB: 'dzó',
  NLB: 'có',
  iLB: 'qhó',
  hLB: 'qó',
  eLB: 'khó',
  HLB: 'nó',
  jLB: 'xó',
  BLB: 'phó',
  ALB: 'pó',
  PMB: 'dzéi',
  IMB: 'léi',
  FMB: 'théi',
  BMB: 'phéi',
  NMB: 'céi',
  EMB: 'téi',
  GMB: 'déi',
  HMB: 'néi',
  QMB: 'séi',
  OMB: 'chéi',
  eMB: 'khéi',
  DMB: 'méi',
  CMB: 'béi',
  hMB: 'qéi',
  gMB: 'ŋéi',
  AMB: 'péi',
  jPB: 'xré',
  DPB: 'mré',
  ePB: 'khré',
  LPB: 'dré',
  MPB: 'nré',
  CPB: 'bré',
  hPB: 'qré',
  APB: 'pré',
  dPB: 'kré',
  VPB: 'sré',
  dPJ: 'krué',
  LPJ: 'drué',
  jPJ: 'xrué',
  iPJ: 'qhrué',
  fPB: 'gré',
  jQB: 'xréi',
  eQB: 'khréi',
  gQB: 'ŋréi',
  hQB: 'qréi',
  iSJ: 'qhúi',
  hSJ: 'qúi',
  ISJ: 'lúi',
  GSJ: 'dúi',
  PSJ: 'dzúi',
  DSB: 'múi',
  FSJ: 'thúi',
  jSJ: 'xúi',
  eSJ: 'khúi',
  ESJ: 'túi',
  HSJ: 'núi',
  gSJ: 'ŋúi',
  OSJ: 'chúi',
  CSB: 'búi',
  NSJ: 'cúi',
  iTB: 'qhə́i',
  eTB: 'khə́i',
  NTB: 'cə́i',
  GTB: 'də́i',
  HTB: 'nə́i',
  dTB: 'kə́i',
  jTB: 'xə́i',
  OTB: 'chə́i',
  YTB: 'thьʼə́i',
  ETB: 'tə́i',
  PTB: 'dzə́i',
  hTB: 'qə́i',
  lTB: 'jьʼə́i',
  FTB: 'thə́i',
  cTB: 'nьʼə́i',
  ITB: 'lə́i',
  XVB: 'tín',
  KVB: 'thrín',
  ZVB: 'dín',
  cVB: 'nín',
  aVB: 'shín',
  IVB: 'lín',
  LVB: 'drín',
  dVB: 'kín',
  PVB: 'dzín',
  NVB: 'cín',
  CVB: 'bín',
  gVF: 'ŋrín',
  OVB: 'chín',
  fVN: 'grýn',
  lVB: 'jín',
  DVF: 'mrýn',
  DVB: 'mín',
  kVJ: 'xrýn',
  XVJ: 'týn',
  lVJ: 'jýn',
  QVJ: 'sýn',
  cVJ: 'nýn',
  YVJ: 'thýn',
  bVJ: 'zhýn',
  KVJ: 'thrýn',
  IVJ: 'lýn',
  eVB: 'khín',
  aVJ: 'shýn',
  UVB: 'dzrín',
  JVB: 'trín',
  DXB: 'myún',
  AXB: 'pyún',
  CXB: 'byún',
  BXB: 'phyún',
  hXJ: 'qyún',
  gXJ: 'ŋyún',
  kXJ: 'xyún',
  eXJ: 'khyún',
  hYB: 'qiə́n',
  dYB: 'kiə́n',
  eYB: 'khiə́n',
  fYB: 'giə́n',
  gYB: 'ŋiə́n',
  iYB: 'qhiə́n',
  gZJ: 'ŋyón',
  kZJ: 'xyón',
  hZB: 'qián',
  dZB: 'kián',
  fZB: 'gián',
  eZB: 'khián',
  gZB: 'ŋián',
  iZB: 'qhián',
  DZB: 'myón',
  AZB: 'pyón',
  fZJ: 'gyón',
  hZJ: 'qyón',
  eZJ: 'khyón',
  iZJ: 'qhyón',
  CZB: 'byón',
  jaJ: 'xún',
  BaB: 'phún',
  OaJ: 'chún',
  AaB: 'pún',
  QaJ: 'sún',
  NaJ: 'cún',
  haJ: 'qún',
  GaJ: 'dún',
  PaJ: 'dzún',
  daJ: 'kún',
  FaJ: 'thún',
  eaJ: 'khún',
  IaJ: 'lún',
  CaB: 'bún',
  DaB: 'mún',
  HaJ: 'nún',
  iaJ: 'qhún',
  jbB: 'xə́n',
  ebB: 'khə́n',
  dbB: 'kə́n',
  jcB: 'xán',
  EcB: 'tán',
  FcB: 'thán',
  QcB: 'sán',
  GcB: 'dán',
  PcB: 'dzán',
  dcB: 'kán',
  IcB: 'lán',
  ecB: 'khán',
  icB: 'qhán',
  NcB: 'cán',
  jcJ: 'xuán',
  EcJ: 'tuán',
  hcJ: 'quán',
  FcJ: 'thuán',
  QcJ: 'suán',
  dcJ: 'kuán',
  IcJ: 'luán',
  ecJ: 'khuán',
  HcJ: 'nuán',
  NcJ: 'cuán',
  CcB: 'bán',
  DcB: 'mán',
  AcB: 'pán',
  RcJ: 'zuán',
  GcJ: 'duán',
  HcB: 'nán',
  BcB: 'phán',
  VdB: 'srán',
  hdJ: 'qruán',
  AdB: 'prán',
  SdB: 'crán',
  MdB: 'nrán',
  jdB: 'xrán',
  jdJ: 'xruán',
  CdB: 'brán',
  DdB: 'mrán',
  UdB: 'dzrán',
  gdB: 'ŋrán',
  TdB: 'chrán',
  BdB: 'phrán',
  UdJ: 'dzruán',
  VeB: 'srén',
  jeB: 'xrén',
  deB: 'krén',
  TeB: 'chrén',
  UeB: 'dzrén',
  geB: 'ŋrén',
  SeB: 'crén',
  TeJ: 'chruén',
  eeB: 'khrén',
  QgB: 'sén',
  FgB: 'thén',
  EgB: 'tén',
  hgB: 'qén',
  GgB: 'dén',
  dgB: 'kén',
  jgB: 'xén',
  igB: 'qhén',
  DgB: 'mén',
  HgB: 'nén',
  AgB: 'pén',
  jgJ: 'xuén',
  dgJ: 'kuén',
  CgB: 'bén',
  egJ: 'khuén',
  egB: 'khén',
  ggB: 'ŋén',
  QfB: 'sién',
  lfB: 'jién',
  PfB: 'dzién',
  JfB: 'trién',
  XfB: 'tién',
  MfB: 'nrién',
  OfB: 'chién',
  YfB: 'thién',
  efB: 'khién',
  dfF: 'krién',
  ZfB: 'dién',
  NfB: 'cién',
  cfB: 'nién',
  RfB: 'zién',
  IfB: 'lién',
  gfF: 'ŋrién',
  ffF: 'grién',
  CfF: 'bryén',
  DfB: 'mién',
  AfB: 'pién',
  NfJ: 'cyén',
  PfJ: 'dzyén',
  AfF: 'pryén',
  lfJ: 'jyén',
  IfJ: 'lyén',
  JfJ: 'tryén',
  dfN: 'kryén',
  ffN: 'gryén',
  cfJ: 'nyén',
  YfJ: 'thyén',
  ZfJ: 'dyén',
  LfJ: 'dryén',
  XfJ: 'tyén',
  QfJ: 'syén',
  UfJ: 'dzryén',
  ffJ: 'gyén',
  ifJ: 'qhyén',
  CfB: 'bién',
  DfF: 'mryén',
  KfB: 'thrién',
  BfF: 'phryén',
  afB: 'shién',
  hfF: 'qrién',
  LfB: 'drién',
  UfB: 'dzrién',
  QhB: 'séu',
  dhB: 'kéu',
  EhB: 'téu',
  IhB: 'léu',
  FhB: 'théu',
  ihB: 'qhéu',
  hhB: 'qéu',
  HhB: 'néu',
  jhB: 'xéu',
  GhB: 'déu',
  ehB: 'khéu',
  NhB: 'céu',
  QiB: 'siéu',
  LiB: 'driéu',
  XiB: 'tiéu',
  hiF: 'qriéu',
  KiB: 'thriéu',
  aiB: 'shiéu',
  ciB: 'niéu',
  CiB: 'biéu',
  YiB: 'thiéu',
  BiB: 'phiéu',
  DiB: 'miéu',
  ZiB: 'diéu',
  diF: 'kriéu',
  AiF: 'priéu',
  AiB: 'piéu',
  CiF: 'briéu',
  liB: 'jiéu',
  OiB: 'chiéu',
  NiB: 'ciéu',
  fiF: 'griéu',
  IiB: 'liéu',
  BiF: 'phriéu',
  hiB: 'qiéu',
  ejB: 'khráu',
  jjB: 'xráu',
  AjB: 'práu',
  MjB: 'nráu',
  DjB: 'mráu',
  djB: 'kráu',
  SjB: 'cráu',
  hjB: 'qráu',
  CjB: 'bráu',
  gjB: 'ŋráu',
  UjB: 'dzráu',
  TjB: 'chráu',
  JjB: 'tráu',
  VjB: 'sráu',
  jkB: 'xáu',
  CkB: 'báu',
  IkB: 'láu',
  FkB: 'tháu',
  GkB: 'dáu',
  HkB: 'náu',
  QkB: 'sáu',
  EkB: 'táu',
  OkB: 'cháu',
  NkB: 'cáu',
  PkB: 'dzáu',
  dkB: 'káu',
  ikB: 'qháu',
  DkB: 'máu',
  AkB: 'páu',
  hkB: 'qáu',
  ekB: 'kháu',
  gkB: 'ŋáu',
  dlB: 'ká',
  OlB: 'chá',
  ElB: 'tá',
  QlB: 'sá',
  GlB: 'dá',
  glB: 'ŋá',
  FlB: 'thá',
  IlB: 'lá',
  HlB: 'ná',
  jlB: 'xá',
  ilB: 'qhá',
  elB: 'khá',
  hlB: 'qá',
  NlB: 'cá',
  dlJ: 'kuá',
  ElJ: 'tuá',
  QlJ: 'suá',
  GlJ: 'duá',
  FlJ: 'thuá',
  DlB: 'má',
  PlJ: 'dzuá',
  glJ: 'ŋuá',
  IlJ: 'luá',
  hlJ: 'quá',
  HlJ: 'nuá',
  AlB: 'pá',
  BlB: 'phá',
  jlJ: 'xuá',
  ilJ: 'qhuá',
  elJ: 'khuá',
  ClB: 'bá',
  OlJ: 'chuá',
  DnB: 'mrá',
  XoB: 'tiá',
  loB: 'jiá',
  gnB: 'ŋrá',
  dnB: 'krá',
  VnB: 'srá',
  hnB: 'qrá',
  RoB: 'ziá',
  jnB: 'xrá',
  QoB: 'siá',
  DoB: 'miá',
  OoB: 'chiá',
  inB: 'qhrá',
  ZoB: 'diá',
  enB: 'khrá',
  CnB: 'brá',
  aoB: 'shiá',
  NoB: 'ciá',
  AnB: 'prá',
  jnJ: 'xruá',
  dnJ: 'kruá',
  gnJ: 'ŋruá',
  coB: 'niá',
  SnB: 'crá',
  JnB: 'trá',
  UnB: 'dzrá',
  YoB: 'thiá',
  MnB: 'nrá',
  enJ: 'khruá',
  TnJ: 'chruá',
  KnJ: 'thruá',
  VnJ: 'sruá',
  KnB: 'thrá',
  InB: 'lrá',
  lpB: 'jiáŋ',
  RpB: 'ziáŋ',
  NpB: 'ciáŋ',
  IpB: 'liáŋ',
  hpB: 'qiáŋ',
  fpB: 'giáŋ',
  gpB: 'ŋiáŋ',
  TpB: 'chriáŋ',
  QpB: 'siáŋ',
  XpB: 'tiáŋ',
  VpB: 'sriáŋ',
  ipB: 'qhiáŋ',
  YpB: 'thiáŋ',
  dpB: 'kiáŋ',
  LpB: 'driáŋ',
  KpB: 'thriáŋ',
  dpJ: 'kyáŋ',
  cpB: 'niáŋ',
  apB: 'shiáŋ',
  BpB: 'phyáŋ',
  DpB: 'myáŋ',
  ApB: 'pyáŋ',
  hpJ: 'qyáŋ',
  kpJ: 'xyáŋ',
  ipJ: 'qhyáŋ',
  OpB: 'chiáŋ',
  JpB: 'triáŋ',
  ZpB: 'diáŋ',
  fpJ: 'gyáŋ',
  CpB: 'byáŋ',
  GqB: 'dáŋ',
  QqB: 'sáŋ',
  dqJ: 'kuáŋ',
  AqB: 'páŋ',
  NqB: 'cáŋ',
  HqB: 'náŋ',
  jqB: 'xáŋ',
  FqB: 'tháŋ',
  DqB: 'máŋ',
  EqB: 'táŋ',
  IqB: 'láŋ',
  hqB: 'qáŋ',
  eqB: 'kháŋ',
  hqJ: 'quáŋ',
  jqJ: 'xuáŋ',
  BqB: 'pháŋ',
  iqJ: 'qhuáŋ',
  dqB: 'káŋ',
  gqB: 'ŋáŋ',
  PqB: 'dzáŋ',
  OqB: 'cháŋ',
  iqB: 'qháŋ',
  eqJ: 'khuáŋ',
  drB: 'kráŋ',
  AsB: 'priéŋ',
  dsB: 'kriéŋ',
  hsB: 'qriéŋ',
  VsB: 'sriéŋ',
  ksJ: 'xryéŋ',
  isJ: 'qhryéŋ',
  DsB: 'mriéŋ',
  dsJ: 'kryéŋ',
  jrB: 'xráŋ',
  DrB: 'mráŋ',
  drJ: 'kruáŋ',
  ArB: 'práŋ',
  JrB: 'tráŋ',
  LrB: 'dráŋ',
  hrJ: 'qruáŋ',
  IrB: 'lráŋ',
  jrJ: 'xruáŋ',
  CrB: 'bráŋ',
  erJ: 'khruáŋ',
  MrB: 'nráŋ',
  dtB: 'kréŋ',
  DtB: 'mréŋ',
  jtB: 'xréŋ',
  CtB: 'bréŋ',
  BtB: 'phréŋ',
  PuB: 'dziéŋ',
  XuB: 'tiéŋ',
  KuB: 'thriéŋ',
  luB: 'jiéŋ',
  fuB: 'giéŋ',
  luJ: 'jyéŋ',
  IuB: 'liéŋ',
  duB: 'kiéŋ',
  AuB: 'piéŋ',
  euJ: 'khyéŋ',
  NuB: 'ciéŋ',
  huB: 'qiéŋ',
  OuB: 'chiéŋ',
  QuB: 'siéŋ',
  DuB: 'miéŋ',
  jvJ: 'xuéŋ',
  dvJ: 'kuéŋ',
  DvB: 'méŋ',
  EvB: 'téŋ',
  GvB: 'déŋ',
  FvB: 'théŋ',
  PvB: 'dzéŋ',
  hvJ: 'quéŋ',
  evB: 'khéŋ',
  HvB: 'néŋ',
  jvB: 'xéŋ',
  QvB: 'séŋ',
  AvB: 'péŋ',
  evJ: 'khuéŋ',
  dvB: 'kéŋ',
  BvB: 'phéŋ',
  hvB: 'qéŋ',
  IvB: 'léŋ',
  CvB: 'béŋ',
  ivJ: 'qhuéŋ',
  gvB: 'ŋéŋ',
  XwB: 'tiə́ŋ',
  KwB: 'thriə́ŋ',
  fwB: 'giə́ŋ',
  VwB: 'sriə́ŋ',
  ExB: 'tə́ŋ',
  BxB: 'phə́ŋ',
  exB: 'khə́ŋ',
  HxB: 'nə́ŋ',
  kyB: 'xyú',
  IyB: 'lyú',
  MyB: 'nryú',
  KyB: 'thryú',
  JyB: 'tryú',
  iyB: 'qhyú',
  dyB: 'kyú',
  ayB: 'shyú',
  YyB: 'thyú',
  PyB: 'dzyú',
  CyB: 'byú',
  AyB: 'pyú',
  eyB: 'khyú',
  cyB: 'nyú',
  fyB: 'gyú',
  LyB: 'dryú',
  lyB: 'jyú',
  ZyB: 'dyú',
  QyB: 'syú',
  hyB: 'qyú',
  NyB: 'cyú',
  VyB: 'sryú',
  XyB: 'tyú',
  ByB: 'phyú',
  SyB: 'cryú',
  UyB: 'dzryú',
  TyB: 'chryú',
  jzB: 'xú',
  DzB: 'mú',
  CzB: 'bú',
  EzB: 'tú',
  FzB: 'thú',
  dzB: 'kú',
  gzB: 'ŋú',
  AzB: 'pú',
  HzB: 'nú',
  QzB: 'sú',
  izB: 'qhú',
  BzB: 'phú',
  hzB: 'qú',
  IzB: 'lú',
  NzB: 'cú',
  ezB: 'khú',
  GzB: 'dú',
  OzB: 'chú',
  h0B: 'qríu',
  d0B: 'kíu',
  f0B: 'gríu',
  O1B: 'chím',
  L1B: 'drím',
  e1F: 'khrím',
  I1B: 'lím',
  Q1B: 'sím',
  K1B: 'thrím',
  N1B: 'cím',
  c1B: 'ním',
  X1B: 'tím',
  a1B: 'shím',
  b1B: 'zhím',
  Z1B: 'dím',
  Y1B: 'thím',
  T1B: 'chrím',
  M1B: 'nrím',
  f1F: 'grím',
  d1F: 'krím',
  P1B: 'dzím',
  g1F: 'ŋrím',
  V1B: 'srím',
  A1F: 'prím',
  h1F: 'qrím',
  B1F: 'phrím',
  i1F: 'qhrím',
  J1B: 'trím',
  l1B: 'jím',
  U1B: 'dzrím',
  d2B: 'kə́m',
  G2B: 'də́m',
  h2B: 'qə́m',
  H2B: 'nə́m',
  F2B: 'thə́m',
  P2B: 'dzə́m',
  O2B: 'chə́m',
  g2B: 'ŋə́m',
  N2B: 'cə́m',
  Q2B: 'sə́m',
  e2B: 'khə́m',
  j2B: 'xə́m',
  I2B: 'lə́m',
  E2B: 'tə́m',
  i2B: 'qhə́m',
  d3B: 'kám',
  a3B: 'shьʼám',
  I3B: 'lám',
  F3B: 'thám',
  E3B: 'tám',
  G3B: 'dám',
  O3B: 'chám',
  D3B: 'mám',
  N3B: 'cám',
  P3B: 'dzám',
  i3B: 'qhám',
  h3B: 'qám',
  e3B: 'khám',
  l4B: 'jiém',
  I4B: 'liém',
  i4F: 'qhriém',
  A4F: 'priém',
  X4B: 'tiém',
  e4F: 'khriém',
  g4F: 'ŋriém',
  f4F: 'griém',
  d4F: 'kriém',
  h4B: 'qiém',
  c4B: 'niém',
  a4B: 'shiém',
  K4B: 'thriém',
  h4F: 'qriém',
  P4B: 'dziém',
  O4B: 'chiém',
  N4B: 'ciém',
  e4B: 'khiém',
  Z4B: 'diém',
  F5B: 'thém',
  H5B: 'ném',
  E5B: 'tém',
  G5B: 'dém',
  e5B: 'khém',
  I5B: 'lém',
  j5B: 'xém',
  O5B: 'chém',
  d5B: 'kém',
  D5B: 'mém',
  g8B: 'ŋiám',
  e8B: 'khiám',
  h8B: 'qiám',
  j6B: 'xrém',
  L6B: 'drém',
  e6B: 'khrém',
  d6B: 'krém',
  U6B: 'dzrém',
  I6B: 'lrém',
  S6B: 'crém',
  T6B: 'chrém',
  i6B: 'qhrém',
  V6B: 'srém',
  h6B: 'qrém',
  M6B: 'nrém',
  K6B: 'thrém',
  j7B: 'xrám',
  e7B: 'khrám',
  V7B: 'srám',
  h7B: 'qrám',
  T7B: 'chrám',
  i7B: 'qhrám',
  U7B: 'dzrám',
  C9B: 'byóm',
  D9B: 'myóm',
  A9B: 'pyóm',
  B9B: 'phyóm',
  QAC: 'sûŋ',
  CBC: 'byûŋ',
  dAC: 'kûŋ',
  IAC: 'lûŋ',
  EAC: 'tûŋ',
  eAC: 'khûŋ',
  NAC: 'cûŋ',
  hAC: 'qûŋ',
  OAC: 'chûŋ',
  GAC: 'dûŋ',
  FAC: 'thûŋ',
  LBC: 'dryûŋ',
  ABC: 'pyûŋ',
  eBC: 'khyûŋ',
  DBC: 'myûŋ',
  iBC: 'qhyûŋ',
  DAC: 'mûŋ',
  OBC: 'chyûŋ',
  BBC: 'phyûŋ',
  PAC: 'dzûŋ',
  JBC: 'tryûŋ',
  jAC: 'xûŋ',
  HAC: 'nûŋ',
  XBC: 'tyûŋ',
  YBC: 'thyûŋ',
  UBC: 'dzryûŋ',
  iAC: 'qhûŋ',
  QCC: 'sôŋ',
  NCC: 'côŋ',
  FCC: 'thôŋ',
  DCC: 'môŋ',
  jCC: 'xôŋ',
  lDC: 'jyôŋ',
  RDC: 'zyôŋ',
  CDC: 'byôŋ',
  fDC: 'gyôŋ',
  ADC: 'pyôŋ',
  dDC: 'kyôŋ',
  hDC: 'qyôŋ',
  JDC: 'tryôŋ',
  NDC: 'cyôŋ',
  KDC: 'thryôŋ',
  cDC: 'nyôŋ',
  XDC: 'tyôŋ',
  LDC: 'dryôŋ',
  IDC: 'lyôŋ',
  eDC: 'khyôŋ',
  PDC: 'dzyôŋ',
  MDC: 'nryôŋ',
  dEC: 'krôŋ',
  jEC: 'xrôŋ',
  JEC: 'trôŋ',
  LEC: 'drôŋ',
  KEC: 'thrôŋ',
  UEC: 'dzrôŋ',
  BEC: 'phrôŋ',
  TEC: 'chrôŋ',
  VEC: 'srôŋ',
  XFC: 'tiê',
  CFC: 'biê',
  XFK: 'tyê',
  IFC: 'liê',
  ZFC: 'diê',
  NFC: 'ciê',
  QFC: 'siê',
  kFK: 'xryê',
  dFO: 'kryê',
  BFG: 'phriê',
  AFG: 'priê',
  CFG: 'briê',
  IFK: 'lyê',
  dFG: 'kriê',
  AFC: 'piê',
  fFG: 'griê',
  OFC: 'chiê',
  lFC: 'jiê',
  gFG: 'ŋriê',
  BFC: 'phiê',
  PFC: 'dziê',
  JFC: 'triê',
  hFG: 'qriê',
  LFK: 'dryê',
  YFK: 'thyê',
  iFG: 'qhriê',
  eFC: 'khiê',
  hFC: 'qiê',
  aFC: 'shiê',
  VFC: 'sriê',
  eFK: 'khyê',
  hFO: 'qryê',
  gFO: 'ŋryê',
  iFO: 'qhryê',
  hFK: 'qyê',
  ZFK: 'dyê',
  dFC: 'kiê',
  cFK: 'nyê',
  YFC: 'thiê',
  QFK: 'syê',
  JFK: 'tryê',
  lFK: 'jyê',
  MFK: 'nryê',
  dFK: 'kyê',
  SFC: 'criê',
  iFK: 'qhyê',
  eFG: 'khriê',
  XGC: 'tî',
  kGK: 'xrŷi',
  DGG: 'mrŷi',
  RGK: 'zŷi',
  NGK: 'cŷi',
  QGK: 'sŷi',
  IGK: 'lŷi',
  AGG: 'prŷi',
  fGO: 'grŷi',
  BGG: 'phrŷi',
  CGG: 'brŷi',
  dGO: 'krŷi',
  VGK: 'srŷi',
  eGO: 'khrŷi',
  iGO: 'qhrŷi',
  ZGC: 'dî',
  IGC: 'lî',
  MGC: 'nrî',
  BGC: 'phî',
  gGG: 'ŋrî',
  JGC: 'trî',
  eGC: 'khî',
  LGC: 'drî',
  DGC: 'mî',
  KGC: 'thrî',
  dGG: 'krî',
  fGG: 'grî',
  fGK: 'gŷi',
  OGK: 'chŷi',
  cGC: 'nî',
  NGC: 'cî',
  OGC: 'chî',
  hGG: 'qrî',
  QGC: 'sî',
  eGG: 'khrî',
  dGK: 'kŷi',
  CGC: 'bî',
  iGK: 'qhŷi',
  AGC: 'pî',
  PGK: 'dzŷi',
  GGC: 'dʼî',
  iGG: 'qhrî',
  lGC: 'jî',
  bGC: 'zhî',
  PGC: 'dzî',
  LGK: 'drŷi',
  YGK: 'thŷi',
  lGK: 'jŷi',
  JGK: 'trŷi',
  YGC: 'thî',
  aGC: 'shî',
  TGK: 'chrŷi',
  aGK: 'shŷi',
  XHC: 'tiə̂',
  LHC: 'driə̂',
  RHC: 'ziə̂',
  OHC: 'chiə̂',
  QHC: 'siə̂',
  aHC: 'shiə̂',
  SHC: 'criə̂',
  IHC: 'liə̂',
  PHC: 'dziə̂',
  KHC: 'thriə̂',
  cHC: 'niə̂',
  VHC: 'sriə̂',
  THC: 'chriə̂',
  lHC: 'jiə̂',
  JHC: 'triə̂',
  ZHC: 'diə̂',
  UHC: 'dzriə̂',
  fHC: 'giə̂',
  YHC: 'thiə̂',
  hHC: 'qiə̂',
  dHC: 'kiə̂',
  iHC: 'qhiə̂',
  gHC: 'ŋiə̂',
  eHC: 'khiə̂',
  DIC: 'myûi',
  dIK: 'kyûi',
  kIK: 'xyûi',
  gIK: 'ŋyûi',
  AIC: 'pyûi',
  BIC: 'phyûi',
  eIK: 'khyûi',
  hIK: 'qyûi',
  iIK: 'qhyûi',
  CIC: 'byûi',
  dIC: 'kiə̂i',
  gIC: 'ŋiə̂i',
  eIC: 'khiə̂i',
  iIC: 'qhiə̂i',
  fIC: 'giə̂i',
  hIC: 'qiə̂i',
  gJC: 'ŋiô',
  IJC: 'liô',
  dJC: 'kiô',
  OJC: 'chiô',
  eJC: 'khiô',
  ZJC: 'diô',
  aJC: 'shiô',
  JJC: 'triô',
  XJC: 'tiô',
  VJC: 'sriô',
  hJC: 'qiô',
  LJC: 'driô',
  fJC: 'giô',
  QJC: 'siô',
  UJC: 'dzriô',
  NJC: 'ciô',
  SJC: 'criô',
  cJC: 'niô',
  lJC: 'jiô',
  iJC: 'qhiô',
  MJC: 'nriô',
  TJC: 'chriô',
  YJC: 'thiô',
  KJC: 'thriô',
  RJC: 'ziô',
  gKC: 'ŋyô',
  hKC: 'qyô',
  ZKC: 'dyô',
  LKC: 'dryô',
  CKC: 'byô',
  XKC: 'tyô',
  dKC: 'kyô',
  iKC: 'qhyô',
  aKC: 'shyô',
  lKC: 'jyô',
  cKC: 'nyô',
  BKC: 'phyô',
  DKC: 'myô',
  NKC: 'cyô',
  fKC: 'gyô',
  kKC: 'xyô',
  PKC: 'dzyô',
  VKC: 'sryô',
  AKC: 'pyô',
  OKC: 'chyô',
  JKC: 'tryô',
  eKC: 'khyô',
  TKC: 'chryô',
  KKC: 'thryô',
  QKC: 'syô',
  IKC: 'lyô',
  DLC: 'mô',
  GLC: 'dô',
  ILC: 'lô',
  ELC: 'tô',
  FLC: 'thô',
  dLC: 'kô',
  gLC: 'ŋô',
  jLC: 'xô',
  QLC: 'sô',
  PLC: 'dzô',
  HLC: 'nô',
  ALC: 'pô',
  hLC: 'qô',
  BLC: 'phô',
  OLC: 'chô',
  eLC: 'khô',
  CLC: 'bô',
  iLC: 'qhô',
  NLC: 'cô',
  NMC: 'cêi',
  EMC: 'têi',
  PMC: 'dzêi',
  FMC: 'thêi',
  GMC: 'dêi',
  OMC: 'chêi',
  QMC: 'sêi',
  gMC: 'ŋêi',
  dMC: 'kêi',
  jMC: 'xêi',
  eMC: 'khêi',
  hMC: 'qêi',
  DMC: 'mêi',
  AMC: 'pêi',
  jMK: 'xuêi',
  dMK: 'kuêi',
  iMK: 'qhuêi',
  BMC: 'phêi',
  CMC: 'bêi',
  IMC: 'lêi',
  HMC: 'nêi',
  iMC: 'qhêi',
  NNC: 'ciêi',
  QNK: 'syêi',
  kNK: 'xryêi',
  cNK: 'nyêi',
  XNK: 'tyêi',
  VNK: 'sryêi',
  ONK: 'chyêi',
  lNK: 'jyêi',
  JNK: 'tryêi',
  aNK: 'shyêi',
  CNC: 'biêi',
  TNK: 'chryêi',
  RNK: 'zyêi',
  ANC: 'piêi',
  dNO: 'kryêi',
  DNC: 'miêi',
  VNC: 'sriêi',
  YNC: 'thiêi',
  XNC: 'tiêi',
  ZNC: 'diêi',
  lNC: 'jiêi',
  hNG: 'qriêi',
  gNC: 'ŋiêi',
  LNC: 'driêi',
  INC: 'liêi',
  eNG: 'khriêi',
  aNC: 'shiêi',
  dNG: 'kriêi',
  JNC: 'triêi',
  fNG: 'griêi',
  ZNK: 'dyêi',
  KNC: 'thriêi',
  LNK: 'dryêi',
  gNG: 'ŋriêi',
  NNK: 'cyêi',
  BNC: 'phiêi',
  eUK: 'khyôi',
  iUK: 'qhyôi',
  FOC: 'thâi',
  dOC: 'kâi',
  gOC: 'ŋâi',
  hOC: 'qâi',
  HOC: 'nâi',
  GOC: 'dâi',
  jOC: 'xâi',
  EOC: 'tâi',
  AOC: 'pâi',
  BOC: 'phâi',
  jOK: 'xuâi',
  GOK: 'duâi',
  dOK: 'kuâi',
  NOK: 'cuâi',
  iOK: 'qhuâi',
  eOK: 'khuâi',
  IOK: 'luâi',
  gOK: 'ŋuâi',
  EOK: 'tuâi',
  hOK: 'quâi',
  POK: 'dzuâi',
  QOK: 'suâi',
  OOK: 'chuâi',
  COC: 'bâi',
  eOC: 'khâi',
  OOC: 'châi',
  IOC: 'lâi',
  iOC: 'qhâi',
  FOK: 'thuâi',
  DOC: 'mâi',
  dPK: 'kruê',
  dPC: 'krê',
  hPC: 'qrê',
  jPC: 'xrê',
  DPC: 'mrê',
  jPK: 'xruê',
  TPC: 'chrê',
  gPC: 'ŋrê',
  iPC: 'qhrê',
  APC: 'prê',
  CPC: 'brê',
  UPC: 'dzrê',
  BPC: 'phrê',
  SPC: 'crê',
  ePC: 'khrê',
  VPC: 'srê',
  iPK: 'qhruê',
  dQK: 'kruêi',
  hQC: 'qrêi',
  SQC: 'crêi',
  dQC: 'krêi',
  MQC: 'nrêi',
  iQC: 'qhrêi',
  jQC: 'xrêi',
  gQC: 'ŋrêi',
  eQK: 'khruêi',
  AQC: 'prêi',
  BQC: 'phrêi',
  jQK: 'xruêi',
  gQK: 'ŋruêi',
  CQC: 'brêi',
  DQC: 'mrêi',
  iQK: 'qhruêi',
  VQC: 'srêi',
  eQC: 'khrêi',
  dRK: 'kruâi',
  eRK: 'khruâi',
  DRC: 'mrâi',
  jRK: 'xruâi',
  CRC: 'brâi',
  hRK: 'qruâi',
  TRK: 'chruâi',
  dRC: 'krâi',
  KRC: 'thrâi',
  hRC: 'qrâi',
  VRC: 'srâi',
  LRC: 'drâi',
  iRC: 'qhrâi',
  iRK: 'qhruâi',
  ARC: 'prâi',
  URC: 'dzrâi',
  jRC: 'xrâi',
  GSK: 'dûi',
  CSC: 'bûi',
  DSC: 'mûi',
  BSC: 'phûi',
  iSK: 'qhûi',
  ESK: 'tûi',
  OSK: 'chûi',
  NSK: 'cûi',
  hSK: 'qûi',
  FSK: 'thûi',
  dSK: 'kûi',
  jSK: 'xûi',
  eSK: 'khûi',
  QSK: 'sûi',
  HSK: 'nûi',
  ISK: 'lûi',
  ASC: 'pûi',
  gSK: 'ŋûi',
  GTC: 'də̂i',
  NTC: 'cə̂i',
  QTC: 'sə̂i',
  FTC: 'thə̂i',
  dTC: 'kə̂i',
  eTC: 'khə̂i',
  gTC: 'ŋə̂i',
  hTC: 'qə̂i',
  jTC: 'xə̂i',
  HTC: 'nə̂i',
  ETC: 'tə̂i',
  ITC: 'lə̂i',
  OTC: 'chə̂i',
  PTC: 'dzə̂i',
  iTC: 'qhə̂i',
  AUC: 'pyôi',
  BUC: 'phyôi',
  hUK: 'qyôi',
  CUC: 'byôi',
  fUK: 'gyôi',
  gUC: 'ŋiâi',
  XVC: 'tîn',
  QVC: 'sîn',
  cVC: 'nîn',
  lVC: 'jîn',
  IVC: 'lîn',
  AVC: 'pîn',
  LVC: 'drîn',
  ZVC: 'dîn',
  aVC: 'shîn',
  eVC: 'khrîn',
  RVC: 'zîn',
  gVG: 'ŋrîn',
  NVC: 'cîn',
  iVG: 'qhrîn',
  JVC: 'trîn',
  fVG: 'grîn',
  TVC: 'chrîn',
  hVC: 'qîn',
  KVC: 'thrîn',
  BVC: 'phîn',
  OVC: 'chîn',
  dVK: 'kŷn',
  XVK: 'tŷn',
  QVK: 'sŷn',
  RVK: 'zŷn',
  NVK: 'cŷn',
  aVK: 'shŷn',
  cVK: 'nŷn',
  bVK: 'zhŷn',
  DXC: 'myûn',
  kXK: 'xyûn',
  iXK: 'qhyûn',
  BXC: 'phyûn',
  AXC: 'pyûn',
  hXK: 'qyûn',
  dXK: 'kyûn',
  fXK: 'gyûn',
  CXC: 'byûn',
  iYC: 'qhiə̂n',
  dYC: 'kiə̂n',
  fYC: 'giə̂n',
  hYC: 'qiə̂n',
  gYC: 'ŋiə̂n',
  gZK: 'ŋyôn',
  hZK: 'qyôn',
  AZC: 'pyôn',
  eZK: 'khyôn',
  DZC: 'myôn',
  CZC: 'byôn',
  BZC: 'phyôn',
  dZC: 'kiân',
  hZC: 'qiân',
  iZC: 'qhiân',
  iZK: 'qhyôn',
  fZC: 'giân',
  kZK: 'xyôn',
  gZC: 'ŋiân',
  fZK: 'gyôn',
  dZK: 'kyôn',
  jaK: 'xûn',
  EaK: 'tûn',
  QaK: 'sûn',
  eaK: 'khûn',
  HaK: 'nûn',
  haK: 'qûn',
  DaC: 'mûn',
  PaK: 'dzûn',
  daK: 'kûn',
  BaC: 'phûn',
  GaK: 'dûn',
  OaK: 'chûn',
  CaC: 'bûn',
  gaK: 'ŋûn',
  IaK: 'lûn',
  AaC: 'pûn',
  iaK: 'qhûn',
  NaK: 'cûn',
  jbC: 'xə̂n',
  dbC: 'kə̂n',
  gbC: 'ŋə̂n',
  hbC: 'qə̂n',
  jcC: 'xân',
  FcC: 'thân',
  hcC: 'qân',
  EcC: 'tân',
  GcC: 'dân',
  dcC: 'kân',
  gcC: 'ŋân',
  ecC: 'khân',
  icC: 'qhân',
  IcC: 'lân',
  HcC: 'nân',
  OcC: 'chân',
  QcC: 'sân',
  NcC: 'cân',
  PcC: 'dzân',
  jcK: 'xuân',
  NcK: 'cuân',
  hcK: 'quân',
  dcK: 'kuân',
  OcK: 'chuân',
  gcK: 'ŋuân',
  GcK: 'duân',
  IcK: 'luân',
  EcK: 'tuân',
  FcK: 'thuân',
  icK: 'qhuân',
  QcK: 'suân',
  DcC: 'mân',
  AcC: 'pân',
  BcC: 'phân',
  CcC: 'bân',
  HcK: 'nuân',
  PcK: 'dzuân',
  ecK: 'khuân',
  ddC: 'krân',
  gdC: 'ŋrân',
  hdC: 'qrân',
  VdC: 'srân',
  jdC: 'xrân',
  DdC: 'mrân',
  hdK: 'qruân',
  jdK: 'xruân',
  ddK: 'kruân',
  VdK: 'sruân',
  TdK: 'chruân',
  gdK: 'ŋruân',
  UdC: 'dzrân',
  BdC: 'phrân',
  MdK: 'nruân',
  TdC: 'chrân',
  KdC: 'thrân',
  deC: 'krên',
  jeC: 'xrên',
  CeC: 'brên',
  BeC: 'phrên',
  jeK: 'xruên',
  DeC: 'mrên',
  AeC: 'prên',
  deK: 'kruên',
  QgC: 'sên',
  OgC: 'chên',
  igK: 'qhuên',
  jgK: 'xuên',
  dgK: 'kuên',
  GgC: 'dên',
  FgC: 'thên',
  IgC: 'lên',
  dgC: 'kên',
  HgC: 'nên',
  egC: 'khên',
  jgC: 'xên',
  ggC: 'ŋên',
  hgC: 'qên',
  NgC: 'cên',
  DgC: 'mên',
  BgC: 'phên',
  PgC: 'dzên',
  hgK: 'quên',
  EgC: 'tên',
  igC: 'qhên',
  QfC: 'siên',
  XfC: 'tiên',
  ZfC: 'diên',
  gfG: 'ŋriên',
  efC: 'khiên',
  dfK: 'kyên',
  kfK: 'xryên',
  DfC: 'miên',
  YfK: 'thyên',
  lfK: 'jyên',
  JfC: 'triên',
  cfK: 'nyên',
  NfC: 'ciên',
  YfC: 'thiên',
  afC: 'shiên',
  dfO: 'kryên',
  ffO: 'gryên',
  IfK: 'lyên',
  KfK: 'thryên',
  AfG: 'pryên',
  VfK: 'sryên',
  OfK: 'chyên',
  CfG: 'bryên',
  RfK: 'zyên',
  QfK: 'syên',
  UfK: 'dzryên',
  SfK: 'cryên',
  LfK: 'dryên',
  PfC: 'dziên',
  RfC: 'ziên',
  BfC: 'phiên',
  ZfK: 'dyên',
  MfC: 'nriên',
  JfK: 'tryên',
  lfC: 'jiên',
  CfC: 'biên',
  LfC: 'driên',
  IfC: 'liên',
  efO: 'khryên',
  XfK: 'tyên',
  AgC: 'pên',
  QhC: 'sêu',
  FhC: 'thêu',
  EhC: 'têu',
  dhC: 'kêu',
  HhC: 'nêu',
  GhC: 'dêu',
  ehC: 'khêu',
  IhC: 'lêu',
  ghC: 'ŋêu',
  hhC: 'qêu',
  ihC: 'qhêu',
  QiC: 'siêu',
  XiC: 'tiêu',
  liC: 'jiêu',
  hiC: 'qiêu',
  LiC: 'driêu',
  ZiC: 'diêu',
  fiG: 'griêu',
  BiC: 'phiêu',
  PiC: 'dziêu',
  DiC: 'miêu',
  OiC: 'chiêu',
  IiC: 'liêu',
  eiG: 'khriêu',
  giG: 'ŋriêu',
  NiC: 'ciêu',
  DiG: 'mriêu',
  CiC: 'biêu',
  aiC: 'shiêu',
  KiC: 'thriêu',
  AiG: 'priêu',
  fiC: 'giêu',
  ciC: 'niêu',
  jjC: 'xrâu',
  djC: 'krâu',
  ijC: 'qhrâu',
  JjC: 'trâu',
  AjC: 'prâu',
  ejC: 'khrâu',
  DjC: 'mrâu',
  BjC: 'phrâu',
  KjC: 'thrâu',
  VjC: 'srâu',
  LjC: 'drâu',
  MjC: 'nrâu',
  SjC: 'crâu',
  CjC: 'brâu',
  TjC: 'chrâu',
  hjC: 'qrâu',
  gjC: 'ŋrâu',
  UjC: 'dzrâu',
  jkC: 'xâu',
  GkC: 'dâu',
  EkC: 'tâu',
  dkC: 'kâu',
  gkC: 'ŋâu',
  DkC: 'mâu',
  IkC: 'lâu',
  OkC: 'châu',
  CkC: 'bâu',
  AkC: 'pâu',
  PkC: 'dzâu',
  hkC: 'qâu',
  QkC: 'sâu',
  ekC: 'khâu',
  NkC: 'câu',
  ikC: 'qhâu',
  HkC: 'nâu',
  dlC: 'kâ',
  jlC: 'xâ',
  NlC: 'câ',
  ElC: 'tâ',
  IlC: 'lâ',
  elC: 'khâ',
  glC: 'ŋâ',
  GlC: 'dâ',
  HlC: 'nâ',
  QlC: 'sâ',
  ilC: 'qhâ',
  FlC: 'thâ',
  dlK: 'kuâ',
  jlK: 'xuâ',
  NlK: 'cuâ',
  elK: 'khuâ',
  FlK: 'thuâ',
  AlC: 'pâ',
  OlK: 'chuâ',
  DlC: 'mâ',
  HlK: 'nuâ',
  BlC: 'phâ',
  PlK: 'dzuâ',
  glK: 'ŋuâ',
  ilK: 'qhuâ',
  GlK: 'duâ',
  ClC: 'bâ',
  IlK: 'luâ',
  ElK: 'tuâ',
  QlK: 'suâ',
  hlC: 'qâ',
  hlK: 'quâ',
  DnC: 'mrâ',
  dnC: 'krâ',
  hnC: 'qrâ',
  inC: 'qhrâ',
  gnC: 'ŋrâ',
  KnC: 'thrâ',
  JnC: 'trâ',
  SnC: 'crâ',
  UnC: 'dzrâ',
  RoC: 'ziâ',
  enC: 'khrâ',
  jnC: 'xrâ',
  PoC: 'dziâ',
  loC: 'jiâ',
  YoC: 'thiâ',
  QoC: 'siâ',
  XoC: 'tiâ',
  NoC: 'ciâ',
  aoC: 'shiâ',
  boC: 'zhiâ',
  AnC: 'prâ',
  BnC: 'phrâ',
  jnK: 'xruâ',
  inK: 'qhruâ',
  enK: 'khruâ',
  VnK: 'sruâ',
  CnC: 'brâ',
  MnC: 'nrâ',
  OoC: 'chiâ',
  VnC: 'srâ',
  dnK: 'kruâ',
  LnC: 'drâ',
  gnK: 'ŋruâ',
  hnK: 'qruâ',
  lpC: 'jiâŋ',
  IpC: 'liâŋ',
  UpC: 'dzriâŋ',
  cpC: 'niâŋ',
  apC: 'shiâŋ',
  JpC: 'triâŋ',
  KpC: 'thriâŋ',
  ipC: 'qhiâŋ',
  LpC: 'driâŋ',
  MpC: 'nriâŋ',
  PpC: 'dziâŋ',
  XpC: 'tiâŋ',
  ZpC: 'diâŋ',
  SpC: 'criâŋ',
  hpC: 'qiâŋ',
  fpC: 'giâŋ',
  YpC: 'thiâŋ',
  TpC: 'chriâŋ',
  NpC: 'ciâŋ',
  gpC: 'ŋiâŋ',
  BpC: 'phyâŋ',
  DpC: 'myâŋ',
  ipK: 'qhyâŋ',
  dpK: 'kyâŋ',
  kpK: 'xyâŋ',
  ApC: 'pyâŋ',
  QpC: 'siâŋ',
  dpC: 'kiâŋ',
  epC: 'khiâŋ',
  OpC: 'chiâŋ',
  fpK: 'gyâŋ',
  CpC: 'byâŋ',
  GqC: 'dâŋ',
  IqC: 'lâŋ',
  jqC: 'xâŋ',
  hqC: 'qâŋ',
  gqC: 'ŋâŋ',
  NqC: 'câŋ',
  CqC: 'bâŋ',
  PqC: 'dzâŋ',
  EqC: 'tâŋ',
  eqC: 'khâŋ',
  AqC: 'pâŋ',
  FqC: 'thâŋ',
  eqK: 'khuâŋ',
  HqC: 'nâŋ',
  QqC: 'sâŋ',
  jqK: 'xuâŋ',
  dqK: 'kuâŋ',
  dqC: 'kâŋ',
  iqK: 'qhuâŋ',
  DqC: 'mâŋ',
  hqK: 'quâŋ',
  hsC: 'qriêŋ',
  dsC: 'kriêŋ',
  fsC: 'griêŋ',
  esC: 'khriêŋ',
  drC: 'krâŋ',
  DsC: 'mriêŋ',
  CsC: 'briêŋ',
  DrC: 'mrâŋ',
  jrK: 'xruâŋ',
  AsC: 'priêŋ',
  ksK: 'xryêŋ',
  jrC: 'xrâŋ',
  hrC: 'qrâŋ',
  TsC: 'chriêŋ',
  JrC: 'trâŋ',
  KrC: 'thrâŋ',
  ArC: 'prâŋ',
  LrC: 'drâŋ',
  VsC: 'sriêŋ',
  gsC: 'ŋriêŋ',
  CrC: 'brâŋ',
  irC: 'qhrâŋ',
  hrK: 'qruâŋ',
  StC: 'crêŋ',
  AtC: 'prêŋ',
  CtC: 'brêŋ',
  htC: 'qrêŋ',
  gtC: 'ŋrêŋ',
  itK: 'qhruêŋ',
  duC: 'kiêŋ',
  OuC: 'chiêŋ',
  XuC: 'tiêŋ',
  auC: 'shiêŋ',
  LuC: 'driêŋ',
  KuC: 'thriêŋ',
  QuC: 'siêŋ',
  IuC: 'liêŋ',
  BuC: 'phiêŋ',
  iuK: 'qhyêŋ',
  AuC: 'piêŋ',
  CuC: 'biêŋ',
  PuC: 'dziêŋ',
  ZuC: 'diêŋ',
  DuC: 'miêŋ',
  euC: 'khiêŋ',
  iuC: 'qhiêŋ',
  NuC: 'ciêŋ',
  dvC: 'kêŋ',
  HvC: 'nêŋ',
  QvC: 'sêŋ',
  jvC: 'xêŋ',
  GvC: 'dêŋ',
  EvC: 'têŋ',
  evC: 'khêŋ',
  FvC: 'thêŋ',
  OvC: 'chêŋ',
  DvC: 'mêŋ',
  IvC: 'lêŋ',
  XwC: 'tiə̂ŋ',
  lwC: 'jiə̂ŋ',
  bwC: 'zhiə̂ŋ',
  cwC: 'niə̂ŋ',
  hwC: 'qiə̂ŋ',
  NwC: 'ciə̂ŋ',
  iwC: 'qhiə̂ŋ',
  awC: 'shiə̂ŋ',
  LwC: 'driə̂ŋ',
  CwC: 'bryə̂ŋ',
  YwC: 'thiə̂ŋ',
  gwC: 'ŋiə̂ŋ',
  ZwC: 'diə̂ŋ',
  KwC: 'thriə̂ŋ',
  fwC: 'giə̂ŋ',
  ExC: 'tə̂ŋ',
  PxC: 'dzə̂ŋ',
  dxC: 'kə̂ŋ',
  OxC: 'chə̂ŋ',
  GxC: 'də̂ŋ',
  DxC: 'mə̂ŋ',
  AxC: 'pə̂ŋ',
  CxC: 'bə̂ŋ',
  IxC: 'lə̂ŋ',
  NxC: 'cə̂ŋ',
  QxC: 'sə̂ŋ',
  FxC: 'thə̂ŋ',
  kyC: 'xyû',
  dyC: 'kyû',
  LyC: 'dryû',
  JyC: 'tryû',
  ayC: 'shyû',
  YyC: 'thyû',
  RyC: 'zyû',
  iyC: 'qhyû',
  XyC: 'tyû',
  fyC: 'gyû',
  VyC: 'sryû',
  SyC: 'cryû',
  ByC: 'phyû',
  TyC: 'chryû',
  AyC: 'pyû',
  KyC: 'thryû',
  IyC: 'lyû',
  QyC: 'syû',
  NyC: 'cyû',
  UyC: 'dzryû',
  PyC: 'dzyû',
  MyC: 'nryû',
  CyC: 'byû',
  lyC: 'jyû',
  ZyC: 'dyû',
  cyC: 'nyû',
  DyC: 'myû',
  gyC: 'ŋyû',
  eyC: 'khyû',
  OyC: 'chyû',
  jzC: 'xû',
  ezC: 'khû',
  DzC: 'mû',
  BzC: 'phû',
  GzC: 'dû',
  EzC: 'tû',
  HzC: 'nû',
  QzC: 'sû',
  NzC: 'cû',
  FzC: 'thû',
  hzC: 'qû',
  dzC: 'kû',
  OzC: 'chû',
  IzC: 'lû',
  izC: 'qhû',
  CzC: 'bû',
  gzC: 'ŋû',
  PzC: 'dzû',
  h0C: 'qrîu',
  D0C: 'mrîu',
  e0C: 'khrîu',
  f0C: 'grîu',
  O1C: 'chîm',
  N1C: 'cîm',
  c1C: 'nîm',
  L1C: 'drîm',
  X1C: 'tîm',
  f1G: 'grîm',
  d1G: 'krîm',
  M1C: 'nrîm',
  h1G: 'qrîm',
  V1C: 'srîm',
  K1C: 'thrîm',
  S1C: 'crîm',
  T1C: 'chrîm',
  g1G: 'ŋrîm',
  J1C: 'trîm',
  I1C: 'lîm',
  Z1C: 'dîm',
  k1C: 'xrîm',
  a1C: 'shîm',
  e2C: 'khə̂m',
  d2C: 'kə̂m',
  j2C: 'xə̂m',
  h2C: 'qə̂m',
  F2C: 'thə̂m',
  Q2C: 'sə̂m',
  O2C: 'chə̂m',
  G2C: 'də̂m',
  g2C: 'ŋə̂m',
  E2C: 'tə̂m',
  H2C: 'nə̂m',
  I2C: 'lə̂m',
  i2C: 'qhə̂m',
  N2C: 'cə̂m',
  e3C: 'khâm',
  I3C: 'lâm',
  F3C: 'thâm',
  d3C: 'kâm',
  i3C: 'qhâm',
  j3C: 'xâm',
  G3C: 'dâm',
  P3C: 'dzâm',
  E3C: 'tâm',
  Q3C: 'sâm',
  l4C: 'jiêm',
  Z4C: 'diêm',
  c4C: 'niêm',
  h4C: 'qiêm',
  A4G: 'priêm',
  g4G: 'ŋriêm',
  a4C: 'shiêm',
  N4C: 'ciêm',
  O4C: 'chiêm',
  I4C: 'liêm',
  K4C: 'thriêm',
  Y4C: 'thiêm',
  h4G: 'qriêm',
  P4C: 'dziêm',
  X4C: 'tiêm',
  F5C: 'thêm',
  H5C: 'nêm',
  E5C: 'têm',
  Q5C: 'sêm',
  G5C: 'dêm',
  d5C: 'kêm',
  h5C: 'qêm',
  N5C: 'cêm',
  P5C: 'dzêm',
  e5C: 'khêm',
  I5C: 'lêm',
  g8C: 'ŋiâm',
  i8C: 'qhiâm',
  e8C: 'khiâm',
  D9C: 'myôm',
  j6C: 'xrêm',
  h6C: 'qrêm',
  S6C: 'crêm',
  J6C: 'trêm',
  e6C: 'khrêm',
  L6C: 'drêm',
  U6C: 'dzrêm',
  d6C: 'krêm',
  M6C: 'nrêm',
  g6C: 'ŋrêm',
  d7C: 'krâm',
  T7C: 'chrâm',
  S7C: 'crâm',
  V7C: 'srâm',
  i7C: 'qhrâm',
  C7C: 'brâm',
  j7C: 'xrâm',
  U7C: 'dzrâm',
  h7C: 'qrâm',
  C9C: 'byôm',
  B9C: 'phyôm',
  d8C: 'kiâm',
  h8C: 'qiâm',
  hAD: 'quk',
  GAD: 'duk',
  dAD: 'kuk',
  jAD: 'xuk',
  eAD: 'khuk',
  FAD: 'thuk',
  EAD: 'tuk',
  QAD: 'suk',
  IAD: 'luk',
  iAD: 'qhuk',
  PAD: 'dzuk',
  OAD: 'chuk',
  NAD: 'cuk',
  CAD: 'buk',
  BAD: 'phuk',
  AAD: 'puk',
  DAD: 'muk',
  ABD: 'pyuk',
  CBD: 'byuk',
  VBD: 'sryuk',
  IBD: 'lyuk',
  LBD: 'dryuk',
  dBD: 'kyuk',
  eBD: 'khyuk',
  ZBD: 'dyuk',
  YBD: 'thyuk',
  lBD: 'jyuk',
  fBD: 'gyuk',
  OBD: 'chyuk',
  cBD: 'nyuk',
  XBD: 'tyuk',
  aBD: 'shyuk',
  iBD: 'qhyuk',
  JBD: 'tryuk',
  NBD: 'cyuk',
  TBD: 'chryuk',
  MBD: 'nryuk',
  SBD: 'cryuk',
  BBD: 'phyuk',
  hBD: 'qyuk',
  QBD: 'syuk',
  DBD: 'myuk',
  kBD: 'xyuk',
  KBD: 'thryuk',
  gBD: 'ŋyuk',
  PBD: 'dzyuk',
  hCD: 'qok',
  GCD: 'dok',
  ECD: 'tok',
  eCD: 'khok',
  jCD: 'xok',
  CCD: 'bok',
  QCD: 'sok',
  dCD: 'kok',
  DCD: 'mok',
  iCD: 'qhok',
  HCD: 'nok',
  NCD: 'cok',
  ACD: 'pok',
  ICD: 'lok',
  gCD: 'ŋok',
  XDD: 'tyok',
  gDD: 'ŋyok',
  iDD: 'qhyok',
  dDD: 'kyok',
  fDD: 'gyok',
  ZDD: 'dyok',
  YDD: 'thyok',
  cDD: 'nyok',
  aDD: 'shyok',
  lDD: 'jyok',
  LDD: 'dryok',
  IDD: 'lyok',
  eDD: 'khyok',
  JDD: 'tryok',
  NDD: 'cyok',
  bDD: 'zhyok',
  CDD: 'byok',
  ODD: 'chyok',
  RDD: 'zyok',
  QDD: 'syok',
  ADD: 'pyok',
  KDD: 'thryok',
  dED: 'krok',
  gED: 'ŋrok',
  UED: 'dzrok',
  SED: 'crok',
  VED: 'srok',
  JED: 'trok',
  AED: 'prok',
  DED: 'mrok',
  CED: 'brok',
  BED: 'phrok',
  eED: 'khrok',
  LED: 'drok',
  hED: 'qrok',
  MED: 'nrok',
  KED: 'throk',
  IED: 'lrok',
  jED: 'xrok',
  iED: 'qhrok',
  TED: 'chrok',
  XVD: 'tit',
  cVD: 'nit',
  bVD: 'zhit',
  LVD: 'drit',
  QVD: 'sit',
  hVD: 'qit',
  OVD: 'chit',
  BVD: 'phit',
  dVD: 'kit',
  MVD: 'nrit',
  lVD: 'jit',
  eVD: 'khit',
  iVD: 'qhit',
  KVD: 'thrit',
  IVD: 'lit',
  JVD: 'trit',
  PVD: 'dzit',
  TVD: 'chrit',
  aVD: 'shit',
  NVD: 'cit',
  DVD: 'mit',
  AVD: 'pit',
  fVH: 'grit',
  CVD: 'bit',
  kVL: 'xryt',
  VVL: 'sryt',
  YVD: 'thit',
  UVD: 'dzrit',
  DVH: 'mryt',
  CVH: 'bryt',
  hVH: 'qrit',
  gVH: 'ŋrit',
  AVH: 'pryt',
  JVL: 'tryt',
  iVH: 'qhrit',
  dVH: 'krit',
  iVL: 'qhyt',
  bVL: 'zhyt',
  dVL: 'kyt',
  PVL: 'dzyt',
  lVL: 'jyt',
  NVL: 'cyt',
  QVL: 'syt',
  IVL: 'lyt',
  KVL: 'thryt',
  LVL: 'dryt',
  YVL: 'thyt',
  OVL: 'chyt',
  SVL: 'cryt',
  SWD: 'crit',
  VWD: 'srit',
  UWD: 'dzrit',
  DXD: 'myut',
  AXD: 'pyut',
  hXL: 'qyut',
  dXL: 'kyut',
  eXL: 'khyut',
  fXL: 'gyut',
  CXD: 'byut',
  iXL: 'qhyut',
  kXL: 'xyut',
  BXD: 'phyut',
  gXL: 'ŋyut',
  iYD: 'qhiət',
  dYD: 'kiət',
  gYD: 'ŋiət',
  fYD: 'giət',
  eYD: 'khiət',
  gZL: 'ŋyot',
  CZD: 'byot',
  kZL: 'xyot',
  dZL: 'kyot',
  hZL: 'qyot',
  fZL: 'gyot',
  eZL: 'khyot',
  AZD: 'pyot',
  DZD: 'myot',
  iZL: 'qhyot',
  hZD: 'qiat',
  iZD: 'qhiat',
  dZD: 'kiat',
  fZD: 'giat',
  BZD: 'phyot',
  gZD: 'ŋiat',
  DaD: 'mut',
  FaL: 'thut',
  daL: 'kut',
  CaD: 'but',
  EaL: 'tut',
  GaL: 'dut',
  haL: 'qut',
  iaL: 'qhut',
  gaL: 'ŋut',
  BaD: 'phut',
  IaL: 'lut',
  eaL: 'khut',
  HaL: 'nut',
  QaL: 'sut',
  OaL: 'chut',
  PaL: 'dzut',
  jbD: 'xət',
  jaL: 'xut',
  NaL: 'cut',
  jcD: 'xat',
  icD: 'qhat',
  EcD: 'tat',
  FcD: 'that',
  hcD: 'qat',
  IcD: 'lat',
  ecD: 'khat',
  GcD: 'dat',
  PcD: 'dzat',
  gcD: 'ŋat',
  dcD: 'kat',
  QcD: 'sat',
  OcD: 'chat',
  HcD: 'nat',
  DcD: 'mat',
  gcL: 'ŋuat',
  PcL: 'dzuat',
  AcD: 'pat',
  dcL: 'kuat',
  ecL: 'khuat',
  jcL: 'xuat',
  GcL: 'duat',
  icL: 'qhuat',
  hcL: 'quat',
  NcL: 'cuat',
  BcD: 'phat',
  FcL: 'thuat',
  IcL: 'luat',
  EcL: 'tuat',
  OcL: 'chuat',
  CcD: 'bat',
  jeD: 'xret',
  SeD: 'cret',
  CeD: 'bret',
  eeD: 'khret',
  jeL: 'xruet',
  AeD: 'pret',
  JeL: 'truet',
  heL: 'qruet',
  MeL: 'nruet',
  TeD: 'chret',
  deL: 'kruet',
  deD: 'kret',
  heD: 'qret',
  VeD: 'sret',
  DeD: 'mret',
  ieL: 'qhruet',
  MeD: 'nret',
  geL: 'ŋruet',
  eeL: 'khruet',
  BeD: 'phret',
  SeL: 'cruet',
  jdD: 'xrat',
  hdD: 'qrat',
  gdD: 'ŋrat',
  TdD: 'chrat',
  edD: 'khrat',
  idD: 'qhrat',
  KdD: 'thrat',
  ddL: 'kruat',
  jdL: 'xruat',
  KdL: 'thruat',
  JdL: 'truat',
  VdL: 'sruat',
  gdL: 'ŋruat',
  TdL: 'chruat',
  DdD: 'mrat',
  MdL: 'nruat',
  AdD: 'prat',
  ddD: 'krat',
  UdD: 'dzrat',
  JdD: 'trat',
  cdD: 'nьʼrat',
  QgD: 'set',
  OgD: 'chet',
  dgD: 'ket',
  NgD: 'cet',
  igL: 'qhuet',
  egL: 'khuet',
  dgL: 'kuet',
  jgL: 'xuet',
  hgL: 'quet',
  GgD: 'det',
  FgD: 'thet',
  jgD: 'xet',
  HgD: 'net',
  PgD: 'dzet',
  ggD: 'ŋet',
  DgD: 'met',
  AgD: 'pet',
  hgD: 'qet',
  egD: 'khet',
  igD: 'qhet',
  BgD: 'phet',
  CgD: 'bet',
  EgD: 'tet',
  IgD: 'let',
  QfD: 'siet',
  IfD: 'liet',
  JfD: 'triet',
  ffH: 'griet',
  cfD: 'niet',
  XfD: 'tiet',
  bfD: 'zhiet',
  ZfD: 'diet',
  gfH: 'ŋriet',
  DfD: 'miet',
  efH: 'khriet',
  AfD: 'piet',
  PfL: 'dzyet',
  NfL: 'cyet',
  QfL: 'syet',
  KfL: 'thryet',
  lfL: 'jyet',
  efL: 'khyet',
  hfP: 'qryet',
  cfL: 'nyet',
  afL: 'shyet',
  XfL: 'tyet',
  YfL: 'thyet',
  JfL: 'tryet',
  IfL: 'lyet',
  BfD: 'phiet',
  CfH: 'bryet',
  LfD: 'driet',
  AfH: 'pryet',
  VfL: 'sryet',
  afD: 'shiet',
  MfL: 'nryet',
  hfL: 'qyet',
  dfP: 'kryet',
  SfL: 'cryet',
  OfL: 'chyet',
  VfD: 'sriet',
  hfH: 'qriet',
  KfD: 'thriet',
  ifH: 'qhriet',
  RfL: 'zyet',
  YfD: 'thiet',
  lfD: 'jiet',
  UfD: 'dzriet',
  lpD: 'jiak',
  IpD: 'liak',
  dpD: 'kiak',
  XpD: 'tiak',
  apD: 'shiak',
  cpD: 'niak',
  YpD: 'thiak',
  hpD: 'qiak',
  epD: 'khiak',
  gpD: 'ŋiak',
  ZpD: 'diak',
  KpD: 'thriak',
  QpD: 'siak',
  SpD: 'criak',
  NpD: 'ciak',
  PpD: 'dziak',
  OpD: 'chiak',
  fpD: 'giak',
  hpL: 'qyak',
  CpD: 'byak',
  ipL: 'qhyak',
  kpL: 'xyak',
  dpL: 'kyak',
  JpD: 'triak',
  LpD: 'driak',
  epL: 'khyak',
  fpL: 'gyak',
  MpD: 'nriak',
  BpD: 'phyak',
  ipD: 'qhiak',
  GqD: 'dak',
  DqD: 'mak',
  IqD: 'lak',
  FqD: 'thak',
  NqD: 'cak',
  OqD: 'chak',
  dqD: 'kak',
  eqD: 'khak',
  gqD: 'ŋak',
  BqD: 'phak',
  hqD: 'qak',
  CqD: 'bak',
  iqD: 'qhak',
  QqD: 'sak',
  jqD: 'xak',
  PqD: 'dzak',
  AqD: 'pak',
  HqD: 'nak',
  iqL: 'qhuak',
  dqL: 'kuak',
  hqL: 'quak',
  jqL: 'xuak',
  eqL: 'khuak',
  gqL: 'ŋuak',
  IqL: 'luak',
  NqL: 'cuak',
  DrD: 'mrak',
  JrD: 'trak',
  CrD: 'brak',
  ArD: 'prak',
  fsD: 'griek',
  dsD: 'kriek',
  VsD: 'sriek',
  TsD: 'chriek',
  jrL: 'xruak',
  SrD: 'crak',
  UrD: 'dzrak',
  esD: 'khriek',
  grD: 'ŋrak',
  gsD: 'ŋriek',
  erD: 'khrak',
  hrD: 'qrak',
  isD: 'qhriek',
  KrD: 'thrak',
  BrD: 'phrak',
  irD: 'qhrak',
  jrD: 'xrak',
  drD: 'krak',
  irL: 'qhruak',
  LrD: 'drak',
  drL: 'kruak',
  hrL: 'qruak',
  erL: 'khruak',
  CsD: 'briek',
  DtD: 'mrek',
  jtL: 'xruek',
  dtL: 'kruek',
  AtD: 'prek',
  CtD: 'brek',
  UtD: 'dzrek',
  StD: 'crek',
  UtL: 'dzruek',
  TtD: 'chrek',
  etD: 'khrek',
  itL: 'qhruek',
  jtD: 'xrek',
  dtD: 'krek',
  JtD: 'trek',
  htD: 'qrek',
  VtD: 'srek',
  BtD: 'phrek',
  gtD: 'ŋrek',
  ItD: 'lrek',
  StL: 'cruek',
  VtL: 'sruek',
  ftL: 'gruek',
  MtD: 'nrek',
  QuD: 'siek',
  NuD: 'ciek',
  huD: 'qiek',
  luD: 'jiek',
  auD: 'shiek',
  YuD: 'thiek',
  ZuD: 'diek',
  XuD: 'tiek',
  LuD: 'driek',
  OuD: 'chiek',
  RuD: 'ziek',
  PuD: 'dziek',
  CuD: 'biek',
  luL: 'jyek',
  iuL: 'qhyek',
  AuD: 'piek',
  BuD: 'phiek',
  buD: 'zhiek',
  AuH: 'priek',
  JuD: 'triek',
  KuD: 'thriek',
  XuL: 'tyek',
  OuL: 'chyek',
  QvD: 'sek',
  dvD: 'kek',
  BvD: 'phek',
  IvD: 'lek',
  EvD: 'tek',
  jvD: 'xek',
  gvD: 'ŋek',
  GvD: 'dek',
  FvD: 'thek',
  NvD: 'cek',
  evD: 'khek',
  HvD: 'nek',
  PvD: 'dzek',
  DvD: 'mek',
  CvD: 'bek',
  AvD: 'pek',
  evL: 'khuek',
  dvL: 'kuek',
  OvD: 'chek',
  ivD: 'qhek',
  ivL: 'qhuek',
  XwD: 'tiək',
  LwD: 'driək',
  IwD: 'liək',
  KwD: 'thriək',
  JwD: 'triək',
  bwD: 'zhiək',
  QwD: 'siək',
  ZwD: 'diək',
  awD: 'shiək',
  iwD: 'qhiək',
  UwD: 'dzriək',
  fwD: 'giək',
  MwD: 'nriək',
  TwD: 'chriək',
  hwD: 'qiək',
  VwD: 'sriək',
  ewD: 'khiək',
  dwD: 'kiək',
  lwD: 'jiək',
  NwD: 'ciək',
  AwD: 'pryək',
  kwL: 'xryək',
  iwL: 'qhryək',
  BwD: 'phryək',
  SwD: 'criək',
  CwD: 'bryək',
  gwD: 'ŋiək',
  PwD: 'dziək',
  DwD: 'mryək',
  YwD: 'thiək',
  ExD: 'tək',
  NxD: 'cək',
  IxD: 'lək',
  FxD: 'thək',
  exD: 'khək',
  GxD: 'dək',
  ixD: 'qhək',
  DxD: 'mək',
  PxD: 'dzək',
  QxD: 'sək',
  AxD: 'pək',
  CxD: 'bək',
  jxL: 'xuək',
  dxL: 'kuək',
  hxD: 'qək',
  jxD: 'xək',
  HxD: 'nək',
  dxD: 'kək',
  OxD: 'chək',
  BxD: 'phək',
  ixL: 'qhuək',
  O1D: 'chip',
  Z1D: 'dip',
  X1D: 'tip',
  R1D: 'zip',
  P1D: 'dzip',
  c1D: 'nip',
  h1D: 'qip',
  a1D: 'ship',
  N1D: 'cip',
  f1H: 'grip',
  L1D: 'drip',
  J1D: 'trip',
  I1D: 'lip',
  d1H: 'krip',
  g1H: 'ŋrip',
  e1H: 'khrip',
  Q1D: 'sip',
  V1D: 'srip',
  i1H: 'qhrip',
  S1D: 'crip',
  h1H: 'qrip',
  K1D: 'thrip',
  k1D: 'xrip',
  l1D: 'jip',
  M1D: 'nrip',
  U1D: 'dzrip',
  C1H: 'brip',
  A1H: 'prip',
  T1D: 'chrip',
  Y1D: 'thip',
  j2D: 'xəp',
  d2D: 'kəp',
  E2D: 'təp',
  Q2D: 'səp',
  G2D: 'dəp',
  F2D: 'thəp',
  P2D: 'dzəp',
  N2D: 'cəp',
  I2D: 'ləp',
  H2D: 'nəp',
  e2D: 'khəp',
  h2D: 'qəp',
  i2D: 'qhəp',
  g2D: 'ŋəp',
  O2D: 'chəp',
  j3D: 'xap',
  I3D: 'lap',
  E3D: 'tap',
  F3D: 'thap',
  i3D: 'qhap',
  H3D: 'nap',
  G3D: 'dap',
  Q3D: 'sap',
  g3D: 'ŋap',
  P3D: 'dzap',
  d3D: 'kap',
  e3D: 'khap',
  h3D: 'qap',
  O3D: 'chap',
  X3D: 'tьʼap',
  l4D: 'jiep',
  N4D: 'ciep',
  a4D: 'shiep',
  Z4D: 'diep',
  I4D: 'liep',
  P4D: 'dziep',
  L4D: 'driep',
  h4H: 'qriep',
  M4D: 'nriep',
  Y4D: 'thiep',
  c4D: 'niep',
  X4D: 'tiep',
  O4D: 'chiep',
  K4D: 'thriep',
  f4H: 'griep',
  J4D: 'triep',
  k4D: 'xriep',
  V4D: 'sriep',
  d4H: 'kriep',
  h4D: 'qiep',
  F5D: 'thep',
  j5D: 'xep',
  d5D: 'kep',
  e5D: 'khep',
  G5D: 'dep',
  H5D: 'nep',
  Q5D: 'sep',
  I5D: 'lep',
  E5D: 'tep',
  P5D: 'dzep',
  N5D: 'cep',
  i5D: 'qhep',
  j6D: 'xrep',
  e6D: 'khrep',
  U6D: 'dzrep',
  d6D: 'krep',
  S6D: 'crep',
  T6D: 'chrep',
  M6D: 'nrep',
  i6D: 'qhrep',
  V6D: 'srep',
  J6D: 'trep',
  h6D: 'qrep',
  g6D: 'ŋrep',
  K6D: 'threp',
  j7D: 'xrap',
  h7D: 'qrap',
  d7D: 'krap',
  V7D: 'srap',
  i7D: 'qhrap',
  g8D: 'ŋiap',
  i8D: 'qhiap',
  e8D: 'khiap',
  d8D: 'kiap',
  h8D: 'qiap',
  l8D: 'jiap',
  f8D: 'giap',
  C9D: 'byop',
  A9D: 'pyop',
  B9D: 'phyop',
}[音韻地位.編碼] || '?';
});

/**
 * 隋拼
 *
 * https://github.com/Magnezone462/Zyevio
 *
 * @author N/A
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的隋拼
 */
export function zyepheng(音韻地位, 字頭, 選項) {
  return schemas.zyepheng(音韻地位, 字頭, 選項);
}

schemas.panwuyun = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
if (!音韻地位) return [['$legacy', true]];

return {
  EAA: 'tuŋ˧',
  GAA: 'duŋ˧',
  JBA: 'ʈiuŋ˧',
  LBA: 'ɖiuŋ˧',
  XBA: 'tɕiuŋ˧',
  KBA: 'ʈʰiuŋ˧',
  UBA: 'dʐiuŋ˧',
  QBA: 'siuŋ˧',
  cBA: 'ȵiuŋ˧',
  dBA: 'kiuŋ˧',
  lBA: 'jiuŋ˧',
  kBA: 'ɦiuŋ˧',
  DBA: 'miuŋ˧',
  eBA: 'kʰiuŋ˧',
  fBA: 'giuŋ˧',
  CBA: 'biuŋ˧',
  ABA: 'piuŋ˧',
  BBA: 'pʰiuŋ˧',
  YBA: 'tɕʰiuŋ˧',
  IBA: 'liuŋ˧',
  eAA: 'kʰuŋ˧',
  dAA: 'kuŋ˧',
  DAA: 'muŋ˧',
  IAA: 'luŋ˧',
  jAA: 'ɣuŋ˧',
  PAA: 'dzuŋ˧',
  hAA: 'ʔuŋ˧',
  OAA: 'tsʰuŋ˧',
  FAA: 'tʰuŋ˧',
  NAA: 'tsuŋ˧',
  CAA: 'buŋ˧',
  iAA: 'xuŋ˧',
  gAA: 'ŋuŋ˧',
  QAA: 'suŋ˧',
  ECA: 'tuoŋ˧',
  GCA: 'duoŋ˧',
  PCA: 'dzuoŋ˧',
  HCA: 'nuoŋ˧',
  dCA: 'kuoŋ˧',
  jCA: 'ɣuoŋ˧',
  ICA: 'luoŋ˧',
  NCA: 'tsuoŋ˧',
  QCA: 'suoŋ˧',
  FCA: 'tʰuoŋ˧',
  XDA: 'tɕioŋ˧',
  IDA: 'lioŋ˧',
  aDA: 'ɕioŋ˧',
  RDA: 'zioŋ˧',
  YDA: 'tɕʰioŋ˧',
  lDA: 'jioŋ˧',
  ADA: 'pioŋ˧',
  iDA: 'xioŋ˧',
  gDA: 'ŋioŋ˧',
  hDA: 'ʔioŋ˧',
  MDA: 'ɳioŋ˧',
  LDA: 'ɖioŋ˧',
  PDA: 'dzioŋ˧',
  KDA: 'ʈʰioŋ˧',
  CDA: 'bioŋ˧',
  BDA: 'pʰioŋ˧',
  NDA: 'tsioŋ˧',
  cDA: 'ȵioŋ˧',
  fDA: 'gioŋ˧',
  ZDA: 'dʑioŋ˧',
  dDA: 'kioŋ˧',
  QDA: 'sioŋ˧',
  ODA: 'tsʰioŋ˧',
  eDA: 'kʰioŋ˧',
  dEA: 'kɯɔŋ˧',
  DEA: 'mɯɔŋ˧',
  MEA: 'ɳɯɔŋ˧',
  TEA: 'tʂʰɯɔŋ˧',
  AEA: 'pɯɔŋ˧',
  jEA: 'ɣɯɔŋ˧',
  BEA: 'pʰɯɔŋ˧',
  IEA: 'lɯɔŋ˧',
  VEA: 'ʂɯɔŋ˧',
  CEA: 'bɯɔŋ˧',
  iEA: 'xɯɔŋ˧',
  hEA: 'ʔɯɔŋ˧',
  eEA: 'kʰɯɔŋ˧',
  LEA: 'ɖɯɔŋ˧',
  KEA: 'ʈʰɯɔŋ˧',
  JEA: 'ʈɯɔŋ˧',
  gEA: 'ŋɯɔŋ˧',
  UEA: 'dʐɯɔŋ˧',
  XFA: 'tɕiɛ˧',
  lFA: 'jiɛ˧',
  kFI: 'ɦʷiɛ˧',
  dFM: 'kʷɯiɛ˧',
  iFM: 'xʷɯiɛ˧',
  hFM: 'ʔʷɯiɛ˧',
  DFE: 'mɯiɛ˧',
  iFI: 'xʷiɛ˧',
  LFI: 'ɖʷiɛ˧',
  ZFI: 'dʑʷiɛ˧',
  IFI: 'lʷiɛ˧',
  YFI: 'tɕʰʷiɛ˧',
  BFE: 'pʰɯiɛ˧',
  AFE: 'pɯiɛ˧',
  RFI: 'zʷiɛ˧',
  eFM: 'kʰʷɯiɛ˧',
  eFI: 'kʰʷiɛ˧',
  fFE: 'gɯiɛ˧',
  fFA: 'giɛ˧',
  iFE: 'xɯiɛ˧',
  eFE: 'kʰɯiɛ˧',
  gFE: 'ŋɯiɛ˧',
  CFE: 'bɯiɛ˧',
  ZFA: 'dʑiɛ˧',
  cFA: 'ȵiɛ˧',
  IFA: 'liɛ˧',
  PFA: 'dziɛ˧',
  NFA: 'tsiɛ˧',
  dFE: 'kɯiɛ˧',
  AFA: 'piɛ˧',
  CFA: 'biɛ˧',
  aFA: 'ɕiɛ˧',
  QFA: 'siɛ˧',
  TFA: 'tʂʰiɛ˧',
  KFA: 'ʈʰiɛ˧',
  DFA: 'miɛ˧',
  OFA: 'tsʰiɛ˧',
  JFA: 'ʈiɛ˧',
  hFE: 'ʔɯiɛ˧',
  LFA: 'ɖiɛ˧',
  QFI: 'sʷiɛ˧',
  gFM: 'ŋʷɯiɛ˧',
  iFA: 'xiɛ˧',
  VFA: 'ʂiɛ˧',
  VFI: 'ʂʷiɛ˧',
  cFI: 'ȵʷiɛ˧',
  dFI: 'kʷiɛ˧',
  NFI: 'tsʷiɛ˧',
  TFI: 'tʂʰʷiɛ˧',
  JFI: 'ʈʷiɛ˧',
  YFA: 'tɕʰiɛ˧',
  SFA: 'tʂiɛ˧',
  BFA: 'pʰiɛ˧',
  lFI: 'jʷiɛ˧',
  UFA: 'dʐiɛ˧',
  XGA: 'tɕi˧',
  lGA: 'ji˧',
  VGA: 'ʂi˧',
  CGA: 'bi˧',
  NGA: 'tsi˧',
  dGE: 'kɯi˧',
  YGA: 'tɕʰi˧',
  KGA: 'ʈʰi˧',
  OGA: 'tsʰi˧',
  PGA: 'dzi˧',
  MGA: 'ɳi˧',
  LGA: 'ɖi˧',
  QGA: 'si˧',
  aGA: 'ɕi˧',
  fGE: 'gɯi˧',
  hGA: 'ʔi˧',
  IGA: 'li˧',
  fGI: 'gʷi˧',
  JGI: 'ʈʷi˧',
  dGM: 'kʷɯi˧',
  cGI: 'ȵʷi˧',
  VGI: 'ʂʷi˧',
  lGI: 'jʷi˧',
  IGI: 'lʷi˧',
  QGI: 'sʷi˧',
  fGM: 'gʷɯi˧',
  DGE: 'mɯi˧',
  AGE: 'pɯi˧',
  XGI: 'tɕʷi˧',
  ZGI: 'dʑʷi˧',
  kGI: 'ɦʷi˧',
  CGE: 'bɯi˧',
  BGE: 'pʰɯi˧',
  iGI: 'xʷi˧',
  LGI: 'ɖʷi˧',
  YGI: 'tɕʰʷi˧',
  JGA: 'ʈi˧',
  BGA: 'pʰi˧',
  NGI: 'tsʷi˧',
  eGM: 'kʰʷɯi˧',
  gGE: 'ŋɯi˧',
  iGA: 'xi˧',
  XHA: 'tɕɨ˧',
  lHA: 'jɨ˧',
  ZHA: 'dʑɨ˧',
  gHA: 'ŋɨ˧',
  QHA: 'sɨ˧',
  THA: 'tʂʰɨ˧',
  fHA: 'gɨ˧',
  aHA: 'ɕɨ˧',
  cHA: 'ȵɨ˧',
  eHA: 'kʰɨ˧',
  dHA: 'kɨ˧',
  RHA: 'zɨ˧',
  IHA: 'lɨ˧',
  SHA: 'tʂɨ˧',
  iHA: 'xɨ˧',
  hHA: 'ʔɨ˧',
  KHA: 'ʈʰɨ˧',
  LHA: 'ɖɨ˧',
  YHA: 'tɕʰɨ˧',
  PHA: 'dzɨ˧',
  NHA: 'tsɨ˧',
  UHA: 'dʐɨ˧',
  WHA: 'ʐɨ˧',
  DIA: 'mʷɨi˧',
  iII: 'xʷɨi˧',
  kII: 'ɦʷɨi˧',
  BIA: 'pʰʷɨi˧',
  AIA: 'pʷɨi˧',
  CIA: 'bʷɨi˧',
  hII: 'ʔʷɨi˧',
  fIA: 'gɨi˧',
  dIA: 'kɨi˧',
  iIA: 'xɨi˧',
  hIA: 'ʔɨi˧',
  gIA: 'ŋɨi˧',
  gII: 'ŋʷɨi˧',
  dII: 'kʷɨi˧',
  eII: 'kʰʷɨi˧',
  gJA: 'ŋiɔ˧',
  TJA: 'tʂʰiɔ˧',
  aJA: 'ɕiɔ˧',
  dJA: 'kiɔ˧',
  fJA: 'giɔ˧',
  lJA: 'jiɔ˧',
  QJA: 'siɔ˧',
  OJA: 'tsʰiɔ˧',
  UJA: 'dʐiɔ˧',
  KJA: 'ʈʰiɔ˧',
  VJA: 'ʂiɔ˧',
  iJA: 'xiɔ˧',
  RJA: 'ziɔ˧',
  hJA: 'ʔiɔ˧',
  JJA: 'ʈiɔ˧',
  IJA: 'liɔ˧',
  XJA: 'tɕiɔ˧',
  LJA: 'ɖiɔ˧',
  cJA: 'ȵiɔ˧',
  NJA: 'tsiɔ˧',
  eJA: 'kʰiɔ˧',
  SJA: 'tʂiɔ˧',
  ZJA: 'dʑiɔ˧',
  MJA: 'ɳiɔ˧',
  gKA: 'ŋio˧',
  TKA: 'tʂʰio˧',
  DKA: 'mio˧',
  kKA: 'ɦio˧',
  iKA: 'xio˧',
  fKA: 'gio˧',
  cKA: 'ȵio˧',
  QKA: 'sio˧',
  JKA: 'ʈio˧',
  KKA: 'ʈʰio˧',
  ZKA: 'dʑio˧',
  lKA: 'jio˧',
  eKA: 'kʰio˧',
  XKA: 'tɕio˧',
  OKA: 'tsʰio˧',
  IKA: 'lio˧',
  CKA: 'bio˧',
  UKA: 'dʐio˧',
  SKA: 'tʂio˧',
  BKA: 'pʰio˧',
  NKA: 'tsio˧',
  AKA: 'pio˧',
  hKA: 'ʔio˧',
  aKA: 'ɕio˧',
  YKA: 'tɕʰio˧',
  LKA: 'ɖio˧',
  dKA: 'kio˧',
  VKA: 'ʂio˧',
  DLA: 'muo˧',
  CLA: 'buo˧',
  jLA: 'ɣuo˧',
  dLA: 'kuo˧',
  GLA: 'duo˧',
  HLA: 'nuo˧',
  iLA: 'xuo˧',
  gLA: 'ŋuo˧',
  NLA: 'tsuo˧',
  ILA: 'luo˧',
  QLA: 'suo˧',
  PLA: 'dzuo˧',
  hLA: 'ʔuo˧',
  ALA: 'puo˧',
  eLA: 'kʰuo˧',
  OLA: 'tsʰuo˧',
  FLA: 'tʰuo˧',
  ELA: 'tuo˧',
  BLA: 'pʰuo˧',
  PMA: 'dzei˧',
  IMA: 'lei˧',
  OMA: 'tsʰei˧',
  EMA: 'tei˧',
  GMA: 'dei˧',
  AMA: 'pei˧',
  dMA: 'kei˧',
  jMA: 'ɣei˧',
  hMA: 'ʔei˧',
  gMA: 'ŋei˧',
  iMA: 'xei˧',
  QMA: 'sei˧',
  FMA: 'tʰei˧',
  CMA: 'bei˧',
  BMA: 'pʰei˧',
  NMA: 'tsei˧',
  DMA: 'mei˧',
  HMA: 'nei˧',
  eMA: 'kʰei˧',
  dMI: 'kʷei˧',
  eMI: 'kʰʷei˧',
  jMI: 'ɣʷei˧',
  cMA: 'ȵei˧',
  ZMA: 'dʑei˧',
  hMI: 'ʔʷei˧',
  iMI: 'xʷei˧',
  dPA: 'kɯæ˧',
  jPA: 'ɣɯæ˧',
  CPA: 'bɯæ˧',
  dPI: 'kʷɯæ˧',
  hPI: 'ʔʷɯæ˧',
  ePI: 'kʰʷɯæ˧',
  UPA: 'dʐɯæ˧',
  TPA: 'tʂʰɯæ˧',
  iPI: 'xʷɯæ˧',
  MPA: 'ɳɯæ˧',
  gPA: 'ŋɯæ˧',
  hPA: 'ʔɯæ˧',
  VPA: 'ʂɯæ˧',
  iPA: 'xɯæ˧',
  KPA: 'ʈʰɯæ˧',
  DPA: 'mɯæ˧',
  jPI: 'ɣʷɯæ˧',
  dQA: 'kɯæi˧',
  hQA: 'ʔɯæi˧',
  jQA: 'ɣɯæi˧',
  CQA: 'bɯæi˧',
  dQI: 'kʷɯæi˧',
  jQI: 'ɣʷɯæi˧',
  eQI: 'kʰʷɯæi˧',
  UQA: 'dʐɯæi˧',
  TQA: 'tʂʰɯæi˧',
  iQI: 'xʷɯæi˧',
  LQI: 'ɖʷɯæi˧',
  DQA: 'mɯæi˧',
  SQA: 'tʂɯæi˧',
  hQI: 'ʔʷɯæi˧',
  JQA: 'ʈɯæi˧',
  IQA: 'lɯæi˧',
  eQA: 'kʰɯæi˧',
  MQA: 'ɳɯæi˧',
  VQA: 'ʂɯæi˧',
  gQA: 'ŋɯæi˧',
  KQA: 'ʈʰɯæi˧',
  iQA: 'xɯæi˧',
  IQI: 'lʷɯæi˧',
  UQI: 'dʐʷɯæi˧',
  iSI: 'xuoi˧',
  eSI: 'kʰuoi˧',
  hSI: 'ʔuoi˧',
  jSI: 'ɣuoi˧',
  DSA: 'muoi˧',
  dSI: 'kuoi˧',
  ISI: 'luoi˧',
  GSI: 'duoi˧',
  OSI: 'tsʰuoi˧',
  ESI: 'tuoi˧',
  QSI: 'suoi˧',
  PSI: 'dzuoi˧',
  CSA: 'buoi˧',
  ASA: 'puoi˧',
  BSA: 'pʰuoi˧',
  gSI: 'ŋuoi˧',
  FSI: 'tʰuoi˧',
  HSI: 'nuoi˧',
  NSI: 'tsuoi˧',
  iTA: 'xəi˧',
  eTA: 'kʰəi˧',
  hTA: 'ʔəi˧',
  GTA: 'dəi˧',
  dTA: 'kəi˧',
  PTA: 'dzəi˧',
  ITA: 'ləi˧',
  NTA: 'tsəi˧',
  OTA: 'tsʰəi˧',
  CTA: 'bəi˧',
  FTA: 'tʰəi˧',
  jTA: 'ɣəi˧',
  QTA: 'səi˧',
  gTA: 'ŋəi˧',
  HTA: 'nəi˧',
  ETA: 'təi˧',
  YTA: 'tɕʰəi˧',
  BTA: 'pʰəi˧',
  XVA: 'tɕin˧',
  KVA: 'ʈʰin˧',
  hVA: 'ʔin˧',
  QVA: 'sin˧',
  ZVA: 'dʑin˧',
  cVA: 'ȵin˧',
  bVA: 'ʑin˧',
  OVA: 'tsʰin˧',
  kVA: 'ɦin˧',
  aVA: 'ɕin˧',
  AVA: 'pin˧',
  IVA: 'lin˧',
  fVE: 'gɯin˧',
  JVA: 'ʈin˧',
  LVA: 'ɖin˧',
  NVA: 'tsin˧',
  YVA: 'tɕʰin˧',
  PVA: 'dzin˧',
  lVA: 'jin˧',
  MVA: 'ɳin˧',
  BVA: 'pʰin˧',
  CVA: 'bin˧',
  gVE: 'ŋɯin˧',
  dVE: 'kɯin˧',
  dVM: 'kʷɯin˧',
  kVI: 'ɦʷin˧',
  eVM: 'kʰʷɯin˧',
  DVE: 'mɯin˧',
  CVE: 'bɯin˧',
  hVE: 'ʔɯin˧',
  hVM: 'ʔʷɯin˧',
  AVE: 'pɯin˧',
  DVA: 'min˧',
  XVI: 'tɕʷin˧',
  KVI: 'ʈʰʷin˧',
  LVI: 'ɖʷin˧',
  QVI: 'sʷin˧',
  ZVI: 'dʑʷin˧',
  cVI: 'ȵʷin˧',
  bVI: 'ʑʷin˧',
  IVI: 'lʷin˧',
  JVI: 'ʈʷin˧',
  OVI: 'tsʰʷin˧',
  NVI: 'tsʷin˧',
  YVI: 'tɕʰʷin˧',
  PVI: 'dzʷin˧',
  lVI: 'jʷin˧',
  RVI: 'zʷin˧',
  dVI: 'kʷin˧',
  fVA: 'gin˧',
  BVE: 'pʰɯin˧',
  SWA: 'tʂɪn˧',
  VWA: 'ʂɪn˧',
  UWA: 'dʐɪn˧',
  DXA: 'miun˧',
  kXI: 'ɦiun˧',
  hXI: 'ʔiun˧',
  CXA: 'biun˧',
  AXA: 'piun˧',
  fXI: 'giun˧',
  iXI: 'xiun˧',
  dXI: 'kiun˧',
  BXA: 'pʰiun˧',
  iYA: 'xɨn˧',
  hYA: 'ʔɨn˧',
  fYA: 'gɨn˧',
  dYA: 'kɨn˧',
  gYA: 'ŋɨn˧',
  gZI: 'ŋʷiɐn˧',
  kZI: 'ɦʷiɐn˧',
  CZA: 'bʷiɐn˧',
  BZA: 'pʰʷiɐn˧',
  iZI: 'xʷiɐn˧',
  hZI: 'ʔʷiɐn˧',
  gZA: 'ŋiɐn˧',
  eZA: 'kʰiɐn˧',
  iZA: 'xiɐn˧',
  dZA: 'kiɐn˧',
  hZA: 'ʔiɐn˧',
  AZA: 'pʷiɐn˧',
  fZA: 'giɐn˧',
  DZA: 'mʷiɐn˧',
  jaI: 'ɣuon˧',
  daI: 'kuon˧',
  haI: 'ʔuon˧',
  DaA: 'muon˧',
  QaI: 'suon˧',
  NaI: 'tsuon˧',
  PaI: 'dzuon˧',
  EaI: 'tuon˧',
  FaI: 'tʰuon˧',
  GaI: 'duon˧',
  OaI: 'tsʰuon˧',
  gaI: 'ŋuon˧',
  CaA: 'buon˧',
  AaA: 'puon˧',
  IaI: 'luon˧',
  eaI: 'kʰuon˧',
  iaI: 'xuon˧',
  BaA: 'pʰuon˧',
  HaI: 'nuon˧',
  jbA: 'ɣən˧',
  dbA: 'kən˧',
  hbA: 'ʔən˧',
  FbA: 'tʰən˧',
  gbA: 'ŋən˧',
  jcA: 'ɣɑn˧',
  gcA: 'ŋɑn˧',
  EcA: 'tɑn˧',
  hcA: 'ʔɑn˧',
  HcA: 'nɑn˧',
  OcA: 'tsʰɑn˧',
  FcA: 'tʰɑn˧',
  QcA: 'sɑn˧',
  GcA: 'dɑn˧',
  PcA: 'dzɑn˧',
  dcA: 'kɑn˧',
  IcA: 'lɑn˧',
  ecA: 'kʰɑn˧',
  icA: 'xɑn˧',
  HcI: 'nʷɑn˧',
  jcI: 'ɣʷɑn˧',
  gcI: 'ŋʷɑn˧',
  EcI: 'tʷɑn˧',
  hcI: 'ʔʷɑn˧',
  FcI: 'tʰʷɑn˧',
  QcI: 'sʷɑn˧',
  GcI: 'dʷɑn˧',
  PcI: 'dzʷɑn˧',
  dcI: 'kʷɑn˧',
  IcI: 'lʷɑn˧',
  icI: 'xʷɑn˧',
  ecI: 'kʰʷɑn˧',
  NcI: 'tsʷɑn˧',
  CcA: 'bʷɑn˧',
  DcA: 'mʷɑn˧',
  BcA: 'pʰʷɑn˧',
  AcA: 'pʷɑn˧',
  VdA: 'ʂɯan˧',
  ddI: 'kʷɯan˧',
  hdI: 'ʔʷɯan˧',
  VdI: 'ʂʷɯan˧',
  jdI: 'ɣʷɯan˧',
  AdA: 'pɯan˧',
  DdA: 'mɯan˧',
  gdA: 'ŋɯan˧',
  ddA: 'kɯan˧',
  BdA: 'pʰɯan˧',
  MdI: 'ɳʷɯan˧',
  gdI: 'ŋʷɯan˧',
  edA: 'kʰɯan˧',
  SdI: 'tʂʷɯan˧',
  VeA: 'ʂɯæn˧',
  deI: 'kʷɯæn˧',
  deA: 'kɯæn˧',
  jeA: 'ɣɯæn˧',
  eeA: 'kʰɯæn˧',
  UeA: 'dʐɯæn˧',
  ieA: 'xɯæn˧',
  geA: 'ŋɯæn˧',
  heA: 'ʔɯæn˧',
  AeA: 'pɯæn˧',
  IeA: 'lɯæn˧',
  MeA: 'ɳɯæn˧',
  YeA: 'tɕʰɯæn˧',
  heI: 'ʔʷɯæn˧',
  GeI: 'dʷɯæn˧',
  IeI: 'lʷɯæn˧',
  feI: 'gʷɯæn˧',
  JeA: 'ʈɯæn˧',
  LeA: 'ɖɯæn˧',
  jeI: 'ɣʷɯæn˧',
  PeA: 'dzɯæn˧',
  QgA: 'sen˧',
  PgA: 'dzen˧',
  OgA: 'tsʰen˧',
  NgA: 'tsen˧',
  FgA: 'tʰen˧',
  dgA: 'ken˧',
  jgA: 'ɣen˧',
  hgA: 'ʔen˧',
  IgA: 'len˧',
  GgA: 'den˧',
  HgA: 'nen˧',
  EgA: 'ten˧',
  egA: 'kʰen˧',
  ggA: 'ŋen˧',
  DgA: 'men˧',
  CgA: 'ben˧',
  hgI: 'ʔʷen˧',
  dgI: 'kʷen˧',
  igI: 'xʷen˧',
  AgA: 'pen˧',
  jgI: 'ɣʷen˧',
  igA: 'xen˧',
  UgI: 'dʐʷen˧',
  QfA: 'siɛn˧',
  PfA: 'dziɛn˧',
  OfA: 'tsʰiɛn˧',
  NfA: 'tsiɛn˧',
  cfA: 'ȵiɛn˧',
  lfA: 'jiɛn˧',
  XfA: 'tɕiɛn˧',
  dfA: 'kiɛn˧',
  JfA: 'ʈiɛn˧',
  UfA: 'dʐiɛn˧',
  afA: 'ɕiɛn˧',
  KfA: 'ʈʰiɛn˧',
  ZfA: 'dʑiɛn˧',
  LfA: 'ɖiɛn˧',
  ifA: 'xiɛn˧',
  IfA: 'liɛn˧',
  BfA: 'pʰiɛn˧',
  CfA: 'biɛn˧',
  DfA: 'miɛn˧',
  PfI: 'dzʷiɛn˧',
  QfI: 'sʷiɛn˧',
  NfI: 'tsʷiɛn˧',
  ifI: 'xʷiɛn˧',
  cfI: 'ȵʷiɛn˧',
  YfI: 'tɕʰʷiɛn˧',
  lfI: 'jʷiɛn˧',
  RfI: 'zʷiɛn˧',
  hfI: 'ʔʷiɛn˧',
  bfI: 'ʑʷiɛn˧',
  AfA: 'piɛn˧',
  RfA: 'ziɛn˧',
  OfI: 'tsʰʷiɛn˧',
  XfI: 'tɕʷiɛn˧',
  ZfI: 'dʑʷiɛn˧',
  kfI: 'ɦʷiɛn˧',
  SfI: 'tʂʷiɛn˧',
  VfI: 'ʂʷiɛn˧',
  KfI: 'ʈʰʷiɛn˧',
  ffE: 'gɯiɛn˧',
  efE: 'kʰɯiɛn˧',
  ffM: 'gʷɯiɛn˧',
  LfI: 'ɖʷiɛn˧',
  IfI: 'lʷiɛn˧',
  efM: 'kʰʷɯiɛn˧',
  hfE: 'ʔɯiɛn˧',
  kfA: 'ɦiɛn˧',
  hfM: 'ʔʷɯiɛn˧',
  YfA: 'tɕʰiɛn˧',
  JfI: 'ʈʷiɛn˧',
  dfM: 'kʷɯiɛn˧',
  QhA: 'seu˧',
  FhA: 'tʰeu˧',
  EhA: 'teu˧',
  GhA: 'deu˧',
  dhA: 'keu˧',
  IhA: 'leu˧',
  ghA: 'ŋeu˧',
  ihA: 'xeu˧',
  hhA: 'ʔeu˧',
  ehA: 'kʰeu˧',
  QiA: 'siɛu˧',
  KiA: 'ʈʰiɛu˧',
  JiA: 'ʈiɛu˧',
  LiA: 'ɖiɛu˧',
  iiE: 'xɯiɛu˧',
  PiA: 'dziɛu˧',
  diE: 'kɯiɛu˧',
  NiA: 'tsiɛu˧',
  ciA: 'ȵiɛu˧',
  aiA: 'ɕiɛu˧',
  liA: 'jiɛu˧',
  ZiA: 'dʑiɛu˧',
  XiA: 'tɕiɛu˧',
  AiA: 'piɛu˧',
  AiE: 'pɯiɛu˧',
  CiA: 'biɛu˧',
  DiA: 'miɛu˧',
  DiE: 'mɯiɛu˧',
  hiA: 'ʔiɛu˧',
  kiA: 'ɦiɛu˧',
  fiE: 'gɯiɛu˧',
  OiA: 'tsʰiɛu˧',
  hiE: 'ʔɯiɛu˧',
  eiA: 'kʰiɛu˧',
  YiA: 'tɕʰiɛu˧',
  BiA: 'pʰiɛu˧',
  fiA: 'giɛu˧',
  IiA: 'liɛu˧',
  eiE: 'kʰɯiɛu˧',
  jjA: 'ɣɯau˧',
  djA: 'kɯau˧',
  UjA: 'dʐɯau˧',
  MjA: 'ɳɯau˧',
  VjA: 'ʂɯau˧',
  DjA: 'mɯau˧',
  ijA: 'xɯau˧',
  AjA: 'pɯau˧',
  BjA: 'pʰɯau˧',
  ejA: 'kʰɯau˧',
  gjA: 'ŋɯau˧',
  SjA: 'tʂɯau˧',
  JjA: 'ʈɯau˧',
  TjA: 'tʂʰɯau˧',
  CjA: 'bɯau˧',
  hjA: 'ʔɯau˧',
  KjA: 'ʈʰɯau˧',
  IjA: 'lɯau˧',
  LjA: 'ɖɯau˧',
  jkA: 'ɣɑu˧',
  dkA: 'kɑu˧',
  IkA: 'lɑu˧',
  ikA: 'xɑu˧',
  DkA: 'mɑu˧',
  FkA: 'tʰɑu˧',
  EkA: 'tɑu˧',
  QkA: 'sɑu˧',
  CkA: 'bɑu˧',
  AkA: 'pɑu˧',
  GkA: 'dɑu˧',
  NkA: 'tsɑu˧',
  gkA: 'ŋɑu˧',
  PkA: 'dzɑu˧',
  hkA: 'ʔɑu˧',
  HkA: 'nɑu˧',
  ekA: 'kʰɑu˧',
  OkA: 'tsʰɑu˧',
  BkA: 'pʰɑu˧',
  dlA: 'kɑ˧',
  OlA: 'tsʰɑ˧',
  ElA: 'tɑ˧',
  QlA: 'sɑ˧',
  GlA: 'dɑ˧',
  PlA: 'dzɑ˧',
  glA: 'ŋɑ˧',
  FlA: 'tʰɑ˧',
  IlA: 'lɑ˧',
  HlA: 'nɑ˧',
  jlA: 'ɣɑ˧',
  ilA: 'xɑ˧',
  elA: 'kʰɑ˧',
  hlA: 'ʔɑ˧',
  dlI: 'kuɑ˧',
  OlI: 'tsʰuɑ˧',
  ElI: 'tuɑ˧',
  QlI: 'suɑ˧',
  ClA: 'buɑ˧',
  GlI: 'duɑ˧',
  DlA: 'muɑ˧',
  PlI: 'dzuɑ˧',
  glI: 'ŋuɑ˧',
  FlI: 'tʰuɑ˧',
  IlI: 'luɑ˧',
  HlI: 'nuɑ˧',
  AlA: 'puɑ˧',
  BlA: 'pʰuɑ˧',
  jlI: 'ɣuɑ˧',
  elI: 'kʰuɑ˧',
  hlI: 'ʔuɑ˧',
  imI: 'xʷiɑ˧',
  hmI: 'ʔʷiɑ˧',
  emI: 'kʰʷiɑ˧',
  fmA: 'giɑ˧',
  emA: 'kʰiɑ˧',
  dmA: 'kiɑ˧',
  OmI: 'tsʰʷiɑ˧',
  NmI: 'tsʷiɑ˧',
  fmI: 'gʷiɑ˧',
  ImI: 'lʷiɑ˧',
  DnA: 'mɯa˧',
  YoA: 'tɕʰia˧',
  aoA: 'ɕia˧',
  loA: 'jia˧',
  XoA: 'tɕia˧',
  NoA: 'tsia˧',
  boA: 'ʑia˧',
  jnI: 'ɣʷɯa˧',
  dnI: 'kʷɯa˧',
  inI: 'xʷɯa˧',
  enI: 'kʰʷɯa˧',
  MnA: 'ɳɯa˧',
  dnA: 'kɯa˧',
  jnA: 'ɣɯa˧',
  BnA: 'pʰɯa˧',
  hnA: 'ʔɯa˧',
  AnA: 'pɯa˧',
  TnA: 'tʂʰɯa˧',
  VnA: 'ʂɯa˧',
  gnA: 'ŋɯa˧',
  SnA: 'tʂɯa˧',
  LnA: 'ɖɯa˧',
  RoA: 'zia˧',
  ZoA: 'dʑia˧',
  hnI: 'ʔʷɯa˧',
  SnI: 'tʂʷɯa˧',
  JnI: 'ʈʷɯa˧',
  CnA: 'bɯa˧',
  UnA: 'dʐɯa˧',
  KnA: 'ʈʰɯa˧',
  JnA: 'ʈɯa˧',
  inA: 'xɯa˧',
  enA: 'kʰɯa˧',
  PoA: 'dzia˧',
  coA: 'ȵia˧',
  QoA: 'sia˧',
  JoA: 'ʈia˧',
  gnI: 'ŋʷɯa˧',
  lpA: 'jiɐŋ˧',
  RpA: 'ziɐŋ˧',
  IpA: 'liɐŋ˧',
  ipA: 'xiɐŋ˧',
  apA: 'ɕiɐŋ˧',
  CpA: 'bʷiɐŋ˧',
  XpA: 'tɕiɐŋ˧',
  YpA: 'tɕʰiɐŋ˧',
  epA: 'kʰiɐŋ˧',
  dpA: 'kiɐŋ˧',
  LpA: 'ɖiɐŋ˧',
  JpA: 'ʈiɐŋ˧',
  cpA: 'ȵiɐŋ˧',
  ApA: 'pʷiɐŋ˧',
  QpA: 'siɐŋ˧',
  NpA: 'tsiɐŋ˧',
  TpA: 'tʂʰiɐŋ˧',
  DpA: 'mʷiɐŋ˧',
  MpA: 'ɳiɐŋ˧',
  UpA: 'dʐiɐŋ˧',
  SpA: 'tʂiɐŋ˧',
  ZpA: 'dʑiɐŋ˧',
  VpA: 'ʂiɐŋ˧',
  PpA: 'dziɐŋ˧',
  OpA: 'tsʰiɐŋ˧',
  epI: 'kʰʷiɐŋ˧',
  kpI: 'ɦʷiɐŋ˧',
  hpA: 'ʔiɐŋ˧',
  fpA: 'giɐŋ˧',
  KpA: 'ʈʰiɐŋ˧',
  BpA: 'pʰʷiɐŋ˧',
  fpI: 'gʷiɐŋ˧',
  GqA: 'dɑŋ˧',
  IqA: 'lɑŋ˧',
  EqA: 'tɑŋ˧',
  OqA: 'tsʰɑŋ˧',
  dqA: 'kɑŋ˧',
  QqA: 'sɑŋ˧',
  eqA: 'kʰɑŋ˧',
  iqI: 'xʷɑŋ˧',
  jqI: 'ɣʷɑŋ˧',
  dqI: 'kʷɑŋ˧',
  FqA: 'tʰɑŋ˧',
  BqA: 'pʰɑŋ˧',
  hqI: 'ʔʷɑŋ˧',
  hqA: 'ʔɑŋ˧',
  iqA: 'xɑŋ˧',
  jqA: 'ɣɑŋ˧',
  DqA: 'mɑŋ˧',
  NqA: 'tsɑŋ˧',
  HqA: 'nɑŋ˧',
  CqA: 'bɑŋ˧',
  gqA: 'ŋɑŋ˧',
  PqA: 'dzɑŋ˧',
  eqI: 'kʰʷɑŋ˧',
  AqA: 'pɑŋ˧',
  drA: 'kɯaŋ˧',
  erA: 'kʰɯaŋ˧',
  DrA: 'mɯaŋ˧',
  jrI: 'ɣʷɯaŋ˧',
  ArA: 'pɯaŋ˧',
  irI: 'xʷɯaŋ˧',
  drI: 'kʷɯaŋ˧',
  CrA: 'bɯaŋ˧',
  irA: 'xɯaŋ˧',
  KrA: 'ʈʰɯaŋ˧',
  TrA: 'tʂʰɯaŋ˧',
  UrA: 'dʐɯaŋ˧',
  hsA: 'ʔɯiaŋ˧',
  BrA: 'pʰɯiaŋ˧',
  CsA: 'bɯiaŋ˧',
  dsA: 'kɯiaŋ˧',
  DsA: 'mɯiaŋ˧',
  LrA: 'ɖɯaŋ˧',
  JrA: 'ʈɯaŋ˧',
  ksI: 'ɦʷɯiaŋ˧',
  AsA: 'pɯiaŋ˧',
  isI: 'xʷɯiaŋ˧',
  esA: 'kʰɯiaŋ˧',
  VrA: 'ʂɯaŋ˧',
  fsA: 'gɯiaŋ˧',
  gsA: 'ŋɯiaŋ˧',
  jrA: 'ɣɯaŋ˧',
  MrA: 'ɳɯaŋ˧',
  dtA: 'kɯæŋ˧',
  etA: 'kʰɯæŋ˧',
  DtA: 'mɯæŋ˧',
  AtA: 'pɯæŋ˧',
  jtI: 'ɣʷɯæŋ˧',
  jtA: 'ɣɯæŋ˧',
  JtA: 'ʈɯæŋ˧',
  htA: 'ʔɯæŋ˧',
  UtA: 'dʐɯæŋ˧',
  TtA: 'tʂʰɯæŋ˧',
  MtA: 'ɳɯæŋ˧',
  BtA: 'pʰɯæŋ˧',
  itI: 'xʷɯæŋ˧',
  LtA: 'ɖɯæŋ˧',
  htI: 'ʔʷɯæŋ˧',
  CtA: 'bɯæŋ˧',
  gtA: 'ŋɯæŋ˧',
  StA: 'tʂɯæŋ˧',
  OuA: 'tsʰiɛŋ˧',
  PuA: 'dziɛŋ˧',
  NuA: 'tsiɛŋ˧',
  luA: 'jiɛŋ˧',
  luI: 'jʷiɛŋ˧',
  huA: 'ʔiɛŋ˧',
  JuA: 'ʈiɛŋ˧',
  KuA: 'ʈʰiɛŋ˧',
  ZuA: 'dʑiɛŋ˧',
  LuA: 'ɖiɛŋ˧',
  auA: 'ɕiɛŋ˧',
  XuA: 'tɕiɛŋ˧',
  euA: 'kʰiɛŋ˧',
  DuA: 'miɛŋ˧',
  IuA: 'liɛŋ˧',
  AuA: 'piɛŋ˧',
  euI: 'kʰʷiɛŋ˧',
  RuA: 'ziɛŋ˧',
  huI: 'ʔʷiɛŋ˧',
  fuI: 'gʷiɛŋ˧',
  QuI: 'sʷiɛŋ˧',
  fuA: 'giɛŋ˧',
  iuI: 'xʷiɛŋ˧',
  OvA: 'tsʰeŋ˧',
  dvA: 'keŋ˧',
  jvA: 'ɣeŋ˧',
  GvA: 'deŋ˧',
  EvA: 'teŋ˧',
  ivA: 'xeŋ˧',
  QvA: 'seŋ˧',
  BvA: 'pʰeŋ˧',
  IvA: 'leŋ˧',
  HvA: 'neŋ˧',
  FvA: 'tʰeŋ˧',
  DvA: 'meŋ˧',
  CvA: 'beŋ˧',
  jvI: 'ɣʷeŋ˧',
  dvI: 'kʷeŋ˧',
  XwA: 'tɕɨŋ˧',
  ZwA: 'dʑɨŋ˧',
  LwA: 'ɖɨŋ˧',
  IwA: 'lɨŋ˧',
  hwA: 'ʔɨŋ˧',
  CwA: 'bɨŋ˧',
  AwA: 'pɨŋ˧',
  lwA: 'jɨŋ˧',
  bwA: 'ʑɨŋ˧',
  awA: 'ɕɨŋ˧',
  cwA: 'ȵɨŋ˧',
  dwA: 'kɨŋ˧',
  JwA: 'ʈɨŋ˧',
  PwA: 'dzɨŋ˧',
  gwA: 'ŋɨŋ˧',
  iwA: 'xɨŋ˧',
  YwA: 'tɕʰɨŋ˧',
  fwA: 'gɨŋ˧',
  VwA: 'ʂɨŋ˧',
  ewA: 'kʰɨŋ˧',
  KwA: 'ʈʰɨŋ˧',
  UwA: 'dʐɨŋ˧',
  BwA: 'pʰɨŋ˧',
  ExA: 'təŋ˧',
  IxA: 'ləŋ˧',
  QxA: 'səŋ˧',
  AxA: 'pəŋ˧',
  NxA: 'tsəŋ˧',
  DxA: 'məŋ˧',
  PxA: 'dzəŋ˧',
  CxA: 'bəŋ˧',
  jxI: 'ɣʷəŋ˧',
  dxI: 'kʷəŋ˧',
  ixI: 'xʷəŋ˧',
  HxA: 'nəŋ˧',
  GxA: 'dəŋ˧',
  jxA: 'ɣəŋ˧',
  dxA: 'kəŋ˧',
  FxA: 'tʰəŋ˧',
  BxA: 'pʰəŋ˧',
  kyA: 'ɦiu˧',
  hyA: 'ʔiu˧',
  IyA: 'liu˧',
  OyA: 'tsʰiu˧',
  lyA: 'jiu˧',
  gyA: 'ŋiu˧',
  NyA: 'tsiu˧',
  PyA: 'dziu˧',
  QyA: 'siu˧',
  KyA: 'ʈʰiu˧',
  eyA: 'kʰiu˧',
  YyA: 'tɕʰiu˧',
  XyA: 'tɕiu˧',
  ZyA: 'dʑiu˧',
  cyA: 'ȵiu˧',
  ayA: 'ɕiu˧',
  ByA: 'pʰiu˧',
  dyA: 'kiu˧',
  AyA: 'piu˧',
  VyA: 'ʂiu˧',
  TyA: 'tʂʰiu˧',
  SyA: 'tʂiu˧',
  UyA: 'dʐiu˧',
  iyA: 'xiu˧',
  RyA: 'ziu˧',
  LyA: 'ɖiu˧',
  JyA: 'ʈiu˧',
  fyA: 'giu˧',
  CyA: 'biu˧',
  DyA: 'miu˧',
  jzA: 'ɣəu˧',
  hzA: 'ʔəu˧',
  HzA: 'nəu˧',
  IzA: 'ləu˧',
  QzA: 'səu˧',
  ezA: 'kʰəu˧',
  izA: 'xəu˧',
  NzA: 'tsəu˧',
  FzA: 'tʰəu˧',
  GzA: 'dəu˧',
  gzA: 'ŋəu˧',
  dzA: 'kəu˧',
  EzA: 'təu˧',
  PzA: 'dzəu˧',
  CzA: 'bəu˧',
  OzA: 'tsʰəu˧',
  DzA: 'məu˧',
  h0A: 'ʔɨu˧',
  f0A: 'gɨu˧',
  A0A: 'pɨu˧',
  I0A: 'lɨu˧',
  d0A: 'kɨu˧',
  C0A: 'bɨu˧',
  N0A: 'tsɨu˧',
  V0A: 'ʂɨu˧',
  g0A: 'ŋɨu˧',
  i0A: 'xɨu˧',
  D0A: 'mɨu˧',
  O1A: 'tsʰim˧',
  R1A: 'zim˧',
  I1A: 'lim˧',
  K1A: 'ʈʰim˧',
  X1A: 'tɕim˧',
  L1A: 'ɖim˧',
  J1A: 'ʈim˧',
  Z1A: 'dʑim˧',
  c1A: 'ȵim˧',
  a1A: 'ɕim˧',
  l1A: 'jim˧',
  Q1A: 'sim˧',
  h1A: 'ʔim˧',
  N1A: 'tsim˧',
  P1A: 'dzim˧',
  M1A: 'ɳim˧',
  f1E: 'gɯim˧',
  e1E: 'kʰɯim˧',
  g1E: 'ŋɯim˧',
  i1E: 'xɯim˧',
  d1E: 'kɯim˧',
  h1E: 'ʔɯim˧',
  V1A: 'ʂim˧',
  U1A: 'dʐim˧',
  S1A: 'tʂim˧',
  T1A: 'tʂʰim˧',
  Y1A: 'tɕʰim˧',
  G2A: 'dəm˧',
  O2A: 'tsʰəm˧',
  H2A: 'nəm˧',
  h2A: 'ʔəm˧',
  j2A: 'ɣəm˧',
  I2A: 'ləm˧',
  P2A: 'dzəm˧',
  N2A: 'tsəm˧',
  F2A: 'tʰəm˧',
  E2A: 'təm˧',
  e2A: 'kʰəm˧',
  i2A: 'xəm˧',
  Q2A: 'səm˧',
  d2A: 'kəm˧',
  g2A: 'ŋəm˧',
  G3A: 'dɑm˧',
  d3A: 'kɑm˧',
  E3A: 'tɑm˧',
  Q3A: 'sɑm˧',
  I3A: 'lɑm˧',
  e3A: 'kʰɑm˧',
  F3A: 'tʰɑm˧',
  P3A: 'dzɑm˧',
  j3A: 'ɣɑm˧',
  D3A: 'mɑm˧',
  i3A: 'xɑm˧',
  l4A: 'jiɛm˧',
  I4A: 'liɛm˧',
  A4E: 'pɯiɛm˧',
  Q4A: 'siɛm˧',
  O4A: 'tsʰiɛm˧',
  X4A: 'tɕiɛm˧',
  Z4A: 'dʑiɛm˧',
  a4A: 'ɕiɛm˧',
  Y4A: 'tɕʰiɛm˧',
  c4A: 'ȵiɛm˧',
  M4A: 'ɳiɛm˧',
  k4A: 'ɦiɛm˧',
  J4A: 'ʈiɛm˧',
  K4A: 'ʈʰiɛm˧',
  h4E: 'ʔɯiɛm˧',
  e4E: 'kʰɯiɛm˧',
  g4E: 'ŋɯiɛm˧',
  N4A: 'tsiɛm˧',
  P4A: 'dziɛm˧',
  f4E: 'gɯiɛm˧',
  h4A: 'ʔiɛm˧',
  R4A: 'ziɛm˧',
  V4A: 'ʂiɛm˧',
  L4A: 'ɖiɛm˧',
  f4A: 'giɛm˧',
  F5A: 'tʰem˧',
  E5A: 'tem˧',
  G5A: 'dem˧',
  I5A: 'lem˧',
  e5A: 'kʰem˧',
  d5A: 'kem˧',
  j5A: 'ɣem˧',
  H5A: 'nem˧',
  i5A: 'xem˧',
  j6A: 'ɣɯæm˧',
  d6A: 'kɯæm˧',
  V6A: 'ʂɯæm˧',
  h6A: 'ʔɯæm˧',
  g6A: 'ŋɯæm˧',
  i6A: 'xɯæm˧',
  J6A: 'ʈɯæm˧',
  M6A: 'ɳɯæm˧',
  U6A: 'dʐɯæm˧',
  e6A: 'kʰɯæm˧',
  j7A: 'ɣɯam˧',
  U7A: 'dʐɯam˧',
  g7A: 'ŋɯam˧',
  T7A: 'tʂʰɯam˧',
  V7A: 'ʂɯam˧',
  d7A: 'kɯam˧',
  C7A: 'bɯam˧',
  e7A: 'kʰɯam˧',
  g8A: 'ŋiɐm˧',
  i8A: 'xiɐm˧',
  h8A: 'ʔiɐm˧',
  e8A: 'kʰiɐm˧',
  C9A: 'biɐm˧',
  B9A: 'pʰiɐm˧',
  EAB: 'tuŋ˧˥',
  DAB: 'muŋ˧˥',
  eAB: 'kʰuŋ˧˥',
  QAB: 'suŋ˧˥',
  FAB: 'tʰuŋ˧˥',
  NAB: 'tsuŋ˧˥',
  jAB: 'ɣuŋ˧˥',
  hAB: 'ʔuŋ˧˥',
  HAB: 'nuŋ˧˥',
  AAB: 'puŋ˧˥',
  IAB: 'luŋ˧˥',
  iAB: 'xuŋ˧˥',
  GAB: 'duŋ˧˥',
  CAB: 'buŋ˧˥',
  XDB: 'tɕioŋ˧˥',
  KDB: 'ʈʰioŋ˧˥',
  IDB: 'lioŋ˧˥',
  hDB: 'ʔioŋ˧˥',
  cDB: 'ȵioŋ˧˥',
  LDB: 'ɖioŋ˧˥',
  JDB: 'ʈioŋ˧˥',
  CDB: 'bioŋ˧˥',
  BDB: 'pʰioŋ˧˥',
  lDB: 'jioŋ˧˥',
  eDB: 'kʰioŋ˧˥',
  ZDB: 'dʑioŋ˧˥',
  dDB: 'kioŋ˧˥',
  QDB: 'sioŋ˧˥',
  iDB: 'xioŋ˧˥',
  ADB: 'pioŋ˧˥',
  ECB: 'tuoŋ˧˥',
  DCB: 'muoŋ˧˥',
  fDB: 'gioŋ˧˥',
  YDB: 'tɕʰioŋ˧˥',
  NDB: 'tsioŋ˧˥',
  dEB: 'kɯɔŋ˧˥',
  CEB: 'bɯɔŋ˧˥',
  hEB: 'ʔɯɔŋ˧˥',
  DEB: 'mɯɔŋ˧˥',
  jEB: 'ɣɯɔŋ˧˥',
  AEB: 'pɯɔŋ˧˥',
  iEB: 'xɯɔŋ˧˥',
  XFB: 'tɕiɛ˧˥',
  ZFB: 'dʑiɛ˧˥',
  DFF: 'mɯiɛ˧˥',
  AFF: 'pɯiɛ˧˥',
  CFF: 'bɯiɛ˧˥',
  iFN: 'xʷɯiɛ˧˥',
  hFN: 'ʔʷɯiɛ˧˥',
  eFN: 'kʰʷɯiɛ˧˥',
  dFN: 'kʷɯiɛ˧˥',
  QFJ: 'sʷiɛ˧˥',
  IFJ: 'lʷiɛ˧˥',
  fFF: 'gɯiɛ˧˥',
  hFF: 'ʔɯiɛ˧˥',
  dFF: 'kɯiɛ˧˥',
  eFF: 'kʰɯiɛ˧˥',
  gFF: 'ŋɯiɛ˧˥',
  kFJ: 'ɦʷiɛ˧˥',
  NFJ: 'tsʷiɛ˧˥',
  cFJ: 'ȵʷiɛ˧˥',
  OFB: 'tsʰiɛ˧˥',
  LFB: 'ɖiɛ˧˥',
  QFB: 'siɛ˧˥',
  lFB: 'jiɛ˧˥',
  IFB: 'liɛ˧˥',
  VFB: 'ʂiɛ˧˥',
  AFB: 'piɛ˧˥',
  cFB: 'ȵiɛ˧˥',
  DFB: 'miɛ˧˥',
  CFB: 'biɛ˧˥',
  YFB: 'tɕʰiɛ˧˥',
  aFB: 'ɕiɛ˧˥',
  NFB: 'tsiɛ˧˥',
  XFJ: 'tɕʷiɛ˧˥',
  TFJ: 'tʂʰʷiɛ˧˥',
  RFJ: 'zʷiɛ˧˥',
  bFB: 'ʑiɛ˧˥',
  SFB: 'tʂiɛ˧˥',
  BFF: 'pʰɯiɛ˧˥',
  BFB: 'pʰiɛ˧˥',
  lFJ: 'jʷiɛ˧˥',
  PFJ: 'dzʷiɛ˧˥',
  eFJ: 'kʰʷiɛ˧˥',
  MFB: 'ɳiɛ˧˥',
  gFN: 'ŋʷɯiɛ˧˥',
  fFN: 'gʷɯiɛ˧˥',
  KFB: 'ʈʰiɛ˧˥',
  JFB: 'ʈiɛ˧˥',
  iFF: 'xɯiɛ˧˥',
  eFB: 'kʰiɛ˧˥',
  ZFJ: 'dʑʷiɛ˧˥',
  dFB: 'kiɛ˧˥',
  XGB: 'tɕi˧˥',
  ZGB: 'dʑi˧˥',
  DGF: 'mɯi˧˥',
  AGF: 'pɯi˧˥',
  RGB: 'zi˧˥',
  dGF: 'kɯi˧˥',
  NGB: 'tsi˧˥',
  AGB: 'pi˧˥',
  dGN: 'kʷɯi˧˥',
  kGJ: 'ɦʷi˧˥',
  aGB: 'ɕi˧˥',
  LGB: 'ɖi˧˥',
  QGB: 'si˧˥',
  CGB: 'bi˧˥',
  IGB: 'li˧˥',
  aGJ: 'ɕʷi˧˥',
  IGJ: 'lʷi˧˥',
  fGJ: 'gʷi˧˥',
  OGJ: 'tsʰʷi˧˥',
  MGB: 'ɳi˧˥',
  dGJ: 'kʷi˧˥',
  CGF: 'bɯi˧˥',
  PGJ: 'dzʷi˧˥',
  BGF: 'pʰɯi˧˥',
  cGJ: 'ȵʷi˧˥',
  lGJ: 'jʷi˧˥',
  hGF: 'ʔɯi˧˥',
  NGJ: 'tsʷi˧˥',
  JGB: 'ʈi˧˥',
  KGB: 'ʈʰi˧˥',
  iGJ: 'xʷi˧˥',
  fGN: 'gʷɯi˧˥',
  fGF: 'gɯi˧˥',
  eGN: 'kʰʷɯi˧˥',
  XHB: 'tɕɨ˧˥',
  ZHB: 'dʑɨ˧˥',
  JHB: 'ʈɨ˧˥',
  iHB: 'xɨ˧˥',
  dHB: 'kɨ˧˥',
  lHB: 'jɨ˧˥',
  RHB: 'zɨ˧˥',
  VHB: 'ʂɨ˧˥',
  cHB: 'ȵɨ˧˥',
  IHB: 'lɨ˧˥',
  QHB: 'sɨ˧˥',
  aHB: 'ɕɨ˧˥',
  LHB: 'ɖɨ˧˥',
  eHB: 'kʰɨ˧˥',
  UHB: 'dʐɨ˧˥',
  WHB: 'ʐɨ˧˥',
  NHB: 'tsɨ˧˥',
  kHB: 'ɦɨ˧˥',
  gHB: 'ŋɨ˧˥',
  YHB: 'tɕʰɨ˧˥',
  KHB: 'ʈʰɨ˧˥',
  THB: 'tʂʰɨ˧˥',
  SHB: 'tʂɨ˧˥',
  hHB: 'ʔɨ˧˥',
  MHB: 'ɳɨ˧˥',
  DIB: 'mʷɨi˧˥',
  hIB: 'ʔɨi˧˥',
  eIB: 'kʰɨi˧˥',
  dIB: 'kɨi˧˥',
  BIB: 'pʰʷɨi˧˥',
  AIB: 'pʷɨi˧˥',
  kIJ: 'ɦʷɨi˧˥',
  dIJ: 'kʷɨi˧˥',
  iIJ: 'xʷɨi˧˥',
  gIB: 'ŋɨi˧˥',
  iIB: 'xɨi˧˥',
  hIJ: 'ʔʷɨi˧˥',
  CIB: 'bʷɨi˧˥',
  gJB: 'ŋiɔ˧˥',
  IJB: 'liɔ˧˥',
  LJB: 'ɖiɔ˧˥',
  lJB: 'jiɔ˧˥',
  XJB: 'tɕiɔ˧˥',
  cJB: 'ȵiɔ˧˥',
  aJB: 'ɕiɔ˧˥',
  YJB: 'tɕʰiɔ˧˥',
  JJB: 'ʈiɔ˧˥',
  QJB: 'siɔ˧˥',
  KJB: 'ʈʰiɔ˧˥',
  MJB: 'ɳiɔ˧˥',
  iJB: 'xiɔ˧˥',
  fJB: 'giɔ˧˥',
  VJB: 'ʂiɔ˧˥',
  TJB: 'tʂʰiɔ˧˥',
  SJB: 'tʂiɔ˧˥',
  UJB: 'dʐiɔ˧˥',
  PJB: 'dziɔ˧˥',
  hJB: 'ʔiɔ˧˥',
  dJB: 'kiɔ˧˥',
  RJB: 'ziɔ˧˥',
  eJB: 'kʰiɔ˧˥',
  bJB: 'ʑiɔ˧˥',
  ZJB: 'dʑiɔ˧˥',
  OJB: 'tsʰiɔ˧˥',
  NJB: 'tsiɔ˧˥',
  gKB: 'ŋio˧˥',
  kKB: 'ɦio˧˥',
  PKB: 'dzio˧˥',
  AKB: 'pio˧˥',
  DKB: 'mio˧˥',
  CKB: 'bio˧˥',
  BKB: 'pʰio˧˥',
  LKB: 'ɖio˧˥',
  iKB: 'xio˧˥',
  ZKB: 'dʑio˧˥',
  lKB: 'jio˧˥',
  XKB: 'tɕio˧˥',
  hKB: 'ʔio˧˥',
  eKB: 'kʰio˧˥',
  JKB: 'ʈio˧˥',
  cKB: 'ȵio˧˥',
  fKB: 'gio˧˥',
  VKB: 'ʂio˧˥',
  dKB: 'kio˧˥',
  OKB: 'tsʰio˧˥',
  IKB: 'lio˧˥',
  QKB: 'sio˧˥',
  UKB: 'dʐio˧˥',
  DLB: 'muo˧˥',
  FLB: 'tʰuo˧˥',
  GLB: 'duo˧˥',
  ILB: 'luo˧˥',
  OLB: 'tsʰuo˧˥',
  ELB: 'tuo˧˥',
  dLB: 'kuo˧˥',
  gLB: 'ŋuo˧˥',
  CLB: 'buo˧˥',
  PLB: 'dzuo˧˥',
  NLB: 'tsuo˧˥',
  iLB: 'xuo˧˥',
  hLB: 'ʔuo˧˥',
  eLB: 'kʰuo˧˥',
  HLB: 'nuo˧˥',
  jLB: 'ɣuo˧˥',
  BLB: 'pʰuo˧˥',
  ALB: 'puo˧˥',
  PMB: 'dzei˧˥',
  IMB: 'lei˧˥',
  FMB: 'tʰei˧˥',
  BMB: 'pʰei˧˥',
  NMB: 'tsei˧˥',
  EMB: 'tei˧˥',
  GMB: 'dei˧˥',
  HMB: 'nei˧˥',
  QMB: 'sei˧˥',
  OMB: 'tsʰei˧˥',
  eMB: 'kʰei˧˥',
  jMB: 'ɣei˧˥',
  DMB: 'mei˧˥',
  CMB: 'bei˧˥',
  hMB: 'ʔei˧˥',
  gMB: 'ŋei˧˥',
  AMB: 'pei˧˥',
  jPB: 'ɣɯæ˧˥',
  DPB: 'mɯæ˧˥',
  ePB: 'kʰɯæ˧˥',
  LPB: 'ɖɯæ˧˥',
  MPB: 'ɳɯæ˧˥',
  CPB: 'bɯæ˧˥',
  hPB: 'ʔɯæ˧˥',
  APB: 'pɯæ˧˥',
  dPB: 'kɯæ˧˥',
  VPB: 'ʂɯæ˧˥',
  dPJ: 'kʷɯæ˧˥',
  LPJ: 'ɖʷɯæ˧˥',
  jPJ: 'ɣʷɯæ˧˥',
  iPJ: 'xʷɯæ˧˥',
  fPB: 'gɯæ˧˥',
  jQB: 'ɣɯæi˧˥',
  eQB: 'kʰɯæi˧˥',
  gQB: 'ŋɯæi˧˥',
  hQB: 'ʔɯæi˧˥',
  iSJ: 'xuoi˧˥',
  hSJ: 'ʔuoi˧˥',
  ISJ: 'luoi˧˥',
  GSJ: 'duoi˧˥',
  PSJ: 'dzuoi˧˥',
  DSB: 'muoi˧˥',
  FSJ: 'tʰuoi˧˥',
  jSJ: 'ɣuoi˧˥',
  eSJ: 'kʰuoi˧˥',
  ESJ: 'tuoi˧˥',
  HSJ: 'nuoi˧˥',
  JSJ: 'ʈuoi˧˥',
  gSJ: 'ŋuoi˧˥',
  OSJ: 'tsʰuoi˧˥',
  CSB: 'buoi˧˥',
  NSJ: 'tsuoi˧˥',
  kSJ: 'ɦuoi˧˥',
  iTB: 'xəi˧˥',
  eTB: 'kʰəi˧˥',
  NTB: 'tsəi˧˥',
  GTB: 'dəi˧˥',
  HTB: 'nəi˧˥',
  dTB: 'kəi˧˥',
  jTB: 'ɣəi˧˥',
  BTB: 'pʰəi˧˥',
  OTB: 'tsʰəi˧˥',
  YTB: 'tɕʰəi˧˥',
  ETB: 'təi˧˥',
  DTB: 'məi˧˥',
  PTB: 'dzəi˧˥',
  hTB: 'ʔəi˧˥',
  lTB: 'jəi˧˥',
  FTB: 'tʰəi˧˥',
  cTB: 'ȵəi˧˥',
  ITB: 'ləi˧˥',
  CTB: 'bəi˧˥',
  XVB: 'tɕin˧˥',
  KVB: 'ʈʰin˧˥',
  ZVB: 'dʑin˧˥',
  cVB: 'ȵin˧˥',
  aVB: 'ɕin˧˥',
  IVB: 'lin˧˥',
  LVB: 'ɖin˧˥',
  dVB: 'kin˧˥',
  PVB: 'dzin˧˥',
  NVB: 'tsin˧˥',
  CVB: 'bin˧˥',
  gVF: 'ŋɯin˧˥',
  OVB: 'tsʰin˧˥',
  fVN: 'gʷɯin˧˥',
  lVB: 'jin˧˥',
  DVF: 'mɯin˧˥',
  DVB: 'min˧˥',
  kVJ: 'ɦʷin˧˥',
  XVJ: 'tɕʷin˧˥',
  lVJ: 'jʷin˧˥',
  QVJ: 'sʷin˧˥',
  cVJ: 'ȵʷin˧˥',
  YVJ: 'tɕʰʷin˧˥',
  bVJ: 'ʑʷin˧˥',
  KVJ: 'ʈʰʷin˧˥',
  IVJ: 'lʷin˧˥',
  eVJ: 'kʰʷin˧˥',
  eVB: 'kʰin˧˥',
  aVJ: 'ɕʷin˧˥',
  iVB: 'xin˧˥',
  UVB: 'dʐin˧˥',
  JVB: 'ʈin˧˥',
  DXB: 'miun˧˥',
  AXB: 'piun˧˥',
  CXB: 'biun˧˥',
  BXB: 'pʰiun˧˥',
  hXJ: 'ʔiun˧˥',
  gXJ: 'ŋiun˧˥',
  kXJ: 'ɦiun˧˥',
  eXJ: 'kʰiun˧˥',
  hYB: 'ʔɨn˧˥',
  dYB: 'kɨn˧˥',
  SWB: 'tʂɪn˧˥',
  eYB: 'kʰɨn˧˥',
  fYB: 'gɨn˧˥',
  TWB: 'tʂʰɪn˧˥',
  gYB: 'ŋɨn˧˥',
  iYB: 'xɨn˧˥',
  gZJ: 'ŋʷiɐn˧˥',
  kZJ: 'ɦʷiɐn˧˥',
  hZB: 'ʔiɐn˧˥',
  dZB: 'kiɐn˧˥',
  fZB: 'giɐn˧˥',
  eZB: 'kʰiɐn˧˥',
  gZB: 'ŋiɐn˧˥',
  iZB: 'xiɐn˧˥',
  DZB: 'mʷiɐn˧˥',
  AZB: 'pʷiɐn˧˥',
  fZJ: 'gʷiɐn˧˥',
  hZJ: 'ʔʷiɐn˧˥',
  eZJ: 'kʰʷiɐn˧˥',
  iZJ: 'xʷiɐn˧˥',
  CZB: 'bʷiɐn˧˥',
  jaJ: 'ɣuon˧˥',
  BaB: 'pʰuon˧˥',
  OaJ: 'tsʰuon˧˥',
  AaB: 'puon˧˥',
  QaJ: 'suon˧˥',
  NaJ: 'tsuon˧˥',
  haJ: 'ʔuon˧˥',
  GaJ: 'duon˧˥',
  PaJ: 'dzuon˧˥',
  daJ: 'kuon˧˥',
  FaJ: 'tʰuon˧˥',
  eaJ: 'kʰuon˧˥',
  IaJ: 'luon˧˥',
  CaB: 'buon˧˥',
  DaB: 'muon˧˥',
  HaJ: 'nuon˧˥',
  iaJ: 'xuon˧˥',
  jbB: 'ɣən˧˥',
  ebB: 'kʰən˧˥',
  dbB: 'kən˧˥',
  jcB: 'ɣɑn˧˥',
  EcB: 'tɑn˧˥',
  FcB: 'tʰɑn˧˥',
  QcB: 'sɑn˧˥',
  GcB: 'dɑn˧˥',
  PcB: 'dzɑn˧˥',
  dcB: 'kɑn˧˥',
  IcB: 'lɑn˧˥',
  ecB: 'kʰɑn˧˥',
  icB: 'xɑn˧˥',
  NcB: 'tsɑn˧˥',
  jcJ: 'ɣʷɑn˧˥',
  EcJ: 'tʷɑn˧˥',
  hcJ: 'ʔʷɑn˧˥',
  FcJ: 'tʰʷɑn˧˥',
  QcJ: 'sʷɑn˧˥',
  dcJ: 'kʷɑn˧˥',
  IcJ: 'lʷɑn˧˥',
  ecJ: 'kʰʷɑn˧˥',
  HcJ: 'nʷɑn˧˥',
  NcJ: 'tsʷɑn˧˥',
  CcB: 'bʷɑn˧˥',
  DcB: 'mʷɑn˧˥',
  AcB: 'pʷɑn˧˥',
  RcJ: 'zʷɑn˧˥',
  GcJ: 'dʷɑn˧˥',
  HcB: 'nɑn˧˥',
  BcB: 'pʰʷɑn˧˥',
  VdB: 'ʂɯan˧˥',
  hdJ: 'ʔʷɯan˧˥',
  AdB: 'pɯan˧˥',
  SdB: 'tʂɯan˧˥',
  MdB: 'ɳɯan˧˥',
  jdB: 'ɣɯan˧˥',
  jdJ: 'ɣʷɯan˧˥',
  CdB: 'bɯan˧˥',
  DdB: 'mɯan˧˥',
  UdB: 'dʐɯan˧˥',
  gdB: 'ŋɯan˧˥',
  TdB: 'tʂʰɯan˧˥',
  BdB: 'pʰɯan˧˥',
  UdJ: 'dʐʷɯan˧˥',
  VeB: 'ʂɯæn˧˥',
  jeB: 'ɣɯæn˧˥',
  DeB: 'mɯæn˧˥',
  deB: 'kɯæn˧˥',
  TeB: 'tʂʰɯæn˧˥',
  UeB: 'dʐɯæn˧˥',
  geB: 'ŋɯæn˧˥',
  SeB: 'tʂɯæn˧˥',
  TeJ: 'tʂʰʷɯæn˧˥',
  eeB: 'kʰɯæn˧˥',
  QgB: 'sen˧˥',
  FgB: 'tʰen˧˥',
  EgB: 'ten˧˥',
  hgB: 'ʔen˧˥',
  GgB: 'den˧˥',
  dgB: 'ken˧˥',
  jgB: 'ɣen˧˥',
  igB: 'xen˧˥',
  DgB: 'men˧˥',
  HgB: 'nen˧˥',
  AgB: 'pen˧˥',
  jgJ: 'ɣʷen˧˥',
  dgJ: 'kʷen˧˥',
  CgB: 'ben˧˥',
  egJ: 'kʰʷen˧˥',
  egB: 'kʰen˧˥',
  ggB: 'ŋen˧˥',
  QfB: 'siɛn˧˥',
  lfB: 'jiɛn˧˥',
  PfB: 'dziɛn˧˥',
  JfB: 'ʈiɛn˧˥',
  XfB: 'tɕiɛn˧˥',
  MfB: 'ɳiɛn˧˥',
  OfB: 'tsʰiɛn˧˥',
  YfB: 'tɕʰiɛn˧˥',
  efB: 'kʰiɛn˧˥',
  dfF: 'kɯiɛn˧˥',
  ZfB: 'dʑiɛn˧˥',
  NfB: 'tsiɛn˧˥',
  cfB: 'ȵiɛn˧˥',
  RfB: 'ziɛn˧˥',
  IfB: 'liɛn˧˥',
  gfF: 'ŋɯiɛn˧˥',
  ffF: 'gɯiɛn˧˥',
  CfF: 'bɯiɛn˧˥',
  DfB: 'miɛn˧˥',
  AfB: 'piɛn˧˥',
  NfJ: 'tsʷiɛn˧˥',
  PfJ: 'dzʷiɛn˧˥',
  AfF: 'pɯiɛn˧˥',
  lfJ: 'jʷiɛn˧˥',
  IfJ: 'lʷiɛn˧˥',
  JfJ: 'ʈʷiɛn˧˥',
  dfN: 'kʷɯiɛn˧˥',
  ffN: 'gʷɯiɛn˧˥',
  cfJ: 'ȵʷiɛn˧˥',
  YfJ: 'tɕʰʷiɛn˧˥',
  ZfJ: 'dʑʷiɛn˧˥',
  LfJ: 'ɖʷiɛn˧˥',
  XfJ: 'tɕʷiɛn˧˥',
  QfJ: 'sʷiɛn˧˥',
  UfJ: 'dʐʷiɛn˧˥',
  ffJ: 'gʷiɛn˧˥',
  ifJ: 'xʷiɛn˧˥',
  CfB: 'biɛn˧˥',
  DfF: 'mɯiɛn˧˥',
  KfB: 'ʈʰiɛn˧˥',
  BfF: 'pʰɯiɛn˧˥',
  afB: 'ɕiɛn˧˥',
  hfF: 'ʔɯiɛn˧˥',
  LfB: 'ɖiɛn˧˥',
  UfB: 'dʐiɛn˧˥',
  QhB: 'seu˧˥',
  dhB: 'keu˧˥',
  EhB: 'teu˧˥',
  IhB: 'leu˧˥',
  FhB: 'tʰeu˧˥',
  ihB: 'xeu˧˥',
  hhB: 'ʔeu˧˥',
  HhB: 'neu˧˥',
  jhB: 'ɣeu˧˥',
  GhB: 'deu˧˥',
  ehB: 'kʰeu˧˥',
  NhB: 'tseu˧˥',
  QiB: 'siɛu˧˥',
  LiB: 'ɖiɛu˧˥',
  XiB: 'tɕiɛu˧˥',
  hiF: 'ʔɯiɛu˧˥',
  KiB: 'ʈʰiɛu˧˥',
  aiB: 'ɕiɛu˧˥',
  ciB: 'ȵiɛu˧˥',
  CiB: 'biɛu˧˥',
  YiB: 'tɕʰiɛu˧˥',
  BiB: 'pʰiɛu˧˥',
  DiB: 'miɛu˧˥',
  ZiB: 'dʑiɛu˧˥',
  diF: 'kɯiɛu˧˥',
  AiF: 'pɯiɛu˧˥',
  AiB: 'piɛu˧˥',
  CiF: 'bɯiɛu˧˥',
  liB: 'jiɛu˧˥',
  OiB: 'tsʰiɛu˧˥',
  NiB: 'tsiɛu˧˥',
  fiF: 'gɯiɛu˧˥',
  IiB: 'liɛu˧˥',
  BiF: 'pʰɯiɛu˧˥',
  hiB: 'ʔiɛu˧˥',
  ejB: 'kʰɯau˧˥',
  jjB: 'ɣɯau˧˥',
  AjB: 'pɯau˧˥',
  MjB: 'ɳɯau˧˥',
  DjB: 'mɯau˧˥',
  djB: 'kɯau˧˥',
  SjB: 'tʂɯau˧˥',
  hjB: 'ʔɯau˧˥',
  CjB: 'bɯau˧˥',
  gjB: 'ŋɯau˧˥',
  UjB: 'dʐɯau˧˥',
  TjB: 'tʂʰɯau˧˥',
  JjB: 'ʈɯau˧˥',
  VjB: 'ʂɯau˧˥',
  jkB: 'ɣɑu˧˥',
  CkB: 'bɑu˧˥',
  IkB: 'lɑu˧˥',
  FkB: 'tʰɑu˧˥',
  GkB: 'dɑu˧˥',
  HkB: 'nɑu˧˥',
  QkB: 'sɑu˧˥',
  EkB: 'tɑu˧˥',
  OkB: 'tsʰɑu˧˥',
  NkB: 'tsɑu˧˥',
  PkB: 'dzɑu˧˥',
  dkB: 'kɑu˧˥',
  ikB: 'xɑu˧˥',
  DkB: 'mɑu˧˥',
  AkB: 'pɑu˧˥',
  hkB: 'ʔɑu˧˥',
  ekB: 'kʰɑu˧˥',
  gkB: 'ŋɑu˧˥',
  dlB: 'kɑ˧˥',
  OlB: 'tsʰɑ˧˥',
  ElB: 'tɑ˧˥',
  QlB: 'sɑ˧˥',
  GlB: 'dɑ˧˥',
  glB: 'ŋɑ˧˥',
  FlB: 'tʰɑ˧˥',
  IlB: 'lɑ˧˥',
  HlB: 'nɑ˧˥',
  jlB: 'ɣɑ˧˥',
  ilB: 'xɑ˧˥',
  elB: 'kʰɑ˧˥',
  hlB: 'ʔɑ˧˥',
  NlB: 'tsɑ˧˥',
  dlJ: 'kuɑ˧˥',
  ElJ: 'tuɑ˧˥',
  QlJ: 'suɑ˧˥',
  GlJ: 'duɑ˧˥',
  FlJ: 'tʰuɑ˧˥',
  DlB: 'muɑ˧˥',
  PlJ: 'dzuɑ˧˥',
  glJ: 'ŋuɑ˧˥',
  IlJ: 'luɑ˧˥',
  hlJ: 'ʔuɑ˧˥',
  HlJ: 'nuɑ˧˥',
  AlB: 'puɑ˧˥',
  BlB: 'pʰuɑ˧˥',
  jlJ: 'ɣuɑ˧˥',
  ilJ: 'xuɑ˧˥',
  elJ: 'kʰuɑ˧˥',
  ClB: 'bɑ˧˥',
  OlJ: 'tsʰuɑ˧˥',
  NlJ: 'tsuɑ˧˥',
  DnB: 'mɯa˧˥',
  XoB: 'tɕia˧˥',
  loB: 'jia˧˥',
  gnB: 'ŋɯa˧˥',
  dnB: 'kɯa˧˥',
  VnB: 'ʂɯa˧˥',
  hnB: 'ʔɯa˧˥',
  RoB: 'zia˧˥',
  jnB: 'ɣɯa˧˥',
  QoB: 'sia˧˥',
  NmJ: 'tsʷiɑ˧˥',
  DoB: 'mia˧˥',
  OoB: 'tsʰia˧˥',
  inB: 'xɯa˧˥',
  ZoB: 'dʑia˧˥',
  enB: 'kʰɯa˧˥',
  CnB: 'bɯa˧˥',
  aoB: 'ɕia˧˥',
  NoB: 'tsia˧˥',
  AnB: 'pɯa˧˥',
  jnJ: 'ɣʷɯa˧˥',
  dnJ: 'kʷɯa˧˥',
  gnJ: 'ŋʷɯa˧˥',
  coB: 'ȵia˧˥',
  SnB: 'tʂɯa˧˥',
  JnB: 'ʈɯa˧˥',
  UnB: 'dʐɯa˧˥',
  YoB: 'tɕʰia˧˥',
  MnB: 'ɳɯa˧˥',
  enJ: 'kʰʷɯa˧˥',
  TnJ: 'tʂʰʷɯa˧˥',
  KnJ: 'ʈʰʷɯa˧˥',
  VnJ: 'ʂʷɯa˧˥',
  KnB: 'ʈʰɯa˧˥',
  InB: 'lɯa˧˥',
  lpB: 'jiɐŋ˧˥',
  RpB: 'ziɐŋ˧˥',
  NpB: 'tsiɐŋ˧˥',
  IpB: 'liɐŋ˧˥',
  hpB: 'ʔiɐŋ˧˥',
  fpB: 'giɐŋ˧˥',
  gpB: 'ŋiɐŋ˧˥',
  TpB: 'tʂʰiɐŋ˧˥',
  QpB: 'siɐŋ˧˥',
  XpB: 'tɕiɐŋ˧˥',
  VpB: 'ʂiɐŋ˧˥',
  ipB: 'xiɐŋ˧˥',
  YpB: 'tɕʰiɐŋ˧˥',
  dpB: 'kiɐŋ˧˥',
  LpB: 'ɖiɐŋ˧˥',
  KpB: 'ʈʰiɐŋ˧˥',
  dpJ: 'kʷiɐŋ˧˥',
  cpB: 'ȵiɐŋ˧˥',
  apB: 'ɕiɐŋ˧˥',
  BpB: 'pʰʷiɐŋ˧˥',
  DpB: 'mʷiɐŋ˧˥',
  ApB: 'pʷiɐŋ˧˥',
  hpJ: 'ʔʷiɐŋ˧˥',
  kpJ: 'ɦʷiɐŋ˧˥',
  ipJ: 'xʷiɐŋ˧˥',
  OpB: 'tsʰiɐŋ˧˥',
  JpB: 'ʈiɐŋ˧˥',
  ZpB: 'dʑiɐŋ˧˥',
  fpJ: 'gʷiɐŋ˧˥',
  CpB: 'bʷiɐŋ˧˥',
  GqB: 'dɑŋ˧˥',
  QqB: 'sɑŋ˧˥',
  dqJ: 'kʷɑŋ˧˥',
  AqB: 'pɑŋ˧˥',
  NqB: 'tsɑŋ˧˥',
  HqB: 'nɑŋ˧˥',
  jqB: 'ɣɑŋ˧˥',
  FqB: 'tʰɑŋ˧˥',
  DqB: 'mɑŋ˧˥',
  EqB: 'tɑŋ˧˥',
  IqB: 'lɑŋ˧˥',
  hqB: 'ʔɑŋ˧˥',
  eqB: 'kʰɑŋ˧˥',
  hqJ: 'ʔʷɑŋ˧˥',
  jqJ: 'ɣʷɑŋ˧˥',
  BqB: 'pʰɑŋ˧˥',
  iqJ: 'xʷɑŋ˧˥',
  dqB: 'kɑŋ˧˥',
  gqB: 'ŋɑŋ˧˥',
  PqB: 'dzɑŋ˧˥',
  OqB: 'tsʰɑŋ˧˥',
  iqB: 'xɑŋ˧˥',
  eqJ: 'kʰʷɑŋ˧˥',
  drB: 'kɯaŋ˧˥',
  AsB: 'pɯiaŋ˧˥',
  dsB: 'kɯiaŋ˧˥',
  hsB: 'ʔɯiaŋ˧˥',
  VsB: 'ʂɯiaŋ˧˥',
  ksJ: 'ɦʷɯiaŋ˧˥',
  isJ: 'xʷɯiaŋ˧˥',
  DsB: 'mɯiaŋ˧˥',
  dsJ: 'kʷɯiaŋ˧˥',
  jrB: 'ɣɯaŋ˧˥',
  DrB: 'mɯaŋ˧˥',
  drJ: 'kʷɯaŋ˧˥',
  ArB: 'pɯaŋ˧˥',
  JrB: 'ʈɯaŋ˧˥',
  LrB: 'ɖɯaŋ˧˥',
  hrJ: 'ʔʷɯaŋ˧˥',
  ErB: 'tɯaŋ˧˥',
  IrB: 'lɯaŋ˧˥',
  jrJ: 'ɣʷɯaŋ˧˥',
  CrB: 'bɯaŋ˧˥',
  erJ: 'kʰʷɯaŋ˧˥',
  MrB: 'ɳɯaŋ˧˥',
  dtB: 'kɯæŋ˧˥',
  DtB: 'mɯæŋ˧˥',
  jtB: 'ɣɯæŋ˧˥',
  CtB: 'bɯæŋ˧˥',
  BtB: 'pʰɯæŋ˧˥',
  PuB: 'dziɛŋ˧˥',
  XuB: 'tɕiɛŋ˧˥',
  KuB: 'ʈʰiɛŋ˧˥',
  luB: 'jiɛŋ˧˥',
  fuB: 'giɛŋ˧˥',
  luJ: 'jʷiɛŋ˧˥',
  IuB: 'liɛŋ˧˥',
  duB: 'kiɛŋ˧˥',
  AuB: 'piɛŋ˧˥',
  euJ: 'kʰʷiɛŋ˧˥',
  NuB: 'tsiɛŋ˧˥',
  huB: 'ʔiɛŋ˧˥',
  OuB: 'tsʰiɛŋ˧˥',
  QuB: 'siɛŋ˧˥',
  DuB: 'miɛŋ˧˥',
  LuB: 'ɖiɛŋ˧˥',
  jvJ: 'ɣʷeŋ˧˥',
  dvJ: 'kʷeŋ˧˥',
  DvB: 'meŋ˧˥',
  EvB: 'teŋ˧˥',
  GvB: 'deŋ˧˥',
  FvB: 'tʰeŋ˧˥',
  PvB: 'dzeŋ˧˥',
  hvJ: 'ʔʷeŋ˧˥',
  evB: 'kʰeŋ˧˥',
  HvB: 'neŋ˧˥',
  jvB: 'ɣeŋ˧˥',
  QvB: 'seŋ˧˥',
  AvB: 'peŋ˧˥',
  evJ: 'kʰʷeŋ˧˥',
  dvB: 'keŋ˧˥',
  BvB: 'pʰeŋ˧˥',
  hvB: 'ʔeŋ˧˥',
  IvB: 'leŋ˧˥',
  CvB: 'beŋ˧˥',
  ivJ: 'xʷeŋ˧˥',
  gvB: 'ŋeŋ˧˥',
  XwB: 'tɕɨŋ˧˥',
  KwB: 'ʈʰɨŋ˧˥',
  fwB: 'gɨŋ˧˥',
  VwB: 'ʂɨŋ˧˥',
  ExB: 'təŋ˧˥',
  BxB: 'pʰəŋ˧˥',
  exB: 'kʰəŋ˧˥',
  HxB: 'nəŋ˧˥',
  kyB: 'ɦiu˧˥',
  IyB: 'liu˧˥',
  MyB: 'ɳiu˧˥',
  KyB: 'ʈʰiu˧˥',
  JyB: 'ʈiu˧˥',
  iyB: 'xiu˧˥',
  dyB: 'kiu˧˥',
  ayB: 'ɕiu˧˥',
  YyB: 'tɕʰiu˧˥',
  PyB: 'dziu˧˥',
  CyB: 'biu˧˥',
  AyB: 'piu˧˥',
  eyB: 'kʰiu˧˥',
  cyB: 'ȵiu˧˥',
  fyB: 'giu˧˥',
  LyB: 'ɖiu˧˥',
  lyB: 'jiu˧˥',
  ZyB: 'dʑiu˧˥',
  QyB: 'siu˧˥',
  hyB: 'ʔiu˧˥',
  NyB: 'tsiu˧˥',
  VyB: 'ʂiu˧˥',
  XyB: 'tɕiu˧˥',
  ByB: 'pʰiu˧˥',
  SyB: 'tʂiu˧˥',
  UyB: 'dʐiu˧˥',
  TyB: 'tʂʰiu˧˥',
  jzB: 'ɣəu˧˥',
  DzB: 'məu˧˥',
  CzB: 'bəu˧˥',
  EzB: 'təu˧˥',
  FzB: 'tʰəu˧˥',
  dzB: 'kəu˧˥',
  gzB: 'ŋəu˧˥',
  AzB: 'pəu˧˥',
  HzB: 'nəu˧˥',
  QzB: 'səu˧˥',
  izB: 'xəu˧˥',
  BzB: 'pʰəu˧˥',
  hzB: 'ʔəu˧˥',
  IzB: 'ləu˧˥',
  NzB: 'tsəu˧˥',
  ezB: 'kʰəu˧˥',
  GzB: 'dəu˧˥',
  UzB: 'dʐəu˧˥',
  OzB: 'tsʰəu˧˥',
  h0B: 'ʔɨu˧˥',
  d0B: 'kɨu˧˥',
  f0B: 'gɨu˧˥',
  O1B: 'tsʰim˧˥',
  L1B: 'ɖim˧˥',
  e1B: 'kʰim˧˥',
  I1B: 'lim˧˥',
  Q1B: 'sim˧˥',
  K1B: 'ʈʰim˧˥',
  N1B: 'tsim˧˥',
  c1B: 'ȵim˧˥',
  X1B: 'tɕim˧˥',
  a1B: 'ɕim˧˥',
  b1B: 'ʑim˧˥',
  Z1B: 'dʑim˧˥',
  Y1B: 'tɕʰim˧˥',
  T1B: 'tʂʰim˧˥',
  M1B: 'ɳim˧˥',
  f1F: 'gɯim˧˥',
  d1F: 'kɯim˧˥',
  P1B: 'dzim˧˥',
  g1F: 'ŋɯim˧˥',
  V1B: 'ʂim˧˥',
  A1F: 'pɯim˧˥',
  h1F: 'ʔɯim˧˥',
  B1F: 'pʰɯim˧˥',
  e1F: 'kʰɯim˧˥',
  i1F: 'xɯim˧˥',
  J1B: 'ʈim˧˥',
  l1B: 'jim˧˥',
  U1B: 'dʐim˧˥',
  d2B: 'kəm˧˥',
  G2B: 'dəm˧˥',
  h2B: 'ʔəm˧˥',
  H2B: 'nəm˧˥',
  F2B: 'tʰəm˧˥',
  P2B: 'dzəm˧˥',
  O2B: 'tsʰəm˧˥',
  g2B: 'ŋəm˧˥',
  N2B: 'tsəm˧˥',
  Q2B: 'səm˧˥',
  e2B: 'kʰəm˧˥',
  j2B: 'ɣəm˧˥',
  I2B: 'ləm˧˥',
  E2B: 'təm˧˥',
  i2B: 'xəm˧˥',
  d3B: 'kɑm˧˥',
  a3B: 'ɕɑm˧˥',
  I3B: 'lɑm˧˥',
  F3B: 'tʰɑm˧˥',
  E3B: 'tɑm˧˥',
  G3B: 'dɑm˧˥',
  O3B: 'tsʰɑm˧˥',
  D3B: 'mɑm˧˥',
  N3B: 'tsɑm˧˥',
  P3B: 'dzɑm˧˥',
  i3B: 'xɑm˧˥',
  h3B: 'ʔɑm˧˥',
  e3B: 'kʰɑm˧˥',
  l4B: 'jiɛm˧˥',
  I4B: 'liɛm˧˥',
  i4F: 'xɯiɛm˧˥',
  A4F: 'pɯiɛm˧˥',
  X4B: 'tɕiɛm˧˥',
  e4F: 'kʰɯiɛm˧˥',
  g4F: 'ŋɯiɛm˧˥',
  f4F: 'gɯiɛm˧˥',
  d4F: 'kɯiɛm˧˥',
  h4B: 'ʔiɛm˧˥',
  c4B: 'ȵiɛm˧˥',
  a4B: 'ɕiɛm˧˥',
  K4B: 'ʈʰiɛm˧˥',
  h4F: 'ʔɯiɛm˧˥',
  P4B: 'dziɛm˧˥',
  O4B: 'tsʰiɛm˧˥',
  N4B: 'tsiɛm˧˥',
  e4B: 'kʰiɛm˧˥',
  Z4B: 'dʑiɛm˧˥',
  F5B: 'tʰem˧˥',
  H5B: 'nem˧˥',
  E5B: 'tem˧˥',
  G5B: 'dem˧˥',
  e5B: 'kʰem˧˥',
  I5B: 'lem˧˥',
  j5B: 'ɣem˧˥',
  O5B: 'tsʰem˧˥',
  d5B: 'kem˧˥',
  D5B: 'mem˧˥',
  g8B: 'ŋiɐm˧˥',
  e8B: 'kʰiɐm˧˥',
  h8B: 'ʔiɐm˧˥',
  j6B: 'ɣɯæm˧˥',
  L6B: 'ɖɯæm˧˥',
  e6B: 'kʰɯæm˧˥',
  d6B: 'kɯæm˧˥',
  U6B: 'dʐɯæm˧˥',
  I6B: 'lɯæm˧˥',
  S6B: 'tʂɯæm˧˥',
  T6B: 'tʂʰɯæm˧˥',
  i6B: 'xɯæm˧˥',
  V6B: 'ʂɯæm˧˥',
  h6B: 'ʔɯæm˧˥',
  M6B: 'ɳɯæm˧˥',
  K6B: 'ʈʰɯæm˧˥',
  j7B: 'ɣɯam˧˥',
  e7B: 'kʰɯam˧˥',
  V7B: 'ʂɯam˧˥',
  h7B: 'ʔɯam˧˥',
  T7B: 'tʂʰɯam˧˥',
  i7B: 'xɯam˧˥',
  U7B: 'dʐɯam˧˥',
  C9B: 'biɐm˧˥',
  D9B: 'miɐm˧˥',
  A9B: 'piɐm˧˥',
  e9J: 'kʰiɐm˧˥',
  B9B: 'pʰiɐm˧˥',
  K9J: 'ʈʰiɐm˧˥',
  QAC: 'suŋ˥˨',
  CBC: 'biuŋ˥˨',
  dAC: 'kuŋ˥˨',
  IAC: 'luŋ˥˨',
  EAC: 'tuŋ˥˨',
  eAC: 'kʰuŋ˥˨',
  NAC: 'tsuŋ˥˨',
  hAC: 'ʔuŋ˥˨',
  OAC: 'tsʰuŋ˥˨',
  GAC: 'duŋ˥˨',
  FAC: 'tʰuŋ˥˨',
  LBC: 'ɖiuŋ˥˨',
  ABC: 'piuŋ˥˨',
  eBC: 'kʰiuŋ˥˨',
  DBC: 'miuŋ˥˨',
  iBC: 'xiuŋ˥˨',
  DAC: 'muŋ˥˨',
  OBC: 'tsʰiuŋ˥˨',
  BBC: 'pʰiuŋ˥˨',
  PAC: 'dzuŋ˥˨',
  JBC: 'ʈiuŋ˥˨',
  jAC: 'ɣuŋ˥˨',
  HAC: 'nuŋ˥˨',
  XBC: 'tɕiuŋ˥˨',
  YBC: 'tɕʰiuŋ˥˨',
  UBC: 'dʐiuŋ˥˨',
  iAC: 'xuŋ˥˨',
  QCC: 'suoŋ˥˨',
  NCC: 'tsuoŋ˥˨',
  FCC: 'tʰuoŋ˥˨',
  DCC: 'muoŋ˥˨',
  jCC: 'ɣuoŋ˥˨',
  lDC: 'jioŋ˥˨',
  RDC: 'zioŋ˥˨',
  CDC: 'bioŋ˥˨',
  fDC: 'gioŋ˥˨',
  ADC: 'pioŋ˥˨',
  dDC: 'kioŋ˥˨',
  hDC: 'ʔioŋ˥˨',
  JDC: 'ʈioŋ˥˨',
  NDC: 'tsioŋ˥˨',
  KDC: 'ʈʰioŋ˥˨',
  cDC: 'ȵioŋ˥˨',
  XDC: 'tɕioŋ˥˨',
  LDC: 'ɖioŋ˥˨',
  IDC: 'lioŋ˥˨',
  eDC: 'kʰioŋ˥˨',
  PDC: 'dzioŋ˥˨',
  MDC: 'ɳioŋ˥˨',
  dEC: 'kɯɔŋ˥˨',
  jEC: 'ɣɯɔŋ˥˨',
  JEC: 'ʈɯɔŋ˥˨',
  LEC: 'ɖɯɔŋ˥˨',
  KEC: 'ʈʰɯɔŋ˥˨',
  UEC: 'dʐɯɔŋ˥˨',
  BEC: 'pʰɯɔŋ˥˨',
  TEC: 'tʂʰɯɔŋ˥˨',
  VEC: 'ʂɯɔŋ˥˨',
  XFC: 'tɕiɛ˥˨',
  CFC: 'biɛ˥˨',
  XFK: 'tɕʷiɛ˥˨',
  IFC: 'liɛ˥˨',
  ZFC: 'dʑiɛ˥˨',
  NFC: 'tsiɛ˥˨',
  QFC: 'siɛ˥˨',
  kFK: 'ɦʷiɛ˥˨',
  dFO: 'kʷɯiɛ˥˨',
  BFG: 'pʰɯiɛ˥˨',
  AFG: 'pɯiɛ˥˨',
  CFG: 'bɯiɛ˥˨',
  IFK: 'lʷiɛ˥˨',
  dFG: 'kɯiɛ˥˨',
  AFC: 'piɛ˥˨',
  fFG: 'gɯiɛ˥˨',
  OFC: 'tsʰiɛ˥˨',
  lFC: 'jiɛ˥˨',
  gFG: 'ŋɯiɛ˥˨',
  BFC: 'pʰiɛ˥˨',
  PFC: 'dziɛ˥˨',
  JFC: 'ʈiɛ˥˨',
  hFG: 'ʔɯiɛ˥˨',
  LFK: 'ɖʷiɛ˥˨',
  YFK: 'tɕʰʷiɛ˥˨',
  iFG: 'xɯiɛ˥˨',
  eFC: 'kʰiɛ˥˨',
  hFC: 'ʔiɛ˥˨',
  aFC: 'ɕiɛ˥˨',
  VFC: 'ʂiɛ˥˨',
  eFK: 'kʰʷiɛ˥˨',
  hFO: 'ʔʷɯiɛ˥˨',
  gFO: 'ŋʷɯiɛ˥˨',
  iFO: 'xʷɯiɛ˥˨',
  hFK: 'ʔʷiɛ˥˨',
  ZFK: 'dʑʷiɛ˥˨',
  dFC: 'kiɛ˥˨',
  cFK: 'ȵʷiɛ˥˨',
  YFC: 'tɕʰiɛ˥˨',
  QFK: 'sʷiɛ˥˨',
  JFK: 'ʈʷiɛ˥˨',
  lFK: 'jʷiɛ˥˨',
  MFK: 'ɳʷiɛ˥˨',
  dFK: 'kʷiɛ˥˨',
  SFC: 'tʂiɛ˥˨',
  iFK: 'xʷiɛ˥˨',
  eFG: 'kʰɯiɛ˥˨',
  XGC: 'tɕi˥˨',
  kGK: 'ɦʷi˥˨',
  DGG: 'mɯi˥˨',
  RGK: 'zʷi˥˨',
  NGK: 'tsʷi˥˨',
  QGK: 'sʷi˥˨',
  IGK: 'lʷi˥˨',
  AGG: 'pɯi˥˨',
  fGO: 'gʷɯi˥˨',
  BGG: 'pʰɯi˥˨',
  CGG: 'bɯi˥˨',
  dGO: 'kʷɯi˥˨',
  VGK: 'ʂʷi˥˨',
  eGO: 'kʰʷɯi˥˨',
  iGO: 'xʷɯi˥˨',
  ZGC: 'dʑi˥˨',
  IGC: 'li˥˨',
  MGC: 'ɳi˥˨',
  BGC: 'pʰi˥˨',
  gGG: 'ŋɯi˥˨',
  JGC: 'ʈi˥˨',
  eGC: 'kʰi˥˨',
  LGC: 'ɖi˥˨',
  DGC: 'mi˥˨',
  KGC: 'ʈʰi˥˨',
  dGG: 'kɯi˥˨',
  fGG: 'gɯi˥˨',
  fGK: 'gʷi˥˨',
  OGK: 'tsʰʷi˥˨',
  cGC: 'ȵi˥˨',
  NGC: 'tsi˥˨',
  OGC: 'tsʰi˥˨',
  hGG: 'ʔɯi˥˨',
  QGC: 'si˥˨',
  eGG: 'kʰɯi˥˨',
  dGK: 'kʷi˥˨',
  CGC: 'bi˥˨',
  iGK: 'xʷi˥˨',
  AGC: 'pi˥˨',
  PGK: 'dzʷi˥˨',
  GGC: 'di˥˨',
  iGG: 'xɯi˥˨',
  lGC: 'ji˥˨',
  bGC: 'ʑi˥˨',
  PGC: 'dzi˥˨',
  LGK: 'ɖʷi˥˨',
  YGK: 'tɕʰʷi˥˨',
  lGK: 'jʷi˥˨',
  JGK: 'ʈʷi˥˨',
  YGC: 'tɕʰi˥˨',
  aGC: 'ɕi˥˨',
  TGK: 'tʂʰʷi˥˨',
  aGK: 'ɕʷi˥˨',
  XHC: 'tɕɨ˥˨',
  LHC: 'ɖɨ˥˨',
  RHC: 'zɨ˥˨',
  OHC: 'tsʰɨ˥˨',
  QHC: 'sɨ˥˨',
  aHC: 'ɕɨ˥˨',
  SHC: 'tʂɨ˥˨',
  IHC: 'lɨ˥˨',
  PHC: 'dzɨ˥˨',
  KHC: 'ʈʰɨ˥˨',
  cHC: 'ȵɨ˥˨',
  VHC: 'ʂɨ˥˨',
  THC: 'tʂʰɨ˥˨',
  lHC: 'jɨ˥˨',
  JHC: 'ʈɨ˥˨',
  ZHC: 'dʑɨ˥˨',
  UHC: 'dʐɨ˥˨',
  fHC: 'gɨ˥˨',
  YHC: 'tɕʰɨ˥˨',
  hHC: 'ʔɨ˥˨',
  dHC: 'kɨ˥˨',
  iHC: 'xɨ˥˨',
  gHC: 'ŋɨ˥˨',
  eHC: 'kʰɨ˥˨',
  DIC: 'mʷɨi˥˨',
  dIK: 'kʷɨi˥˨',
  kIK: 'ɦʷɨi˥˨',
  gIK: 'ŋʷɨi˥˨',
  AIC: 'pʷɨi˥˨',
  BIC: 'pʰʷɨi˥˨',
  eIK: 'kʰʷɨi˥˨',
  hIK: 'ʔʷɨi˥˨',
  iIK: 'xʷɨi˥˨',
  CIC: 'bʷɨi˥˨',
  dIC: 'kɨi˥˨',
  gIC: 'ŋɨi˥˨',
  eIC: 'kʰɨi˥˨',
  iIC: 'xɨi˥˨',
  fIC: 'gɨi˥˨',
  hIC: 'ʔɨi˥˨',
  gJC: 'ŋiɔ˥˨',
  IJC: 'liɔ˥˨',
  dJC: 'kiɔ˥˨',
  OJC: 'tsʰiɔ˥˨',
  eJC: 'kʰiɔ˥˨',
  ZJC: 'dʑiɔ˥˨',
  aJC: 'ɕiɔ˥˨',
  JJC: 'ʈiɔ˥˨',
  XJC: 'tɕiɔ˥˨',
  VJC: 'ʂiɔ˥˨',
  hJC: 'ʔiɔ˥˨',
  LJC: 'ɖiɔ˥˨',
  fJC: 'giɔ˥˨',
  QJC: 'siɔ˥˨',
  UJC: 'dʐiɔ˥˨',
  NJC: 'tsiɔ˥˨',
  SJC: 'tʂiɔ˥˨',
  cJC: 'ȵiɔ˥˨',
  lJC: 'jiɔ˥˨',
  iJC: 'xiɔ˥˨',
  MJC: 'ɳiɔ˥˨',
  TJC: 'tʂʰiɔ˥˨',
  YJC: 'tɕʰiɔ˥˨',
  KJC: 'ʈʰiɔ˥˨',
  RJC: 'ziɔ˥˨',
  gKC: 'ŋio˥˨',
  hKC: 'ʔio˥˨',
  ZKC: 'dʑio˥˨',
  LKC: 'ɖio˥˨',
  CKC: 'bio˥˨',
  XKC: 'tɕio˥˨',
  dKC: 'kio˥˨',
  iKC: 'xio˥˨',
  aKC: 'ɕio˥˨',
  lKC: 'jio˥˨',
  cKC: 'ȵio˥˨',
  BKC: 'pʰio˥˨',
  DKC: 'mio˥˨',
  NKC: 'tsio˥˨',
  fKC: 'gio˥˨',
  kKC: 'ɦio˥˨',
  PKC: 'dzio˥˨',
  VKC: 'ʂio˥˨',
  AKC: 'pio˥˨',
  OKC: 'tsʰio˥˨',
  JKC: 'ʈio˥˨',
  eKC: 'kʰio˥˨',
  TKC: 'tʂʰio˥˨',
  KKC: 'ʈʰio˥˨',
  QKC: 'sio˥˨',
  IKC: 'lio˥˨',
  DLC: 'muo˥˨',
  GLC: 'duo˥˨',
  ILC: 'luo˥˨',
  ELC: 'tuo˥˨',
  FLC: 'tʰuo˥˨',
  dLC: 'kuo˥˨',
  gLC: 'ŋuo˥˨',
  jLC: 'ɣuo˥˨',
  QLC: 'suo˥˨',
  PLC: 'dzuo˥˨',
  HLC: 'nuo˥˨',
  ALC: 'puo˥˨',
  hLC: 'ʔuo˥˨',
  BLC: 'pʰuo˥˨',
  OLC: 'tsʰuo˥˨',
  eLC: 'kʰuo˥˨',
  CLC: 'buo˥˨',
  iLC: 'xuo˥˨',
  NLC: 'tsuo˥˨',
  NMC: 'tsei˥˨',
  EMC: 'tei˥˨',
  PMC: 'dzei˥˨',
  FMC: 'tʰei˥˨',
  GMC: 'dei˥˨',
  OMC: 'tsʰei˥˨',
  QMC: 'sei˥˨',
  gMC: 'ŋei˥˨',
  dMC: 'kei˥˨',
  jMC: 'ɣei˥˨',
  eMC: 'kʰei˥˨',
  hMC: 'ʔei˥˨',
  DMC: 'mei˥˨',
  AMC: 'pei˥˨',
  jMK: 'ɣʷei˥˨',
  dMK: 'kʷei˥˨',
  iMK: 'xʷei˥˨',
  BMC: 'pʰei˥˨',
  CMC: 'bei˥˨',
  IMC: 'lei˥˨',
  KMC: 'ʈʰei˥˨',
  HMC: 'nei˥˨',
  iMC: 'xei˥˨',
  NNC: 'tsiɛi˥˨',
  QNK: 'sʷiei˥˨',
  kNK: 'ɦʷiei˥˨',
  cNK: 'ȵʷiei˥˨',
  XNK: 'tɕʷiei˥˨',
  VNK: 'ʂʷiei˥˨',
  ONK: 'tsʰʷiei˥˨',
  lNK: 'jʷiei˥˨',
  JNK: 'ʈʷiei˥˨',
  aNK: 'ɕʷiei˥˨',
  CNC: 'biɛi˥˨',
  TNK: 'tʂʰʷiei˥˨',
  RNK: 'zʷiei˥˨',
  ANC: 'piɛi˥˨',
  dNO: 'kʷɯiei˥˨',
  DNC: 'miɛi˥˨',
  VNC: 'ʂiɛi˥˨',
  YNC: 'tɕʰiɛi˥˨',
  XNC: 'tɕiɛi˥˨',
  ZNC: 'dʑiɛi˥˨',
  lNC: 'jiɛi˥˨',
  hNG: 'ʔɯiɛi˥˨',
  gNC: 'ŋiɛi˥˨',
  LNC: 'ɖiɛi˥˨',
  INC: 'liɛi˥˨',
  eNG: 'kʰɯiɛi˥˨',
  aNC: 'ɕiɛi˥˨',
  dNG: 'kɯiɛi˥˨',
  JNC: 'ʈiɛi˥˨',
  fNG: 'gɯiɛi˥˨',
  ZNK: 'dʑʷiei˥˨',
  KNC: 'ʈʰiɛi˥˨',
  LNK: 'ɖʷiei˥˨',
  gNG: 'ŋɯiɛi˥˨',
  NNK: 'tsʷiei˥˨',
  BNC: 'pʰiɛi˥˨',
  eUK: 'kʰʷiɐi˥˨',
  iUK: 'xʷiɐi˥˨',
  FOC: 'tʰɑi˥˨',
  dOC: 'kɑi˥˨',
  gOC: 'ŋɑi˥˨',
  hOC: 'ʔɑi˥˨',
  HOC: 'nɑi˥˨',
  GOC: 'dɑi˥˨',
  jOC: 'ɣɑi˥˨',
  EOC: 'tɑi˥˨',
  AOC: 'pɑi˥˨',
  BOC: 'pʰɑi˥˨',
  jOK: 'ɣʷɑi˥˨',
  GOK: 'dʷɑi˥˨',
  dOK: 'kʷɑi˥˨',
  NOK: 'tsʷɑi˥˨',
  iOK: 'xʷɑi˥˨',
  eOK: 'kʰʷɑi˥˨',
  IOK: 'lʷɑi˥˨',
  gOK: 'ŋʷɑi˥˨',
  EOK: 'tʷɑi˥˨',
  hOK: 'ʔʷɑi˥˨',
  POK: 'dzʷɑi˥˨',
  QOK: 'sʷɑi˥˨',
  OOK: 'tsʰʷɑi˥˨',
  COC: 'bɑi˥˨',
  eOC: 'kʰɑi˥˨',
  OOC: 'tsʰɑi˥˨',
  IOC: 'lɑi˥˨',
  iOC: 'xɑi˥˨',
  FOK: 'tʰʷɑi˥˨',
  DOC: 'mɑi˥˨',
  dPK: 'kʷɯæ˥˨',
  dPC: 'kɯæ˥˨',
  hPC: 'ʔɯæ˥˨',
  jPC: 'ɣɯæ˥˨',
  DPC: 'mɯæ˥˨',
  jPK: 'ɣʷɯæ˥˨',
  TPC: 'tʂʰɯæ˥˨',
  gPC: 'ŋɯæ˥˨',
  iPC: 'xɯæ˥˨',
  APC: 'pɯæ˥˨',
  CPC: 'bɯæ˥˨',
  UPC: 'dʐɯæ˥˨',
  BPC: 'pʰɯæ˥˨',
  SPC: 'tʂɯæ˥˨',
  ePC: 'kʰɯæ˥˨',
  VPC: 'ʂɯæ˥˨',
  iPK: 'xʷɯæ˥˨',
  JPK: 'ʈʷɯæ˥˨',
  dQK: 'kʷɯæi˥˨',
  hQC: 'ʔɯæi˥˨',
  SQC: 'tʂɯæi˥˨',
  dQC: 'kɯæi˥˨',
  MQC: 'ɳɯæi˥˨',
  iQC: 'xɯæi˥˨',
  jQC: 'ɣɯæi˥˨',
  gQC: 'ŋɯæi˥˨',
  eQK: 'kʰʷɯæi˥˨',
  AQC: 'pɯæi˥˨',
  BQC: 'pʰɯæi˥˨',
  jQK: 'ɣʷɯæi˥˨',
  gQK: 'ŋʷɯæi˥˨',
  CQC: 'bɯæi˥˨',
  DQC: 'mɯæi˥˨',
  iQK: 'xʷɯæi˥˨',
  VQC: 'ʂɯæi˥˨',
  eQC: 'kʰɯæi˥˨',
  KQK: 'ʈʰʷɯæi˥˨',
  dRK: 'kʷɯai˥˨',
  eRK: 'kʰʷɯai˥˨',
  DRC: 'mɯai˥˨',
  jRK: 'ɣʷɯai˥˨',
  CRC: 'bɯai˥˨',
  hRK: 'ʔʷɯai˥˨',
  TRK: 'tʂʰʷɯai˥˨',
  dRC: 'kɯai˥˨',
  KRC: 'ʈʰɯai˥˨',
  hRC: 'ʔɯai˥˨',
  VRC: 'ʂɯai˥˨',
  LRC: 'ɖɯai˥˨',
  iRC: 'xɯai˥˨',
  iRK: 'xʷɯai˥˨',
  ARC: 'pɯai˥˨',
  ORK: 'tsʰʷɯai˥˨',
  URC: 'dʐɯai˥˨',
  jRC: 'ɣɯai˥˨',
  GSK: 'duoi˥˨',
  CSC: 'buoi˥˨',
  DSC: 'muoi˥˨',
  BSC: 'pʰuoi˥˨',
  iSK: 'xuoi˥˨',
  ESK: 'tuoi˥˨',
  OSK: 'tsʰuoi˥˨',
  NSK: 'tsuoi˥˨',
  hSK: 'ʔuoi˥˨',
  FSK: 'tʰuoi˥˨',
  dSK: 'kuoi˥˨',
  jSK: 'ɣuoi˥˨',
  eSK: 'kʰuoi˥˨',
  QSK: 'suoi˥˨',
  HSK: 'nuoi˥˨',
  ISK: 'luoi˥˨',
  ASC: 'puoi˥˨',
  gSK: 'ŋuoi˥˨',
  GTC: 'dəi˥˨',
  NTC: 'tsəi˥˨',
  DTC: 'məi˥˨',
  QTC: 'səi˥˨',
  FTC: 'tʰəi˥˨',
  dTC: 'kəi˥˨',
  eTC: 'kʰəi˥˨',
  gTC: 'ŋəi˥˨',
  hTC: 'ʔəi˥˨',
  jTC: 'ɣəi˥˨',
  HTC: 'nəi˥˨',
  ETC: 'təi˥˨',
  ITC: 'ləi˥˨',
  OTC: 'tsʰəi˥˨',
  PTC: 'dzəi˥˨',
  iTC: 'xəi˥˨',
  AUC: 'pʷiɐi˥˨',
  BUC: 'pʰʷiɐi˥˨',
  hUK: 'ʔʷiɐi˥˨',
  CUC: 'bʷiɐi˥˨',
  fUK: 'gʷiɐi˥˨',
  gUC: 'ŋiɐi˥˨',
  XVC: 'tɕin˥˨',
  QVC: 'sin˥˨',
  cVC: 'ȵin˥˨',
  lVC: 'jin˥˨',
  IVC: 'lin˥˨',
  AVC: 'pin˥˨',
  LVC: 'ɖin˥˨',
  ZVC: 'dʑin˥˨',
  aVC: 'ɕin˥˨',
  eVG: 'kʰɯin˥˨',
  RVC: 'zin˥˨',
  gVG: 'ŋɯin˥˨',
  NVC: 'tsin˥˨',
  iVG: 'xɯin˥˨',
  JVC: 'ʈin˥˨',
  fVG: 'gɯin˥˨',
  TWC: 'tʂʰɪn˥˨',
  hVC: 'ʔin˥˨',
  KVC: 'ʈʰin˥˨',
  BVC: 'pʰin˥˨',
  OVC: 'tsʰin˥˨',
  eVC: 'kʰin˥˨',
  dVK: 'kʷin˥˨',
  XVK: 'tɕʷin˥˨',
  QVK: 'sʷin˥˨',
  RVK: 'zʷin˥˨',
  NVK: 'tsʷin˥˨',
  aVK: 'ɕʷin˥˨',
  cVK: 'ȵʷin˥˨',
  bVK: 'ʑʷin˥˨',
  DXC: 'miun˥˨',
  kXK: 'ɦiun˥˨',
  iXK: 'xiun˥˨',
  BXC: 'pʰiun˥˨',
  AXC: 'piun˥˨',
  hXK: 'ʔiun˥˨',
  dXK: 'kiun˥˨',
  fXK: 'giun˥˨',
  CXC: 'biun˥˨',
  iYC: 'xɨn˥˨',
  dYC: 'kɨn˥˨',
  fYC: 'gɨn˥˨',
  hYC: 'ʔɨn˥˨',
  gYC: 'ŋɨn˥˨',
  gZK: 'ŋʷiɐn˥˨',
  hZK: 'ʔʷiɐn˥˨',
  AZC: 'pʷiɐn˥˨',
  eZK: 'kʰʷiɐn˥˨',
  DZC: 'mʷiɐn˥˨',
  CZC: 'bʷiɐn˥˨',
  BZC: 'pʰʷiɐn˥˨',
  dZC: 'kiɐn˥˨',
  hZC: 'ʔiɐn˥˨',
  iZC: 'xiɐn˥˨',
  iZK: 'xʷiɐn˥˨',
  fZC: 'giɐn˥˨',
  kZK: 'ɦʷiɐn˥˨',
  gZC: 'ŋiɐn˥˨',
  fZK: 'gʷiɐn˥˨',
  dZK: 'kʷiɐn˥˨',
  jaK: 'ɣuon˥˨',
  EaK: 'tuon˥˨',
  QaK: 'suon˥˨',
  eaK: 'kʰuon˥˨',
  HaK: 'nuon˥˨',
  haK: 'ʔuon˥˨',
  DaC: 'muon˥˨',
  PaK: 'dzuon˥˨',
  daK: 'kuon˥˨',
  BaC: 'pʰuon˥˨',
  GaK: 'duon˥˨',
  OaK: 'tsʰuon˥˨',
  CaC: 'buon˥˨',
  gaK: 'ŋuon˥˨',
  IaK: 'luon˥˨',
  AaC: 'puon˥˨',
  iaK: 'xuon˥˨',
  NaK: 'tsuon˥˨',
  jbC: 'ɣən˥˨',
  dbC: 'kən˥˨',
  gbC: 'ŋən˥˨',
  hbC: 'ʔən˥˨',
  jcC: 'ɣɑn˥˨',
  FcC: 'tʰɑn˥˨',
  hcC: 'ʔɑn˥˨',
  EcC: 'tɑn˥˨',
  GcC: 'dɑn˥˨',
  dcC: 'kɑn˥˨',
  gcC: 'ŋɑn˥˨',
  ecC: 'kʰɑn˥˨',
  icC: 'xɑn˥˨',
  IcC: 'lɑn˥˨',
  HcC: 'nɑn˥˨',
  OcC: 'tsʰɑn˥˨',
  QcC: 'sɑn˥˨',
  NcC: 'tsɑn˥˨',
  PcC: 'dzɑn˥˨',
  jcK: 'ɣʷɑn˥˨',
  NcK: 'tsʷɑn˥˨',
  hcK: 'ʔʷɑn˥˨',
  dcK: 'kʷɑn˥˨',
  OcK: 'tsʰʷɑn˥˨',
  gcK: 'ŋʷɑn˥˨',
  GcK: 'dʷɑn˥˨',
  IcK: 'lʷɑn˥˨',
  EcK: 'tʷɑn˥˨',
  FcK: 'tʰʷɑn˥˨',
  icK: 'xʷɑn˥˨',
  QcK: 'sʷɑn˥˨',
  DcC: 'mʷɑn˥˨',
  AcC: 'pʷɑn˥˨',
  BcC: 'pʰʷɑn˥˨',
  CcC: 'bʷɑn˥˨',
  HcK: 'nʷɑn˥˨',
  PcK: 'dzʷɑn˥˨',
  ecK: 'kʰʷɑn˥˨',
  ddC: 'kɯan˥˨',
  gdC: 'ŋɯan˥˨',
  hdC: 'ʔɯan˥˨',
  VdC: 'ʂɯan˥˨',
  jdC: 'ɣɯan˥˨',
  DdC: 'mɯan˥˨',
  hdK: 'ʔʷɯan˥˨',
  jdK: 'ɣʷɯan˥˨',
  ddK: 'kʷɯan˥˨',
  VdK: 'ʂʷɯan˥˨',
  TdK: 'tʂʰʷɯan˥˨',
  gdK: 'ŋʷɯan˥˨',
  UdC: 'dʐɯan˥˨',
  BdC: 'pʰɯan˥˨',
  MdK: 'ɳʷɯan˥˨',
  TdC: 'tʂʰɯan˥˨',
  KdC: 'ʈʰɯan˥˨',
  deC: 'kɯæn˥˨',
  jeC: 'ɣɯæn˥˨',
  CeC: 'bɯæn˥˨',
  BeC: 'pʰɯæn˥˨',
  jeK: 'ɣʷɯæn˥˨',
  DeC: 'mɯæn˥˨',
  LeC: 'ɖɯæn˥˨',
  AeC: 'pɯæn˥˨',
  deK: 'kʷɯæn˥˨',
  QgC: 'sen˥˨',
  OgC: 'tsʰen˥˨',
  igK: 'xʷen˥˨',
  jgK: 'ɣʷen˥˨',
  dgK: 'kʷen˥˨',
  GgC: 'den˥˨',
  FgC: 'tʰen˥˨',
  IgC: 'len˥˨',
  dgC: 'ken˥˨',
  HgC: 'nen˥˨',
  egC: 'kʰen˥˨',
  jgC: 'ɣen˥˨',
  ggC: 'ŋen˥˨',
  hgC: 'ʔen˥˨',
  NgC: 'tsen˥˨',
  DgC: 'men˥˨',
  BgC: 'pʰen˥˨',
  PgC: 'dzen˥˨',
  hgK: 'ʔʷen˥˨',
  EgC: 'ten˥˨',
  igC: 'xen˥˨',
  QfC: 'siɛn˥˨',
  XfC: 'tɕiɛn˥˨',
  ZfC: 'dʑiɛn˥˨',
  gfG: 'ŋɯiɛn˥˨',
  efC: 'kʰiɛn˥˨',
  dfK: 'kʷiɛn˥˨',
  kfK: 'ɦʷiɛn˥˨',
  DfC: 'miɛn˥˨',
  YfK: 'tɕʰʷiɛn˥˨',
  lfK: 'jʷiɛn˥˨',
  JfC: 'ʈiɛn˥˨',
  cfK: 'ȵʷiɛn˥˨',
  NfC: 'tsiɛn˥˨',
  YfC: 'tɕʰiɛn˥˨',
  afC: 'ɕiɛn˥˨',
  hfC: 'ʔiɛn˥˨',
  dfO: 'kʷɯiɛn˥˨',
  ffO: 'gʷɯiɛn˥˨',
  IfK: 'lʷiɛn˥˨',
  KfK: 'ʈʰʷiɛn˥˨',
  AfG: 'pɯiɛn˥˨',
  VfK: 'ʂʷiɛn˥˨',
  OfK: 'tsʰʷiɛn˥˨',
  CfG: 'bɯiɛn˥˨',
  RfK: 'zʷiɛn˥˨',
  QfK: 'sʷiɛn˥˨',
  UfK: 'dʐʷiɛn˥˨',
  SfK: 'tʂʷiɛn˥˨',
  LfK: 'ɖʷiɛn˥˨',
  PfC: 'dziɛn˥˨',
  RfC: 'ziɛn˥˨',
  BfC: 'pʰiɛn˥˨',
  ZfK: 'dʑʷiɛn˥˨',
  MfC: 'ɳiɛn˥˨',
  JfK: 'ʈʷiɛn˥˨',
  lfC: 'jiɛn˥˨',
  CfC: 'biɛn˥˨',
  LfC: 'ɖiɛn˥˨',
  IfC: 'liɛn˥˨',
  efO: 'kʰʷɯiɛn˥˨',
  XfK: 'tɕʷiɛn˥˨',
  AgC: 'pen˥˨',
  QhC: 'seu˥˨',
  FhC: 'tʰeu˥˨',
  EhC: 'teu˥˨',
  dhC: 'keu˥˨',
  HhC: 'neu˥˨',
  GhC: 'deu˥˨',
  ehC: 'kʰeu˥˨',
  IhC: 'leu˥˨',
  ghC: 'ŋeu˥˨',
  hhC: 'ʔeu˥˨',
  ihC: 'xeu˥˨',
  QiC: 'siɛu˥˨',
  XiC: 'tɕiɛu˥˨',
  liC: 'jiɛu˥˨',
  hiC: 'ʔiɛu˥˨',
  LiC: 'ɖiɛu˥˨',
  ZiC: 'dʑiɛu˥˨',
  fiG: 'gɯiɛu˥˨',
  BiC: 'pʰiɛu˥˨',
  PiC: 'dziɛu˥˨',
  DiC: 'miɛu˥˨',
  OiC: 'tsʰiɛu˥˨',
  IiC: 'liɛu˥˨',
  eiG: 'kʰɯiɛu˥˨',
  giG: 'ŋɯiɛu˥˨',
  NiC: 'tsiɛu˥˨',
  DiG: 'mɯiɛu˥˨',
  CiC: 'biɛu˥˨',
  aiC: 'ɕiɛu˥˨',
  KiC: 'ʈʰiɛu˥˨',
  AiG: 'pɯiɛu˥˨',
  fiC: 'giɛu˥˨',
  ciC: 'ȵiɛu˥˨',
  jjC: 'ɣɯau˥˨',
  djC: 'kɯau˥˨',
  ijC: 'xɯau˥˨',
  JjC: 'ʈɯau˥˨',
  AjC: 'pɯau˥˨',
  ejC: 'kʰɯau˥˨',
  DjC: 'mɯau˥˨',
  BjC: 'pʰɯau˥˨',
  KjC: 'ʈʰɯau˥˨',
  VjC: 'ʂɯau˥˨',
  LjC: 'ɖɯau˥˨',
  MjC: 'ɳɯau˥˨',
  SjC: 'tʂɯau˥˨',
  CjC: 'bɯau˥˨',
  TjC: 'tʂʰɯau˥˨',
  hjC: 'ʔɯau˥˨',
  gjC: 'ŋɯau˥˨',
  UjC: 'dʐɯau˥˨',
  jkC: 'ɣɑu˥˨',
  GkC: 'dɑu˥˨',
  EkC: 'tɑu˥˨',
  dkC: 'kɑu˥˨',
  gkC: 'ŋɑu˥˨',
  DkC: 'mɑu˥˨',
  IkC: 'lɑu˥˨',
  OkC: 'tsʰɑu˥˨',
  CkC: 'bɑu˥˨',
  AkC: 'pɑu˥˨',
  PkC: 'dzɑu˥˨',
  hkC: 'ʔɑu˥˨',
  QkC: 'sɑu˥˨',
  ekC: 'kʰɑu˥˨',
  NkC: 'tsɑu˥˨',
  ikC: 'xɑu˥˨',
  HkC: 'nɑu˥˨',
  dlC: 'kɑ˥˨',
  jlC: 'ɣɑ˥˨',
  NlC: 'tsɑ˥˨',
  ElC: 'tɑ˥˨',
  IlC: 'lɑ˥˨',
  elC: 'kʰɑ˥˨',
  glC: 'ŋɑ˥˨',
  GlC: 'dɑ˥˨',
  HlC: 'nɑ˥˨',
  QlC: 'sɑ˥˨',
  ilC: 'xɑ˥˨',
  FlC: 'tʰɑ˥˨',
  dlK: 'kuɑ˥˨',
  jlK: 'ɣuɑ˥˨',
  NlK: 'tsuɑ˥˨',
  elK: 'kʰuɑ˥˨',
  FlK: 'tʰuɑ˥˨',
  AlC: 'puɑ˥˨',
  OlK: 'tsʰuɑ˥˨',
  DlC: 'muɑ˥˨',
  HlK: 'nuɑ˥˨',
  BlC: 'pʰuɑ˥˨',
  PlK: 'dzuɑ˥˨',
  glK: 'ŋuɑ˥˨',
  ilK: 'xuɑ˥˨',
  GlK: 'duɑ˥˨',
  ClC: 'buɑ˥˨',
  IlK: 'luɑ˥˨',
  ElK: 'tuɑ˥˨',
  QlK: 'suɑ˥˨',
  hlC: 'ʔɑ˥˨',
  hlK: 'ʔuɑ˥˨',
  DnC: 'mɯa˥˨',
  dnC: 'kɯa˥˨',
  hnC: 'ʔɯa˥˨',
  inC: 'xɯa˥˨',
  gnC: 'ŋɯa˥˨',
  KnC: 'ʈʰɯa˥˨',
  JnC: 'ʈɯa˥˨',
  SnC: 'tʂɯa˥˨',
  UnC: 'dʐɯa˥˨',
  RoC: 'zia˥˨',
  enC: 'kʰɯa˥˨',
  jnC: 'ɣɯa˥˨',
  PoC: 'dzia˥˨',
  loC: 'jia˥˨',
  YoC: 'tɕʰia˥˨',
  QoC: 'sia˥˨',
  XoC: 'tɕia˥˨',
  NoC: 'tsia˥˨',
  aoC: 'ɕia˥˨',
  boC: 'ʑia˥˨',
  AnC: 'pɯa˥˨',
  BnC: 'pʰɯa˥˨',
  jnK: 'ɣʷɯa˥˨',
  inK: 'xʷɯa˥˨',
  enK: 'kʰʷɯa˥˨',
  VnK: 'ʂʷɯa˥˨',
  CnC: 'bɯa˥˨',
  HnC: 'nɯa˥˨',
  OoC: 'tsʰia˥˨',
  VnC: 'ʂɯa˥˨',
  dnK: 'kʷɯa˥˨',
  LnC: 'ɖɯa˥˨',
  gnK: 'ŋʷɯa˥˨',
  hnK: 'ʔʷɯa˥˨',
  lpC: 'jiɐŋ˥˨',
  IpC: 'liɐŋ˥˨',
  UpC: 'dʐiɐŋ˥˨',
  cpC: 'ȵiɐŋ˥˨',
  apC: 'ɕiɐŋ˥˨',
  JpC: 'ʈiɐŋ˥˨',
  KpC: 'ʈʰiɐŋ˥˨',
  ipC: 'xiɐŋ˥˨',
  LpC: 'ɖiɐŋ˥˨',
  MpC: 'ɳiɐŋ˥˨',
  PpC: 'dziɐŋ˥˨',
  XpC: 'tɕiɐŋ˥˨',
  ZpC: 'dʑiɐŋ˥˨',
  SpC: 'tʂiɐŋ˥˨',
  hpC: 'ʔiɐŋ˥˨',
  fpC: 'giɐŋ˥˨',
  YpC: 'tɕʰiɐŋ˥˨',
  TpC: 'tʂʰiɐŋ˥˨',
  NpC: 'tsiɐŋ˥˨',
  gpC: 'ŋiɐŋ˥˨',
  BpC: 'pʰʷiɐŋ˥˨',
  DpC: 'mʷiɐŋ˥˨',
  ipK: 'xʷiɐŋ˥˨',
  dpK: 'kʷiɐŋ˥˨',
  kpK: 'ɦʷiɐŋ˥˨',
  ApC: 'pʷiɐŋ˥˨',
  QpC: 'siɐŋ˥˨',
  dpC: 'kiɐŋ˥˨',
  epC: 'kʰiɐŋ˥˨',
  OpC: 'tsʰiɐŋ˥˨',
  fpK: 'gʷiɐŋ˥˨',
  CpC: 'bʷiɐŋ˥˨',
  GqC: 'dɑŋ˥˨',
  IqC: 'lɑŋ˥˨',
  jqC: 'ɣɑŋ˥˨',
  hqC: 'ʔɑŋ˥˨',
  gqC: 'ŋɑŋ˥˨',
  NqC: 'tsɑŋ˥˨',
  CqC: 'bɑŋ˥˨',
  PqC: 'dzɑŋ˥˨',
  EqC: 'tɑŋ˥˨',
  eqC: 'kʰɑŋ˥˨',
  AqC: 'pɑŋ˥˨',
  FqC: 'tʰɑŋ˥˨',
  eqK: 'kʰʷɑŋ˥˨',
  HqC: 'nɑŋ˥˨',
  QqC: 'sɑŋ˥˨',
  jqK: 'ɣʷɑŋ˥˨',
  dqK: 'kʷɑŋ˥˨',
  dqC: 'kɑŋ˥˨',
  iqK: 'xʷɑŋ˥˨',
  DqC: 'mɑŋ˥˨',
  hqK: 'ʔʷɑŋ˥˨',
  hsC: 'ʔɯiaŋ˥˨',
  dsC: 'kɯiaŋ˥˨',
  fsC: 'gɯiaŋ˥˨',
  esC: 'kʰɯiaŋ˥˨',
  drC: 'kɯaŋ˥˨',
  DsC: 'mɯiaŋ˥˨',
  CsC: 'bɯiaŋ˥˨',
  DrC: 'mɯaŋ˥˨',
  jrK: 'ɣʷɯaŋ˥˨',
  AsC: 'pɯiaŋ˥˨',
  ksK: 'ɦʷɯiaŋ˥˨',
  jrC: 'ɣɯaŋ˥˨',
  hrC: 'ʔɯaŋ˥˨',
  TrC: 'tʂʰɯaŋ˥˨',
  JrC: 'ʈɯaŋ˥˨',
  KrC: 'ʈʰɯaŋ˥˨',
  ArC: 'pɯaŋ˥˨',
  LrC: 'ɖɯaŋ˥˨',
  VrC: 'ʂɯaŋ˥˨',
  gsC: 'ŋɯiaŋ˥˨',
  CrC: 'bɯaŋ˥˨',
  irC: 'xɯaŋ˥˨',
  hrK: 'ʔʷɯaŋ˥˨',
  StC: 'tʂɯæŋ˥˨',
  AtC: 'pɯæŋ˥˨',
  CtC: 'bɯæŋ˥˨',
  htC: 'ʔɯæŋ˥˨',
  gtC: 'ŋɯæŋ˥˨',
  itK: 'xʷɯæŋ˥˨',
  duC: 'kiɛŋ˥˨',
  OuC: 'tsʰiɛŋ˥˨',
  XuC: 'tɕiɛŋ˥˨',
  auC: 'ɕiɛŋ˥˨',
  LuC: 'ɖiɛŋ˥˨',
  KuC: 'ʈʰiɛŋ˥˨',
  QuC: 'siɛŋ˥˨',
  IuC: 'liɛŋ˥˨',
  BuC: 'pʰiɛŋ˥˨',
  iuK: 'xʷiɛŋ˥˨',
  AuC: 'piɛŋ˥˨',
  CuC: 'biɛŋ˥˨',
  PuC: 'dziɛŋ˥˨',
  ZuC: 'dʑiɛŋ˥˨',
  DuC: 'miɛŋ˥˨',
  euC: 'kʰiɛŋ˥˨',
  iuC: 'xiɛŋ˥˨',
  NuC: 'tsiɛŋ˥˨',
  dvC: 'keŋ˥˨',
  HvC: 'neŋ˥˨',
  QvC: 'seŋ˥˨',
  jvC: 'ɣeŋ˥˨',
  GvC: 'deŋ˥˨',
  EvC: 'teŋ˥˨',
  evC: 'kʰeŋ˥˨',
  FvC: 'tʰeŋ˥˨',
  OvC: 'tsʰeŋ˥˨',
  DvC: 'meŋ˥˨',
  hvK: 'ʔʷeŋ˥˨',
  IvC: 'leŋ˥˨',
  XwC: 'tɕɨŋ˥˨',
  lwC: 'jɨŋ˥˨',
  bwC: 'ʑɨŋ˥˨',
  cwC: 'ȵɨŋ˥˨',
  hwC: 'ʔɨŋ˥˨',
  NwC: 'tsɨŋ˥˨',
  iwC: 'xɨŋ˥˨',
  awC: 'ɕɨŋ˥˨',
  LwC: 'ɖɨŋ˥˨',
  IwC: 'lɨŋ˥˨',
  CwC: 'bɨŋ˥˨',
  YwC: 'tɕʰɨŋ˥˨',
  gwC: 'ŋɨŋ˥˨',
  ZwC: 'dʑɨŋ˥˨',
  KwC: 'ʈʰɨŋ˥˨',
  fwC: 'gɨŋ˥˨',
  ExC: 'təŋ˥˨',
  PxC: 'dzəŋ˥˨',
  dxC: 'kəŋ˥˨',
  OxC: 'tsʰəŋ˥˨',
  GxC: 'dəŋ˥˨',
  DxC: 'məŋ˥˨',
  AxC: 'pəŋ˥˨',
  CxC: 'bəŋ˥˨',
  IxC: 'ləŋ˥˨',
  NxC: 'tsəŋ˥˨',
  QxC: 'səŋ˥˨',
  FxC: 'tʰəŋ˥˨',
  kyC: 'ɦiu˥˨',
  dyC: 'kiu˥˨',
  LyC: 'ɖiu˥˨',
  JyC: 'ʈiu˥˨',
  ayC: 'ɕiu˥˨',
  YyC: 'tɕʰiu˥˨',
  RyC: 'ziu˥˨',
  iyC: 'xiu˥˨',
  XyC: 'tɕiu˥˨',
  fyC: 'giu˥˨',
  VyC: 'ʂiu˥˨',
  SyC: 'tʂiu˥˨',
  ByC: 'pʰiu˥˨',
  TyC: 'tʂʰiu˥˨',
  AyC: 'piu˥˨',
  KyC: 'ʈʰiu˥˨',
  IyC: 'liu˥˨',
  QyC: 'siu˥˨',
  NyC: 'tsiu˥˨',
  UyC: 'dʐiu˥˨',
  PyC: 'dziu˥˨',
  MyC: 'ɳiu˥˨',
  CyC: 'biu˥˨',
  lyC: 'jiu˥˨',
  ZyC: 'dʑiu˥˨',
  cyC: 'ȵiu˥˨',
  DyC: 'miu˥˨',
  gyC: 'ŋiu˥˨',
  eyC: 'kʰiu˥˨',
  OyC: 'tsʰiu˥˨',
  jzC: 'ɣəu˥˨',
  ezC: 'kʰəu˥˨',
  DzC: 'məu˥˨',
  BzC: 'pʰəu˥˨',
  GzC: 'dəu˥˨',
  EzC: 'təu˥˨',
  HzC: 'nəu˥˨',
  QzC: 'səu˥˨',
  NzC: 'tsəu˥˨',
  FzC: 'tʰəu˥˨',
  hzC: 'ʔəu˥˨',
  dzC: 'kəu˥˨',
  OzC: 'tsʰəu˥˨',
  IzC: 'ləu˥˨',
  izC: 'xəu˥˨',
  CzC: 'bəu˥˨',
  gzC: 'ŋəu˥˨',
  PzC: 'dzəu˥˨',
  h0C: 'ʔɨu˥˨',
  D0C: 'mɨu˥˨',
  e0C: 'kʰɨu˥˨',
  f0C: 'gɨu˥˨',
  O1C: 'tsʰim˥˨',
  N1C: 'tsim˥˨',
  c1C: 'ȵim˥˨',
  L1C: 'ɖim˥˨',
  X1C: 'tɕim˥˨',
  f1G: 'gɯim˥˨',
  d1G: 'kɯim˥˨',
  M1C: 'ɳim˥˨',
  h1G: 'ʔɯim˥˨',
  V1C: 'ʂim˥˨',
  K1C: 'ʈʰim˥˨',
  S1C: 'tʂim˥˨',
  T1C: 'tʂʰim˥˨',
  g1G: 'ŋɯim˥˨',
  J1C: 'ʈim˥˨',
  I1C: 'lim˥˨',
  Z1C: 'dʑim˥˨',
  k1C: 'ɦim˥˨',
  a1C: 'ɕim˥˨',
  e2C: 'kʰəm˥˨',
  d2C: 'kəm˥˨',
  j2C: 'ɣəm˥˨',
  h2C: 'ʔəm˥˨',
  F2C: 'tʰəm˥˨',
  Q2C: 'səm˥˨',
  O2C: 'tsʰəm˥˨',
  G2C: 'dəm˥˨',
  g2C: 'ŋəm˥˨',
  E2C: 'təm˥˨',
  H2C: 'nəm˥˨',
  I2C: 'ləm˥˨',
  i2C: 'xəm˥˨',
  N2C: 'tsəm˥˨',
  e3C: 'kʰɑm˥˨',
  I3C: 'lɑm˥˨',
  F3C: 'tʰɑm˥˨',
  d3C: 'kɑm˥˨',
  i3C: 'xɑm˥˨',
  j3C: 'ɣɑm˥˨',
  G3C: 'dɑm˥˨',
  P3C: 'dzɑm˥˨',
  E3C: 'tɑm˥˨',
  Q3C: 'sɑm˥˨',
  l4C: 'jiɛm˥˨',
  Z4C: 'dʑiɛm˥˨',
  c4C: 'ȵiɛm˥˨',
  h4C: 'ʔiɛm˥˨',
  A4G: 'pɯiɛm˥˨',
  g4G: 'ŋɯiɛm˥˨',
  a4C: 'ɕiɛm˥˨',
  N4C: 'tsiɛm˥˨',
  O4C: 'tsʰiɛm˥˨',
  I4C: 'liɛm˥˨',
  K4C: 'ʈʰiɛm˥˨',
  Y4C: 'tɕʰiɛm˥˨',
  h4G: 'ʔɯiɛm˥˨',
  P4C: 'dziɛm˥˨',
  X4C: 'tɕiɛm˥˨',
  F5C: 'tʰem˥˨',
  H5C: 'nem˥˨',
  E5C: 'tem˥˨',
  Q5C: 'sem˥˨',
  G5C: 'dem˥˨',
  d5C: 'kem˥˨',
  h5C: 'ʔem˥˨',
  N5C: 'tsem˥˨',
  P5C: 'dzem˥˨',
  e5C: 'kʰem˥˨',
  I5C: 'lem˥˨',
  g8C: 'ŋiɐm˥˨',
  i8C: 'xiɐm˥˨',
  e8C: 'kʰiɐm˥˨',
  D9C: 'miɐm˥˨',
  j6C: 'ɣɯæm˥˨',
  h6C: 'ʔɯæm˥˨',
  S6C: 'tʂɯæm˥˨',
  J6C: 'ʈɯæm˥˨',
  e6C: 'kʰɯæm˥˨',
  L6C: 'ɖɯæm˥˨',
  U6C: 'dʐɯæm˥˨',
  d6C: 'kɯæm˥˨',
  M6C: 'ɳɯæm˥˨',
  g6C: 'ŋɯæm˥˨',
  d7C: 'kɯam˥˨',
  T7C: 'tʂʰɯam˥˨',
  S7C: 'tʂɯam˥˨',
  V7C: 'ʂɯam˥˨',
  i7C: 'xɯam˥˨',
  C7C: 'bɯam˥˨',
  j7C: 'ɣɯam˥˨',
  U7C: 'dʐɯam˥˨',
  h7C: 'ʔɯam˥˨',
  C9C: 'biɐm˥˨',
  B9C: 'pʰiɐm˥˨',
  d8C: 'kiɐm˥˨',
  h8C: 'ʔiɐm˥˨',
  hAD: 'ʔuk꜊',
  GAD: 'duk꜊',
  dAD: 'kuk꜊',
  jAD: 'ɣuk꜊',
  eAD: 'kʰuk꜊',
  FAD: 'tʰuk꜊',
  EAD: 'tuk꜊',
  QAD: 'suk꜊',
  IAD: 'luk꜊',
  iAD: 'xuk꜊',
  PAD: 'dzuk꜊',
  OAD: 'tsʰuk꜊',
  NAD: 'tsuk꜊',
  CAD: 'buk꜊',
  BAD: 'pʰuk꜊',
  AAD: 'puk꜊',
  DAD: 'muk꜊',
  ABD: 'piuk꜊',
  CBD: 'biuk꜊',
  VBD: 'ʂiuk꜊',
  IBD: 'liuk꜊',
  LBD: 'ɖiuk꜊',
  dBD: 'kiuk꜊',
  eBD: 'kʰiuk꜊',
  ZBD: 'dʑiuk꜊',
  YBD: 'tɕʰiuk꜊',
  lBD: 'jiuk꜊',
  fBD: 'giuk꜊',
  OBD: 'tsʰiuk꜊',
  cBD: 'ȵiuk꜊',
  XBD: 'tɕiuk꜊',
  aBD: 'ɕiuk꜊',
  iBD: 'xiuk꜊',
  JBD: 'ʈiuk꜊',
  NBD: 'tsiuk꜊',
  TBD: 'tʂʰiuk꜊',
  MBD: 'ɳiuk꜊',
  SBD: 'tʂiuk꜊',
  BBD: 'pʰiuk꜊',
  hBD: 'ʔiuk꜊',
  QBD: 'siuk꜊',
  DBD: 'miuk꜊',
  kBD: 'ɦiuk꜊',
  KBD: 'ʈʰiuk꜊',
  gBD: 'ŋiuk꜊',
  PBD: 'dziuk꜊',
  hCD: 'ʔuok꜊',
  GCD: 'duok꜊',
  ECD: 'tuok꜊',
  eCD: 'kʰuok꜊',
  jCD: 'ɣuok꜊',
  CCD: 'buok꜊',
  QCD: 'suok꜊',
  dCD: 'kuok꜊',
  DCD: 'muok꜊',
  iCD: 'xuok꜊',
  HCD: 'nuok꜊',
  NCD: 'tsuok꜊',
  ACD: 'puok꜊',
  ICD: 'luok꜊',
  gCD: 'ŋuok꜊',
  XDD: 'tɕiok꜊',
  gDD: 'ŋiok꜊',
  iDD: 'xiok꜊',
  dDD: 'kiok꜊',
  fDD: 'giok꜊',
  ZDD: 'dʑiok꜊',
  YDD: 'tɕʰiok꜊',
  cDD: 'ȵiok꜊',
  aDD: 'ɕiok꜊',
  lDD: 'jiok꜊',
  LDD: 'ɖiok꜊',
  IDD: 'liok꜊',
  eDD: 'kʰiok꜊',
  JDD: 'ʈiok꜊',
  NDD: 'tsiok꜊',
  bDD: 'ʑiok꜊',
  CDD: 'biok꜊',
  ODD: 'tsʰiok꜊',
  RDD: 'ziok꜊',
  QDD: 'siok꜊',
  ADD: 'piok꜊',
  KDD: 'ʈʰiok꜊',
  dED: 'kɯɔk꜊',
  gED: 'ŋɯɔk꜊',
  UED: 'dʐɯɔk꜊',
  SED: 'tʂɯɔk꜊',
  VED: 'ʂɯɔk꜊',
  JED: 'ʈɯɔk꜊',
  AED: 'pɯɔk꜊',
  DED: 'mɯɔk꜊',
  CED: 'bɯɔk꜊',
  BED: 'pʰɯɔk꜊',
  eED: 'kʰɯɔk꜊',
  LED: 'ɖɯɔk꜊',
  hED: 'ʔɯɔk꜊',
  MED: 'ɳɯɔk꜊',
  KED: 'ʈʰɯɔk꜊',
  IED: 'lɯɔk꜊',
  jED: 'ɣɯɔk꜊',
  iED: 'xɯɔk꜊',
  TED: 'tʂʰɯɔk꜊',
  XVD: 'tɕit꜊',
  cVD: 'ȵit꜊',
  bVD: 'ʑit꜊',
  LVD: 'ɖit꜊',
  QVD: 'sit꜊',
  hVD: 'ʔit꜊',
  OVD: 'tsʰit꜊',
  BVD: 'pʰit꜊',
  dVD: 'kit꜊',
  MVD: 'ɳit꜊',
  lVD: 'jit꜊',
  eVD: 'kʰit꜊',
  iVD: 'xit꜊',
  KVD: 'ʈʰit꜊',
  IVD: 'lit꜊',
  JVD: 'ʈit꜊',
  PVD: 'dzit꜊',
  TWD: 'tʂʰɪt꜊',
  aVD: 'ɕit꜊',
  NVD: 'tsit꜊',
  DVD: 'mit꜊',
  AVD: 'pit꜊',
  fVH: 'gɯit꜊',
  CVD: 'bit꜊',
  kVL: 'ɦʷit꜊',
  VVL: 'ʂʷit꜊',
  YVD: 'tɕʰit꜊',
  UWD: 'dʐɪt꜊',
  DVH: 'mɯit꜊',
  CVH: 'bɯit꜊',
  hVH: 'ʔɯit꜊',
  gVH: 'ŋɯit꜊',
  AVH: 'pɯit꜊',
  JVL: 'ʈʷit꜊',
  iVH: 'xɯit꜊',
  dVH: 'kɯit꜊',
  iVL: 'xʷit꜊',
  bVL: 'ʑʷit꜊',
  dVL: 'kʷit꜊',
  PVL: 'dzʷit꜊',
  lVL: 'jʷit꜊',
  NVL: 'tsʷit꜊',
  QVL: 'sʷit꜊',
  IVL: 'lʷit꜊',
  KVL: 'ʈʰʷit꜊',
  LVL: 'ɖʷit꜊',
  YVL: 'tɕʰʷit꜊',
  OVL: 'tsʰʷit꜊',
  SVL: 'tʂʷit꜊',
  iVP: 'xʷɯit꜊',
  SWD: 'tʂɪt꜊',
  VWD: 'ʂɪt꜊',
  DXD: 'miut꜊',
  AXD: 'piut꜊',
  hXL: 'ʔiut꜊',
  dXL: 'kiut꜊',
  eXL: 'kʰiut꜊',
  fXL: 'giut꜊',
  CXD: 'biut꜊',
  iXL: 'xiut꜊',
  kXL: 'ɦiut꜊',
  BXD: 'pʰiut꜊',
  gXL: 'ŋiut꜊',
  iYD: 'xɨt꜊',
  dYD: 'kɨt꜊',
  gYD: 'ŋɨt꜊',
  fYD: 'gɨt꜊',
  eYD: 'kʰɨt꜊',
  gZL: 'ŋʷiɐt꜊',
  CZD: 'bʷiɐt꜊',
  kZL: 'ɦʷiɐt꜊',
  dZL: 'kʷiɐt꜊',
  hZL: 'ʔʷiɐt꜊',
  fZL: 'gʷiɐt꜊',
  eZL: 'kʰʷiɐt꜊',
  AZD: 'pʷiɐt꜊',
  DZD: 'mʷiɐt꜊',
  iZL: 'xʷiɐt꜊',
  hZD: 'ʔiɐt꜊',
  iZD: 'xiɐt꜊',
  dZD: 'kiɐt꜊',
  fZD: 'giɐt꜊',
  BZD: 'pʰʷiɐt꜊',
  gZD: 'ŋiɐt꜊',
  DaD: 'muot꜊',
  FaL: 'tʰuot꜊',
  daL: 'kuot꜊',
  CaD: 'buot꜊',
  EaL: 'tuot꜊',
  GaL: 'duot꜊',
  haL: 'ʔuot꜊',
  iaL: 'xuot꜊',
  gaL: 'ŋuot꜊',
  BaD: 'pʰuot꜊',
  IaL: 'luot꜊',
  eaL: 'kʰuot꜊',
  HaL: 'nuot꜊',
  QaL: 'suot꜊',
  OaL: 'tsʰuot꜊',
  PaL: 'dzuot꜊',
  jbD: 'ɣət꜊',
  jaL: 'ɣuot꜊',
  NaL: 'tsuot꜊',
  jcD: 'ɣɑt꜊',
  icD: 'xɑt꜊',
  EcD: 'tɑt꜊',
  FcD: 'tʰɑt꜊',
  hcD: 'ʔɑt꜊',
  IcD: 'lɑt꜊',
  ecD: 'kʰɑt꜊',
  GcD: 'dɑt꜊',
  PcD: 'dzɑt꜊',
  gcD: 'ŋɑt꜊',
  dcD: 'kɑt꜊',
  QcD: 'sɑt꜊',
  OcD: 'tsʰɑt꜊',
  HcD: 'nɑt꜊',
  DcD: 'mʷɑt꜊',
  gcL: 'ŋʷɑt꜊',
  PcL: 'dzʷɑt꜊',
  AcD: 'pʷɑt꜊',
  NcD: 'tsɑt꜊',
  dcL: 'kʷɑt꜊',
  ecL: 'kʰʷɑt꜊',
  jcL: 'ɣʷɑt꜊',
  GcL: 'dʷɑt꜊',
  icL: 'xʷɑt꜊',
  hcL: 'ʔʷɑt꜊',
  NcL: 'tsʷɑt꜊',
  BcD: 'pʰʷɑt꜊',
  FcL: 'tʰʷɑt꜊',
  IcL: 'lʷɑt꜊',
  EcL: 'tʷɑt꜊',
  OcL: 'tsʰʷɑt꜊',
  CcD: 'bʷɑt꜊',
  jeD: 'ɣɯæt꜊',
  SeD: 'tʂɯæt꜊',
  CeD: 'bɯæt꜊',
  eeD: 'kʰɯæt꜊',
  jeL: 'ɣʷɯæt꜊',
  AeD: 'pɯæt꜊',
  JeL: 'ʈʷɯæt꜊',
  heL: 'ʔʷɯæt꜊',
  MeL: 'ɳʷɯæt꜊',
  TeD: 'tʂʰɯæt꜊',
  deL: 'kʷɯæt꜊',
  deD: 'kɯæt꜊',
  heD: 'ʔɯæt꜊',
  VeD: 'ʂɯæt꜊',
  DeD: 'mɯæt꜊',
  ieL: 'xʷɯæt꜊',
  MeD: 'ɳɯæt꜊',
  geL: 'ŋʷɯæt꜊',
  eeL: 'kʰʷɯæt꜊',
  BeD: 'pʰɯæt꜊',
  SeL: 'tʂʷɯæt꜊',
  jdD: 'ɣɯat꜊',
  hdD: 'ʔɯat꜊',
  gdD: 'ŋɯat꜊',
  TdD: 'tʂʰɯat꜊',
  edD: 'kʰɯat꜊',
  idD: 'xɯat꜊',
  KdD: 'ʈʰɯat꜊',
  ddL: 'kʷɯat꜊',
  jdL: 'ɣʷɯat꜊',
  KdL: 'ʈʰʷɯat꜊',
  JdL: 'ʈʷɯat꜊',
  VdL: 'ʂʷɯat꜊',
  gdL: 'ŋʷɯat꜊',
  TdL: 'tʂʰʷɯat꜊',
  DdD: 'mɯat꜊',
  MdL: 'ɳʷɯat꜊',
  AdD: 'pɯat꜊',
  ddD: 'kɯat꜊',
  UdD: 'dʐɯat꜊',
  JdD: 'ʈɯat꜊',
  cdD: 'ȵɯat꜊',
  QgD: 'set꜊',
  OgD: 'tsʰet꜊',
  dgD: 'ket꜊',
  NgD: 'tset꜊',
  igL: 'xʷet꜊',
  egL: 'kʰʷet꜊',
  dgL: 'kʷet꜊',
  jgL: 'ɣʷet꜊',
  hgL: 'ʔʷet꜊',
  GgD: 'det꜊',
  FgD: 'tʰet꜊',
  jgD: 'ɣet꜊',
  HgD: 'net꜊',
  PgD: 'dzet꜊',
  ggD: 'ŋet꜊',
  DgD: 'met꜊',
  AgD: 'pet꜊',
  hgD: 'ʔet꜊',
  egD: 'kʰet꜊',
  igD: 'xet꜊',
  BgD: 'pʰet꜊',
  CgD: 'bet꜊',
  EgD: 'tet꜊',
  IgD: 'let꜊',
  QfD: 'siɛt꜊',
  IfD: 'liɛt꜊',
  JfD: 'ʈiɛt꜊',
  ffH: 'gɯiɛt꜊',
  cfD: 'ȵiɛt꜊',
  XfD: 'tɕiɛt꜊',
  bfD: 'ʑiɛt꜊',
  ZfD: 'dʑiɛt꜊',
  gfH: 'ŋɯiɛt꜊',
  DfD: 'miɛt꜊',
  efH: 'kʰɯiɛt꜊',
  AfD: 'piɛt꜊',
  PfL: 'dzʷiet꜊',
  NfL: 'tsʷiet꜊',
  QfL: 'sʷiet꜊',
  KfL: 'ʈʰʷiet꜊',
  lfL: 'jʷiet꜊',
  efL: 'kʰʷiɛt꜊',
  hfP: 'ʔʷɯiet꜊',
  cfL: 'ȵʷiet꜊',
  afL: 'ɕʷiet꜊',
  XfL: 'tɕʷiet꜊',
  YfL: 'tɕʰʷiet꜊',
  JfL: 'ʈʷiet꜊',
  IfL: 'lʷiet꜊',
  BfD: 'pʰiɛt꜊',
  CfH: 'bɯiɛt꜊',
  LfD: 'ɖiɛt꜊',
  AfH: 'pɯiɛt꜊',
  VfL: 'ʂʷiet꜊',
  dfH: 'kɯiɛt꜊',
  afD: 'ɕiɛt꜊',
  MfL: 'ɳʷiet꜊',
  ifP: 'xʷɯiet꜊',
  hfL: 'ʔʷiɛt꜊',
  dfP: 'kʷɯiet꜊',
  SfL: 'tʂʷiet꜊',
  OfL: 'tsʰʷiet꜊',
  NfD: 'tsiɛt꜊',
  VfD: 'ʂiɛt꜊',
  hfH: 'ʔɯiɛt꜊',
  KfD: 'ʈʰiɛt꜊',
  ifH: 'xɯiɛt꜊',
  TfD: 'tʂʰiɛt꜊',
  RfL: 'zʷiet꜊',
  YfD: 'tɕʰiɛt꜊',
  lfD: 'jiɛt꜊',
  UfD: 'dʐiɛt꜊',
  lpD: 'jiɐk꜊',
  IpD: 'liɐk꜊',
  dpD: 'kiɐk꜊',
  XpD: 'tɕiɐk꜊',
  apD: 'ɕiɐk꜊',
  cpD: 'ȵiɐk꜊',
  YpD: 'tɕʰiɐk꜊',
  hpD: 'ʔiɐk꜊',
  epD: 'kʰiɐk꜊',
  gpD: 'ŋiɐk꜊',
  ZpD: 'dʑiɐk꜊',
  KpD: 'ʈʰiɐk꜊',
  QpD: 'siɐk꜊',
  SpD: 'tʂiɐk꜊',
  NpD: 'tsiɐk꜊',
  PpD: 'dziɐk꜊',
  OpD: 'tsʰiɐk꜊',
  fpD: 'giɐk꜊',
  hpL: 'ʔʷiɐk꜊',
  CpD: 'bʷiɐk꜊',
  ipL: 'xʷiɐk꜊',
  kpL: 'ɦʷiɐk꜊',
  dpL: 'kʷiɐk꜊',
  JpD: 'ʈiɐk꜊',
  LpD: 'ɖiɐk꜊',
  epL: 'kʰʷiɐk꜊',
  fpL: 'gʷiɐk꜊',
  MpD: 'ɳiɐk꜊',
  BpD: 'pʰʷiɐk꜊',
  ipD: 'xiɐk꜊',
  GqD: 'dɑk꜊',
  DqD: 'mɑk꜊',
  IqD: 'lɑk꜊',
  FqD: 'tʰɑk꜊',
  NqD: 'tsɑk꜊',
  OqD: 'tsʰɑk꜊',
  dqD: 'kɑk꜊',
  eqD: 'kʰɑk꜊',
  gqD: 'ŋɑk꜊',
  BqD: 'pʰɑk꜊',
  hqD: 'ʔɑk꜊',
  CqD: 'bɑk꜊',
  iqD: 'xɑk꜊',
  QqD: 'sɑk꜊',
  jqD: 'ɣɑk꜊',
  PqD: 'dzɑk꜊',
  AqD: 'pɑk꜊',
  HqD: 'nɑk꜊',
  iqL: 'xʷɑk꜊',
  dqL: 'kʷɑk꜊',
  hqL: 'ʔʷɑk꜊',
  jqL: 'ɣʷɑk꜊',
  eqL: 'kʰʷɑk꜊',
  gqL: 'ŋʷɑk꜊',
  IqL: 'lʷɑk꜊',
  NqL: 'tsʷɑk꜊',
  DrD: 'mɯak꜊',
  JrD: 'ʈɯak꜊',
  CrD: 'bɯak꜊',
  ArD: 'pɯak꜊',
  fsD: 'gɯiak꜊',
  dsD: 'kɯiak꜊',
  VsD: 'ʂɯiak꜊',
  TsD: 'tʂʰɯiak꜊',
  jrL: 'ɣʷɯak꜊',
  SrD: 'tʂɯak꜊',
  UrD: 'dʐɯak꜊',
  esD: 'kʰɯiak꜊',
  grD: 'ŋɯak꜊',
  gsD: 'ŋɯiak꜊',
  erD: 'kʰɯak꜊',
  hrD: 'ʔɯak꜊',
  isD: 'xɯiak꜊',
  KrD: 'ʈʰɯak꜊',
  hrL: 'ʔʷɯak꜊',
  BrD: 'pʰɯak꜊',
  irD: 'xɯak꜊',
  jrD: 'ɣɯak꜊',
  drD: 'kɯak꜊',
  irL: 'xʷɯak꜊',
  LrD: 'ɖɯak꜊',
  drL: 'kʷɯak꜊',
  hsL: 'ʔʷɯiak꜊',
  MrD: 'ɳɯak꜊',
  erL: 'kʰʷɯak꜊',
  CsD: 'bɯiak꜊',
  DtD: 'mɯæk꜊',
  jtL: 'ɣʷɯæk꜊',
  dtL: 'kʷɯæk꜊',
  AtD: 'pɯæk꜊',
  CtD: 'bɯæk꜊',
  UtD: 'dʐɯæk꜊',
  StD: 'tʂɯæk꜊',
  UtL: 'dʐʷɯæk꜊',
  TtD: 'tʂʰɯæk꜊',
  etD: 'kʰɯæk꜊',
  itL: 'xʷɯæk꜊',
  jtD: 'ɣɯæk꜊',
  dtD: 'kɯæk꜊',
  JtD: 'ʈɯæk꜊',
  htD: 'ʔɯæk꜊',
  VtD: 'ʂɯæk꜊',
  BtD: 'pʰɯæk꜊',
  gtD: 'ŋɯæk꜊',
  ItD: 'lɯæk꜊',
  StL: 'tʂʷɯæk꜊',
  VtL: 'ʂʷɯæk꜊',
  ftL: 'gʷɯæk꜊',
  MtD: 'ɳɯæk꜊',
  QuD: 'siɛk꜊',
  NuD: 'tsiɛk꜊',
  huD: 'ʔiɛk꜊',
  luD: 'jiɛk꜊',
  auD: 'ɕiɛk꜊',
  YuD: 'tɕʰiɛk꜊',
  ZuD: 'dʑiɛk꜊',
  XuD: 'tɕiɛk꜊',
  LuD: 'ɖiɛk꜊',
  OuD: 'tsʰiɛk꜊',
  RuD: 'ziɛk꜊',
  PuD: 'dziɛk꜊',
  CuD: 'biɛk꜊',
  luL: 'jʷiɛk꜊',
  iuL: 'xʷiɛk꜊',
  AuD: 'piɛk꜊',
  BuD: 'pʰiɛk꜊',
  buD: 'ʑiɛk꜊',
  AsD: 'pɯiak꜊',
  JuD: 'ʈiɛk꜊',
  KuD: 'ʈʰiɛk꜊',
  XuL: 'tɕʷiɛk꜊',
  OuL: 'tsʰʷiɛk꜊',
  QvD: 'sek꜊',
  dvD: 'kek꜊',
  BvD: 'pʰek꜊',
  IvD: 'lek꜊',
  EvD: 'tek꜊',
  jvD: 'ɣek꜊',
  gvD: 'ŋek꜊',
  GvD: 'dek꜊',
  FvD: 'tʰek꜊',
  NvD: 'tsek꜊',
  evD: 'kʰek꜊',
  HvD: 'nek꜊',
  PvD: 'dzek꜊',
  DvD: 'mek꜊',
  CvD: 'bek꜊',
  AvD: 'pek꜊',
  evL: 'kʰʷek꜊',
  dvL: 'kʷek꜊',
  OvD: 'tsʰek꜊',
  ivD: 'xek꜊',
  ivL: 'xʷek꜊',
  KvD: 'ʈʰek꜊',
  XwD: 'tɕɨk꜊',
  LwD: 'ɖɨk꜊',
  IwD: 'lɨk꜊',
  KwD: 'ʈʰɨk꜊',
  JwD: 'ʈɨk꜊',
  bwD: 'ʑɨk꜊',
  QwD: 'sɨk꜊',
  ZwD: 'dʑɨk꜊',
  awD: 'ɕɨk꜊',
  iwD: 'xɨk꜊',
  UwD: 'dʐɨk꜊',
  fwD: 'gɨk꜊',
  MwD: 'ɳɨk꜊',
  TwD: 'tʂʰɨk꜊',
  hwD: 'ʔɨk꜊',
  VwD: 'ʂɨk꜊',
  ewD: 'kʰɨk꜊',
  dwD: 'kɨk꜊',
  lwD: 'jɨk꜊',
  NwD: 'tsɨk꜊',
  AwD: 'pɨk꜊',
  kwL: 'ɦʷɨk꜊',
  iwL: 'xʷɨk꜊',
  BwD: 'pʰɨk꜊',
  SwD: 'tʂɨk꜊',
  CwD: 'bɨk꜊',
  gwD: 'ŋɨk꜊',
  PwD: 'dzɨk꜊',
  DwD: 'mɨk꜊',
  YwD: 'tɕʰɨk꜊',
  ExD: 'tək꜊',
  NxD: 'tsək꜊',
  IxD: 'lək꜊',
  FxD: 'tʰək꜊',
  exD: 'kʰək꜊',
  GxD: 'dək꜊',
  ixD: 'xək꜊',
  DxD: 'mək꜊',
  PxD: 'dzək꜊',
  QxD: 'sək꜊',
  AxD: 'pək꜊',
  CxD: 'bək꜊',
  jxL: 'ɣʷək꜊',
  dxL: 'kʷək꜊',
  hxD: 'ʔək꜊',
  jxD: 'ɣək꜊',
  HxD: 'nək꜊',
  dxD: 'kək꜊',
  OxD: 'tsʰək꜊',
  BxD: 'pʰək꜊',
  ixL: 'xʷək꜊',
  O1D: 'tsʰip꜊',
  Z1D: 'dʑip꜊',
  X1D: 'tɕip꜊',
  R1D: 'zip꜊',
  P1D: 'dzip꜊',
  c1D: 'ȵip꜊',
  h1D: 'ʔip꜊',
  a1D: 'ɕip꜊',
  N1D: 'tsip꜊',
  f1H: 'gɯip꜊',
  L1D: 'ɖip꜊',
  J1D: 'ʈip꜊',
  I1D: 'lip꜊',
  d1H: 'kɯip꜊',
  g1H: 'ŋɯip꜊',
  e1H: 'kʰɯip꜊',
  Q1D: 'sip꜊',
  V1D: 'ʂip꜊',
  i1H: 'xɯip꜊',
  S1D: 'tʂip꜊',
  h1H: 'ʔɯip꜊',
  K1D: 'ʈʰip꜊',
  k1D: 'ɦip꜊',
  l1D: 'jip꜊',
  M1D: 'ɳip꜊',
  U1D: 'dʐip꜊',
  C1H: 'bɯip꜊',
  A1H: 'pɯip꜊',
  T1D: 'tʂʰip꜊',
  Y1D: 'tɕʰip꜊',
  j2D: 'ɣəp꜊',
  d2D: 'kəp꜊',
  E2D: 'təp꜊',
  Q2D: 'səp꜊',
  G2D: 'dəp꜊',
  F2D: 'tʰəp꜊',
  P2D: 'dzəp꜊',
  N2D: 'tsəp꜊',
  I2D: 'ləp꜊',
  H2D: 'nəp꜊',
  e2D: 'kʰəp꜊',
  h2D: 'ʔəp꜊',
  i2D: 'xəp꜊',
  g2D: 'ŋəp꜊',
  O2D: 'tsʰəp꜊',
  Z2D: 'dʑəp꜊',
  j3D: 'ɣɑp꜊',
  I3D: 'lɑp꜊',
  E3D: 'tɑp꜊',
  F3D: 'tʰɑp꜊',
  i3D: 'xɑp꜊',
  H3D: 'nɑp꜊',
  G3D: 'dɑp꜊',
  Q3D: 'sɑp꜊',
  g3D: 'ŋɑp꜊',
  P3D: 'dzɑp꜊',
  d3D: 'kɑp꜊',
  e3D: 'kʰɑp꜊',
  h3D: 'ʔɑp꜊',
  O3D: 'tsʰɑp꜊',
  X3D: 'tɕɑp꜊',
  l4D: 'jiɛp꜊',
  N4D: 'tsiɛp꜊',
  a4D: 'ɕiɛp꜊',
  Z4D: 'dʑiɛp꜊',
  I4D: 'liɛp꜊',
  P4D: 'dziɛp꜊',
  L4D: 'ɖiɛp꜊',
  h4H: 'ʔɯiɛp꜊',
  M4D: 'ɳiɛp꜊',
  Y4D: 'tɕʰiɛp꜊',
  c4D: 'ȵiɛp꜊',
  X4D: 'tɕiɛp꜊',
  O4D: 'tsʰiɛp꜊',
  K4D: 'ʈʰiɛp꜊',
  f4H: 'gɯiɛp꜊',
  J4D: 'ʈiɛp꜊',
  k4D: 'ɦiɛp꜊',
  e4D: 'kʰiɛp꜊',
  V4D: 'ʂiɛp꜊',
  d4H: 'kɯiɛp꜊',
  h4D: 'ʔiɛp꜊',
  F5D: 'tʰep꜊',
  j5D: 'ɣep꜊',
  d5D: 'kep꜊',
  e5D: 'kʰep꜊',
  G5D: 'dep꜊',
  H5D: 'nep꜊',
  Q5D: 'sep꜊',
  I5D: 'lep꜊',
  E5D: 'tep꜊',
  P5D: 'dzep꜊',
  N5D: 'tsep꜊',
  i5D: 'xep꜊',
  j6D: 'ɣɯæp꜊',
  e6D: 'kʰɯæp꜊',
  U6D: 'dʐɯæp꜊',
  d6D: 'kɯæp꜊',
  S6D: 'tʂɯæp꜊',
  T6D: 'tʂʰɯæp꜊',
  M6D: 'ɳɯæp꜊',
  i6D: 'xɯæp꜊',
  V6D: 'ʂɯæp꜊',
  J6D: 'ʈɯæp꜊',
  h6D: 'ʔɯæp꜊',
  g6D: 'ŋɯæp꜊',
  K6D: 'ʈʰɯæp꜊',
  j7D: 'ɣɯap꜊',
  L7D: 'ɖɯap꜊',
  h7D: 'ʔɯap꜊',
  d7D: 'kɯap꜊',
  V7D: 'ʂɯap꜊',
  i7D: 'xɯap꜊',
  g8D: 'ŋiɐp꜊',
  i8D: 'xiɐp꜊',
  e8D: 'kʰiɐp꜊',
  d8D: 'kiɐp꜊',
  h8D: 'ʔiɐp꜊',
  l8D: 'jiɐp꜊',
  f8D: 'giɐp꜊',
  C9D: 'biɐp꜊',
  A9D: 'piɐp꜊',
  B9D: 'pʰiɐp꜊',
  e9L: 'kʰiɐp꜊',
  M9L: 'ɳiɐp꜊',
  K9L: 'ʈʰiɐp꜊',
  fGA: 'gi˧',
  LeI: 'ɖʷɯæn˧',
  ifE: 'xɯiɛn˧',
  VsA: 'ʂɯiaŋ˧',
  N3A: 'tsɑm˧',
  BSB: 'pʰuoi˧˥',
  eVN: 'kʰʷɯin˧˥',
  iVF: 'xɯin˧˥',
  SYB: 'tʂɨn˧˥',
  TYB: 'tʂʰɨn˧˥',
  SnJ: 'tʂʷɯa˧˥',
  PzB: 'dzəu˧˥',
  K8B: 'ʈʰiɐm˧˥',
  JPC: 'ʈɯæ˥˨',
  JQK: 'ʈʷɯæi˥˨',
  TVC: 'tʂʰin˥˨',
  TZK: 'tʂʰʷiɐn˥˨',
  OlC: 'tsʰɑ˥˨',
  MnC: 'ɳɯa˥˨',
  TsC: 'tʂʰɯiaŋ˥˨',
  VsC: 'ʂɯiaŋ˥˨',
  hvC: 'ʔeŋ˥˨',
  TVD: 'tʂʰit꜊',
  UVD: 'dʐit꜊',
  lcD: 'jɑt꜊',
  dfD: 'kiɛt꜊',
  ifL: 'xʷiɛt꜊',
  ZfL: 'dʑʷiɛt꜊',
  TfL: 'tʂʰʷiɛt꜊',
  AuH: 'pɯiɛk꜊',
  M8D: 'ɳiɐp꜊',
  K8D: 'ʈʰiɐp꜊',
}[音韻地位.編碼] || '?';
});

/**
 * 潘悟雲擬音
 *
 * @author N/A
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的潘悟雲擬音
 */
export function panwuyun(音韻地位, 字頭, 選項) {
  return schemas.panwuyun(音韻地位, 字頭, 選項);
}

schemas.unt = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
if (!音韻地位) return [['$legacy', true]];

const is = (x) => 音韻地位.屬於(x);

function 聲母規則() {
  if (is('幫母')) return 'p';
  if (is('滂母')) return 'pʰ';
  if (is('並母')) return 'b';
  if (is('明母')) return 'm';
  if (is('端母')) return 't';
  if (is('透母')) return 'tʰ';
  if (is('定母')) return 'd';
  if (is('泥母')) return 'n';
  if (is('知母')) return 'ʈ';
  if (is('徹母')) return 'ʈʰ';
  if (is('澄母')) return 'ɖ';
  if (is('孃母')) return 'ɳ';
  if (is('精母')) return 't͡s';
  if (is('清母')) return 't͡sʰ';
  if (is('從母')) return 'd͡z';
  if (is('心母')) return 's';
  if (is('邪母')) return 'z';
  if (is('莊母')) return 't͡ʂ';
  if (is('初母')) return 't͡ʂʰ';
  if (is('崇母')) return 'd͡ʐ';
  if (is('生母')) return 'ʂ';
  if (is('俟母')) return 'ʐ';
  if (is('章母')) return 't͡ɕ';
  if (is('昌母')) return 't͡ɕʰ';
  if (is('常母')) return 'd͡ʑ';
  if (is('書母')) return 'ɕ';
  if (is('船母')) return 'ʑ';
  if (is('見母')) return is('三等') ? 'k' : 'q';
  if (is('溪母')) return is('三等') ? 'kʰ' : 'qʰ';
  if (is('羣母')) return is('三等') ? 'ɡ' : 'ɢ';
  if (is('疑母')) return is('三等') ? 'ŋ' : 'ɴ';
  if (is('影母')) return 'ʔ';
  if (is('曉母')) return is('三等') ? 'h' : 'χ';
  if (is('匣母')) return is('三等') ? 'ɦ' : 'ʁ';
  if (is('云母')) return '';
  if (is('以母')) return 'j';
  if (is('來母')) return 'l';
  if (is('日母')) return 'ɲ';
  throw new Error('無聲母規則');
}

function 韻母規則() {
  // 通攝
  if (is('東韻 一等')) return 'uŋʷ';
  if (is('東韻 三等')) return 'ẅuŋʷ';
  if (is('冬韻')) return 'oŋʷ';
  if (is('鍾韻')) return 'ẅɔŋʷ';
  // 江攝
  if (is('江韻')) return 'ɻæŋʷ';
  // 止攝
  if (is('支韻 合口')) return 'ʳɥɛ';
  if (is('支韻')) return 'ʳjɛ';
  if (is('脂韻 合口')) return 'ʳɥi';
  if (is('脂韻')) return 'ʳi';
  if (is('之韻')) return 'ɨ';
  if (is('微韻 開口')) return 'ɨj';
  if (is('微韻')) return 'ẅɨj';
  // 遇攝
  if (is('魚韻')) return 'j̈ə';
  if (is('虞韻')) return 'ẅɔ';
  if (is('模韻')) return 'o';
  // 蟹攝
  if (is('齊韻 合口')) return 'wej';
  if (is('齊韻')) return 'ej';
  if (is('祭韻 合口')) return 'ʳɥɛjɕ';
  if (is('祭韻')) return 'ʳjɛjɕ';
  if (is('泰韻 合口')) return 'wɑjɕ';
  if (is('泰韻')) return 'ɑjɕ';
  if (is('佳韻 合口')) return 'wɻæ';
  if (is('佳韻')) return 'ɻæ';
  if (is('皆韻 合口')) return 'wɻæj';
  if (is('皆韻')) return 'ɻæj';
  if (is('夬韻 合口')) return 'wɻajɕ';
  if (is('夬韻')) return 'ɻajɕ';
  if (is('咍韻')) return 'ɐj';
  if (is('灰韻')) return 'wɔ̞j';
  if (is('廢韻 開口')) return 'j̈əjɕ';
  if (is('廢韻')) return 'ẅəjɕ';
  // 臻攝
  if (is('眞韻 合口')) return 'ʳɥin';
  if (is('眞韻')) return 'ʳin';
  if (is('臻韻')) { // [^1]
    if (is('平入聲')) return 'ɻi˞n';
    if (is('上聲')) return 'ɨn';
    if (is('去聲')) return 'ɻin';
  }
  if (is('欣韻')) return 'ɨn';
  if (is('文韻')) return 'ẅun';
  if (is('元韻 開口')) return 'j̈ən';
  if (is('元韻')) return 'ẅən';
  if (is('痕韻')) return 'ɘn';
  if (is('魂韻')) return 'won';
  // 山攝
  if (is('寒韻 開口')) return 'ɑn';
  if (is('寒韻')) return 'wɑn';
  if (is('刪韻 合口')) return 'wɻan';
  if (is('刪韻')) return 'ɻan';
  if (is('山韻 合口')) return 'wɻæn';
  if (is('山韻')) return 'ɻæn';
  if (is('仙韻 合口')) return 'ʳɥɛn';
  if (is('仙韻')) return 'ʳjɛn';
  if (is('先韻 合口')) return 'wen';
  if (is('先韻')) return 'en';
  // 效攝
  if (is('蕭韻')) return 'ew';
  if (is('宵韻')) return 'ʳjɛw';
  if (is('肴韻')) return 'ɻaw';
  if (is('豪韻')) return 'ɑw';
  // 果攝
  if (is('歌韻 一等 開口')) return 'ɑ';
  if (is('歌韻 一等')) return 'wɑ';
  if (is('歌韻 三等 開口')) return 'j̈ɑ';
  if (is('歌韻 三等')) return 'ẅɑ';
  // 假攝
  if (is('麻韻 二等 合口')) return 'wɻa';
  if (is('麻韻 二等')) return 'ɻa';
  if (is('麻韻 三等')) return 'ja';
  // 宕攝
  if (is('陽韻 開口')) return 'j̈ɐŋ';
  if (is('陽韻')) return 'ẅɐŋ';
  if (is('唐韻 合口')) return 'wɑŋ';
  if (is('唐韻')) return 'ɑŋ';
  // 梗攝
  if (is('庚韻 二等 合口')) return 'wɻaɲ';
  if (is('庚韻 二等')) return 'ɻaɲ';
  if (is('庚韻 三等 合口')) return 'ɻɥaɲ';
  if (is('庚韻 三等')) return 'ɻjaɲ';
  if (is('耕韻 合口')) return 'wɻæɲ';
  if (is('耕韻')) return 'ɻæɲ';
  if (is('清韻 合口')) return 'ɥɛɲ';
  if (is('清韻')) return 'ʳjɛɲ'; // [^2]
  if (is('青韻 合口')) return 'weɲ';
  if (is('青韻')) return 'eɲ';
  // 曾攝
  if (is('蒸韻 合口')) return 'ʳɥiŋ'; // [^2]
  if (is('蒸韻')) return 'ʳiŋ'; // [^2]
  if (is('登韻 合口')) return 'wɘŋ';
  if (is('登韻')) return 'ɘŋ';
  // 流攝
  if (is('尤韻')) return 'ɥ̈u';
  if (is('侯韻')) { // 根據設定，侯韻幫組為 u，其他為 ɘu
    if (is('幫組')) return 'u';
    return 'ɘu';
  }
  if (is('幽韻')) return 'ɥÿ';
  // 深攝
  if (is('侵韻')) return 'ʳim';
  // 咸攝
  if (is('覃韻')) return 'ɐm';
  if (is('談韻')) return 'ɑm';
  if (is('鹽韻')) return 'ʳjɛm';
  if (is('添韻')) return 'em';
  if (is('咸韻')) return 'ɻæm';
  if (is('銜韻')) return 'ɻam';
  if (is('嚴韻')) return 'j̈əm';
  if (is('凡韻')) return 'ẅɞm';
  throw new Error('無韻母規則');
}

function 聲調規則() {
  if (is('平聲')) return is('全清 或 次清') ? '˦' : '˨˩';
  if (is('上聲')) return !is('全濁') ? '˦˦˥' : '˨˨˧';
  if (is('去聲')) return is('全清 或 次清') ? '˥˩' : '˧˩˨';
  if (is('入聲')) return !is('全濁') ? '˥' : '˨˩';
  throw new Error('無聲調規則');
}

let 聲母 = 聲母規則();
let 韻母 = 韻母規則();
let 聲調 = 聲調規則();

// 處理重紐 [^3]
if (韻母.startsWith('ʳ')) {
  if (is('知莊組')) {
    韻母 = `ɻ${韻母.slice(1)}`; // 無重紐對立，認定為重紐B類
  } else if (is('端精章組 或 以來日母')) {
    韻母 = 韻母.slice(1); // 無重紐對立，認定為重紐A類
  } else if (is('重紐A類')) {
    韻母 = 韻母.slice(1); // 有重紐對立，默認為重紐A類
  } else {
    韻母 = `ɻ${韻母.slice(1)}`; // 有重紐對立，重紐B類
  }
}

// 處理脣音
if (is('幫組')) {
  // 除三等C类外，其他韵母与帮组p相拼时均为开口（不含 [ʷ] 成分）。
  if (韻母.startsWith('ɥ') && !韻母.startsWith('ɥ̈')) {
    韻母 = `j${韻母.slice(1)}`;
  } else if (韻母.startsWith('w') && !韻母.startsWith('ẅ')) {
    韻母 = 韻母.slice(1);
  // 三等C类与帮组p相拼时是ɥ̈，即 [ÿ] 对应的半元音。[^4]
  } if (is('三等') && 韻母.startsWith('ẅ')) {
    韻母 = `ɥ̈${韻母.slice(2)}`;
  }
}

// 調整 ɻ、w 的顺序 [^5]
if (韻母.startsWith('wɻ') && is('知莊組')) {
  韻母 = `ɻw${韻母.slice(2)}`;
}

// 以母簡化拼式
// 總結：以母三A/三B，以 j 或 ɥ 起始時，省略聲母
if (is('以母 三等 支脂祭眞仙宵臻麻清庚蒸侵鹽韻') && (韻母.startsWith('j') || 韻母.startsWith('ɥ'))) {
  聲母 = '';
}

// 處理入聲韻
if (is('入聲')) {
  if (韻母.endsWith('m')) {
    韻母 = `${韻母.slice(0, -1)}p`;
  } else if (韻母.endsWith('n')) {
    韻母 = `${韻母.slice(0, -1)}t`;
  } else if (韻母.endsWith('ɲ')) {
    韻母 = `${韻母.slice(0, -1)}c`;
  } else if (韻母.endsWith('ŋ')) {
    韻母 = `${韻母.slice(0, -1)}k`;
  } else if (韻母.endsWith('ŋʷ')) {
    韻母 = `${韻母.slice(0, -2)}kʷ`;
  }
}

// 當没有聲母，韻母以 ɨ 起始時，添加聲母 j̈
if (聲母 === '' && 韻母 === 'ɨ') {
  聲母 = 'j̈';
}

return 聲母 + 韻母 + 聲調;

/*
[^1]: 臻韵ɻi˞n的韵腹i˞带有r色彩，同时像三等B类介音ɻj一样，这个i˞没有那么靠前（见图2）。这就像大埔方言（客家话）的“真”[tʃ˞i˞n]（[t͡ʃ] = [t͡ʂ̻]）[20]一样。臻韵ɻi˞n只出现于庄组t͡ʂ的平声和入声后，与上声和去声的真B开ɻin、欣韵ɨn互补，实际上它的韵腹只是i在卷舌声母和舌冠（coronal）韵尾n的共同影响下产生的强r色彩变体，而且可以看作一种声调变韵；但根据元音分韵原则，我们必须承认臻韵ɻi˞n的独立性。这里的“ɻ”对标音来说完全是多余的（见介音第8c条），但保留“ɻ”能使它的前两个字符“ɻi”符合三等B类韵母的拼写，因此保留。
庄组t͡ʂ上声和去声的真B开ɻin、欣韵ɨn（包括“𧤛”t͡ʂɨn˦˦˥、“龀”t͡ʂʰɨn˦˦˥、“浕”d͡ʐɻin˨˨˧、“榇”t͡ʂʰɻin˥˩ 4个小韵。两个韵母在庄组t͡ʂ后没有对立）可以遵照《广韵》的归韵，不一定也要读成臻韵ɻi˞n。

[^2]: 谆韵ɥin、清开jɛɲ、蒸韵ɻiŋ虽无重纽对立（表2中无下划线），但实际上有跨A、B两类的情况：谆韵ɥin、清开jɛɲ与知ʈ、庄t͡ʂ组相拼时是B类（如“椿”ʈʰɻɥin˦、“贞”ʈɻjɛɲ˦），蒸韵ɻiŋ与精t͡s、章t͡ɕ组和日ɲ、以j母相拼时是A类（如“仍”ɲiŋ˨˩）。

[^3]:  “ʳ”代表该韵有重纽对立：B类在“ʳ”的位置有ɻ介音，A类无ɻ介音。
为节省空间，A、B两类韵母写在同一格中。

[^4]: [ÿ]（= [ɨᵝ]）是央高不突出圆唇元音，与央高突出圆唇元音 [ʉ] 的圆唇类型不同。突出圆唇（protruded rounding）元音的双唇外凸，露出嘴唇的内侧，由内唇（endolabial）参与调音；不突出圆唇（compressed rounding）元音的双唇收敛，不露出内唇，由外唇（exolabial）参与调音，可视为元音与双唇近音 [β̞] 的双重调音。
［这个不突出唇化的近音ɥ̈与帮组p调音部位相同，在后世导致声母（塞）擦化，即轻唇化（见声母第4b条）。］

[^5]: 卷舌音后的二等合口介音写成ɻw，体现ɻ和卷舌声母的一体性
卷舌音（即知ʈ、庄t͡ʂ组）
*/
});

/**
 * unt 切韻朗讀音
 *
 * https://zhuanlan.zhihu.com/p/58227457
 *
 * @author Ayaka
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的unt 切韻朗讀音
 */
export function unt(音韻地位, 字頭, 選項) {
  return schemas.unt(音韻地位, 字頭, 選項);
}

schemas.unt_j = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
const is = (x) => 音韻地位.屬於(x.replace(/　/g, ''));

/** 目录

一、流程控制开关
二、音节结构
三、音韵地位对应音位（及其代码实现）和区别性特征
四、音系规则（及其代码实现）
五、后处理的代码实现

下面语音学术语对应的音韵学术语将用全角尖括号〈〉在语音学术语后注明。
*/

/** 一、流程控制开关
*/

if (!音韻地位) return [
  ['$legacy', true],
  ['知組:', [1, 'tɹ', 'ʈ']],
  ['云母:', [1, 'w', 'ɹ']],
  ['祭泰夬廢韻尾:', [2, 'j', 'ɹ', 'ð']],
  ['精三A合介音:', [1, 'ɹ', 'ɥ']],
  ['後低元音:', [2, 'ɑ', 'a']],
  // 对于多数字体，r 音钩后需插入 U+2006（六分之一的 Em 间隔）以确保显示效果
  ['二等元音記號:', [1, '咽化 ◌ˤ', 'r音鉤（帶空隙）◌˞ ', 'r音鉤（無空隙）◌˞', '下等號 ◌͇', '雙下橫線 ◌̳']],
  ['侯韻:', [2, 'u', 'ɘu']],
  ['聲調記號:', [1, '上◌́ 去◌̀', '上ˀ 去ʱ', '上ˀ 去ʰ']],
];

for (var key in 選項) {
  if (key.includes(':')) {
    選項[key.slice(0, -1)] = 選項[key]; // 去除冒号，方便下面代码中引用
  }
}

/** 二、音节结构

切韵拟音 J 的音节结构是 CʷGVCᵀ。

Cʷ：辅音或唇化辅音，作为声母（initial）
G：滑音（glide），作为介音（medial）
V：单元音或二合元音，作为韵核（nucleus）。成音节辅音 [ɹ̩] 也可以作韵核〈臻韵〉
C：辅音，作为韵尾（coda）。韵核和韵尾加在一起叫作韵基（rime）
ᵀ：声调（tone）

介音和韵尾可有可无，声母、韵核、声调是必须出现的。
*/

/** 三、音韵地位对应音位（及其代码实现）和区别性特征（distinctive feature）

1. 辅音的特征

发声态和调音方式：

[±voi]:   带声（voice）
[±sg]:    展声门（spread glottis），即辅音送气。注意 [h]〈晓母三等〉按照理论是 [+sg]，但本文为了和“全清”对应，算作 [−sg]（也有人将晓母归次清）
[±son]:   响音（sonorant）性，包括鼻音和近音（本文的响音不包含元音）。相反的 [−son] 是阻音（obstruent）
[±stop]:  塞音性，包括鼻塞音（即鼻音）和口塞音（即爆发音和塞擦音）。包含鼻音的“塞音”严格来说应该叫 occlusive 而非 stop，本文从简直接用 [±stop]
[±fric]:  擦音（fricative）性。本文将塞擦音也算入 [+fric]，不使用现代音系学常用的 [±delayed release]（延缓除阻）

调音部位：

[LAB]:    唇（labial）
  [±rnd]: 圆唇（round），包括唇化辅音和圆唇元音
[COR]:    舌冠（coronal），即锐音。本文为了简便将硬腭辅音也算入舌冠音。本文从简仍然使用“锐音、钝音”的叫法，但不用 [∓grave]
  [±ant]: 前部（anterior）。前部锐音包括齿–龈、龈，后部锐音包括龈后、卷舌、龈–腭等
  [±r]:   r 色彩
[DOR]:    舌面（dorsal）
  [±high]:高，对辅音而言 [DOR, +high] 是软腭音，[DOR, −high] 是小舌音，正好符合三等、非三等之分。
          本文将软腭音分为软腭前音（prevelar）、软腭后音（postvelar）两组，分别用软腭音和小舌音的记号表示。

2. 音韵地位对应辅音音位

详见下面代码实现。
*/

// 函数：将声母的音韵地位转换为音位，不含开合信息
// 介音音位和条件变体也在下面列出，以说明其区别性特征，尽管在代码中用不到
function getInitialWithoutRounding() {
  return {
 // 不送气     送气       浊阻音     浊响音
 // 清阻音     清阻音
 //〈全清〉   〈次清〉   〈全浊〉   〈次浊〉
 // −voi       −voi       +voi       +voi
 // −sg        +sg        −sg        −sg
 // −son       −son       −son       +son
    幫: 'p',   滂: 'pʰ',  並: 'b',   明: 'm',  // +stop, −fric; LAB            双唇塞音  〈帮组/唇音〉
                              帮三C介音: 'β',  // −stop, −fric; LAB            双唇近音
    端: 't',   透: 'tʰ',  定: 'd',   泥: 'n',  // +stop, −fric; COR, +ant      齿龈塞音  〈端组/舌头音〉
    精: 'ts',  清: 'tsʰ', 從: 'dz',            // +stop, +fric; COR, +ant      齿龈塞擦音〈精组/齿头音〉
    心: 's',              邪: 'z',             // −stop, +fric; COR, +ant      齿龈擦音  〈精组/齿头音〉
                                     來: 'l',  // −stop, −fric; COR, +ant      齿龈近音  〈来母/半舌音〉
    知: 'tɹ',  徹: 'tɹʰ', 澄: 'dɹ',  孃: 'nɹ', // +stop, −fric; COR, −ant, +r  卷舌塞音  〈知组/舌上音〉
    莊: 'tʂ',  初: 'tʂʰ', 崇: 'dʐ',            // +stop, +fric; COR, −ant, +r  卷舌塞擦音〈庄组/正齿音〉
    生: 'ʂ',              俟: 'ʐ',             // −stop, +fric; COR, −ant, +r  卷舌擦音  〈庄组/正齿音〉
                              钝三B介音: 'ɹ',  // −stop, −fric; COR, −ant, +r  龈后近音
                                     日: 'ɲ',  // +stop, −fric; COR, −ant, −r  龈腭塞音  〈日母/半齿音〉
    章: 'tɕ',  昌: 'tɕʰ', 常: 'dʑ',            // +stop, +fric; COR, −ant, −r  龈腭塞擦音〈章组/正齿音〉
    書: 'ɕ',              船: 'ʑ',             // −stop, +fric; COR, −ant, −r  龈腭擦音  〈章组/正齿音〉
                                     以: 'j',  // −stop, −fric; COR, −ant, −r  硬腭近音  〈以母/喉音〉
    見: 'k',   溪: 'kʰ',  羣: 'ɡ',   疑: 'ŋ',  // +stop, −fric; DOR (+high)    软腭前塞音〈见组/牙音〉
                          匣: 'ɣ',   云: 'ɣ',  // −stop, +fric; DOR (+high)    软腭前擦音〈影组/喉音〉
                              见三C介音: 'j̈',  // −stop, −fric; DOR (+high)    软腭前近音
   見1: 'q',  溪1: 'qʰ',            疑1: 'ɴ',  // +stop, −fric; DOR (−high)    软腭后塞音【见组的非三等变体这里用1标记】
   曉1: 'χ',             匣1: 'ʁ',             // −stop, +fric; DOR (−high)    软腭后擦音
    影: 'ʔ',                                   // +stop, −fric                 喉塞音    〈影组/喉音〉
    曉: 'h',                                   // −stop, +fric                 喉擦音    〈影组/喉音〉
  }[音韻地位.母];
}

const is全清 = is('幫端精心知莊生章書見影曉母'); // [−voi, −sg, −son]
const is次清 = is('滂透清　徹初　昌　溪　　母'); // [−voi, +sg, −son]
const is全浊 = is('並定從邪澄崇俟常船羣　匣母'); // [+voi, −sg, −son]
const is次浊 = is('明泥來　孃　　日以疑云　母'); // [+voi, −sg, +son]
const is清 = is全清 || is次清;
// 云母已按推导后的结果 [w] 算入次浊

const is锐前 = is('端精組 或 來母 一二四等'); // [COR, +ant]
const is锐后 = is('知莊章組 或 日以母');      // [COR, −ant]
const is锐 = is锐前 || is锐后 || is('來母');  // [COR]
// 来母按推导后只有非三等 [l] 算入前部锐音，但来母三等 [lɹ] 不算前部也不算后部

// 函数：将声母的音韵地位转换为音位，包含开合信息
function getInitial() {
  let result = getInitialWithoutRounding();
  if ('打爹'.includes(字頭) && is('知母')) result = 't';

  // 音韵学术语开合对应 [±rnd]。如果主要调音部位就是 [LAB]〈帮组〉，那么本文一律视为 [−rnd]
  // 没有开合对立的韵母一般视为开口，但虞韵本文视为鱼韵对应的合口；平行地，钟韵也视为合口
  if (is('合口 或 虞鍾韻') && !is('幫組')) { // [+rnd]
    result += 'ʷ';
    result = result.replace('ʰʷ', 'ʷʰ');
  } // else [−rnd]
  return result;
}

// 函数：将软腭前音转换为软腭后音
function velarToUvular(consonant) {
  switch (consonant[0]) {
    case 'k': return 'q' + consonant.substring(1);
    case 'ɡ': return 'ɢ' + consonant.substring(1);
    case 'ŋ': return 'ɴ' + consonant.substring(1);
    case 'ɣ': return 'ʁ' + consonant.substring(1);
  }
  return consonant;
}

// 函数：将知组转换为卷舌塞音
function retroflexToStop(consonant) {
  switch (consonant.substring(0, 2)) {
    case 'tɹ': return 'ʈ' + consonant.substring(2);
    case 'dɹ': return 'ɖ' + consonant.substring(2);
    case 'nɹ': return 'ɳ' + consonant.substring(2);
  }
  return consonant;
}

// 函数：将介音的音韵地位转换为音位，不含开合信息
function getGlide() {
  if (is('云母 灰韻')) return 'ɹ'; // “倄”小韵

  // 一二四等无介音
  if (!is('三等')) return '';

  // 锐音声母三等介音一律用 /ɹ/
  if (is锐) return 'ɹ';

  // 钝音声母分三 A、B、C
  if (is('重紐B類 或 庚臻韻')) return 'ɹ';
  if (is('溪母 幽韻 平聲')) return 'ɹ'; // “𠁫”小韵归三 B
  if ('抑𡊁烋'.includes(字頭)) return 'ɹ'; // 蒸韵“抑𡊁”二字、幽韵“烋”字归三 B
  if (字頭 == '揭' && is('見母 仙韻')) return 'ɹ'; // “孑”小韵的“揭”字归三 B
  if (is('云母 支脂祭眞臻仙宵麻庚清蒸幽侵鹽韻')) return 'ɹ'; // 云母前元音韵归三 B
  if (is('重紐A類 或 麻蒸清幽韻')) return 'j'; // 三 A
  return 'j̈'; // 三 C
}

// 函数：将韵尾的音韵地位转换为音位
function getCoda() {
  if (is('通江宕梗曾攝')) return is('入聲') ? 'k' : 'ŋ';
  if (is('深咸攝'))       return is('入聲') ? 'p' : 'm';
  if (is('臻山攝'))       return is('入聲') ? 't' : 'n';
  if (is('佳韻'))         return ''; // 从蟹摄中排除无韵尾的佳韵
  if (is('微韻 或 蟹攝')) return 'j';
  if (is('幽韻 或 效攝')) return 'w';
  return '';
}

/**
3. 元音的特征

[±high]:  高
[±low]:   低
[±front]: 前
[±back]:  后
[±rnd]:   圆唇（round）
[±tense]: 紧。三子韵及其对应的三寅韵是松元音，三丑韵及其对应的三寅韵是紧元音，非三等韵都是紧元音
[±divII]: 二等（division-II）。本文不指定它的具体语音实现

列表如下。[ʉ] 是音位变体，也加入下表

             i  ɨ (ʉ) u  ɪ  +high, −low
       eˤ œˤ e  ə     o  ɜ  −high, −low
       aˤ       a           −high, +low
front        +  −  −  −
back         −  −  −  +
rnd    −  +  −  −  +  +
tense  +  +  +  +  +  +  −
divII  +  +  −  −  −  −  −

4. 音韵地位对应元音音位

详见下面代码实现。
*/

// 函数：将韵核的音韵地位转换为音位
function getNucleus() {
  // 松元音
  // 韵尾: m     j   n       w
  if (is('侵　　微　眞臻欣文　韻')) return 'ɪ'; // +high, −tense
  if (is('鹽嚴凡祭廢仙　元　宵韻')) return 'ɜ'; // −high, −tense

  // 紧元音
  // 脂韵、尤韵的韵基也可分别视为 /ɪj/、/ɪw/，本文从简直接视为紧元音 /i/、/u/
  // 韵尾:   ŋ m j n w
  if (is('脂蒸　　　幽韻')) return 'i';  // +high, −low, +front, −back, −rnd, +tense
  if (is('之　　　　　韻')) return 'ɨ';  // +high, −low, −front, −back, −rnd, +tense
  if (is('尤東　　　侯韻')) return 'u';  // +high, −low, −front, +back, +rnd, +tense
  if (is('佳耕咸皆山　韻')) return 'eˤ'; // −high, −low, +divII,        −rnd, +tense
  if (is('　江　　　　韻')) return 'œˤ'; // −high, −low, +divII,        +rnd, +tense
  if (is('　青添齊先蕭韻')) return 'e';  // −high, −low, +front, −back, −rnd, +tense
  if (is('　登覃咍痕豪韻')) return 'ə';  // −high, −low, +front, −back, −rnd, +tense
  if (is('模冬　灰魂　韻')) return 'o';  // −high, −low, +front, −back, −rnd, +tense
  if (is('麻庚銜夬刪肴韻 二等')) return 'aˤ';
                                        // −high, +low, +divII,        −rnd, +tense
  if (is('麻庚　　　　韻 三等') ||
      is('歌唐談泰寒　韻')) return 'a'; // −high, +low, −front, −back, −rnd, +tense

  // 二合元音
  if (is('支韻'))     return 'iə'; // +front, −back, −rnd, +tense
  if (is('魚虞鍾韻')) return 'ɨə'; // −front, −back, −rnd, +tense
  if (is('清韻'))     return 'ia'; // +front, −back, −rnd, +tense
  if (is('陽韻'))     return 'ɨa'; // +front, −back, −rnd, +tense

  throw new Error('无元音规则');
}

// 函数：将半元音转换为元音
function semivowelToVowel(consonant) {
  switch (consonant) {
    case 'j': return 'i';
    case 'ɥ': return 'y';
    case 'j̈': return 'ɨ';
    case 'ɥ̈': return 'ʉ';
    case 'w': return 'u';
  }
  return consonant;
}

/**
5. 声调
*/

// 函数：将声调的音韵地位转换为语音
function getTone() {
  if (is('平入聲')) return '';
  if (is('上聲')) return 選項.聲調記號 == '上◌́ 去◌̀' ? '́' : 選項.聲調記號[1];
  if (is('去聲')) return 選項.聲調記號 == '上◌́ 去◌̀' ? '̀' : 選項.聲調記號[4];
  throw new Error('无声调规则');
}

/** 四、音系规则（及其代码实现）
*/

// 获取音节的各部分
let initial = getInitial();
let glide = getGlide();
let nucleus = getNucleus();
let coda = getCoda();
let tone = getTone();

/**
(1)  介音在后部锐音后被声母吸收而删除
     G -> ∅ / [COR, −ant]__
*/
if (is('知莊章組 或 日以母')) glide = '';
if (字頭 == '爹' && is('知母')) glide = 'j'; // 特例

/**
(2)  舌面介音被唇音或唇化声母同化〈帮组或合口三 A、C〉
     j -> ɥ / [+rnd]__
     j̈ -> ɥ̈ / [+rnd]__
          β / [LAB, −rnd]__
*/
if (initial.includes('ʷ')) {
  glide = glide.replace('j', 'ɥ');
} else if (is('幫組')) {
  if (glide == 'j̈') glide = 'β';
}

/**
(3)  唇化的声母 j 实现为 ɥ〈以母合口〉
     jʷ -> ɥ
*/
if (initial == 'jʷ') initial = 'ɥ';

/**
(4)  j 韵尾在低元音和中松元音后〈祭泰夬废〉实现为 ɹ
     j -> ɹ / {[+low], [−high, −tense]}__
*/
if (is('去聲')) {
  if (nucleus.includes('a') || nucleus == 'ɜ') {
    if (coda == 'j') coda = 選項.祭泰夬廢韻尾;
  }
}

/**
(5)  松元音的前后被前接辅音的锐钝同化
     ɪ -> i / [COR]__
          ɨ / 其他环境
     ɜ -> e / [COR]__
          ə / 其他环境
*/
if ([...'ɹjɥ'].includes(glide) || is锐) { // 不包含 glide 为零的情况，所以用 [...'ɹjɥ']
  if (nucleus == 'ɪ') nucleus = 'i';
  if (nucleus == 'ɜ') nucleus = 'e';
} else {
  if (nucleus == 'ɪ') nucleus = 'ɨ';
  if (nucleus == 'ɜ') nucleus = 'ə';
}

/**
(6)  二合元音的后滑音（off-glide）部分被元音的前后同化
     ə -> ɛ / i__
       -> ʌ / ɨ__
     a -> æ / i__
       -> ɐ / ɨ__
*/
if (nucleus == 'iə') nucleus = 'iɛ';
if (nucleus == 'ɨə') nucleus = 'ɨʌ';
if (nucleus == 'ia') nucleus = 'iæ';
if (nucleus == 'ɨa') nucleus = 'ɨɐ';

/**
(7)  一等韵的韵核 /a/ 实现为 [ɑ]
     三等韵的韵核 /a/ 在锐音后实现为 [a]，但锐音是唇化〈歌三合〉的除外；在钝音后〈歌韵〉实现为 [ɑ]
     a -> a / {[COR, +ant, −rnd]G, [COR, −ant]}__
       -> ɑ / 其他环境
*/
if (nucleus == 'a') {
  if (is锐 && glide && !initial.includes('ʷ') || is锐后 || !is锐 && [...'ɹjɥ'].includes(glide)) {
    nucleus = 'a';
    // 这里“㶒䔾譫”三小韵会被转换为 a，但我们不作处理
  } else {
    nucleus = 'ɑ';
  }
}

/**
(8)  央高元音被唇音或唇化声母同化（包括二合元音 ɨʌ -> ʉɔ〈虞钟阳韵〉）
     ɨ -> ʉ / [LAB]__
*/
if (initial.includes('ʷ') || initial == 'ɥ' || glide == 'β') {
  nucleus = nucleus.replace('ɨʌ', 'ʉɔ');
  nucleus = nucleus.replace('ɨ', 'ʉ');
}

/**
(9)  i 在卷舌咝音和龈韵尾之间〈庄组真臻欣韵开口〉舌冠化为 ɹ̩
     i -> ɹ̩ / [COR, −ant, +r, +fric, −rnd]__[COR]
*/
if (is('莊組') && !initial.includes('ʷ') && [...'nt'].includes(coda)) {
  if (nucleus == 'i') nucleus = 'ɹ̩';
}

/**
(10) 零介音、唇音或唇化韵尾前的 ə〈豪覃韵〉实现为 ʌ
     ə -> ʌ / 非G__[LAB]
*/
if (!glide && [...'mpw'].includes(coda)) {
  if (nucleus == 'ə') nucleus = 'ʌ';
}

/**
(11) βəm〈凡韵〉的韵核实现为圆唇元音
     {e, ə} -> œ / [LAB]G__m
*/
if (nucleus == 'ə' && (initial.includes('ʷ') || is('幫組')) && [...'mp'].includes(coda)) nucleus = 'œ';

/**
(12) 齿龈阻音〈端精组〉后的介音接前元音时被同化（圆唇时可选）
     G -> j / [COR, +ant, −son, −rnd]__[+front]
          ɥ / [COR, +ant, −son, +rnd]__[+front]
*/
if (is锐前 && 'ieæa'.includes(nucleus[0])) {
  if (!initial.includes('ʷ')) {
    if (glide) glide = 'j';
  } else {
    if (glide) glide = 選項.精三A合介音;
  }
}

/**
(13) i 在唇音或唇化声母和软腭韵尾之间〈蒸幽韵〉增生 ɹ 滑音
     G -> ɹ / [LAB]__i[DOR]
*/
if ((initial.includes('ʷ') || is('幫組')) && nucleus == 'i' && [...'ŋkw'].includes(coda)) {
  glide = 'ɹ';
}

/**
(14) 接介音的 ɣ〈云母〉实现为 w
     ɣ -> w / __G
*/
if (initial.includes('ɣ') && glide) {
  if (選項.云母 == 'ɹ') {
    initial = initial.replace('ɣ', 'ɹ'); // ɹ 视为声母
    glide = '';
  } else {
    initial = initial.replace('ɣʷ', 'w');
    if (glide == 'ɹ') {
      if (!is('入聲')) {
        initial = initial.replace('ɣ', ''); // “漹礥鴞炎䫴”算零声母
      } else {
        initial = initial.replace('ɣ', 'w'); // “煜曄”暂算合口
      }
    } else {
      glide = '';
      if (is('之韻')) {
        initial = initial.replace('ɣ', ''); // “矣”算零声母
      } else {
        initial = initial.replace('ɣ', 'w');
      }
    }
  }
}

/**
(15) 软腭音直接后接元音时〈见系和匣母非三等〉实现为软腭后音
     [DOR] -> [−high] / __V
*/
if (!glide) {
  initial = velarToUvular(initial);
}

/**
(16) h 直接后接元音时〈晓母非三等〉实现为软腭后音
     h -> χ / __V
*/
if (!glide) {
  initial = initial.replace('h', 'χ');
}

/**
(17) 圆唇元音和低非前元音后的软腭韵尾〈通江宕摄〉实现为软腭后音
     [DOR] -> [+back] / {[+round], [+low, −front]}__
*/
if ('ʉuoœɑ'.includes(nucleus[0]) || (nucleus.includes('ɐ'))) {
  coda = velarToUvular(coda);
}

/**
(18) u 在钝音声母和无介音齿龈声母后〈侯韵〉裂化，但 m 后不裂化
     u -> u / {[COR, −ant], m}__#
          ɘu / 其他__#
*/
if (nucleus == 'u' && !coda) {
  nucleus = 選項.侯韻;
  if (is锐后 || is('明云母') || glide) nucleus = 'u';
}

/**
(19) 高元音 + 半元音韵尾〈微幽韵〉实现为二合元音
     j -> i / [+high]__
     w -> u / [+high]__
*/
if ('iɨʉuɪ'.includes(nucleus)) {
  if (coda == 'j') coda = 'i';
  if (coda == 'w') coda = 'u';
}

/**
(20) 移除与韵核同部位介音
     [DOR, +son] -> ∅ / C__[+high, −back]
*/
if ('iɨʉ'.includes(nucleus[0])) {
  if (['j', 'ɥ', 'j̈', 'ɥ̈'].includes(glide)) glide = '';
  // 特别地，“矣”小韵算零声母
  if (initial == 'ɹ' && !coda) initial = '';
}

/**
(21) 齿龈音〈端精组〉接非后高元音时省略介音
     {j, ɥ} -> ∅ / [COR, +ant, −son]__[+high, +front, −back]
     G      -> ∅ / [COR, +ant, −son]__[+high, −front, −back]
*/
if (is锐前) {
  if (nucleus[0] == 'i' && [...'jɥ'].includes(glide)) glide = '';
  if ('ɨʉ'.includes(nucleus[0])) glide = '';
}

/**
(22) 移除 mβu 介音〈明母尤韵〉
     mβu -> mu
*/
if (initial == 'm' && nucleus == 'u' && !coda) {
  glide = '';
}

/** 五、后处理的代码实现
*/

if (選項.知組 == 'ʈ' && is('知組 或 來母')) {
  initial = retroflexToStop(initial);
  if (is('知組 三等')) glide = 'ɹ'; // 还原出三等介音
  if ('iɨʉ'.includes(nucleus[0])) glide = ''; // 再次应用音系规则 (21)。平行地，也要应用给来母
}

if (選項.後低元音 == 'a') {
  nucleus = nucleus.replace('ɑ', 'a');
}

if (is('二等')) {
  if ('打冷'.includes(字頭)) { // “打冷”两小韵不是二等元音
    nucleus = nucleus.replace('ˤ', '');
  }
  nucleus = nucleus.replace('ˤ', 選項.二等元音記號.split('◌')[1]);
}

if (選項.聲調記號 != '上◌́ 去◌̀') return initial + glide + nucleus + coda + tone;

// 声调附加符号写在韵核主体上
if (nucleus.includes('͇') || nucleus.includes('̳') || nucleus == 'ɘu' || nucleus == 'ɹ̩') return initial + glide + nucleus + tone + coda;
return initial + glide + nucleus[0] + tone + nucleus.substring(1) + coda;
});

/**
 * unt 切韵拟音 J
 *
 * - 音系规则和代码实现 - https://zhuanlan.zhihu.com/p/305516512
 * - 语音描写和拟音说明 - https://zhuanlan.zhihu.com/p/313005024
 *
 * J 为拟音的版本号
 *
 * 之前的 unt 切韵朗读音推导方案已归档，请查看 https://github.com/nk2028/qieyun-examples/blob/main/unt.js
 *
 * @author unt
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的unt 切韵拟音 J
 */
export function unt_j(音韻地位, 字頭, 選項) {
  return schemas.unt_j(音韻地位, 字頭, 選項);
}

schemas.msoeg_v8 = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
const is = (x) => 音韻地位.屬於(x);

if (!音韻地位) return [
  ['$legacy', true]
  ['章組:', [2, '齦後音', '齦腭音']],
  ['保留非三等ʶ記號', false],
  ['莊三介音', [2, '捲舌元音', 'ɻ']], // 知乎文章用捲舌元音，韻鑒用 ɻ
  ['覺韻:', [2, '中元音', '低元音']],
  ['庚三清:', [2, '中元音', '低元音']],
  ['捲舌元音記號:', [1, 'r音鉤（帶空隙）◌˞ ', 'r音鉤（無空隙）◌˞', '下加點 ◌̣']], // 知乎文章用下加點，韻鑒用 r 音鉤
  ['通江宕攝韻尾:', [3, 'ŋ/k', 'ŋʷ/kʷ', 'ɴ/q', 'ɴʷ/qʷ']], // 知乎文章用 ŋʷ/kʷ，韻鑒用 ɴ/q
  ['宕攝入聲附加:', [2, '無', '⁽ʷ⁾', 'ʷ']],
];

for (var key in 選項) {
  選項[key.replace(':', '')] = 選項[key]; // 去除冒號，方便下面代碼中引用
}

function get聲母_默認拼寫() {
  // 五十一聲類 + 俟母
  const 普通聲母字典 = {
    幫: 'p', 滂: 'pʰ', 並: 'b', 明: 'm',
    知: 'ʈ', 徹: 'ʈʰ', 澄: 'ɖ', 孃: 'ɳ', 來: 'ɭ',
    見: 'k', 溪: 'kʰ', 羣: 'ɡ', 疑: 'ŋ', 云: 'w',
    影: 'ʔ', 曉: 'x',
    精: 'ts', 清: 'tsʰ', 從: 'dz', 心: 's', 邪: 'z',
    莊: 'tʂ', 初: 'tʂʰ', 崇: 'dʐ', 生: 'ʂ', 俟: 'ʐ',
    章: 'tç', 昌: 'tçʰ', 常: 'dʝ', 書: 'ç', 船: 'ʝ', 日: 'ɲ', 以: 'j',
  };
  const 小舌化聲母字典 = {
    幫: 'pʶ', 滂: 'pʶʰ', 並: 'bʶ', 明: 'mʶ',
    端: 'tʶ', 透: 'tʶʰ', 定: 'dʶ', 泥: 'nʶ', 來: 'lʶ',
    見: 'q', 溪: 'qʰ', 疑: 'ɴ',
    影: 'ʔʶ', 曉: 'χ', 匣: 'ʁ',
    精: 'tsʶ', 清: 'tsʶʰ', 從: 'dzʶ', 心: 'sʶ',
  };
  if (is('庚韻 二等') && 字頭 === '打') return 'tʶ';
  if (is('庚韻 二等') && 字頭 === '冷') return 'lʶ';
  if (is('云母 開口') && !is('侵鹽韻')) return 'ɰ';
  if (is('以母 合口 或 以母 東鍾虞韻')) return 'ɥ';
  if (is('三等 或 來母 二等')) return 普通聲母字典[音韻地位.母] || 小舌化聲母字典[音韻地位.母];
  return 小舌化聲母字典[音韻地位.母] || 普通聲母字典[音韻地位.母];
}

function get聲母() {
  let 聲母 = get聲母_默認拼寫();
  if (選項.章組 === '齦後音') {
    聲母 = 聲母.replace('ç', 'ʃ').replace('ʝ', 'ʒ');
  }
  if (!選項.保留非三等ʶ記號) {
    聲母 = 聲母.replace('ʶ', '');
  }
  return 聲母;
}

function get韻母() {
  const 切韻韻到推導韻 = [
    // 爲了方便推導，本代碼採用略有不同的韻類，這裏稱作推導韻
    ['臻韻 或 莊組 欣韻', '眞'],
    ['文韻', '欣'],
    ['灰韻', '咍'],
    ['魂韻', '痕'],
    ['凡韻', '嚴'],
    ['東韻 三等', '終'],
    ['麻韻 三等', '遮'],
    ['歌韻 三等', '迦'],
    ['庚清韻 三等', 選項.庚三清 === '中元音' ? '淸' : '清'],
    ['庚韻 二等', ['打', '冷'].includes(字頭) ? '打' : '庚'],
    ['江韻 入聲', 選項.覺韻 === '中元音' ? '江' : '覺'],
  ];
  const 推導韻到元音 = [
    //  ŋ u ŋʷi n m
    ['　　幽　脂眞侵', 'i'],
    ['之蒸　　微欣　', 'ɯ'],
    ['　　尤終　　　', 'u'],
    ['　　侯東　　　', 'ᵒu'],

    ['支　　　　　　', 'ie'], // 知乎原文支韻在 -i 列
    ['魚　　　　　　', 'ɯɤ'],
    ['虞　　鍾　　　', 'uo'], // 知乎原文虞韻在 -u 列
    ['模　　　　　　', 'o'], // 知乎原文模韻在 -u 列

    ['　淸宵　祭仙鹽', 'iɛ'], // 用“淸”表示庚三清的中元音變體
    ['　青蕭　齊先添', 'ɛ'],
    ['佳耕　　皆山咸', 'ɜ̣'],
    ['　　　江　　　', 'ɞ̣'],
    ['　　宵　廢元嚴', 'ɯʌ'],
    ['　登　　咍痕　', 'ʌ'],
    ['　　　冬　　覃', 'ɔ'],

    ['遮清　　　　　', 'ia'],
    ['　打　　　　　', 'a'],
    ['麻庚肴　夬刪銜', 'ạ'],
    ['　　　覺　　　', 'ɑ̣'],
    ['迦　　陽　　　', 'ɯɑ'],
    ['歌　豪唐泰寒談', 'ɑ'],
  ];
  const 韻尾列表 = ['', 'ŋ/k', 'u', 選項.通江宕攝韻尾, 'i', 'n/t', 'm/p'];

  let 推導韻 = 音韻地位.韻;
  切韻韻到推導韻.some((pair) => { if (is(pair[0])) return 推導韻 = pair[1]; });

  let 元音;
  let 韻尾;
  推導韻到元音.some((pair) => {
    if (pair[0].includes(推導韻)) {
      元音 = pair[1];
      韻尾 = 韻尾列表[pair[0].indexOf(推導韻)].split('/')[+is('入聲')];
      return true;
    }
  });
  if (推導韻 === '覺' && !韻尾.includes('ʷ')) {
    韻尾 += 'ʷ';
  }
  if (is('宕攝 入聲') && !韻尾.includes('ʷ')) {
    韻尾 += 選項.宕攝入聲附加.replace('無', '');
  }

  // 處理三等介音
  if (元音 === 'ɯ' && !is('幫見影組') || is('蒸韻 幫組 或 蒸韻 合口') || '抑𡊁'.includes(字頭)) {
    // 銳音之蒸韻歸 A 類，唇音性蒸韻下面歸 B 類
    元音 = 'i' + 元音;
  }
  if (元音.includes('i') && is('重紐B類 或 云母 或 幫見影組 庚蒸韻')) {
    // 其中，支宵侵的重紐三等開口歸 C 類
    元音 = 元音.replace('i', is('支宵韻 或 侵韻 見溪羣疑影曉母') ? 'ɯ' : 'ị');
  }
  if (is('莊組 三等')) {
    元音 = 元音[0] + '̣' + 元音.slice(1);
    if (!is('支魚韻')) {
      // 介音變爲等同於二等的 ɨ̣（支魚的第一部分不是介音）
      元音 = 元音[0].replace('ɯ', 'ɨ').replace('i', 'ɨ') + 元音.slice(1);
    }
    if (選項.莊三介音 !== '捲舌元音') {
      // 介音是 ɨ̣ 則改寫爲 ɻ，否則前加 ɻ。支韻的 ị 也改寫爲 ɻ
      元音 = 選項.莊三介音 + 元音.replace('ị', '').replace('ɨ̣', '').replace('̣', '');
    }
  }

  // 處理開合介音
  if (元音[0] === 'ɯ') {
    if (is('合口') || is('幫組') && !is('支宵侵韻')) {
      元音 = 元音.replace('ɯ', 'u');
    }
  } else if (is('合口') && !is('云以母')) {
    元音 = 'ʷ' + 元音;
    元音 = 元音.replace('ʷɻ', 'ɻʷ');
  }

  元音 = 元音.replace('̣', 選項.捲舌元音記號.split('◌')[1]);
  韻尾 = 韻尾.replace(元音.slice(-1), ''); // 刪去重複字母 ii、uu
  return 元音 + 韻尾;
}

function get聲調() {
  return { 上: 'ˀ', 去: 'ʰ' }[音韻地位.聲] || '';
}

return get聲母() + get韻母() + get聲調();
});

/**
 * msoeg 中古擬音 V8
 *
 * https://zhuanlan.zhihu.com/p/145409852
 *
 * @author unt
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的msoeg 中古擬音 V8
 */
export function msoeg_v8(音韻地位, 字頭, 選項) {
  return schemas.msoeg_v8(音韻地位, 字頭, 選項);
}

schemas.mid_tang = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
const is = (x) => 音韻地位.屬於(x);

if (!音韻地位) return [
  ['$legacy', true],
  ['預置方案（會覆蓋後面的選項）：', [1,
    '無',
    '【老派/約700年】區分常船、BC韻、咍泰、清青，莊組tʂ，章組歸韻圖四等，未濁上歸去',
    '【中派/約750年】不分常船、BC韻、咍泰、清青，莊組tʂ，章組歸韻圖四等',
    '【新派/約800年】不分常船、BC韻、咍泰、清青，莊章合爲照組，濁上歸去，江韻歸宕',
  ]],
  ['非奉：', [1, 'pɸ bβ', 'pf bv', 'ɸ β', 'f v']],
  ['微母：', [2, 'mβ', 'mʋ', 'β̃', 'ɱ', 'ʋ̃']], // 微母脫鼻比非母脫塞晚很多
  ['莊組：', [1, 'tʂ', 'tɕ']], // 到了韻圖音系（790 年左右），莊二、章四轉爲照二、照三，則應寫成 tɕ 組
  ['常船母：', [2, '常dʑ 船ʑ', '平dʑ 仄ʑ', '全dʑ', '全ʑ']],
  ['二等介音：', [1, 'ʕ', 'ʁ', 'ɣ', 'ɻ']],
  ['章組及日母介音：', [2, '韻圖三等', '韻圖四等']],
  ['幫組一等介音：', [1, '無', 'w']],
  ['宕江韻基合流', false],
  ['佳韻分入皆麻', true],
  ['部分唇音流攝歸遇攝', true],
  ['BC韻合流', true],
  ['咍泰合併', true],
  ['清青合併', true],
  ['精莊組止攝開口：', [2, 'i', 'ɹ̩']], // 另有章組止攝開口舌冠化也發生于這個時期，但不被認爲是當時通語的音變，故不包含
  ['魚虞模：', [2, 'j̈ɯ ɥ̈u u', 'j̈ɤ ɥ̈u u', 'j̈ɤ ɥ̈o o']], // 模是介於 u、o 之間的音，默認寫作 u；但魚就用 ɤ 了
  ['侯東韻：', [2, 'əw(ŋ)', 'ɵw(ŋ)', 'ow(ŋ)']],
  ['入聲韻尾：', [2, '-p -t -k', '-β -ɾ -ɣ']], // 在盛中唐已開始弱化
  ['聲調：', [1, '五度符號', '附加符號', '調類數字']],
  ['全濁上歸去', true],
  ['次濁入歸陰入', false],
];

for (var key in 選項) {
  if (key.includes('：')) {
    選項[key.slice(0, -1)] = 選項[key]; // 去除冒號，方便下面代碼中引用
  }
  let 預置方案 = 選項['預置方案（會覆蓋後面的選項）'];
  if (預置方案 !== '無') {
    if (預置方案[1] === '老') {
      選項.常船母 = '常dʑ 船ʑ';
      選項.全濁上歸去 = false;
    } else if (選項.常船母 === '常dʑ 船ʑ') {
      選項.常船母 = '平dʑ 仄ʑ';
    }
    選項.BC韻合流 = 預置方案[1] === '老' ? false : true;
    選項.咍泰合併 = 預置方案[1] === '老' ? false : true;
    選項.清青合併 = 預置方案[1] === '老' ? false : true;
    選項.莊組 = 預置方案[1] === '新' ? 'tɕ' : 'tʂ';
    選項.章組及日母介音 = 預置方案[1] === '新' ? '韻圖三等' : '韻圖四等';
    if (預置方案[1] === '新') {
      選項.全濁上歸去 = true;
      選項.宕江韻基合流 = true;
    }
  }
}

function get韻圖等() {
  // 切韻一二四等到韻圖不變
  if (音韻地位.等 !== '三') return 音韻地位.等;
  // 切韻三等，聲母是銳音的情況
  if (is('莊組')) return '二';
  if (is('知組 或 來母')) return '三';
  if (is('章組 或 日母')) return 選項.章組及日母介音 === '韻圖三等' ? '三' : '四';
  if (is('精組 或 以母')) return '四';
  // 切韻三等，聲母是鈍音的情況
  if (is('重紐A類 或 麻清韻 或 見影組 幽韻')) return '四';
  if (is('幫組 東鍾微虞廢文元陽尤凡韻')) return '輕'; // 輕唇算作一個獨立的等
  return '三';
}

let 韻圖等 = get韻圖等();

function 聲母預處理() {
  // 輕唇音
  let 非奉 = 選項.非奉.split(' ');
  if (is('幫母 東鍾微虞廢文元陽尤凡韻 三等')) return 非奉[0];
  if (is('滂母 東鍾微虞廢文元陽尤凡韻 三等')) return 非奉[0] + 'ʰ';
  if (is('並母 東鍾微虞廢文元陽尤凡韻 三等')) return 非奉[1];
  if (is('明母 鍾微虞廢文元陽凡韻')) return 選項.微母;
  
  // 輕唇音以外的聲母
  return {
    // 儘管全濁聲母在盛中唐在音值上已經弛化乃至清化，但是仍可使用濁音符號
    // 鼻音塞化也不需要寫出來，而且它只是長安音的特色
    幫: 'p',  滂: 'pʰ',  並: 'b',  明: 'm',
    端: 't',  透: 'tʰ',  定: 'd',  泥: 'n', 來: 'l',
    知: 'tɹ', 徹: 'tɹʰ', 澄: 'dɹ', 孃: 'n',
    精: 'ts', 清: 'tsʰ', 從: 'dz', 心: 's', 邪: 'z',
    莊: 'tʂ', 初: 'tʂʰ', 崇: 'dʐ', 生: 'ʂ', 俟: 'dʐ',
    章: 'tɕ', 昌: 'tɕʰ', 常: 'dʑ', 書: 'ɕ', 船: 'ʑ',  日: 'ɲ',
    見: 'k',  溪: 'kʰ',  羣: 'ɡ',  疑: 'ŋ',
    影: 'ʔ',  曉: 'x',   匣: 'ɣ',  云: '',  以: '',
  }[音韻地位.母];
}

function get聲母() {
  let 聲母 = 聲母預處理();
  if (聲母 === 'dʑ' || 聲母 === 'ʑ') {
    if (選項.常船母 === '平dʑ 仄ʑ') {
      聲母 = is('平聲') ? 'dʑ' : 'ʑ';
    } else if (選項.常船母 === '全dʑ') {
      聲母 = 'dʑ';
    } else if (選項.常船母 === '全ʑ') {
      聲母 = 'ʑ';
    }
  }
  if (選項.莊組 === 'tɕ') {
    聲母 = 聲母.replace('ʂ', 'ɕ').replace('ʐ', 'ʑ');
  }
  return 聲母;
}

function 韻母預處理() {
  // 分開合的韻，用豎線分隔開口韻母和合口韻母，之後篩選
  if (is('遇攝') ||
      (選項.部分唇音流攝歸遇攝 && is('流攝') && '浮戊母罘浮蜉矛茂覆懋拇某負阜+謀部畝畮婦不否桴富牟缶'.includes(字頭))) {
      // 加號前是慧琳反切體現的流攝歸遇攝字，加號後是唐代用韻體現的
    if (韻圖等 === '輕') return 'o';
    if (韻圖等 === '一') return 'o';
    if (韻圖等 === '二') return 'ʕɤ|ʕo';
    if (韻圖等 === '三') return 'j̈ɤ|ɥ̈o';
    if (韻圖等 === '四') return 'jɤ|ɥo';
  }
  if (is('果假攝') ||
      (選項.佳韻分入皆麻 && is('佳韻') && '崖咼扠涯搋派差絓畫罣罷+佳鼃娃解釵卦柴'.includes(字頭))) {
      // 加號前是慧琳反切體現的佳韻歸麻韻字，加號後是唐代用韻體現的
    if (韻圖等 === '一') return 'ɑ|wɒ';
    if (韻圖等 === '二') return 'ʕa|wʕa';
    if (韻圖等 === '三') return 'j̈ɑ|ɥ̈ɑ';
    if (韻圖等 === '四') return 'ja|ɥa';
  }
  if (is('止攝')) {
    if (韻圖等 === '二') return 'ʕi|wʕi';
    if (韻圖等 === '三') return !選項.BC韻合流 && is('微韻') ? 'ɨj|ʉj' : 'j̈i|ɥ̈i';
    if (韻圖等 === '輕') return !選項.BC韻合流 ? 'ɨj' : 'j̈i';
    if (韻圖等 === '四') return 'i|ɥi';
  }
  if (is('蟹攝')) {
    if (韻圖等 === '一' && 選項.咍泰合併) return 'ɑj|wɔj';
    if (韻圖等 === '一') return is('泰韻') ? 'ɑj|wɒj' : 'əj|wɔj';
    if (韻圖等 === '二') return 'ʕaj|wʕaj';
    if (韻圖等 === '三') return 選項.BC韻合流 || is('廢韻') ? 'j̈əj|ɥ̈əj' : 'j̈ej|ɥ̈ej';
    if (韻圖等 === '四') return 'jej|ɥej';
    if (韻圖等 === '輕') return 選項.BC韻合流 ? 'jej|ɥej' : 'jəj|ɥəj';
  }
  if (is('流攝')) {
    if (韻圖等 === '輕') return 'ɵw';
    if (韻圖等 === '一') return 'ɵw';
    if (韻圖等 === '二') return 'ʕɵw';
    if (韻圖等 === '三') return 'ɨw';
    if (韻圖等 === '四') return 'iw';
  }
  if (is('效攝')) {
    if (韻圖等 === '一') return 'ʌw';
    if (韻圖等 === '二') return 'ʕaw';
    if (韻圖等 === '三') return 選項.BC韻合流 ? 'j̈ɐw' : 'j̈ɛw';
    if (韻圖等 === '四') return 'jɛw';
  }
  if (is('曾攝')) {
    if (韻圖等 === '一') return 'əŋ|uŋ';
    if (韻圖等 === '二') return 'ʕəŋ|ʕuŋ';
    if (韻圖等 === '三') return 'ɨŋ|ɥ̈ɨŋ';
    if (韻圖等 === '四') return 'jɨŋ|ɥɨŋ';
  }
  if (is('宕攝')) {
    if (韻圖等 === '輕') return 'ɑŋ';
    if (韻圖等 === '一') return 'ɑŋ|wɑŋ';
    if (韻圖等 === '二') return 'ʕɑŋ|wʕɑŋ';
    if (韻圖等 === '三') return 'j̈ɑŋ|ɥ̈ɑŋ';
    if (韻圖等 === '四') return 'jɑŋ|ɥɑŋ';
  }
  if (is('梗攝')) {
    if (韻圖等 === '二') return 'ʕɛjŋ|wʕɛjŋ';
    // 清青合併前，庚三和庚二是相同的元音
    if (韻圖等 === '三') return 選項.BC韻合流 ? 'j̈əjŋ|ɥ̈əjŋ' : 'j̈ɛjŋ|ɥ̈ɛjŋ';
    if (韻圖等 === '四') return is('青韻') ? 'jejŋ|ɥejŋ' : 'jɛjŋ|ɥɛjŋ';
  }
  if (is('通攝')) {
    if (韻圖等 === '輕') return 'ɵwŋ';
    if (韻圖等 === '一') return 'ɵwŋ';
    if (韻圖等 === '二') return 'ʕɵwŋ';
    if (韻圖等 === '三') return is('東韻') ? 'ɨwŋ' : 'ɥ̈ɵwŋ';
    if (韻圖等 === '四') return is('東韻') ? 'jɨwŋ' : 'ɥɵwŋ';
  }
  if (is('江攝')) {
    if (韻圖等 === '二' && !選項.宕江韻基合流) return 'ʕœwŋ';
    // 銳音歸合口
    if (韻圖等 === '二') return is('幫見影組') ? 'ʕɑŋ' : 'wʕɑŋ';
  }
  if (is('臻攝') && !is('元韻')) {
    if (韻圖等 === '一') return 'ən|un';
    if (韻圖等 === '二') return 'ʕən|ʕun';
    if (韻圖等 === '三') return 選項.BC韻合流 || is('欣文韻') ? 'ɨn|ʉn' : 'j̈in|ɥ̈in';
    if (韻圖等 === '輕') return 'ʉn';
    if (韻圖等 === '四') return 'in|yn';
  }
  if (is('山攝 或 元韻')) {
    if (韻圖等 === '一') return 'ɑn|wɒn';
    if (韻圖等 === '二') return 'ʕan|wʕan';
    if (韻圖等 === '三') return 選項.BC韻合流 || is('元韻') ? 'j̈ɐn|ɥ̈ɐn' : 'j̈ɛn|ɥ̈ɛn';
    if (韻圖等 === '輕') return 'ɐn';
    if (韻圖等 === '四') return 'jɛn|ɥɛn';
  }
  if (is('深攝')) {
    if (韻圖等 === '二') return 'ʕəm';
    if (韻圖等 === '三') return 選項.BC韻合流 ? 'ɨm' : 'j̈im';
    if (韻圖等 === '四') return 'im';
  }
  if (is('咸攝')) {
    if (韻圖等 === '一') return 'ɑm';
    if (韻圖等 === '二') return 'ʕam';
    if (韻圖等 === '三') return 選項.BC韻合流 || is('嚴韻') ? 'j̈ɐm' : 'j̈ɛm';
    if (韻圖等 === '輕') return 'ɐm';
    if (韻圖等 === '四') return 'jɛm';
  }
  throw new Error('無介音規則');
}

function 韻母開合處理() {
  let 韻母列表 = 韻母預處理().split('|');
  if (韻母列表.length === 1) return 韻母列表[0];
  // 一等唇音取合口，二三四等唇音取開口
  if (韻圖等 === '一') return is('開口')? 韻母列表[0] : 韻母列表[1];
  return !is('合口 或 虞韻')? 韻母列表[0] : 韻母列表[1];
}

function get韻母() {
  let 韻母 = 韻母開合處理();
  韻母 = 韻母.replace('ʕ', 選項.二等介音);
  韻母 = 韻母.replace('ɤ', 選項.魚虞模[2]);
  韻母 = 韻母.replace('o', 選項.魚虞模[6]);
  韻母 = 韻母.replace('ɵ', 選項.侯東韻[0]);
  if (選項.幫組一等介音 !== 'w' && is('幫組') && 韻母[0] === 'w') {
    韻母 = 韻母.slice(1);
  }
  if (選項.清青合併 && is('梗攝 三等')) {
    韻母 = 韻母.replace('ɛ', 'e');
  }
  if (is('精莊組 止攝 開口')) {
    韻母 = 韻母.replace('i', 選項.精莊組止攝開口);
  }

  if (is('入聲')) {
    let 陽聲韻尾列表 = ['m', 'n', 'ŋ'];
    let 入聲韻尾列表 = 選項.入聲韻尾.replace(/-+/g, '').split(' ');
    for (let i = 0; i < 陽聲韻尾列表.length; i++) {
      韻母 = 韻母.replace(陽聲韻尾列表[i], 入聲韻尾列表[i]);
    }
  }
  return 韻母;
}

function get聲調() {
  let 聲調 = 選項.全濁上歸去 && is('上聲 全濁') ? '去' : 音韻地位.聲;
  return {
    五度符號: {
      平: is('全清 或 次清') ?
          '˦˨' : '˨˩',
      上: !is('全濁') ?
          '˦˥' : '˨˦',
      去: is('全清 或 次清') ?
          '˧˨˦' : '˨˨˦',
      入: is('全清 或 次清') || (選項.次濁入歸陰入 && is('次濁')) ?
          '˦' : '˨',
    },
    附加符號: { 平: '̀', 上: '́', 去: '̌', 入: '̆' },
    調類數字: { 平: '¹', 上: '²', 去: '³', 入: '⁴' },
  }[選項.聲調][聲調];
}

let 聲母 = get聲母();
let 韻母 = get韻母();
let 聲調 = get聲調();

function get聲調附加符號位置() {
  let 介音列表 = ['̈', 'ʕ', 'j', 'ɥ', 'w'];
  let 介音位置 = -1;
  // 介音後是元音，元音後是插入符號的位置（若有成音節符號則再後移 1）
  let 偏移量 = 韻母.includes('̩') ? 3 : 2;
  for (let i = 0; i < 介音列表.length; i++) {
    let 介音位置 = 韻母.indexOf(介音列表[i]);
    if (介音位置 > -1) {
      // 排除韻尾
      if (介音位置 === 韻母.length - 1) continue;
      if (介音列表[i] === 'w' && 介音位置 === 韻母.length - 2 && is('通攝')) continue;
      return 介音位置 + 偏移量;
    }
  }
  return -1 + 偏移量;
}

if (選項.聲調 === '附加符號') {
  let i = get聲調附加符號位置();
  return 聲母 + 韻母.slice(0, i) + 聲調 + 韻母.slice(i);
}
return 聲母 + 韻母 + 聲調;
});

/**
 * 推導盛中唐擬音
 *
 * 中古漢語音變匯總：https://zhuanlan.zhihu.com/p/403479390
 * 本擬音是根據南北朝以來的音變，從《切韻》音系推出的。盛中唐期間的一些音變，以及擬音和記音方面的多種可能，均以選項形式列出
 *
 * 擬音依據包括：
 * - 韻圖
 * - 玄應、慧琳音義和各家反切
 * - 詩歌碑誌銘文用韻
 * - 日、韓、越漢字音
 * - 梵語、藏語、突厥語、粟特語、回鶻語譯音
 * - 關於語音不正的記載和笑話
 *
 * @author unt
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的推導盛中唐擬音
 */
export function mid_tang(音韻地位, 字頭, 選項) {
  return schemas.mid_tang(音韻地位, 字頭, 選項);
}

schemas.chiangxhua = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
// 代碼中的音韻表達式使用了全角半角空格用於對齊，需要進行移除
const is = (x) => 音韻地位.屬於(x.replace(/ +/g, ' ').replace(/　/g, '').trim());

if (!音韻地位) return [
  ['$legacy', true],
  ['顯示', [3, '音位', '音值', '音位及音值']],
  ['知照組使用', [1, '齦腭音', '捲舌音']],
  ['三個元音音位使用', [1, 'ə ɐ ɵ', 'ə ɐ o']],
  ['聲調使用', [1, '附加符號', '調類數字']], // 調類數字用 ¹²³⁴ 表示（分別為平上去入），附加符號用國際音標的附加符號表示
  ['全濁上歸陽去', true], // 推斷
  ['山攝二等唇音歸合口', false], // 打開則“八”/pʕʷɐ/，關閉則 /pʕɐ/
];

function 聲母規則() {
  if (is('幫滂母 東鍾微虞廢文元陽尤凡韻 三等')) return 'f';
  if (is('並　母 東鍾微虞廢文元陽尤凡韻 三等')) return 'v';
  if (is('明　母 　鍾微虞廢文元陽　凡韻 上聲')) return 'ˀʋ';
  if (is('明　母 　鍾微虞廢文元陽　凡韻 　　')) return 'ʋ';
  if (is('幫　母 　　')) return 'p';
  if (is('滂　母 　　')) return 'pʰ';
  if (is('並　母 仄聲')) return 'b';
  if (is('並　母 平聲')) return 'bʰ';
  if (is('明　母 上聲')) return 'ˀm';
  if (is('明　母 　　')) return 'm';
  if (is('端　母 　　')) return 't';
  if (is('透　母 　　')) return 'tʰ';
  if (is('定　母 仄聲')) return 'd';
  if (is('定　母 平聲')) return 'dʰ';
  if (is('泥孃母 上聲')) return 'ˀn';
  if (is('泥孃母 　　')) return 'n';
  if (is('知　母 　　')) return 'tɹ';
  if (is('徹　母 　　')) return 'tɹʰ';
  if (is('澄　母 仄聲')) return 'dɹ';
  if (is('澄　母 平聲')) return 'dɹʰ';
  if (is('精　母 　　')) return 'ts';
  if (is('清　母 　　')) return 'tsʰ';
  if (is('從　母 仄聲')) return 'dz';
  if (is('從　母 平聲')) return 'dzʰ';
  if (is('心　母 　　')) return 's';
  if (is('邪　母 　　')) return 'z';
  if (is('莊章母 　　')) return 'tɕ';
  if (is('初昌母 　　')) return 'tɕʰ';
  if (is('崇　母 仄聲') && '撰饌棧助寨砦乍狀驟'.includes(字頭)) return 'dʑ'; // 特例：乍
  if (is('船　母 平聲') && '晨船荼乘'.includes(字頭)) return 'dʑʰ'; // 推斷的特例
  if (is('崇常母 平聲')) return 'dʑʰ';
  if (is('生書母 　　')) return 'ɕ';
  if (is('崇常母 仄聲')) return 'ʑ';
  if (is('俟船母 　　')) return 'ʑ';
  if (is('見　母 　　')) return 'k';
  if (is('溪　母 　　')) return 'kʰ';
  if (is('羣　母 仄聲')) return 'ɡ';
  if (is('羣　母 平聲')) return 'ɡʰ';
  if (is('疑　母 上聲')) return 'ˀŋ';
  if (is('疑　母 　　')) return 'ŋ';
  if (is('曉　母 　　')) return 'x';
  if (is('云　母 　　') && '雄熊'.includes(字頭)) return 'ɣ'; // 特例：雄
  if (is('匣　母 　　') && '肴餚殽爻倄'.includes(字頭)) return ''; // 特例：爻
  if (is('匣　母 　　')) return 'ɣ';
  if (is('影　母 　　')) return 'ˀ';
  if (is('云以母 上聲')) return 'ˀ'; // 推斷
  if (is('云以母 　　')) return '';
  if (is('來　母 上聲')) return 'ˀl';
  if (is('來　母 　　')) return 'l';
  if (is('日　母 上聲')) return 'ˀɹ';
  if (is('日　母 　　')) return 'ɹ';
  throw new Error('無聲母規則');
}

function 介音規則() {
  // IV  等：j
  // III 等：ɉ
  // II  等：ʕ
  // I   等：無
  if (is('端精組 或 孃來母')) {
    if (is('泥母 咍韻 開口 上聲')) return ''; // 特例：乃。可能是因為 II 等被“嬭”小韻（中古孃母）佔據了。來母蟹攝二等僅“唻”一字，且它實際上是一等音，故不影響咍泰韻 II 等化
    if (is('泥母 咍泰韻 開口')) return ''; // 據“乃”類推
    if (is('二等 或 咍泰寒覃談韻 開口')) return 'ʕ';
    if (is('一等')) return '';
    if (is('精組 止攝 開口')) return ''; // 中古後期發生 sjə & sɉə > sə，變 I 等
    if (is('三四等')) return 'ɉ'; // 一律歸 III 等
  }
  if (is('知組 二等 或 莊組')) return 'ʕ';
  if (is('知組 三等 或 章組 或 日母')) return 'ɉ';
  // “茝、佁”之類字不作考慮
  // 其餘是鈍音和以母
  if (is('幫組 三等')) { // 處理輕唇化的韻
    if (is('微廢韻')) return 'j'; // [fi] 被列入 IV 等
    if (is('元凡韻')) return 'ʕ';
    if (is('東鍾虞文陽尤韻')) return ''; // 據現代方言推斷陽韻輕唇化後是 I 等
  }
  if (is('四等 或 重紐A類 或 以母 或 清幽韻')) return 'j'; // IV 等
  if (is('三等')) return 'ɉ'; // 其餘的切韻三等是 III 等
  if (is('二等')) return 'ʕ';
  if (is('一等')) return '';
  throw new Error('無介音規則');
}

function 唇化規則() {
  if (is('止臻攝 幫組 重紐B類')) return 'ʷ'; // 幫組 III 等推測已經發生了 ə > əj 的裂化（和見組合口 ə > əj 平行）。əj III、IV 等舒聲只有合口
  if (is('幫組 流通深咸攝')) return ''; // 幫組一等除這四攝外，都算合口
  if (is('幫組 一等 或 合口 或 鍾虞模韻')) return 'ʷ'; // 其他一二等推測都算合口
  if (is('幫組 鍾虞文陽韻')) return 'ʷ'; // 輕唇變一等的
  // 注意，咸深攝舒聲入聲都視為開口，不依原圖定義

  // 原圖“八”列在合口，而《韻鏡》、《七音略》刪韻舒聲和山韻入聲幫組字也列在合口（但刪入山舒列在開口）
  // 這裡如果開關打開，山攝二等就一律視為合口
  if (選項.山攝二等唇音歸合口 && is('幫組 二等 山攝 或 幫組 元韻')) return 'ʷ';

  if (is('江韻 知莊組 或 江韻 孃來母')) return 'ʷ'; // 據《蒙古字韻》推斷，且“雙、霜”需要靠開合對立
  return '';
}

function 韻基規則() {
  // 遇攝
  if (is('遇攝 　　　　')) return 'ɵ ';
  // 止攝
  if (is('止攝 幫組 重紐B類')) return 'əj'; // 幫組 III 等推測已經發生了 ə > əj 的裂化（和見組合口 ə > əj 平行）
  if (is('止攝 莊組　　')) return 'ə '; // 衰、帥
  if (is('止攝 合口　　')) return 'əj';
  if (is('止攝 　　　　')) return 'ə '; // [i] 的音位也可分析为 jəj，但邵雍的分析是 jə，排在 ə 韻基一行
  // 蟹攝
  if (is('蟹攝 一二等　')) return 'ɐj'; // 二等今讀 [a] 的字不作考慮
  if (is('蟹攝 合口　　')) return 'əj'; // 三四等合口。推斷
  if (is('蟹攝 　　　　')) return 'ə '; // 三四等開口。“妻”排在 ə 韻基一行，說明 [jej] 之類的音已經併入 [i]
  // 果假攝
  if (is('果假攝 　　　')) return 'ɐ ';
  // 流攝
  if (is('流攝 　　　　')) return 'ɵw';
  // 效攝
  if (is('效攝 　　　　')) return 'ɐw';
  // 臻攝
  if (is('臻攝 幫組 重紐B類 入聲')) return 'əj'; // 推測和止攝一樣 ə > əj（“筆”）
  if (is('元韻 　　　　')) return is('舒聲') ? 'ɐn' : 'ɐ ';
  if (is('臻攝 　　　　')) return is('舒聲') ? 'ən' : 'ə '; // ɵ 無入聲，推斷文韻幫組入聲韻基只能是 ə。就像南昌話“骨”經歷 kut > kul > kuɨʔ > kuʔ 的演變。入聲（“紇”）韻基也推測為 ə
  // 山攝
  if (is('山攝 　　　　')) return is('舒聲') ? 'ɐn' : 'ɐ ';
  // 曾梗攝
  if (is('曾梗攝 一二等')) return is('舒聲') ? 'əŋ' : 'əj'; // 入聲韻基為推測，因為“窄、虱”今不同韻所以韻基不能是 ə
  if (is('曾梗攝 莊組　')) return is('舒聲') ? 'əŋ' : 'əj'; // 莊組相當於二等（“色”）
  if (is('曾梗攝 　　　')) return is('舒聲') ? 'əŋ' : 'ə '; // 三四等。開口入聲只能是 [i]，合口入聲也推測為 ə。《蒙古字韻》中合口入聲是 əj 韻基（ÿue 或 ue），但現代方言未見，不採用
  // 通攝
  if (is('通攝 　　　　')) return is('舒聲') ? 'ɵŋ' : 'ɵw'; // ɵ 無入聲，推斷東一入聲韻基只能是 əw。又推斷冬韻併入東一
  // 宕江韻
  if (is('宕江攝 　　　')) return is('舒聲') ? 'ɐŋ' : 'ɐw';
  // 深攝
  if (is('深攝 　　　　')) return is('舒聲') ? 'əm' : 'əʋ'; // 南昌話“骨”kul 也可以視為和“滾、棍”kun 只有聲調差別（因為 n、l 是同一音位）。這裡 ʋ 就是聲母中的微母，它有鼻音變體絲毫不奇怪
  // 咸攝
  if (is('咸攝 　　　　')) return is('舒聲') ? 'ɐm' : 'ɐʋ';
  throw new Error('無韻基規則');
}

function 聲調規則() {
  if (選項.全濁上歸陽去 && is('上聲 全濁')) return '̌';
  if (is('平聲')) return '̀';
  if (is('上聲')) return '́';
  if (is('去聲')) return '̌';
  if (is('入聲')) return '̆';
  throw new Error('無聲調規則');
}

function 調類規則() {
  if (選項.全濁上歸陽去 && is('上聲 全濁')) return '³';
  if (is('平聲')) return '¹';
  if (is('上聲')) return '²';
  if (is('去聲')) return '³';
  if (is('入聲')) return '⁴';
  throw new Error('無聲調規則');
}

let 聲母 = 聲母規則();
let 介音 = 介音規則();
let 唇化 = 唇化規則();
let 韻基 = 韻基規則().trim(); // 移除韻母末尾可能的空格
let 韻核 = 韻基[0];
let 韻尾 = 韻基.substring(1);
let 聲調 = 選項.聲調使用 === '調類數字' ? 調類規則() : 聲調規則();

let 音位 = '';
let 音值 = '';

if (選項.知照組使用 === '捲舌音') {
  聲母 = 聲母.replace('ɹ', 'ɻ');
  聲母 = 聲母.replace('ɕ', 'ʂ');
  聲母 = 聲母.replace('ʑ', 'ʐ');
}

if (選項.三個元音音位使用 === 'ə ɐ o') {
  韻核 = 韻核.replace('ɵ', 'o');
}

if (選項.聲調使用 === '調類數字') {
  音位 = 聲母 + 介音 + 唇化 + 韻核 + 韻尾 + 聲調;
} else {
  音位 = 聲母 + 介音 + 唇化 + 韻核 + 聲調 + 韻尾;
}

// 接下來對音位應用音系規則，生成音值

// 虞模的實現與等無關，單獨處理
if ('ɵo'.includes(韻核) && 韻尾 === '' && 唇化) {
  韻核 = 'u';
}

// /ə/ 和 /ɐ/ 的實現
if (介音 === 'j') { // IV 等
  if (韻核 === 'ə') {
    if (韻尾 === 'ʋ' || 韻尾 === 'm') {
      韻核 = 'ɨ';
    } else if (唇化 && (韻尾 === 'j' || 韻尾 === '')) {
      韻核 = 'ʉ';
    } else {
      韻核 = 'i';
    }
  } else if (韻核 === 'ɐ') {
     if (韻尾 !== 'ŋ') {
      韻核 = 'ɛ';
     } // jɐŋ 仍是 jɐŋ
  } else { // ɵ 韻核
    if (韻尾) {
      韻核 = 韻尾 === 'w' && !唇化 ? 'i' : 'ʉ';
    }
  }
} else if (介音 === 'ɉ') { // III 等
  if (韻核 === 'ə') {
    韻核 = 唇化 && 韻尾 !== 'ŋ' ? 'ʉ' : 'ɨ';
  } else if (韻核 !== 'ɐ') { // III 等 /ɐ/ 就實現為 [ɐ]
    if (韻尾) {
      韻核 = 韻尾 === 'w' && !唇化 ? 'ɨ' : 'ʉ';
    }
  }
} else if (介音 === 'ʕ') { // II 等
  if (韻核 === 'ə') {
    if (韻尾 === 'j' || 韻尾 === 'ŋ') {
      韻核 = 'ɛ'; // 構擬音值介於 [ɛ]、[ɜ] 之間，寫 [ɛ]
    } else if (韻尾 === '') {
      if (唇化) {
        韻核 = 'ɛ';
        韻尾 = 選項.知照組使用 === '捲舌音' ? 'ɻ' : 'ɹ';
      } else {
        韻核 = 選項.知照組使用 === '捲舌音' ? 'ɻ̍' : 'ɹ̩';
      }
    } else if (唇化) {
      韻核 = 'u'; // 同 I 等
    }
  } else if (韻核 === 'ɐ') {
    韻核 = 'a';
  }
} else { // I 等
  if (韻核 === 'ə') {
    if (唇化) {
      韻核 = 'u';
    }
    if (韻尾 === '') {
      if (is('精組') && !唇化) {
        韻核 = 'ɹ̩';
      } else {
        韻尾 = 'ɹ'; // 卒、麧
      }
    }
  } else if (韻核 === 'ɐ') {
    if (唇化) {
      if (韻尾 === 'j') {
        韻核 = 'ɵ'; // wɐj 更加高化
      } else if (韻尾 !== 'ŋ') { // wɐŋ 仍是 wɐŋ，其他的合口韻核是 ɔ
        韻核 = 'ɔ';
      }
    } else if (韻尾 === '' && !唇化) {
      韻核 = 'ʌ'; // 歌韻更加高化
    }
  }
}

if (介音[0] === 'ɉ') {
  介音 = 'j̈';
}

// 移除 ʕ，因為 II 等已由單獨的 ɛ、a 或捲舌聲母標記
if (介音 === 'ʕ') {
  介音 = '';
}

// 唇化坍縮到介音上
if (唇化) {
  if (介音[0] === 'j') {
    介音 = 介音.replace('j', 'ɥ'); // III、IV 等
  } else {
    介音 = 'w'; // I、II 等直接是 w 介音
  }
}

if (選項.聲調使用 === '調類數字') {
  音值 = 聲母 + 介音 + 韻核 + 韻尾 + 聲調;
} else {
  音值 = 聲母 + 介音 + 韻核 + 聲調 + 韻尾;
}

// 移除元音同部位近音
音值 = 音值.replace('ji', 'i');
音值 = 音值.replace('j̈ɨ', 'ɨ');
音值 = 音值.replace('ɥ̈ʉ', 'ʉ');
音值 = 音值.replace('wu', 'u');

if (選項.顯示 === '音位') return 音位;
if (選項.顯示 === '音值') return 音值;
return 音位 + ' \n[' + 音值 + ']';
});

/**
 * 推導《聲音唱和圖》擬音
 *
 * 暫無擬音說明文章，一些擬音重點在代碼中以注釋寫出
 *
 * @author unt
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的推導《聲音唱和圖》擬音
 */
export function chiangxhua(音韻地位, 字頭, 選項) {
  return schemas.chiangxhua(音韻地位, 字頭, 選項);
}

schemas.fanwan = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
if (!音韻地位) return [['$legacy', true]];

const is = (x) => 音韻地位.屬於(x);

function 聲母規則() {
  if (is('幫母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻')) return 'f';
    return 'b';
  }
  if (is('滂母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻')) return 'f';
    return 'p';
  }
  if (is('並母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻')) return 'f';
    return is('平聲') ? 'p' : 'b';
  }
  if (is('明母')) return 'm';

  if (is('端母')) return 'd';
  if (is('透母')) return 't';
  if (is('定母')) return is('平聲') ? 't' : 'd';
  if (is('泥母')) return 'n';
  if (is('來母')) return 'l';

  if (is('知母')) return 'zh';
  if (is('徹母')) return 'ch';
  if (is('澄母')) return is('平聲') ? 'ch' : 'zh';
  if (is('孃母')) return 'n';

  if (is('精母')) return 'z';
  if (is('清母')) return 'c';
  if (is('從母')) return is('平聲') ? 'c' : 'z';
  if (is('心母')) return 's';
  if (is('邪母')) return is('平聲') ? 'c' : 'z'; // 塞擦音多於擦音

  if (is('莊母 二等')) return 'zh';
  if (is('初母 二等')) return 'ch';
  if (is('崇母 二等')) return is('平聲') ? 'ch' : 'zh';
  if (is('生母 二等')) return 'sh';
  if (is('俟母 二等')) return is('平聲') ? 'ch' : 'zh';

  // 莊組三等平翹音規律不明確
  if (is('莊母')) return 'z';
  if (is('初母')) return 'c';
  if (is('崇母')) return is('平聲') ? 'c' : 'z';
  if (is('生母')) return 's';
  if (is('俟母')) return is('平聲') ? 'c' : 'z';

  if (is('章母')) return 'zh';
  if (is('昌母')) return 'ch';
  if (is('常母')) return 'sh'; // 擦音多於塞擦音
  if (is('書母')) return 'sh';
  if (is('船母')) return 'sh';
  if (is('日母')) return 'nj';

  if (is('見母')) return 'g';
  if (is('溪母')) return 'h'; // 多數擦化
  if (is('羣母')) return is('平聲') ? 'k' : 'g';
  if (is('疑母')) return 'ng'; // ng 拼細音時為 nj，詳後

  if (is('曉母')) return 'h';
  if (is('匣母')) {
    if (is('合口 或 模韻')) return 'j'; // 非 yu 前為 w，詳後
    return 'h';
  }
  if (is('影云以母')) {
    if (is('三四等')) return 'j'; // 非 yu 前為 w，詳後
    return '';
  }

  throw new Error('無聲母規則');
}

function 韻母規則() {
  // 通攝
  if (is('東冬鍾韻')) return 'ung';

  // 江攝
  if (is('江韻 幫組')) return 'ong';
  if (is('江韻 舌齒音')) return 'oeng';
  if (is('江韻 牙喉音')) return 'ong';

  // 止攝
  if (is('支脂之微韻 幫組')) return 'i';
  if (is('支脂之微韻 開口')) return 'i'; // i 在 z/c/s 前為 ii，詳後
  if (is('支脂之微韻 合口 舌齒音')) return 'eoi';
  if (is('支脂之微韻 合口 牙喉音')) return 'ai';

  // 遇攝
  if (is('魚虞韻 幫組')) return 'u';
  if (is('魚虞韻 莊組')) return 'o';
  if (is('魚虞韻')) return 'yu';
  if (is('模韻 疑母')) return '';
  if (is('模韻')) return 'u';

  // 蟹攝
  if (is('齊韻')) return 'ai';
  if (is('祭韻 幫組')) return 'ai';
  if (is('祭韻 開口')) return 'ai';
  if (is('祭韻 合口 舌齒音')) return 'eoi';
  if (is('祭韻 合口 以母')) return 'eoi';
  if (is('祭韻 合口 牙喉音')) return 'ai';
  if (is('泰韻 幫組')) return 'ui';
  if (is('泰韻 開口 端組')) return 'aai';
  if (is('泰韻 開口 來母')) return 'aai';
  if (is('泰韻 開口 精組')) return 'oi';
  if (is('泰韻 開口 牙喉音')) return 'oi';
  if (is('泰韻 合口 舌齒音')) return 'eoi';
  if (is('泰韻 合口 疑母')) return 'oi';
  if (is('泰韻 合口 牙喉音')) return 'ui';
  if (is('佳皆夬韻')) return 'aai';
  if (is('灰韻 疑母')) return 'oi';
  if (is('灰韻')) return 'ui';
  if (is('咍韻')) return 'oi';
  if (is('廢韻')) return 'ai';

  // 臻攝
  if (is('眞韻 幫組')) return 'an';
  if (is('眞韻 開口')) return 'an';
  if (is('眞韻 合口 舌齒音')) return 'eon';
  if (is('眞韻 合口 牙喉音')) return 'an';
  if (is('臻文欣韻')) return 'an';
  if (is('元韻 幫組')) return 'aan';
  if (is('元韻 開口')) return 'in';
  if (is('元韻 合口')) return 'yun';
  if (is('魂韻 幫組')) return 'un';
  if (is('魂韻 端組')) return 'eon';
  if (is('魂韻 來母')) return 'eon';
  if (is('魂韻 精組')) return 'yun';
  if (is('魂韻 牙喉音')) return 'an';
  if (is('痕韻')) return 'an';

  // 山攝
  if (is('寒韻 幫組')) return 'un';
  if (is('寒韻 開口 舌齒音')) return 'aan';
  if (is('寒韻 開口 牙喉音')) return 'on';
  if (is('寒韻 合口 舌齒音')) return 'yun';
  if (is('寒韻 合口 牙喉音')) return 'un';
  if (is('刪山韻')) return 'aan';
  if (is('仙先韻 幫組')) return 'in';
  if (is('仙先韻 開口')) return 'in';
  if (is('仙先韻 合口')) return 'yun';

  // 效攝
  if (is('蕭宵韻')) return 'iu';
  if (is('肴韻')) return 'aau';
  if (is('豪韻')) return 'u';

  // 果攝
  if (is('歌韻 一等')) return 'o';
  if (is('歌韻 三等')) return 'e';

  // 假攝
  if (is('麻韻 二等')) return 'aa';
  if (is('麻韻 三等')) return 'e';

  // 宕攝
  if (is('陽韻 幫組')) return 'ong';
  if (is('陽韻 開口 莊組')) return 'ong';
  if (is('陽韻 開口')) return 'oeng';
  if (is('陽韻 合口')) return 'ong';
  if (is('唐韻')) return 'ong';

  // 梗攝
  if (is('庚韻 二等')) return 'ang';
  if (is('庚韻 三等 莊組')) return 'ang';
  if (is('庚韻 三等')) return 'ing';
  if (is('耕韻')) return 'ang';
  if (is('清青韻')) return 'ing';

  // 曾攝
  if (is('蒸韻')) return 'ing';
  if (is('登韻')) return 'ang';

  // 流攝
  if (is('尤侯幽韻')) return 'au';

  // 深攝
  if (is('侵韻')) return 'am'; // m 韻尾在聲母為脣音時為 n，詳後，下同

  // 咸攝
  if (is('覃談韻 幫組')) return 'aam';
  if (is('覃談韻 舌齒音')) return 'aam';
  if (is('覃談韻 牙喉音')) return 'om';
  if (is('鹽添嚴韻')) return 'im';
  if (is('咸銜凡韻')) return 'aam';

  throw new Error('無韻母規則');
}

function 聲調規則() {
  if (is('全清 或 次清')) {
    if (is('平聲')) return '1'; // 陰平
    if (is('上聲')) return '2'; // 陰上
    if (is('去聲')) return '3'; // 陰去
    if (is('入聲')) return '1'; // 陰入
  } else {
    if (is('平聲')) return '4'; // 陽平
    if (is('全濁 上聲')) return '6'; // 陽去，全濁上變去
    if (is('上聲')) return '5'; // 陽上
    if (is('去聲')) return '6'; // 陽去
    if (is('入聲')) return '6'; // 陽入
  }
  throw new Error('無聲調規則');
}

let 聲母 = 聲母規則();
let 韻母 = 韻母規則();
let 聲調 = 聲調規則();

// i 在 z/c/s 前為 ii
if (['z', 'c', 's'].includes(聲母) && 韻母 === 'i') 韻母 = 'ii';

// ng 拼細音時為 nj
const is細音 = ['eo', 'i', 'oe', 'u', 'yu'].some((x) => 韻母.startsWith(x));
if (聲母 === 'ng' && is細音) 聲母 = 'nj';

if (is('合口 或 模韻') && !['eo', 'oe', 'yu'].some((x) => 韻母.startsWith(x))) { // 合口字
  if (聲母 === 'g') 聲母 = 'gw';
  else if (聲母 === 'k') 聲母 = 'kw';
  else if (聲母 === 'h' && !韻母.startsWith('i')) 聲母 = 'f';
  else if (聲母 === 'j') 聲母 = 'w';
  else if (聲母 === '') 聲母 = 'w';
}

// m 韻尾在聲母為脣音時為 n
if (is('幫組') && 韻母.endsWith('m')) 韻母 = 韻母.slice(0, -1) + 'n';

if (is('入聲')) {
  if (韻母.endsWith('m')) 韻母 = 韻母.slice(0, -1) + 'p';
  else if (韻母.endsWith('n')) 韻母 = 韻母.slice(0, -1) + 't';
  else if (韻母.endsWith('ng')) 韻母 = 韻母.slice(0, -2) + 'k';
}

return 聲母 + 韻母 + 聲調;
});

/**
 * 推導《分韻撮要》擬音
 *
 * https://ayaka.shn.hk/fanwan/
 *
 * @author Ayaka
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的推導《分韻撮要》擬音
 */
export function fanwan(音韻地位, 字頭, 選項) {
  return schemas.fanwan(音韻地位, 字頭, 選項);
}

schemas.putonghua = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
const is = (x) => 音韻地位.屬於(x);

if (!音韻地位) return [
  ['$legacy', true],
  ['標調方式', [2, '數字', '附標']],
];

function 聲母規則() {
  if (is('幫滂並母') && is('東韻 三等 或 鍾微虞廢文元陽尤凡韻')) return 'f';
  if (is('幫母')) return 'b';
  if (is('滂母')) return 'p';
  if (is('並母')) return is('平聲') ? 'p' : 'b';
  if (is('明母')) return is('微虞文元陽凡韻') ? 'w' : 'm';

  if (is('端母')) return 'd';
  if (is('透母')) return 't';
  if (is('定母')) return is('平聲') ? 't' : 'd';
  if (is('泥母')) return 'n';
  if (is('來母')) return 'l';

  if (is('知母')) return 'zh';
  if (is('徹母')) return 'ch';
  if (is('澄母')) return is('平聲') ? 'ch' : 'zh';
  if (is('孃母')) return 'n';

  if (is('精母')) return 'z';
  if (is('清母')) return 'c';
  if (is('從母')) return is('平聲') ? 'c' : 'z';
  if (is('心母')) return 's';
  if (is('邪母')) return 's';

  if (is('莊母')) return 'zh';
  if (is('初母')) return 'ch';
  if (is('崇母')) return is('平聲') ? 'ch' : 'sh';
  if (is('生母')) return 'sh';
  if (is('俟母')) return 'sh';

  if (is('章母')) return 'zh';
  if (is('昌母')) return 'ch';
  if (is('常母')) return is('平聲') ? 'ch' : 'sh';
  if (is('書母')) return 'sh';
  if (is('船母')) return 'sh';
  if (is('日母')) return 'r';

  if (is('見母')) return 'g';
  if (is('溪母')) return 'k';
  if (is('羣母')) return is('平聲') ? 'k' : 'g';
  if (is('曉匣母')) return 'h';
  if (is('疑影云以母')) return '';

  throw new Error('無聲母規則');
}

function 舒聲韻母規則() {
  // 通攝
  if (is('通攝 三等 牙喉音')) return 'iong';
  if (is('通攝')) return is('幫組') ? 'eng' : 'ong';

  // 江攝
  if (is('江韻')) return is('牙喉音') ? 'iang' : 'uang';

  // 止攝
  if (is('止攝 合口')) return is('莊組') ? 'uai' : 'uei';
  if (is('止攝')) return is('牙喉音') ? 'i' : 'er';

  // 遇攝
  if (is('魚虞韻')) return 'ü';
  if (is('模韻')) return 'u';

  // 蟹攝
  if (is('祭韻 合口 莊組')) return 'uai';
  if (is('齊祭廢韻')) return is('合口') ? 'uei' : 'i';
  if (is('灰韻')) return is('開口') ? 'i' : 'uei';
  if (is('泰韻')) return is('開口') ? 'ai' : 'uei';
  if (is('佳韻 牙喉音')) return is('合口') ? 'ua' : 'ia';
  if (is('皆夬韻 牙喉音')) return is('合口') ? 'uai' : 'ie';
  if (is('佳皆夬韻')) return is('合口') ? 'uai' : 'ai';
  if (is('咍韻')) return 'ai';

  // 臻攝
  if (is('眞韻')) return is('合口') ? 'ün' : 'in';
  if (is('臻韻')) return 'en';
  if (is('痕韻 牙喉音')) return 'en';
  if (is('文韻 牙喉音')) return 'ün';
  if (is('痕魂文韻')) return 'uen';
  if (is('欣韻')) return 'in';
  if (is('元韻')) return is('合口') ? 'üan' : 'ian';

  // 山攝
  if (is('寒刪山韻 合口')) return 'uan';
  if (is('寒韻')) return 'an';
  if (is('刪山韻')) return is('牙喉音') ? 'ian' : 'an';
  if (is('仙先韻')) return is('合口') ? 'üan' : 'ian';

  // 效攝
  if (is('豪韻')) return 'ao';
  if (is('肴韻')) return is('牙喉音') ? 'iao' : 'ao';
  if (is('蕭宵韻')) return 'iao';

  // 果攝
  if (is('歌韻 一等 開口')) return is('牙喉音') ? 'e' : 'uo';
  if (is('歌韻 一等')) return 'uo';
  if (is('歌韻 三等 開口')) return 'ie';
  if (is('歌韻 三等')) return 'üe';

  // 假攝
  if (is('麻韻 二等 合口')) return 'ua';
  if (is('麻韻 二等')) return is('牙喉音') ? 'ia' : 'a';
  if (is('麻韻 三等')) return 'ie';

  // 宕攝
  if (is('唐韻 開口')) return 'ang';
  if (is('陽韻 開口')) return is('莊組') ? 'uang' : 'iang';
  if (is('唐陽韻')) return 'uang';

  // 梗攝
  if (is('梗攝 二等')) return is('合口') ? 'ong' : 'eng';
  if (is('梗攝')) return is('合口') ? 'iong' : 'ing';

  // 曾攝
  if (is('登韻')) return is('合口') ? 'ong' : 'eng';
  if (is('蒸韻')) return 'ing';

  // 流攝
  if (is('侯韻')) return 'ou';
  if (is('尤韻')) return is('幫組') ? 'ou' : 'iou';
  if (is('幽韻')) return is('幫組') ? 'iao' : 'iou';

  // 深攝
  if (is('侵韻')) return 'in';

  // 咸攝
  if (is('覃談韻')) return 'an';
  if (is('鹽添韻')) return 'ian';
  if (is('嚴咸銜韻')) return is('牙喉音') ? 'ian' : 'an';
  if (is('凡韻')) return 'uan';

  throw new Error('無韻母規則');
}

function 入聲韻母規則() {
  // 通攝
  if (is('通攝 一等')) return 'u';
  if (is('通攝 三等')) return is('精組') ? 'u' : 'ü';

  // 江攝
  if (is('江韻')) return is('牙喉音') ? 'üe' : 'uo';

  // 臻攝
  if (is('眞韻 合口')) return is('莊組') ? 'uai' : 'ü';
  if (is('眞欣韻')) return 'i';
  if (is('臻痕韻')) return 'e';
  if (is('魂韻')) return is('幫組') ? 'o' : 'u';
  if (is('文韻')) return 'ü';
  if (is('元韻 開口')) return 'ie';
  if (is('元韻')) return is('牙喉音') ? 'üe' : 'a';

  // 山攝
  if (is('寒韻 開口')) return is('牙喉音') ? 'e' : 'a';
  if (is('寒韻')) return 'uo';
  if (is('刪山韻 合口')) return 'ua';
  if (is('刪山韻')) return is('牙喉音') ? 'ia' : 'a';
  if (is('仙先韻 合口')) return 'üe';
  if (is('仙先韻')) return 'ie';

  // 宕攝
  if (is('唐韻 開口 牙喉音')) return 'e';
  if (is('唐韻')) return 'uo';
  if (is('陽韻')) return is('幫組') ? 'o' : 'üe';

  // 梗攝
  if (is('梗攝 二等')) return is('開口') ? 'e' : 'uo';
  if (is('梗攝')) return is('合口') ? 'ü' : 'i';

  // 曾攝
  if (is('登韻 開口')) return 'e';
  if (is('登韻')) return 'uo';
  if (is('蒸韻 合口')) return 'ü';
  if (is('蒸韻')) return is('莊組') ? 'e' : 'i';

  // 深攝
  if (is('侵韻')) return is('莊組') ? 'e' : 'i';

  // 咸攝
  if (is('覃談韻')) return is('牙喉音') ? 'e' : 'a';
  if (is('鹽添嚴韻')) return 'ie';
  if (is('咸銜凡韻')) return is('牙喉音') ? 'ia' : 'a';

  throw new Error('無韻母規則');
}

function 聲調規則() {
  if (is('全清 或 次清')) {
    if (is('平聲')) return '1';
    if (is('上聲')) return '3';
    if (is('去聲')) return '4';
    if (is('入聲')) return '';
  } else {
    if (is('平聲')) return '2';
    if (is('全濁 上聲')) return '4';
    if (is('上聲')) return '3';
    if (is('去聲')) return '4';
    if (is('全濁 入聲')) return '2';
    if (is('入聲')) return '4';
  }
  throw new Error('無聲調規則');
}

let 聲母 = 聲母規則();
let 韻母 = is('舒聲') ? 舒聲韻母規則() : 入聲韻母規則();
let 聲調 = 聲調規則();

if (['i', 'ü'].includes(韻母[0])) 聲母 = {
  g: 'j', k: 'q', h: 'x',
  z: 'j', c: 'q', s: 'x',
}[聲母] || 聲母;

if (韻母 === 'er') {
  if (聲母 === 'r') 聲母 = '';
  else 韻母 = 'i';
}

if (['n', 'l'].includes(聲母) && ['ua', 'uai', 'uang', 'uei'].includes(韻母)) 韻母 = 韻母.slice(1);
if (韻母[0] === 'ü' && !(['n', 'l'].includes(聲母) && ['ü', 'üe'].includes(韻母))) {
  if (!聲母) 聲母 = 'y';
  韻母 = 'u' + 韻母.slice(1);
}

if (['zh', 'sh', 'ch', 'r'].includes(聲母)) {
  if (韻母.startsWith('i')) {
    if (韻母[1] === 'n') 韻母 = 'e' + 韻母.slice(1);
    else if (韻母[1]) 韻母 = 韻母.slice(1);
  }
  if (韻母 === 'ue') 韻母 = 'uo';
}

if (['b', 'p', 'm', 'f', 'w'].includes(聲母) && 韻母[0] === 'u' && 韻母[1]) 韻母 = 韻母.slice(1);
if (['f', 'w'].includes(聲母) && 韻母[0] === 'i') 韻母 = 韻母.slice(1) || 'ei';

if (!聲母) {
  if (韻母 === 'ong') 韻母 = 'ueng';
  if (韻母[0] === 'i') 聲母 = 'y';
  if (韻母[0] === 'u') 聲母 = 'w';
  if (聲母 && 韻母[1] && 韻母[1] !== 'n') 韻母 = 韻母.slice(1);
}

if (韻母 === 'iou') 韻母 = 'iu';
if (韻母 === 'uei') 韻母 = 'ui';
if (韻母 === 'uen') 韻母 = 'un';

if (選項.標調方式 === '數字') return 聲母 + 韻母 + 聲調;
return 聲母 + (聲調 ? 韻母.replace(/(.*)a|(.*)[eo]|(.*)[iu]/, "$&" + " ̄́̌̀"[聲調]) : 韻母);
});

/**
 * 推導普通話
 *
 * @author graphemecluster
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的推導普通話
 */
export function putonghua(音韻地位, 字頭, 選項) {
  return schemas.putonghua(音韻地位, 字頭, 選項);
}

schemas.gwongzau = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
if (!音韻地位) return [['$legacy', true]];

const is = (x) => 音韻地位.屬於(x);

function 聲母規則() {
  if (is('幫母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻')) return 'f';
    return 'b';
  }
  if (is('滂母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻')) return 'f';
    return 'p';
  }
  if (is('並母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻')) return 'f';
    if (is('平聲')) return 'p';
    return 'b';
  }
  if (is('明母')) return 'm';

  if (is('端母')) return 'd';
  if (is('透母')) return 't';
  if (is('定母')) return is('平聲') ? 't' : 'd';
  if (is('泥母')) return 'n';
  if (is('來母')) return 'l';

  if (is('知母')) return 'z';
  if (is('徹母')) return 'c';
  if (is('澄母')) return is('平聲') ? 'c' : 'z';
  if (is('孃母')) return 'n';

  if (is('精母')) return 'z';
  if (is('清母')) return 'c';
  if (is('從母')) return is('平聲') ? 'c' : 'z';
  if (is('心母')) return 's';
  if (is('邪母')) return is('平聲') ? 'c' : 'z'; // 塞擦音多於擦音

  if (is('莊母')) return 'z';
  if (is('初母')) return 'c';
  if (is('崇母')) return is('平聲') ? 'c' : 'z';
  if (is('生母')) return 's';
  if (is('俟母')) return is('平聲') ? 'c' : 'z';

  if (is('章母')) return 'z';
  if (is('昌母')) return 'c';
  if (is('常母')) return 's'; // 擦音多於塞擦音
  if (is('書母')) return 's';
  if (is('船母')) return 's';
  if (is('日母')) return 'j';

  if (is('見母')) return 'g';
  if (is('溪母')) return 'h'; // 多數擦化
  if (is('羣母')) return is('平聲') ? 'k' : 'g';
  if (is('疑母')) return 'ng'; // ng 拼細音時為 j，詳後

  if (is('曉母')) return 'h';
  if (is('匣母')) {
    if (is('合口 或 模韻')) return 'j'; // 非 yu 前為 w，詳後
    return 'h';
  }
  if (is('影云以母')) {
    if (is('三四等')) return 'j'; // 非 yu 前為 w，詳後
    return '';
  }

  throw new Error('無聲母規則');
}

function 韻母規則() {
  // 通攝
  if (is('東冬鍾韻')) return 'ung';

  // 江攝
  if (is('江韻 幫組')) return 'ong';
  if (is('江韻 舌齒音')) return 'oeng';
  if (is('江韻 牙喉音')) return 'ong';

  // 止攝
  if (is('支脂之微韻 幫組')) return 'ei';
  if (is('支脂之微韻 開口 舌齒音 端組')) return 'ei';
  if (is('支脂之微韻 開口 舌齒音 來母')) return 'ei';
  if (is('支脂之微韻 開口 舌齒音 孃母')) return 'ei';
  if (is('支脂之微韻 開口 舌齒音')) return 'i';
  if (is('支脂之微韻 開口 牙喉音 疑母')) return 'i';
  if (is('支脂之微韻 開口 牙喉音 影母')) return 'i';
  if (is('支脂之微韻 開口 牙喉音 云母')) return 'i';
  if (is('支脂之微韻 開口 牙喉音 以母')) return 'i';
  if (is('支脂之微韻 開口 牙喉音')) return 'ei';
  if (is('支脂之微韻 合口 舌齒音')) return 'eoi';
  if (is('支脂之微韻 合口 牙喉音')) return 'ai';

  // 遇攝
  if (is('魚虞韻 幫組 幫滂並母')) return 'u';
  if (is('魚虞韻 幫組 明母')) return 'ou';
  if (is('魚虞韻 舌齒音 端組')) return 'eoi';
  if (is('魚虞韻 舌齒音 來母')) return 'eoi';
  if (is('魚虞韻 舌齒音 孃母')) return 'eoi';
  if (is('魚虞韻 舌齒音 精組')) return 'eoi';
  if (is('魚虞韻 舌齒音 莊組')) return 'o';
  if (is('魚虞韻 舌齒音')) return 'yu';
  if (is('魚虞韻 牙喉音 見溪羣母')) return 'eoi';
  if (is('魚虞韻 牙喉音 曉匣母')) return 'eoi';
  if (is('魚虞韻 牙喉音')) return 'yu';
  if (is('模韻 脣音')) return 'ou';
  if (is('模韻 舌齒音')) return 'ou';
  if (is('模韻 牙喉音 疑母')) return '';
  if (is('模韻 牙喉音')) return 'u';

  // 蟹攝
  if (is('齊韻')) return 'ai';
  if (is('祭韻 幫組')) return 'ai';
  if (is('祭韻 開口')) return 'ai';
  if (is('祭韻 合口 舌齒音')) return 'eoi';
  if (is('祭韻 合口 以母')) return 'eoi';
  if (is('祭韻 合口 牙喉音')) return 'ai';
  if (is('泰韻 幫組')) return 'ui';
  if (is('泰韻 開口 舌齒音 精組')) return 'oi';
  if (is('泰韻 開口 舌齒音')) return 'aai';
  if (is('泰韻 開口 牙喉音')) return 'oi';
  if (is('泰韻 合口 舌齒音')) return 'eoi';
  if (is('泰韻 合口 牙喉音 疑母')) return 'oi';
  if (is('泰韻 合口 牙喉音')) return 'ui';
  if (is('佳皆夬韻 幫組')) return 'aai';
  if (is('佳皆夬韻 開口')) return 'aai';
  if (is('佳皆夬韻 合口 舌齒音')) return 'eoi';
  if (is('佳皆夬韻 合口')) return 'aai';
  if (is('灰韻 舌齒音')) return 'eoi';
  if (is('灰韻 疑母')) return 'oi';
  if (is('灰韻')) return 'ui';
  if (is('咍韻')) return 'oi';
  if (is('廢韻')) return 'ai';

  // 臻攝
  if (is('眞韻 幫組')) return 'an';
  if (is('眞韻 開口')) return 'an';
  if (is('眞韻 合口 舌齒音')) return 'eon';
  if (is('眞韻 合口 牙喉音')) return 'an';
  if (is('臻文欣韻')) return 'an';
  if (is('元韻 幫組')) return 'aan';
  if (is('元韻 開口')) return 'in';
  if (is('元韻 合口')) return 'yun';
  if (is('魂韻 幫組')) return 'un';
  if (is('魂韻 端組')) return 'eon';
  if (is('魂韻 來母')) return 'eon';
  if (is('魂韻 精組')) return 'yun';
  if (is('魂韻 牙喉音')) return 'an';
  if (is('痕韻')) return 'an';

  // 山攝
  if (is('寒韻 幫組')) return 'un';
  if (is('寒韻 開口 舌齒音')) return 'aan';
  if (is('寒韻 開口 牙喉音')) return 'on';
  if (is('寒韻 合口 舌齒音')) return 'yun';
  if (is('寒韻 合口 牙喉音')) return 'un';
  if (is('刪山韻')) return 'aan';
  if (is('仙先韻 幫組')) return 'in';
  if (is('仙先韻 開口')) return 'in';
  if (is('仙先韻 合口')) return 'yun';

  // 效攝
  if (is('蕭宵韻')) return 'iu';
  if (is('肴韻')) return 'aau';
  if (is('豪韻')) return 'ou';

  // 果攝
  if (is('歌韻 一等')) return 'o';
  if (is('歌韻 三等 脣音')) return 'e';
  if (is('歌韻 三等 開口')) return 'e';
  if (is('歌韻 三等 合口')) return 'oe';

  // 假攝
  if (is('麻韻 二等')) return 'aa';
  if (is('麻韻 三等')) return 'e';

  // 宕攝
  if (is('陽韻 幫組')) return 'ong';
  if (is('陽韻 開口 莊組')) return 'ong';
  if (is('陽韻 開口')) return 'oeng';
  if (is('陽韻 合口')) return 'ong';
  if (is('唐韻')) return 'ong';

  // 梗攝
  if (is('庚韻 二等')) return 'ang';
  if (is('庚韻 三等 莊組')) return 'ang';
  if (is('庚韻 三等')) return 'ing';
  if (is('耕韻')) return 'ang';
  if (is('清青韻')) return 'ing';

  // 曾攝
  if (is('蒸韻')) return 'ing';
  if (is('登韻')) return 'ang';

  // 流攝
  if (is('尤侯幽韻')) return 'au';

  // 深攝
  if (is('侵韻')) return 'am'; // m 韻尾在聲母為脣音時為 n，詳後，下同

  // 咸攝
  if (is('覃談韻 幫組')) return 'aam';
  if (is('覃談韻 舌齒音')) return 'aam';
  if (is('覃談韻 牙喉音')) return 'om'; // -om 併入 -am，詳後
  if (is('鹽添嚴韻')) return 'im';
  if (is('咸銜凡韻')) return 'aam';

  throw new Error('無韻母規則');
}

function 聲調規則() {
  if (is('全清 或 次清')) {
    if (is('平聲')) return '1'; // 陰平
    if (is('上聲')) return '2'; // 陰上
    if (is('去聲')) return '3'; // 陰去
    if (is('入聲')) return '1'; // 陰入。長元音為 3，詳後
  } else {
    if (is('平聲')) return '4'; // 陽平
    if (is('全濁 上聲')) return '6'; // 陽去，全濁上變去
    if (is('上聲')) return '5'; // 陽上
    if (is('去聲')) return '6'; // 陽去
    if (is('入聲')) return '6'; // 陽入
  }
  throw new Error('無聲調規則');
}

function is長元音(韻母) {
  if (['aam', 'aan', 'im', 'in', 'om', 'on', 'ong', 'oeng', 'un', 'yun'].includes(韻母)) return true;
  if (['am', 'an', 'ang', 'eon', 'ing', 'ung'].includes(韻母)) return false;
  throw new Error('無法判斷元音長短：' + 韻母);
}

let 聲母 = 聲母規則();
let 韻母 = 韻母規則();
let 聲調 = 聲調規則();

// ng 拼細音時為 j
const is細音 = ['eo', 'i', 'oe', 'u', 'yu'].some((x) => 韻母.startsWith(x));
if (聲母 === 'ng' && is細音) 聲母 = 'j';

// 陰入分化
if (is('入聲') && 聲調 === '1' && is長元音(韻母)) 聲調 = '3';

if (is('合口 或 模韻') && !['eo', 'oe', 'yu'].some((x) => 韻母.startsWith(x))) { // 合口字
  if (聲母 === 'g' && !韻母.startsWith('u')) 聲母 = 'gw';
  else if (聲母 === 'k' && !韻母.startsWith('u')) 聲母 = 'kw';
  else if (聲母 === 'h' && !韻母.startsWith('i')) 聲母 = 'f';
  else if (聲母 === 'j') 聲母 = 'w';
  else if (聲母 === '') 聲母 = 'w';
}

// -om 併入 -am
if (韻母 === 'om') 韻母 = 'am';

// m 韻尾在聲母為脣音時為 n
if (is('幫組') && 韻母.endsWith('m')) 韻母 = 韻母.slice(0, -1) + 'n';

if (is('入聲')) {
  if (韻母.endsWith('m')) 韻母 = 韻母.slice(0, -1) + 'p';
  else if (韻母.endsWith('n')) 韻母 = 韻母.slice(0, -1) + 't';
  else if (韻母.endsWith('ng')) 韻母 = 韻母.slice(0, -2) + 'k';
}

return 聲母 + 韻母 + 聲調;
});

/**
 * 推導廣州音
 *
 * https://ayaka.shn.hk/teoi/
 *
 * @author Ayaka
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的推導廣州音
 */
export function gwongzau(音韻地位, 字頭, 選項) {
  return schemas.gwongzau(音韻地位, 字頭, 選項);
}

schemas.zaonhe = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
const is = (x) => 音韻地位.屬於(x);

if (!音韻地位) return [
  ['$legacy', true],
  ['文白讀', [3, '文上白下', '僅白讀', '僅文讀', '主流層']],
  ['標調方式', [3, '數字', '折線', '附標', '弗標']],
  ['分尖團', [1, '分尖團', '區分⟨情､琴⟩', '區分⟨徐､齊⟩']],
  ['區分⟨衣､煙⟩', true],
  ['區分⟨來､蘭⟩', true],
  ['區分⟨袜､麦⟩', true],
  ['區分⟨打､黨⟩', true],
  ['區分⟨肉､月⟩', true],
  ['區分⟨國､骨⟩', true],
  ['區分⟨于､園⟩', true],
  ['區分⟨干､官⟩', true],
  ['區分⟨困､孔⟩', true],
  ['區分⟨羣､窮⟩', true],
];

const 分衣煙 = 選項['區分⟨衣､煙⟩'];
const 分來蘭 = 選項['區分⟨來､蘭⟩'];
const 分袜麦 = 選項['區分⟨袜､麦⟩'];
const 分打黨 = 選項['區分⟨打､黨⟩'];
const 分肉月 = 選項['區分⟨肉､月⟩'];
const 分國骨 = 選項['區分⟨國､骨⟩'];
const 分于園 = 選項['區分⟨于､園⟩'];
const 分干官 = 選項['區分⟨干､官⟩'];
const 分困恐 = 選項['區分⟨困､孔⟩'];
const 分羣窮 = 選項['區分⟨羣､窮⟩'];

const 元音 = 'iyɨʉɯuɪʏʊeøɘɵɤoəɛœɜɞʌɔæɐaɶäɑɒ';
const 元音Re = new RegExp("[" + 元音 + "]");
const 閉前元音 = 'iy';
const 元音附標 = '̃̈';
const 顎化分尖團 = {
  'n': 'ɲ',
  'k': 'tɕ',
  'kʰ': 'tɕʰ',
  'h': 'ɕ',
  'ŋ': 'ɲ',
  'g': 'dʑ',
};
const 顎化分情琴 = {
  'ts': 'tɕ',
  'tsʰ': 'tɕʰ',
  's': 'ɕ',
  'z': 'ʑ',
};
const 顎化弗分尖團 = {
  'ʑ': 'dʑ',
};
const 數字標調 = {
  '陰平': '⁵³',
  '陰去': '³³⁴',
  '陽去': '²³',
  '陰入': '⁵⁵',
  '陽入': '¹²',
};
const 折線標調 = {
  '陰平': '˥˧',
  '陰去': '˧˧˦',
  '陽去': '˨˧',
  '陰入': '˥',
  '陽入': '˩˨',
};
const 附標標調 = {
  '陰平': '̂',
  '陰去': '̄',
  '陽去': '̀',
  '陰入': '̋',
  '陽入': '̏',
};

function 聲母規則(文讀) {
  // 顎化規則由獨立個 function 來做
  // '▽' 標識弗是主流層
  // 表一（of「上海市区方言志」）
  if (is('幫滂母 東鍾微虞廢文元陽尤凡韻 三等')) return 'f'; // 理論白讀 /p/
  if (is('並母 東鍾微虞廢文元陽尤凡韻 三等')) return 文讀 ? 'v' : '▽▽b'; // 「防」等
  if (is('明母 鍾微虞廢文元陽凡韻')) return 文讀 ? 'v' : '▽▽m'; // 「蚊」等
  if (is('幫母')) return 'p';
  if (is('滂母')) return 'pʰ';
  if (is('並母')) return 'b';
  if (is('明母')) return 'm';
  // 表二
  if (is('端母')) return 't';
  if (is('透母')) return 'tʰ';
  if (is('定母')) return 'd';
  if (is('泥孃母')) return 'n';
  if (is('來母')) return 'l';
  // 表三
  if (is('精知莊章母')) return 'ts';
  if (is('清徹初昌母')) return 'tsʰ';
  if (is('心生書母')) return 's';
  if (is('日母')) return 文讀 ? is('止攝 開口 三等') ? '▽▽ɦ' : 'z' : 'n'; // 止開三部分在表五
  if (is('從邪澄崇俟常船母')) return 'z';
  // 表四
  if (is('見母')) return 'k';
  if (is('溪母')) return 'kʰ';
  if (is('曉母')) return 'h';
  if (is('日母')) return 'n';
  if (is('羣母')) return 'g';
  // 表五
  if (is('疑母 開合中立 遇攝 一等 上聲')) return 文讀 ? '▽▽ʔ' : 'ŋ'; // 「五」。表中無
  if (is('疑母 開合中立')) return 文讀 ? '▽▽ɦ' : 'ŋ'; // 「吾」等
  if (is('疑母 合口 果攝 一等')) return 文讀 ? '▽▽ɦ' : 'ŋ'; // 「臥」
  if (is('疑母 合口 麻泰韻')) return 文讀 ? '▽▽ɦ' : 'ŋ'; // 「外」「瓦」
  if (is('疑母 合口')) return 文讀 ? 'ɦ' : '▽▽ŋ'; // 「魏」等
  if (is('疑母 開口 二三四等')) return 文讀 ? '▽▽ɦ' : 'ŋ'; // 「言」等
  if (is('疑母 開口 一等')) return 'ŋ';
  if (is('以母 脂韻 合口')) return 'v'; // 表中無
  // if (is('以母 上聲 通攝')) return 'ʔ'; // 似無規律。弗收
  // if (is('以母 上聲') && '以苡已勇蛹涌恿甬俑踊慂𧻹悀埇𧗴'.includes(字頭)) return 'ʔ';
  if (is('云母 上去聲 梗攝')) return 'ʔ'; // 表中無
  if (is('匣云以母')) return 'ɦ';
  if (is('影母')) return 'ʔ';
  throw new Error('無聲母規則');
}

function 韻母規則(文讀) {
  // 特殊韻母
  if (is('日母 支脂之微韻 開口') && 文讀) return 'əɭ';
  // if (is('明母 侯韻') && !文讀) return '̩';
  // if (is('明母 虞韻') && !文讀) return '̩';
  // if ((is('疑母 遇攝 開口 三等') || is('疑母 遇攝 開合中立 一等')) && !文讀) return '̩';

  // 通攝
  if (is('東冬鍾韻 舒聲 三等 牙音 疑母')) return 'ioŋ';
  if (is('東冬鍾韻 舒聲 三等 牙音')) return 文讀 ? 'oŋ' : 'ioŋ▽'; // 「龔」等
  if (is('東冬鍾韻 舒聲 三等 日母')) return 文讀 ? 'oŋ▽' : 'ioŋ'; // 「茸」等
  if (is('東冬鍾韻 舒聲 三等 孃母')) return 'ioŋ';
  if (is('東冬鍾韻 舒聲 三等 喉音')) return 'ioŋ';
  if (is('東冬鍾韻 舒聲')) return 'oŋ'; // 脣音白讀僅「夢」。待考
  if (is('東冬鍾韻 入聲 三等 牙喉音')) return 分肉月 ? 'ioʔ' : 'yɪʔ';
  if (is('東冬鍾韻 入聲 三等 日母')) return 文讀 ? 'oʔ▽' : 分肉月 ? 'ioʔ' : 'yɪʔ'; // 「肉」等
  if (is('東冬鍾韻 入聲 三等 孃母')) return 分肉月 ? 'ioʔ' : 'yɪʔ';
  if (is('東冬鍾韻 入聲')) return 'oʔ';

  // 江攝
  if (is('江韻 舒聲 牙音')) return 文讀 ? 分打黨 ? 'iã▽' : 'iɑ̃▽' : 'ɑ̃'; // 「江」等
  if (is('江韻 舒聲')) return 'ɑ̃';
  if (is('江韻 入聲 疑母')) return 文讀 ? 分袜麦 ? 'iɑʔ▽' : 'iɐʔ▽' : 'oʔ'; // 「樂」等。疑母文讀同匣母
  // if (is('江韻 入聲 牙音')) return 文讀 ? 分肉月 ? 'ioʔ▽' : 'yɪʔ▽' : 'oʔ'; // 「確」等。箇個同「上海市区方言志」音系
  if (is('江韻 入聲 牙音')) return 文讀 ? 分袜麦 ? 'iɑʔ▽' : 'iɐʔ▽' : 'oʔ'; // 「確」等。箇個同「上海土白集字」音系
  if (is('江韻 入聲 喉音')) return 文讀 ? 分袜麦 ? 'iɑʔ▽' : 'iɐʔ▽' : 'oʔ'; // 「學」等
  if (is('江韻 入聲')) return 'oʔ';

  // 止攝
  if (is('支脂之微韻 脣音')) return 'i';
  if (is('支脂之微韻 開口 舌齒音 端組')) return 'i';
  if (is('支脂之微韻 開口 舌齒音 來孃日母')) return 'i';
  if (is('支脂之微韻 開口 舌齒音')) return 'z̩';
  if (is('支脂之微韻 開口 牙喉音')) return 'i';
  if (is('支脂之微韻 合口 舌齒音 來孃母')) return 'e';
  if (is('支脂之微韻 合口 舌齒音 日母')) return 文讀 ? 'ø' : 'y▽'; // 「蕊」
  if (is('支脂之微韻 合口 舌齒音')) return 文讀 ? 'ø' : 'z̩▽'; // 「吹」等
  if (is('支脂之微韻 合口 牙音 疑母')) return 'ue';
  if (is('支脂之微韻 合口 牙音')) return 文讀 ? 'ue' : 'y▽'; // 「跪」等
  if (is('脂韻 合口 以母')) return 'i';
  if (is('支脂之微韻 合口 喉音')) return 'ue';

  // 遇攝
  if (is('魚虞韻 脣音')) return 'u';
  if (is('魚韻 舌齒音 端組')) return 文讀 ? 'y' : 'i▽';
  if (is('魚虞韻 舌齒音 端組')) return 'y';
  if (is('魚韻 舌齒音 來母')) return 文讀 ? 'y' : 'i▽'; // 「呂」等
  if (is('魚虞韻 舌齒音 來母')) return 'y';
  if (is('魚韻 舌齒音 孃母')) return 文讀 ? 'y' : 'i▽'; // 「女」（老派）
  if (is('魚虞韻 舌齒音 孃母')) return 'y';
  if (is('魚韻 舌齒音 精組')) return 文讀 ? 'y' : 'i▽'; // 「絮」等
  if (is('魚虞韻 舌齒音 精組')) return 'y';
  if (is('魚韻 舌齒音 莊組')) return 文讀 ? 'u' : 'z̩▽'; // 「鋤」等
  if (is('魚虞韻 舌齒音 莊組')) return 'u';
  if (is('魚韻 舌齒音 日母')) return 文讀 ? 'z̩' : 'i▽'; // 白讀類推無實例
  if (is('魚虞韻 舌齒音 日母')) return 文讀 ? 'z̩' : 'y▽'; // 白讀類推無實例
  if (is('魚虞韻 舌齒音')) return 'z̩';
  if (is('魚虞韻 牙喉音')) return 'y'; // 白讀 /e/。「許」「鋸」。白讀 /i/。「去」「渠」。屬於特殊存古，且弗唯一，故弗用
  if (is('模韻')) return 'u';

  // 蟹攝
  if (is('齊韻')) return 'i';
  if (is('祭韻 脣音')) return 'i';
  if (is('祭韻 開口 舌齒音 來母')) return 'i';
  if (is('祭韻 開口 舌齒音 精莊組')) return 'i';
  if (is('祭韻 開口 舌齒音')) return 'z̩';
  if (is('祭韻 開口 牙喉音')) return 'i';
  if (is('祭韻 合口 舌齒音 日母')) return 文讀 ? 'ø' : 'i▽'; // 白讀類推無實例
  if (is('祭韻 合口 舌齒音')) return 'ø';
  if (is('祭韻 合口 牙喉音')) return 'ue';
  if (is('泰韻 脣音')) return 'e';
  if (is('泰韻 開口 舌齒音')) return 'a';
  if (is('泰韻 開口 牙喉音')) return 'e';
  if (is('泰韻 合口 舌齒音 來母')) return 'e';
  if (is('泰韻 合口 舌齒音 精組')) return 'ø';
  if (is('泰韻 合口 舌齒音')) return 'e';
  if (is('泰韻 合口 牙喉音 疑母')) return 文讀 ? 'ue▽' : 'a'; // 「外」
  if (is('泰韻 合口 牙喉音')) return 'ue';
  if (is('佳皆夬韻 脣音')) return 'a';
  if (is('佳皆夬韻 開口 舌齒音 孃母')) return 'i';
  if (is('佳皆夬韻 開口 舌齒音 來母')) return 'e';
  if (is('佳皆夬韻 開口 舌齒音')) return 'a';
  if (is('佳皆夬韻 開口 牙喉音 匣母')) return 文讀 ? 'ie' : 'a▽'; // 「械」等。理論上還有 /ia/ 個白讀
  if (is('佳皆夬韻 開口 牙喉音')) return 文讀 ? 'ia' : 'a▽'; // 「解」等
  if (is('佳皆夬韻 合口 舌齒音')) return 'ø';
  if (is('佳皆夬韻 合口 牙喉音 疑母')) return 文讀 ? 'ue' : 'a▽'; // 字典弗曾收「聵」
  if (is('佳皆夬韻 合口 牙喉音')) return 文讀 ? 'ua' : 'o▽'; // 「卦」等
  if (is('灰韻 脣音')) return 'e';
  if (is('灰韻 舌齒音 精組')) return 'ø';
  if (is('灰韻 舌齒音')) return 'e';
  if (is('灰韻 牙喉音')) return 'ue';
  if (is('咍韻')) return 'e';
  if (is('廢韻 牙喉音')) return 'ue';
  if (is('廢韻')) return 'i';

  // 臻攝
  if (is('眞韻 舒聲 脣音')) return 'ɪɲ';
  if (is('眞韻 舒聲 開口 舌齒音 知章莊組')) return 'əŋ';
  if (is('眞韻 舒聲 開口 舌齒音 日母')) return 文讀 ? 'əŋ▽' : 'ɪɲ'; // 「人」等
  if (is('眞韻 舒聲 開口 舌齒音')) return 'ɪɲ';
  if (is('眞韻 舒聲 開口 牙喉音')) return 'ɪɲ';
  if (is('眞韻 舒聲 合口 舌齒音 精組')) return 'ɪɲ';
  if (is('眞韻 舒聲 合口 舌齒音 日母')) return 文讀 ? 'əŋ▽' : 'ɪɲ'; // 「閏」等
  if (is('眞韻 舒聲 合口 舌齒音')) return 'əŋ';
  if (is('眞韻 舒聲 合口 牙喉音')) return 分羣窮 ? 'yɪɲ' : 'ioŋ';
  if (is('眞韻 入聲 脣音')) return 'iɪʔ';
  if (is('眞韻 入聲 開口 舌齒音 知章莊組')) return 'əʔ';
  if (is('眞韻 入聲 開口 舌齒音 日母')) return 文讀 ? 'əʔ▽' : 'iɪʔ'; // 「日」等
  if (is('眞韻 入聲 開口 舌齒音')) return 'iɪʔ';
  if (is('眞韻 入聲 開口 牙喉音')) return 'iɪʔ';
  if (is('眞韻 入聲 合口 舌齒音 精組')) return 'iɪʔ';
  if (is('眞韻 入聲 合口 舌齒音 來母')) return 'iɪʔ';
  if (is('眞韻 入聲 合口 舌齒音 日母')) return 文讀 ? 'əʔ▽' : 'iɪʔ';
  if (is('眞韻 入聲 合口 舌齒音')) return 'əʔ';
  if (is('眞韻 入聲 合口 牙喉音')) return 'yɪʔ';
  if (is('臻文欣韻 舒聲 脣音')) return 'əŋ';
  if (is('臻文欣韻 舒聲 開口')) return 'ɪɲ';
  if (is('臻文欣韻 舒聲 合口')) return 分羣窮 ? 'yɪɲ' : 'ioŋ';
  if (is('臻文欣韻 入聲 脣音')) return 'əʔ';
  if (is('臻文欣韻 入聲 開口')) return 'iɪʔ';
  if (is('臻文欣韻 入聲 合口')) return 'yɪʔ';
  if (is('元韻 舒聲 脣音')) return 分來蘭 ? 'æ' : 'e';
  if (is('元韻 舒聲 開口')) return 分衣煙 ? 'iɪ' : 'i';
  if (is('元韻 舒聲 合口')) return 分于園 ? 'yø' : 'y';
  if (is('元韻 入聲 脣音')) return 'ɐʔ';
  if (is('元韻 入聲 開口')) return 'iɪʔ';
  if (is('元韻 入聲 合口')) return 'yɪʔ';
  if (is('魂韻 舒聲 牙喉音 疑母')) return 文讀 ? 分困恐 ? 'uəŋ' : 'oŋ' : 'əŋ▽'; // 「諢」。白讀類推無實例
  if (is('魂韻 舒聲 牙喉音')) return 分困恐 ? 'uəŋ' : 'oŋ';
  if (is('魂韻 舒聲')) return 'əŋ';
  if (is('魂韻 入聲 牙喉音 疑母')) return 文讀 ? 分國骨 ? 'uəʔ▽' : 'oʔ▽' : 'əʔ'; // 「兀」
  if (is('魂韻 入聲 牙喉音')) return 分國骨 ? 'uəʔ' : 'oʔ';
  if (is('魂韻 入聲')) return 'əʔ';
  if (is('痕韻 舒聲')) return 'əŋ';
  if (is('痕韻 入聲')) return 'iɪʔ';

  // 山攝
  if (is('寒韻 舒聲 脣音')) return 'ø';
  if (is('寒韻 舒聲 開口 舌齒音')) return 分來蘭 ? 'æ' : 'e';
  if (is('寒韻 舒聲 開口 牙喉音')) return 'ø';
  if (is('寒韻 舒聲 合口 舌齒音')) return 'ø';
  if (is('寒韻 舒聲 合口 牙喉音')) return 分干官 ? 'uø' : 'ø';
  if (is('寒韻 入聲 脣音')) return 'əʔ';
  if (is('寒韻 入聲 開口 舌齒音')) return 'ɐʔ';
  if (is('寒韻 入聲 開口 牙喉音')) return 'əʔ';
  if (is('寒韻 入聲 合口 舌齒音')) return 'əʔ';
  if (is('寒韻 入聲 合口 牙喉音 見曉影母')) return 'uɐʔ';
  if (is('寒韻 入聲 合口 牙喉音 疑母')) return 文讀 ? 分國骨 ? 'uəʔ▽' : 'oʔ▽' : 'əʔ'; // 字典弗曾收「枂」
  if (is('寒韻 入聲 合口 牙喉音')) return 分國骨 ? 'uəʔ' : 'oʔ';
  if (is('刪山韻 舒聲 脣音')) return 分來蘭 ? 'æ' : 'e';
  if (is('刪山韻 舒聲 開口 舌齒音')) return 分來蘭 ? 'æ' : 'e';
  if (is('刪山韻 舒聲 合口 舌齒音')) return 'ø';
  if (is('刪山韻 舒聲 開口 牙喉音')) return 文讀 ? 分衣煙 ? 'iɪ▽' : 'i▽' : 分來蘭 ? 'æ' : 'e'; // 「間」等
  if (is('刪山韻 舒聲 合口 牙喉音')) return 分來蘭 ? 'uæ' : 'ue';
  if (is('刪山韻 入聲 脣音')) return 'ɐʔ';
  if (is('刪山韻 入聲 開口 舌齒音 日母')) return 文讀 ? 'əʔ▽' : 'iɪʔ'; // 字典弗曾收「𩭿」
  if (is('刪山韻 入聲 開口 舌齒音')) return 'ɐʔ';
  if (is('刪山韻 入聲 開口 牙喉音 匣母')) return 文讀 ? 'iɐʔ▽' : 'ɐʔ'; // 「轄」
  if (is('刪山韻 入聲 開口 牙喉音 疑母')) return 文讀 ? 'iɐʔ▽' : 'ɐʔ'; // 「齾」
  if (is('刪山韻 入聲 開口 牙喉音')) return 'ɐʔ';
  if (is('刪山韻 入聲 合口 舌齒音')) return 'əʔ';
  if (is('刪山韻 入聲 合口 牙喉音 疑母')) return 文讀 ? 'uɐʔ▽' : 'ɐʔ'; // 字典弗曾收「刖」
  if (is('刪山韻 入聲 合口 牙喉音')) return 'uɐʔ';
  if (is('仙先韻 舒聲 脣音')) return 分衣煙 ? 'iɪ' : 'i';
  if (is('仙先韻 舒聲 開口 知章組')) return 'ø';
  if (is('仙先韻 舒聲 開口 日母')) return 文讀 ? 'ø' : 分衣煙 ? 'iɪ▽' : 'i▽'; // 「燃」等
  if (is('仙先韻 舒聲 開口')) return 分衣煙 ? 'iɪ' : 'i';
  if (is('仙先韻 舒聲 合口 舌齒音 精組')) return 分衣煙 ? 'iɪ' : 'i'; // 白讀 /æ/ 或 /ø/ 只有「全」特殊存古。故弗列
  if (is('仙先韻 舒聲 合口 舌齒音 來母')) return 分衣煙 ? 'iɪ' : 'i';
  if (is('仙先韻 舒聲 合口 舌齒音 日母')) return 文讀 ? 'ø▽' : 分于園 ? 'yø' : 'y'; // 「軟」等
  if (is('仙先韻 舒聲 合口 舌齒音')) return 'ø';
  if (is('仙先韻 舒聲 合口 牙喉音')) return 分于園 ? 'yø' : 'y';
  if (is('仙先韻 入聲 脣音')) return 'iɪʔ';
  if (is('仙先韻 入聲 開口 舌齒音 知莊章組')) return 'əʔ';
  if (is('仙先韻 入聲 開口 舌齒音 日母')) return 文讀 ? 'əʔ▽' : 'iɪʔ'; // 「熱」等
  if (is('仙先韻 入聲 開口 舌齒音')) return 'iɪʔ';
  if (is('仙先韻 入聲 開口 牙喉音')) return 'iɪʔ';
  if (is('仙先韻 入聲 合口 舌齒音 知莊章組')) return 'əʔ';
  if (is('仙先韻 入聲 合口 舌齒音 日母')) return 文讀 ? 'əʔ▽' : 'iɪʔ'; // 「爇」等
  if (is('仙先韻 入聲 合口 舌齒音')) return 'iɪʔ';
  if (is('仙先韻 入聲 合口 牙喉音')) return 'yɪʔ';

  // 效攝
  if (is('蕭宵韻 知章組')) return 'ɔ';
  if (is('蕭宵韻')) return 'iɔ';
  if (is('肴韻 脣音')) return 'ɔ';
  if (is('肴韻 舌齒音')) return 'ɔ';
  if (is('肴韻 牙喉音')) return 文讀 ? 'iɔ▽' : 'ɔ'; // 「交」等
  if (is('豪韻')) return 'ɔ';

  // 果攝
  if (is('歌韻 一等 開口 端組')) return 文讀 ? 'u' : 'a▽'; // 「大」等
  if (is('歌韻 一等 開口 喉音')) return 文讀 ? 'u' : 'a▽'; // 「何」等
  if (is('歌韻 一等')) return 'u';
  if (is('歌韻 三等 開口')) return 文讀 ? 'ia▽' : 'a'; // 「茄」等
  if (is('歌韻 三等 合口')) return 文讀 ? 'ia▽' : 分于園 ? 'io' : 'y'; // 「瘸」等

  // 假攝
  if (is('麻韻 二等 脣音')) return 文讀 ? 'a▽' : 'o'; // 「馬」等
  if (is('麻韻 二等 舌齒音')) return 文讀 ? 'a▽' : 'o'; // 「差」等
  if (is('麻韻 二等 開口 牙音')) return 文讀 ? 'ia▽' : 'a'; // 「家」等
  if (is('麻韻 二等 開口 喉音')) return 文讀 ? 'ia▽' : 'o'; // 「下」等
  if (is('麻韻 二等 合口 牙喉音')) return 文讀 ? 'ua▽' : 'o'; // 「花」等。脆麻花～
  if (is('麻韻 三等 脣音')) return 文讀 ? 'i▽' : 'ia'; // 「乜」
  if (is('麻韻 三等 舌齒音 精知組')) return 文讀 ? 'i▽' : 'ia'; // 「姐」等
  if (is('麻韻 三等 舌齒音 日母')) return 文讀 ? 'a' : 'ia▽'; // 「惹」等
  if (is('麻韻 三等 舌齒音 章組')) return 文讀 ? 'o' : 'a▽'; // 「射」等
  if (is('麻韻 三等 喉音')) return 文讀 ? 'ie▽' : 'ia'; // 「也」等

  // 宕攝
  if (is('陽韻 舒聲 脣音')) return 'ɑ̃';
  if (is('陽韻 舒聲 舌齒音 舌音 來孃母')) return 分打黨 ? 'iã' : 'iɑ̃';
  if (is('陽韻 舒聲 舌齒音 舌音')) return 分打黨 ? 'ã' : 'ɑ̃';
  if (is('陽韻 舒聲 舌齒音 齒音 精組')) return 分打黨 ? 'iã' : 'iɑ̃';
  if (is('陽韻 舒聲 舌齒音 齒音 日母')) return 文讀 ? 'ɑ̃▽' : 分打黨 ? 'iã' : 'iɑ̃'; // 「壤」等
  if (is('陽韻 舒聲 舌齒音')) return 'ɑ̃';
  if (is('陽韻 舒聲 開口 牙喉音')) return 分打黨 ? 'iã' : 'iɑ̃';
  if (is('陽韻 舒聲 合口 牙喉音 云母')) return 文讀 ? 'uɑ̃' : 分打黨 ? 'iã▽' : 'iɑ̃▽'; // 「旺」等
  if (is('陽韻 舒聲 合口 牙喉音')) return 'uɑ̃';
  if (is('陽韻 入聲 脣音')) return 'oʔ';
  if (is('陽韻 入聲 舌齒音 來孃母')) return 分袜麦 ? 'iɑʔ' : 'iɐʔ';
  if (is('陽韻 入聲 舌齒音 精組')) return 分袜麦 ? 'iɑʔ' : 'iɐʔ';
  if (is('陽韻 入聲 舌齒音 日母')) return 文讀 ? 分袜麦 ? 'ɑʔ' : 'ɐʔ' : 分袜麦 ? 'iɑʔ▽' : 'iɐʔ▽'; // 「箬」等
  if (is('陽韻 入聲 舌齒音')) return 分袜麦 ? 'ɑʔ' : 'ɐʔ';
  if (is('陽韻 入聲 開口 牙喉音')) return 分袜麦 ? 'iɑʔ' : 'iɐʔ';
  if (is('陽韻 入聲 合口 牙喉音')) return 分肉月 ? 'ioʔ' : 'yɪʔ';
  if (is('唐韻 舒聲 脣音')) return 'ɑ̃';
  if (is('唐韻 舒聲 舌齒音')) return 'ɑ̃';
  if (is('唐韻 舒聲 開口 牙喉音')) return 'ɑ̃';
  if (is('唐韻 舒聲 合口 牙喉音')) return 'uɑ̃';
  if (is('唐韻 入聲')) return 'oʔ';

  // 梗攝
  if (is('庚韻 舒聲 二等 脣音')) return 文讀 ? 'əŋ▽' : 分打黨 ? 'ã' : 'ɑ̃'; // 「猛」等
  if (is('庚韻 舒聲 二等 舌齒音')) return 文讀 ? 'əŋ▽' : 分打黨 ? 'ã' : 'ɑ̃'; // 「澄」等
  if (is('庚韻 舒聲 二等 開口 牙喉音')) return 文讀 ? 'əŋ▽' : 分打黨 ? 'ã' : 'ɑ̃'; // 「更」等
  if (is('庚韻 舒聲 二等 合口 牙喉音')) return 'uɑ̃';
  if (is('庚韻 舒聲 三等 脣音')) return 'ɪɲ';
  if (is('庚韻 舒聲 三等 齒音')) return 文讀 ? 'əŋ▽' : 分打黨 ? 'ã' : 'ɑ̃'; // 「省」等
  if (is('庚韻 舒聲 三等 開口 牙喉音')) return 文讀 ? 'ɪɲ' : 分打黨 ? 'iã▽' : 'iɑ̃▽'; // 「映」等
  if (is('庚韻 舒聲 三等 合口 牙喉音')) return 'ioŋ';
  if (is('庚韻 入聲 二等 脣音')) return 文讀 ? 'əʔ▽' : 分袜麦 ? 'ɑʔ' : 'ɐʔ'; // 「白」等。收於「上海土白集字」
  if (is('庚韻 入聲 二等 舌齒音')) return 文讀 ? 'əʔ▽' : 分袜麦 ? 'ɑʔ' : 'ɐʔ'; // 「澤」等
  if (is('庚韻 入聲 二等 開口 牙喉音')) return 文讀 ? 'əʔ▽' : 分袜麦 ? 'ɑʔ' : 'ɐʔ'; // 「客」等。收於「上海土白集字」
  if (is('庚韻 入聲 二等 合口 牙喉音')) return 'oʔ';
  if (is('庚韻 入聲 三等')) return 'iɪʔ';
  if (is('耕韻 舒聲 脣音')) return 文讀 ? 'əŋ▽' : 分打黨 ? 'ã' : 'ɑ̃'; // 「萌」等
  if (is('耕韻 舒聲 舌齒音')) return 文讀 ? 'əŋ▽' : 分打黨 ? 'ã' : 'ɑ̃'; // 「爭」等
  if (is('耕韻 舒聲 開口 牙喉音')) return 文讀 ? 'ɪɲ' : 分打黨 ? 'ã▽' : 'ɑ̃▽'; // 「櫻」等
  if (is('耕韻 舒聲 合口 喉音')) return 'oŋ';
  if (is('耕韻 入聲 脣音')) return 文讀 ? 'əʔ▽' : 分袜麦 ? 'ɑʔ' : 'ɐʔ'; // 「脈」等。收於「上海土白集字」
  if (is('耕韻 入聲 舌齒音')) return 文讀 ? 'əʔ▽' : 分袜麦 ? 'ɑʔ' : 'ɐʔ'; // 「責」等
  if (is('耕韻 入聲 開口 牙喉音')) return 文讀 ? 'əʔ▽' : 分袜麦 ? 'ɑʔ' : 'ɐʔ'; // 「革」等
  if (is('耕韻 入聲 合口 牙喉音')) return 'oʔ';
  if (is('清青韻 舒聲 脣音')) return 'ɪɲ';
  if (is('清青韻 舒聲 舌齒音 知章組')) return 文讀 ? 'əŋ' : 分打黨 ? 'ã▽' : 'ɑ̃▽'; // 「聲」等
  if (is('清青韻 舒聲 舌齒音')) return 'ɪɲ';
  if (is('清青韻 舒聲 開口 牙喉音')) return 文讀 ? 'ɪɲ' : 分打黨 ? 'iã▽' : 'iɑ̃▽'; // 理論白讀
  if (is('清青韻 舒聲 合口 牙喉音')) return 'ioŋ'; // 有異讀 /ɪɲ/
  if (is('清青韻 入聲 脣音')) return 'iɪʔ';
  if (is('清青韻 入聲 舌齒音 知章組')) return 文讀 ? 'əʔ▽' : 分袜麦 ? 'ɑʔ' : 'ɐʔ'; // 「適」等
  if (is('清青韻 入聲 舌齒音')) return 'iɪʔ';
  if (is('清青韻 入聲 開口 牙喉音')) return 'iɪʔ';
  if (is('清青韻 入聲 合口 牙喉音')) return 分肉月 ? 'ioʔ' : 'yɪʔ';

  // 曾攝
  if (is('蒸韻 舒聲 脣音')) return 'ɪɲ';
  if (is('蒸韻 舒聲 舌齒音 來母')) return 'ɪɲ';
  if (is('蒸韻 舒聲 舌齒音 日母')) return 文讀 ? 'əŋ▽' : 'ɪɲ'; // 「仍」等
  if (is('蒸韻 舒聲 舌齒音')) return 文讀 ? 'əŋ' : 分打黨 ? 'ã▽' : 'ɑ̃▽'; // 「剩」等
  if (is('蒸韻 舒聲 牙喉音')) return 'ɪɲ';
  if (is('蒸韻 入聲 脣音')) return 'iɪʔ';
  if (is('蒸韻 入聲 舌齒音 精組')) return 'iɪʔ';
  if (is('蒸韻 入聲 舌齒音 來孃母')) return 'iɪʔ';
  if (is('蒸韻 入聲 舌齒音 日母')) return 文讀 ? 'əʔ▽' : 'iɪʔ';
  if (is('蒸韻 入聲 舌齒音')) return 'əʔ';
  if (is('蒸韻 入聲 開口 牙喉音')) return 'iɪʔ';
  if (is('蒸韻 入聲 合口 喉音')) return 分肉月 ? 'ioʔ' : 'yɪʔ';
  if (is('登韻 舒聲 脣音 明母')) return 文讀 ? 'oŋ' : 'ɑ̃▽'; // 「懵」
  if (is('登韻 舒聲 脣音')) return 文讀 ? 'əŋ▽' : 分打黨 ? 'ã' : 'ɑ̃'; // 「崩」等
  if (is('登韻 舒聲 開口')) return 'əŋ'; // 無白讀例
  if (is('登韻 舒聲 合口')) return 'oŋ';
  if (is('登韻 入聲 脣音 明母')) return 'əʔ';
  if (is('登韻 入聲 脣音')) return 'oʔ';
  if (is('登韻 入聲 開口')) return 'əʔ';
  if (is('登韻 入聲 合口')) return 'oʔ';

  // 流攝
  if (is('尤侯韻 尤韻 脣音 去聲')) return 'u';
  if (is('尤侯韻 脣音')) return 'ɤ';
  if (is('尤侯韻 尤韻 舌齒音 精組')) return 'iɤ';
  if (is('尤侯韻 尤韻 舌齒音 來孃母')) return 'iɤ';
  if (is('尤侯韻 尤韻 舌齒音 日母')) return 文讀 ? 'ɤ' : 'iɤ▽'; // 「柔」等
  if (is('尤侯韻 舌齒音')) return 'ɤ';
  if (is('尤侯韻 尤韻 牙喉音')) return 'iɤ';
  if (is('尤侯韻 牙喉音')) return 'ɤ';
  if (is('幽韻 脣音 明母')) return 文讀 ? 'iɤ▽' : 'iɔ'; // 「繆」等
  if (is('幽韻 脣音')) return 'iɔ';
  if (is('幽韻 舌齒音 精組')) return 'iɤ';
  if (is('幽韻 舌齒音 來母')) return 'iɤ';
  if (is('幽韻 尤韻 舌齒音 日母')) return 文讀 ? 'ɤ' : 'iɤ▽';
  if (is('幽韻 舌齒音')) return 'ɤ';
  if (is('幽韻 牙喉音')) return 'iɤ';

  // 深攝
  if (is('侵韻 舒聲 脣音')) return 'ɪɲ';
  if (is('侵韻 舒聲 舌齒音 精組')) return 'ɪɲ';
  if (is('侵韻 舒聲 舌齒音 來孃母')) return 'ɪɲ';
  if (is('侵韻 舒聲 舌齒音 日母')) return 文讀 ? 'əŋ' : 'ɪɲ▽'; // 「任」等
  if (is('侵韻 舒聲 舌齒音')) return 'əŋ';
  if (is('侵韻 舒聲 牙喉音')) return 'ɪɲ';
  if (is('侵韻 入聲 脣音')) return 'iɪʔ';
  if (is('侵韻 入聲 舌齒音 精組')) return 'iɪʔ';
  if (is('侵韻 入聲 舌齒音 來孃母')) return 'iɪʔ';
  if (is('侵韻 入聲 舌齒音 日母')) return 文讀 ? 'əʔ' : 'iɪʔ▽'; // 「入」等
  if (is('侵韻 入聲 舌齒音')) return 'əʔ';
  if (is('侵韻 入聲 牙喉音')) return 'iɪʔ';

  // 咸攝
  if (is('覃韻 舒聲 脣音')) return 'ø';
  if (is('覃韻 舒聲 舌齒音 來母')) return 分來蘭 ? 'æ' : 'e';
  if (is('覃韻 舒聲 舌齒音 端定母')) return 分來蘭 ? 'æ' : 'e'; // 也有讀 /ø/ 個口音，但是弗在「上海市區方言志」
  if (is('覃韻 舒聲 舌齒音')) return 'ø';
  if (is('覃韻 舒聲 牙喉音 溪母')) return 分來蘭 ? 'æ' : 'e'; // 也有讀 /ø/ 個口音，但是弗在「上海市區方言志」
  if (is('覃韻 舒聲 牙喉音')) return 'ø';
  if (is('覃韻 入聲')) return 文讀 ? 'əʔ▽' : 'ɐʔ'; // 「答」等
  if (is('談韻 舒聲 脣音')) return 分來蘭 ? 'æ' : 'e'; // 生僻字無資料。推測
  if (is('談韻 舒聲 舌齒音')) return 分來蘭 ? 'æ' : 'e';
  if (is('談韻 舒聲 牙喉音')) return 'ø';
  if (is('談韻 入聲 牙喉音')) return 'əʔ';
  if (is('談韻 入聲')) return 'ɐʔ';
  if (is('鹽添嚴韻 舒聲 舌齒音 知組 孃母')) return 分衣煙 ? 'iɪ' : 'i';
  if (is('鹽添嚴韻 舒聲 舌齒音 知組')) return 'ø';
  if (is('鹽添嚴韻 舒聲 舌齒音 莊章組')) return 'ø';
  if (is('鹽添嚴韻 舒聲 舌齒音 日母')) return 文讀 ? 'ø' : 分衣煙 ? 'iɪ▽' : 'i▽'; // 「染」等
  if (is('鹽添嚴韻 舒聲')) return 分衣煙 ? 'iɪ' : 'i';
  if (is('鹽添嚴韻 入聲 舌齒音 知組 孃母')) return 'iɪʔ';
  if (is('鹽添嚴韻 入聲 舌齒音 知組')) return 'əʔ';
  if (is('鹽添嚴韻 入聲 舌齒音 莊章組')) return 'əʔ';
  if (is('鹽添嚴韻 入聲 舌齒音 日母')) return 文讀 ? 'əʔ▽' : 'iɪʔ'; // 無文讀例
  if (is('鹽添嚴韻 入聲')) return 'iɪʔ';
  if (is('咸銜凡韻 舒聲 脣音')) return 分來蘭 ? 'æ' : 'e';
  if (is('咸銜凡韻 舒聲 舌齒音 來母')) return 分衣煙 ? 'iɪ' : 'i';
  if (is('咸銜凡韻 舒聲 舌齒音 孃母')) return 'ø';
  if (is('咸銜凡韻 舒聲 舌齒音')) return 分來蘭 ? 'æ' : 'e';
  if (is('咸銜凡韻 舒聲 牙喉音')) return 文讀 ? 分衣煙 ? 'iɪ▽' : 'i▽' : 分來蘭 ? 'æ' : 'e'; // 「減」等
  if (is('咸銜凡韻 入聲 牙喉音')) return 文讀 ? 'iɐʔ▽' : 'ɐʔ'; // 「甲」等
  if (is('咸銜凡韻 入聲')) return 'ɐʔ';

  throw new Error('無韻母規則');
}

function 顎化規則(音節) {
  if (音節.match(元音Re)) {
    let 第一個元音 = 音節.match(元音Re)[0];
    if (閉前元音.includes(第一個元音)) {
      for (let 聲母 in 顎化分尖團) 音節 = 音節.replace(聲母, 顎化分尖團[聲母]);
      if (選項.分尖團 !== '分尖團') {
        for (let 聲母 in 顎化分情琴) 音節 = 音節.replace(聲母, 顎化分情琴[聲母]);
      }
      if (選項.分尖團 === '區分⟨徐､齊⟩') {
        if (is('從崇常母')) {
          for (let 聲母 in 顎化弗分尖團) 音節 = 音節.replace(聲母, 顎化弗分尖團[聲母]);
        }
      }
    }
  }
  return 音節;
}

function 主流層選擇規則(音們) {
  let 音們_非主流度們 = [];
  音們.forEach((音) => {
    音們_非主流度們.push({ '音': 音, '非主流度': (音.match(/▽/g) || []).length });
  });
  return 音們_非主流度們.reduce(function (prev, curr) {
    return prev.非主流度 < curr.非主流度 ? prev : curr;
  }).音;
}

function 聲調規則(音節) {
  let 聲調;
  if (is('云母 上去聲 梗攝')) 聲調 = '陰去'; // 由於聲母例外
  // else if (is('以母 上聲 通攝')) 聲調 = '陰去'; // 由於聲母例外
  else if (is('疑母 上聲 模韻')) 聲調 = '陰平'; // 由於聲母例外
  else if (is('全清 或 次清') && is('平聲')) 聲調 = '陰平';
  else if (is('全清 或 次清') && is('上去聲')) 聲調 = '陰去';
  else if (is('全清 或 次清') && is('入聲')) 聲調 = '陰入';
  else if (is('全濁 或 次濁') && is('入聲')) 聲調 = '陽入';
  else if (is('全濁 或 次濁') && is('舒聲')) 聲調 = '陽去';
  else throw new Error('無聲調規則');

  if (選項.標調方式 === '附標') {
    let 標調位置;
    if (音節.match(元音Re)) {
      let 第一個元音 = 音節.match(元音Re)[0];
      標調位置 = 音節.indexOf(第一個元音);
      if (元音.includes(音節[標調位置 + 1])) 標調位置 += 1; // 弗要標在介音上
      if (元音附標.includes(音節[標調位置 + 1])) 標調位置 += 1; // 弗要標在附標下頭
    } else {
      標調位置 = 音節.indexOf('̩');
    }
    標調位置 += 1;
    return 音節.slice(0, 標調位置) + 附標標調[聲調] + 音節.slice(標調位置);
  } else if (選項.標調方式 === '數字') {
    return 音節 + 數字標調[聲調];
  } else if (選項.標調方式 === '折線') {
    return 音節 + 折線標調[聲調];
  } else {
    return 音節;
  }
}

function finalise(音節) {
  音節 = 音節.replace(/▽/g, '');
  音節 = 顎化規則(音節);
  音節 = 聲調規則(音節);
  return 音節;
}

let 文讀聲母 = 聲母規則(true);
let 白讀聲母 = 聲母規則(false);

let 文讀韻母 = 韻母規則(true);
let 白讀韻母 = 韻母規則(false);

let 文讀音 = 文讀聲母 + 文讀韻母;
let 白讀音 = 白讀聲母 + 白讀韻母;

let 結果;
if (選項.文白讀 === '主流層') {
  結果 = 主流層選擇規則([文讀音, 白讀音]);
  結果 = finalise(結果);
} else {
  if (選項.文白讀 === '僅白讀') 結果 = finalise(白讀音);
  else if (選項.文白讀 === '僅文讀') 結果 = finalise(文讀音);
  else if (文讀音 === 白讀音) 結果 = finalise(文讀音);
  else 結果 = finalise(文讀音) + '\n' + finalise(白讀音);
}

return 結果;
});

/**
 * 推導上海話
 *
 * https://zhuanlan.zhihu.com/p/386456940
 *
 * ——適改「上海市区方言志」音系
 *
 * 在墶「上海市区方言志」個基礎上向增加着一些理論白讀層搭着理論文讀層（參考「上海土白集字」），但是確保至少一個層次是「上海市区方言志」音系。
 * 提供了一些選項，其中「上海市区方言志」弗分尖團、弗分衣煙、弗分來蘭、弗分襪麥、弗分打黨、弗分肉月。
 *
 * @author Nyoeghau
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的推導上海話
 */
export function zaonhe(音韻地位, 字頭, 選項) {
  return schemas.zaonhe(音韻地位, 字頭, 選項);
}

schemas.langjin = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
const is = (x) => 音韻地位.屬於(x);

if (!音韻地位) return [
  ['$legacy', true],
  ['標調方式', [1, '數字次序', '韻母附標']],  
];

const 次序標調 = {
  '陰平': '¹',
  '陽平': '²',
  '上聲': '³',
  '去聲': '⁴',
  '入聲': '⁵',
};
const 附標標調 = {
  '陰平': '̄',
  '陽平': '́',
  '上聲': '̌',
  '去聲': '̀',
  '入聲': '̂',
};

const 元音 = 'iuüaeoyär';
const 元音Re = new RegExp("[" + 元音 + "]");
const 元音附標 = '̃̈';

function 聲母規則() {
  if (is('幫母')) return is('東韻 三等 或 鍾微虞廢文元陽尤凡韻') ? 'f' : 'b';
  if (is('滂母')) return is('東韻 三等 或 鍾微虞廢文元陽尤凡韻') ? 'f' : 'p';
  if (is('並母')) return is('東韻 三等 或 鍾微虞廢文元陽尤凡韻') ? 'f' : is('平聲') ? 'p' : 'b';
  if (is('明母')) return is('三等 凡微文陽虞元韻') ? '' : 'm'; // 等價於三等合口
  if (is('端母')) return 'd';
  if (is('透母')) return 't';
  if (is('定母')) return is('平聲') ? 't' : 'd';
  if (is('泥來孃母')) return 'l';
  if (is('知母')) return is('麻韻 三等') ? 'd' : is('庚耕韻') ? 'z' : 'zh'; // 知組平翹律
  if (is('徹母')) return is('庚耕韻') ? 'c' : 'ch'; // 知組平翹律
  if (is('澄母')) { 
    if (is('庚耕韻')) return is('平聲') ? 'c' : 'z'; // 平送氣仄不送氣
    // 剩下翹舌
    return is('平聲') ? 'ch' : 'zh'; // 平送氣仄不送氣
  }
  if (is('精母')) return 'z';
  if (is('清母')) return 'c';
  if (is('從母')) return is('二等') ? 'ch' : is('平聲') ? 'c' : 'z'; // 平送氣仄不送氣
  if (is('心母')) return 's';
  if (is('邪母')) return is('平聲 尤之韻') ? 'c' : 's';
  if (is('莊母')) return is('宕假效江攝 或 止攝 合口 或 蟹咸山攝 二等') ? 'zh' : 'z'; // 莊組平翹律
  if (is('初母')) return is('宕假效江攝 或 止攝 合口 或 蟹咸山攝 二等') ? 'ch' : 'c'; // 莊組平翹律
  if (is('崇母')) {
    if (is('宕假效江攝 或 止攝 合口 或 蟹咸山攝 二等')) return is('平聲') ? 'ch' : 'zh';
    // 剩下平舌
    return is('之韻') ? 's' : is('平聲') ? 'c' : 'z'; // 平送氣仄不送氣
  }
  if (is('生母')) return is('宕假效江攝 或 止攝 合口 或 蟹咸山攝 二等') ? 'sh' : 's'; // 莊組平翹律
  if (is('俟母')) return is('平聲') ? 'c' : 's'; // 平送氣仄不送氣
  if (is('章母')) return 'zh';
  if (is('昌母')) return 'ch';
  if (is('常母')) return is('曾攝 入聲') ? 'zh' : is('平聲 齊侵清仙鹽陽尤魚虞眞蒸支鍾韻 或 一等') ? 'ch' : 'sh';
  if (is('船書母')) return is('平聲 通攝 或 平聲 合口 山臻攝') ? 'ch' : 'sh'; // 章組擦音分化律
  if (is('日母')) return is('四等') ? 'l' : is('支之脂韻 開口 或 眞侵韻 入聲') ? '' : 'r';  
  let 不顎化 = '一等 或 二等 合口 或 二等 庚耕韻 或 三等 合口 祭微陽支脂凡廢韻 舒聲 或 三等 通攝 舒聲 或 四等 合口 齊韻'; // 見溪羣曉匣母不顎化條件
  if (is('見母')) return is(不顎化) ? 'g' : 'j';
  if (is('溪母')) return is('二等 皆韻 或 二等 江韻 入聲') ? 'k' : is(不顎化) ? 'k' : 'q';
  if (is('羣母')) {  
    if (is('宵韻 重紐A類')) return 'q';
    if (is('平聲')) return is('三等 合口 山陽脂韻') ? 'k' : 'q'; // 平送氣
    // 剩下仄聲不送氣
    return is(不顎化) ? 'g' : 'j';
  }
  if (is('疑母')) {
    if(is('之韻 上聲')) return 'l';
    return is('一二等') ? '' : is('尤蒸齊韻 平聲 或 先仙陽庚韻 入聲') ? 'l' : '';
  }
  if (is('匣母')) return is('開口 耕韻 舒聲') ? 'x' : is(不顎化) ? 'h' : 'x';  
  if (is('曉母')) return is('三等 開口 或 三等 通攝') ? 'x' : is(不顎化) ? 'h' : 'x';
  if (is('以母')) return is('合口 祭韻') ? 'r' : '';
  if (is('影母')) return '';
  if (is('云母')) return is('舒聲 通攝') ? 'x' : '';
  throw new Error('無聲母規則');
}

function 韻母規則() {
  // 通攝
  if (is('東韻 入聲')) return is('三等 見溪羣曉匣疑以影云母') ? 'ü' : 'u'; 
  if (is('東韻 舒聲')) return is('三等 疑以影母') ? 'iong' : is('幫組') ? 'en' : 'ong';
  if (is('冬韻')) return is('入聲') ? 'u' : is('幫組') ? 'en' : 'ong';
  if (is('鍾韻 入聲')) return is('見溪羣曉匣疑以影云母') ? 'ü' : 'u'; 
  if (is('鍾韻 舒聲')) return is('疑以影母') ? 'iong' : is('幫組') ? 'en' : 'ong';

  // 江攝
  if (is('江韻 入聲')) return is('疑母') ? 'io' : 'o'; 
  if (is('江韻 舒聲')) return is('徹澄崇初生知母') ? 'uang' : is('疑母') ? 'iang' : 'ang'; 

  // 止攝 
  if (is('支脂之韻 日母 開口')) return 'er'; 
  if (is('支脂之韻 崇初從精清生俟邪心莊母 開口')) return 'y'; // 平舌音
  if (is('支脂之韻 昌常徹澄船書章知母 開口')) return 'r'; // 翹舌音
  if (is('支脂韻 莊組 合口')) return 'uä';
  if (is('支韻 重紐B類') && is('幫母 或 並母 上去聲')) return 'ei';
  if (is('脂韻 重紐B類') && is('並滂母 或 幫母 平聲')) return 'ei';
  if (is('脂韻 明母')) return 'ei';
  if (is('微韻 幫並滂母')) return 'ei';
  if (is('支脂之微韻 幫並滂母')) return 'i';
  if (is('支韻 明母')) return 'i';
  if (is('微韻 明母')) return 'uei';
  if (is('支脂之微韻 開口')) return 'i';
  if (is('支脂微韻 合口')) return 'uei';

  // 遇攝
  if (is('模韻')) return is('明母') ? 'o' : 'u'; 
  if (is('魚虞韻')) return is('從見精來孃清羣溪曉邪心疑以影云母') ? 'ü' : 'u';  

  // 蟹攝
  if (is('齊韻')) return is('合口 或 常母') ? 'uei' : 'i'; 
  if (is('祭韻 明母')) return 'ei';
  if (is('廢祭灰韻 合口')) return 'uei'; 
  if (is('廢韻 幫組')) return 'ei';
  if (is('祭韻 幫組')) return 'i';
  if (is('廢祭韻 開口')) return is('章知組') ? 'r' : is('莊組') ? 'y' : 'i';  
  if (is('佳韻 合口')) return is('見溪匣曉影母') ? 'ua' : 'uä';
  if (is('皆夬韻 合口')) return 'uä';
  if (is('佳皆夬韻 幫組'))  return 'ä';
  if (is('佳皆夬韻 開口'))  return is('疑母') ? 'iä' : 'ä';
  if (is('灰廢韻 幫組')) return 'ei';
  if (is('灰韻 開口')) return is('以母') ? 'iä' : 'ä'; 
  if (is('咍韻')) return is('合口') ? 'uei' : is('以母') ? 'iä' : 'ä';
  if (is('泰韻 合口')) return is('見溪疑母') ? 'uä' : 'uei'; 
  if (is('泰韻 幫組')) return 'ei';
  if (is('泰韻 開口')) return is('以母') ? 'iä' : 'ä';  

  // 臻攝
  if (is('文韻 入聲 幫組')) return 'u';
  if (is('臻欣文眞韻 入聲 合口')) return is('知莊章組') ? 'u' : 'ü'; 
  if (is('臻欣文眞韻 入聲 幫組')) return 'i';
  if (is('臻欣文眞韻 入聲 開口')) return is('莊組') ? 'ä' : is('章組 或 知徹澄日母') ? 'r' : 'i';
  if (is('臻欣文眞韻 舒聲 開口')) return is('莊章組 或 日知徹澄母') ? 'en' : 'in';
  if (is('眞韻 舒聲 幫組')) return 'in'; 
  if (is('文眞韻 舒聲 合口')) return is('來明日書章知昌常徹澄船母') ? 'uen' : 'üin';            
  if (is('眞臻欣文韻 舒聲 幫組')) return is ('明母') ? 'uen' : 'en'; 
  if (is('眞臻欣韻 舒聲 合口')) return is('滂幫並母') ? 'en' : is('來明日書章知昌常徹澄船母') ? 'uen' : 'üin';
  if (is('魂痕韻 入聲')) return is('幫組 或 開口') ? 'o' : 'u';
  if (is('魂痕韻 舒聲 幫組')) return 'en';
  if (is('魂痕韻 舒聲 開口')) return is('端組') ? 'uen' : 'en';
  if (is('魂痕韻 舒聲 合口')) return 'uen';

  // 山攝
  if (is('先韻 舒聲 合口')) return 'üän';
  if (is('先韻 舒聲 開口 或 先韻 舒聲 幫組')) return is('崇母') ? 'uang' : is('見溪羣曉匣母') ? 'än' : 'iän';
  if (is('元韻 入聲 幫組')) return is('明母') ? 'ua' : 'a';
  if (is('元仙先韻 入聲 合口')) return is('日母 或 知莊章組') ? 'o' : 'üe'; 
  if (is('仙先韻 入聲 幫組')) return 'ie';
  if (is('元仙先韻 入聲 開口')) return is('日母 或 知莊章組') ? 'ä' : is('見溪羣曉匣母') ? 'e' : 'ie';
  if (is('仙韻 舒聲 幫組')) return 'iän';
  if (is('元韻 舒聲 幫組')) return is('明母') ? 'uang' : 'ang';
  if (is('元仙韻 舒聲 合口')) return is('日來母 或 知莊章組') ? 'uang' : 'üän';
  if (is('元仙韻 舒聲 開口')) return is('日知徹澄母 或 莊章組') ? 'ang' : is('見溪羣曉匣母') ? 'än' : 'iän';
  if (is('刪山韻 入聲')) return is('合口') ? 'ua' : is('疑影母') ? 'ia' : 'a';
  if (is('刪山韻 舒聲 幫組')) return 'ang'; 
  if (is('刪山韻 舒聲 開口')) return is('影疑母') ? 'iän' : is('見溪羣曉匣母') ? 'än' : 'ang';
  if (is('刪山韻 舒聲 合口')) return 'uang';
  if (is('寒韻 入聲 開口')) return is('見溪羣曉匣疑影母') ? 'o' : 'a';
  if (is('寒韻 入聲 幫組')) return 'o';
  if (is('寒韻 入聲 合口')) return is('見組') ? 'uä' : 'o';
  if (is('寒韻 舒聲')) return is('開口 或 幫組') ? 'ang' : 'uang';
  
  // 效攝
  if (is('蕭宵韻')) return is('見溪羣曉匣日母 或 知章組') ? 'ao' : 'iao';
  if (is('肴韻')) return is('疑母') ? 'iao' : 'ao';
  if (is('豪韻')) return 'ao';
  
  // 果攝
  if (is('歌韻')) return is('一等') ? 'o' : is('開口') ? 'e' : 'üe';
  
  // 假攝
  if (is('麻韻 二等')) return is('合口') ? 'ua' : is('疑影母') ? 'ia' : 'a';
  if (is('麻韻 三等')) return is('日母 或 章組') ? 'e' : 'ie';

  // 宕攝
  if (is('陽韻 入聲')) return is('心疑以影云來孃母 或 精組') ? 'io' : 'o';
  if (is('唐陽韻 舒聲 合口')) return 'uang';
  if (is('唐陽韻 舒聲 滂幫並母')) return 'ang';
  if (is('陽韻 舒聲 明母')) return 'uang';
  if (is('陽韻 舒聲 開口')) return is('來孃疑以影母 或 精組') ? 'iang' : is('莊組') ? 'uang' : 'ang';
  if (is('唐韻 入聲')) return is('合口 見組') ? 'uä' : 'o';
  if (is('唐韻 舒聲 明母')) return 'ang';
  if (is('唐韻 舒聲 開口'))return 'ang';

  // 梗攝
  if (is('庚韻 入聲 二等')) return is('合口') ? 'uä' : 'ä';
  if (is('庚韻 入聲 三等')) return is('莊組') ? 'y' : is('合口') ? 'ü' : 'i';
  if (is('庚韻 舒聲 二等')) return is('合口') ? 'uen' : 'en';
  if (is('庚韻 舒聲 三等 合口')) return is('心以影母') ?  'in' : is('云影母') ? 'iong' : 'ong';
  if (is('庚韻 舒聲 三等 開口')) return is('知莊章組') ? 'en' : 'in';
  if (is('庚韻 舒聲 三等 幫組')) return 'in';
  if (is('青韻 舒聲 合口')) return is('云影母') ? 'iong' : 'ong';
  if (is('青韻 舒聲 開口')) return 'in';
  if (is('清青韻 入聲 幫組')) return 'i'; 
  if (is('清青韻 入聲 合口')) return 'ü';
  if (is('清青韻 入聲 開口')) return is('莊組') ? 'y' : is('知章組') ? 'r' : 'i';
  if (is('清韻 舒聲 合口 心以影母')) return 'in';
  if (is('清韻 舒聲 合口 羣溪曉母')) return 'ong';
  if (is('清韻 舒聲 合口 云影母')) return 'iong';
  if (is('清青韻 舒聲 幫組')) return 'in';
  if (is('清韻 舒聲 開口')) return is('知莊章組') ? 'en' : 'in';
  if (is('耕韻 入聲 合口')) return 'uä';
  if (is('耕韻 入聲 開口 或 耕韻 入聲 幫組')) return 'ä';       
  if (is('耕韻 舒聲 幫組')) return 'en';
  if (is('耕韻 舒聲 合口')) return 'ong' ; 
  if (is('耕韻 舒聲 開口')) return is('匣影母') ? 'in' : 'en';

  // 曾攝
  if (is('蒸韻 入聲 幫組')) return 'i'; 
  if (is('蒸韻 入聲 合口')) return 'ü';
  if (is('蒸韻 入聲 開口')) return is('莊組') ? 'ä' : is('知徹澄母 或 章組') ? 'r' : 'i';  
  if (is('蒸韻 舒聲 幫組')) return 'in'; 
  if (is('蒸韻 舒聲 開口')) return is('見組 或 來曉以影母') ? 'in' : 'en';
  if (is('登韻 入聲 幫組')) return 'ä'; 
  if (is('登韻 入聲 合口')) return 'uä';
  if (is('登韻 入聲 開口')) return 'ä';
  if (is('登韻 舒聲 幫組')) return 'en'; 
  if (is('登蒸韻 舒聲 合口')) return 'ong'; 
  if (is('登韻 舒聲 開口')) return 'en';

  // 流攝
  if (is('幽韻')) return is('幫組') ? 'iao' : is('見溪羣曉生母') ? 'ou' : 'iou';
  if (is('尤韻')) return is('滂幫並母') ? 'u' : is('精組 或 疑以影云孃來母') ? 'iou' : 'ou';
  if (is('侯韻')) return 'ou';
  
  // 深攝
  if (is('侵韻 入聲')) return is('莊組') ? 'ä' : is('章組 或 日知徹澄母') ? 'r' : 'i';
  if (is('侵韻 舒聲')) return is('章莊組 或 日知徹澄母') ? 'en' : 'in';

  // 咸攝
  if (is('添韻 入聲')) return is('見溪羣曉匣母') ? 'e' : 'ie';
  if (is('添韻 舒聲')) return is('見溪羣曉匣母') ? 'än' : 'iän';
  if (is('鹽嚴凡韻 入聲 幫組')) return 'a';
  if (is('鹽嚴凡韻 入聲 合口')) return is('徹孃母') ? 'ua' : 'a';
  if (is('鹽嚴凡韻 入聲 開口')) return is('莊章組 或 日知徹澄母') ? 'ä' : is('見溪羣曉匣母') ? 'e' : 'ie';
  if (is('鹽韻 舒聲 幫組')) return 'iän';
  if (is('嚴凡韻 舒聲 幫組')) return is('明母') ? 'uang' : 'ang';
  if (is('鹽嚴凡韻 舒聲 合口')) return 'uang';
  if (is('鹽嚴凡韻 舒聲 開口')) return is('日知徹澄母 或 莊章組') ? 'ang' : is('見溪羣曉匣母') ? 'än' : 'iän';
  if (is('咸銜韻 入聲')) return is('疑影母') ? 'ia' : 'a';
  if (is('咸銜韻 舒聲')) return is('來影疑母') ? 'iän' : is('見溪羣曉匣母') ? 'än' : 'ang';
  if (is('覃談韻 入聲')) return is('見組 或 匣曉影母') ? 'o' : 'a';     
  if (is('覃談韻 舒聲')) return is('開口 或 幫組') ? 'ang' : 'uang';

  throw new Error('無韻母規則');
}

function 聲調規則(音節) {
  let 聲調;
  if (is('平聲')) 聲調 = is('全清 或 次清') ? '陰平' : '陽平';
  else if (is('上聲')) 聲調 = is('全濁') ? '去聲' : '上聲';   
  else if (is('去聲')) 聲調 = '去聲';   
  else if (is('入聲')) 聲調 = '入聲';
  else throw new Error('無聲調規則');
  if (選項.標調方式 === '韻母附標') {
    let 標調位置;
    if (音節.match(元音Re)) {
      let 第一個元音 = 音節.match(元音Re)[0];
      標調位置 = 音節.indexOf(第一個元音);
      if (元音.includes(音節[標調位置 + 1])) 標調位置 += 1; // 不要標在介音高頭
      if (元音附標.includes(音節[標調位置 + 1])) 標調位置 += 1; // 不要標在附標下頭
      if (音節.includes('a')) 標調位置 = 音節.indexOf('a');
      else if (音節.includes('o')) 標調位置 = 音節.indexOf('o');
      else if (音節.includes('e')) 標調位置 = 音節.indexOf('e');
    } else {
      標調位置 = 音節.indexOf('̩');
    }
    標調位置 += 1;
    return 音節.slice(0, 標調位置) + 附標標調[聲調] + 音節.slice(標調位置);
  } 
  else {
    return 音節 + 次序標調[聲調];
  }
}

let 聲母 = 聲母規則();
let 韻母 = 韻母規則();
return 聲調規則(聲母 + 韻母);
});

/**
 * 推導南京話
 *
 * https://zhuanlan.zhihu.com/p/391166351
 *
 * 中古音與南京音的對應表：https://github.com/uliloewi/lang2jin1/blob/master/Guangyun_Langjin_pulish_Alphabetic.2.0.csv
 * 南京音本是清末以前標準官話的基礎音系，和中古音有嚴格的對應關係，故有上表。本程序展示此對應關係。
 * 南京話拼音方案：https://zh.wikipedia.org/wiki/%E5%8D%97%E4%BA%AC%E8%A9%B1%E6%8B%89%E4%B8%81%E5%8C%96%E6%96%B9%E6%A1%88#%E8%BC%B8%E5%85%A5%E6%B3%95%E6%96%B9%E6%A1%88
 *
 * @author uliloewi
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的推導南京話
 */
export function langjin(音韻地位, 字頭, 選項) {
  return schemas.langjin(音韻地位, 字頭, 選項);
}

schemas.taibu = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
const is = (x) => 音韻地位.屬於(x);

// 推導選項
if (!音韻地位) return [
  ['$legacy', true],
  ['文白讀', [3, '文上白下', '僅白讀', '僅文讀']],
  ['音標', [1, '客家語拼音方案 (臺灣客拼)', '國際音標 (IPA)']],
  ['標調方式', [1, '數字調號', '符號調號', '數字調值', '折線調值']]
];

// 一些常量
const 平舌 = ['z', 'c', 's'];
const 翹舌 = ['zh', 'ch', 'sh', 'rh'];
const 平舌或翹舌 = 平舌.concat(翹舌);
const 輕脣 = ['f', 'v'];
const 翹舌或輕脣 = 翹舌.concat(輕脣);

function 聲母規則(白讀) {
  if (is('幫母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻') && !白讀) return 'f';
    return 'b';
  }
  if (is('滂母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻') && !白讀) return 'f';
    return 'p';
  }
  if (is('並母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻') && !白讀) return 'f';
    return 'p';
  }
  if (is('明母')) {
    if (is('東韻 三等 或 鍾微虞廢文元陽尤凡韻') && !白讀) return 'v';
    return 'm';
  }

  if (is('端母')) return 'd';
  if (is('透母')) return 't';
  if (is('定母')) return 't';
  if (is('泥母')) return 'n';
  if (is('來母')) return 'l';

  if (is('知母')) return is('二等') ? 'z' : 'zh';
  if (is('徹母')) return is('二等') ? 'c' : 'ch';
  if (is('澄母')) return is('二等') ? 'c' : 'ch';
  if (is('孃母')) return 'n';

  if (is('精母')) return 'z';
  if (is('清母')) return 'c';
  if (is('從母')) return 'c';
  if (is('心母')) return 's';
  if (is('邪母')) {
    if (is('支脂之微韻 去聲')) return 'c';
    if (is('魚虞模東冬鍾侵韻 平聲')) return 'c';
    if (is('侯尤幽麻韻')) return 'c';
    return 's';
  }

  if (is('莊母')) return 'z';
  if (is('初母')) return 'c';
  if (is('崇母')) return 'c';
  if (is('生母')) return 's';
  if (is('俟母')) return 'c';

  if (is('章母')) return 'zh';
  if (is('昌母')) return 'ch';
  if (is('常母')) return 'sh';
  if (is('書母')) return 'sh';
  if (is('船母')) return 'sh';
  if (is('日母')) return 'ng';

  if (is('見母')) return 'g';
  if (is('溪母')) return 'k';
  if (is('羣母')) return 'k';
  if (is('疑母')) return 'ng';

  if (is('曉母')) {
    if (is('合口')) return 'f';
    if (is('三四等')) return 'x';
    return 'h';
  }
  if (is('匣母')) {
    if (is('合口 或 東模韻')) return 'f';
    if (is('開口 四等')) return 'x';
    return 'h';
  }
  if (is('影母')) {
    if (is('合口')) return 'v';
    if (is('三四等')) return 'rh';
    return '';
  }
  if (is('云母')) {
    if (is('東韻')) return 'x';
    if (is('支脂之微唐陽韻 或 魚虞模韻 平聲')) return 'v';
    return 'rh';
  }
  if (is('以母')) {
    if (is('支脂之微韻 合口')) return 'v';
    return 'rh';
  }

  throw new Error('無聲母規則');
}

function 韻母規則(白讀) {
  // 通攝
  if (is('東冬鍾韻 幫組')) return 'ung';
  if (is('東冬鍾韻 一等')) return 'ung';
  if (is('東冬鍾韻 三等')) return 'iung'; // (>ung/翹舌_)

  // 江攝
  if (is('江韻')) return 'ong'; // 例外: 窗雙 ung

  // 宕攝
  if (is('唐韻 幫組')) return 'ong';
  if (is('唐韻 開口')) return 'ong';
  if (is('唐韻 合口 見影組')) return 'uong'; // (>ong/輕脣_)
  if (is('陽韻 幫組')) return 白讀 ? 'iong' : 'ong';
  if (is('陽韻 莊組')) return 'ong';
  if (is('陽韻 開口')) return 'iong'; // (>ong/翹舌_)
  if (is('陽韻 合口 見影組')) return 'uong'; // (>ong/輕脣_)

  // 止攝
  if (is('支脂韻 幫組')) return 'i'; // 例外: 美費 ui
  if (is('微韻 幫組')) return 'ui';
  if (is('支脂之微韻 開口')) return 'i'; // (>ii/平翘舌_) 例外: 知姊死四 i
  if (is('支脂之微韻 合口')) return 'ui'; // 例外: 炊吹衰睡 oi

  // 遇攝
  if (is('虞韻 幫組')) return 'u';
  if (is('魚虞韻 莊組')) return 'ii';
  if (is('魚虞韻')) {
    if (is('知章組')) return 'u';
    return 'i'; // (>ii/翘舌_)
  }
  if (is('模韻')) return 'u'; // 例外: 蜈梧吾吳午五伍 零韻母

  // 蟹攝
  if (is('咍韻')) return 白讀 ? 'oi' : 'ai';
  if (is('泰韻 幫組')) return 'ui';
  if (is('泰韻 開口')) return 'ai'; // 例外: 蓋害 oi
  if (is('泰韻 合口')) {
    if (is('見組')) return 'uai';
    return 'ui';
  }
  if (is('灰廢韻')) return 白讀 ? 'oi' : 'ui';
  if (is('佳韻 幫組')) return 'ai';
  if (is('佳韻 開口')) {
    if (is('影組')) return 'ei';
    return 'ai';
  }
  if (is('佳韻 合口')) return 'ua'; // (>a/輕脣_)
  if (is('皆夬韻 幫組')) return 'ai';
  if (is('皆夬韻 開口')) return 'ai';
  if (is('皆夬韻 合口')) return 'uai'; // (>ai/輕脣_)
  if (is('齊祭韻 幫組')) return 'i';
  if (is('祭韻 開口')) return 'i'; // (>ii/翹舌_)
  if (is('祭韻 合口')) return 白讀 ? 'oi' : 'ui'; // 例外: 脆 cioi5 歲 sei5
  if (is('齊韻 開口')) {
    if (is('影組')) return 'i';
    return 白讀 ? 'ei' : 'i'; // 例外: 梯 toi1
  }
  if (is('齊韻 合口')) return 'ui';

  // 臻攝
  if (is('痕韻')) return 'en'; // 例外: 吞 tun1; 痕 fin2
  if (is('魂韻')) return 'un';
  if (is('眞韻 幫組')) return 'in'; // 例外: 閩敏憫 en; 密蜜 ed
  if (is('文韻 幫組')) return 'un';
  if (is('眞臻文欣韻 見組')) return 白讀 ? 'iun' : 'in';
  if (is('眞臻文欣韻 開口')) return 'in'; // 例外: 韌 ngiun5 瑟 sed7
  if (is('眞臻文欣韻 合口')) {
    if (is('精組')) return 'un';
    return 'iun'; // (>un/翹舌_)
  }

  // 山攝
  if (is('寒韻 幫組')) return 'an';
  if (is('寒韻 開口')) {
    if (is('見影組')) return 'on';
    return 'an'; // 例外: 餐 on
  } else if (is('寒韻 合口')) {
    if (is('見影組')) return 'uan'; // (>an/輕脣_)
    return 'on';
  }
  if (is('刪山韻 幫組')) return 'an'; // 例外: 慢 een; 八捌 eed
  if (is('刪山韻 開口')) {
    if (is('見影組')) return 'ien'; // 例外: 限 een; 瞎 eed
    return 'an';
  } else if (is('刪山韻 合口')) {
    if (is('見影組')) return 'uan'; // (>an/輕脣_)
    return 'on';
  }
  if (is('仙韻 幫組')) return 'ien';
  if (is('仙韻 開口')) return 'ien'; // (>een/翹舌_)
  if (is('仙韻 合口')) {
    if (is('見影組')) return 'ien'; // (>een/翹舌_) 例外: 圓 vien2
    if (is('精莊組 入聲')) return 'ied';
    return 'ion'; // (>on/翹舌_)
  }
  if (is('先韻')) {
    if (is('幫組')) return 白讀 ? 'een' : 'ien';
    if (is('端組')) return 'een';
    if (is('來母')) return 'een';
    return 'ien'; // (>een/翹舌_)
  }
  if (is('元韻')) {
    if (is('幫組')) return 'an'; // 例外: 飯 on
    if (is('見影組')) return 'ien'; // (>een/翹舌_) 例外: 冤園遠 ien
  }

  // 效攝
  if (is('豪韻')) return 'ou'; // 例外: 熬靠考袍 au
  if (is('肴韻')) return 'au'; // (>au/翹舌_)
  if (is('宵韻')) return 'iau'; // (>au/翹舌_)
  if (is('蕭韻')) {
    if (is('端組')) return 'eeu';
    if (is('來母')) return 'eeu';
    return 'iau'; // (>au/翹舌_)
  }

  // 果攝
  if (is('歌韻 一等')) return 'ou';
  if (is('歌韻 三等')) return 'iau';

  // 假攝
  if (is('麻韻 幫組')) return 'a';
  if (is('麻韻 二等 開口')) return 'a';
  if (is('麻韻 二等 合口')) return 'ua'; // (>a/輕脣_)
  if (is('麻韻 三等')) return 'ia'; // (>a/翹舌_)

  // 梗攝
  if (is('庚韻 二等 幫組')) return 白讀 ? 'ang' : 'en';
  if (is('庚韻 二等 開口')) return 白讀 ? 'ang' : 'en';
  if (is('庚韻 二等 合口')) return 白讀 ? 'uang' : 'uen'; // (>白ang|文en/輕脣_)
  if (is('庚韻 三等 幫組')) return 白讀 ? 'iang' : 'in'; // 例外: 盟 en
  if (is('庚韻 三等 開口')) return 白讀 ? 'iang' : 'in'; // (>白ang|文in/翹舌_) 例外: 省 en
  if (is('庚韻 三等 合口')) return 白讀 ? 'iung' : 'un'; // (>白ung|文un/翹舌_) 例外: 憬 in
  if (is('耕韻')) return 白讀 ? 'ang' : 'en'; // 例外: 拼莖 in
  if (is('清韻')) return 白讀 ? 'iang' : 'in'; // (>白ang|文in/翹舌_) 例外: 碧 ed
  if (is('青韻')) {
    if (is('端見組 舒聲')) return 'en';
    if (is('端見組 入聲')) return 'id';
    if (is('來母 舒聲')) return 'en';
    if (is('來母 入聲')) return 'id';
    return 白讀 ? 'iang' : 'in'; // 例外: 星 en
  }

  // 曾攝
  if (is('蒸韻')) {
    if (is('莊組')) return 'en';
    return 'in';
  }
  if (is('登韻')) return 'en'; // 例外: 國 ued

  // 流攝
  if (is('侯韻')) return 'eu';
  if (is('尤幽韻')) return 'iu';

  // 深攝
  if (is('侵韻')) {
    if (is('莊組')) return 'em';
    return 'im';
  }

  // 咸攝
  if (is('覃談咸銜凡韻')) return 'am'; // 例外: 鹹 eem; 減 iam; 夾插 iab
  if (is('鹽嚴韻')) return 'iam'; // (>am/翹舌_) 例外: 黏驗 eem; 躡 eeb
  if (is('添韻')) {
    if (is('端組')) return 'eem';
    if (is('來母')) return 'eem';
    return 'iam'; // (>am/翹舌_)
  }

  throw new Error('無韻母規則');
}

function 聲調規則(白讀) {
  if (is('平聲')) return is('全清 或 次清') ? '1' : '2';
  if (is('上聲') && 白讀) return is('次濁 或 全濁') ? '1' : '3';
  if (is('上聲') && !白讀) return is('全清 或 次清 或 次濁') ? '3' : '5';
  if (is('去聲')) return '5';
  if (is('入聲')) return is('全清 或 次清') ? '7' : '8';

  throw new Error('無聲調規則');
}

function 聲母處理(聲母, 韻母) {
  // 無聲母時自動補全 v
  if (聲母 === '' && 韻母.startsWith('u')) 聲母 = 'v';
  // 日母後接洪音爲 rh
  if (is('日母') && !韻母.startsWith('i')) 聲母 = 'rh';
  return 聲母;
}

function 韻母預先處理(韻母) {
  // 替換入聲韻尾
  if (is('入聲')) {
    if (韻母.endsWith('m')) 韻母 = 韻母.slice(0, -1) + 'b';
    else if (韻母.endsWith('n')) 韻母 = 韻母.slice(0, -1) + 'd';
    else if (韻母.endsWith('ng')) 韻母 = 韻母.slice(0, -2) + 'g';
  }
  return 韻母;
}

function 韻母善後處理(聲母, 韻母) {
  // 先處理 i 相關韻母
  if (is('支脂之微韻 開口') && 韻母 === 'i' && 平舌或翹舌.includes(聲母)) {
    韻母 = 'ii';
  }
  if (is('魚虞韻') && 韻母 === 'i' && 翹舌.includes(聲母)) 韻母 = 'ii';
  if (is('祭韻 開口') && 韻母 === 'i' && 翹舌.includes(聲母)) 韻母 = 'ii';
  // 處理一般情況
  if (韻母.startsWith('ie') && 翹舌.includes(聲母)) {
    韻母 = 'ee' + 韻母.slice(2);
  }
  if (
    (
      韻母.startsWith('ia') || 韻母.startsWith('io') || 韻母.startsWith('iu') ||
      韻母.startsWith('ua') || 韻母.startsWith('ue') || 韻母.startsWith('uo')
    ) && 翹舌或輕脣.includes(聲母)
    && 韻母 !== 'iu' // iu 韻本身除外, 如: 手 shiu3
  ) {
    韻母 = 韻母.slice(1);
  }
  return 韻母;
}

// 依選項分別推導
let 白讀音, 文讀音 = null;

function 根據規則推導讀音(白讀) {
  let 讀音 = {
    韻母: '',
    聲母: '',
    聲調: ''
  };
  const 聲母推導結果 = 聲母規則(白讀);
  const 韻母推導結果 = 韻母規則(白讀);
  讀音.韻母 = 韻母善後處理(聲母推導結果, 韻母預先處理(韻母推導結果));
  讀音.聲母 = 聲母處理(聲母推導結果, 讀音.韻母);
  讀音.聲調 = 聲調規則(白讀);
  return 讀音;
}

if (選項.文白讀 === '僅白讀') {
  白讀音 = 根據規則推導讀音(true);
} else if (選項.文白讀 === '僅文讀') {
  文讀音 = 根據規則推導讀音(false);
} else if (選項.文白讀 === '文上白下') {
  白讀音 = 根據規則推導讀音(true);
  文讀音 = 根據規則推導讀音(false);
}

// K++ 轉 IPA
function 客拼轉IPA(讀音){
  const 轉換結果 = {
    韻母: '',
    聲母: '',
    聲調: ''
  };
  const 輔音韻尾正則匹配 = `(n[ng]?|[mbdgh])$`;
  const 首元音正則匹配 = `^(ii|i|u|[aeo][reo]?)`;
  const 轉換聲母 = {
    'm': 'm', 'n': 'n', 'ng': 'ŋ',
    'b': 'p', 'd': 't', 'g': 'k',
    'p': 'pʰ', 't': 'tʰ', 'k': 'kʰ', 
    's': 's', 'sh': 'ʃ', 'x': 'ɕ',
    'z': 'ts', 'zh': 'tʃ',
    'c': 'tsʰ', 'ch': 'tʃʰ',
    'rh': 'ʒ',
    'f': 'f', 'h': 'h', 'v': 'v',
    'l': 'l', '': ''
  };
  const 轉換元音 = {
    'i': 'i', 'ii': 'ɨ', 'u': 'u',
    'oo': 'o',
    'er': 'ə',
    'e': 'ɛ', 'o': 'ɔ',
    'ee': 'æ',
    'a': 'a',
    'm': 'm̩', 'ng': 'ŋ̍'
  };
  const 轉換輔音韻尾 = {
    'm': 'm', 'n': 'n', 'ng': 'ŋ',
    'b': 'p', 'd': 't', 'g': 'k'
  };
  // 提取輔音韻尾
  let 輔音韻尾 = 讀音.韻母.match(輔音韻尾正則匹配) === null ? 
                '' :
                讀音.韻母.match(輔音韻尾正則匹配)[0];
  // 提取元音們
  let 元音們 = 輔音韻尾 !== '' ? 讀音.韻母.slice(0, -輔音韻尾.length) : 讀音.韻母;
  // 預先處理：按韻尾分別處理 u、o 元音
  if (輔音韻尾 === 'ng' || 輔音韻尾 === 'g') {
    if (元音們 === 'u') {
      元音們 = 'oo';
    } else if (元音們 === 'iu') {
      元音們 = 'ioo';
    }
  }
  if (元音們 === 'ou') {
    元音們 = 'oou';
  }
  // 將元音們逐個轉換
  let 轉換後的元音們 = [];
  while (元音們.length !== 0) {
    let 當前元音 = 元音們.match(首元音正則匹配)[0];
    轉換後的元音們.push(轉換元音[當前元音]);
    元音們 = 元音們.slice(當前元音.length);
  }
  轉換後的元音們 = 轉換後的元音們.join('');
  // 轉換韻尾
  轉換後的輔音韻尾 = 轉換輔音韻尾[輔音韻尾];
  // 善後處理：按聲母分別處理舌尖韻母
  if (轉換後的元音們 === 'ɨ') {
    if (平舌.includes(讀音.聲母)) {
      轉換後的元音們 = 'ɿ';
    } else {
      轉換後的元音們 = 'ʅ';
    }
  }
  // 將結果拼合成韻母
  轉換結果.韻母 = 轉換後的元音們 + (輔音韻尾 !== '' ? 轉換後的輔音韻尾 : '');
  // 轉換聲母
  轉換結果.聲母 = 轉換聲母[讀音.聲母];
  // 轉換聲調
  轉換結果.聲調 = 讀音.聲調;

  return 轉換結果;
}

if (選項.音標 === '國際音標 (IPA)') {
  白讀音 = 白讀音 ? 客拼轉IPA(白讀音) : null;
  文讀音 = 文讀音 ? 客拼轉IPA(文讀音) : null;
}

// 轉換標調方式
function 轉換標調方式(讀音, 標調方式){
  const 轉換結果 = 讀音;
  const 轉換爲符號調號 = {
    '1': 'ˊ',
    '2': 'ˇ',
    '3': '^',
    '5': 'ˋ',
    '7': '^',
    '8': 'ˋ'
  };
  const 轉換爲數字調值 = {
    '1': '⁴⁵',
    '2': '²²⁴',
    '3': '³¹',
    '5': '⁵¹',
    '7': '³²',
    '8': '⁵'
  };
  const 轉換爲折線調值 = {
    '1': '˦˥',
    '2': '˨˨˦',
    '3': '˧˩',
    '5': '˥˩',
    '7': '˧˨',
    '8': '˥'
  };
  if (標調方式 === '符號調號') {
    轉換結果.聲調 = 轉換爲符號調號[讀音.聲調];
  } else if (標調方式 === '數字調值') {
    轉換結果.聲調 = 轉換爲數字調值[讀音.聲調];
  } else if (標調方式 === '折線調值') {
    轉換結果.聲調 = 轉換爲折線調值[讀音.聲調];
  }

  return 轉換結果;
}

if (
    選項.標調方式 === '符號調號' ||
    選項.標調方式 === '數字調值' ||
    選項.標調方式 === '折線調值'
  ) {
  白讀音 = 白讀音 ? 轉換標調方式(白讀音, 選項.標調方式) : null;
  文讀音 = 文讀音 ? 轉換標調方式(文讀音, 選項.標調方式) : null;
}

// 返回結果
const 白讀音結果 = 白讀音 ? 白讀音.聲母 + 白讀音.韻母 + 白讀音.聲調 : null;
const 文讀音結果 = 文讀音 ? 文讀音.聲母 + 文讀音.韻母 + 文讀音.聲調 : null;
let 結果 = null;

if (選項.文白讀 === '僅白讀') {
  結果 = 白讀音結果;
} else if (選項.文白讀 === '僅文讀') {
  結果 = 文讀音結果;
} else if (選項.文白讀 === '文上白下') {
  if (文讀音結果 === 白讀音結果) {
    結果 = 文讀音結果;
  } else {
    結果 = 文讀音結果 + '\n' + 白讀音結果;
  }
}

return 結果;
});

/**
 * 推導大埔話（百侯聲）
 *
 * 音系及IPA標法見：https://zhuanlan.zhihu.com/p/349914674
 * 拼音方案見：https://zhuanlan.zhihu.com/p/350459791
 * 推導規則描述：https://zhuanlan.zhihu.com/p/392372782
 * 
 * @author 以成
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的推導大埔話（百侯聲）
 */
export function taibu(音韻地位, 字頭, 選項) {
  return schemas.taibu(音韻地位, 字頭, 選項);
}

schemas.ayaka_v8 = Qieyun.推導方案.建立(function (音韻地位, 字頭, 選項) {
// 1. 選項

if (!音韻地位) return [
  ['$legacy', true],
  // '平假名': 地 ち
  // '片假名': 地 チ
  // '日本式羅馬字': 地 ti
  // '平文式羅馬字': 地 chi
  ['書寫系統', [3, '平假名', '片假名', '日本式羅馬字', '平文式羅馬字']],

  // true: 迥 ク𛅥ィ
  // false: 迥 クヱィ
  // 僅當開啓假名時生效
  ['ヰヱヲ小假名', true],

  // null: 宙 チウ tiu；南 ダム dam；愁 スウ suu
  // '現代日語': 宙 チュウ tyuu；南 ダン dan；愁 スウ suu
  ['音變', [1, null, '現代日語']],

  // null: 無聲調
  // '四聲': 四聲
  // '四聲（數字）': 四聲，以數字方式展示
  // '四聲（調值）': 四聲，以調值方式展示
  // '六聲（調值）': 六聲，以調值方式展示
  // '六聲（符號）': 六聲，以符號方式展示
  // '八聲': 八聲
  // '八聲（數字）': 八聲，以數字方式展示
  // '八聲（調值）': 八聲，以調值方式展示
  // 參考：尉遲治平. 日本悉曇家所傳古漢語調值.
  ['聲調', [1, null, '四聲', '四聲（數字）', '四聲（調值）', '六聲（調值）', '六聲（符號）', '八聲', '八聲（數字）', '八聲（調值）']],
];

// 2. 輔助函數

const 假名表 = {
  a:  'ア', i:  'イ', u:  'ウ', e:  'エ', o:  'オ',
  ka: 'カ', ki: 'キ', ku: 'ク', ke: 'ケ', ko: 'コ',
  ga: 'ガ', gi: 'ギ', gu: 'グ', ge: 'ゲ', go: 'ゴ',
  sa: 'サ', si: 'シ', su: 'ス', se: 'セ', so: 'ソ',
  za: 'ザ', zi: 'ジ', zu: 'ズ', ze: 'ゼ', zo: 'ゾ',
  ta: 'タ', ti: 'チ', tu: 'ツ', te: 'テ', to: 'ト',
  da: 'ダ', di: 'ヂ', du: 'ヅ', de: 'デ', do: 'ド',
  na: 'ナ', ni: 'ニ', nu: 'ヌ', ne: 'ネ', no: 'ノ',
  pa: 'ハ', pi: 'ヒ', pu: 'フ', pe: 'ヘ', po: 'ホ',
  ba: 'バ', bi: 'ビ', bu: 'ブ', be: 'ベ', bo: 'ボ',
  ma: 'マ', mi: 'ミ', mu: 'ム', me: 'メ', mo: 'モ',
  ya: 'ヤ',           yu: 'ユ',           yo: 'ヨ',
  ra: 'ラ', ri: 'リ', ru: 'ル', re: 'レ', ro: 'ロ',
  wa: 'ワ', wi: 'ヰ',           we: 'ヱ', wo: 'ヲ',
};

const 拗音表 = {
  wya: 'ヰャ', wyo: 'ヰョ',
  ya: 'ャ', yu: 'ュ', yo: 'ョ',
  wa: 'ヮ', wi: '𛅤', we: '𛅥', wo: '𛅦',
};

const 韻尾表 = {
  '': '', i: 'イ', u: 'ウ',
  m: 'ム', n: 'ン', ng: 'ゥ', // ng: 'ィ',
  p: 'フ', t: 'ツ', k: 'ク', // k: 'キ',
};

function roma2kata(s) {
  const r = /^([kgsztdnpbmyrw]?w??[yw]?)([aiueo])([ptkmngiu]*)$/g; // 將音節分為韻頭、主要元音及韻尾
  const match = r.exec(s);
  if (match == null) {
    throw new Error('無法轉換為假名：' + s);
  }
  const { 1: 韻頭, 2: 主要元音, 3: 韻尾 } = match;
  let 假名韻尾 = 韻尾表[韻尾];
  if (主要元音 === 'e') {
    if (韻尾 === 'k') 假名韻尾 = 'キ';
    if (韻尾 === 'ng') 假名韻尾 = 'ィ';
  }
  if (韻頭.length <= 1) {
    return 假名表[韻頭 + 主要元音] + 假名韻尾;
  }
  const 填充元音 = 韻頭[1] === 'w' ? 'u' : 'i'; // 韻頭[1] 只能為 w 或 y
  return 假名表[韻頭[0] + 填充元音] + 拗音表[韻頭.slice(1) + 主要元音] + 假名韻尾;
}

function kata2hira(s) {
  const diff = 'ぁ'.charCodeAt(0) - 'ァ'.charCodeAt(0);
  return [...s].map((c) => {
    switch (c) {
      case '𛅤': return '𛅐';
      case '𛅥': return '𛅑';
      case '𛅦': return '𛅒';
      default: return String.fromCharCode(c.charCodeAt(0) + diff);
    }
  }).join('');
}

function small2large(s) {
  return [...s].map((c) => {
    switch (c) {
      case '𛅤': return 'ヰ';
      case '𛅥': return 'ヱ';
      case '𛅦': return 'ヲ';
      default: return c;
    }
  }).join('');
}

// 3. 推導規則

const is = (x) => 音韻地位.屬於(x);

function 聲母規則() {
  // 幫組
  if (is('幫滂並母')) return 'p';
  if (is('明母')) return is('梗攝') && !is('庚耕青韻 入聲') ? 'm' : 'b';

  // 端組、來母
  if (is('端透定母')) return 't';
  if (is('泥母')) return is('梗攝') ? 'n' : 'd';
  if (is('來母')) return 'r';

  // 知組
  if (is('知徹澄母')) return 't';
  if (is('孃母')) return is('梗攝') ? 'n' : 'd';

  // 精組
  if (is('精清從心邪母')) return 's';

  // 莊組
  if (is('莊初崇生俟母')) return 's';

  // 章組、日母
  if (is('章昌船書常母')) return 's';
  if (is('日母')) return 'z';

  // 見組
  if (is('見溪羣母')) return 'k';
  if (is('疑母')) return 'g';

  // 影組、以母
  if (is('影母')) return '';
  if (is('曉匣母')) return 'k';
  if (is('云以母')) return '';

  throw new Error('無聲母規則');
}

function 韻母規則() {
  // 通攝
  if (is('東韻 一等')) return 'ong';
  if (is('東韻 三等 幫滂並母')) return is('舒聲') ? 'ong' : 'uk';
  if (is('東韻 三等 明母')) return 'ong';
  if (is('東韻 三等 精莊章組')) return 'yung';
  if (is('東韻 三等 舌齒音')) return is('舒聲') ? 'yung' : 'ik';
  if (is('東韻 三等 影母')) return is('舒聲') ? 'yung' : 'wik';
  if (is('東韻 三等 牙喉音')) return is('舒聲') ? 'yung' : 'ik';
  if (is('冬韻')) return 'ong';
  if (is('鍾韻 脣音')) return 'ong';
  if (is('鍾韻')) return 'yong';

  // 江攝
  if (is('江韻')) return 'ang';

  // 止攝
  if (is('支脂之微韻 脣音')) return 'i';
  if (is('支脂之微韻 開口')) return 'i';
  if (is('支脂之微韻 合口 舌齒音')) return 'ui';
  if (is('支脂之微韻 合口 牙喉音')) return 'wi';

  // 遇攝
  if (is('魚韻 莊組')) return 'o';
  if (is('魚韻 舌齒音')) return 'yo';
  if (is('魚韻 牙喉音')) return 'yo';
  if (is('虞韻 脣音')) return 'u';
  if (is('虞韻 來母')) return 'u';
  if (is('虞韻 知組')) return 'yuu';
  if (is('虞韻 莊組')) return 'u';
  if (is('虞韻 舌齒音')) return 'yu';
  if (is('虞韻 以母')) return 'yu';
  if (is('虞韻 牙喉音')) return 'u';
  if (is('模韻 幫組')) return 'o';
  if (is('模韻 舌齒音')) return 'o';
  if (is('模韻 影母')) return 'wo';
  if (is('模韻 牙喉音')) return 'o';

  // 蟹攝
  if (is('祭齊韻 脣音')) return 'ei';
  if (is('祭齊韻 開口')) return 'ei';
  if (is('祭齊韻 合口')) return 'wei';
  if (is('泰佳皆夬韻 脣音')) return 'ai';
  if (is('泰佳皆夬韻 開口')) return 'ai';
  if (is('泰佳皆夬韻 合口')) return 'wai';
  if (is('灰韻')) return 'wai';
  if (is('咍韻')) return 'ai';
  if (is('廢韻 脣音')) return 'ei';
  if (is('廢韻 開口')) return 'ei';
  if (is('廢韻 合口')) return 'wai';

  // 臻攝
  if (is('眞韻 脣音')) return 'in';
  if (is('眞韻 開口')) return 'in';
  if (is('眞韻 合口 來母')) return 'in';
  if (is('眞韻 合口 莊組')) return is('舒聲') ? 'on' : 'it';
  if (is('眞韻 合口 舌齒音')) return is('舒聲') ? 'yun' : 'ot';
  if (is('眞韻 合口 云母')) return 'win';
  if (is('眞韻 合口 牙喉音')) return 'in';
  if (is('臻韻')) return 'in';
  if (is('文韻')) return 'un';
  if (is('欣韻')) return 'in';
  if (is('元韻 脣音')) return 'an';
  if (is('元韻 開口')) return 'en';
  if (is('元韻 合口')) return 'wen';
  if (is('魂痕韻')) return 'on';

  // 山攝
  if (is('寒刪山韻 脣音')) return 'an';
  if (is('寒刪山韻 開口')) return 'an';
  if (is('寒刪山韻 合口')) return 'wan';
  if (is('仙先韻 脣音')) return 'en';
  if (is('仙先韻 開口')) return 'en';
  if (is('仙先韻 合口')) return 'wen';

  // 效攝
  if (is('蕭宵韻')) return 'eu';
  if (is('肴韻')) return 'au';
  if (is('豪韻 脣音')) return 'ou';
  if (is('豪韻 舌齒音')) return 'au';
  if (is('豪韻 牙喉音')) return 'au';

  // 果攝
  if (is('歌韻 一等 脣音')) return 'a';
  if (is('歌韻 一等 開口')) return 'a';
  if (is('歌韻 一等 合口')) return 'wa';
  if (is('歌韻 三等 開口')) return 'ya';
  if (is('歌韻 三等 合口')) return 'wa';

  // 假攝
  if (is('麻韻 二等 脣音')) return 'a';
  if (is('麻韻 二等 開口')) return 'a';
  if (is('麻韻 二等 合口')) return 'wa';
  if (is('麻韻 三等 脣音')) return 'ya';
  if (is('麻韻 三等 開口')) return 'ya';

  // 宕攝
  if (is('陽韻 脣音')) return 'ang';
  if (is('陽韻 開口 莊組')) return 'ang';
  if (is('陽韻 開口 舌齒音')) return 'yang';
  if (is('陽韻 開口 牙喉音')) return 'yang';
  if (is('陽韻 合口 舌齒音')) return 'ang';
  if (is('陽韻 合口 影云母')) return 'wang';
  if (is('陽韻 合口 牙喉音')) return 'wyang';
  if (is('唐韻 脣音')) return 'ang';
  if (is('唐韻 開口')) return 'ang';
  if (is('唐韻 合口')) return 'wang';

  // 梗攝
  if (is('庚韻 二等 脣音')) return 'ang';
  if (is('庚韻 二等 開口')) return 'ang';
  if (is('庚韻 二等 合口')) return 'wang';
  if (is('庚韻 三等 脣音')) return 'eng';
  if (is('庚韻 三等 開口')) return 'eng';
  if (is('庚韻 三等 合口')) return 'weng';
  if (is('耕韻')) return 'wang';
  if (is('清青韻 脣音')) return 'eng';
  if (is('清青韻 開口')) return 'eng';
  if (is('清青韻 合口')) return 'weng';

  // 曾攝
  if (is('蒸韻 脣音')) return 'yong';
  if (is('蒸韻 開口 莊組')) return 'ong';
  if (is('蒸韻 開口 舌齒音')) return 'yong';
  if (is('蒸韻 開口 牙喉音')) return 'yong';
  if (is('蒸韻 合口 影云母')) return 'yong';
  if (is('蒸韻 合口 牙喉音')) return 'wyong';
  if (is('登韻')) return 'ong';

  // 流攝
  if (is('尤韻 幫滂並母')) return 'uu';
  if (is('尤韻 明母')) return 'ou';
  if (is('尤韻 莊組')) return 'uu';
  if (is('尤韻 舌齒音')) return 'iu';
  if (is('尤韻 牙喉音')) return 'iu';
  if (is('侯韻')) return 'ou';
  if (is('幽韻')) return 'iu';

  // 深攝
  if (is('侵韻')) return 'im';

  // 咸攝
  if (is('覃談韻')) return 'am';
  if (is('鹽添嚴韻')) return 'em';
  if (is('咸銜凡韻')) return 'am';

  throw new Error('無韻母規則');
}

let 聲母 = 聲母規則();
let 韻母 = 韻母規則();

if (is('入聲')) {
  if (韻母.endsWith('m')) 韻母 = 韻母.slice(0, -1) + 'p';
  else if (韻母.endsWith('n')) 韻母 = 韻母.slice(0, -1) + 't';
  else if (韻母.endsWith('ng')) 韻母 = 韻母.slice(0, -2) + 'k';
}

function 聲調規則() {
  if (['四聲', '四聲（數字）', '四聲（調值）'].includes(選項.聲調)) {
    const idx = ['四聲', '四聲（數字）', '四聲（調值）'].indexOf(選項.聲調);
    if (is('平聲')) return ['꜀', '1', '11'][idx];
    if (is('上聲')) return ['꜂', '2', '55'][idx];
    if (is('去聲')) return ['꜄', '3', '15'][idx];
    if (is('入聲')) return ['꜆', '4', '1'][idx];
    throw new Error('無聲調規則');
  }

  if (選項.聲調 === '六聲（調值）') {
    if (is('平聲 全濁')) return '11';
    if (is('平聲')) return '51';
    if (is('上去聲 全濁')) return '15';
    if (is('上去聲')) return '55';
    if (is('入聲 全濁')) return '1';
    if (is('入聲')) return '5';
    throw new Error('無聲調規則');
  }

  if (選項.聲調 === '六聲（符號）') {
    if (is('平聲 全濁')) return 'z';
    if (is('平聲')) return '';
    if (is('上去聲 全濁')) return 'h';
    if (is('上去聲')) return 'x';
    if (is('入聲 全濁')) {
      if (韻母.endsWith('p')) 韻母 = 韻母.slice(0, -1) + 'b';
      else if (韻母.endsWith('t')) 韻母 = 韻母.slice(0, -1) + 'd';
      else if (韻母.endsWith('k')) 韻母 = 韻母.slice(0, -1) + 'g';

      return '';
    }
    if (is('入聲')) return '';
    throw new Error('無聲調規則');
  }

  if (['八聲', '八聲（數字）', '八聲（調值）'].includes(選項.聲調)) {
    const idx = ['八聲', '八聲（數字）', '八聲（調值）'].indexOf(選項.聲調);
    if (!is('全濁')) {
      if (is('平聲')) return ['꜀', '1', '51'][idx];
      if (is('上聲')) return ['꜂', '2', '55'][idx];
      if (is('去聲')) return ['꜄', '3', '535'][idx];
      if (is('入聲')) return ['꜆', '4', '5'][idx];
    } else {
      if (is('平聲')) return ['꜁', '5', '11'][idx];
      if (is('上聲')) return ['꜃', '6', '15'][idx];
      if (is('去聲')) return ['꜅', '7', '315'][idx];
      if (is('入聲')) return ['꜇', '8', '1'][idx];
    }
    throw new Error('無聲調規則');
  }

  return '';
}

let 聲調 = 聲調規則();

if (韻母.startsWith('w') && (!is('牙喉音') || is('重紐A類 或 以母'))) 韻母 = 韻母.slice(1);

// 4. 音變規則

if (選項.音變 === '現代日語') {
  if (韻母.startsWith('w')) 韻母 = 韻母.slice(1); // 園 wen -> en

  if (韻母.endsWith('p')) 韻母 = 韻母.slice(0, -1) + 'u'; // 鄴 gep -> geu
  else if (韻母.endsWith('m')) 韻母 = 韻母.slice(0, -1) + 'n'; // 南 dam -> dan
  else if (韻母.endsWith('eng')) 韻母 = 韻母.slice(0, -2) + 'i'; // 生 seng -> sei
  else if (韻母.endsWith('ng')) 韻母 = 韻母.slice(0, -2) + 'u'; // 相 syang -> syau

  if (韻母.endsWith('au')) 韻母 = 韻母.slice(0, -2) + 'ou'; // 高 kau -> kou
  else if (韻母.endsWith('iu')) 韻母 = 韻母.slice(0, -2) + 'yuu'; // 宙 tiu -> tyuu
  else if (韻母.endsWith('eu')) 韻母 = 韻母.slice(0, -2) + 'you'; // 遙 eu -> you
  else if (韻母.endsWith('ang')) 韻母 = 韻母.slice(0, -3) + 'ong'; // 相 syang -> syong
}

let 聲韻;

if (['平假名', '片假名'].includes(選項.書寫系統)) {
  聲韻 = roma2kata(聲母 + 韻母);
  if (!選項.ヰヱヲ小假名) 聲韻 = small2large(聲韻);
  if (選項.書寫系統 === '平假名') 聲韻 = kata2hira(聲韻);
} else {
  if (選項.音變 === '現代日語') {
    if (聲母 === 'p') 聲母 = 'h'; // 甫 pu -> hu

    if (韻母.endsWith('t')) 韻母 = 韻母 + 'u'; // 遏 at -> atu
    else if (韻母.endsWith('ek')) 韻母 = 韻母 + 'i'; // 席 sek -> seki
    else if (韻母.endsWith('k')) 韻母 = 韻母 + 'u'; // 澤 tak -> taku
  }

  if (選項.書寫系統 === '平文式羅馬字') {
    if (選項.音變 === '現代日語') {
      if (聲母 === 's' && 韻母.startsWith('i')) 聲母 = 'sh'; // 四 si -> shi
      else if (聲母 === 'z' && 韻母.startsWith('i')) 聲母 = 'j'; // 人 zin -> jin
      else if (聲母 === 't' && 韻母.startsWith('i')) 聲母 = 'ch'; // 地 ti -> chi
      else if (聲母 === 't' && 韻母.startsWith('u')) 聲母 = 'ts'; // 追 tui -> tsui
      else if (聲母 === 'h' && 韻母.startsWith('u')) 聲母 = 'f'; // 甫 hu -> fu
      else if (聲母 === 's' && 韻母.startsWith('y')) { 聲母 = 'sh'; 韻母 = 韻母.slice(1); } // 小 syou -> shou
      else if (聲母 === 'z' && 韻母.startsWith('y')) { 聲母 = 'j'; 韻母 = 韻母.slice(1); } // 繞 zyou -> jou
      else if (聲母 === 't' && 韻母.startsWith('y')) { 聲母 = 'ch'; 韻母 = 韻母.slice(1); } // 兆 tyou -> chou

      if (聲母 === 'd' && 韻母.startsWith('i')) 聲母 = 'j'; // 膩 di -> ji
      else if (聲母 === 'd' && 韻母.startsWith('y')) { 聲母 = 'j'; 韻母 = 韻母.slice(1); } // 紐 dyuu -> juu

      if (韻母.endsWith('tu')) 韻母 = 韻母.slice(0, -1) + 'su'; // 遏 atu -> atsu
    }
  }

  聲韻 = 聲母 + 韻母;
}

return [...'꜀꜁꜂꜃'].includes(聲調) ? 聲調 + 聲韻 : 聲韻 + 聲調;
});

/**
 * 綾香思考音系
 *
 * https://ayaka.shn.hk/v8/
 *
 * @author Ayaka
 * @param {Qieyun.音韻地位} 音韻地位 切韻音系音韻地位
 * @param {string=} 字頭 字頭（可選）
 * @param {Object=} 選項 選項（可選）
 * @return {string} 音韻地位對應的綾香思考音系
 */
export function ayaka_v8(音韻地位, 字頭, 選項) {
  return schemas.ayaka_v8(音韻地位, 字頭, 選項);
}
