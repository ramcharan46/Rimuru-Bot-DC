const {
  Client,
  Intents,
  Collection,
  MessageEmbed,
  Permissions,
  MessageActionRow,
  MessageButton,
} = require("discord.js");
const RANK_ROLES = [
  { level: 5, roleId: "1394582805400518733" },
  { level: 8, roleId: "1394582805400518734" },
  { level: 10, roleId: "1394582805400518735" },
  { level: 15, roleId: "1394582805417299968" },
  { level: 20, roleId: "1394582805417299969" },
  { level: 25, roleId: "1394582805417299970" },
  { level: 35, roleId: "1394582805417299971" },
  { level: 45, roleId: "1394582805417299972" },
  { level: 55, roleId: "1394582805417299973" },
  { level: 65, roleId: "1394582805417299974" },
  { level: 70, roleId: "1394582805417299975" },
  { level: 80, roleId: "1394582805417299976" },
  { level: 90, roleId: "1394582805417299977" },
  { level: 100, roleId: "1394582805438140546" },
];
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { SlashCommandBuilder } = require("@discordjs/builders");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const express = require("express");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const app = express();
const port = process.env.PORT || 4000;
const WELCOME_CHANNEL_ID = "1394582805996114022";
const LEVEL_UP_CHANNEL_KEY = "1394582806184726621"; // Key to store channel ID
const XP_PER_MESSAGE = 5;
const XP_COOLDOWN = 500; // half second
const userCooldowns = new Map();
dotenv.config();

app.get("/", (req, res) => {
  res.send("Express server is running!");
});

app.listen(port, () => {
  console.log(`Slimey listening on port ${port}`);
});

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
    Intents.FLAGS.GUILD_MEMBERS,
  ],
});

client.commands = new Collection();
const cooldowns = new Collection();



// Cooldown settings
const commandCooldowns = {
  ping: 5,
  joke: 10,
  meme: 10,
  wholesome: 15,
  eject: 10,
  kill: 10,
};

//Help Pages
const helpPages = {
  moderation: new MessageEmbed()
    .setTitle("🛠️ Moderation Commands")
    .setColor(0x00ae86)
    .setDescription(
      [
        "`/kick` — Kick a user",
        "`/ban` — Ban a user",
        "`/unban` — Unban by user ID",
        "`/mute` — Mute user with custom duration (e.g., 30s, 10m, 2h)",
        "`/unmute` — Unmute user",
        "`/warn` — Warn a user",
        "`/purge` — Bulk delete messages",
        "`/addautorole <role>` — Auto-assign a role when members join",
        "`/removeautorole` — Remove the auto-role setting",
      ].join("\n"),
    ),

  general: new MessageEmbed()
    .setTitle("ℹ️ General Commands")
    .setColor(0x00ae86)
    .setDescription(
      [
        "`/ping` — Ping the bot",
        "`/help` — Show this help menu",
        "`/serverinfo` — Info about this server",
        "`/userinfo` — Info about a user",
        "`/roleinfo` — Displays level-based Tensura roles",
        "`/membercount` — Server member count",
        "`/rules` — Show server rules",
        "`/rulesdm` — DM the rules",
        "`/helpdm` — DM help info",
      ].join("\n"),
    ),

  leveling: new MessageEmbed()
    .setTitle("📊 Leveling Commands")
    .setColor(0x00ae86)
    .setDescription(
      [
        "`/level` — View your current level and XP",
        "`/leaderboard` —  Show the top 10 users by level and XP",
        "`/myrankfix` —  Fixes your current rank",
        "`/addxp` — [Admin] Add XP to a user",
        "`/setlevel` — [Admin] Set a user's level",
        "`/setlevelchannel` — Set the level-up announcement channel",
      ].join("\n"),
    ),

  fun: new MessageEmbed()
    .setTitle("🎉 Fun Commands")
    .setColor(0x00ae86)
    .setDescription(
      [
        "`/meme` — Get a random meme",
        "`/mcmeme` — Minecraft meme",
        "`/joke` — Tell a random joke",
        "`/8ball` — Ask the magic 8-ball",
        "`/wholesome` — Uplifting messages",
        "`/say` — Make the bot speak",
        "`/flip` — Flip a coin",
        "`/rps` — Rock Paper Scissors",
        "`/eject` — Eject someone (Among Us style)",
        "`/kill` — Fake kill someone",
      ].join("\n"),
    ),

  utility: new MessageEmbed()
    .setTitle("🧮 Utility Commands")
    .setColor(0x00ae86)
    .setDescription(
      ["`/calculate` — Solve math", "`/avatar` — Show user avatar"].join("\n"),
    )
    .setFooter({ text: "Use /command to run a command." }),
};

