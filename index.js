const Discord = require('discord.js')
const client = new Discord.Client({ intents: 32767 });

const comandos = require('./src/base/commands')
const eventos = require('./src/base/events')
const config = require("./config.json")
require("./src/database/mongoose")

comandos()
eventos(client)

client.login(config.token);

/* process.on("multipleResolves", (type, reason, promise) => {
  console.log(`🚨 » [ERRO]\n\n` + type, promise, reason);
});
process.on("unhandRejection", (reason, promise) => {
  console.log(`🚨 » [ERRO]\n\n` + reason, promise);
});
process.on("uncaughtException", (error, origin) => {
  console.log(`🚨 » [ERRO]\n\n` + error, origin);
});
process.on("uncaughtExceptionMonitor", (error, origin) => {
  console.log(`🚨 » [ERRO] \n\n` + error, origin)
});  */ 