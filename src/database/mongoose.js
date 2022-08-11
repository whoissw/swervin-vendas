const { connect } = require('mongoose')
const config = require('../../config.json')
const colors = require('colors')

connect(config?.mongo_url || process.env.mongo_url, {
    dbName: "Venda-Bot"
}).then(() => {
    console.log(colors.red("=== BANCO DE DADOS ==="))
    console.log(colors.green("->  ") + colors.gray('Conexão ') + colors.cyan("MongoDB ") + colors.gray("Estabelecida com sucesso"))
})