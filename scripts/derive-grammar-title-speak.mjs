/**
 * 文法見出し title → TTS 向け title_speak の推定変換。
 * 教材表記の ～・/・(으)・孤立した ㄴ・ㅂ などを、話し言葉に近いハングルへ寄せる。
 * 英語のみのタイトル（英語 UI 用）は記号だけ整え、本文はそのまま。
 */

/** 手で優先したいもの（title 文字列完全一致） */
export const TITLE_SPEAK_OVERRIDES = {
  '～(으)ㄴ가 보다': '는가 보다',
  '～ㄴ/는다고 해도': '는다고 해도',
  // 英語 UI 用タイトル（ko-KR TTS 向けに ~ / を整理）
  'Are you ~?': 'Are you?',
  'Because ~': 'Because',
  'Before ~': 'Before',
  'But ~': 'But',
  'He/She says that ~': 'He or she says that',
  "I didn't think that ~": "I didn't think that",
  'I found out that ～': 'I found out that',
  'I have done ~': 'I have done',
  'I heard that ~': 'I heard that',
  'I hope that ~': 'I hope that',
  'I plan to ~': 'I plan to',
  'I saw that ～': 'I saw that',
  'I should have ~': 'I should have',
  'I think I will ~': 'I think I will',
  'I thought that ~': 'I thought that',
  'I was worried that ~': 'I was worried that',
  'I ~': 'I',
  'Instead of ～': 'Instead of',
  'Is it ~?': 'Is it?',
  'It would be good to ~': 'It would be good to',
  "It's just that ~": "It's just that",
  'Tends to ～': 'Tends to',
  'Thanks to ～': 'Thanks to',
  'The more ~': 'The more',
  'While ～': 'While',
  'even if ~': 'even if',
  'for the purpose of ~': 'for the purpose of',
  'whether to ~ or not': 'whether to or not',
  // 英語＋韓国語パターン（韓国語部分を話せる形に）
  'As (～(으)로서)': '으로서',
  'Because (～(으)ㄹ 테니(까))': '을 테니까',
  'Considering (는)': '는',
  'Due to (～(으)로 인해(서))': '으로 인해서',
  'How much ~ (으)ㄴ/는지': '은지는지',
  'I don\'t know if (～(으)ㄹ지(도) 모르다)': '을지도 모르다',
  'It seems that ~(으)ㄴ/는/(으)ㄹ': '은, 는, 을',
  'It seems that ~았/었/였던': '았었였던',
  'It should be (～(으)ㄹ 텐데)': '을 텐데',
  'On the other hand ~ (으)ㄴ/는': '은, 는',
  'Seeing that ~(으)ㄴ/는': '은, 는',
  'To the extent that (～(으)ㄹ 정도(로))': '을 정도로',
  // 表記ゆれ・残りスラッシュ
  '～( 으 ) ㄹ 것 같다': '을 것 같다',
  '～기/게 마련이다': '기 마련이다',
  '～는/은커녕': '는, 은 커녕',
  '～았/었/였더라면': '았었였더라면',
  '～았/었으면 하다': '았었으면 하다',
};

/**
 * @param {string} title
 * @returns {string}
 */