const helpButtons = new MessageActionRow().addComponents(
  new MessageButton()
    .setCustomId("moderation")
    .setLabel("🛠️ Moderation")
    .setStyle("SECONDARY"),
  new MessageButton()
    .setCustomId("general")
    .setLabel("ℹ️ General")
    .setStyle("SECONDARY"),
  new MessageButton()
    .setCustomId("leveling")
    .setLabel("📊 Leveling")
    .setStyle("SECONDARY"),
  new MessageButton()
    .setCustomId("fun")
    .setLabel("🎉 Fun")
    .setStyle("SECONDARY"),
  new MessageButton()
    .setCustomId("utility")
    .setLabel("🧮 Utility")
    .setStyle("SECONDARY"),
  
);

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Show the top 10 users by level and XP"),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),
  new SlashCommandBuilder()
  .setName("myrankfix")
  .setDescription("Refresh your Tensura rank role based on your level"),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user")
    .addUserOption((opt) =>
      opt.setName("target").setDescription("User to kick").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user")
    .addUserOption((opt) =>
      opt.setName("target").setDescription("User to ban").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user")
    .addStringOption((opt) =>
      opt
        .setName("userid")
        .setDescription("User ID to unban")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute a user for a specified duration")
    .addUserOption((opt) =>
      opt.setName("target").setDescription("User to mute").setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("duration")
        .setDescription("Duration (e.g., 10s, 5m, 1h)")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute a user")
    .addUserOption((opt) =>
      opt.setName("target").setDescription("User to unmute").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption((opt) =>
      opt.setName("target").setDescription("User to warn").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete messages")
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Number to delete")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("calculate")
    .setDescription("Solve math")
    .addStringOption((opt) =>
      opt
        .setName("expression")
        .setDescription("Math expression")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Get server info"),
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get user info")
    .addUserOption((opt) =>
      opt.setName("target").setDescription("User").setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("Get member count"),

  new SlashCommandBuilder().setName("rules").setDescription("Show rules"),
  new SlashCommandBuilder().setName("rulesdm").setDescription("DM the rules"),
  new SlashCommandBuilder().setName("helpdm").setDescription("DM command list"),

  new SlashCommandBuilder().setName("meme").setDescription("Get a random meme"),
  new SlashCommandBuilder()
    .setName("mcmeme")
    .setDescription("Get a Minecraft meme"),
  new SlashCommandBuilder().setName("joke").setDescription("Tell a joke"),
  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the 8-ball")
    .addStringOption((opt) =>
      opt.setName("question").setDescription("Your question").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("wholesome")
    .setDescription("Get a wholesome message"),
  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make the bot say something")
    .addStringOption((opt) =>
      opt.setName("text").setDescription("Text to say").setRequired(true),
    ),
  new SlashCommandBuilder().setName("flip").setDescription("Flip a coin"),
  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock paper scissors")
    .addStringOption((opt) =>
      opt
        .setName("choice")
        .setDescription("rock/paper/scissors")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("eject")
    .setDescription("Eject someone")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("kill")
    .setDescription("Fake kill someone")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show user avatar")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User").setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("setlevelchannel")
    .setDescription("Set the channel for level-up messages")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("The level-up channel")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("addxp")
    .setDescription("Add XP to a user")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to add XP to").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Amount of XP").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("setlevel")
    .setDescription("Set a user's level manually")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to set level for")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("level").setDescription("Level to set").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("level")
    .setDescription("Check your current level and XP")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to check (optional)")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
  .setName('addautorole')
  .setDescription('Set a role to automatically assign to new members')
  .addRoleOption(option =>
    option.setName('role')
      .setDescription('Role to assign on join')
      .setRequired(true)
  ),
  new SlashCommandBuilder()
    .setName("removeautorole")
    .setDescription("Remove an autorole from the list")
    .addRoleOption((opt) =>
      opt
        .setName("role")
        .setDescription("Role to remove from autoroles")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
  .setName("roleinfo")
  .setDescription("View all level-based Tensura ranks with lore"),
];

// Register to Discord
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  try {
    // Clear global commands first to prevent duplicates
    console.log('Clearing global commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );
    console.log('Global commands cleared!');
    
    // Register commands to each guild for faster updates
    console.log('Registering slash commands to guilds...');
    for (const guild of client.guilds.cache.values()) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
        { body: commands.map(cmd => cmd.toJSON()) }
      );
      console.log(`Registered commands for guild: ${guild.name}`);
    }
    console.log('All slash commands registered!');
  } catch (err) {
    console.error('Error registering commands:', err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName, user } = interaction;

  // Cooldown check
  if (commandCooldowns[commandName]) {
    if (!cooldowns.has(commandName))
      cooldowns.set(commandName, new Collection());
    const now = Date.now();
    const timestamps = cooldowns.get(commandName);
    const cooldownAmount = commandCooldowns[commandName] * 1000;
    if (timestamps.has(user.id)) {
      const expirationTime = timestamps.get(user.id) + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
        return interaction.reply({
          content: `⏳ Wait ${timeLeft}s before using \`/${commandName}\` again.`,
          ephemeral: true,
        });
      }
    }
    timestamps.set(user.id, now);
    setTimeout(() => timestamps.delete(user.id), cooldownAmount);
  }

  // Logging
  console.log(`[${new Date().toISOString()}] ${user.tag} used /${commandName}`);

  function getRequiredXP(level) {
    return 100 + level * 25;
  }

  // Commands
  if (commandName === "ping") {
    await interaction.reply("🏓 Pong!");
  } else if (commandName === "setlevelchannel") {
    if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
      return interaction.reply({
        content: "You do not have permission to set the level-up channel.",
        ephemeral: true,
      });
    }
    const channel = interaction.options.getChannel("channel");
    await db.set(`${interaction.guild.id}_${LEVEL_UP_CHANNEL_KEY}`, channel.id);
    interaction.reply(`✅ Level-up messages will now be sent in ${channel}`);
  } else if (commandName === "addxp") {
    if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
      return interaction.reply({
        content: "You do not have permission to add XP.",
        ephemeral: true,
      });
    }
    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const key = `${interaction.guild.id}-${user.id}`;
    const current = (await db.get(`xp.${key}`)) || 0;
    await db.set(`xp.${key}`, current + amount);
    interaction.reply(`✅ Added **${amount} XP** to ${user.tag}.`);
  } else if (commandName === "setlevel") {
    if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
      return interaction.reply({
        content: "You do not have permission to set levels.",
        ephemeral: true,
      });
    }
    const user = interaction.options.getUser("user");
    const level = interaction.options.getInteger("level");
    const key = `${interaction.guild.id}-${user.id}`;
    await db.set(`level.${key}`, level);
    await db.set(`xp.${key}`, 0); // Optional: reset XP
    interaction.reply(`✅ Set ${user.tag} to **level ${level}**.`);
  } else if (commandName === "level") {
    const user = interaction.options.getUser("user") || interaction.user;
    const key = `${interaction.guild.id}-${user.id}`;

    // ✅ FIXED: Await these
    const xp = (await db.get(`xp.${key}`)) || 0;
    const level = (await db.get(`level.${key}`)) || 0;
    const required = getRequiredXP(level);

    const embed = new MessageEmbed()
      .setTitle(`📈 ${user.username}'s Level`)
      .setColor("#00BFFF")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "🔢 Level", value: `${level}`, inline: true },
        { name: "💠 XP", value: `${xp} / ${required}`, inline: true },
      )
      .setFooter({ text: "Tempest Federation | Progress Tracker" })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  } else if (commandName === "help") {
    await interaction.reply({
      embeds: [helpPages.general],
      components: [helpButtons],
      ephemeral: true,
    });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: "BUTTON",
      time: 60000, // 1 min timeout
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (i) => {
      if (helpPages[i.customId]) {
        await i.update({
          embeds: [helpPages[i.customId]],
          components: [helpButtons],
        });
      }
    });

    collector.on("end", async () => {
      try {
        const disabledRow = new MessageActionRow().addComponents(
          helpButtons.components.map((btn) => btn.setDisabled(true)),
        );
        await interaction.editReply({ components: [disabledRow] });
      } catch (err) {
        console.warn("Failed to disable help buttons:", err.message);
      }
    });
  } else if (commandName === "kick") {
    const member = interaction.options.getMember("target");
    if (!interaction.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
      return interaction.reply({
        content: "You do not have permission to kick users.",
        ephemeral: true,
      });
    }
    if (!member.kickable) {
      return interaction.reply({
        content: "I cannot kick this user.",
        ephemeral: true,
      });
    }
    await member.kick();
    await interaction.reply(`${member.user.tag} has been kicked.`);
  } else if (commandName === "ban") {
    const member = interaction.options.getMember("target");
    if (!interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
      return interaction.reply({
        content: "You do not have permission to ban users.",
        ephemeral: true,
      });
    }
    if (!member.bannable) {
      return interaction.reply({
        content: "I cannot ban this user.",
        ephemeral: true,
      });
    }
    await member.ban();
    await interaction.reply(`${member.user.tag} has been banned.`);
  } else if (commandName === "unban") {
    const userId = interaction.options.getString("userid");
    if (!interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
      return interaction.reply({
        content: "You do not have permission to unban users.",
        ephemeral: true,
      });
    }
    try {
      await interaction.guild.members.unban(userId);
      await interaction.reply(`Unbanned user with ID: ${userId}`);
    } catch {
      await interaction.reply("User not found or not banned.");
    }
  } else if (commandName === "mute") {
    const member = interaction.options.getMember("target");
    const durationInput = interaction.options.getString("duration");

    if (
      !interaction.member.permissions.has(Permissions.FLAGS.MODERATE_MEMBERS)
    ) {
      return interaction.reply({
        content: "You do not have permission to mute users.",
        ephemeral: true,
      });
    }

    // Parse duration
    function parseDuration(input) {
      const match = input.match(/^(\d+)([smh])$/);
      if (!match) return null;

      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case "s":
          return value * 1000; // seconds to milliseconds
        case "m":
          return value * 60 * 1000; // minutes to milliseconds
        case "h":
          return value * 60 * 60 * 1000; // hours to milliseconds
        default:
          return null;
      }
    }

    const durationMs = parseDuration(durationInput.toLowerCase());

    if (!durationMs) {
      return interaction.reply({
        content: "Invalid duration format. Use formats like: 30s, 10m, 2h",
        ephemeral: true,
      });
    }

    // Discord timeout limit is 28 days (2419200000 ms)
    const maxTimeout = 28 * 24 * 60 * 60 * 1000;
    if (durationMs > maxTimeout) {
      return interaction.reply({
        content: "Duration cannot exceed 28 days (Discord's maximum).",
        ephemeral: true,
      });
    }

    if (durationMs < 1000) {
      return interaction.reply({
        content: "Duration must be at least 1 second.",
        ephemeral: true,
      });
    }

    try {
      await member.timeout(durationMs);

      // Format duration for display
      let displayDuration;
      if (durationMs < 60000) {
        displayDuration = `${durationMs / 1000} second(s)`;
      } else if (durationMs < 3600000) {
        displayDuration = `${durationMs / 60000} minute(s)`;
      } else {
        displayDuration = `${durationMs / 3600000} hour(s)`;
      }

      await interaction.reply(
        `${member.user.tag} has been muted for ${displayDuration}.`,
      );
    } catch (error) {
      await interaction.reply({
        content:
          "I don't have permission to timeout this user. Make sure I have the 'Moderate Members' permission and my role is higher than the target user's highest role.",
        ephemeral: true,
      });
    }
  } else if (commandName === "unmute") {
    const member = interaction.options.getMember("target");
    if (
      !interaction.member.permissions.has(Permissions.FLAGS.MODERATE_MEMBERS)
    ) {
      return interaction.reply({
        content: "You do not have permission to unmute users.",
        ephemeral: true,
      });
    }
    await member.timeout(null); // Remove timeout
    await interaction.reply(`${member.user.tag} has been unmuted.`);
  } else if (commandName === "warn") {
    const user = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason");
    if (
      !interaction.member.permissions.has(Permissions.FLAGS.MODERATE_MEMBERS)
    ) {
      return interaction.reply({
        content: "You do not have permission to warn users.",
        ephemeral: true,
      });
    }
    await interaction.reply(`${user.tag} has been warned. Reason: ${reason}`);
  } else if (commandName === "purge") {
    const amount = interaction.options.getInteger("amount");
    if (
      !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)
    ) {
      return interaction.reply({
        content: "You do not have permission to delete messages.",
        ephemeral: true,
      });
    }
    if (amount < 1 || amount > 100) {
      return interaction.reply({
        content: "Amount must be between 1 and 100.",
        ephemeral: true,
      });
    }
    await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({
      content: `Deleted ${amount} messages.`,
      ephemeral: true,
    });
  } else if (commandName === "calculate") {
    const expression = interaction.options.getString("expression");
    try {
      // Simple math evaluation with basic security
      const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, "");
      const result = eval(sanitized);
      await interaction.reply(`🧮 Result: \`${result}\``);
    } catch {
      await interaction.reply({
        content: "Invalid expression.",
        ephemeral: true,
      });
    }
  } else if (commandName === "serverinfo") {
    const embed = new MessageEmbed()
      .setTitle(`📊 ${interaction.guild.name}`)
      .setColor(0x00ae86)
      .addFields(
        {
          name: "👥 Members",
          value: `${interaction.guild.memberCount}`,
          inline: true,
        },
        {
          name: "📅 Created",
          value: interaction.guild.createdAt.toDateString(),
          inline: true,
        },
        {
          name: "👑 Owner",
          value: `<@${interaction.guild.ownerId}>`,
          inline: true,
        },
      );
    await interaction.reply({ embeds: [embed] });
  } else if (commandName === "userinfo") {
    const user = interaction.options.getUser("target") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    const embed = new MessageEmbed()
      .setTitle(`👤 ${user.username}`)
      .setColor(0x00ae86)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "🆔 ID", value: user.id, inline: true },
        {
          name: "📅 Account Created",
          value: user.createdAt.toDateString(),
          inline: true,
        },
      );
    if (member) {
      embed.addField("📅 Joined Server", member.joinedAt.toDateString(), true);
    }
    await interaction.reply({ embeds: [embed] });
  } else if (commandName === "roleinfo") {
  const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

  const roles = [
    { name: 'F Rank', level: 5, emoji: '🔵', lore: 'The absolute beginner. Weak and underestimated, yet full of untapped potential.' },
    { name: 'E Rank', level: 8, emoji: '🟣', lore: 'Stronger than most slimes, E Rankers can take on wild beasts.' },
    { name: 'D Rank', level: 10, emoji: '🟣', lore: 'Finally recognized as capable adventurers or monsters.' },
    { name: 'C Rank', level: 15, emoji: '🟪', lore: 'Moderate strength — enough to tame minor threats.' },
    { name: 'B Rank', level: 20, emoji: '🟥', lore: 'Respected fighters who can lead patrols or monster troops.' },
    { name: 'A Rank', level: 25, emoji: '🟥', lore: 'Powerful warriors feared on battlefields.' },
    { name: 'Hazard Class', level: 35, emoji: '🟦', lore: 'Can destroy villages — must be watched by nations.' },
    { name: 'Special A Rank', level: 45, emoji: '🟥', lore: 'Near-disaster class beings with exceptional skills.' },
    { name: 'Calamity Class', level: 55, emoji: '🟨', lore: 'Able to wipe armies and cripple nations.' },
    { name: 'S Rank', level: 65, emoji: '🟨', lore: 'Elite among elites, rivaling demon lord lieutenants.' },
    { name: 'Disaster Class', level: 70, emoji: '🟥', lore: 'Could flatten cities and mutate lands.' },
    { name: 'Special S Rank', level: 80, emoji: '🟩', lore: 'Blessed by fate and born for greatness.' },
    { name: 'Catastrophe Class', level: 90, emoji: '🟧', lore: 'Natural disasters in monster form.' },
    { name: 'Octagram', level: 100, emoji: '🔴', lore: 'The peak. Legendary Demon Lords like Rimuru, Milim, and Guy Crimson.' },
  ];

  const key = `${interaction.guild.id}-${interaction.user.id}`;
  const userLevel = (await db.get(`level.${key}`)) || 0;
  const userXP = (await db.get(`xp.${key}`)) || 0;

  function getRequiredXP(level) {
    return 100 + level * 25;
  }

  const progressBar = (xp, total, size = 10) => {
    const filled = Math.round((xp / total) * size);
    const empty = size - filled;
    return `[${'🟩'.repeat(filled)}${'⬜'.repeat(empty)}]`;
  };

  function getClosestRoleIndex(level) {
    let i = 0;
    while (i + 1 < roles.length && level >= roles[i + 1].level) i++;
    return i;
  }

  let page = getClosestRoleIndex(userLevel); // Start on user's current rank

  const getEmbed = (index) => {
    const r = roles[index];
    const unlocked = userLevel >= r.level;
    const nextRole = roles[index + 1];
    const required = getRequiredXP(userLevel);
    const xpBar = progressBar(userXP, required);
    return new MessageEmbed()
      .setTitle(`${r.emoji} ${r.name}`)
      .setDescription(`**Level Required:** ${r.level}\n**Status:** ${unlocked ? "✅ Unlocked" : "🔒 Locked"}\n\n${r.lore}`)
      .addFields(
        { name: "📊 Your Progress", value: `Level ${userLevel} | XP: ${userXP} / ${required}\n${xpBar}`, inline: false }
      )
      .setFooter({ text: `Page ${index + 1} of ${roles.length}` })
      .setColor(unlocked ? "#2ecc71" : "#e74c3c");
  };

  const getButtons = () => new MessageActionRow().addComponents(
    new MessageButton().setCustomId("prev").setLabel("⬅️ Previous").setStyle("SECONDARY"),
    new MessageButton().setCustomId("myrank").setLabel("🎯 My Rank").setStyle("PRIMARY"),
    new MessageButton().setCustomId("next").setLabel("Next ➡️").setStyle("SECONDARY"),
  );

  const msg = await interaction.reply({
    embeds: [getEmbed(page)],
    components: [getButtons()],
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({
    time: 90000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btn) => {
    if (btn.customId === "prev") page = (page - 1 + roles.length) % roles.length;
    else if (btn.customId === "next") page = (page + 1) % roles.length;
    else if (btn.customId === "myrank") page = getClosestRoleIndex(userLevel);

    await btn.update({ embeds: [getEmbed(page)], components: [getButtons()] });
  });

  collector.on("end", async () => {
    const disabled = new MessageActionRow().addComponents(
      getButtons().components.map(b => b.setDisabled(true))
    );
    await msg.edit({ components: [disabled] }).catch(() => null);
  });
}
 
  else if (commandName === "avatar") {
    const user = interaction.options.getUser("user") || interaction.user;
    const embed = new MessageEmbed()
      .setTitle(`${user.username}'s Avatar`)
      .setColor(0x00ae86)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 512 }));
    await interaction.reply({ embeds: [embed] });
  } else if (commandName === "membercount") {
    await interaction.reply(
      `👥 Total members: ${interaction.guild.memberCount}`,
    );
  } else if (commandName === "leaderboard") {
  await interaction.deferReply();

  const guildId = interaction.guild.id;
  const allKeys = await db.all();
  const leaderboard = [];

  for (const entry of allKeys) {
    const key = entry.id;

    if (!key.startsWith(`level.${guildId}-`)) continue;

    const userId = key.split("-")[1];
    const level = await db.get(key);
    const xp = await db.get(`xp.${guildId}-${userId}`) || 0;

    const rank = [...RANK_ROLES].reverse().find(r => level >= r.level);
    const roleName = rank
      ? interaction.guild.roles.cache.get(rank.roleId)?.name || "Unknown Role"
      : "None";

    leaderboard.push({ userId, level, xp, roleName });
  }

  if (leaderboard.length === 0) {
    return interaction.editReply("No leaderboard data found.");
  }

  leaderboard.sort((a, b) => {
    if (b.level === a.level) return b.xp - a.xp;
    return b.level - a.level;
  });

  const top = leaderboard.slice(0, 10);
  const embed = new MessageEmbed()
    .setTitle("📊 Top 10 Leaderboard — Tempest Federation")
    .setColor(0x00ae86)
    .setFooter({ text: "Keep chatting to level up and climb the ranks!" })
    .setTimestamp();

  for (let i = 0; i < top.length; i++) {
    const entry = top[i];
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

    const userTag = await client.users
      .fetch(entry.userId)
      .then(u => u.tag)
      .catch(() => "Unknown User");

    embed.addField(
      `${medal} ${userTag}`,
      `Level: ${entry.level} | XP: ${entry.xp} | Role: **${entry.roleName}**`,
      false
    );
  }

  await interaction.editReply({ embeds: [embed] });
} 
  
  else if (commandName === "meme") {
    try {
      const res = await fetch("https://meme-api.com/gimme");
      const data = await res.json();
      const embed = new MessageEmbed()
        .setTitle(data.title)
        .setColor(0x00ae86)
        .setImage(data.url)
        .setFooter({ text: `👍 ${data.ups} upvotes` });
      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({
        content: "Failed to fetch meme. Try again later!",
        ephemeral: true,
      });
    }
  } else if (commandName === "mcmeme") {
    try {
      const res = await fetch("https://meme-api.com/gimme/Minecraft");
      const data = await res.json();
      const embed = new MessageEmbed()
        .setTitle(data.title)
        .setColor(0x00ae86)
        .setImage(data.url)
        .setFooter({ text: `👍 ${data.ups} upvotes` });
      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({
        content: "Failed to fetch Minecraft meme. Try again later!",
        ephemeral: true,
      });
    }
  } else if (commandName === "joke") {
    try {
      const res = await fetch(
        "https://official-joke-api.appspot.com/jokes/random",
      );
      const data = await res.json();
      await interaction.reply(`${data.setup}\n\n||${data.punchline}||`);
    } catch {
      await interaction.reply({
        content: "Failed to fetch joke. Try again later!",
        ephemeral: true,
      });
    }
  } else if (commandName === "say") {
    const msg = interaction.options.getString("text");
    await interaction.reply(msg);
  } else if (commandName === "flip") {
    const flip = Math.random() < 0.5 ? "Heads" : "Tails";
    await interaction.reply(`🪙 You flipped: **${flip}**`);
  } else if (commandName === "rps") {
    const choice = interaction.options.getString("choice").toLowerCase();
    const choices = ["rock", "paper", "scissors"];
    if (!choices.includes(choice)) {
      return interaction.reply({
        content: "Please choose rock, paper, or scissors!",
        ephemeral: true,
      });
    }
    const bot = choices[Math.floor(Math.random() * choices.length)];
    let result = "It's a draw!";
    if (
      (choice === "rock" && bot === "scissors") ||
      (choice === "paper" && bot === "rock") ||
      (choice === "scissors" && bot === "paper")
    ) {
      result = "You win! 🎉";
    } else if (choice !== bot) {
      result = "You lose! 😢";
    }
    await interaction.reply(
      `You chose **${choice}**, I chose **${bot}**. ${result}`,
    );
  } else if (commandName === "8ball") {
    const responses = [
      "Yes, definitely! ✅",
      "No, absolutely not! ❌",
      "Maybe... 🤔",
      "Most likely! 👍",
      "Ask again later. ⏰",
      "Without a doubt! 💯",
      "Very doubtful. 😕",
      "Signs point to yes! ✨",
    ];
    const reply = responses[Math.floor(Math.random() * responses.length)];
    await interaction.reply(`🎱 ${reply}`);
  } else if (commandName === "myrankfix") {
  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const key = `${guildId}-${userId}`;

  const level = (await db.get(`level.${key}`)) || 0;
  const member = interaction.member;

  const rank = [...RANK_ROLES].reverse().find(r => level >= r.level);
  if (!rank) {
    return interaction.reply({
      content: "⚠️ You don’t qualify for any rank role yet. Keep leveling up!",
      ephemeral: true,
    });
  }

  const newRole = interaction.guild.roles.cache.get(rank.roleId);
  if (!newRole) {
    return interaction.reply({
      content: "⚠️ The role for your rank was not found on this server.",
      ephemeral: true,
    });
  }

  const lowerRanks = RANK_ROLES.filter(r => r.roleId !== newRole.id);
  const rolesToRemove = member.roles.cache.filter(r =>
    lowerRanks.some(lr => lr.roleId === r.id)
  );

  try {
    if (!member.roles.cache.has(newRole.id)) {
      await member.roles.add(newRole);
    }

    if (rolesToRemove.size > 0) {
      await member.roles.remove(rolesToRemove);
    }

    await interaction.reply({
      content: `✅ Your rank role has been refreshed! You now have **${newRole.name}**.`,
      ephemeral: true,
    });
  } catch (err) {
    console.error("Role refresh failed:", err);
    await interaction.reply({
      content: "❌ Something went wrong while updating your roles.",
      ephemeral: true,
    });
  }
}
  
  else if (commandName === "wholesome") {
    const messages = [
      "You are amazing! 💖",
      "Never forget you are loved! 💛",
      "Stay awesome! 💫",
      "You make the world brighter! ✨",
      "Believe in yourself! 🌟",
      "You're doing great! 👏",
    ];
    await interaction.reply(
      messages[Math.floor(Math.random() * messages.length)],
    );
  } else if (commandName === "eject") {
    const user = interaction.options.getUser("user");
    const result = Math.random() < 0.5 ? "was" : "was not";
    const colors = [
      "red",
      "blue",
      "green",
      "pink",
      "orange",
      "yellow",
      "black",
      "white",
      "purple",
      "brown",
      "cyan",
      "lime",
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    await interaction.reply(
      `🚀 ${user.username} (${color}) ${result} the Impostor.`,
    );
  } else if (commandName === "kill") {
    const user = interaction.options.getUser("user");
    const methods = [
      "eliminated",
      "defeated",
      "knocked out",
      "outsmarted",
      "outplayed",
    ];
    const method = methods[Math.floor(Math.random() * methods.length)];
    await interaction.reply(
      `💥 ${interaction.user.username} has ${method} ${user.username}!`,
    );
  } else if (commandName === "rules") {
    const embed = new MessageEmbed()
      .setTitle("📜 Server Rules")
      .setColor(0x00ae86)
      .setDescription(
        "Please follow these rules to keep our community safe and fun!",
      )
      .addFields(
        {
          name: "1. Be Kind & Respectful",
          value: "Treat everyone with respect and kindness.",
          inline: false,
        },
        {
          name: "2. No Spam",
          value: "Avoid excessive messaging or repetitive content.",
          inline: false,
        },
        {
          name: "3. Follow Discord ToS",
          value: "Adhere to Discord's Terms of Service at all times.",
          inline: false,
        },
        {
          name: "4. Use Appropriate Channels",
          value: "Keep discussions in their relevant channels.",
          inline: false,
        },
        {
          name: "5. No NSFW Content",
          value: "Keep all content family-friendly.",
          inline: false,
        },
      )
      .setFooter({ text: "Thank you for helping keep our server awesome!" });
    await interaction.reply({ embeds: [embed] });
  } else if (commandName === "rulesdm") {
    try {
      const embed = new MessageEmbed()
        .setTitle("📜 Server Rules")
        .setColor(0x00ae86)
        .setDescription("Here are the rules for the server:")
        .addFields(
          {
            name: "1. Be Kind & Respectful",
            value: "Treat everyone with respect and kindness.",
            inline: false,
          },
          {
            name: "2. No Spam",
            value: "Avoid excessive messaging or repetitive content.",
            inline: false,
          },
          {
            name: "3. Follow Discord ToS",
            value: "Adhere to Discord's Terms of Service at all times.",
            inline: false,
          },
          {
            name: "4. Use Appropriate Channels",
            value: "Keep discussions in their relevant channels.",
            inline: false,
          },
          {
            name: "5. No NSFW Content",
            value: "Keep all content family-friendly.",
            inline: false,
          },
        );
      await interaction.user.send({ embeds: [embed] });
      await interaction.reply({
        content: "I sent you the rules in DMs! 📩",
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content:
          "I couldn't send you a DM. Please check your privacy settings.",
        ephemeral: true,
      });
    }
  } else if (commandName === "helpdm") {
    const user = interaction.user;

    try {
      // Send first help page in DM
      const dmMessage = await user.send({
        embeds: [helpPages.general],
        components: [helpButtons],
      });

      await interaction.reply({
        content: "📩 Check your DMs for help information!",
        ephemeral: true,
      });

      const collector = dmMessage.createMessageComponentCollector({
        componentType: "BUTTON",
        time: 60000, // 1 minute
        filter: (i) => i.user.id === user.id,
      });

      collector.on("collect", async (i) => {
        if (helpPages[i.customId]) {
          await i.update({
            embeds: [helpPages[i.customId]],
            components: [helpButtons],
          });
        }
      });

      collector.on("end", async () => {
        try {
          const disabledRow = new MessageActionRow().addComponents(
            helpButtons.components.map((btn) => btn.setDisabled(true)),
          );
          await dmMessage.edit({ components: [disabledRow] });
        } catch (err) {
          console.warn("Failed to disable help DM buttons:", err.message);
        }
      });
    } catch (err) {
      await interaction.reply({
        content:
          "❌ I couldn’t send you a DM. Please check your privacy settings and try again.",
        ephemeral: true,
      });
    }
  } else if (commandName === "addautorole") {
    if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
      return interaction.reply({
        content: "You do not have permission to manage autoroles.",
        ephemeral: true,
      });
    }

    const role = interaction.options.getRole("role");

    // Get existing autoroles
    const autoroles = (await db.get(`autoroles.${interaction.guild.id}`)) || [];

    // Check if role is already in autoroles
    if (autoroles.includes(role.id)) {
      return interaction.reply({
        content: `**${role.name}** is already an autorole.`,
        ephemeral: true,
      });
    }

    // Add role to autoroles
    autoroles.push(role.id);
    await db.set(`autoroles.${interaction.guild.id}`, autoroles);

    interaction.reply(`✅ **${role.name}** has been added to autoroles.`);
  } else if (commandName === "removeautorole") {
    if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
      return interaction.reply({
        content: "You do not have permission to manage autoroles.",
        ephemeral: true,
      });
    }

    const role = interaction.options.getRole("role");

    // Get existing autoroles
    const autoroles = (await db.get(`autoroles.${interaction.guild.id}`)) || [];

    // Check if role is in autoroles
    if (!autoroles.includes(role.id)) {
      return interaction.reply({
        content: `**${role.name}** is not an autorole.`,
        ephemeral: true,
      });
    }

    // Remove role from autoroles
    const updatedAutoroles = autoroles.filter((roleId) => roleId !== role.id);
    await db.set(`autoroles.${interaction.guild.id}`, updatedAutoroles);

    interaction.reply(`✅ **${role.name}** has been removed from autoroles.`);
  }
});

