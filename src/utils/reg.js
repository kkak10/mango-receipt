export function dateRegExp(text) {
  const dateRegExpList = [/\d{4}-\d{2}-\d{2}/, /\d{4}.\d{2}.\d{2}/, /\d{2}.\d{2}.\d{2}/, /\d{2}-\d{2}-\d{2}/];

  return commonRegExp(text, dateRegExpList);
}

export function priceRegExp(text) {
  const priceRegExpList = [/^(\d*([.,](?=\d{3}))?\d+)+((?!\2)[.,]\d\d)?$/];

  return commonRegExp(text, priceRegExpList);
}

function commonRegExp(text, regExpList = []) {
  const regExpString = regExpList
    .map(reg => new RegExp(reg).source)
    .join("|");
  const regExWrap = new RegExp(regExpString);
  const matchList = text.match(regExWrap);

  if(Array.isArray(matchList)) {
    return matchList[0];
  }

  return null;
}