const { connect } = require('mongoose')
const config = require('../../config.json')
const colors = require('colors')

connect(config?.mongo_url, {
    dbName: "Venda-Bot"
}).then(() => {
    console.log(colors.red("=== BANCO DE DADOS ==="))
    console.log(colors.green("->  ") + colors.gray('Conexão ') + colors.cyan("MongoDB ") + colors.gray("Estabelecida com sucesso"))
    console.log(colors.green("->  ") + colors.gray('Conexão ') + colors.cyan("QuickDB ") + colors.gray("Estabelecida com sucesso"))
})