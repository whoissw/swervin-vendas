const Discord = require('discord.js')
const { Buffer } = require('buffer');
const { Pagamento, Carrinho } = require('../models/schemas');
const mercadopago = require('mercadopago');
const config = require("../../config.json");
const { QuickDB } = require('quick.db');
const db = new QuickDB();

mercadopago.configure({
    access_token: config.accessToken
});

/** @typedef {Object} ProdutoCarrinho
 * @property {String} msg_produto_id
 * @property {Number} produto_id
 * @property {String} produto_nome
 * @property {String} produto_conteudo
 * @property {Number} produto_valor
 */

/** @typedef {Object} Carrinho
 * @property {String} server_id
 * @property {String} user_id
 * @property {String} msg_carrinho_status
 * @property {ProdutoCarrinho[]} produtos
 */

/**
 * @param {Discord.ButtonInteraction} interaction
 */
const gerarPagamento = async (interaction) => {

    try {

        /** @type {Carrinho} */
        const carrinhoDados = await Carrinho.findOne({
            server_id: interaction.guildId,
            user_id: interaction.user.id,
        });

        const quantidade = carrinhoDados.produtos.length;

        const embed = new Discord.MessageEmbed()

            .setDescription(`<:negativo:986324228146085898> *Não foi possível encontrar produtos no seu carrinho para finalizar as compras.*`)
            .setColor("#2f3136")

        if (quantidade < 1) return interaction.reply({
            embeds: [embed],
            ephemeral: true
        })

        let valor = carrinhoDados.produtos
            .map(p => p.produto_valor * 100)
            .reduce((acc, curr) => acc + curr) / 100;
        let descont = 0
        if (carrinhoDados.cupom) {
            descont = (valor / 100) * JSON.parse(carrinhoDados.cupom)[0]
        }

        let cupom = "Não utilizado"
        if (carrinhoDados.cupom) {
            cupom = JSON.parse(carrinhoDados.cupom)[1]
        }

        const nomesProdutos = [...new Set(carrinhoDados.produtos
            .map(p => p.produto_nome))].join('\n');

        let conteudoProdutos = carrinhoDados.produtos
            .sort((a, b) => a.produto_id - b.produto_id)
            .map((produto, index) => `\`\`\`\nID do produto: ${index + 1}\nProduto: ${produto.produto_conteudo}\`\`\``);

        const aguardandoPagamentoRow = interaction.message.components[0];

        aguardandoPagamentoRow.components[0]

            .setLabel('Aguardando pagamento')
            .setEmoji('🔄')
            .setStyle('SECONDARY')
            .setDisabled(true);

        aguardandoPagamentoRow.components[2]

            .setLabel('Adicionar cupom')
            .setEmoji('🏷️')
            .setStyle('SECONDARY')
            .setCustomId('utilizar-cupom')
            .setDisabled(true);

        await interaction.update({ components: [aguardandoPagamentoRow] });

        const idMsgsProduto = carrinhoDados.produtos.map(p => p.msg_produto_id);

        const msgsProduto = (await interaction.channel.messages.fetch())
            .filter(msg => idMsgsProduto.includes(msg.id));

        interaction.channel.bulkDelete(msgsProduto).catch(() => { });

        const msgsApagar = [];

        const email = 'systemsales@swervin.com';

        const payment_data = {
            transaction_amount: valor - descont,
            description: nomesProdutos,
            payment_method_id: 'pix',
            payer: {
                email,
                first_name: `${interaction.user} (${interaction.user.id})`,
            }
        };

        const data = await mercadopago.payment.create(payment_data);
        const base64_img = data.body.point_of_interaction.transaction_data.qr_code_base64;

        const buf = Buffer.from(base64_img, 'base64');
        const attachment = new Discord.MessageAttachment(buf, 'qrcode.png');

        const embedQR = new Discord.MessageEmbed()
            .setColor("#2f3136")
            .setDescription(`💵 • *O **QRCODE** gerado no valor de: \`R$${payment_data.transaction_amount}\`\n\n📱 • Aponte a câmera do seu celular para realizar o pagamento.\n✏️ • Caso prefira clique no botão a baixo e receba o código **COPIA e COLA**.*`)
            .setImage('attachment://qrcode.png')
            .setFooter({ text: "Ao realizar o pagamento aguarde a aprovação do sistema.", iconURL: "https://cdn.discordapp.com/attachments/970045333893685298/1008489927736053780/emoji.png" })

        await Pagamento.create({
            _id: parseInt(data.body.id),
            server_id: interaction.guildId,
            user_id: interaction.user.id,
            pagamento_confirmado: false,
        });

        const rowCopiaCola = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setLabel('Código cópia e cola')
                    .setEmoji('🔗')
                    .setStyle('SECONDARY')
                    .setCustomId('botao_copia_cola')
            );

        interaction.followUp({
            embeds: [embedQR],
            files: [attachment],
            fetchReply: true,
            components: [rowCopiaCola]
        }).then(m => msgsApagar.push(m.id));

        const coletorCopiaCola = interaction.channel.createMessageComponentCollector({
            componentType: 'BUTTON',
            time: 10 * 60 * 1000,
            filter: i => i.user.id === interaction.user.id && i.customId === 'botao_copia_cola',
        });

        coletorCopiaCola.on('collect', async i => {

            const embed = new Discord.MessageEmbed()

                .setTitle(`Código cópia e cola`)
                .setColor("#2f3136")
                .setDescription(`${data.body.point_of_interaction.transaction_data.qr_code}`)

            i.channel.send({ embeds: [embed] }).then(m => msgsApagar.push(m.id));

            rowCopiaCola.components[0].setDisabled(true);

            await i.update({ components: [] });

        });

        let tentativas = 0;
        const interval = setInterval(async () => {

            tentativas++;

            const res = await mercadopago.payment.get(data.body.id);
            const pagamentoStatus = res.body.status;

            if (tentativas >= 15 || pagamentoStatus === 'approved') {

                clearInterval(interval);

                if (pagamentoStatus === 'approved') {

                    aguardandoPagamentoRow.components[0]

                        .setStyle('SECONDARY')
                        .setEmoji('✅')
                        .setLabel('Pagamento Aprovado');

                    aguardandoPagamentoRow.components.splice(1, 2);

                    if (await db.has(`amount_${config.owner}`)) {
                        await db.add(`amount_${config.owner}`, 1)
                    } else {
                        await db.set(`amount_${config.owner}`, 1)
                    }

                    if (await db.has(`payment_${config.owner}`)) {
                        await db.add(`payment_${config.owner}`, valor - descont)
                    } else {
                        await db.set(`payment_${config.owner}`, valor - descont)
                    }

                    if (await db.has(`sales_${config.owner}`)) {
                        await db.add(`sales_${config.owner}`, quantidade)
                    } else {
                        await db.set(`sales_${config.owner}`, quantidade)
                    }

                    interaction.message.edit({
                        components: [aguardandoPagamentoRow]
                    });

                    interaction.channel.bulkDelete(msgsApagar).catch(() => { });

                    const role = await db.get(`role_id${config.owner}`)

                    const embed = new Discord.MessageEmbed()

                        .setTitle("Log de Compra")
                        .setColor("#2f3136")
                        .setDescription(`🛒 **Produto(s) Comprado(s):** 
                        \`${nomesProdutos}\`
                        💰 **Valor pago:** \`R$ ${payment_data.transaction_amount}\`
                        📊 **Quantidade de itens vendidos:** \`${quantidade}\`
                        👥 **Cliente:** ${interaction.user} \`${interaction.user.id}\`
                        🏷️ **Cupom utilizado:** \`${cupom}\`
                        ⏰ **Horário da compra:** <t:${~~(Date.now(1) / 1000)}:f>

                        📦 **Produto entregue:** ${conteudoProdutos.join('\n')}`)

                    await interaction.guild.channels.cache.find(channels => channels.name === "log-compras").send({ embeds: [embed] })

                    await interaction.guild.members.cache.get(interaction.user.id).roles.add(role).then(() => true)

                    await Pagamento.updateOne({ _id: Number(data.body.id) }, {
                        pagamento_confirmado: true,
                        data: res.body.date_approved,
                        quantidade_produtos_vendidos: quantidade,
                        valor: valor - descont,
                    });

                    const tamanhoConteudo = conteudoProdutos.join('\n').length;

                    if (tamanhoConteudo < 2000) {

                        const embed = new Discord.MessageEmbed()

                            .setTitle(`✅ Pagamento aprovado!`)
                            .setDescription(`***Olá ${interaction.user.username},***
                            
                            • *O seu pagamento foi aprovado com sucesso, o seu produto segue a baixo:*
                            
                            ${conteudoProdutos.join('\n')}`)
                            .setColor("#2f3136")
                            .setFooter({ text: "🛒 Este canal será deletado em 3 minutos." })

                        interaction.channel.send({ embeds: [embed] }).then(async () => {
                            await Carrinho.deleteOne({
                                server_id: interaction.guildId,
                                user_id: interaction.member.id
                            });
                            await interaction.channel.setTopic(`${interaction.user.id}`);
                            setTimeout(async () => {
                                await interaction.channel.delete()
                            }, 3 * 60000)
                        });
                        return;
                    }

                    const [conteudoSeparadoP1, conteudoSeparadoP2] = [
                        conteudoProdutos.slice(0, conteudoProdutos.length / 2),
                        conteudoProdutos.slice(conteudoProdutos.length / 2)
                    ];

                    await interaction.channel.send(conteudoSeparadoP1.join('\n'));
                    interaction.channel.send(conteudoSeparadoP2.join('\n')).then(async () => {

                        await Carrinho.deleteOne({ server_id: interaction.guildId, user_id: interaction.member.id });

                    }).catch(() => {
                        const embed = new Discord.MessageEmbed()

                            .setDescription(`<:negativo:986324228146085898> *Ocorreu um erro ao entregar o seu produto. Por gentileza contacte a STAFF*`)
                            .setColor("#2f3136")

                        interaction.reply({
                            embeds: [embed],
                            ephemeral: true
                        })
                    });
                } else if (pagamentoStatus !== 'approved') {

                    const embed = new Discord.MessageEmbed()

                        .setDescription(`<:ajuda:986323734551994428> *O seu produto não foi entregue ainda? Abra um **TICKET** e envie o comprovante de pagamento e aguarde a resposta da staff.*`)
                        .setColor("#2f3136")

                    interaction.followUp({
                        embeds: [embed],
                        ephemeral: true
                    })
                }
            }
        }, 60000);
    }
    catch (error) {

        const embed = new Discord.MessageEmbed()

            .setDescription(`<:negativo:986324228146085898> *Ocorreu um erro ao processar os dados.*`)
            .setColor("#2f3136")
        interaction.reply({ embeds: [embed], ephemeral: true });
        console.log(error);
    }
};

module.exports = { gerarPagamento };