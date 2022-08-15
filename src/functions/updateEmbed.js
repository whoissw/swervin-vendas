const Discord = require('discord.js');

const atualizarEmbedQtdProduto = (nome, qtd) => {

    const embed = new Discord.MessageEmbed()
        .setColor("#2f3136")
        .setAuthor({ name: `Produto: ${nome}`, iconURL: "https://media.discordapp.net/attachments/970045333893685298/1008786445550497862/emoji.png" })
        .setDescription(`**QUANTIDADE:** \`${qtd}\`\n *Clique nos botões a baixo para **ADICIONAR** ou **REMOVER** produtos do seu carrinho*`);
    return embed
};

module.exports = { atualizarEmbedQtdProduto };