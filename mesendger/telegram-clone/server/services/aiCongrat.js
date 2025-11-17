const { geminiGenerate } = require('./gemini');

// employee: { first_name, last_name, birth_day, birth_month, birth_year }
async function generateCongratulation(employee, style = 'business-humor') {
  const prompt = `Сгенерируй поздравление только с днём рождения для сотрудника по имени ${employee.first_name} ${employee.last_name}, дата рождения: ${employee.birth_day}.${employee.birth_month}.${employee.birth_year}. Обращайся на "ты", стиль современный, дружелюбный, неофициальный, с лёгким юмором. Не используй слово "Добро пожаловать". Не упоминай "Issa Plus" в тексте поздравления, только в подписи в самом конце. Пример подписи: \n\nЗ повагою,\nКолектив Issa Plus`;
  const congratText = await geminiGenerate(prompt);
  return congratText;
}

module.exports = { generateCongratulation };
