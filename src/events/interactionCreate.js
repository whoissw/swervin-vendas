const Discord = require("discord.js")
const { Produto, MsgProduto, Carrinho, ProdutoEstoque, Desconto } = require('../models/schemas');
const config = require("../../config.json");
const { atualizarMsgProduto, atualizarEmbedQtdProduto, gerarEmbedCarrinhoDetalhes, gerarPagamento, criarCarrinho } = require('../functions');
const mercadopago = require('mercadopago');
const sleep = require('../utils/sleep')
const { QuickDB } = require('quick.db');
const db = new QuickDB({ filePath: "src/sql/json.sqlite" });
const fs = require("fs")
const axios = require("axios")

const { promisify } = require('util');

const writeFilePromise = promisify(fs.writeFile);

mercadopago.configure({
    access_token: config.accessToken
});

const row = new Discord.MessageActionRow()
    .addComponents(
        new Discord.MessageSelectMenu()
            .setCustomId('setCustomId')
            .setPlaceholder("Selecione a opção:")
            .addOptions([
                {
                    label: "Adicionar Produto",
                    value: "novo",
                    emoji: "📈"
                },
                {
                    label: "Remover Produto",
                    value: "remover",
                    emoji: "📉"
                },
                {
                    label: "Adicionar Estoque",
                    value: "aestoque",
                    emoji: "📥"
                },
                {
                    label: "Remover Estoque",
                    value: "resotque",
                    emoji: "📤"
                },
                {
                    label: "Editar Produto",
                    value: "editarproduto",
                    emoji: "✏️"
                },
                {
                    label: "Exibir Produto",
                    description: "Execute o comando na sala para exibir o produto.",
                    value: "eproduto",
                    emoji: "🖼️"
                },
                {
                    label: "Adicionar Estoque em Arquivo",
                    value: "addProducts",
                    description: "Adicione estoque via arquivo .txt",
                    emoji: "🗂️"
                },
                {
                    label: "Exibir Estoque",
                    value: "exibir_estoque",
                    emoji: "🗃️",
                    description: "Verique todo o estoque de algum produto."
                },
                {
                    label: "Gerenciar Vendas",
                    value: "managesales",
                    emoji: "📊",
                    description: "Gerencie a vendas do seu servidor."
                },
                {
                    label: "Limpar Estoque",
                    value: "resetestoque",
                    description: "Limpe o estoque de algum produto.",
                    emoji: "🧹"
                },
                {
                    label: "Criar Cupom",
                    value: "createcupom",
                    description: "Crie um cupom de desconto.",
                    emoji: "🏷️"
                },
                {
                    label: "Editar Cupom",
                    value: "editcupom",
                    description: "Edite um cupom de desconto.",
                    emoji: "🖍️"
                },
                {
                    label: "Deletar Cupom",
                    value: "deletecupom",
                    description: "Delete um cupom de desconto.",
                    emoji: "❌"
                },
                {
                    label: "Enviar DM",
                    value: "sendm",
                    description: "Envie uma mensagem no privado de um membro.",
                    emoji: "📨"
                },
                {
                    label: "Configurar Bot",
                    value: "configbot",
                    description: "Configure o bot antes de realizar as vendas.",
                    emoji: "🤖"
                },
                {
                    label: "Deletar Mensagems",
                    value: "cance",
                    emoji: "🗑️"
                }
            ])
    )

/**
 * @param {Discord.Interaction} interaction
 * @param {Discord.Client} client
 */

