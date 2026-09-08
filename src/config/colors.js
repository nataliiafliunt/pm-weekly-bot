// Циклічна палітра для розфарбовування етапів на таймлайні.
// Кожен додаток має свій список етапів (свій порядок), тому колір
// прив'язаний до позиції етапу в межах додатку, а не до назви етапу.

const PALETTE = [
  { bg: '#E6F1FB', text: '#0C447C', name: 'blue' },
  { bg: '#EEEDFE', text: '#3C3489', name: 'purple' },
  { bg: '#E1F5EE', text: '#085041', name: 'teal' },
  { bg: '#FAEEDA', text: '#633806', name: 'amber' },
  { bg: '#FAECE7', text: '#712B13', name: 'coral' },
  { bg: '#FBEAF0', text: '#72243E', name: 'pink' },
  { bg: '#EAF3DE', text: '#27500A', name: 'green' }
];

function colorForStageIndex(index) {
  return PALETTE[index % PALETTE.length];
}

module.exports = { colorForStageIndex };