// XP System - messageCreate handler
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild || message.system) return;

  const userId = message.author.id;
  const guildId = message.guild.id;
  const key = `${guildId}-${userId}`;

  // Cooldown logic
  if (
    userCooldowns.has(key) &&
    Date.now() - userCooldowns.get(key) < XP_COOLDOWN
  )
    return;
  userCooldowns.set(key, Date.now());

  // Helper function
  function getRequiredXP(level) {
    return 100 + level * 25;
  }

  // Fetch user data
  const userXP = (await db.get(`xp.${key}`)) || 0;
  const userLevel = (await db.get(`level.${key}`)) || 0;

  const newXP = userXP + XP_PER_MESSAGE;
  const requiredXP = getRequiredXP(userLevel);

  await db.set(`xp.${key}`, newXP);

  if (newXP >= requiredXP) {
    await db.set(`xp.${key}`, newXP - requiredXP);
    await db.set(`level.${key}`, userLevel + 1);

    const newLevel = userLevel + 1;

    // Send level-up message
    const channelId = await db.get(`${guildId}_${LEVEL_UP_CHANNEL_KEY}`);
    const channel = message.guild.channels.cache.get(channelId);
    if (channel) {
      const embed = new MessageEmbed()
        .setColor("GOLD")
        .setTitle("🌟 Level Up!")
        .setDescription(
          `${message.author} has reached **Level ${newLevel}**! 🎉`,
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Tempest Federation | Leveling System" })
        .setTimestamp();

      channel.send({ embeds: [embed] });
    }

    // Handle role rewards
    const rank = [...RANK_ROLES].reverse().find(r => newLevel >= r.level);
    if (rank) {
      const newRole = message.guild.roles.cache.get(rank.roleId);
      if (newRole && !message.member.roles.cache.has(newRole.id)) {
        try {
          // Remove lower rank roles
          const lowerRanks = RANK_ROLES.filter(r => r.roleId !== newRole.id);
          const rolesToRemove = message.member.roles.cache.filter(r =>
            lowerRanks.some(lr => lr.roleId === r.id)
          );
          await message.member.roles.remove(rolesToRemove).catch(console.error);
          await message.member.roles.add(newRole);
          console.log(`Assigned ${newRole.name} to ${message.author.tag}`);
        } catch (err) {
          console.error("Failed to update rank roles:", err);
        }
      }
    }

    const clearRoleId = await db.get(`clearrole.${guildId}.${newLevel}`);
    if (clearRoleId) {
      const role = message.guild.roles.cache.get(clearRoleId);
      if (role) {
        message.member.roles.remove(role).catch(console.error);
      }
    }
  }
});

