const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = '/var/www/mesendger/messenger.db';
const db = new sqlite3.Database(dbPath);

const users = [
  ['elena_plakhutenko', '', 'Елена Плахутенко'],
  ['anna_marchenko', '', 'Анна Марченко'],
  ['anna_danko', '', 'Анна Данько'],
  ['svetlana_nedomovnaya', '', 'Светлана Недомовная'],
  ['valentina_bulgakova2', '', 'Валентина Булгакова2'],
  ['elena_muratkova', '', 'Елена Мураткова'],
  ['tatyana_ryabenko', '', 'Татьяна Рябенко'],
  ['irina_katasonova', '', 'Ирина Катасонова'],
  ['vladislav_levkovskiy', '', 'Владислав Левковский'],
  ['ekaterina_krivoruchko', '', 'Криворучко Екатерина'],
  ['aleksandra_cushko', '', 'Александра Цушко'],
  ['anastasia_nosova', '', 'Анастасия Носова'],
  ['irina_chumak', '', 'Ирина Чумак'],
  ['ivan_porchak', '', 'Иван Порчак'],
  ['lyubov_kozlovskaya', '', 'Любовь Козловская'],
  ['olga_gayday', '', 'Ольга Гайдай'],
  ['marina_mamrockaya', '', 'Марина Мамроцкая'],
  ['natalya_baltazhi', '', 'Наталья Балтажи'],
  ['tatyana_linenko', '', 'Татьяна Линенко'],
  ['yuliya_sukhanova', '', 'Юлия Суханова'],
  ['tatyana_karpov', '', 'Татьяна Карпов'],
  ['irina_plyukhina', '', 'Ирина Плюхина'],
  ['viola_peshko', '', 'Виола Пешко'],
  ['artem_bogopolskiy', '', 'Артем Богопольский'],
  ['vitaliy_markov', '', 'Виталий Марков'],
  ['snezhana_nakempiy', '', 'Снежана Накемпий'],
  ['konstantin_denisenko', '', 'Константин Денисенко'],
  ['nikolay_bodnar', '', 'Николай Боднар'],
  ['sergey_sorokopud', '', 'Сергей Сорокопуд'],
  ['natalya_turbanova', '', 'Наталья Турбанова'],
  ['elena_popovich', '', 'Елена Попович'],
  ['andrey_ismailov', '', 'Андрей Исмаилов'],
  ['pavel_eremeev', '', 'Павел Еремеев'],
  ['katerina_goretska', '', 'Катерина Горецька'],
  ['Alina-Sivokon', '', 'Алина Сивоконь'],
  ['Valentina-Bondarenko', '', 'Валентина Бондаренко']
];

db.serialize(() => {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  users.forEach(([username, password, fio], index) => {
    db.run(
      `INSERT INTO users (username, password, fio) VALUES (?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET fio=excluded.fio`,
      [username, password, fio],
      function(err) {
        if (err) {
          console.error(`❌ Ошибка для ${username}:`, err.message);
          errors++;
        } else {
          if (this.changes === 1 && this.lastID) {
            console.log(`✅ Добавлен: ${username} - ${fio}`);
            inserted++;
          } else {
            console.log(`🔄 Обновлен: ${username} - ${fio}`);
            updated++;
          }
        }

        // После обработки всех пользователей
        if (index === users.length - 1) {
          console.log(`\n📊 Статистика:`);
          console.log(`   - Добавлено: ${inserted}`);
          console.log(`   - Обновлено: ${updated}`);
          console.log(`   - Ошибок: ${errors}`);
          db.close();
        }
      }
    );
  });
});

