const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');
const path = require('path');

// Инициализация Firebase
const serviceAccount = require('.\botkinohata\firebase-credentials.json');  // Убедитесь, что путь верный

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Создание экземпляра бота
const bot = new Telegraf('YOUR_BOT_TOKEN'); // Замените на ваш реальный токен

// Команда /start - Приветственное сообщение
bot.start((ctx) => {
  ctx.reply('Привет! Пожалуйста, отправь свой ID или Email для регистрации.');
});

// Обработка регистрации пользователя
bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const userInput = ctx.message.text;

  const userRef = db.collection('users').doc(userId.toString());

  userRef.get().then((doc) => {
    if (doc.exists) {
      ctx.reply(`Пользователь найден! Подписка: ${doc.data().subscription ? 'Активна' : 'Неактивна'}`);
    } else {
      userRef.set({
        email: userInput,
        subscription: false,
        history: [],
        historyTransaction: []
      }).then(() => {
        ctx.reply('Регистрация успешна! Ваши данные сохранены.');
      }).catch((err) => {
        ctx.reply('Ошибка при регистрации. Попробуйте снова.');
      });
    }
  });
});

// Оформление подписки
bot.command('subscribe', (ctx) => {
  const userId = ctx.from.id;
  const userRef = db.collection('users').doc(userId.toString());

  userRef.get().then((doc) => {
    if (doc.exists) {
      userRef.update({
        subscription: true
      }).then(() => {
        ctx.reply('Подписка активирована!');
      }).catch((err) => {
        ctx.reply('Ошибка при активации подписки. Попробуйте снова.');
      });
    } else {
      ctx.reply('Пожалуйста, сначала зарегистрируйтесь.');
    }
  });
});

// Обработка чека
bot.command('check', (ctx) => {
  const userId = ctx.from.id;
  const userRef = db.collection('users').doc(userId.toString());

  const messageText = ctx.message.text;
  const checkImage = ctx.message.photo ? ctx.message.photo[0].file_id : null;

  if (checkImage) {
    const checkImageUrl = `https://api.telegram.org/file/bot${bot.token}/${checkImage}`;

    userRef.update({
      historyTransaction: admin.firestore.FieldValue.arrayUnion(`${new Date().toLocaleString()} - чек подтвержден: ${checkImageUrl}`)
    }).then(() => {
      ctx.reply('Чек принят! Ожидайте подтверждения.');
    }).catch((err) => {
      ctx.reply('Ошибка при отправке чека. Попробуйте снова.');
    });
  } else {
    ctx.reply('Пожалуйста, отправьте изображение чека.');
  }
});

// История платежей
bot.command('history', (ctx) => {
  const userId = ctx.from.id;
  const userRef = db.collection('users').doc(userId.toString());

  userRef.get().then((doc) => {
    if (doc.exists) {
      const history = doc.data().historyTransaction;
      if (history.length === 0) {
        ctx.reply('Ваша история платежей пуста.');
      } else {
        ctx.reply(`Ваша история платежей:\n${history.join('\n')}`);
      }
    } else {
      ctx.reply('Пожалуйста, сначала зарегистрируйтесь.');
    }
  });
});

// Поддержка
bot.command('support', (ctx) => {
  const userId = ctx.from.id;
  const userRef = db.collection('users').doc(userId.toString());

  const supportMessage = ctx.message.text.split(' ').slice(1).join(' '); // Извлекаем текст запроса

  userRef.get().then((doc) => {
    if (doc.exists) {
      // Сохраняем запрос в коллекции support
      const userData = doc.data();
      const supportRef = db.collection('support').doc();
      supportRef.set({
        userId: userData.email,  // Или можно использовать userId для идентификации
        message: supportMessage,
        createdAt: new Date().toISOString(),
        status: 'Ожидает ответа'
      }).then(() => {
        ctx.reply('Ваш запрос отправлен в поддержку. Ожидайте ответа.');
      }).catch((err) => {
        ctx.reply('Ошибка при отправке запроса. Попробуйте снова.');
      });
    } else {
      ctx.reply('Пожалуйста, сначала зарегистрируйтесь.');
    }
  });
});

// Запуск бота
bot.launch().then(() => {
  console.log('Bot is running...');
});
