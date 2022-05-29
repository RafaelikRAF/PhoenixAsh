const Discord = require("discord.js");
const axios = require("axios");
const { getUserUID } = require("../../moduels/getUID");
const { getUserExists, insertNewUser } = require("../../database/db");
const { logger } = require("../../moduels/logger");
require("dotenv").config();

async function makeLinkEmbed(IGN, platform, guildID, userID, messageAuthor) {
	return await getUserExists(userID).then(async result => {
		if (result == true) {
			const embed = new Discord.MessageEmbed()
				.setTitle("Username already linked!")
				.setDescription("Use command **>unlink** to unlink your account! \nAccount needs to be verified again when unlinked!")
				.setColor("#e3a600")
				.setTimestamp()
				.setFooter("Error page", "https://cdn.discordapp.com/avatars/719542118955090011/82a82af55e896972d1a6875ff129f2f7.png?size=256");
			return embed;
		}

		if (IGN == undefined) {
			const embed = new Discord.MessageEmbed()
				.setTitle("No username given!")
				.setDescription(">link **[Apex IGN] [PC | Xbox | Playstation | Switch]**")
				.setColor("#e3a600")
				.setTimestamp()
				.setFooter("Error page", "https://cdn.discordapp.com/avatars/719542118955090011/82a82af55e896972d1a6875ff129f2f7.png?size=256");
			return embed;
		}

		if (platform == undefined) {
			const embed = new Discord.MessageEmbed()
				.setTitle("No platform given!")
				.setDescription(`>link **${IGN} [PC | Xbox | Playstation | Switch]**`)
				.setColor("#e3a600")
				.setTimestamp()
				.setFooter("Error page", "https://cdn.discordapp.com/avatars/719542118955090011/82a82af55e896972d1a6875ff129f2f7.png?size=256");
			return embed;
		}

		if (platform == "pc" || platform == "ORIGIN" || platform == "origin") {
			platform = "PC";
		}
		if (platform == "x" || platform == "X" || platform == "xbox" || platform == "XBOX" || platform == "x1" || platform == "Xbox" || platform == "X1") {
			platform = "X1";
		}
		if (platform == "ps" || platform == "PS" || platform == "playstation" || platform == "PLAYSTATION" || platform == "ps4" || platform == "PS4" || platform == "ps5" || platform == "PS5") {
			platform = "PS4";
		}
		if (platform == "switch" || platform == "nintendo" || platform == "NINTENDO") {
			platform = "SWITCH";
		}

		let UID;
		await getUserUID(IGN, platform, guildID, userID).then(_UID => UID = _UID).catch(err => {return err;});

		const URI = `${process.env.ALS_ENDPOINT}/bridge?auth=${process.env.ALS_TOKEN}&uid=${UID}&platform=${platform}`;
		return await axios.get(encodeURI(URI))
			.then(async function(response) {
				logger.info("ALS API fetched user data!", { command: "link", guildID: guildID, discordID: userID, IGN: IGN, platform: platform, UID: UID });
				await insertNewUser(guildID, userID, UID, response.data.global.rank.rankScore, response.data.global.arena.rankScore, platform);

				const embed = new Discord.MessageEmbed()
					.setTitle("IGN has been successfully linked!")
					.setDescription(`${messageAuthor} linked to **${response.data.global.name}** using **${platform}**`)
					.setColor("#e3a600")
					.setTimestamp()
					.setFooter("Unlink with >unlink", "https://cdn.discordapp.com/avatars/719542118955090011/82a82af55e896972d1a6875ff129f2f7.png?size=256");
				return embed;

			}).catch(function(error) {
				const embed = new Discord.MessageEmbed()
					.setColor("#e3a600");
				switch (error.response.status) {
				case 400:
					embed.setTitle("Something went wrong.");
					embed.setDescription("Try again in a few minutes.");
					logger.error(new Error(error), { command: "link", guildID: guildID, discordID: userID });
					return Promise.reject(embed);
				case 403:
					embed.setTitle("Unauthorized / Unknown API key.");
					embed.setDescription("The bot might be worked on at this moment. If this continues to happen report it with /bug.");
					logger.error(new Error(error), { command: "link", guildID: guildID, discordID: userID });
					return Promise.reject(embed);
				case 404:
					embed.setTitle("Player could not be found.");
					embed.setDescription("If this continues to happen check that you are using your origin username or report the bug with /bug.");
					logger.error(new Error(error), { command: "link", guildID: guildID, discordID: userID });
					return Promise.reject(embed);
				case 405:
					embed.setTitle("External API error.");
					embed.setDescription("Try again in a few seconds.");
					logger.error(new Error(error), { command: "link", guildID: guildID, discordID: userID });
					return Promise.reject(embed);
				case 410:
					embed.setTitle("Unknown platform provided.");
					embed.setDescription("If this continues to happen report it as a bug with /bug");
					logger.error(new Error(error), { command: "link", guildID: guildID, discordID: userID });
					return Promise.reject(embed);
				case 429:
					embed.setTitle("API Rate limit reached.");
					embed.setDescription("Try again in a few seconds.");
					logger.error(new Error(error), { command: "link", guildID: guildID, discordID: userID });

					return Promise.reject(embed);
				case 500:
					embed.setTitle("API Internal error.");
					logger.error(new Error(error), { command: "link", guildID: guildID, discordID: userID });
					return Promise.reject(embed);
				}
			});
	});
}

module.exports = {
	makeLinkEmbed,
};