module.exports = async (client, interaction) => {

    /** @typedef {Object} Produto
    * @property {Number} _id
    * @property {String} nome
    * @property {String} server_id
    * @property {Number} valor
    * @property {Number} quantidade
    */

    /** @typedef {Object} ProdutoEstoque
     * @property {Number} produtoId
     * @property {String} server_id
     * @property {String} conteudo
     * @property {Number} data_adicao
     */

    /** @typedef {Object} ProdutoCarrinho
     * @property {String} msg_produto_id
     * @property {Number} produto_id
     * @property {String} produto_nome
     * @property {String} produto_conteudo
     * @property {Number} produto_valor
     * @property {Number} produto_data_adicao
     */

    /** @typedef {Object} Carrinho
     * @property {String} server_id
     * @property {String} user_id
     * @property {String} msg_carrinho_status
     * @property {ProdutoCarrinho[]} produtos
     */

    /** @typedef {Object} MsgProduto
     * @property {String} canal_id
     * @property {String} msg_id
     * @property {String} server_id
     * @property {Number} produtoId
     */

    if (interaction.isSelectMenu()) {

        if (interaction.values[0] === "editcupom") {

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const itens = await Desconto.find({ server_id: interaction.guildId })
            let itemAtual = itens.find(Boolean);

            if (itens.length < 1) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum cupom de desconto cadastrado.*`)

                await interaction.message.edit({
                    components: [row],
                    embeds: [interaction.message.embeds[0]]
                });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const rowMenu = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('edit_cupom')
                        .setPlaceholder('Selecione um cupom:')
                        .addOptions(
                            itens.map(item => (
                                {
                                    label: `Cupom: ${item.code}`,
                                    emoji: "🏷️",
                                    value: `ecodigo-${item.code}`
                                }
                            ))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );

            await interaction.update({
                components: [rowMenu]
            })

            const coletor = interaction.channel.createMessageComponentCollector({
                filter: i => ['edit_cupom'].includes(i.customId),
                idle: 5 * 60 * 1000,
                max: 1
            })

            coletor.on("collect", async interaction => {

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                if (interaction.values[0] === "voltarMenu") {
                    return
                }

                const [itemId] = interaction.values;
                const itemEscolhido = itens.find(i => `${i.code}` === itemId);

                itemAtual = itemEscolhido;

                try {
                    const modal = new Discord.Modal()

                        .setCustomId('cupom')
                        .setTitle('Crie um cupom de desconto:');

                    const disconto = new Discord.TextInputComponent()
                        .setCustomId('discontin')
                        .setLabel('Nome do cumpom de desconto:')
                        .setRequired(true)
                        .setMaxLength(15)
                        .setStyle('SHORT');

                    const porcentagem = new Discord.TextInputComponent()
                        .setCustomId('porcentin')
                        .setLabel('Quantos % de desconto:')
                        .setRequired(true)
                        .setMaxLength(3)
                        .setStyle('SHORT')

                    const usos = new Discord.TextInputComponent()
                        .setCustomId('uso')
                        .setLabel('Quantidade de usos:')
                        .setRequired(true)
                        .setMaxLength(3)
                        .setStyle('SHORT')

                    modal.addComponents(
                        new Discord.MessageActionRow().addComponents(disconto),
                        new Discord.MessageActionRow().addComponents(porcentagem),
                        new Discord.MessageActionRow().addComponents(usos),
                    );

                    await interaction.showModal(modal);

                    const modalInteraction = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 120000 });

                    const porcentos = modalInteraction.fields.getTextInputValue('porcentin');
                    const qtdusos = modalInteraction.fields.getTextInputValue('uso');
                    const codiguin = modalInteraction.fields.getTextInputValue('discontin');

                    if (isNaN(porcentos) || isNaN(qtdusos)) {

                        const embed = new Discord.MessageEmbed()

                            .setDescription(`<:down:1011735481165283441> *Você deve inserir uma \`porcentagem/usos\` valídos.*`)
                            .setColor("#2f3136")

                        await interaction.message.edit({
                            embeds: [interaction.message.embeds[0]],
                            components: [row]
                        })

                        return modalInteraction.reply({ embeds: [embed], ephemeral: true })
                    }

                    await Desconto.findOneAndUpdate({
                        server_id: interaction.guildId
                    }, {
                        code: codiguin,
                        descont: porcentos,
                        usages: qtdusos
                    })

                    const embed = new Discord.MessageEmbed()

                        .setDescription(`<:up:1011735428136714240> *Código de desconto editado com sucesso!*\n\n*Novo código:* \`${codiguin}\`\n*Nova quantidade de usos:* \`${qtdusos}\`\n*Nova porcentagem de desconto:* \`${porcentos} %\``)
                        .setColor("#2f3136")

                    await modalInteraction.reply({ embeds: [embed], ephemeral: true })
                } catch (e) { }
            })
        }

        if (interaction.values[0] === "addProducts") {

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const itens = await Produto.find({ server_id: interaction.guildId });
            let itemAtual = itens.find(Boolean)

            if (itens.length < 1) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum produto cadastrado no banco de dados.*`)

                await interaction.message.edit({
                    components: [row],
                    embeds: [interaction.message.embeds[0]]
                });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const rowMenu = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('edicao_produtos_menu')
                        .setPlaceholder('Selecione um produto:')
                        .addOptions(
                            itens.map(item => (
                                {
                                    label: `${item.nome}`,
                                    emoji: "📦",
                                    description: `Valor do produto: R$ ${item.valor}`,
                                    value: `${item._id}`,
                                }
                            ))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );

            await interaction.update({ components: [rowMenu] });

            const coletor = interaction.channel.createMessageComponentCollector({
                filter: i => ['edicao_produtos_menu'].includes(i.customId),
                idle: 5 * 60 * 1000,
                max: 1
            });

            coletor.on('collect', async interaction => {

                const embed = new Discord.MessageEmbed()

                    .setDescription("*Envie o arquivo **.txt** para ser adicionado os produtos:*")
                    .setColor("#2f3136")

                try {
                    await interaction.reply({ embeds: [embed], ephemeral: true })
                } catch (e) { }

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                if (interaction.values[0] === "voltarMenu") {
                    return
                }

                const [itemId] = interaction.values;
                const itemEscolhido = itens.find(i => `${i._id}` === itemId);

                itemAtual = itemEscolhido;

                function DeleteFile(name) {
                    fs.unlink(name, (err) => {
                        if (err) {
                            return
                        };
                    })
                }

                const collector = interaction.channel.createMessageCollector({
                    max: 1
                })

                collector.on("collect", async (c) => {
                    await c.delete()

                    const url = c.attachments.first().url;
                    const response = await axios.get(url);

                    if (response.data) {
                        const zero = String(response.data).split("\r\n").length
                        await writeFilePromise(c.attachments.first().name, response.data);

                        String(response.data).split("\r\n").forEach(async (account) => {
                            await ProdutoEstoque.create({
                                produtoId: itemAtual._id,
                                server_id: interaction.guildId,
                                conteudo: account,
                                data_adicao: new Date()
                            })
                        })

                        const quantidadeTotal = itemAtual.quantidade + zero
                        const embed = new Discord.MessageEmbed()

                            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                            .setDescription(`***Produto a venda:***
                            \`\`\`${itemAtual.nome}\`\`\``)
                            .setColor("#2f3136")
                            .addField("**💵・Valor do produto:**", `\`\`R$${itemAtual.valor}\`\``, true)
                            .addField("**📦・Estoque disponível:**", `\`\`${quantidadeTotal}\`\``, true)
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))

                        /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
                        const msgProduto = await MsgProduto.findOne({ server_id: interaction.guildId, produtoId: itemAtual._id });

                        if (!msgProduto) return;

                        /** @type {TextChannel} */
                        const canal = interaction.guild.channels.cache.get(msgProduto.canal_id);
                        if (!canal) console.log('Canal de atualizar estoque de não encontrado')

                        canal.messages.fetch(msgProduto.msg_id).then(async m => { await m.edit({ embeds: [embed] }); }).catch(() => true);

                        const msg2 = new Discord.MessageEmbed()

                            .setDescription(`<a:load:986324092846243880> *Foram encontrado **${zero}** produto(s) e estão sendo analisados e sendo registrado(s).*`)
                            .setColor("#2f3136")

                        await interaction.editReply({ embeds: [msg2] })
                        await sleep(7000)

                        const msg = new Discord.MessageEmbed()

                            .setDescription(`<:up:1011735428136714240> *O arquivo foi analisado com sucesso e foram registrado(s) **${zero}** produto(s).*`)
                            .setColor("#2f3136")

                        await interaction.editReply({ embeds: [msg] })
                    }
                    DeleteFile(c.attachments.first().name)
                })
            })
        }

        if (interaction.values[0] === "voltarMenu") {
            await interaction.update({ components: [row] })
        }

        if (interaction.values[0] === "managesales") {

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const qtd = await db.get(`amount_${interaction.guildId}`)
            const vendas = await db.get(`sales_${interaction.guildId}`)
            const valores = await db.get(`payment_${interaction.guildId}`)

            const embed = new Discord.MessageEmbed()

                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setDescription("*Gerencie as vendas do seu servidor por meio deste menu.*")
                .addFields(
                    { name: '📈 *Vendas já realizadas:*', value: `${qtd ? `\`\`\`${qtd}\`\`\`` : `\`\`\`0\`\`\``}`, inline: false },
                    { name: '📦 *Produtos já vendidos:*', value: `${vendas ? `\`\`\`${vendas}\`\`\`` : `\`\`\`0\`\`\``}`, inline: false },
                    { name: '💰 *Total já vendido:*', value: `${valores ? `\`\`\`R$ ${valores}\`\`\`` : `\`\`\`R$ 0,00\`\`\``}`, inline: false })
                .setColor("#2f3136")

            const btn = new Discord.MessageButton()

                .setLabel("Zerar vendas")
                .setStyle("DANGER")
                .setEmoji("♻️")
                .setCustomId("zerarVendas")

            const rowClear = new Discord.MessageActionRow().addComponents(btn)

            interaction.reply({ embeds: [embed], components: [rowClear], ephemeral: true })
        }

        if (interaction.values[0] === "exibir_estoque") {

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const itens = await Produto.find({ server_id: interaction.guildId });
            itens.find(Boolean);

            if (itens.length < 1) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum produto cadastrado no banco de dados.*`)

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const rowMenu = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('edicao_produtos_menu_add')
                        .setPlaceholder('Selecione um produto:')
                        .addOptions(
                            itens.map(item => (
                                {
                                    label: `${item.nome}`,
                                    emoji: "📦",
                                    description: `Valor do produto: R$ ${item.valor}`,
                                    value: `showstock-${item._id}`,
                                }
                            ))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );
            await interaction.update({
                components: [rowMenu]
            })
        }

        if (interaction.values[0].startsWith("showstock")) {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const product_id = interaction.values[0].split("-")[1]

            const contador = await ProdutoEstoque.countDocuments({
                produtoId: product_id,
                server_id: interaction.guildId
            })

            const stocksArray = await ProdutoEstoque.find({
                produtoId: product_id
            })

            const StockName = await Produto.findOne({
                _id: product_id
            })

            const stocks = stocksArray.map((stock) => {
                return `\`\`\`\n📦・${stock.conteudo}\`\`\``
            })

            const stocks2 = stocksArray.map((stock) => {
                return `\n${stock.conteudo}`
            })

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            if (stocks.length === 0) {
                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *O produto selecionado não possui estoque*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [embed], ephemeral: true })
            }

            const msg = new Discord.MessageEmbed()

                .setDescription(`<a:load:986324092846243880> *O estoque do produto selecionado está sendo verificado...*`)
                .setColor("#2f3136")

            await interaction.reply({ embeds: [msg], ephemeral: true })
            await sleep(5000)

            function split(str, index) {
                const result = [str.slice(0, index), str.slice(index)];
                return result;
            }

            const embed = new Discord.MessageEmbed()

                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setDescription(`📋・*Produto exibido:* \`${StockName.nome}\`\n📊・*Quantidade em estoque:* \`${contador}\`\n${stocks.join("\n")}`)
                .setColor("#2f3136")

            const [first, second] = split(stocks.join("##"), 3850);

            function DeleteFile(name) {
                fs.unlinkSync(name, (err) => {
                    if (err) {
                        return
                    };
                })
            }

            var data = `${stocks2}`

            try {
                if (second) {
                    const embed = new Discord.MessageEmbed()

                        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                        .setDescription(`📋・*Produto exibido:* \`${StockName.nome}\`\n📊・*Quantidade em estoque:* \`${contador}\`\n${first.replace(/##/g, "\n")}\`\`\``)
                        .setColor("#2f3136")

                    const embed2 = new Discord.MessageEmbed()

                        .setDescription(`\`\`\`${second.replace(/##/g, "\n")}`)
                        .setColor("#2f3136")

                    await interaction.editReply({ embeds: [embed, embed2], ephemeral: true })
                    return
                }
            } catch (e) {
                fs.writeFile("estoque.txt", data, async (err) => {
                    if (err)
                        console.log(err);
                    else {
                        var atc = fs.readFileSync('./estoque.txt', { "encoding": "utf-8" });
                        const estoque2 = new Discord.MessageAttachment(Buffer.from(atc), 'estoque.txt')
                        const embed = new Discord.MessageEmbed()

                            .setDescription(`<:up:1011735428136714240> *O estoque do produto selecionado excedeu o limite maxímo de caracteres e foi criado um arquivo.*`)
                            .setColor("#2f3136")

                        await interaction.editReply({ files: [estoque2], embeds: [embed] })
                        DeleteFile("./estoque.txt")
                    }
                    return
                })
                return
            }
            await interaction.editReply({ embeds: [embed], ephemeral: true })
        }

        if (interaction.values[0] === "aestoque") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const itens = await Produto.find({ server_id: interaction.guildId });
            let itemAtual = itens.find(Boolean);

            if (itens.length < 1) {

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum produto cadastrado no banco de dados.*`)

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const rowMenu = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('edicao_produtos_menu_add')
                        .setPlaceholder('Selecione um produto:')
                        .addOptions(
                            itens.map(item => (
                                {
                                    label: `${item.nome}`,
                                    emoji: "📦",
                                    description: `Valor do produto: R$ ${item.valor}`,
                                    value: `${item._id}`,
                                }
                            ))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );

            await interaction.update({ components: [rowMenu] });

            const coletor = interaction.channel.createMessageComponentCollector({
                filter: i => ['edicao_produtos_menu_add'].includes(i.customId),
                idle: 5 * 60 * 1000,
                max: 1
            });

            coletor.on('collect', async interaction => {

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                if (interaction.values[0] === "voltarMenu") {
                    return
                }

                const [itemId] = interaction.values;
                const itemEscolhido = itens.find(i => `${i._id}` === itemId);

                itemAtual = itemEscolhido;

                try {

                    const modal = new Discord.Modal()
                        .setCustomId('novo_item')
                        .setTitle('Adicionando estoque:');

                    const ProductInput = new Discord.TextInputComponent()
                        .setCustomId('product')
                        .setLabel('Conteudo:')
                        .setRequired(true)
                        .setStyle('PARAGRAPH')
                        .setMaxLength(3750)

                    modal.addComponents(new Discord.MessageActionRow().addComponents(ProductInput));

                    await interaction.showModal(modal);

                    const conteudo = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 120000 });
                    const productField = conteudo.fields.getTextInputValue("product")
                    await conteudo.deferReply({ ephemeral: true })

                    const att = new Discord.MessageEmbed()

                        .setDescription(`<a:load:986324092846243880> *O **ESTOQUE** está sendo atualizado...*`)
                        .setColor("#2f3136")

                    await conteudo.editReply({ embeds: [att] })

                    itemAtual.quantidade++

                    await ProdutoEstoque.create({
                        produtoId: itemAtual._id,
                        server_id: interaction.guildId,
                        conteudo: productField,
                        data_adicao: new Date()
                    })

                    await Produto.updateOne({ _id: itemAtual._id }, { quantidade: itemAtual.quantidade });

                    const add = new Discord.MessageEmbed()

                        .setDescription(`<:up:1011735428136714240> *O **ESTOQUE** foi adicionado com sucesso!*`)
                        .setColor("#2f3136")

                    conteudo.editReply({ embeds: [add] })

                    const embed = new Discord.MessageEmbed()

                        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                        .setDescription(`***Produto a venda:***
                            \`\`\`${itemAtual.nome}\`\`\``)
                        .setColor("#2f3136")
                        .addField("**💵・Valor do produto:**", `\`\`R$${itemAtual.valor}\`\``, true)
                        .addField("**📦・Estoque disponível:**", `\`\`${itemAtual.quantidade}\`\``, true)
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))

                    /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
                    const msgProduto = await MsgProduto.findOne({ server_id: interaction.guildId, produtoId: itemAtual._id });

                    (async () => {
                        if (itemAtual.quantidade !== 1) return;
                        const allNotify = await db.all()

                        const filteredNotify = allNotify.filter((e) => e.id.includes(interaction.guild.id) && e.id.includes("notify") && e.value[itemAtual._id] === true)

                        for (const member of filteredNotify) {
                            const idMember = member.id.split("-")[1]
                            const user = interaction.guild.members.cache.get(idMember)
                            await db.delete(`${interaction.guild.id}-${idMember}-notify.${itemAtual._id}`)
                            if (!msgProduto) {

                                const embed = new Discord.MessageEmbed()
                                    .setTitle("Notificação de Estoque")
                                    .setDescription(`*Olá **${user.user.username}**,*
                                        
                                        📦 *O Produto: \`${itemAtual.nome}\` teve o estoque reabastecido, não é possivel ainda adicionar o produto ao seu carrinho.*`)
                                    .setColor("#2f3136")
                                    .setFooter({ text: `🔔 A notificação foi desativada automaticamente.` })

                                await interaction.guild.members.cache.get(idMember).send({ embeds: [embed] }).catch(() => { })
                                return;
                            }

                            const addEstoque = new Discord.MessageEmbed()
                                .setTitle("Notificação de Estoque")
                                .setDescription(`*Olá **${user.user.username}**,*
                                        
                                    📦 *O Produto: \`${itemAtual.nome}\` teve o estoque reabastecido, clique no botão a baixo para ser direcionado até ao produto.*`)
                                .setColor("#2f3136")
                                .setFooter({ text: `🔔 A notificação foi desativada automaticamente.` })
                            const btn = new Discord.MessageButton()

                                .setEmoji("📨")
                                .setStyle("LINK")
                                .setLabel("Ir para mensagem")
                                .setURL(`https://discord.com/channels/${interaction.guild.id}/${msgProduto.canal_id}/${msgProduto.msg_id}`)

                            const row = new Discord.MessageActionRow().addComponents(btn)
                            await interaction.guild.members.cache.get(idMember).send({ components: [row], embeds: [addEstoque] }).catch(() => { })
                        }
                    })()

                    if (!msgProduto) return;

                    /** @type {TextChannel} */
                    const canal = interaction.guild.channels.cache.get(msgProduto.canal_id);
                    if (!canal) console.log('Canal de atualizar estoque de não encontrado')

                    canal.messages.fetch(msgProduto.msg_id)
                        .then(async m => {
                            await m.edit({ embeds: [embed] });
                        }).catch(() => console.log('Erro ao atualizar mensagem de estoque de produto'));
                } catch (e) { }
            });
        }

        if (interaction.values[0] === "resotque") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const itens = await Produto.find({ server_id: interaction.guildId });
            let itemAtual = itens.find(Boolean); // So pra pegar a tipagem

            if (itens.length < 1) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum produto cadastrado no banco de dados.*`)

                await interaction.message.edit({
                    components: [row],
                    embeds: [interaction.message.embeds[0]]
                });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const rowMenu = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('edicao_produtos_menu')
                        .setPlaceholder('Selecione um produto:')
                        .addOptions(
                            itens.map(item => (
                                {
                                    label: `${item.nome}`,
                                    emoji: "📦",
                                    description: `Valor do produto: R$ ${item.valor}`,
                                    value: `${item._id}`,
                                }
                            ))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );

            await interaction.update({ components: [rowMenu] });

            const coletor = interaction.channel.createMessageComponentCollector({
                filter: i => ['edicao_produtos_menu', 'btn_add', 'btn_del'].includes(i.customId),
                idle: 5 * 60 * 1000,
                max: 1
            });

            coletor.on('collect', async interaction => {

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                if (interaction.values[0] === "voltarMenu") {
                    return
                }

                const [itemId] = interaction.values;
                const itemEscolhido = itens.find(i => `${i._id}` === itemId);

                itemAtual = itemEscolhido;

                try {

                    const modal = new Discord.Modal()
                        .setCustomId('novo_item')
                        .setTitle('Removendo estoque:');

                    const conteudoInput = new Discord.TextInputComponent()
                        .setCustomId('conteudo')
                        .setLabel('Conteudo:')
                        .setRequired(true)
                        .setStyle('PARAGRAPH');

                    modal.addComponents(
                        new Discord.MessageActionRow().addComponents(conteudoInput),
                    );

                    await interaction.showModal(modal);

                    const conteudo = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 120000 });
                    await conteudo.deferReply({ ephemeral: true })

                    const att = new Discord.MessageEmbed()

                        .setDescription(`<a:load:986324092846243880> *O **ESTOQUE** está sendo atualizado...*`)
                        .setColor("#2f3136")

                    await conteudo.editReply({ embeds: [att] })

                    itemAtual.quantidade--;
                    await ProdutoEstoque.findOneAndDelete({
                        produtoId: itemAtual._id,
                        server_id: interaction.guildId,
                        conteudo: conteudo.fields.getTextInputValue("conteudo")
                    });

                    await Produto.updateOne({ _id: itemAtual._id }, { quantidade: itemAtual.quantidade });

                    const add = new Discord.MessageEmbed()

                        .setDescription(`<:up:1011735428136714240> *O **ESTOQUE** foi removido com sucesso!*`)
                        .setColor("#2f3136")

                    conteudo.editReply({ embeds: [add] })

                    interaction.message.edit({
                        embeds: [interaction.message.embeds[0]],
                        components: [row]
                    })

                    const embed = new Discord.MessageEmbed()

                        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                        .setDescription(`***Produto a venda:***
                            \`\`\`${itemAtual.nome}\`\`\``)
                        .setColor("#2f3136")
                        .addField("**💵・Valor do produto:**", `\`\`R$${itemAtual.valor}\`\``, true)
                        .addField("**📦・Estoque disponível:**", `\`\`${itemAtual.quantidade}\`\``, true)
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))

                    /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
                    const msgProduto = await MsgProduto.findOne({ server_id: interaction.guildId, produtoId: itemAtual._id });

                    if (!msgProduto) return;

                    /** @type {TextChannel} */
                    const canal = interaction.guild.channels.cache.get(msgProduto.canal_id);
                    if (!canal) console.log('Canal para atualizar o estoque não encontrado')

                    canal.messages.fetch(msgProduto.msg_id).then(async m => {
                        await m.edit({ embeds: [embed] });
                    }).catch(() => console.log('Erro ao atualizar mensagem de estoque de produto'));
                } catch (e) { }
            });
        }

        if (interaction.values[0] === "novo") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const modal = new Discord.Modal()
                .setCustomId('novo_produto')
                .setTitle('Adicionar produto:');

            const nomeInput = new Discord.TextInputComponent()
                .setCustomId('nome_produto')
                .setLabel('Nome do Produto:')
                .setRequired(true)
                .setMaxLength(50)
                .setStyle('SHORT');

            const valorInput = new Discord.TextInputComponent()
                .setCustomId('valor_produto')
                .setLabel('Valor do Produto: (em 0,00)')
                .setRequired(true)
                .setMaxLength(50)
                .setStyle('SHORT')
                .setPlaceholder('0,00');

            modal.addComponents(
                new Discord.MessageActionRow().addComponents(nomeInput),
                new Discord.MessageActionRow().addComponents(valorInput),
            );

            interaction.showModal(modal);

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            const modalInteraction = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 120_000 });

            const nome = modalInteraction.fields.getTextInputValue('nome_produto');
            const valor = modalInteraction.fields.getTextInputValue('valor_produto');

            await Produto.create({
                server_id: interaction.guildId,
                valor: Number(valor.replace(',', '.').replace(/[^\d\.]+/g, '')),
                nome,
            });

            const embed = new Discord.MessageEmbed()
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setColor("#2f3136")
                .setDescription(`***Novo produto registrado.***
                
                *💵・Valor:* \`\`${valor}\`\`
                *📦・Produto:* \`\`${nome}\`\``)

            modalInteraction.reply({ embeds: [embed], ephemeral: true });
        }

        if (interaction.values[0] === "remover") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            /** @type {{ _id: Number, nome: String, server_id: String, valor: Number, quantidade: Number }[]} */
            const produtos = await Produto.find({ server_id: interaction.guildId });

            if (produtos.length < 1) {

                const msg = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar nunhum produto cadastrado no banco de dados.*`)

                await interaction.message.edit({
                    components: [row],
                    embeds: [interaction.message.embeds[0]]
                });

                return interaction.reply({ embeds: [msg], ephemeral: true });
            }

            const rowProdutos = new Discord.MessageActionRow().addComponents(
                new Discord.MessageSelectMenu()
                    .setCustomId('menu_produtos')
                    .setPlaceholder('Selecionar um produto')
                    .addOptions(produtos
                        .map(produto => (
                            {
                                label: `${produto.nome}`,
                                emoji: "📦",
                                description: `Valor do produto: R$ ${produto.valor}`,
                                value: `${produto._id}`,
                            }
                        ))
                    )
                    .addOptions([
                        {
                            label: "Voltar menu",
                            value: "voltarMenu",
                            description: "Retornar ao menu principal.",
                            emoji: "⬅️"
                        }
                    ])
            )

            await interaction.update({ components: [rowProdutos] })

            const collector = await interaction.channel.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 120000,
                max: 1,
                componentType: "SELECT_MENU"
            });

            if (collector.values[0] === "voltarMenu") {
                interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })
                return
            }

            const idProduct = collector.values[0];

            const [itemId] = interaction.values;
            const itemEscolhido = produtos.find(i => `${i._id}` === itemId);

            itemAtual = itemEscolhido;

            const product = await Produto.findOne({
                _id: Number(idProduct),
                server_id: interaction.guildId,
            })

            if (!product) {
                const embed = new Discord.MessageEmbed()

                    .setDescription("<:down:1011735481165283441> *O item selecionado não foi encontrado no banco de dados.*")
                    .setColor("#2f3136")

                await modalInteraction.reply({ embeds: [embed], ephemeral: true })
                return
            }

            /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
            const msgProduto = await MsgProduto.findOne({ server_id: interaction.guildId, produtoId: idProduct });

            await ProdutoEstoque.deleteMany({
                server_id: interaction.guildId,
                produtoId: Number(idProduct)
            })

            await Produto.deleteOne({
                server_id: interaction.guildId,
                _id: Number(idProduct),
            }).then(async () => {

                const embed = new Discord.MessageEmbed()

                    .setDescription("<:up:1011735428136714240> *O item selecionado foi removido com sucesso do banco de dados.*")
                    .setColor("#2f3136")

                await collector.reply({ embeds: [embed], ephemeral: true })

                interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                if (!msgProduto) return;

                /** @type {TextChannel} */
                const canal = interaction.guild.channels.cache.get(msgProduto.canal_id);
                if (!canal) return

                canal.messages.fetch(msgProduto.msg_id).then(async m => { await m.delete(); }).catch(() => console.log('Erro ao atualizar mensagem de estoque de produto'));
            })
        }

        if (interaction.values[0] === "cance") {
            await interaction.deferUpdate()
            await interaction.message.delete()
        }

        if (interaction.values[0] === "eproduto") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            /** @type {{ _id: Number, nome: String, server_id: String, valor: Number, quantidade: Number }[]} */
            const produtos = await Produto.find({ server_id: interaction.guildId });

            const msg = new Discord.MessageEmbed()

                .setColor("#2f3136")
                .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum produto cadastrado no banco de dados.*`)

            await interaction.message.edit({
                components: [row],
                embeds: [interaction.message.embeds[0]]
            });

            if (produtos.length < 1) return interaction.reply({ embeds: [msg], ephemeral: true });

            let menuRow = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('menu_produtos')
                        .setPlaceholder('Selecione um produto:')
                        .addOptions(produtos
                            .map(produto => (
                                {
                                    label: `${produto.nome}`,
                                    emoji: "📦",
                                    description: `Valor do produto: R$ ${produto.valor}`,
                                    value: `${produto._id}`,
                                }
                            ))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );

            interaction.update({ components: [menuRow] })

            const menuCollector = interaction.channel.createMessageComponentCollector({
                filter: i => i.customId === 'menu_produtos',
                componentType: 'SELECT_MENU',
                max: 1,
                idle: 120_000
            });

            menuCollector.on('collect', async i => {

                if (i.values[0] === "voltarMenu") {
                    await interaction.message.edit({
                        components: [row],
                        embeds: [interaction.message.embeds[0]]
                    });
                    return
                }

                const itemSelecionado = produtos.find(p => `${p._id}` === i.values[0]);

                const filtroBuscaProduto = {
                    produtoId: itemSelecionado._id,
                    server_id: interaction.guildId
                };

                itemSelecionado.quantidade = await ProdutoEstoque.countDocuments(filtroBuscaProduto);

                await Produto.updateOne(filtroBuscaProduto, { quantidade: itemSelecionado.quantidade });

                const embed = new Discord.MessageEmbed()

                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setDescription(`***Produto a venda:***
                    \`\`\`${itemSelecionado.nome}\`\`\``)
                    .setColor("#2f3136")
                    .addField("**💵・Valor do produto:**", `\`\`R$${itemSelecionado.valor}\`\``, true)
                    .addField("**📦・Estoque disponível:**", `\`\`${itemSelecionado.quantidade}\`\``, true)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))

                const btn = new Discord.MessageActionRow()
                    .addComponents(
                        new Discord.MessageButton()
                            .setStyle('SECONDARY')
                            .setEmoji('🛒')
                            .setCustomId(`pix-${itemSelecionado._id}`)
                            .setLabel('Adicionar ao carrinho')
                    );

                const filtroBuscaMsg = { produtoId: itemSelecionado._id, server_id: interaction.guildId };

                /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
                const msgProduto = await MsgProduto.findOne(filtroBuscaMsg);

                await i.deferUpdate();

                if (!msgProduto) {
                    const msgProdutoFinal = await interaction.channel.send({ components: [btn], embeds: [embed] });

                    const produtomsg = await MsgProduto.findOne({
                        produtoId: filtroBuscaMsg.produtoId,
                        server_id: interaction.guildId
                    })

                    if (!produtomsg) {
                        await MsgProduto.create({
                            canal_id: interaction.channelId,
                            msg_id: msgProdutoFinal.id,
                            server_id: interaction.guildId,
                            produtoId: itemSelecionado._id,
                        });
                    } else {
                        await MsgProduto.deleteOne({
                            server_id: interaction.guildId,
                            produtoId: itemSelecionado._id
                        })
                        await MsgProduto.updateOne({

                            canal_id: interaction.channelId,
                            msg_id: msgProdutoFinal.id,
                            server_id: interaction.guildId,
                            produtoId: itemSelecionado._id,
                        });
                    }

                    await interaction.message.edit({
                        components: [row],
                        embeds: [interaction.message.embeds[0]]
                    });

                    const anuncio = new Discord.MessageEmbed()

                        .setDescription(`<:up:1011735428136714240> *O anúncio do produto foi enviado com sucesso no canal:* <#${interaction.channel.id}>`)
                        .setColor("#2f3136")

                    await i.followUp({ embeds: [anuncio], ephemeral: true })
                    return
                }

                /** @type {Discord.TextChannel} */
                const msgRegistrada = await interaction.guild.channels.cache.get(msgProduto.canal_id).messages.fetch(msgProduto.msg_id).catch(() => "Mensagem não encontrada")

                if (msgRegistrada && msgRegistrada !== "Mensagem não encontrada") {
                    try {
                        /** @type {TextChannel} */

                        const embed = new Discord.MessageEmbed()

                            .setColor("#2f3136")
                            .setDescription(`<:alerta:986323751308251187> *Esse produto já foi exibido. Clique **[AQUI](${msgRegistrada.url})** para ir até a mensagem.* `)

                        await i.followUp({
                            embeds: [embed],
                            ephemeral: true
                        });

                        await interaction.message.edit({
                            components: [row],
                            embeds: [interaction.message.embeds[0]]
                        });

                        return;
                    }
                    catch (error) {
                        const embed = new Discord.MessageEmbed()

                            .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar a mensagems cadastrada no banco de dados. Tente cadastrar novamente o produto.* `)
                            .setColor("#2f3136")

                        await i.followUp({
                            embeds: [embed],
                            ephemeral: true
                        });

                        await interaction.interaction.message.edit({
                            components: [row],
                            embeds: [interaction.message.embeds[0]]
                        });

                        return;
                    }
                } else {

                    const msgProdutoFinal = await interaction.channel.send({ components: [btn], embeds: [embed] });

                    const produtomsg = await MsgProduto.findOne({
                        produtoId: msgProduto.produtoId,
                        server_id: interaction.guildId
                    })

                    if (!produtomsg) {
                        await MsgProduto.create({
                            canal_id: interaction.channelId,
                            msg_id: msgProdutoFinal.id,
                            server_id: interaction.guildId,
                            produtoId: itemSelecionado._id,
                        });
                    } else {
                        await MsgProduto.deleteOne({
                            server_id: interaction.guildId,
                            produtoId: itemSelecionado._id
                        })
                        await MsgProduto.updateOne({

                            canal_id: interaction.channelId,
                            msg_id: msgProdutoFinal.id,
                            server_id: interaction.guildId,
                            produtoId: itemSelecionado._id,
                        });
                    }

                    const anuncio = new Discord.MessageEmbed()

                        .setDescription(`<:up:1011735428136714240> *O anúncio do produto foi enviado com sucesso no canal:* <#${interaction.channel.id}>`)
                        .setColor("#2f3136")

                    await interaction.message.edit({
                        components: [row],
                        embeds: [interaction.message.embeds[0]]
                    });

                    await i.followUp({ embeds: [anuncio], ephemeral: true })
                }
            });
        }

        if (interaction.values[0] === "configbot") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const modal = new Discord.Modal()

                .setCustomId('configurar')
                .setTitle('Configure o seu bot');

            const category = new Discord.TextInputComponent()
                .setCustomId('categoria')
                .setLabel('Categoria dos carrinhos:')
                .setRequired(true)
                .setMaxLength(50)
                .setStyle('SHORT')

            const role = new Discord.TextInputComponent()
                .setCustomId('roleId')
                .setLabel('Id do cargo de cliente:')
                .setRequired(true)
                .setMaxLength(50)
                .setStyle('SHORT')

            const channel = new Discord.TextInputComponent()
                .setCustomId('channelId')
                .setLabel('Canal de feedback de compras:')
                .setRequired(true)
                .setMaxLength(50)
                .setStyle('SHORT')

            const nameclient = new Discord.TextInputComponent()
                .setCustomId('nameClient')
                .setLabel('Alterar o nome do bot:')
                .setMaxLength(15)
                .setStyle('SHORT')

            const imageclient = new Discord.TextInputComponent()
                .setCustomId('imageClient')
                .setLabel('Alterar a imagem do bot:')
                .setStyle('PARAGRAPH')

            modal.addComponents(
                new Discord.MessageActionRow().addComponents(category),
                new Discord.MessageActionRow().addComponents(role),
                new Discord.MessageActionRow().addComponents(channel),
                new Discord.MessageActionRow().addComponents(nameclient),
                new Discord.MessageActionRow().addComponents(imageclient),
            );

            await interaction.showModal(modal);

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            const modalInteraction = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 120000 });

            const categoriaid = modalInteraction.fields.getTextInputValue('categoria');
            const cargoid = modalInteraction.fields.getTextInputValue('roleId');
            const canalid = modalInteraction.fields.getTextInputValue('channelId');
            const imagem = modalInteraction.fields.getTextInputValue('imageClient');
            const nome = modalInteraction.fields.getTextInputValue('nameClient');

            await db.set(`category_id${interaction.guildId}`, categoriaid)
            await db.set(`role_id${interaction.guildId}`, cargoid)
            await db.set(`channel_id${config.serverId}`, canalid)

            await client.user.setAvatar(imagem).catch(() => true)
            await client.user.setUsername(nome).catch(() => true)

            console.log(await db.get(`channel_id${interaction.guildId}`))

            const embed = new Discord.MessageEmbed()

                .setDescription(`<:anuncio:986323798292832307> *Todas as informações foram setadas com sucesso! Confirme a baixo as informações setadas, caso alguma das informações esteja incorreta altere clicando novamente no menu.*
            
                *Cargo de cliente:* <@&${cargoid}>
                *Id da categoria:* \`${categoriaid}\`
                *Canal de feedback:* <#${canalid}>
                *Nome do bot:* \`${nome}\``)
                .setThumbnail(imagem)
                .setColor("#2f3136")

            modalInteraction.reply({ embeds: [embed], ephemeral: true })

        }

        if (interaction.values[0] === "resetestoque") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const itens = await Produto.find({ server_id: interaction.guildId });
            let itemAtual = itens.find(Boolean);

            if (itens.length < 1) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum produto cadastrado no banco de dados.*`)

                await interaction.message.edit({
                    components: [row],
                    embeds: [interaction.message.embeds[0]]
                });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const rowMenu = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('edicao_produtos_menu_add')
                        .setPlaceholder('Selecione um produto:')
                        .addOptions(
                            itens.map(item => (
                                {
                                    label: `${item.nome}`,
                                    emoji: "📦",
                                    description: `Valor do produto: R$ ${item.valor}`,
                                    value: `${item._id}`,
                                }
                            ))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );

            await interaction.update({
                components: [rowMenu],
                embeds: [interaction.message.embeds[0]]
            });

            const coletor = interaction.channel.createMessageComponentCollector({
                filter: i => ['edicao_produtos_menu_add', 'btn_add', 'btn_del'].includes(i.customId),
                idle: 5 * 60 * 1000,
                max: 1
            });

            coletor.on("collect", async interaction => {

                interaction.message.edit({
                    components: [row],
                    embeds: [interaction.message.embeds[0]]
                })

                if (interaction.values[0] === "voltarMenu") {
                    return
                }

                const msg2 = new Discord.MessageEmbed()

                    .setDescription(`<a:load:986324092846243880> *O estoque do produto selecionado esta sendo limpo...*`)
                    .setColor("#2f3136")

                await interaction.reply({ embeds: [msg2], ephemeral: true })

                const idProduct = interaction.values[0]

                const stocks = await ProdutoEstoque.find({
                    produtoId: Number(idProduct),
                    server_id: interaction.guildId
                })

                stocks.forEach((stock) => stock.delete())

                const [itemId] = interaction.values;
                const itemEscolhido = itens.find(i => `${i._id}` === itemId);

                itemAtual = itemEscolhido;

                await Produto.findOneAndUpdate({
                    _id: itemAtual._id,
                    server_id: interaction.guildId,
                    nome: itemAtual.nome,
                    valor: itemAtual.valor
                }, {
                    quantidade: 0
                })

                await sleep(2000)

                const msg = new Discord.MessageEmbed()

                    .setDescription(`<:up:1011735428136714240> *O estoque do produto selecionado foi limpo com sucesso.*`)
                    .setColor("#2f3136")

                await interaction.editReply({ embeds: [msg] })

                const embed = new Discord.MessageEmbed()

                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setDescription(`***Produto a venda:***
                        \`\`\`${itemAtual.nome}\`\`\``)
                    .setColor("#2f3136")
                    .addField("**💵・Valor do produto:**", `\`\`R$${itemAtual.valor}\`\``, true)
                    .addField("**📦・Estoque disponível:**", `\`\`0\`\``, true)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))

                /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
                const msgProduto = await MsgProduto.findOne({ server_id: interaction.guildId, produtoId: itemAtual._id });

                if (!msgProduto) return;

                /** @type {TextChannel} */
                const canal = interaction.guild.channels.cache.get(msgProduto.canal_id);
                if (!canal) console.log('Canal de atualizar estoque de não encontrado')

                await canal.messages.fetch(msgProduto.msg_id).then(async m => { await m.edit({ embeds: [embed] }); }).catch(() => true);
            })
        }

        if (interaction.values[0] === "createcupom") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const modal = new Discord.Modal()

                .setCustomId('cupom')
                .setTitle('Crie um cupom de desconto:');

            const disconto = new Discord.TextInputComponent()
                .setCustomId('discontin')
                .setLabel('Nome do cumpom de desconto:')
                .setRequired(true)
                .setMaxLength(15)
                .setStyle('SHORT');

            const porcentagem = new Discord.TextInputComponent()
                .setCustomId('porcentin')
                .setLabel('Quantos % de desconto:')
                .setRequired(true)
                .setMaxLength(3)
                .setStyle('SHORT')

            const usos = new Discord.TextInputComponent()
                .setCustomId('uso')
                .setLabel('Quantidade de usos:')
                .setRequired(true)
                .setMaxLength(3)
                .setStyle('SHORT')

            modal.addComponents(
                new Discord.MessageActionRow().addComponents(disconto),
                new Discord.MessageActionRow().addComponents(porcentagem),
                new Discord.MessageActionRow().addComponents(usos),
            );

            await interaction.showModal(modal);

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            const modalInteraction = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 120000 });

            const porcentos = modalInteraction.fields.getTextInputValue('porcentin');
            const qtdusos = modalInteraction.fields.getTextInputValue('uso');
            const codiguin = modalInteraction.fields.getTextInputValue('discontin');

            if (isNaN(porcentos) || isNaN(qtdusos)) {

                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você deve inserir uma \`porcentagem/usos\` valídos.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return modalInteraction.reply({ embeds: [embed], ephemeral: true })
            }

            await Desconto.create({
                server_id: interaction.guildId,
                code: codiguin,
                usages: qtdusos,
                descont: porcentos
            })

            const embed = new Discord.MessageEmbed()

                .setDescription(`<:up:1011735428136714240> *Código de desconto criado com sucesso!*\n\n*Código:* \`${codiguin}\`\n*Quantidade de usos:* \`${qtdusos}\`\n*Porcentagem de desconto:* \`${porcentos} %\``)
                .setColor("#2f3136")

            await modalInteraction.reply({ embeds: [embed], ephemeral: true })
        }

        if (interaction.values[0] === "deletecupom") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const itens = await Desconto.find({ server_id: interaction.guildId })

            if (itens.length < 1) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum cupom de desconto cadastrado.*`)

                await interaction.message.edit({
                    components: [row],
                    embeds: [interaction.message.embeds[0]]
                });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const rowMenu = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('delete_cupom')
                        .setPlaceholder('Selecione um cupom:')
                        .addOptions(
                            itens.map(item => (
                                {
                                    label: `Cupom: ${item.code}`,
                                    emoji: "🏷️",
                                    value: `codigo-${item.code}`
                                }
                            ))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );

            await interaction.update({
                components: [rowMenu]
            })
        }

        if (interaction.values[0].startsWith("codigo")) {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const codiguin = interaction.values[0].split("-")[1]

            await Desconto.findOneAndDelete({
                server_id: interaction.guildId,
                code: codiguin
            })

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            const embed = new Discord.MessageEmbed()

                .setDescription(`<:up:1011735428136714240> *O código de desconto foi deletado com sucesso.*`)
                .setColor("#2f3136")

            await interaction.reply({ embeds: [embed], ephemeral: true })
        }

        if (interaction.values[0] === "sendm") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const modal = new Discord.Modal()

                .setCustomId('dm')
                .setTitle('Envie uma mensagem a um membro:');

            const member = new Discord.TextInputComponent()
                .setCustomId('id')
                .setLabel('Id do discord do membro:')
                .setRequired(true)
                .setMaxLength(30)
                .setStyle('SHORT')

            const message = new Discord.TextInputComponent()
                .setCustomId('msg')
                .setLabel('Mensagem a ser enviada:')
                .setRequired(true)
                .setStyle('PARAGRAPH')

            modal.addComponents(
                new Discord.MessageActionRow().addComponents(member),
                new Discord.MessageActionRow().addComponents(message),
            );

            await interaction.showModal(modal);

            await interaction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [row]
            })

            const modalInteraction = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 120000 });

            const idmember = modalInteraction.fields.getTextInputValue('id');
            const msgmember = modalInteraction.fields.getTextInputValue('msg');

            const membro = interaction.guild.members.cache.get(idmember)

            if (!membro) {
                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *O membro selecionado não esta no servidor.*`)
                    .setColor("#2f3136")

                return modalInteraction.reply({ embeds: [embed], ephemeral: true })
            }

            const embed = new Discord.MessageEmbed()

                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setDescription(msgmember)
                .setColor("#2f3136")

            const btn = new Discord.MessageButton()

                .setLabel(`Enviado por: ${interaction.user.tag} | Servidor: ${interaction.guild.name}`)
                .setCustomId("xd")
                .setDisabled(true)
                .setStyle("SECONDARY")

            const msgrow = new Discord.MessageActionRow().addComponents([btn])

            membro.send({ embeds: [embed], components: [msgrow] }).catch(() => true)

            const msg = new Discord.MessageEmbed()

                .setDescription(`<:up:1011735428136714240> *Mensagem enviada com sucesso ao membro.*`)
                .setColor("#2f3136")

            await modalInteraction.reply({ embeds: [msg], ephemeral: true })
        }

        if (interaction.values[0] === "editarproduto") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const itens = await Produto.find({ server_id: interaction.guildId });
            let itemAtual = itens.find(Boolean);

            await interaction.message.edit({
                components: [row],
                embeds: [interaction.message.embeds[0]]
            });

            if (itens.length < 1) {
                const msg = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar algum produto cadastrado no banco de dados.*`)

                await interaction.message.edit({
                    components: [row],
                    embeds: [interaction.message.embeds[0]]
                });
                return interaction.reply({ embeds: [msg], ephemeral: true });
            }

            const showMenu = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('menu_produtos')
                        .setPlaceholder('Selecione um produto:')
                        .addOptions(itens
                            .map(produto => ({
                                label: `${produto.nome}`,
                                emoji: "📦",
                                description: `Valor do produto: R$ ${produto.valor}`,
                                value: `${produto._id}`,
                            }))
                        )
                        .addOptions([
                            {
                                label: "Voltar menu",
                                value: "voltarMenu",
                                description: "Retornar ao menu principal.",
                                emoji: "⬅️"
                            }
                        ])
                );

            interaction.update({ components: [showMenu] })

            const coletor = interaction.channel.createMessageComponentCollector({
                filter: i => ['menu_produtos'].includes(i.customId),
                idle: 5 * 60 * 1000,
                max: 1
            });

            coletor.on('collect', async interaction => {

                await interaction.message.edit({
                    embeds: [interaction.message.embeds[0]],
                    components: [row]
                })

                if (interaction.values[0] === "voltarMenu") {
                    return
                }

                const [itemId] = interaction.values;
                const itemEscolhido = itens.find(i => `${i._id}` === itemId);

                itemAtual = itemEscolhido;

                try {
                    const modal = new Discord.Modal()
                        .setCustomId('editProdutin')
                        .setTitle('Editar produto:');

                    const NomeEdit = new Discord.TextInputComponent()
                        .setCustomId('edit_nome_produto')
                        .setLabel('Nome do Produto:')
                        .setRequired(true)
                        .setMaxLength(50)
                        .setStyle('SHORT');

                    const ValorEdit = new Discord.TextInputComponent()
                        .setCustomId('edit_valor_produto')
                        .setLabel('Valor do Produto: (em 0,00)')
                        .setRequired(true)
                        .setMaxLength(50)
                        .setStyle('SHORT')
                        .setPlaceholder('0,00');

                    modal.addComponents(
                        new Discord.MessageActionRow().addComponents(NomeEdit),
                        new Discord.MessageActionRow().addComponents(ValorEdit),
                    );

                    await interaction.showModal(modal)

                    const conteudo = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 120000 });
                    const nomeProduto = conteudo.fields.getTextInputValue('edit_nome_produto')
                    const valorProduto = conteudo.fields.getTextInputValue('edit_valor_produto')
                    await conteudo.deferReply({ ephemeral: true })

                    const att = new Discord.MessageEmbed()

                        .setDescription(`<a:load:986324092846243880> *O produto está sendo editado...*`)
                        .setColor("#2f3136")

                    await conteudo.editReply({ embeds: [att] })

                    await Produto.findOneAndUpdate({
                        _id: itemAtual._id,
                        server_id: interaction.guildId,
                        quantidade: itemAtual.quantidade
                    }, {
                        nome: nomeProduto,
                        valor: Number(valorProduto.replace(',', '.').replace(/[^\d\.]+/g, ''))
                    })

                    const filtroBuscaProduto = {
                        produtoId: itemAtual._id,
                        server_id: interaction.guildId
                    };

                    itemAtual.quantidade = await ProdutoEstoque.countDocuments(filtroBuscaProduto);

                    const msg = new Discord.MessageEmbed()

                        .setDescription(`<:up:1011735428136714240> *O valor e nome do produto foi editado com sucesso.*`)
                        .setColor("#2f3136")

                    conteudo.editReply({ embeds: [msg] })

                    const embed = new Discord.MessageEmbed()

                        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                        .setDescription(`***Produto a venda:***
                        \`\`\`${nomeProduto}\`\`\``)
                        .setColor("#2f3136")
                        .addField("**💵・Valor do produto:**", `\`\`R$${Number(valorProduto.replace(',', '.').replace(/[^\d\.]+/g, ''))}\`\``, true)
                        .addField("**📦・Estoque disponível:**", `\`\`${itemAtual.quantidade}\`\``, true)
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))

                    /** @type {{canal_id: String, msg_id: String, server_id: String, produtoId: Number}} */
                    const msgProduto = await MsgProduto.findOne({ server_id: interaction.guildId, produtoId: itemAtual._id });

                    if (!msgProduto) return;

                    /** @type {TextChannel} */
                    const canal = interaction.guild.channels.cache.get(msgProduto.canal_id);
                    if (!canal) console.log('Canal de atualizar estoque de não encontrado')

                    await canal.messages.fetch(msgProduto.msg_id).then(async m => { await m.edit({ embeds: [embed] }); }).catch(() => true);
                } catch (e) { }
            })
        }

        if (interaction.values[0] === "starOne") {

            const row = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('setCustomId')
                        .setPlaceholder("Agradecemos pelo feedback!")
                        .setDisabled(true)
                        .addOptions([
                            {
                                label: "feedback",
                                value: "feedback",
                                description: "feedback",
                            }
                        ])
                )

            await interaction.update({ components: [row] })

            const canal = await db.get(`channel_id${config.serverId}`)

            if (canal === null) {
                return
            }

            const embed = new Discord.MessageEmbed()

                .setTitle("*Novo feedback*")
                .setDescription(`👥 • *Feedback enviado por:* ${interaction.user}\n⏰ • *Horario enviado:* <t:${~~(Date.now(1) / 1000)}:f>\n📥 • *Feedback enviado:* \`⭐\``)
                .setFooter({ text: "❤️ Agradeçemos pelo feedback!" })
                .setColor("#2f3136")

            await client.channels.cache.get(canal).send({ embeds: [embed] })

            if (await db.has(`feedbaks_${config.serverId}`)) {
                await db.add(`feedbaks_${config.serverId}`, 1)
            } else {
                await db.set(`feedbaks_${config.serverId}`, 1)
            }

            await client.channels.cache.get(canal).setTopic(`Feedbacks enviados: ${await db.get(`feedbaks_${config.serverId}`)}`)
        }

        if (interaction.values[0] === "starTwo") {

            const row = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('setCustomId')
                        .setPlaceholder("Agradecemos pelo feedback!")
                        .setDisabled(true)
                        .addOptions([
                            {
                                label: "feedback",
                                value: "feedback",
                                description: "feedback",
                            }
                        ])
                )

            await interaction.update({ components: [row] })

            const canal = await db.get(`channel_id${config.serverId}`)

            if (canal === null) {
                return
            }

            const embed = new Discord.MessageEmbed()

                .setTitle("*Novo feedback*")
                .setDescription(`👥 • *Feedback enviado por:* ${interaction.user}\n⏰ • *Horario enviado:* <t:${~~(Date.now(1) / 1000)}:f>\n📥 • *Feedback enviado:* \`⭐⭐\``)
                .setFooter({ text: "❤️ Agradeçemos pelo feedback!" })
                .setColor("#2f3136")

            await client.channels.cache.get(canal).send({ embeds: [embed] })

            if (await db.has(`feedbaks_${config.serverId}`)) {
                await db.add(`feedbaks_${config.serverId}`, 1)
            } else {
                await db.set(`feedbaks_${config.serverId}`, 1)
            }

            await client.channels.cache.get(canal).setTopic(`Feedbacks enviados: ${await db.get(`feedbaks_${config.serverId}`)}`)
        }

        if (interaction.values[0] === "starThree") {

            const row = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('setCustomId')
                        .setPlaceholder("Agradecemos pelo feedback!")
                        .setDisabled(true)
                        .addOptions([
                            {
                                label: "feedback",
                                value: "feedback",
                                description: "feedback",
                            }
                        ])
                )

            await interaction.update({ components: [row] })

            const canal = await db.get(`channel_id${config.serverId}`)

            if (canal === null) {
                return
            }

            const embed = new Discord.MessageEmbed()

                .setTitle("*Novo feedback*")
                .setDescription(`👥 • *Feedback enviado por:* ${interaction.user}\n⏰ • *Horario enviado:* <t:${~~(Date.now(1) / 1000)}:f>\n📥 • *Feedback enviado:* \`⭐⭐⭐\``)
                .setFooter({ text: "❤️ Agradeçemos pelo feedback!" })
                .setColor("#2f3136")

            await client.channels.cache.get(canal).send({ embeds: [embed] })

            if (await db.has(`feedbaks_${config.serverId}`)) {
                await db.add(`feedbaks_${config.serverId}`, 1)
            } else {
                await db.set(`feedbaks_${config.serverId}`, 1)
            }

            await client.channels.cache.get(canal).setTopic(`Feedbacks enviados: ${await db.get(`feedbaks_${config.serverId}`)}`)
        }
    }

    if (interaction.isButton()) {

        if (interaction.customId === "utilizar-cupom") {

            const userAbriuCarrinho = await interaction.guild.members.fetch(interaction.channel.topic);

            const embed = new Discord.MessageEmbed()

                .setDescription(`<:down:1011735481165283441> *Este carrinho não pertence a você.* `)
                .setColor("#2f3136")

            if (userAbriuCarrinho.id !== interaction.member.id) return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            const modal = new Discord.Modal()
                .setTitle("Utilize o cupom de desconto:")
                .setCustomId("useCupom")

            const row = new Discord.MessageActionRow().addComponents([
                new Discord.TextInputComponent()
                    .setLabel("Código:")
                    .setRequired(true)
                    .setMaxLength(15)
                    .setStyle("SHORT")
                    .setCustomId("code")
            ])

            modal.addComponents(row)

            await interaction.showModal(modal)

            const modalInteraction = await interaction.awaitModalSubmit({
                filter: (e) => e.user.id === interaction.user.id,
                time: 30000
            })

            const code = modalInteraction.fields.getTextInputValue("code")

            const descont = await Desconto.findOne({
                server_id: interaction.guild.id,
                code: code
            })

            if (!descont) {
                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar este cupom de desconto.*`)
                    .setColor("#2f3136")

                return await modalInteraction.reply({ embeds: [embed], ephemeral: true })
            }

            if (descont.usages === 0) {
                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Este cupom de desconto já atingiu o limite de usos.*`)
                    .setColor("#2f3136")

                return await modalInteraction.reply({ embeds: [embed], ephemeral: true })
            }

            descont.usages--

            await Desconto.findOneAndUpdate({
                server_id: interaction.guild.id,
                code: code,
            }, {
                usages: descont.usages
            })

            const utilizandoCupom = interaction.message.components[0];

            utilizandoCupom.components[2]

                .setLabel("Cupom utilizado")
                .setStyle("SECONDARY")
                .setEmoji("🏷️")
                .setDisabled(true);

            await modalInteraction.message.edit({
                embeds: [interaction.message.embeds[0]],
                components: [utilizandoCupom]
            });

            const discont = new Discord.MessageEmbed()

                .setDescription(`<:up:1011735428136714240> *O cupom de desconto foi utilizado com sucesso, ele será aplicado no final da compra.*`)
                .setColor("#2f3136")

            await modalInteraction.reply({ embeds: [discont], ephemeral: true })

            await Carrinho.findOneAndUpdate({
                server_id: interaction.guildId,
                user_id: interaction.user.id
            }, {
                cupom: `["${descont.descont}", "${descont.code}"]`
            })
        }

        if (interaction.customId === "cancelar-compra") {

            try {
                await interaction.channel.bulkDelete(100, true)
            } catch (e) { }

            const embed = new Discord.MessageEmbed()

                .setDescription(`<:up:1011735428136714240> ***Compra cancelada com sucesso!***`)
                .setFooter({ text: "🛒 O seu carrinho será deletado dentro de alguns segundos" })
                .setColor("#2f3136")

            await interaction.reply({ embeds: [embed] });

            /** @type {Carrinho} */
            const carrinhoDados = await Carrinho.findOne({
                server_id: interaction.guildId,
                msg_carrinho_status: interaction.message.id,
            });

            if (carrinhoDados.cupom) {
                const cupom = JSON.parse(carrinhoDados.cupom)
                const descont = await Desconto.findOne({
                    code: cupom[1]
                })
                descont.usages++
                await descont.updateOne({
                    usages: descont.usages
                })
            }

            if (carrinhoDados.produtos.length > 0) {

                /** @type {Produto[]} */
                const todosProdutos = await Produto.find({ server_id: interaction.guildId });

                /** @type {Collection<Number,ProdutoCarrinho[]>} */
                const categoriasProdutos = new Discord.Collection();

                carrinhoDados.produtos.forEach(p => {
                    categoriasProdutos.get(p.produto_id)?.push(p) || categoriasProdutos.set(p.produto_id, [p]);
                });

                for (const [id, produtos] of categoriasProdutos) {

                    await ProdutoEstoque.insertMany(produtos.map(i => (
                        {
                            produtoId: i.produto_id,
                            server_id: interaction.guildId,
                            conteudo: i.produto_conteudo,
                            data_adicao: i.produto_data_adicao,
                        })
                    ));
                    const produtoAtualizar = todosProdutos.find(i => i._id === id);
                    produtoAtualizar.quantidade = await ProdutoEstoque.countDocuments(
                        {
                            server_id: interaction.guildId,
                            produtoId: id,
                        });
                    atualizarMsgProduto(produtoAtualizar, interaction);
                }
            }

            await Carrinho.deleteOne({
                server_id: interaction.guildId,
                user_id: interaction.user.id,
            });


            setTimeout(async () => {
                await interaction.channel.delete().catch(() => true)
            }, 3000)
        }

        if (interaction.customId === "finalizar-compra") {
            gerarPagamento(interaction).then(() => {
                const pagamentoInativo = interaction.message.createMessageComponentCollector({
                    max: 1,
                    time: 20 * 60000,
                    componentType: "BUTTON",
                })

                pagamentoInativo.on("end", async (c) => {
                    if (c.size === 0) {

                        if (!interaction.channel) {
                            return
                        }
                        await interaction.channel.delete().catch(() => true)

                        const embed = new Discord.MessageEmbed()

                            .setTitle("Notificação de inatividade")
                            .setDescription(`*Olá **${interaction.user.username},***
                            
                            • *A sua compra foi cancelada por inatividade, e todos os produtos foram devolvido para o estoque. Você pode voltar a comprar quando quiser!*`)
                            .setColor("#2f3136")

                        await interaction.user.send({ embeds: [embed] }).catch(() => true)

                        /** @type {Carrinho} */
                        const carrinhoDados = await Carrinho.findOne({
                            server_id: interaction.guildId,
                            msg_carrinho_status: interaction.message.id,
                        });

                        if (!carrinhoDados) {
                            return
                        }

                        if (carrinhoDados.cupom) {
                            const cupom = JSON.parse(carrinhoDados.cupom)
                            const descont = await Desconto.findOne({
                                code: cupom[1]
                            })
                            descont.usages++
                            await descont.updateOne({
                                usages: descont.usages
                            })
                        }

                        if (carrinhoDados.produtos.length > 0) {

                            /** @type {Produto[]} */
                            const todosProdutos = await Produto.find({ server_id: interaction.guildId });

                            /** @type {Collection<Number,ProdutoCarrinho[]>} */
                            const categoriasProdutos = new Discord.Collection();

                            carrinhoDados.produtos.forEach(p => {
                                categoriasProdutos.get(p.produto_id)?.push(p) || categoriasProdutos.set(p.produto_id, [p]);
                            });

                            for (const [id, produtos] of categoriasProdutos) {

                                await ProdutoEstoque.insertMany(produtos.map(i => (
                                    {
                                        produtoId: i.produto_id,
                                        server_id: interaction.guildId,
                                        conteudo: i.produto_conteudo,
                                        data_adicao: i.produto_data_adicao,
                                    })
                                ));
                                const produtoAtualizar = todosProdutos.find(i => i._id === id);
                                produtoAtualizar.quantidade = await ProdutoEstoque.countDocuments(
                                    {
                                        server_id: interaction.guildId,
                                        produtoId: id,
                                    });
                                atualizarMsgProduto(produtoAtualizar, interaction);
                            }
                        }

                        await Carrinho.deleteOne({
                            server_id: interaction.guildId,
                            user_id: interaction.user.id,
                        });
                    }
                })
            })
        }

        if (interaction.customId === "zerarVendas") {

            if (config.allow.members.indexOf(interaction.user.id) === -1) {
                const msgNot = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Você não possui permissão para usar esta opção.*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [msgNot], ephemeral: true })
            }

            const embedEdit = new Discord.MessageEmbed()

                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setDescription("*Gerencie as vendas do seu servidor por meio deste menu.*")
                .addFields(
                    { name: '📈 *Vendas já realizadas:*', value: `0`, inline: false },
                    { name: '📦 *Produtos já vendidos:*', value: `0`, inline: false },
                    { name: '💰 *Total já vendido:*', value: `R$ 0,00`, inline: false })
                .setColor("#2f3136")

            const btn = new Discord.MessageButton()

                .setLabel("Zerar vendas")
                .setStyle("DANGER")
                .setEmoji("♻️")
                .setCustomId("zerarVendas")
                .setDisabled(true)

            const rowClear = new Discord.MessageActionRow().addComponents(btn)

            await interaction.update({ embeds: [embedEdit], components: [rowClear], fetchReply: true })
            await db.delete(`amount_${interaction.guildId}`)
            await db.delete(`sales_${interaction.guildId}`)
            await db.delete(`payment_${interaction.guildId}`)

            const embed = new Discord.MessageEmbed()

                .setDescription("<:up:1011735428136714240> *Os graficos foram zerados com sucesso!*")
                .setColor("#2f3136")

            await interaction.followUp({ embeds: [embed], ephemeral: true })
        }

        if (interaction.customId.startsWith("adicionar_produto_")) {

            const userAbriuCarrinho = await interaction.guild.members.fetch(interaction.channel.topic);

            const embed = new Discord.MessageEmbed()

                .setDescription(`<:down:1011735481165283441> *Este carrinho não pertence a você.* `)
                .setColor("#2f3136")

            if (userAbriuCarrinho.id !== interaction.member.id) return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            /** @type {Produto} */
            const itemEncontrado = await Produto.findOne({
                server_id: interaction.guildId,
                _id: Number(interaction.customId.split('_')[2]),
            });

            if (!itemEncontrado) {
                const msg = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Este produto não foi encontrado em nosso banco de dados.* `)

                return interaction.reply({ embeds: [msg], ephemeral: true })
            }

            const { _id, nome, valor, quantidade } = itemEncontrado;

            if (quantidade < 1) {
                const nn = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar mais estoque de: \`${nome}\`*`)

                return interaction.reply({ embeds: [nn], ephemeral: true })
            }

            /** @type {ProdutoEstoque} */
            const produtoEscolhido = await ProdutoEstoque.findOne({
                server_id: interaction.guildId,
                produtoId: _id,
            })

            const carrinhoCanal = interaction.channel;

            const filtroCarrinho = {
                user_id: interaction.user.id,
                server_id: interaction.guildId,
            }

            /** @type {Carrinho} */
            const carrinhoDados = await Carrinho.findOneAndUpdate(filtroCarrinho, {
                $push: {
                    produtos:
                    {
                        msg_produto_id: interaction.message.id,
                        produto_id: _id,
                        produto_nome: nome,
                        produto_valor: valor,
                        produto_conteudo: produtoEscolhido.conteudo,
                        produto_data_adicao: new Date(),
                    }
                },
            }, {
                returnDocument: 'after'
            });

            /** @type {Message} */
            let msgCarrinhoStatus;

            try {
                msgCarrinhoStatus = await carrinhoCanal.messages.fetch(carrinhoDados.msg_carrinho_status);
            }
            catch (error) {
                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Um erro foi encontrado ao tentar registrar os itens de carrinho.*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => interaction.followUp({ embeds: [embed], ephemeral: true }));
            }

            await interaction.deferUpdate()

            await ProdutoEstoque.deleteOne({
                produtoId: _id,
                server_id: interaction.guildId,
                conteudo: produtoEscolhido.conteudo
            });

            const produtoAtualizado = await Produto.findOneAndUpdate({
                _id,
                server_id: interaction.guildId,
            }, {
                quantidade: quantidade - 1
            }, {
                returnDocument: 'after'
            });

            await msgCarrinhoStatus.edit({
                embeds: [
                    gerarEmbedCarrinhoDetalhes(carrinhoDados.produtos
                        .map(p => (
                            { nome: p.produto_nome, valor: p.produto_valor }
                        )),
                        interaction
                    )
                ]
            });

            const produtosQtd = carrinhoDados.produtos.filter(p => p.msg_produto_id === interaction.message.id);

            interaction.message.edit({
                embeds: [
                    atualizarEmbedQtdProduto(produtosQtd[0].produto_nome, produtosQtd.length)
                ]
            });

            atualizarMsgProduto(produtoAtualizado, interaction);
        }

        if (interaction.customId.startsWith("remover_produto_")) {

            const userAbriuCarrinho = await interaction.guild.members.fetch(interaction.channel.topic);

            const embed = new Discord.MessageEmbed()

                .setDescription(`<:down:1011735481165283441> *Este carrinho não pertence a você.*`)
                .setColor("#2f3136")

            if (userAbriuCarrinho.id !== interaction.member.id) return interaction.reply({ embeds: [embed], ephemeral: true });

            /** @type {Produto} */
            const itemEncontrado = await Produto.findOne({
                server_id: interaction.guildId,
                _id: Number(interaction.customId.split('_')[2]),
            });

            const msg = new Discord.MessageEmbed()

                .setColor("#2f3136")
                .setDescription(`<:down:1011735481165283441> *Este produto não foi encontrado em nosso banco de dados.*`)

            if (!itemEncontrado) return interaction.reply({ embeds: [msg], ephemeral: true });

            const { _id, nome, valor } = itemEncontrado;

            await interaction.deferUpdate();

            /** @type {Carrinho} */
            let carrinhoDados = await Carrinho.findOne({
                server_id: interaction.guildId,
                user_id: interaction.user.id,
                produtoId: _id,
            });

            const produtoEscolhido = carrinhoDados.produtos.find(p => p.produto_id === _id);
            const contentProduct = produtoEscolhido.produto_conteudo
            const filtroCarrinho = {
                user_id: interaction.user.id,
                server_id: interaction.guildId,
            };
            carrinhoDados = await Carrinho.findOneAndUpdate(filtroCarrinho, {
                $pull: {
                    produtos: {
                        msg_produto_id: interaction.message.id,
                        produto_id: _id,
                        produto_nome: nome,
                        produto_conteudo: produtoEscolhido.produto_conteudo,
                        produto_valor: valor,
                        produto_data_adicao: produtoEscolhido.produto_data_adicao,
                    }
                },
            }, {
                returnDocument: 'after'
            });

            const carrinhoCanal = interaction.channel;

            /** @type {Message} */
            let msgCarrinhoStatus;

            try {
                msgCarrinhoStatus = await carrinhoCanal.messages.fetch(carrinhoDados.msg_carrinho_status);
            }
            catch (error) {
                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Um erro foi encontrado ao tentar registrar os itens de carrinho.*`)
                    .setColor("#2f3136")

                return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => interaction.followUp({ embeds: [embed], ephemeral: true }));
            }

            await ProdutoEstoque.create({
                produtoId: _id,
                server_id: interaction.guildId,
                conteudo: contentProduct,
                data_adicao: produtoEscolhido.produto_data_adicao
            });

            const quantidade = await ProdutoEstoque.countDocuments({
                server_id: interaction.guildId,
                produtoId: _id,
            });

            const produtoAtualizado = await Produto.findOneAndUpdate({
                _id,
                server_id: interaction.guildId,
            }, {
                quantidade
            }, {
                returnDocument: 'after'
            });

            await atualizarMsgProduto(produtoAtualizado, interaction);

            const produtosQtd = carrinhoDados.produtos.filter(p => p.msg_produto_id === interaction.message.id);

            await msgCarrinhoStatus.edit({
                embeds: [
                    gerarEmbedCarrinhoDetalhes(carrinhoDados.produtos
                        .map(p => (
                            { nome: p.produto_nome, valor: p.produto_valor }
                        )),
                        interaction
                    )
                ]
            });

            if (produtosQtd.length < 1) {
                return interaction.message.delete().catch(() => { });
            }

            await interaction.message.edit({
                embeds: [
                    atualizarEmbedQtdProduto(produtosQtd[0].produto_nome, produtosQtd.length)
                ]
            });
        }

        if (interaction.customId.startsWith("pix")) {

            const filtroCarrinho = {
                user_id: interaction.user.id,
                server_id: interaction.guildId,
            };

            const produtos = await Produto.find({ server_id: interaction.guildId });

            if (produtos.length < 1) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foram cadastrados nenhum produto em nosso banco de dados*`)

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const produtoId = Number(interaction.customId.split('-')[1]);

            const itemEncontrado = produtos.find(obj => obj._id === produtoId);

            if (!itemEncontrado) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível encontrar este produto no banco de dados.*`)

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const { nome, valor, _id } = itemEncontrado;

            /** @type {ProdutoEstoque} */
            const produtoEscolhido = await ProdutoEstoque.findOne({ produtoId: _id, server_id: interaction.guildId });

            if (!produtoEscolhido) {
                const embed = new Discord.MessageEmbed()

                    .setColor("#2f3136")
                    .setDescription(`<:down:1011735481165283441> *Não foi possível mais encontrar estoque de \`${nome}\`, para notificar ao chegar estoque clique no botão a baixo.*`)

                const btn = new Discord.MessageButton()

                    .setLabel("Notificar Estoque")
                    .setCustomId(`notify-${_id}`)
                    .setEmoji("📦")
                    .setStyle("SECONDARY")

                const row = new Discord.MessageActionRow().addComponents(btn)

                return await interaction.reply({ embeds: [embed], ephemeral: true, components: [row] })
            }

            const categoria = await db.get(`category_id${interaction.guildId}`)

            if (categoria === null) {
                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Categoria dos carrinhos não definida. Contacte a staff para resolver o ocorrido.*`)
                    .setColor("#2f3136")

                return await interaction.reply({ embeds: [embed], ephemeral: true })
            }

            const categoriaCarrinho = interaction.guild.channels.cache.get(categoria);

            const produtoNoCarrinho = await Carrinho.findOne({
                ...filtroCarrinho,
                'produtos.produto_id': { $eq: _id }
            });

            /** @type {TextChannel} */
            const canalCriado = categoriaCarrinho.children.find(c => c.topic === interaction.user.id)

            if (produtoNoCarrinho) {

                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Este item já está no seu carrinho, clique no botão para ir ao seu carrinho.* `)
                    .setColor("#2f3136")

                const btn = new Discord.MessageButton()

                    .setStyle("LINK")
                    .setLabel("Ir para o carrinho")
                    .setEmoji("🛒")
                    .setURL(`https://discord.com/channels/${interaction.guildId}/${canalCriado.id}`)

                const row = new Discord.MessageActionRow().addComponents(btn)

                return await interaction.reply({ embeds: [embed], ephemeral: true, components: [row] });
            }

            /** @type {TextChannel} */
            const carrinhoCanal = categoriaCarrinho.children.find(c => c.topic === interaction.user.id) || await criarCarrinho(categoriaCarrinho, interaction)
            const embed = new Discord.MessageEmbed()

                .setDescription(`🛒 *Produto adicionado no seu carrinho:* ${carrinhoCanal}`)
                .setColor("#2f3136")

            const btn = new Discord.MessageButton()

                .setStyle("LINK")
                .setLabel("Ir para o carrinho")
                .setEmoji("🛒")
                .setURL(`https://discord.com/channels/${interaction.guildId}/${carrinhoCanal.id}`)

            const row = new Discord.MessageActionRow().addComponents(btn)
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })

            const msgProduto = await carrinhoCanal.send({

                embeds: [atualizarEmbedQtdProduto(nome, 1)],
                components: [
                    new Discord.MessageActionRow()
                        .addComponents(
                            new Discord.MessageButton()
                                .setLabel('➕')
                                .setStyle('SECONDARY')
                                .setCustomId(`adicionar_produto_${_id}`),
                            new Discord.MessageButton()
                                .setLabel('➖')
                                .setStyle('SECONDARY')
                                .setCustomId(`remover_produto_${_id}`),
                        )
                ]
            });

            /** @type {Carrinho} */
            const carrinhoDados = await Carrinho.findOneAndUpdate(filtroCarrinho, {
                $push: {
                    produtos: [{
                        msg_produto_id: msgProduto.id,
                        produto_id: _id,
                        produto_nome: nome,
                        produto_valor: valor,
                        produto_conteudo: produtoEscolhido.conteudo,
                        produto_data_adicao: new Date(),
                    }],
                },
            }, {
                returnDocument: 'after'
            });

            await ProdutoEstoque.deleteOne({
                produtoId: _id,
                server_id: interaction.guildId,
            });

            const quantidade = await ProdutoEstoque.countDocuments({
                produtoId: _id,
                server_id: interaction.guildId,
            });

            const produtoAtualizado = await Produto.findOneAndUpdate({
                _id,
                server_id: interaction.guildId,
            }, {
                quantidade
            }, {
                returnDocument: 'after'
            });

            await atualizarMsgProduto(produtoAtualizado, interaction);

            let msgCarrinhoStatus;

            try {

                msgCarrinhoStatus = await carrinhoCanal.messages.fetch(carrinhoDados.msg_carrinho_status);

            }
            catch (error) {

                const embed = new Discord.MessageEmbed()

                    .setDescription(`<:down:1011735481165283441> *Um erro foi encontrado ao tentar registrar os itens de carrinho.* `)
                    .setColor("#2f3136")

                return carrinhoCanal.send({ embeds: [embed] }).then(async message => {
                    await sleep(5000)
                    await message.delete()
                })
            }

            await msgCarrinhoStatus.edit({
                embeds: [
                    gerarEmbedCarrinhoDetalhes(carrinhoDados.produtos.map(p => (
                        { nome: p.produto_nome, valor: p.produto_valor }
                    )), interaction)
                ]
            });
        }

        if (interaction.customId.startsWith("notify-")) {

            const idProduct = interaction.customId.split("-")[1]

            if (await db.has(`${interaction.guild.id}-${interaction.user.id}-notify.${idProduct}`)) {

                const embed = new Discord.MessageEmbed()

                    .setDescription("<:down:1011735481165283441> A sua notificação já está ativa, aguarde o estoque ser reabastecido.")
                    .setColor("#2f3136")

                return await interaction.update({ components: [], embeds: [embed] });
            }

            await db.set(`${interaction.guild.id}-${interaction.user.id}-notify.${idProduct}`, true)

            const embed = new Discord.MessageEmbed()

                .setDescription(`<:up:1011735428136714240> *Você será notificado ao estoque deste produto ser reabastecido.*`)
                .setColor("#2f3136")

            const btn = new Discord.MessageButton()

                .setLabel("Notificação Ativada")
                .setDisabled(true)
                .setEmoji("🔔")
                .setStyle("SECONDARY")
                .setCustomId("notifyAtivada")
            const row = new Discord.MessageActionRow().addComponents(btn)
            return await interaction.update({ components: [row], embeds: [embed] })
        }
    }
}