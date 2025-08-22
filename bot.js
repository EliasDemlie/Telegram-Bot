require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2/promise');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// MySQL connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Track registration and question state
const userState = {};

// Mask phone: only hide two middle digits
function maskPhone(phone) {
    if (phone.length < 4) return phone;
    const first = phone.slice(0, phone.length - 4);
    const middle = "**"; // mask two digits
    const last = phone.slice(phone.length - 2);
    return first + middle + last;
}

// Create tables
(async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS groups_list (
            id BIGINT PRIMARY KEY,
            title VARCHAR(255),
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT PRIMARY KEY,
            username VARCHAR(255),
            full_name VARCHAR(255),
            phone VARCHAR(20),
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS register (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT NOT NULL,
            username VARCHAR(255),
            full_name VARCHAR(255),
            phone VARCHAR(20),
            question TEXT,
            group_message_id BIGINT,
            admin_reply TEXT,
            asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            replied_at TIMESTAMP NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
})();

// Detect when bot is added to a group
bot.on('my_chat_member', async (update) => {
    const chat = update.chat;
    if (chat.type === 'group' || chat.type === 'supergroup') {
        if (update.new_chat_member.status === 'member' || update.new_chat_member.status === 'administrator') {
            await db.execute(
                `INSERT INTO groups_list (id, title) VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE title = VALUES(title)`,
                [chat.id, chat.title]
            );

            bot.sendMessage(chat.id, "✅ Bot added to this group!");
            console.log(`Bot added to group: ${chat.title} (${chat.id})`);
        }
    }
});

// /start or /register command → begin registration
bot.onText(/\/(start|register)/, async (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = { step: "full_name" };
    bot.sendMessage(chatId, "👋 Welcome! Please enter your full name:");
});

// Handle registration process
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.chat.type !== 'private') return;
    if (!userState[chatId]) return;

    const state = userState[chatId];

    // Registration steps
    if (state.step === "full_name") {
        state.full_name = msg.text;
        state.step = "phone";
        bot.sendMessage(chatId, "📱 Now enter your phone number:");
    } 
    else if (state.step === "phone") {
        const phone = msg.text;
        const username = msg.from.username || null;

        // Save user
        await db.execute(
            `INSERT INTO users (id, username, full_name, phone) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE username=VALUES(username), full_name=VALUES(full_name), phone=VALUES(phone)`,
            [chatId, username, state.full_name, phone]
        );

        // Forward registration to latest group
        const [groups] = await db.execute(`SELECT id FROM groups_list ORDER BY added_at DESC LIMIT 1`);
        if (groups.length > 0) {
            const groupId = groups[0].id;
            await bot.sendMessage(groupId, `Name: ${state.full_name}\nPhone: ${maskPhone(phone)}`);
        }

        delete userState[chatId];
        bot.sendMessage(chatId, "✅ Registration complete! Now you can use /askforhelp to send your question.");
    }

    // Question step
    else if (state.step === "question") {
        const question = msg.text;

        // Get user info
        const [rows] = await db.execute(`SELECT * FROM users WHERE id=?`, [chatId]);
        const user = rows[0];

        // Get latest group
        const [groups] = await db.execute(`SELECT id FROM groups_list ORDER BY added_at DESC LIMIT 1`);
        if (groups.length === 0) {
            return bot.sendMessage(chatId, "⚠️ No admin group is registered yet.");
        }

        const groupId = groups[0].id;

        // Forward question: only name + question
        const forwarded = await bot.sendMessage(groupId, `${user.full_name}\n${question}`);

        // Save question
        await db.execute(
            `INSERT INTO register (user_id, username, full_name, phone, question, group_message_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [chatId, user.username, user.full_name, user.phone, question, forwarded.message_id]
        );

        bot.sendMessage(chatId, "✅ Your question has been forwarded to the admin group!");
        delete userState[chatId];
    }
});

// /askforhelp command
bot.onText(/\/askforhelp/, async (msg) => {
    const chatId = msg.chat.id;

    // Check if registered
    const [rows] = await db.execute(`SELECT * FROM users WHERE id=?`, [chatId]);
    if (rows.length === 0 || !rows[0].phone) {
        return bot.sendMessage(chatId, "⚠️ Please register first using /register.");
    }

    userState[chatId] = { step: "question" };
    bot.sendMessage(chatId, "✍️ Please type your question:");
});

// Handle replies in the group
bot.on('message', async (msg) => {
    if ((msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') || !msg.reply_to_message) return;

    const replyText = msg.text;
    const originalMsgId = msg.reply_to_message.message_id;

    const [rows] = await db.execute(
        `SELECT * FROM register WHERE group_message_id = ? AND admin_reply IS NULL`,
        [originalMsgId]
    );

    if (rows.length === 0) return;

    const entry = rows[0];

    await bot.sendMessage(entry.user_id, `Admin reply:\n${replyText}`);

    await db.execute(
        `UPDATE register SET admin_reply = ?, replied_at = NOW() WHERE id = ?`,
        [replyText, entry.id]
    );
});
