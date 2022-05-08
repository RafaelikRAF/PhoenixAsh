const Discord = require("discord.js");
const axios = require("axios");
const { getUser, getUserHistory, getAllGuildUsers } = require("../../database/firebaseGet");
const { getUserUID } = require("../../moduels/getUID");
const { writeUserData, writeHistoryData } = require("../../database/firebaseSet");
const { makeStatsChart } = require("../../moduels/charts");
require("dotenv").config();

const client = new Discord.Client();

async function fetchUser(id) {
	return await client.users.fetch(id).then(result => {
		return result;
	});
}

async function getData(UID, platform) {
	//TODO: Clubs when works better
	const URI = `${process.env.ALS_ENDPOINT}/bridge?auth=${process.env.ALS_TOKEN}&uid=${UID}&platform=${platform}&enableClubsBeta=false`;
	return axios.get(encodeURI(URI))
		.then(function(response) {
			return response;
		}).catch(function(error) {
			return Promise.reject(error);
		});
}

async function makeStatsEmbed(_IGN, _platform, guildID, userID) {
	let UID;
	let platform = _platform;

	if (platform != undefined) {
		if (platform == "pc" || platform == "ORIGIN" || platform == "origin") {
			platform = "PC";
		}
		if (platform == "x" || platform == "X" || platform == "xbox" || platform == "XBOX" || platform == "x1") {
			platform = "X1";
		}
		if (platform == "ps" || platform == "PS" || platform == "playstation" || platform == "PLAYSTATION" || platform == "ps4" || platform == "PS4" || platform == "ps5" || platform == "PS5") {
			platform = "PS4";
		}
		if (platform == "switch" || platform == "nintendo" || platform == "NINTENDO") {
			platform = "SWITCH";
		}
	}

	if (_IGN == undefined) {
		//TODO: Let user choose if arenas ranked or BR ranked or both
		return await getUser(guildID, userID).then(async userDB => {
			if (userDB.exists()) {
				UID = userDB.val().originUID;
				platform = userDB.val().platform;
				return await getData(UID, platform).then(async result => {
					const embed = new Discord.MessageEmbed()
						.setTitle(result.data.global.name)
						.setAuthor("Platform: " + platform)
						.setThumbnail(result.data.global.rank.rankImg)
						.addFields(
							{
								name: "__Level__",
								value: result.data.global.level,
								inline: true,
							},
							{
								name: "__Battle Royale__",
								value: result.data.global.rank.rankName + " " + result.data.global.rank.rankDiv + "\nRP: " + result.data.global.rank.rankScore,
								inline: true,
							},
							{
								name: "__Arenas__",
								value: result.data.global.arena.rankName + " " + result.data.global.arena.rankDiv + "\nAP: " + result.data.global.arena.rankScore,
								inline: true,
							},
						)
						.setColor("#e3a600");
					writeUserData(guildID, userID, UID, result.data.global.rank.rankScore, platform);
					writeHistoryData(guildID, userID, result.data.global.rank.rankScore);
					return getUserHistory(guildID, userID).then(result => {
						for (let i = 0; i < result.length; i++) {
							result[i][0] = result[i][0].split("-").reverse().join("/");
						}

						result.sort(function(a, b) {
							const dateA = new Date(a[0]), dateB = new Date(b[0]);
							return dateA - dateB;
						});

						const labels = [], data = [];
						for (let i = 0; i < result.length; i++) {
							labels.push(result[i][0]);
							data.push(result[i][1]);
						}

						embed.setImage(makeStatsChart(labels, data));
						return fetchUser(userID).then(ID => {
							embed.setDescription("Linked to " + ID.username + "#" + ID.discriminator);
							return embed;
						});
					});
				}).catch(error => {
					return Promise.reject(error); //TODO: Embed
				});
			}
			else {
				const embed = new Discord.MessageEmbed()
					.setTitle("No IGN given or account hasn't been linked!")
					.setDescription(">stats **[Apex IGN] [PC | Xbox | Playstation | Switch]**\n>link **[Apex IGN] [PC | Xbox | Playstation | Switch]**")
					.setColor("#e3a600");
				return embed;
			}
		});
	}

	if (platform == undefined) {
		const embed = new Discord.MessageEmbed()
			.setTitle("No platform given!")
			.setDescription(">stats **[Apex IGN] [PC | Xbox | Playstation | Switch]**")
			.setColor("#e3a600");
		return embed;
	}

	if (UID == undefined) {
		let apexResult;
		const labels = [], data = [];
		const embed = new Discord.MessageEmbed();

		await getUserUID(_IGN, platform).then(_UID => {
			UID = _UID;
		}).catch(error => {
			return Promise.reject(error);
		});

		await getData(UID, platform).then(result => {
			apexResult = result;
			embed.setTitle(result.data.global.name);
			embed.setAuthor("Platform: " + platform);
			embed.setThumbnail(result.data.global.rank.rankImg);
			embed.addFields(
				{
					name: "__Level__",
					value: result.data.global.level,
					inline: true,
				},
				{
					name: "__Battle Royale__",
					value: result.data.global.rank.rankName + " " + result.data.global.rank.rankDiv + "\nRP: " + result.data.global.rank.rankScore,
					inline: true,
				},
				{
					name: "__Arenas__",
					value: result.data.global.arena.rankName + " " + result.data.global.arena.rankDiv + "\nAP: " + result.data.global.arena.rankScore,
					inline: true,
				},
			);
			embed.setColor("#e3a600");
		}).catch(error => {
			return Promise.reject(error); //TODO: Embed
		});

		const makeEmbed = async _ => {
			await getAllGuildUsers(guildID).then(async users => {
				const userArray = [];
				users.forEach(function(user) {
					userArray.push(user.val());
				});

				for (let i = 0; i < userArray.length; i++) {
					if (userArray[i].originUID == apexResult.data.global.uid) {
						//TODO: Update user data
						writeHistoryData(guildID, userID, apexResult.data.global.rank.rankScore);
						await getUserHistory(guildID, userID).then(async userHistory => {
							for (let i = 0; i < userHistory.length; i++) {
								userHistory[i][0] = userHistory[i][0].split("-").reverse().join("/");
							}

							userHistory.sort(function(a, b) {
								const dateA = new Date(a[0]), dateB = new Date(b[0]);
								return dateA - dateB;
							});

							for (let i = 0; i < userHistory.length; i++) {
								labels.push(userHistory[i][0]);
								data.push(userHistory[i][1]);
							}
							embed.setImage(makeStatsChart(labels, data));

							await fetchUser(userID).then(discordUser => {
								embed.setDescription("Linked to " + discordUser.username + "#" + discordUser.discriminator);
							});
							return embed;
						});
					}
				}
			});
		};
		await makeEmbed();
		return embed;
	}
}

module.exports = {
	makeStatsEmbed,
};