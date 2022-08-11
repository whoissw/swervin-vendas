const Discord = require('discord.js');

const atualizarEmbedQtdProduto = (nome, qtd) => {

    const embed = new Discord.MessageEmbed()
        .setColor("#2f3136")
        .setAuthor({ name: `PRODUTO: ${nome}` })
        .setDescription(`**QUANTIDADE:** \`${qtd}\`\n *Clique nos botões a baixo para **ADICIONAR** ou **REMOVER** produtos do seu carrinho*`);
    return embed
};

module.exports = { atualizarEmbedQtdProduto };