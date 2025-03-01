import { Client, GatewayIntentBits } from "discord.js";
import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

// Discord bot setup
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const token = process.env.DISCORD_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;

// WebSocket connection to MTP server
const ws = new WebSocket(process.env.MTP_SERVER);

ws.on("message", async (data) => {
    try {
        const alert = JSON.parse(data);
        console.log("📢 Received Alert:", alert);

        if (alert.direction === "up" && alert.changePercent > 3) {
            const message = `🚀 **Market Move Alert**: **${alert.symbol}**\n📈 Price: $${alert.price}\n📊 Change: +${alert.changePercent}%\n🕒 Time: ${alert.time}`;

            const channel = await client.channels.fetch(channelId);
            if (channel) {
                await channel.send(message);
                console.log(`✅ Sent alert to Discord: ${alert.symbol}`);
            } else {
                console.error("❌ Error: Channel not found");
            }
        }
    } catch (err) {
        console.error("❌ Error processing alert:", err);
    }
});


ws.on("open", () => console.log("🔗 Connected to MTP Alerts"));
ws.on("error", (err) => console.error("❌ WebSocket Error:", err));
ws.on("close", () => console.log("🔴 Disconnected from MTP Alerts"));

// Start Discord bot
client.once("ready", async () => {
    console.log("🤖 Discord bot is online!");

    try {
        // Get the first server the bot is in
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.error("❌ Bot is not in any servers!");
            return;
        }

        // Check if a channel named "mtp-alerts" already exists
        let channel = guild.channels.cache.find((ch) => ch.name === "mtp-alerts" && ch.type === 0);

        if (!channel) {
            console.log("📢 Creating a new channel: #mtp-alerts...");
            channel = await guild.channels.create({
                name: "mtp-alerts",
                type: 0, // 0 = Text channel
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone role
                        allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
                    },
                ],
            });

            console.log(`✅ Created channel: #${channel.name}`);
        } else {
            console.log(`✅ Channel already exists: #${channel.name}`);
        }

        // Send a welcome message in the new channel
        await channel.send("✅ Bot is now active and ready to send alerts!");
        console.log(`📤 Test message sent successfully in #${channel.name}!`);

    } catch (err) {
        console.error("❌ Error creating or sending message in channel:", err);
    }
});



client.login(token);


