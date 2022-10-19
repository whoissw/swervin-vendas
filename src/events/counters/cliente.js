const Discord = require("discord.js")
const config = require("../../../config.json")
const { QuickDB } = require('quick.db');
const db = new QuickDB({ filePath: "src/database/sql/json.sqlite" });

/**
 * @param {Discord.Client} client 
 */

module.exports = async (client) => {
    const guild = client.guilds.cache.get(config.serverId)

    setInterval(async () => {
        const roles = guild.roles.cache.get(await db.get(`role_id${config.serverId}`)).members.size
        const channel = guild.channels.cache.get(await db.get(`counter_id${config.serverId}`))
        await channel.setName(`💰・Clientes: ${roles.toLocaleString()}`)
    }, 5 * 60000)
}