const colors = require('colors')
const Discord = require("discord.js")

/**
 * 
 * @param {Discord.Client} client 
 */

module.exports = async (client) => {

    console.log(colors.red("=== BOT ==="))
    console.log(`${colors.green("-> ")} ${colors.cyan("BOT STARTADO COM SUCESSO.")}`);

    let activities = [
        `BY ❤️ Swervin Studio`,
        `💰 Realizando vendas`
    ],
        i = 0;
    setInterval(() => client.user.setActivity(`${activities[i++ % activities.length]}`, {
        type: "WATCHING"
    }), 5000);
}