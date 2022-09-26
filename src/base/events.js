const path = require('path')
const colors = require('colors')
const fs = require('fs')

module.exports = async (client) => {
    fs.readdir('./src/events', (err, files) => {
        if (err) return console.error(err)
        console.log(colors.red("=== EVENTOS ==="))
        files.forEach(file => {
            if (!file.endsWith('.js')) return
            let eventName = file.substring(0, file.indexOf('.js'))
            let eventModule = require(path.join(__dirname, '../events', eventName))
            client.on(eventName, eventModule.bind(null, client))
            console.log(`${colors.green("-> ")} ${colors.gray("Evento ") + colors.cyan(eventName) + colors.gray(" Carregado com sucesso")}`)
        })
    })
}