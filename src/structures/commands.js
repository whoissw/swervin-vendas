const colors = require('colors')
const fs = require('fs')

module.exports = async () => {
    fs.readdir('./src/commands', (err, files) => {
        if (err) return console.error(err)
        console.log(colors.red("=== COMANDOS ==="))
        files.forEach(file => {
            if (!file.endsWith('.js')) return
            let eventName = file.substring(0, file.indexOf('.js'))
            console.log(`${colors.green("-> ")} ${colors.gray("Comando ") + colors.cyan(eventName) + colors.gray(" Carregado com sucesso")}`)
        })
    })
}