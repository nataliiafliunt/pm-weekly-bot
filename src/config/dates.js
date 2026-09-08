// Возвращает границы текущей рабочей недели (понедельник-пятница)
// и её ключ в формате YYYY-MM-DD (дата понедельника) - используется
// как идентификатор недели во всех задачах и отчётах.

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = воскресенье, 1 = понедельник, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    start: monday,
    end: friday,
    key: formatDate(monday)
  };
}

module.exports = { getWeekRange, formatDate };
