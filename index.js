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
                    content: 'This is not the right move!',
                    ephemeral: true
                });
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                member.roles.remove(config.secondMissionRoleId);
                member.roles.add(config.thirdMissionRoleId);
                interaction.reply(`${interaction.user} escapes the frostbite`).then(() => {
                    setTimeout(() => interaction.deleteReply(), 3_000);
                });
            }

        }

        if (interaction.customId === 'complete_third_mission') {

            const twittycordUserData = await (await fetch(`https://twittycord.com/api/getUser?key=${config.twittycordKey}&discordId=${interaction.user.id}`)).json();

            let twitterId = twittycordUserData?.user?.connections?.find((con) => con.name === 'twitter')?.accountId;

            if (!twitterId) {                
                return interaction.reply({
                    content: 'You have not connected your twitter on the second step.',
                    ephemeral: true
                });
            }
            
            const followers = await twitterApi.v2.followers(config.twitterUserId);
            const followerIds = followers?.data?.map((follower) => follower.id) || [];

            if (!followerIds.includes(twitterId)) {
                return interaction.reply({
                    content: 'You are not following the shadow, you will get lost.',
                    ephemeral: true
                });
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                member.roles.remove(config.thirdMissionRoleId);
                member.roles.add(config.fourthMissionRoleId);
                interaction.reply(`${interaction.user} escapes freezing and enters the tundra.`).then(() => {
                    setTimeout(() => interaction.deleteReply(), 3_000);
                });
            }

        }

        if (interaction.customId === 'complete_fourth_mission') {

            const inviteCount = db.get(`${interaction.user.id}_invites`) || 0;

            if (inviteCount < 2) {
                return interaction.reply({
                    content: 'Use a custom invite code to invite your friends! You have ' + inviteCount + ' mates right now',
                    ephemeral: true
                });
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                member.roles.remove(config.thirdMissionRoleId);
                member.roles.add(config.fourthMissionRoleId);
                interaction.reply(`${interaction.user} escapes freezing and enters the tundra.`).then(() => {
                    setTimeout(() => interaction.deleteReply(), 3_000);
                });
            }

        }

        if (interaction.customId.startsWith('complete_fifth_mission')) {

            const roleName = interaction.customId.split('_').at(-1);
            const roleId = interaction.guild.roles.cache.get(config[`${roleName}RoleId`]);

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                member.roles.add(roleId);
                member.roles.remove(config.fifthMissionRoleId);
                interaction.reply(`${interaction.user} enters Owlski`).then(() => {
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
    'If you wish to succeed, these words you shall heed.** \n"Try and fail and try again, this is how you reach the end."** \nIf you find what you seek, it’s location you shall not speak. ',
    'Get ready.',
    'Roses are red, Violets are blue, NFTs are awesome.',
    'Do you really think you have what it takes to pass the gates?',
    '50% of the waiting members won’t manage to pass the gates.',
    'Oh wow.',
    'You don’t know anything but soon you’ll know more than your ETH friend.',
    'It’s NOT OKAY.',
    'The Shadow will soon let you off the waiting line.',
    'Wen mint is no question here. Everything is planned, things will be so smooth for you.',
    'The Shadow is mad that you still didn’t understand how to pass the line.',
    'What’s a DAO ? It’s a blockchain held program that allows decentralized fund management.',
    'The Shadow likes giving hints but only if you react quickly enough.',
    'Get familiar with the meme mythology.',
    'If somebody attacks you with a meme, you should answer with another meme.',
    'Bruh.',
    'The shadow is still unsure about what to do with people blocked here. They will certainly not be allowed in.',
    'The Shadow likes giving hints but only if you react quickly enough.',
]

const sentOnBoardingMessages = new Map();

const sendOnBoardingMessage = () => {

    // delete older messages
    const now = new Date();
    const olderThan = now.getTime() - (100 * 60 * 60);
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
                .setTitle('Who is the shadow?')
                .setDescription(config.firstMissionQuestion);
            client.channels.cache.get(config.firstMissionChannelId).send({
                embeds: [embed]
            });
        }
    });
    client.channels.cache.get(config.secondMissionChannelId).messages.fetch().then((messages) => {
        if (messages.size === 0) {
            const embed = new Discord.EmbedBuilder()
                .setColor(embedColor)
                .setTitle('The shadow is curious')
                .setDescription(config.secondMissionQuestion);
            client.channels.cache.get(config.secondMissionChannelId).send({
                embeds: [embed]
            });
        }
    });
    client.channels.cache.get(config.thirdMissionChannelId).messages.fetch().then((messages) => {
        if (messages.size === 0) {
            const embed = new Discord.EmbedBuilder()
                .setColor(embedColor)
                .setTitle('The shadow requires trust')
                .setDescription('The trap opens in a blow and you see thousands of silhouettes running. The yellow eyes are still watching in the dark. \r\n\r\nYou take the ladder and find yourself in a long corridor with torches on the side. All the flapping wings are gone and you only see the yellow eyed shadow waiting at the left side of a cross path at the end of the tunnel.\r\n\r\nThe shadow turns around and you can see shining feathers on its back. It\u2019s now talking with a deep calm voice: \u201CChoose wisely, I will help you. Follow me.\u201D\r\n\r\n`Follow the shadow on twitter:`\r\n\r\nhttps:\/\/twitter.com\/xowlski\r\n\r\n`Connect and choose your path`\r\n\r\nhttps:\/\/twittycord.com\/user\/dashboard\r\n');
            const row = new Discord.ActionRowBuilder()
                .addComponents([
                    new Discord.ButtonBuilder()
                        .setLabel(`Walk with the shadow.`)
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
                .setTitle('The shadow is a team')
                .setDescription('You follow the shadow in dark long tunnels, following feather sounds and yellow eyes. \r\n\r\nThe more you walk and the more you feel pain in your back, like something is erupting from your body and coming out almost as a liberation. \r\n\r\nYou arrive in a bright room but the shadow has run away and you are left again on your own.\r\n\r\nFacing you is a massive wooden door with carves exposing drawing from another age. All the characters are fighting against figures powered by an evil diamond. \r\n\r\nThe door has three distinctive marks designed to support the strength of pushing forces. \r\n\r\nYou try forcing the door and it moves a little but you are certain that your strength alone is not enough. \r\n\r\nYou\u2019ll need your friends to help.\r\n');
            const row = new Discord.ActionRowBuilder()
                .addComponents([
                    new Discord.ButtonBuilder()
                        .setLabel(`Open the gate`)
                        .setStyle(Discord.ButtonStyle.Success)
                        .setCustomId(`complete_fourth_mission`)
                ]);
            client.channels.cache.get(config.fourthMissionChannelId).send({
                embeds: [embed],
                components: [row]
            });
        }
    });
    client.channels.cache.get(config.fifthMissionChannelId).messages.fetch().then((messages) => {
        if (messages.size === 0) {
            const embed = new Discord.EmbedBuilder()
                .setColor(embedColor)
                .setTitle('The shadow is categoric')
                .setDescription('What was some instant before an open wound in your back suddenly flies away and leaves a sparkling magic in your gutter.\r\n\r\nYou have entered a kingdom of cooperation and support. All the yellow eyes are joining you. \r\n\r\nYou have no memories from your past but here will be built your future. \r\n\r\nLooking behind, you take a decision but staying near the door is still your option.');
            const row = new Discord.ActionRowBuilder()
                .addComponents([
                    new Discord.ButtonBuilder()
                        .setLabel(`Close`)
                        .setStyle(Discord.ButtonStyle.Primary)
                        .setCustomId(`complete_fifth_mission_close`),
                    new Discord.ButtonBuilder()
                        .setLabel(`Near`)
                        .setStyle(Discord.ButtonStyle.Primary)
                        .setCustomId(`complete_fifth_mission_near`)
                ]);
            client.channels.cache.get(config.fifthMissionChannelId).send({
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
                message.channel.send(`${message.author} moves out of the cold`).then((m) => {
                    setTimeout(() => m.delete(), 3_000);
                });
            }
        } else {
            message.channel.send(`${message.author} looking at the padlock, notices that the 2, 6, 4, and 9 digits click differently. The universe needs answers. `).then((m) => {
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
                message.channel.send(`${message.author} escapes the frostbite`).then((m) => {
                    setTimeout(() => m.delete(), 3_000);
                });
            }
        } else {
            message.channel.send(`${message.author} Dancing is not made of writing. You have to move and search.`).then((m) => {
                setTimeout(() => m.delete(), 3_000);
            });
        }
        message.delete();
    }

});

client.login(config.token);
