const config = require('./config.json');

const Discord = require('discord.js');
const client = new Discord.Client({
    intents: [
        Discord.IntentsBitField.Flags.GuildMessages,
        Discord.IntentsBitField.Flags.MessageContent,
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.GuildMessageReactions
    ]
});

const Database = require('easy-json-database');
const db = new Database();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    sendOnBoardingMessage();
    makeSureContentExits();
});

const embedColor = '#00BFFF';

client.on('interactionCreate', (interaction) => {

    if (interaction.isChatInputCommand()) {


    }

});

const userAcceptedPerMessage = new Map();

client.on('messageReactionAdd', (reaction, user) => {

    if (reaction.message.channelId === config.onBoardingChannelId) {

        const userAccepted = userAcceptedPerMessage.get(reaction.message.id);
        if (userAccepted >= config.userCountThreshold) {
            return console.log(`More than ${config.userCountThreshold} have been accepted on the onboarding message.`);
        }

        const member = reaction.message.guild.members.cache.get(user.id);
        if (member) {
            member.roles.add(config.firstMissionRoleId);
            userAcceptedPerMessage.set(reaction.message.id, userAccepted + 1);
            console.log(`${user.username} has accepted the onboarding message.`);
        }

    }

});

const onBoardingMessages = [
    'Welcome to our Discord server! Be one of the first to react to messages to gain access! :zap:',
    'Everyone will have a place on our server, but the first to arrive will get exclusive benefits... be quick and react to this message!',
    'To access the chat rooms, react to this message quickly! Only the first 50 reactions will be accepted!'
]

const sentOnBoardingMessages = new Map();

const sendOnBoardingMessage = () => {

    // delete older messages
    const now = new Date();
    const olderThan = now.getTime() - (1000 * 60 * 60);
    const messagesToDelete = Array.from(sentOnBoardingMessages.entries()).filter((m) => m[0] < olderThan);
    messagesToDelete.forEach((m) => m[1].delete());

    // between 0 and 2
    const random = Math.random() * 3;
    const extraTime = 0//1000 * 60 * random;

    setTimeout(() => {

        const guild = client.guilds.cache.get(config.guildId);
        const channel = guild.channels.cache.get(config.onBoardingChannelId);

        const message = onBoardingMessages[Math.floor(Math.random() * onBoardingMessages.length)];

        channel.send(message).then(message => {
            sentOnBoardingMessages.set(message.createdTimestamp, message);
        }).catch(console.error);

    }, extraTime);

}

const makeSureContentExits = () => {
    client.channels.cache.get(config.firstMissionChannelId).messages.fetch().then((messages) => {
        if (messages.size === 0) {
            const embed = new Discord.EmbedBuilder()
                .setColor(embedColor)
                .setTitle('First Mission')
                .setDescription('This is the first mission! You need to answer the following question: **' + config.firstMissionQuestion + '**');
            client.channels.cache.get(config.firstMissionChannelId).send({
                embeds: [embed]
            });
        }
    });
    client.channels.cache.get(config.secondMissionChannelId).messages.fetch().then((messages) => {
        if (messages.size === 0) {
            const embed = new Discord.EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Second Mission')
                .setDescription('This is the second mission! You need to answer the following question: **' + config.secondMissionQuestion + '**');
            client.channels.cache.get(config.secondMissionChannelId).send({
                embeds: [embed]
            });
        }
    });
    client.channels.cache.get(config.thirdMissionChannelId).messages.fetch().then((messages) => {
        if (messages.size === 0) {
            const embed = new Discord.EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Third Mission')
                .setDescription('Congrats, it was a quite hard to come here but you\'ve succeeded. Now, only our trusted users will be able to enter the server.\n\n**Step 1**: please follow us at **[@Owlski_](https://twitter.com/Owlski_)**\n\n**Step 2**: login to **[Twittycord](https://twittycord.com/user/dashboard)**, connect your Twitter.\n\n**Step 3**: click the button below');
            const row = new Discord.ActionRowBuilder()
                .addComponents([
                    new Discord.ButtonBuilder()
                        .setLabel(`It's followed, let's go!`)
                        .setStyle(Discord.ButtonStyle.Success)
                        .setCustomId(`complete_third_mission`)
                ]);
            client.channels.cache.get(config.thirdMissionChannelId).send({
                embeds: [embed],
                components: [row]
            });
        }
    });
}

setInterval(() => sendOnBoardingMessage(), 5 * 60 * 1000);

client.on('messageCreate', (message) => {

    if (message.channelId === config.firstMissionChannelId) {
        if (message.author.id === client.user.id) return;
        if (message.content === config.firstMissionAnswer) {
            const member = message.guild.members.cache.get(message.author.id);
            if (member) {
                member.roles.remove(config.firstMissionRoleId);
                member.roles.add(config.secondMissionRoleId);
                message.channel.send(`${message.author} has succeeded the first mission, congrats!`).then((m) => {
                    setTimeout(() => m.delete(), 3_000);
                });
            }
        } else {
            message.channel.send(`${message.author} has failed the first mission, incorrect answer!`).then((m) => {
                setTimeout(() => m.delete(), 3_000);
            });
        }
        message.delete();
    }


    if (message.channelId === config.secondMissionChannelId) {
        if (message.author.id === client.user.id) return;
        if (message.content === config.secondMissionAnswer) {
            const member = message.guild.members.cache.get(message.author.id);
            if (member) {
                member.roles.remove(config.secondMissionRoleId);
                member.roles.add(config.thirdMissionRoleId);
                message.channel.send(`${message.author} has succeeded the second mission, congrats!`).then((m) => {
                    setTimeout(() => m.delete(), 3_000);
                });
            }
        } else {
            message.channel.send(`${message.author} has failed the second mission, incorrect answer!`).then((m) => {
                setTimeout(() => m.delete(), 3_000);
            });
        }
        message.delete();
    }

});

client.login(config.token);