// Text responses - messageCreate handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content === "hi bot") {
    message.reply("Hello! 👋 Try using `/help` to see what I can do!");
  } else if (content.includes("i am sad")) {
    message.reply(
      "Don't be sad, here's a hug! *hugs* <:Hug:830323615667847168>",
    );
  } else if (
    ["how are you bot", "hru", "hyd", "wyd", "what are you doing"].includes(
      content,
    )
  ) {
    message.reply("I'm just chilling in the server 😎 Ready to help anytime!");
  } else if (
    content.includes("pick me a random color") ||
    content.includes("random color")
  ) {
    const colors = [
      "Red ❤️",
      "Blue 💙",
      "Green 💚",
      "Yellow 💛",
      "Pink 💗",
      "Purple 💜",
      "Orange 🧡",
      "Teal 🩵",
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    message.reply(`🎨 Your random color is: **${color}**`);
  }
});

// When a member joins the server
client.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const welcomeEmbed = new MessageEmbed()
    .setColor("GREEN")
    .setTitle("🎉 Welcome!")
    .setDescription(`Hey ${member}, welcome to **${member.guild.name}**!`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `User ID: ${member.id}` })
    .setTimestamp();

  channel.send({ embeds: [welcomeEmbed] });

  // Assign autoroles
  const autoroles = (await db.get(`autoroles.${member.guild.id}`)) || [];
  if (autoroles && autoroles.length > 0) {
    try {
      await member.roles.add(autoroles);
      console.log(`Assigned autoroles to ${member.user.tag}`);
    } catch (error) {
      console.error("Failed to assign autoroles:", error);
    }
  }
});

// When a member leaves the server
client.on("guildMemberRemove", async (member) => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const farewellEmbed = new MessageEmbed()
    .setColor("RED")
    .setTitle("👋 Goodbye!")
    .setDescription(
      `Sad to see ${member.user.tag} leave **${member.guild.name}**.`,
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `User ID: ${member.id}` })
    .setTimestamp();

  channel.send({ embeds: [farewellEmbed] });
});

client.login(process.env.TOKEN);
