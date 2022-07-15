const config = require('./config.json');
const fetch = require('node-fetch');

const Discord = require('discord.js');
const client = new Discord.Client({
    intents: [
        Discord.IntentsBitField.Flags.GuildMessages,
        Discord.IntentsBitField.Flags.MessageContent,
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.GuildMessageReactions
    ]
});

const Twitter = require('twitter-api-v2');
let twitterApi;

const Database = require('easy-json-database');
const db = new Database();

const Tracker = require('@androz2091/discord-invites-tracker');
const tracker = Tracker.init(client, {
    fetchGuilds: true,
    fetchVanity: true,
    fetchAuditLogs: true
});

tracker.on('guildMemberAdd', (member, joinType, usedInvite) => {

    if (usedInvite) {
        db.set(`${member.id}_invites`, (db.get(`${member.id}_invites`) || 0) + 1);
    }

});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    sendOnBoardingMessage();
    makeSureContentExits();

    (new Twitter.TwitterApi({
        appKey: config.twitterApiKey,
        appSecret: config.twitterApiSecret
    })).appLogin().then((api) => twitterApi = api);
});

const embedColor = '#00BFFF';

client.on('interactionCreate', async (interaction) => {

    if (interaction.isButton()) {

        if (interaction.customId.startsWith('complete_second_mission')) {

            if (interaction.customId.endsWith('no')) {
                return interaction.reply({
                    content: 'This is not the right emoji! Try again!',
                    ephemeral: true
                });
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                member.roles.remove(config.secondMissionRoleId);
                member.roles.add(config.thirdMissionRoleId);
                interaction.reply(`${interaction.user} has succeeded the second mission, congrats!`).then(() => {
                    setTimeout(() => interaction.deleteReply(), 3_000);
                });
            }

        }

        if (interaction.customId === 'complete_third_mission') {

            const twittycordUserData = await (await fetch(`https://twittycord.com/api/getUser?key=VAzvwKrH65&discordId=${interaction.user.id}`)).json();

            let twitterId = twittycordUserData?.user?.connections?.find((con) => con.name === 'twitter')?.accountId;

            if (!twitterId) {                
                return interaction.reply({
                    content: 'You are not connected to Twitter. Please connect your Twitter account first.',
                    ephemeral: true
                });
            }
            
            const followers = await twitterApi.v2.followers(config.twitterUserId);
            const followerIds = followers?.data?.map((follower) => follower.id) || [];

            if (!followerIds.includes(twitterId)) {
                return interaction.reply({
                    content: 'You are not following the correct Twitter account. Please follow the correct Twitter account first.',
                    ephemeral: true
                });
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                member.roles.remove(config.thirdMissionRoleId);
                member.roles.add(config.fourthMissionRoleId);
                interaction.reply(`${interaction.user} has succeeded the third mission, congrats!`).then(() => {
                    setTimeout(() => interaction.deleteReply(), 3_000);
                });
            }

        }

        if (interaction.customId === 'complete_fourth_mission') {

            const inviteCount = db.get(`${interaction.user.id}_invites`) || 0;

            if (inviteCount < 2) {
                return interaction.reply({
                    content: 'You need to invite two friends! Your current invited friends count is ' + inviteCount,
                    ephemeral: true
                });
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                member.roles.remove(config.thirdMissionRoleId);
                member.roles.add(config.fourthMissionRoleId);
                interaction.reply(`${interaction.user} has succeeded the third mission, congrats!`).then(() => {
                    setTimeout(() => interaction.deleteReply(), 3_000);
                });
            }

        }

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
                .setDescription('This is the second mission! Pick up the Owlski emoji listening to music and send it in the channel.');
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
                .setDescription('Congrats, it was a quite hard to come here but you\'ve succeeded. Now, only our trusted users will be able to enter the server.\n\n**Step 1**: please follow us at **[@xowlski](https://twitter.com/xowlski)**\n\n**Step 2**: login to **[Twittycord](https://twittycord.com/user/dashboard)**, connect your Twitter.\n\n**Step 3**: click the button below');
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
    client.channels.cache.get(config.fourthMissionChannelId).messages.fetch().then((messages) => {
        if (messages.size === 0) {
            const embed = new Discord.EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Fourth Mission')
                .setDescription('The last real mission is here, before entering the funny part! Please invite two friends to this server and use the button below.\n\n:warning: Use a custom invite code to invite your friends! Click on "Create Invite" at the top of the server and copy the URL.');
            const row = new Discord.ActionRowBuilder()
                .addComponents([
                    new Discord.ButtonBuilder()
                        .setLabel(`I invited two friends!`)
                        .setStyle(Discord.ButtonStyle.Success)
                        .setCustomId(`complete_fourth_mission`)
                ]);
            client.channels.cache.get(config.fourthMissionChannelId).send({
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
        if (message.content.includes('996339314831142962')) {
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
