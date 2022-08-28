const Discord = require('discord.js')
const { MsgProduto } = require('../models/schemas');

/** @typedef {Object} Produto
 * @property {Number} _id
 * @property {String} nome
 * @property {String} server_id
 * @property {Number} valor
 * @property {Number} quantidade
 */

/**
 * Função que atualiza o número de itens disponíveis no estoque
 * @param {Produto} itemAtual
 */
const atualizarMsgProduto = async (itemAtual, interaction) => {

    const embed = new Discord.MessageEmbed()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setDescription(`***Produto a venda:***
         \`\`\`${itemAtual.nome}\`\`\``)
        .setColor("#2f3136")
        .addField("**💵・Valor do produto:**", `\`\`R$${itemAtual.valor}\`\``, true)
        .addField("**📦・Estoque disponível:**", `\`\`${itemAtual.quantidade}\`\``, true)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))

    /** @type {MsgProduto}*/
    const msgProduto = await MsgProduto.findOne({ server_id: interaction.guildId, produtoId: itemAtual._id });

    if (!msgProduto) return;

    /** @type {TextChannel} */
    const canal = interaction.guild.channels.cache.get(msgProduto.canal_id);
    const msg = new Discord.MessageEmbed()

        .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar a mensagem de exibição do produto:* \`${itemAtual.nome}\``)
        .setColor("#2f3136")

    if (!canal) return interaction.followUp({ embeds: [msg], ephemeral: true });

    await canal.messages.fetch(msgProduto.msg_id).then(async m => { await m.edit({ embeds: [embed] }); }).catch(() => true);
};

module.exports = { atualizarMsgProduto };