/* 切韻拼音
 *
 * https://zhuanlan.zhihu.com/p/478751152
 *
 * @author unt
 */

const is = (x) => 音韻地位.屬於(x);

if (!音韻地位) return [
  ['脣音咍韻歸灰韻', true], // 暫只能實現 true
];

// 特字特辦，避免麻煩
if (音韻地位.描述 === '云開三眞平') return 'ghin'; // 礥小韻
if (音韻地位.描述 === '匣合一灰上' && '倄侑'.includes(字頭)) return 'uojq'; // 倄小韻
if (音韻地位.描述 === '並三陽上') return 'biangq'; // 𩦠小韻

function get聲母() {
  if (音韻地位.描述 === '知開三麻平' ||
      音韻地位.描述 === '知開二庚上' && 字頭 === '打') {
    return 't'; // 爹、打小韻
  }
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
  if (音韻地位.描述 === '影開三蒸入' && '抑𡊁𢬃𡊶'.includes(字頭) ||
      音韻地位.描述 === '溪開三蒸平') {
    return '冰'; // 抑、硱小韻歸 B 類
  }
  if (音韻地位.描述 === '溪三尤平' && '𠁫𰀧㲃恘惆𣪘'.includes(字頭)) {
    return '幽'; // 𠁫小韻歸幽韻
  }
  return 音韻地位.判斷([
    ['蒸韻 幫組 或 蒸韻 合口', '冰'],
    ['東韻 三等', '終'],
    ['清韻', '庚'],
    ['陽韻', '唐'],
    ['咍韻 幫組', 選項.脣音咍韻歸灰韻 ? '灰' : '咍'],
    ['莊組 臻欣韻', '眞'],
    ['嚴凡韻 幫組', '凡'],
    ['嚴凡韻', '嚴'],
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
      元音 = 元音列表[item[0].replace(/ /g, '')[is('開口') ? 'indexOf' : 'lastIndexOf'](韻)];
      韻尾 = item[1 + is('入聲')];
      return true;
    }
  });

  // 添加三等 C 介音（僅歌陽韻需要處理）
  if (is('三等') && 元音 === 'a') {
    元音 = (is('開口') ? 'y' : 'u') + 元音;
  }
  // 添加三等 A、B 介音
  if (is('三等') && ['i', 'e', 'ae'].includes(元音)) {
    if (is('重紐B類 或 云母 或 莊組 或 庚蒸韻 或 幽韻 幫組') ||
        音韻地位.描述 === '曉三幽平' && '烋休𠇾'.includes(字頭) ||
        音韻地位.描述 === '溪三幽平' || 音韻地位.描述 === '溪三尤平') { // 烋、𠁫小韻歸 B 類
      元音 = (is('合口') ? 'u' : 'y') + 元音;
    } else if (元音 !== 'i') {
      // 拼莊組以外的銳音一律視爲 A 類（同《切韻》清韻、《廣韻》諄韻的獨立條件）
      元音 = 'i' + 元音;
    }
  }
  // 茝等小韻歸三等
  if (is('齊咍灰韻 章昌常書船日以云母')) {
    元音 = { e: 'ie', eo: 'yo', o: 'uo' }[元音];
  }
  // 添加合口介音
  if (is('合口') && !['u', 'o'].includes(元音[0])) {
    元音 = 'w' + 元音;
  }
  return 元音 + 韻尾;
}

function get聲調() {
  return { 上: 'q', 去: 'h' }[音韻地位.聲] || '';
}

return get聲母() + get韻母() + get聲調();
