const Discord = require('discord.js')

/**
 * Função que atualiza o status do carrinho
 * @param {{ nome: String, valor: Number }[]} dados
 * @param {Discord.ButtonInteraction} interaction
 */
const gerarEmbedCarrinhoDetalhes = (dados, interaction) => {

    const calcularValor = (quantidade, valorUnidade) => (quantidade * (valorUnidade * 100)) / 100;

    const embed = new Discord.MessageEmbed()
        .setTitle("Seja Bem-Vindo ao seu Carrinho!")
        .setDescription(`***Fique a vontade para realizar a sua compra!***
        
        *Este canal é destinado a exibir todos os produtos que estão em seu carrinho.*
        
        *Valor total*: \`R$ 0\``)
        .setColor("#2f3136")

    if (!dados || !dados[0]) return embed;

    const cont = {};

    dados.forEach(e => {
        cont[e.nome] = (cont[e.nome] || 0) + 1;
    });

    const dadosCollection = new Discord.Collection();
    dados.forEach(i => dadosCollection.set(i.nome, i));

    const total = dadosCollection
        .map(item => calcularValor(cont[item.nome], item.valor))
        .reduce((acc, curr) => acc + curr);

    dadosCollection.forEach(item => embed.addField(item.nome, `Quantidade: \`${cont[item.nome]}\``));

    return embed
        .setDescription(`***Fique a vontade para realizar a sua compra!***
        
        *Este canal é destinado a exibir todos os produtos que estão em seu carrinho.*
    
        *Valor total*: \`R$ ${total}\``)
};

module.exports = { gerarEmbedCarrinhoDetalhes };