export function deriveTitleSpeak(title) {
  const o = TITLE_SPEAK_OVERRIDES[title];
  if (o !== undefined) return o;

  let s = String(title ?? '').trim();
  if (!s) return s;

  const hasHangul = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(s);

  // 括弧まわりのスペースを整形: "( 이 ) 랑" → "(이) 랑", "( 으 )" → "(으)"
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  s = s.replace(/\s+/g, ' ').trim();

  // 波ダッシュ（全角）
  s = s.replace(/[～〜]/g, '');

  if (!hasHangul) {
    return s
      .replace(/~/g, ' ')
      .replace(/\s*\/\s*/g, ' or ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 韓国語タイトル内の ASCII ~（残り）
  s = s.replace(/~/g, '');

  // (이)系（閉じ括弧と語の間に空白がある表記も含む）
  s = s.replace(/\(이\)\s*나/g, '이나');
  s = s.replace(/\(이\)\s*랑/g, '이랑');
  s = s.replace(/\(이\)라도/g, '이라도');
  s = s.replace(/\(이\)야말로/g, '이야말로');

  // 助詞の A/B
  s = s.replace(/은\/는/g, '은, 는');
  s = s.replace(/을\/를/g, '을, 를');
  s = s.replace(/이\/가\s*아니다/g, '이, 가 아니다');
  s = s.replace(/이\/가/g, '이, 가');
  s = s.replace(/와\/과/g, '와, 과');

  // ㅂ・ㅅ語尾のスラッシュ
  s = s.replace(/ㅂ\/습니다/g, '습니다');
  s = s.replace(/아\/어요/g, '아요, 어요');
  s = s.replace(/아\/어\//g, '아, 어, ');
  s = s.replace(/아\/어지다/g, '아, 어지다');
  s = s.replace(/아\/어도/g, '아, 어도');
  s = s.replace(/아\/어라/g, '아, 어라');
  s = s.replace(/아\/어야/g, '아, 어야');
  s = s.replace(/아\/어야지/g, '아, 어야지');

  // ㄴ/는 系（口語形に寄せる）
  s = s.replace(/ㄴ\/는다고\s*해도/g, '는다고 해도');
  s = s.replace(/ㄴ\/는다고\(요\)/g, '는다고요');
  s = s.replace(/ㄴ\/는다고\s*치다/g, '는다고 치다');
  s = s.replace(/ㄴ\/는다거나/g, '는다거나');
  s = s.replace(/ㄴ\/는다니까/g, '는다니까');
  s = s.replace(/ㄴ\/는다니/g, '는다니');
  s = s.replace(/ㄴ\/는다더니/g, '는다더니');
  s = s.replace(/ㄴ\/는다더라/g, '는다더라');
  s = s.replace(/ㄴ\/는다던데/g, '는다던데');
  s = s.replace(/ㄴ\/는다면/g, '는다면');
  s = s.replace(/ㄴ\/는\s*척하다/g, '는 척하다');

  // (으) + 子音字母（先に長いパターン）
  s = s.replace(/\(으\)ㄴ\/는\s*김에/g, '는 김에');
  s = s.replace(/\(으\)ㄴ\/는\s*만큼/g, '는 만큼');
  s = s.replace(/\(으\)ㄴ\/는\s*법이다/g, '는 법이다');
  s = s.replace(/\(으\)ㄴ\/는\s*탓에/g, '는 탓에');
  s = s.replace(/\(으\)ㄴ\/는걸\(요\)/g, '는걸요');
  s = s.replace(/\(으\)ㄴ\/는들/g, '는들');
  s = s.replace(/\(으\)ㄴ\/는\/\(으\)ㄹ지/g, '은는을지');
  s = s.replace(/\(으\)ㄴ\/는\/\(으\)ㄹ\s*셈이다/g, '은는을 셈이다');

  s = s.replace(/\(으\)ㄴ가\s*보다/g, '는가 보다');
  s = s.replace(/\(으\)ㄴ\s*것\s*같다/g, '은 것 같다');
  s = s.replace(/\(으\)ㄴ\s*적이\s*없다/g, '은 적이 없다');
  s = s.replace(/\(으\)ㄴ\s*지/g, '은 지');
  s = s.replace(/\(으\)ㄴ\s*채\(로\)/g, '은 채로');
  s = s.replace(/\(으\)ㄴ\s*후에/g, '은 후에');
  s = s.replace(/\(으\)ㄴ데\(요\)/g, '은데요');

  s = s.replace(/\(으\)ㄹ\s*것\s*같다/g, '을 것 같다');
  s = s.replace(/\(으\)ㄹ\s*것이다/g, '을 것이다');
  s = s.replace(/\(으\)ㄹ\s*때/g, '을 때');
  s = s.replace(/\(으\)ㄹ\s*리가\s*없다/g, '을 리가 없다');
  s = s.replace(/\(으\)ㄹ\s*만하다/g, '을 만하다');
  s = s.replace(/\(으\)ㄹ\s*뻔하다/g, '을 뻔하다');
  s = s.replace(/\(으\)ㄹ\s*뿐만\s*아니라/g, '을 뿐만 아니라');
  s = s.replace(/\(으\)ㄹ\s*수\s*없다/g, '을 수 없다');
  s = s.replace(/\(으\)ㄹ\s*수\s*있다/g, '을 수 있다');
  s = s.replace(/\(으\)ㄹ\s*수밖에\s*\(없다\)/g, '을 수밖에 없다');
  s = s.replace(/\(으\)ㄹ\s*지경이다/g, '을 지경이다');
  s = s.replace(/\(으\)ㄹ게요/g, '을게요');
  s = s.replace(/\(으\)ㄹ까요/g, '을까요');
  s = s.replace(/\(으\)ㄹ래요/g, '을래요');
  s = s.replace(/\(으\)ㅂ시다/g, '읍시다');
  s = s.replace(/\(으\)나\s*마나/g, '으나 마나');
  s = s.replace(/\(으\)니까/g, '으니까');
  s = s.replace(/\(으\)니만큼/g, '으니만큼');
  s = s.replace(/\(으\)라고\s*하다/g, '이라고 하다');
  s = s.replace(/\(으\)러\s*가다/g, '으러 가다');
  s = s.replace(/\(으\)러\s*오다/g, '으러 오다');
  s = s.replace(/\(으\)려고\s*하다/g, '려고 하다');
  s = s.replace(/\(으\)려다가/g, '려다가');
  s = s.replace(/\(으\)려던\s*참이다/g, '려던 참이다');
  s = s.replace(/\(으\)려면/g, '려면');
  s = s.replace(/\(으\)며/g, '으며');
  s = s.replace(/\(으\)면/g, '면');
  s = s.replace(/\(으\)면\s*되다/g, '면 되다');
  s = s.replace(/\(으\)면서/g, '면서');
  s = s.replace(/\(으\)므로/g, '므로');
  s = s.replace(/\(으\)세요/g, '세요');
  s = s.replace(/\(으\)십시오/g, '십시오');
  s = s.replace(/\(으\)로\s*인해\(서\)/g, '으로 인해서');
  s = s.replace(/\(이\)나\s*～\(이\)나\s*할\s*것\s*없이/g, '이나 할 것 없이');
  s = s.replace(/\(이\)지요\?/g, '이지요');

  // 남った (으) を簡略（ロのパターン）
  s = s.replace(/\(으\)ㄹ\s*정도\(로\)/g, '을 정도로');
  s = s.replace(/\(으\)ㄹ\s*테니\(까\)/g, '을 테니까');
  s = s.replace(/\(으\)ㄹ\s*텐데/g, '을 텐데');
  s = s.replace(/\(으\)ㄹ지\(도\)\s*모르다/g, '을지도 모르다');
  s = s.replace(/\(으\)로서/g, '으로서');
  s = s.replace(/\(으\)려고/g, '려고');

  // ～ ( 으 ) 로 のような分断
  s = s.replace(/\(으\)로/g, '으로');
  s = s.replace(/로\s*인해\(서\)/g, '로 인해서');

  // 残る括弧つき 으
  s = s.replace(/\(으\)/g, '');

  // 孤立しがちな ㄴ（パターン名として）
  s = s.replace(/ㄴ\/는/g, '는');
  s = s.replace(/～는\s*\(도\)중에/g, '는 중에');
  s = s.replace(/～는\s*길에/g, '는 길에');
  s = s.replace(/～는\s*대로/g, '는 대로');
  s = s.replace(/～는\s*바람에/g, '는 바람에');
  s = s.replace(/～는\s*사이에/g, '는 사이에');
  s = s.replace(/～는\s*셈\s*치다/g, '는 셈 치다');
  s = s.replace(/～는\s*수\(가\)\s*있다/g, '는 수가 있다');
  s = s.replace(/～는\s*수밖에\s*\(없다\)/g, '는 수밖에 없다');
  s = s.replace(/～는\s*중이다/g, '는 중이다');
  s = s.replace(/～는\s*통에/g, '는 통에');
  s = s.replace(/～는\s*한/g, '는 한');
  s = s.replace(/～는\s*한편/g, '는 한편');
  s = s.replace(/～는\/은커녕/g, '는은커녕');
  s = s.replace(/～는구나/g, '는구나');
  s = s.replace(/～는데/g, '는데');

  s = s.replace(/～나\s*보다/g, '나 보다');
  s = s.replace(/～냐고\s*하다/g, '냐고 하다');
  s = s.replace(/～느라고/g, '느라고');

  // その他 ～ で始まる一般的な語尾
  const tailReplacements = [
    [/～게\s*되다/g, '게 되다'],
    [/～게\s*하다/g, '게 하다'],
    [/～고\s*나니\(까\)/g, '고 나니까'],
    [/～고\s*나면/g, '고 나면'],
    [/～고\s*나서/g, '고 나서'],
    [/～고\s*말고\(요\)/g, '고 말고요'],
    [/～고\s*말다/g, '고 말다'],
    [/～고\s*보면/g, '고 보면'],
    [/～고\s*싶다/g, '고 싶다'],
    [/～고\s*있다/g, '고 있다'],
    [/～곤\s*하다/g, '곤 하다'],
    [/～군요/g, '군요'],
    [/～기\s*때문에/g, '기 때문에'],
    [/～기\s*쉽다/g, '기 쉽다'],
    [/～기\s*십상이다/g, '기 십상이다'],
    [/～기\s*어렵다/g, '기 어렵다'],
    [/～기\s*위해\(서\)/g, '기 위해서'],
    [/～기\/게\s*마련이다/g, '기 마련이다'],
    [/～기는\s*하지만/g, '기는 하지만'],
    [/～기는\(요\)/g, '기는요'],
    [/～기로\s*하다/g, '기로 하다'],
    [/～기만\s*하면\s*\(되다\)/g, '기만 하면 되다'],
    [/～기에\(는\)/g, '기에는'],
    [/～길래/g, '길래'],
    [/～거든/g, '거든'],
    [/～거나/g, '거나'],
    [/～게/g, '게'],
    [/～고/g, '고'],
    [/～께/g, '께'],
    [/～께서/g, '께서'],
    [/～네요/g, '네요'],
    [/～대로/g, '대로'],
    [/～더군\(요\)/g, '더군요'],
    [/～더니/g, '더니'],
    [/～더라도/g, '더라도'],
    [/～던/g, '던'],
    [/～던가\(요\)\?/g, '던가요'],
    [/～던데/g, '던데'],
    [/～도록/g, '도록'],
    [/～든지/g, '든지'],
    [/～듯이/g, '듯이'],
    [/～만\s*못하다/g, '만 못하다'],
    [/～다\(가\)\s*보니\(까\)/g, '다가 보니까'],
    [/～다\(가\)\s*보면/g, '다가 보면'],
    [/～다시피/g, '다시피'],
    [/～자/g, '자'],
    [/～자고\s*하다/g, '자고 하다'],
    [/～자마자/g, '자마자'],
    [/～잖아\(요\)/g, '잖아요'],
    [/～지\s*말다/g, '지 말다'],
    [/～지\s*못하다/g, '지 못하다'],
    [/～지\s*않다/g, '지 않다'],
    [/～지만/g, '지만'],
    [/～까지/g, '까지'],
    [/～만/g, '만'],
    [/～보다/g, '보다'],
    [/～부터/g, '부터'],
    [/～에게/g, '에게'],
    [/～에서/g, '에서'],
    [/～하고/g, '하고'],
    [/～한테/g, '한테'],
    [/～에게서/g, '에게서'],
    [/～한테서/g, '한테서'],
    [/～처럼/g, '처럼'],
    [/～마저/g, '마저'],
    [/～조차/g, '조차'],
    [/～마다/g, '마다'],
    [/～밖에/g, '밖에'],
    [/～만큼/g, '만큼'],
    [/～에\s*관해\(서\)/g, '에 관해서'],
    [/～에\s*대해\(서\)/g, '에 대해서'],
    [/～에\s*따라\(서\)/g, '에 따라서'],
    [/～에\s*의해\(서\)/g, '에 의해서'],
    [/～에다\(가\)/g, '에다가'],
    [/～을\/를\s*비롯한/g, '을를 비롯한'],
    [/～을\/를\s*통해\(서\)/g, '을를 통해서'],
    [/～았\/었\/였더라면/g, '았었였더라면'],
    [/～았\/었으면\s*하다/g, '았었으면 하다'],
    [/～아\/어\/여야\s*되다/g, '아어여야 되다'],
    [/～아\/어\/여야\s*하다/g, '아어여야 하다'],
    [/～아\/어\/여서\s*그런지/g, '아어여서 그런지'],
  ];
  for (const [re, rep] of tailReplacements) {
    s = s.replace(re, rep);
  }

  // まだ ～ が残る場合は除去
  s = s.replace(/～/g, '');

  // 空白・括弧の整理
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*\(\s*\)/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}
