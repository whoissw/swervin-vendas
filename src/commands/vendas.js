const Discord = require('discord.js')

/**
 * @param {Discord.Message} message
 */

module.exports = {
    run: async (client, message) => {
        message.delete()

        const embed = new Discord.MessageEmbed()

            .setTitle("Gerenciar Vendas")
            .setDescription(`***Seja Bem-Vindo ao painel de vendas***
            
            *Gerencie suas vendas e produtos clicando e selecionando a opção no **MENU** a baixo.*
            
            \`\`❗ ATENÇÃO A SEGUIR: ❗\`\`
            
            • *Este painel é de uso exclusivo do proprietário.*
            • *As informações podem levar alguns segundos para serem ser cadastradas no banco de dados.*
            • *Sempre escreva o **VALOR** do produto seguindo o exemplo:* \`\`10,00\`\``)
            .setColor("#2f3136")

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
                            label: "Adicionar Estoque em Arquivo",
                            value: "addProducts",
                            description: "Adicione estoque via arquivo .txt",
                            emoji: "🗂️"
                        },
                        {
                            label: "Exibir Produto",
                            description: "Execute o comando na sala para exibir o produto.",
                            value: "eproduto",
                            emoji: "🖼️"
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

        message.channel.send({ embeds: [embed], components: [row] })
    }
}